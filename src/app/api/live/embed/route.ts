import { NextResponse } from "next/server";

// ============================================================
// LIVE STREAM RESOLVER — StreamedPK-first approach
// PRIMARY: streamed.pk (Alpha–Intel sources via Streams API)
// SECONDARY: streamfree.app (CDN has CORS! M3U8 tokens)
// TERTIARY: dami-tv.pro (embed + HLS)
// BACKUP: watchfooty.st (embed URLs), sportsembed.su (embed)
// ============================================================

export const runtime = "edge";

const TIMEOUT = 12000;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

function makeCtrl() { const c = new AbortController(); setTimeout(() => c.abort(), TIMEOUT); return c; }
async function GEThtml(url: string, extraHeaders: Record<string, string> = {}): Promise<string> {
  const res = await fetch(url, { signal: makeCtrl().signal, headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml", ...extraHeaders } });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
  return res.text();
}
async function GETjson(url: string, extraHeaders: Record<string, string> = {}): Promise<any> {
  const res = await fetch(url, { signal: makeCtrl().signal, headers: { "User-Agent": UA, Accept: "application/json", ...extraHeaders } });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
  return res.json();
}

interface StreamResult {
  id: string;
  streamNo: number;
  language: string;
  hd: boolean;
  m3u8Url: string;
  quality: string;
  source: string;
  viewers: number;
  provider: string;
  embedUrl?: string;
  corsEnabled: boolean;
  referer?: string;
  streamType: "m3u8" | "embed";
}

// ── PROVIDER 1 (PRIMARY): streamed.pk — ALL 10 sources (admin, alpha–intel) ──
const STREAMED_PRIORITY: Record<string, number> = { admin: 1, delta: 2, golf: 3, echo: 4, bravo: 5, alpha: 6, charlie: 7, foxtrot: 8, hotel: 9, intel: 10 };

async function resolveStreamedPK(sources: { source: string; id: string }[]): Promise<StreamResult[]> {
  const results: StreamResult[] = [];

  const fetchPromises = sources.map(async (src) => {
    const localResults: StreamResult[] = [];
    try {
      const data = await GETjson(`https://streamed.pk/api/stream/${src.source}/${encodeURIComponent(src.id)}`);
      const streams = Array.isArray(data) ? data : (data && typeof data === 'object' ? [data] : []);

      const sourceLabel = src.source.charAt(0).toUpperCase() + src.source.slice(1);

      for (const s of streams) {
        if (!s.embedUrl) continue;

        localResults.push({
          id: `sp-${src.source}-${s.id || s.streamNo}`, streamNo: s.streamNo || localResults.length + 1,
          language: s.language || "English", hd: s.hd !== false, m3u8Url: "", quality: s.hd ? "HD" : "SD",
          source: `StreamPK ${sourceLabel} S${s.streamNo || localResults.length + 1}`,
          viewers: s.viewers || 0, provider: "streamed",
          corsEnabled: false, referer: "https://streamed.pk/", embedUrl: s.embedUrl, streamType: "embed",
        });
      }
    } catch {}
    return localResults;
  });

  const allResults = await Promise.all(fetchPromises);
  for (const r of allResults) results.push(...r);

  results.sort((a, b) => (STREAMED_PRIORITY[a.source.replace('StreamPK ', '').toLowerCase()] || 50) - (STREAMED_PRIORITY[b.source.replace('StreamPK ', '').toLowerCase()] || 50));
  return results;
}

// ── NEW: Search StreamedPK by team names to find sources ──
// When we don't have StreamedPK sources directly, search their API
async function searchStreamedPKByTeams(homeTeam: string, awayTeam: string, sport: string): Promise<{ source: string; id: string }[]> {
  if (!homeTeam && !awayTeam) return [];

  const normTeam = (name: string): string =>
    name.toLowerCase().trim()
      .replace(/[^a-z0-9 ]/g, "")
      .replace(/\bman\b/g, "manchester")
      .replace(/\bunited\b/g, "utd")
      .replace(/\bfc\b/g, "").replace(/\bsc\b/g, "").replace(/\bafc\b/g, "")
      .trim();

  const normHome = normTeam(homeTeam);
  const normAway = normTeam(awayTeam);

  try {
    // Search both live and today matches
    const [liveData, todayData] = await Promise.allSettled([
      GETjson("https://streamed.pk/api/matches/live"),
      GETjson("https://streamed.pk/api/matches/all-today"),
    ]);

    const allMatches: any[] = [];
    if (liveData.status === "fulfilled" && Array.isArray(liveData.value)) allMatches.push(...liveData.value);
    if (todayData.status === "fulfilled" && Array.isArray(todayData.value)) allMatches.push(...todayData.value);

    for (const m of allMatches) {
      const mHome = normTeam(m.teams?.home?.name || m.home_team || "");
      const mAway = normTeam(m.teams?.away?.name || m.away_team || "");

      // Check team match (direct, swapped, or partial)
      const teamsMatch =
        (normHome && normAway) && (
          (mHome === normHome && mAway === normAway) ||
          (mHome === normAway && mAway === normHome) ||
          ((normHome.includes(mHome) || mHome.includes(normHome)) &&
           (normAway.includes(mAway) || mAway.includes(normAway))) ||
          ((normHome.includes(mAway) || mAway.includes(normHome)) &&
           (normAway.includes(mHome) || mHome.includes(normAway)))
        );

      if (teamsMatch && m.sources && m.sources.length > 0) {
        return m.sources;
      }
    }
  } catch {}
  return [];
}

// ── PROVIDER 2: streamfree.app (CDN has CORS!) ──
async function resolveStreamfree(category: string, streamKey: string): Promise<StreamResult[]> {
  const results: StreamResult[] = [];

  try {
    const embedUrl = `https://streamfree.app/embed/${category}/${streamKey}`;
    const html = await GEThtml(embedUrl, { Referer: "https://streamfree.app/" });

    let tokens: Record<string, { _t: string; _e: number; _n: string }> = {};

    const patterns = [
      /const\s+_0x\s*=\s*(\{[^}]+\})/s,
      /var\s+_0x\s*=\s*(\{[^}]+\})/s,
      /window\._0x\s*=\s*(\{[^}]+\})/s,
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        try {
          let jsonStr = match[1].replace(/'/g, '"').replace(/(\w+)\s*:/g, '"$1":').replace(/""/g, '"');
          tokens = JSON.parse(jsonStr);
          break;
        } catch { continue; }
      }
    }

    if (Object.keys(tokens).length === 0) {
      const tokenRegex = /"(\d{3,4}p)"\s*:\s*\{[^}]*"_t"\s*:\s*"([^"]+)"[^}]*"_e"\s*:\s*(\d+)[^}]*"_n"\s*:\s*"([^"]+)"[^}]*\}/g;
      let m;
      while ((m = tokenRegex.exec(html)) !== null) {
        tokens[m[1]] = { _t: m[2], _e: parseInt(m[3]), _n: m[4] };
      }
    }

    if (Object.keys(tokens).length === 0) {
      const anyToken = html.match(/"_t"\s*:\s*"([^"]+)"/);
      const anyExpiry = html.match(/"_e"\s*:\s*(\d+)/);
      const anyNonce = html.match(/"_n"\s*:\s*"([^"]+)"/);
      if (anyToken && anyExpiry && anyNonce) {
        tokens["720p"] = { _t: anyToken[1], _e: parseInt(anyExpiry[1]), _n: anyNonce[1] };
      }
    }

    if (Object.keys(tokens).length === 0) {
      const m3u8Match = html.match(/https?:\/\/[^\s"']+\.m3u8[^\s"']*/);
      if (m3u8Match) {
        results.push({
          id: `sf-direct-${streamKey}`, streamNo: 1, language: "English", hd: true,
          m3u8Url: m3u8Match[0], quality: "720p", source: "StreamFree", viewers: 0,
          provider: "streamfree", corsEnabled: true, referer: "https://streamfree.app/",
          streamType: "m3u8",
        });
        return results;
      }
      return [];
    }

    let cdnDomain = "https://streamfree.app";
    try {
      const keyData = await GETjson(`https://streamfree.app/get-stream-key/${streamKey}`, { Referer: "https://streamfree.app/" });
      if (keyData.server_domain) cdnDomain = keyData.server_domain.replace(/\/$/, "");
    } catch {
      try {
        const cdnData = await GETjson(`https://streamfree.app/get-stream-key/${streamKey}?force_server=cdn`, { Referer: "https://streamfree.app/" });
        if (cdnData.server_domain) cdnDomain = cdnData.server_domain.replace(/\/$/, "");
      } catch {}
    }

    let streamNo = 1;
    const qualityOrder = ["2160p", "1080p", "720p", "540p"];
    for (const quality of qualityOrder) {
      const token = tokens[quality];
      if (!token) continue;
      const m3u8Url = `${cdnDomain}/live/${streamKey}${quality}/index.m3u8?_t=${encodeURIComponent(token._t)}&_e=${token._e}&_n=${encodeURIComponent(token._n)}`;
      results.push({
        id: `sf-${quality}-${streamKey}`, streamNo, language: "English", hd: quality !== "540p",
        m3u8Url, quality, source: `StreamFree ${quality}`, viewers: 0, provider: "streamfree",
        corsEnabled: true, referer: "https://streamfree.app/", streamType: "m3u8",
      });
      streamNo++;
    }

    const streamfreeEmbedUrl = `https://streamfree.app/embed/${category}/${streamKey}`;
    results.push({
      id: `sf-embed-${streamKey}`, streamNo, language: "English", hd: true,
      m3u8Url: "", quality: "720p", source: "StreamFree Embed", viewers: 0, provider: "streamfree",
      corsEnabled: false, referer: "https://streamfree.app/", embedUrl: streamfreeEmbedUrl, streamType: "embed",
    });
  } catch (err: any) {
    if (category && streamKey) {
      results.push({
        id: `sf-embed-fallback-${streamKey}`, streamNo: 1, language: "English", hd: true,
        m3u8Url: "", quality: "720p", source: "StreamFree Embed", viewers: 0, provider: "streamfree",
        corsEnabled: false, referer: "https://streamfree.app/", embedUrl: `https://streamfree.app/embed/${category}/${streamKey}`, streamType: "embed",
      });
    }
  }

  return results;
}

// ── PROVIDER 3: dami-tv.pro ──
async function resolveDamiTV(matchId: string): Promise<StreamResult[]> {
  const results: StreamResult[] = [];
  try {
    const embedUrl = `https://dami-tv.pro/embed/?id=${encodeURIComponent(matchId)}`;
    results.push({
      id: `dami-embed-${matchId}`, streamNo: 1, language: "English", hd: true,
      m3u8Url: "", quality: "720p", source: "DamiTV", viewers: 0, provider: "damitv",
      corsEnabled: false, referer: "https://dami-tv.pro/", embedUrl, streamType: "embed",
    });

    try {
      const m3u8Url = `https://dami-tv.pro/live-hls/channel/${encodeURIComponent(matchId)}/playlist.m3u8`;
      const res = await fetch(m3u8Url, { signal: makeCtrl().signal, headers: { "User-Agent": UA, Referer: "https://dami-tv.pro/" } });
      if (res.ok) {
        const ct = res.headers.get("content-type") || "";
        if (ct.includes("mpegurl") || ct.includes("octet-stream")) {
          results.push({
            id: `dami-hls-${matchId}`, streamNo: results.length + 1, language: "English", hd: true,
            m3u8Url, quality: "720p", source: "DamiTV HLS", viewers: 0, provider: "damitv",
            corsEnabled: false, referer: "https://dami-tv.pro/", streamType: "m3u8",
          });
        }
      }
    } catch {}

    try {
      const data = await GETjson(`https://dami-tv.pro/papi/stream/ppv/${encodeURIComponent(matchId)}`, { Referer: "https://dami-tv.pro/" });
      if (Array.isArray(data)) {
        for (const s of data) {
          if (s.embedUrl) {
            results.push({
              id: `dami-ppv-${matchId}-${s.streamNo || results.length}`, streamNo: s.streamNo || results.length + 1,
              language: s.language || "English", hd: s.hd !== false, m3u8Url: "", quality: s.hd ? "HD" : "SD",
              source: s.source || "DamiTV PPV", viewers: s.viewers || 0, provider: "damitv",
              corsEnabled: false, referer: "https://dami-tv.pro/", embedUrl: s.embedUrl, streamType: "embed",
            });
          }
        }
      }
    } catch {}
  } catch {}
  return results;
}

// ── PROVIDER 4: watchfooty.st ──
async function resolveWatchfooty(matchId: number): Promise<StreamResult[]> {
  const results: StreamResult[] = [];
  try {
    const data = await GETjson(`https://api.watchfooty.st/api/v1/match/${matchId}`);
    const streams = data.streams || [];
    let streamNo = 1;
    for (const s of streams) {
      if (!s.url) continue;
      const label = `${s.language || "English"} ${s.quality || "HD"}`.trim();
      results.push({
        id: `wf-embed-${matchId}-${streamNo}`, streamNo, language: s.language || "English",
        hd: s.quality === "hd" || s.quality === "HD", m3u8Url: "", quality: s.quality === "hd" || s.quality === "HD" ? "720p" : "480p",
        source: `WatchFooty ${label}`, viewers: 0, provider: "watchfooty",
        corsEnabled: false, referer: "https://watchfooty.st/", embedUrl: s.url, streamType: "embed",
      });
      streamNo++;
    }
  } catch {}
  return results;
}

// ── PROVIDER 5: sportsembed.su ──
async function resolveSportsembedSu(category: string, matchId: string): Promise<StreamResult[]> {
  const results: StreamResult[] = [];
  try {
    const embedUrl = `https://sportsembed.su/embed/${category}/${matchId}`;
    const html = await GEThtml(embedUrl, { Referer: "https://sportsembed.su/" });
    const m3u8Matches = html.match(/https?:\/\/[^\s"']+\.m3u8[^\s"']*/g);
    if (m3u8Matches) {
      const seen = new Set<string>();
      for (const url of m3u8Matches) {
        if (seen.has(url)) continue; seen.add(url);
        results.push({
          id: `se-${category}-${matchId}-${results.length + 1}`, streamNo: results.length + 1,
          language: "English", hd: results.length === 0, m3u8Url: url,
          quality: results.length === 0 ? "720p" : "480p", source: "SportsEmbed", viewers: 0,
          provider: "sportsembed", corsEnabled: false, referer: "https://sportsembed.su/",
          embedUrl, streamType: "m3u8",
        });
      }
    }
  } catch {}
  return results;
}

// ── MAIN HANDLER ──
export async function GET(req: Request) {
  const url = new URL(req.url);
  const provider = url.searchParams.get("provider") || "";
  const streamKey = url.searchParams.get("streamKey") || "";
  const streamCategory = url.searchParams.get("streamCategory") || "";
  const channelCode = url.searchParams.get("channelCode") || "";
  const damitvId = url.searchParams.get("damitvId") || "";
  const watchfootyId = url.searchParams.get("watchfootyId") || "";
  const sources = url.searchParams.get("sources") || "";
  const matchId = url.searchParams.get("matchId") || "";
  const homeTeam = url.searchParams.get("homeTeam") || "";
  const awayTeam = url.searchParams.get("awayTeam") || "";
  const sport = url.searchParams.get("sport") || "";

  if (!provider && !matchId) {
    return NextResponse.json({ error: "Missing provider or matchId" }, { status: 400 });
  }

  let parsedSources: { source: string; id: string }[] = [];
  if (sources) {
    try { parsedSources = JSON.parse(sources); if (!Array.isArray(parsedSources)) parsedSources = []; } catch { parsedSources = []; }
  }

  const resolvePromises: Promise<StreamResult[]>[] = [];

  // ── PRIORITY 1: StreamedPK (Alpha–Intel + Admin) — PRIMARY source ──
  if (parsedSources.length > 0) {
    resolvePromises.push(resolveStreamedPK(parsedSources));
  } else if (homeTeam || awayTeam) {
    // NO StreamedPK sources in props — SEARCH StreamedPK API by team names!
    // This is the KEY fix: always try to find StreamedPK sources
    const searchSP = async (): Promise<StreamResult[]> => {
      const foundSources = await searchStreamedPKByTeams(homeTeam, awayTeam, sport);
      if (foundSources.length > 0) {
        return resolveStreamedPK(foundSources);
      }
      return [];
    };
    resolvePromises.push(searchSP());
  }

  // ── PRIORITY 2: streamfree (needs streamKey + streamCategory) ──
  if (streamKey && streamCategory) {
    resolvePromises.push(resolveStreamfree(streamCategory, streamKey));
  }

  // Helper: clean matchId by stripping prefixes
  const cleanMatchId = matchId.replace(/^(espn|wf|sp|sf|cdn|dami|se|es)-/i, "");

  // ── PRIORITY 3: DamiTV ──
  // ONLY resolve DamiTV if we have an explicit damitvId from the API.
  // DO NOT add DamiTV as a fallback for matches that didn't come from DamiTV.
  // This prevents DamiTV showing as a source for every match when it doesn't have streams.
  if (damitvId) {
    resolvePromises.push(resolveDamiTV(damitvId));
  }

  // ── PRIORITY 4: WatchFooty ──
  if (watchfootyId) {
    resolvePromises.push(resolveWatchfooty(parseInt(watchfootyId)));
  }

  // ── PRIORITY 5: SportsEmbed ──
  const sportsrcCategory = url.searchParams.get("sportsrcCategory") || streamCategory || "sports";
  const sportsrcId = url.searchParams.get("sportsrcId") || matchId || "";
  if (sportsrcId) {
    resolvePromises.push(resolveSportsembedSu(sportsrcCategory, sportsrcId));
  }

  // Fallback: if no providers matched at all, try SportsEmbed only
  // DO NOT add DamiTV as fallback — it shows broken streams for matches it doesn't have
  if (resolvePromises.length === 0 && matchId) {
    resolvePromises.push(resolveSportsembedSu("sports", cleanMatchId));
  }

  const allResults = await Promise.all(resolvePromises);
  const allStreams = allResults.flat();

  // Deduplicate
  const seen = new Set<string>();
  const uniqueStreams = allStreams.filter(s => {
    const key = s.streamType === "m3u8" && s.m3u8Url ? s.m3u8Url : (s.embedUrl || `${s.id}`);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Sort: StreamedPK first, then other embeds, then M3U8
  const qualityOrder: Record<string, number> = { "2160p": 1, "1080p": 2, "HD": 2, "720p": 3, "SD": 4, "540p": 5, "480p": 6 };
  uniqueStreams.sort((a, b) => {
    if (a.provider === "streamed" && b.provider !== "streamed") return -1;
    if (b.provider === "streamed" && a.provider !== "streamed") return 1;
    if (a.streamType === "embed" && b.streamType !== "embed") return -1;
    if (a.streamType !== "embed" && b.streamType === "embed") return 1;
    if (a.corsEnabled && !b.corsEnabled) return -1;
    if (!a.corsEnabled && b.corsEnabled) return 1;
    return (qualityOrder[a.quality] || 99) - (qualityOrder[b.quality] || 99);
  });

  return NextResponse.json({
    streams: uniqueStreams,
    total: uniqueStreams.length,
    hasCORSStream: uniqueStreams.some(s => s.corsEnabled),
    hasEmbedStream: uniqueStreams.some(s => s.streamType === "embed"),
  });
}
