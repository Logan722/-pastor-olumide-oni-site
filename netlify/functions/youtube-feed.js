// Netlify Function: Fetch YouTube Channel Videos (main videos tab)
// Uses YouTube's internal browse API (same pattern as youtube-shorts, youtube-playlists).
// Avoids the public RSS feed endpoint which returns 404 for some channels.
// No API key required.

const CHANNEL_ID = "UCoVS2R6n3ewcIvSb_OzLLQg";
// URL-encoded params for the channel's "Videos" tab (long-form uploads)
const VIDEOS_PARAMS = "EgZ2aWRlb3PyBgQKAjoA";
const MAX_ITEMS = 15;

// In-memory cache (persists across warm invocations)
let cache = { data: null, timestamp: 0 };
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

exports.handler = async function (event) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Content-Type": "application/json",
    "Cache-Control": "public, max-age=900, s-maxage=1800",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  // Return cached data if still fresh
  if (cache.data && Date.now() - cache.timestamp < CACHE_TTL) {
    return { statusCode: 200, headers, body: JSON.stringify(cache.data) };
  }

  try {
    const response = await fetch(
      "https://www.youtube.com/youtubei/v1/browse",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context: {
            client: {
              clientName: "WEB",
              clientVersion: "2.20250401.00.00",
            },
          },
          browseId: CHANNEL_ID,
          params: VIDEOS_PARAMS,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`YouTube API returned ${response.status}`);
    }

    const data = await response.json();
    const items = extractVideos(data).slice(0, MAX_ITEMS);

    if (items.length === 0) {
      throw new Error("No videos extracted from response");
    }

    const result = {
      status: "ok",
      channelId: CHANNEL_ID,
      items,
      fetchedAt: new Date().toISOString(),
    };

    cache = { data: result, timestamp: Date.now() };
    return { statusCode: 200, headers, body: JSON.stringify(result) };
  } catch (err) {
    console.error("[youtube-feed] error:", err);
    // If we have stale cache, return it rather than failing
    if (cache.data) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ ...cache.data, stale: true }),
      };
    }
    return {
      statusCode: 502,
      headers,
      body: JSON.stringify({ status: "error", error: String(err.message || err) }),
    };
  }
};

/**
 * Walk the InnerTube response and extract videos from the Videos tab.
 * Handles both the newer lockupViewModel format (as of 2025-2026) and the
 * older videoRenderer format for resilience.
 */
function extractVideos(data) {
  const tabs =
    data?.contents?.twoColumnBrowseResultsRenderer?.tabs || [];
  const videosTab = tabs.find(
    (t) => t?.tabRenderer?.selected || t?.tabRenderer?.title === "Videos"
  );
  const items =
    videosTab?.tabRenderer?.content?.richGridRenderer?.contents || [];
  return items
    .map((item) => extractVideo(item))
    .filter(Boolean);
}

function extractVideo(item) {
  const content = item?.richItemRenderer?.content || {};

  // Newer format (lockupViewModel) — YouTube's current shape
  const lvm = content.lockupViewModel;
  if (lvm) {
    const videoId = lvm.contentId;
    if (!videoId) return null;

    const titleContent =
      lvm?.metadata?.lockupMetadataViewModel?.title?.content || "";

    // Metadata rows contain view count + published time
    const metaRows =
      lvm?.metadata?.lockupMetadataViewModel?.metadata
        ?.contentMetadataViewModel?.metadataRows || [];
    let viewCount = "";
    let published = "";
    for (const row of metaRows) {
      const parts = row?.metadataParts || [];
      for (const part of parts) {
        const txt = part?.text?.content || "";
        if (/view/i.test(txt) && !viewCount) viewCount = txt;
        else if (/ago|streamed|premiered/i.test(txt) && !published) published = txt;
      }
    }

    // Duration from thumbnail overlay badge
    const overlays =
      lvm?.contentImage?.thumbnailViewModel?.overlays || [];
    let duration = "";
    for (const ov of overlays) {
      const badges = ov?.thumbnailBottomOverlayViewModel?.badges || [];
      for (const b of badges) {
        const t = b?.thumbnailBadgeViewModel?.text;
        if (t && /^\d/.test(t)) {
          duration = t;
          break;
        }
      }
      if (duration) break;
    }

    // Best thumbnail from sources (highest resolution)
    const sources =
      lvm?.contentImage?.thumbnailViewModel?.image?.sources || [];
    const thumbnail =
      (sources.length && sources[sources.length - 1].url) ||
      `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

    return {
      videoId,
      title: titleContent,
      link: `https://www.youtube.com/watch?v=${videoId}`,
      pubDate: published,
      updated: published,
      description: "",
      thumbnail,
      duration,
      viewCount,
    };
  }

  // Older format (videoRenderer) — fallback if YouTube reverts
  const video = content.videoRenderer;
  if (video) {
    const videoId = video.videoId;
    if (!videoId) return null;

    const title =
      video?.title?.runs?.[0]?.text ||
      video?.title?.simpleText ||
      "";
    const publishedText =
      video?.publishedTimeText?.simpleText || "";
    const lengthText =
      video?.lengthText?.simpleText || "";
    const viewCountText =
      video?.viewCountText?.simpleText ||
      video?.shortViewCountText?.simpleText ||
      "";
    const description =
      video?.descriptionSnippet?.runs?.map((r) => r.text).join("") || "";
    const thumbnails = video?.thumbnail?.thumbnails || [];
    const thumbnail =
      (thumbnails.length && thumbnails[thumbnails.length - 1].url) ||
      `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

    return {
      videoId,
      title,
      link: `https://www.youtube.com/watch?v=${videoId}`,
      pubDate: publishedText,
      updated: publishedText,
      description,
      thumbnail,
      duration: lengthText,
      viewCount: viewCountText,
    };
  }

  return null;
}
