// Netlify Function: Fetch YouTube channel playlists
// Queries the channel's Playlists tab via InnerTube to get all playlists,
// returning playlist ID, title, video count, and thumbnail. Used by
// the Sermon Series section on the homepage.

const CHANNEL_ID = "UCoVS2R6n3ewcIvSb_OzLLQg";
// URL-encoded params for the channel's "Playlists" tab
const PLAYLISTS_PARAMS = "EglwbGF5bGlzdHPyBgQKAkIA";
const MAX_PLAYLISTS = 12;

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
          params: PLAYLISTS_PARAMS,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`YouTube API returned ${response.status}`);
    }

    const data = await response.json();
    const playlists = extractPlaylists(data).slice(0, MAX_PLAYLISTS);

    const result = {
      status: "ok",
      channelId: CHANNEL_ID,
      playlists,
      fetchedAt: new Date().toISOString(),
    };

    cache = { data: result, timestamp: Date.now() };
    return { statusCode: 200, headers, body: JSON.stringify(result) };
  } catch (err) {
    console.error("[youtube-playlists] error:", err);
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

function extractPlaylists(data) {
  const tabs =
    data?.contents?.twoColumnBrowseResultsRenderer?.tabs || [];
  const playlistsTab = tabs.find(
    (t) => t?.tabRenderer?.selected || t?.tabRenderer?.title === "Playlists"
  );
  const sections =
    playlistsTab?.tabRenderer?.content?.sectionListRenderer?.contents || [];

  const playlists = [];
  for (const sec of sections) {
    const items =
      sec?.itemSectionRenderer?.contents?.[0]?.gridRenderer?.items || [];
    for (const item of items) {
      const pl = extractPlaylist(item);
      if (pl) playlists.push(pl);
    }
  }
  return playlists;
}

function extractPlaylist(item) {
  // Newer format: lockupViewModel
  const lv = item?.lockupViewModel;
  if (lv) {
    const playlistId = lv.contentId;
    const title =
      lv?.metadata?.lockupMetadataViewModel?.title?.content || "";
    if (!playlistId || !title) return null;
    // First video thumbnail at standard URL
    const thumbSources =
      lv?.contentImage?.collectionThumbnailViewModel?.primaryThumbnail
        ?.thumbnailViewModel?.image?.sources || [];
    const thumbnail =
      thumbSources[0]?.url ||
      `https://i.ytimg.com/vi/${playlistId}/hqdefault.jpg`;
    // Try to find the count
    const countText =
      lv?.contentImage?.collectionThumbnailViewModel?.primaryThumbnail
        ?.thumbnailViewModel?.overlays?.[0]?.thumbnailOverlayBadgeViewModel
        ?.thumbnailBadges?.[0]?.thumbnailBadgeViewModel?.text || "";
    return {
      playlistId,
      title,
      thumbnail,
      videoCount: countText, // e.g. "12 videos" or "Updated today"
      link: `https://www.youtube.com/playlist?list=${playlistId}`,
    };
  }

  // Older format: gridPlaylistRenderer
  const gp = item?.gridPlaylistRenderer;
  if (gp) {
    const playlistId = gp.playlistId;
    const title = gp?.title?.runs?.[0]?.text || gp?.title?.simpleText || "";
    if (!playlistId || !title) return null;
    const thumbnails = gp?.thumbnail?.thumbnails || [];
    const thumbnail =
      thumbnails[thumbnails.length - 1]?.url ||
      `https://i.ytimg.com/vi/0/hqdefault.jpg`;
    const countRuns = gp?.videoCountText?.runs || [];
    const videoCount = countRuns.map((r) => r.text).join("");
    return {
      playlistId,
      title,
      thumbnail,
      videoCount,
      link: `https://www.youtube.com/playlist?list=${playlistId}`,
    };
  }

  return null;
}
