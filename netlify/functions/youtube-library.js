// Netlify Function: Library payload (Shorts + Playlists + Other Videos)
// =====================================================================
// Builds the data for /library.html in a single response by hitting
// YouTube's public youtubei/v1/browse endpoint (no API key required).
//
// Returns:
//   {
//     shorts:      [ { id, title } ],         // from Shorts tab
//     playlists:   [ { id, title, count, countText, videos: [ { id, title } ] } ],
//     otherVideos: [ { id, title } ],         // from Videos tab, minus anything in a curated playlist
//     generatedAt: ISO string
//   }
//
// "Other Videos" is sourced from the channel's Videos tab — regular uploads
// only, livestream replays are excluded (those live on the Live tab).
//
// All titles are passed through scrubBrand() so the response is already
// free of "MFM" / "Mountain of Fire and Miracles Ministries" references
// before it ever reaches the page.

const CHANNEL_ID = "UCoVS2R6n3ewcIvSb_OzLLQg";

// Shorts tab param (stable, same encoding yt-dlp uses)
const SHORTS_TAB_PARAM = "EgZzaG9ydHPyBgUKA5oBAA%3D%3D";
// Videos tab param — regular uploads only, excludes livestream replays
const VIDEOS_TAB_PARAM = "EgZ2aWRlb3PyBgQKAjoA";

// Curated playlists, rendered on the Library page in this exact order.
// Edit this array to add / remove / reorder playlists.
const CURATED_PLAYLISTS = [
  "PLJyJYslFH1GK9q5IcTj-Mek4kjYMMAAJc", // Short Series
  "PLJyJYslFH1GLqYR2Kw9dt_LvmIcbsgurk", // The Godly Marriage Navigator
  "PLJyJYslFH1GK5Y4jgIsk6JClLcz1batQZ", // Mountain Top Grace
  "PLJyJYslFH1GKGuJ3gdZTEcrWsLEJ8Jljs", // Wisdom Power Series
];

// Limits (kept generous; horizontal rails handle volume gracefully)
const SHORTS_LIMIT          = 18;
const PLAYLIST_VIDEO_LIMIT  = 18;
const OTHER_VIDEOS_LIMIT    = 12;
const MIN_VIDEOS_PER_PLAYLIST = 1; // curated, so don't filter aggressively

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
    "Cache-Control": "public, max-age=300, s-maxage=14400",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  // Serve fresh cache
  if (cache.data && Date.now() - cache.timestamp < CACHE_TTL) {
    return { statusCode: 200, headers, body: JSON.stringify(cache.data) };
  }

  try {
    // Fetch shorts, the Videos tab (regular uploads only — excludes livestream
    // replays), and all curated playlists in parallel. Each curated playlist
    // call returns its own title, count, and videos.
    const [shortsResp, videosResp, ...playlistResps] = await Promise.all([
      browse(CHANNEL_ID, SHORTS_TAB_PARAM).catch((e) => {
        console.error("shorts browse failed:", e);
        return null;
      }),
      browse(CHANNEL_ID, VIDEOS_TAB_PARAM).catch((e) => {
        console.error("videos browse failed:", e);
        return null;
      }),
      ...CURATED_PLAYLISTS.map((id) =>
        browse("VL" + id).catch((e) => {
          console.error(`playlist ${id} fetch failed:`, e);
          return null;
        })
      ),
    ]);

    const shorts  = extractShorts(shortsResp).slice(0, SHORTS_LIMIT);
    const uploads = extractChannelVideos(videosResp);

    // Build playlist objects in the curated order. Drop any that failed
    // to load or came back below the minimum video threshold.
    const playlists = [];
    CURATED_PLAYLISTS.forEach((id, i) => {
      const resp = playlistResps[i];
      if (!resp) return;
      const title = extractPlaylistTitle(resp);
      const countText = extractPlaylistCountText(resp);
      const videos = extractPlaylistVideos(resp).slice(0, PLAYLIST_VIDEO_LIMIT);
      if (videos.length < MIN_VIDEOS_PER_PLAYLIST) return;
      playlists.push({
        id,
        title: scrubBrand(title),
        count: parseCount(countText),
        countText: countText.trim(),
        videos,
      });
    });

    // "Other Videos" = recent uploads NOT in any of the curated playlists
    const playlistVideoIds = new Set();
    for (const pl of playlists) {
      for (const v of pl.videos) playlistVideoIds.add(v.id);
    }
    const otherVideos = uploads
      .filter((v) => !playlistVideoIds.has(v.id))
      .slice(0, OTHER_VIDEOS_LIMIT);

    const payload = {
      shorts,
      playlists,
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

// Extract playlist title from the playlist's own browse response.
// Tries both the modern pageHeader layout and the older playlistMetadata.
function extractPlaylistTitle(data) {
  if (!data) return "";
  return (
    data?.metadata?.playlistMetadataRenderer?.title ||
    data?.header?.pageHeaderRenderer?.pageTitle ||
    data?.header?.playlistHeaderRenderer?.title?.simpleText ||
    data?.header?.playlistHeaderRenderer?.title?.runs?.map((r) => r.text || "").join("") ||
    ""
  ).trim();
}

// Extract a "20 episodes" / "13 videos" string from the metadata rows.
function extractPlaylistCountText(data) {
  if (!data) return "";
  try {
    const rows =
      data?.header?.pageHeaderRenderer?.content?.pageHeaderViewModel?.metadata
        ?.contentMetadataViewModel?.metadataRows || [];
    for (const row of rows) {
      for (const part of row?.metadataParts || []) {
        const txt = part?.text?.content || "";
        if (/\d+\s*(videos?|episodes?)/i.test(txt)) {
          return txt.trim();
        }
      }
    }
    // Older layout fallback
    const oldText =
      data?.header?.playlistHeaderRenderer?.numVideosText?.runs
        ?.map((r) => r.text || "")
        .join("") || "";
    if (oldText) return oldText.trim();
  } catch (e) {
    console.error("extractPlaylistCountText:", e);
  }
  return "";
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

// Extract videos from the channel's Videos tab response.
// This excludes livestream replays (those live in the Live tab) and Shorts
// (those live in the Shorts tab).
function extractChannelVideos(data) {
  if (!data) return [];
  const out = [];
  try {
    const content = selectedTabContent(data);
    const items = content?.richGridRenderer?.contents || [];
    for (const item of items) {
      const v = item?.richItemRenderer?.content?.videoRenderer;
      if (!v?.videoId) continue;
      const titleRuns = v?.title?.runs || [];
      const title =
        titleRuns.map((r) => r.text || "").join("").trim() ||
        (v?.title?.simpleText || "").trim();
      out.push({ id: v.videoId, title: scrubBrand(title) });
    }
  } catch (e) {
    console.error("extractChannelVideos:", e);
  }
  return out;
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
