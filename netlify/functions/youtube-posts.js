// Netlify Function: Fetch YouTube Community Posts
// Proxies the YouTube internal browse API to avoid CORS issues

const CHANNEL_ID = "UCoVS2R6n3ewcIvSb_OzLLQg";
const POSTS_PARAMS = "EgVwb3N0c_IGBAoCSgA%3D";
const MAX_POSTS = 9;

// In-memory cache (persists across warm invocations)
let cache = { data: null, timestamp: 0 };
const CACHE_TTL = 4 * 60 * 60 * 1000; // 4 hours

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
          params: POSTS_PARAMS,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`YouTube API returned ${response.status}`);
    }

    const data = await response.json();
    const posts = extractPosts(data);

    const result = { posts: posts.slice(0, MAX_POSTS), fetchedAt: new Date().toISOString() };

    // Update cache
    cache = { data: result, timestamp: Date.now() };

    return { statusCode: 200, headers, body: JSON.stringify(result) };
  } catch (error) {
    console.error("Error fetching YouTube posts:", error);

    // If we have stale cache, serve it rather than failing
    if (cache.data) {
      return { statusCode: 200, headers, body: JSON.stringify(cache.data) };
    }

    return {
      statusCode: 502,
      headers,
      body: JSON.stringify({ error: "Failed to fetch posts" }),
    };
  }
};

function extractPosts(data) {
  const posts = [];

  try {
    const tabs =
      data?.contents?.twoColumnBrowseResultsRenderer?.tabs || [];
    const postsTab = tabs.find((t) => t.tabRenderer?.selected);
    if (!postsTab) return posts;

    const sections =
      postsTab.tabRenderer?.content?.sectionListRenderer?.contents || [];

    for (const section of sections) {
      const items = section?.itemSectionRenderer?.contents || [];

      for (const item of items) {
        const thread = item?.backstagePostThreadRenderer;
        if (!thread) continue;

        const post = thread?.post?.backstagePostRenderer;
        if (!post) continue;

        // Extract text
        const runs = post?.contentText?.runs || [];
        const text = runs.map((r) => r.text || "").join("");

        // Extract images
        const images = [];
        const attachment = post?.backstageAttachment || {};

        // Multi-image post
        const multiImage = attachment?.postMultiImageRenderer;
        if (multiImage) {
          for (const img of multiImage.images || []) {
            const thumbs =
              img?.backstageImageRenderer?.image?.thumbnails || [];
            if (thumbs.length > 0) {
              // Get highest resolution
              const best = thumbs.reduce((a, b) =>
                (a.width || 0) * (a.height || 0) >=
                (b.width || 0) * (b.height || 0)
                  ? a
                  : b
              );
              images.push({
                url: best.url,
                width: best.width,
                height: best.height,
              });
            }
          }
        }

        // Single image post
        const singleImage = attachment?.backstageImageRenderer;
        if (singleImage) {
          const thumbs = singleImage?.image?.thumbnails || [];
          if (thumbs.length > 0) {
            const best = thumbs.reduce((a, b) =>
              (a.width || 0) * (a.height || 0) >=
              (b.width || 0) * (b.height || 0)
                ? a
                : b
            );
            images.push({
              url: best.url,
              width: best.width,
              height: best.height,
            });
          }
        }

        // Only include posts that have images
        if (images.length > 0) {
          posts.push({
            id: post.postId || "",
            text: text.trim(),
            images,
          });
        }
      }
    }
  } catch (e) {
    console.error("Error parsing posts:", e);
  }

  return posts;
}
