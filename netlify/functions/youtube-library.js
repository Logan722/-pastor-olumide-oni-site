// Netlify Function: Library payload (Shorts + Playlists + Other Videos)
// =====================================================================
// Builds the data for /library.html in a single response by hitting
// YouTube's public youtubei/v1/browse endpoint (no API key required) plus
// the channel's RSS uploads feed.
//
// Returns:
//   {
//     shorts:      [ { id, title } ],
//     playlists:   [ { id, title, count, videos: [ { id, title } ] } ],
//     otherVideos: [ { id, title, published } ],
//     generatedAt: ISO string
//   }
//
// All titles are passed through scrubBrand() so the response is already
// free of "MFM" / "Mountain of Fire and Miracles Ministries" references
// before it ever reaches the page.

const CHANNEL_ID = "UCoVS2R6n3ewcIvSb_OzLLQg";

// youtubei tab params (stable, same encoding yt-dlp uses)
const TAB_PARAMS = {
  shorts:    "EgZzaG9ydHPyBgUKA5oBAA%3D%3D",
  playlists: "EglwbGF5bGlzdHPyBgQKAkIA",
};

// Limits (kept generous; horizontal rails handle volume gracefully)
const SHORTS_LIMIT          = 18;
const PLAYLIST_VIDEO_LIMIT  = 18;
const OTHER_VIDEOS_LIMIT    = 12;
const MIN_VIDEOS_PER_PLAYLIST = 2;  // drop singleton/abandoned playlists

const CACHE_TTL = 4 * 60 * 60 * 1000; // 4 hours
let cache = { data: null, timestamp: 0 };

const YT_HEADERS = {
  "Content-Type": "application/json",
  "Accept-Language": "en-US,en;q=0.9",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

exports.handler = async function (event) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Content-Type": "application/json",
    "Cache-Control": "public, max-age=3600, s-maxage=14400",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  // Serve fresh cache
  if (cache.data && Date.now() - cache.timestamp < CACHE_TTL) {
    return { statusCode: 200, headers, body: JSON.stringify(cache.data) };
  }

  try {
    // First wave: shorts tab, playlists tab, uploads RSS — all in parallel
    const [shortsResp, playlistsResp, uploadsXml] = await Promise.all([
      browse(CHANNEL_ID, TAB_PARAMS.shorts).catch((e) => {
        console.error("shorts browse failed:", e);
        return null;
      }),
      browse(CHANNEL_ID, TAB_PARAMS.playlists).catch((e) => {
        console.error("playlists browse failed:", e);
        return null;
      }),
      fetchText(`https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`).catch((e) => {
        console.error("uploads RSS failed:", e);
        return "";
      }),
    ]);

    const shorts    = extractShorts(shortsResp).slice(0, SHORTS_LIMIT);
    const playlists = extractPlaylists(playlistsResp);
    const uploads   = parseRssUploads(uploadsXml);

    // Second wave: each playlist's contents in parallel.
    // Skip playlists below the threshold to save fetches.
    const playlistsToFetch = playlists.filter(
      (p) => p.count === null || p.count >= MIN_VIDEOS_PER_PLAYLIST
    );

    const playlistsWithVideos = await Promise.all(
      playlistsToFetch.map(async (pl) => {
        try {
          const resp = await browse("VL" + pl.id);
          const videos = extractPlaylistVideos(resp).slice(0, PLAYLIST_VIDEO_LIMIT);
          return { ...pl, videos };
        } catch (e) {
          console.error(`playlist ${pl.id} fetch failed:`, e);
          return { ...pl, videos: [] };
        }
      })
    );

    // Drop empty playlists post-fetch
    const finalPlaylists = playlistsWithVideos.filter(
      (p) => p.videos.length >= MIN_VIDEOS_PER_PLAYLIST
    );

    // "Other Videos" = uploads NOT present in any playlist
    const playlistVideoIds = new Set();
    for (const pl of finalPlaylists) {
      for (const v of pl.videos) playlistVideoIds.add(v.id);
    }
    const otherVideos = uploads
      .filter((v) => !playlistVideoIds.has(v.id))
      .slice(0, OTHER_VIDEOS_LIMIT);

    const payload = {
      shorts,
      playlists: finalPlaylists,
      otherVideos,
      generatedAt: new Date().toISOString(),
    };

    cache = { data: payload, timestamp: Date.now() };

    return { statusCode: 200, headers, body: JSON.stringify(payload) };
  } catch (err) {
    console.error("youtube-library failed:", err);

    // Stale cache fallback
    if (cache.data) {
      return { statusCode: 200, headers, body: JSON.stringify(cache.data) };
    }

    return {
      statusCode: 502,
      headers,
      body: JSON.stringify({
        error: "Failed to build library payload",
        shorts: [],
        playlists: [],
        otherVideos: [],
      }),
    };
  }
};

// ========== YouTube fetchers ==========

async function browse(browseId, params) {
  const body = {
    context: {
      client: {
        clientName: "WEB",
        clientVersion: "2.20250401.00.00",
      },
    },
    browseId,
  };
  if (params) body.params = params;

  const res = await fetch("https://www.youtube.com/youtubei/v1/browse", {
    method: "POST",
    headers: YT_HEADERS,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`browse ${browseId} -> ${res.status}`);
  return res.json();
}

async function fetchText(url) {
  const res = await fetch(url, { headers: YT_HEADERS });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.text();
}

// ========== Extractors ==========

function selectedTabContent(d) {
  const tabs = d?.contents?.twoColumnBrowseResultsRenderer?.tabs || [];
  return tabs.find((t) => t?.tabRenderer?.selected)?.tabRenderer?.content || null;
}

function extractShorts(data) {
  if (!data) return [];
  const out = [];
  try {
    const content = selectedTabContent(data);
    const items = content?.richGridRenderer?.contents || [];
    for (const item of items) {
      const lockup = item?.richItemRenderer?.content?.shortsLockupViewModel;
      if (!lockup) continue;
      const id =
        lockup?.onTap?.innertubeCommand?.reelWatchEndpoint?.videoId ||
        (typeof lockup?.entityId === "string"
          ? lockup.entityId.replace(/^shorts-shelf-item-/, "")
          : null);
      // accessibilityText looks like "TITLE, NN views - play Short"
      // Strip the trailing metadata for a cleaner display title.
      let title = lockup?.overlayMetadata?.primaryText?.content || "";
      if (!title && lockup?.accessibilityText) {
        title = lockup.accessibilityText
          .replace(/,?\s*[\d.]+[KMB]?\s*views?\s*-?\s*play\s*Short\s*$/i, "")
          .trim();
      }
      if (id) out.push({ id, title: scrubBrand(title) });
    }
  } catch (e) {
    console.error("extractShorts:", e);
  }
  return out;
}

function extractPlaylists(data) {
  if (!data) return [];
  const out = [];
  try {
    const content = selectedTabContent(data);
    const sections = content?.sectionListRenderer?.contents || [];

    for (const section of sections) {
      const itemSec = section?.itemSectionRenderer?.contents?.[0];
      if (!itemSec) continue;

      const gridItems = itemSec?.gridRenderer?.items || [];
      for (const item of gridItems) {
        // Newest format: lockupViewModel
        const lvm = item?.lockupViewModel;
        if (lvm) {
          const id = lvm?.contentId;
          const title = lvm?.metadata?.lockupMetadataViewModel?.title?.content || "";
          // Find the badge text like "85 videos"
          let countText = "";
          const overlays =
            lvm?.contentImage?.collectionThumbnailViewModel?.primaryThumbnail?.thumbnailViewModel?.overlays || [];
          for (const o of overlays) {
            const txt =
              o?.thumbnailOverlayBadgeViewModel?.thumbnailBadges?.[0]?.thumbnailBadgeViewModel?.text;
            if (txt) {
              countText = txt;
              break;
            }
          }
          const count = parseCount(countText);
          if (id && title) {
            out.push({
              id,
              title: scrubBrand(title),
              count,
              countText: countText.trim(),
            });
          }
          continue;
        }

        // Older format: gridPlaylistRenderer
        const gpl = item?.gridPlaylistRenderer;
        if (gpl) {
          const id = gpl?.playlistId;
          const titleRuns = gpl?.title?.runs || [];
          const title = titleRuns.map((r) => r.text || "").join("").trim();
          const countText =
            gpl?.videoCountText?.runs?.map((r) => r.text || "").join("") ||
            gpl?.videoCountShortText?.simpleText || "";
          if (id && title) {
            out.push({
              id,
              title: scrubBrand(title),
              count: parseCount(countText),
              countText: countText.trim(),
            });
          }
        }
      }
    }
  } catch (e) {
    console.error("extractPlaylists:", e);
  }

  // De-duplicate by playlist ID
  const seen = new Set();
  return out.filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)));
}

function parseCount(text) {
  if (!text) return null;
  const m = String(text).match(/(\d[\d,]*)/);
  return m ? parseInt(m[1].replace(/,/g, ""), 10) : null;
}

function extractPlaylistVideos(data) {
  if (!data) return [];
  const out = [];
  try {
    const tabs = data?.contents?.twoColumnBrowseResultsRenderer?.tabs || [];
    const tabContent = tabs[0]?.tabRenderer?.content;
    const sections = tabContent?.sectionListRenderer?.contents || [];

    for (const section of sections) {
      const items = section?.itemSectionRenderer?.contents?.[0];
      if (!items?.playlistVideoListRenderer) continue;
      const vids = items.playlistVideoListRenderer.contents || [];
      for (const v of vids) {
        const r = v?.playlistVideoRenderer;
        if (!r?.videoId) continue;
        const titleRuns = r?.title?.runs || [];
        const title =
          titleRuns.map((x) => x.text || "").join("").trim() ||
          (r?.title?.simpleText || "").trim();
        out.push({ id: r.videoId, title: scrubBrand(title) });
      }
    }
  } catch (e) {
    console.error("extractPlaylistVideos:", e);
  }
  return out;
}

function parseRssUploads(xml) {
  if (!xml) return [];
  const out = [];
  const entries = xml.split("<entry>").slice(1);
  for (const e of entries) {
    const idM    = e.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
    const titleM = e.match(/<title>([^<]+)<\/title>/);
    const pubM   = e.match(/<published>([^<]+)<\/published>/);
    if (idM && titleM) {
      out.push({
        id: idM[1].trim(),
        title: scrubBrand(decodeHtmlEntities(titleM[1].trim())),
        published: pubM ? pubM[1].trim() : "",
      });
    }
  }
  return out;
}

function decodeHtmlEntities(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

// ========== Brand scrub ==========
// Strips "MFM" / "MFM USA" / "Mountain of Fire and Miracles Ministries"
// from any text and tidies up orphan separators left behind.
function scrubBrand(s) {
  if (!s) return "";
  let out = s;

  // Long forms first
  out = out.replace(/Mountain\s+of\s+Fire\s+and\s+Miracles?\s+Ministr(?:y|ies)/gi, "");
  out = out.replace(/Mountain\s+of\s+Fire\s+(?:&|and)\s+Miracles?/gi, "");

  // Short forms — catch "MFM" plus any compound (MFMUSA, MFMUSAPRAYERCITY, etc.)
  out = out.replace(/\bMFM\s*USA\b/gi, "");
  out = out.replace(/\bMFM\w*/gi, "");
  // Also strip stray "@" left over when MFMUSAPRAYERCITY was a handle like "@MFMUSAPRAYERCITY"
  out = out.replace(/@\s+(?=$|[\|\-–—:])/g, "");
  out = out.replace(/@\s*$/g, "");

  // Tidy orphan separators left behind by the removals
  // " |  | " -> " | "
  out = out.replace(/\s*\|\s*\|\s*/g, " | ");
  out = out.replace(/\s*[-–—]\s*[-–—]\s*/g, " — ");
  // Leading / trailing separators
  out = out.replace(/^\s*[\|\-–—:]\s*/, "");
  out = out.replace(/\s*[\|\-–—:]\s*$/, "");
  // Empty parens like "()" or " - "
  out = out.replace(/\(\s*\)/g, "");
  // Collapse whitespace
  out = out.replace(/\s{2,}/g, " ").trim();

  return out;
}
