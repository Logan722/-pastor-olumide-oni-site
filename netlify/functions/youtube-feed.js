// Netlify Function: Fetch YouTube Channel Video Feed
// Pulls the channel's RSS feed server-side and returns a clean JSON list
// of videos (no third-party dependency, no API key needed).

const CHANNEL_ID = "UCoVS2R6n3ewcIvSb_OzLLQg";
const FEED_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;
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
    const response = await fetch(FEED_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; PastorOlumideOniBot/1.0; +https://pastorolumideoni.com)",
      },
    });

    if (!response.ok) {
      throw new Error(`YouTube RSS returned ${response.status}`);
    }

    const xml = await response.text();
    const items = parseEntries(xml).slice(0, MAX_ITEMS);

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
 * Tiny XML entry parser — RSS feed is well-formed, no XML lib needed.
 * Extracts: videoId, title, link, pubDate, updated, description, thumbnail.
 */
function parseEntries(xml) {
  const entries = [];
  const entryRe = /<entry>([\s\S]*?)<\/entry>/g;
  let m;
  while ((m = entryRe.exec(xml)) !== null) {
    const block = m[1];
    const videoId = pick(block, /<yt:videoId>([^<]+)<\/yt:videoId>/);
    if (!videoId) continue;
    const title = decodeXml(pick(block, /<title>([^<]+)<\/title>/) || "");
    const link =
      pick(block, /<link[^>]*href="([^"]+)"[^>]*\/>/) ||
      `https://www.youtube.com/watch?v=${videoId}`;
    const pubDate = pick(block, /<published>([^<]+)<\/published>/) || "";
    const updated = pick(block, /<updated>([^<]+)<\/updated>/) || "";
    const description = decodeXml(
      pick(block, /<media:description>([\s\S]*?)<\/media:description>/) || ""
    );
    const thumbnail =
      pick(block, /<media:thumbnail[^>]*url="([^"]+)"[^>]*\/>/) ||
      `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    entries.push({
      videoId,
      title,
      link,
      pubDate,
      updated,
      description,
      thumbnail,
    });
  }
  return entries;
}

function pick(s, re) {
  const m = s.match(re);
  return m ? m[1] : null;
}

function decodeXml(s) {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&amp;/g, "&");
}
