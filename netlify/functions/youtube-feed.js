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
 * Returns each video in the shape the sermons/library UI expects.
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
  // Newer format: videoRenderer inside richItemRenderer
  const video = item?.richItemRenderer?.content?.videoRenderer;
  if (!video) return null;
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

  // Description snippet (rarely present in list view, but capture if there)
  const description =
    video?.descriptionSnippet?.runs?.map((r) => r.text).join("") ||
    "";

  // Best thumbnail — highest resolution available
  const thumbnails = video?.thumbnail?.thumbnails || [];
  const thumbnail =
    (thumbnails.length && thumbnails[thumbnails.length - 1].url) ||
    `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

  return {
    videoId,
    title,
    link: `https://www.youtube.com/watch?v=${videoId}`,
    pubDate: publishedText, // Human-readable like "3 days ago"
    updated: publishedText,
    description,
    thumbnail,
    duration: lengthText,
    viewCount: viewCountText,
  };
}
