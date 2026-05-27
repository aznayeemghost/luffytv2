import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────
// Luffy TV Live — Stream resolver
// ALL providers use JS-based embed players (Clappr, JWPlayer, oPlayer)
// M3U8 URLs are NEVER in the HTML — loaded dynamically by JS
// Therefore: ALL streams are served as EMBED type for iframe playback
// The iframe goes through /api/embed/proxy which strips sandbox detection
// ─────────────────────────────────────────────────────────────

interface StreamResult {
  url: string;              // URL to use in iframe src (via embed proxy)
  type: "embed";            // Always embed — these are JS players
  quality: string;
  language: string;
  source: string;           // Display name for the server
  hd?: boolean;
  streamNo?: number;
  embedUrl?: string;        // Original embed URL (before proxy)
  provider?: string;        // Which API provided this stream
}

// ── streamed.pk: Get embed URLs from API ──
// Source name mapping for better UX labels
const STREAMED_SOURCE_LABELS: Record<string, string> = {
  admin: "Admin",
  alpha: "Alpha",
  bravo: "Bravo",
  charlie: "Charlie",
  delta: "Delta",
  echo: "Echo",
  foxtrot: "Foxtrot",
  golf: "Golf",
  hotel: "Hotel",
  intel: "Intel",
};

async function getStreamedStreams(sourceName: string, sourceId: string): Promise<StreamResult[]> {
  const results: StreamResult[] = [];
  try {
    const apiSource = sourceName.replace("streamed-", "");
    const res = await fetch(`https://streamed.pk/api/stream/${apiSource}/${encodeURIComponent(sourceId)}`, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return results;
    const data = await res.json();
    if (!Array.isArray(data)) return results;

    for (const stream of data) {
      if (stream.embedUrl) {
        const sourceLabel = STREAMED_SOURCE_LABELS[apiSource] || apiSource.charAt(0).toUpperCase() + apiSource.slice(1);
        const streamLabel = stream.streamNo && stream.streamNo > 1
          ? `${sourceLabel} S${stream.streamNo}`
          : sourceLabel;
        results.push({
          url: stream.embedUrl,
          type: "embed",
          quality: stream.hd ? "720p" : "SD",
          language: stream.language || "English",
          source: streamLabel,
          hd: stream.hd,
          streamNo: stream.streamNo,
          embedUrl: stream.embedUrl,
          provider: "streamed",
        });
      }
    }
  } catch (e) {
    console.error("[streamed.pk] stream error:", e);
  }
  return results;
}

// ── WatchFooty: Returns embed URLs directly from matches API ──
async function getWatchFootyStreams(matchId: string): Promise<StreamResult[]> {
  const results: StreamResult[] = [];
  try {
    const res = await fetch(`https://api.watchfooty.st/api/v1/match/${encodeURIComponent(matchId)}`, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return results;
    const data = await res.json();

    const streams = data.streams || [];
    for (let i = 0; i < streams.length; i++) {
      const s = streams[i];
      if (s.url) {
        results.push({
          url: s.url,
          type: "embed",
          quality: s.quality || "HD",
          language: s.language || "English",
          source: s.source ? `${s.source.charAt(0).toUpperCase() + s.source.slice(1)} Server` : `Server ${i + 1}`,
          hd: s.quality === "HD",
          streamNo: i + 1,
          embedUrl: s.url,
          provider: "watchfooty",
        });
      }
    }
  } catch (e) {
    console.error("[watchfooty] stream error:", e);
  }
  return results;
}

// ── dami-tv.pro: Embed page ──
async function getDamiStreams(sourceId: string, directEmbedUrl?: string): Promise<StreamResult[]> {
  const results: StreamResult[] = [];

  // If we already have the embed URL from the matches API, use it directly
  if (directEmbedUrl) {
    results.push({
      url: directEmbedUrl,
      type: "embed",
      quality: "HD",
      language: "English",
      source: "DamiTV",
      embedUrl: directEmbedUrl,
      provider: "dami-tv",
    });
    return results;
  }

  try {
    // Try PPV stream API first (returns embed URLs)
    const res = await fetch(`https://dami-tv.pro/papi/stream/ppv/${encodeURIComponent(sourceId)}`, {
      headers: { "User-Agent": "Mozilla/5.0", Referer: "https://dami-tv.pro/" },
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        for (const s of data) {
          if (s.embedUrl) {
            results.push({
              url: s.embedUrl,
              type: "embed",
              quality: s.hd ? "HD" : "SD",
              language: s.language || "English",
              source: s.source || "DamiTV",
              hd: s.hd,
              streamNo: s.streamNo,
              embedUrl: s.embedUrl,
              provider: "dami-tv",
            });
          }
        }
      }
    }
  } catch {}

  // Fallback: direct embed URL from dami-tv.pro
  if (results.length === 0) {
    const embedUrl = `https://dami-tv.pro/embed/?id=${encodeURIComponent(sourceId)}`;
    results.push({
      url: embedUrl,
      type: "embed",
      quality: "HD",
      language: "English",
      source: "DamiTV",
      embedUrl,
      provider: "dami-tv",
    });
  }

  return results;
}

// ── cdnlivetv.tv: Channel player (JS-based oPlayer) ──
async function getCDNStreams(playerUrl: string): Promise<StreamResult[]> {
  return [{
    url: playerUrl,
    type: "embed",
    quality: "HD",
    language: "English",
    source: "CDNLivetv",
    embedUrl: playerUrl,
    provider: "cdnlivetv",
  }];
}

// ── streamfree.app: Embed player ──
async function getStreamfreeStreams(streamKey: string, category?: string): Promise<StreamResult[]> {
  const results: StreamResult[] = [];

  // streamfree has an embed player
  const embedUrl = `https://streamfree.app/embed/${category || 'sports'}/${streamKey}`;
  results.push({
    url: embedUrl,
    type: "embed",
    quality: "HD",
    language: "English",
    source: "StreamFree",
    embedUrl,
    provider: "streamfree",
  });

  return results;
}

// ── cdnlivetv channel stream ──
async function getCDNChannelStream(channelUrl: string): Promise<StreamResult[]> {
  return getCDNStreams(channelUrl);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const matchId = searchParams.get("matchId");
    const source = searchParams.get("source");
    const sourceId = searchParams.get("sourceId");

    if (!matchId && !sourceId) {
      return NextResponse.json(
        { success: false, error: "matchId or sourceId required" },
        { status: 400 }
      );
    }

    const allStreams: StreamResult[] = [];

    // If source + sourceId is provided directly
    if (source && sourceId) {
      if (source === "watchfooty") {
        const streams = await getWatchFootyStreams(sourceId);
        allStreams.push(...streams);
      } else if (source.startsWith("streamed-")) {
        const streams = await getStreamedStreams(source, sourceId);
        allStreams.push(...streams);
      } else if (source === "dami-tv") {
        const streams = await getDamiStreams(sourceId);
        allStreams.push(...streams);
      } else if (source === "cdnlivetv") {
        const streams = await getCDNStreams(sourceId);
        allStreams.push(...streams);
      } else if (source === "cdnlivetv-channel") {
        const streams = await getCDNChannelStream(sourceId);
        allStreams.push(...streams);
      } else if (source === "streamfree") {
        const streams = await getStreamfreeStreams(sourceId);
        allStreams.push(...streams);
      }
    }

    // If matchId is provided, always fetch from ALL sources for that match.
    // This ensures we get streams from every provider (admin, delta, echo, etc.),
    // not just the first source that returns results.
    if (matchId) {
      try {
        const matchesRes = await fetch(new URL("/api/live/matches", request.url).href);
        if (matchesRes.ok) {
          const matchesData = await matchesRes.json();
          const match = (matchesData.matches || []).find((m: any) => m.id === matchId);
          const channel = (matchesData.channels || []).find((c: any) => c.id === matchId);
          const item = match || channel;

          if (item?.sources) {
            // First, add any direct embed URLs (WatchFooty provides these)
            for (const src of item.sources) {
              if (src.embeds && src.embeds.length > 0) {
                for (const emb of src.embeds) {
                  allStreams.push({
                    url: emb.url,
                    type: "embed",
                    quality: emb.quality || "HD",
                    language: emb.language || "English",
                    source: emb.source ? `${emb.source.charAt(0).toUpperCase() + emb.source.slice(1)} Server` : "Server",
                    hd: emb.quality === "HD",
                    embedUrl: emb.url,
                    provider: src.source,
                  });
                }
              }
            }

            // Then resolve ALL source APIs in parallel (StreamedPK, DamiTV, etc.)
            // Only fetch from sources that don't already have direct embeds
            const sourcesNeedingResolution = (item.sources as any[]).filter(
              (src: any) => !src.embeds || src.embeds.length === 0
            );
            if (sourcesNeedingResolution.length > 0) {
              const streamPromises = sourcesNeedingResolution.map((src: any) => {
                if (src.source === "watchfooty") return getWatchFootyStreams(src.sourceId);
                if (src.source.startsWith("streamed-")) return getStreamedStreams(src.source, src.sourceId);
                if (src.source === "dami-tv") return getDamiStreams(src.sourceId);
                if (src.source === "cdnlivetv") return getCDNStreams(src.sourceId);
                if (src.source === "cdnlivetv-channel") return getCDNChannelStream(src.sourceId);
                if (src.source === "streamfree") return getStreamfreeStreams(src.sourceId);
                return Promise.resolve([]);
              });
              const streamResults = await Promise.allSettled(streamPromises);
              for (const result of streamResults) {
                if (result.status === "fulfilled") allStreams.push(...result.value);
              }
            }
          }
        }
      } catch (e) {
        console.error("[stream] match lookup error:", e);
      }
    }

    // Deduplicate streams by URL
    const seen = new Set<string>();
    const deduped = allStreams.filter((s) => {
      const key = s.url;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return NextResponse.json({
      success: true,
      streams: deduped,
      total: deduped.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to get streams" },
      { status: 500 }
    );
  }
}
