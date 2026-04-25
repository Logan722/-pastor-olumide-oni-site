// Netlify Function: Fetch YouTube Shorts from a channel
// Queries the YouTube internal browse API for the channel's Shorts tab,
// avoids CORS and works without a YouTube Data API key.

const CHANNEL_ID = "UCoVS2R6n3ewcIvSb_OzLLQg";
// URL-encoded params for the channel's "Shorts" tab
const SHORTS_PARAMS = "EgZzaG9ydHPyBgUKA5oBAA%3D%3D";
const MAX_SHORTS = 12;

// In-memory cache (persists across warm invocations)
let cache = { data: null, timestamp: 0 };
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

exports.handler = async function (event) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Content-Type": "application/json",
    "Cache-Control": "public, max-age=1800, s-maxage=3600",
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
          params: SHORTS_PARAMS,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`YouTube API returned ${response.status}`);
    }

    const data = await response.json();
    const shorts = extractShorts(data).slice(0, MAX_SHORTS);

    const result = {
      status: "ok",
      channelId: CHANNEL_ID,
      shorts,
      fetchedAt: new Date().toISOString(),
    };

    cache = { data: result, timestamp: Date.now() };
    return { statusCode: 200, headers, body: JSON.stringify(result) };
  } catch (err) {
    console.error("[youtube-shorts] error:", err);
    if (cache.data) {
      // Return stale cache rather than fail
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
 * Walk the InnerTube response and extract Shorts from the selected tab.
 */
function extractShorts(data) {
  const tabs =
    data?.contents?.twoColumnBrowseResultsRenderer?.tabs || [];
  const shortsTab = tabs.find(
    (t) => t?.tabRenderer?.selected || t?.tabRenderer?.title === "Shorts"
  );
  const items =
    shortsTab?.tabRenderer?.content?.richGridRenderer?.contents || [];
  return items
    .map((item) => extractShort(item))
    .filter(Boolean);
}

function extractShort(item) {
  const content = item?.richItemRenderer?.content || {};

  // Newer format: shortsLockupViewModel
  const lockup = content.shortsLockupViewModel;
  if (lockup) {
    const videoId =
      lockup?.onTap?.innertubeCommand?.reelWatchEndpoint?.videoId ||
      (lockup?.entityId || "").replace(/^shorts-shelf-item-/, "");
    const title =
      lockup?.overlayMetadata?.primaryText?.content ||
      lockup?.accessibilityText ||
      "";
    if (!videoId) return null;
    return {
      videoId,
      title,
      thumbnail: `https://i.ytimg.com/vi/${videoId}/oardefault.jpg`,
      thumbnailFallback: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      link: `https://www.youtube.com/shorts/${videoId}`,
    };
  }

  // Older format: reelItemRenderer
  const reel = content.reelItemRenderer;
  if (reel) {
    const videoId = reel.videoId;
    if (!videoId) return null;
    return {
      videoId,
      title: reel?.headline?.simpleText || "",
      thumbnail: `https://i.ytimg.com/vi/${videoId}/oardefault.jpg`,
      thumbnailFallback: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      link: `https://www.youtube.com/shorts/${videoId}`,
    };
  }

  return null;
}
