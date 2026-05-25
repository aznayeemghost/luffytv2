import { NextResponse } from "next/server";

// ============================================================
// LIVE TV & SPORTS API — Multi-source aggregator
// Sources: streamed.pk, dlhd.pk, embedsports.top, vipstreamed.live
// ============================================================

const TIMEOUT = 10000;

interface MatchStream {
  id: string;
  streamNo: number;
  language: string;
  hd: boolean;
  embedUrl: string;
  source: string;
  viewers: number;
}

interface LiveMatch {
  id: string;
  title: string;
  sport: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: string;
  awayScore: string;
  status: string;
  time: string;
  logo: string;
  streams: MatchStream[];
}

interface TVChannel {
  id: string;
  name: string;
  category: string;
  logo: string;
  embedUrl: string;
  country: string;
  language: string;
}

function makeTimeout(url: string): AbortController {
  const ctrl = new AbortController();
  setTimeout(() => ctrl.abort(), TIMEOUT);
  return ctrl;
}

// Detect sport from title text
function detectSport(title: string): string {
  const t = title.toLowerCase();
  if (/cricket|ipl|t20|odi|test match/i.test(t)) return "Cricket";
  if (/soccer|football|premier league|la liga|serie a|bundesliga|ligue 1|champions league|world cup|mls|epl/i.test(t)) return "Football";
  if (/basketball|nba|ncaa|euroleague/i.test(t)) return "Basketball";
  if (/tennis|atp|wta|grand slam|australian open|french open|wimbledon|us open/i.test(t)) return "Tennis";
  if (/mma|ufc|boxing|bellator|fight|wrestling/i.test(t)) return "MMA/Boxing";
  if (/baseball|mlb/i.test(t)) return "Baseball";
  if (/hockey|nhl/i.test(t)) return "Hockey";
  if (/rugby/i.test(t)) return "Rugby";
  if (/golf|pga/i.test(t)) return "Golf";
  if (/formula|f1|motorsport|nascar|racing/i.test(t)) return "Motorsport";
  if (/volleyball/i.test(t)) return "Volleyball";
  if (/handball/i.test(t)) return "Handball";
  if (/darts/i.test(t)) return "Darts";
  if (/snooker|pool/i.test(t)) return "Snooker";
  if (/cycling/i.test(t)) return "Cycling";
  if (/american football|nfl|super bowl/i.test(t)) return "NFL";
  return "Other";
}

// Detect league from title
function detectLeague(title: string): string {
  const t = title.toLowerCase();
  if (/ipl/i.test(t)) return "Indian Premier League";
  if (/premier league|epl/i.test(t)) return "Premier League";
  if (/la liga/i.test(t)) return "La Liga";
  if (/serie a/i.test(t)) return "Serie A";
  if (/bundesliga/i.test(t)) return "Bundesliga";
  if (/ligue 1/i.test(t)) return "Ligue 1";
  if (/champions league/i.test(t)) return "UEFA Champions League";
  if (/nba/i.test(t)) return "NBA";
  if (/nfl/i.test(t)) return "NFL";
  if (/mlb/i.test(t)) return "MLB";
  if (/nhl/i.test(t)) return "NHL";
  if (/ufc/i.test(t)) return "UFC";
  if (/atp/i.test(t)) return "ATP Tour";
  if (/wta/i.test(t)) return "WTA Tour";
  if (/f1|formula 1/i.test(t)) return "Formula 1";
  return "";
}

// ── Source 1: streamed.pk ──
async function fetchStreamedPk(): Promise<LiveMatch[]> {
  try {
    const ctrl = makeTimeout("streamed.pk");
    const res = await fetch("https://streamed.pk/api/v1/matches/live", {
      signal: ctrl.signal,
      headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data.map((m: any) => ({
      id: m.id || String(Math.random()),
      title: m.title || m.match || m.name || "Unknown Match",
      sport: m.sport || detectSport(m.title || m.match || ""),
      league: m.league || m.competition || detectLeague(m.title || m.match || ""),
      homeTeam: m.home || m.homeTeam || "",
      awayTeam: m.away || m.awayTeam || "",
      homeScore: m.homeScore || m.score?.home || "",
      awayScore: m.awayScore || m.score?.away || "",
      status: m.status || m.live ? "Live" : "Upcoming",
      time: m.time || m.kickoff || "",
      logo: m.logo || m.thumbnail || m.image || "",
      streams: (m.streams || []).map((s: any, i: number) => ({
        id: s.id || `${m.id}-${i}`,
        streamNo: s.streamNo || s.number || i + 1,
        language: s.language || "English",
        hd: s.hd || s.quality === "HD",
        embedUrl: s.embedUrl || s.url || s.link || "",
        source: "streamed.pk",
        viewers: s.viewers || 0,
      })),
    }));
  } catch {
    return [];
  }
}

// ── Source 2: dlhd.pk ──
async function fetchDlhd(): Promise<{ matches: LiveMatch[]; channels: TVChannel[] }> {
  try {
    const ctrl = makeTimeout("dlhd.pk");
    const res = await fetch("https://dlhd.pk/api.php", {
      signal: ctrl.signal,
      headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
    });
    if (!res.ok) return { matches: [], channels: [] };
    const data = await res.json();

    const matches: LiveMatch[] = [];
    const channels: TVChannel[] = [];

    // Handle various response shapes from dlhd
    if (data.matches && Array.isArray(data.matches)) {
      for (const m of data.matches) {
        matches.push({
          id: m.id || String(Math.random()),
          title: m.title || m.match || m.name || "Unknown",
          sport: m.sport || detectSport(m.title || m.match || ""),
          league: m.league || m.competition || detectLeague(m.title || m.match || ""),
          homeTeam: m.home || m.homeTeam || "",
          awayTeam: m.away || m.awayTeam || "",
          homeScore: m.homeScore || m.score?.home || "",
          awayScore: m.awayScore || m.score?.away || "",
          status: m.live ? "Live" : (m.status || "Upcoming"),
          time: m.time || m.date || "",
          logo: m.logo || m.thumbnail || m.image || "",
          streams: (m.streams || m.links || []).map((s: any, i: number) => ({
            id: s.id || `dlhd-${m.id}-${i}`,
            streamNo: s.streamNo || s.number || i + 1,
            language: s.language || "English",
            hd: s.hd || false,
            embedUrl: s.embedUrl || s.url || s.link || "",
            source: "dlhd.pk",
            viewers: s.viewers || 0,
          })),
        });
      }
    }

    // Also try flat array response
    if (Array.isArray(data) && data.length > 0 && !data[0].streams) {
      for (const m of data) {
        matches.push({
          id: m.id || String(Math.random()),
          title: m.title || m.match || m.name || "Unknown",
          sport: m.sport || detectSport(m.title || m.match || ""),
          league: m.league || m.competition || detectLeague(m.title || m.match || ""),
          homeTeam: m.home || m.homeTeam || "",
          awayTeam: m.away || m.awayTeam || "",
          homeScore: m.homeScore || m.score?.home || "",
          awayScore: m.awayScore || m.score?.away || "",
          status: m.live ? "Live" : (m.status || "Upcoming"),
          time: m.time || m.date || "",
          logo: m.logo || m.thumbnail || m.image || "",
          streams: [],
        });
      }
    }

    // Channels
    if (data.channels && Array.isArray(data.channels)) {
      for (const ch of data.channels) {
        channels.push({
          id: ch.id || String(Math.random()),
          name: ch.name || ch.title || "Unknown Channel",
          category: ch.category || ch.sport || "General",
          logo: ch.logo || ch.image || ch.thumbnail || "",
          embedUrl: ch.embedUrl || ch.url || ch.link || ch.stream || "",
          country: ch.country || "",
          language: ch.language || "English",
        });
      }
    }

    return { matches, channels };
  } catch {
    return { matches: [], channels: [] };
  }
}

// ── Source 3: embedsports.top ──
async function fetchEmbedSports(): Promise<LiveMatch[]> {
  try {
    const ctrl = makeTimeout("embedsports.top");
    const res = await fetch("https://embedsports.top/fetch", {
      signal: ctrl.signal,
      headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data.map((m: any) => {
      const title = m.title || m.name || m.id || "";
      return {
        id: m.id || String(Math.random()),
        title: title.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
        sport: detectSport(title),
        league: m.language || detectLeague(title),
        homeTeam: "",
        awayTeam: "",
        homeScore: "",
        awayScore: "",
        status: "Live",
        time: "",
        logo: "",
        streams: [{
          id: m.id,
          streamNo: m.streamNo || 1,
          language: m.language || "English",
          hd: m.hd || false,
          embedUrl: m.embedUrl || `https://embedsports.top/embed/admin/${m.id}/${m.streamNo || 1}`,
          source: "embedsports.top",
          viewers: m.viewers || 0,
        }],
      };
    });
  } catch {
    return [];
  }
}

// ── Source 4: vipstreamed.live ──
async function fetchVipStreamed(): Promise<LiveMatch[]> {
  try {
    const ctrl = makeTimeout("vipstreamed.live");
    const res = await fetch("https://api.vipstreamed.live/", {
      signal: ctrl.signal,
      headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data.map((m: any) => {
      const title = m.title || m.match || m.name || m.event || "";
      return {
        id: m.id || String(Math.random()),
        title,
        sport: m.sport || m.category || detectSport(title),
        league: m.league || m.competition || detectLeague(title),
        homeTeam: m.home || m.homeTeam || "",
        awayTeam: m.away || m.awayTeam || "",
        homeScore: m.homeScore || m.score?.home || "",
        awayScore: m.awayScore || m.score?.away || "",
        status: m.live || m.isLive ? "Live" : (m.status || "Upcoming"),
        time: m.time || m.date || "",
        logo: m.logo || m.thumbnail || m.image || "",
        streams: (m.streams || []).map((s: any, i: number) => ({
          id: s.id || `vip-${m.id}-${i}`,
          streamNo: s.streamNo || s.number || i + 1,
          language: s.language || "English",
          hd: s.hd || false,
          embedUrl: s.embedUrl || s.url || s.link || "",
          source: "vipstreamed.live",
          viewers: s.viewers || 0,
        })),
      };
    });
  } catch {
    return [];
  }
}

// ── Source 5: watchfooty.st ──
async function fetchWatchfooty(): Promise<LiveMatch[]> {
  try {
    const ctrl = makeTimeout("watchfooty.st");
    const res = await fetch("https://api.watchfooty.st/api/v1/matches/live", {
      signal: ctrl.signal,
      headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data.map((m: any) => {
      const title = m.title || m.match || m.name || "";
      return {
        id: m.id || String(Math.random()),
        title,
        sport: m.sport || "Football",
        league: m.league || m.competition || detectLeague(title),
        homeTeam: m.home || m.homeTeam || "",
        awayTeam: m.away || m.awayTeam || "",
        homeScore: m.homeScore || m.score?.home || "",
        awayScore: m.awayScore || m.score?.away || "",
        status: "Live",
        time: m.time || m.kickoff || "",
        logo: m.logo || m.thumbnail || "",
        streams: (m.streams || []).map((s: any, i: number) => ({
          id: s.id || `wf-${m.id}-${i}`,
          streamNo: s.streamNo || i + 1,
          language: s.language || "English",
          hd: s.hd || false,
          embedUrl: s.embedUrl || s.url || "",
          source: "watchfooty.st",
          viewers: s.viewers || 0,
        })),
      };
    });
  } catch {
    return [];
  }
}

// ── Merge and deduplicate ──
function mergeMatches(all: LiveMatch[][]): LiveMatch[] {
  const merged: LiveMatch[] = [];
  const seen = new Set<string>();

  for (const list of all) {
    for (const m of list) {
      // Dedupe by normalized title
      const key = m.title.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (seen.has(key) && m.streams.length === 0) continue;
      if (seen.has(key)) {
        // Merge streams into existing match
        const existing = merged.find(x => x.title.toLowerCase().replace(/[^a-z0-9]/g, "") === key);
        if (existing) {
          existing.streams = [...existing.streams, ...m.streams];
          // Use the version with more info
          if (m.logo && !existing.logo) existing.logo = m.logo;
          if (m.homeTeam && !existing.homeTeam) existing.homeTeam = m.homeTeam;
          if (m.awayTeam && !existing.awayTeam) existing.awayTeam = m.awayTeam;
          if (m.league && !existing.league) existing.league = m.league;
        }
        continue;
      }
      seen.add(key);
      merged.push(m);
    }
  }

  // Sort: Live first, then by viewers
  return merged.sort((a, b) => {
    if (a.status === "Live" && b.status !== "Live") return -1;
    if (a.status !== "Live" && b.status === "Live") return 1;
    const va = a.streams.reduce((s, x) => s + x.viewers, 0);
    const vb = b.streams.reduce((s, x) => s + x.viewers, 0);
    return vb - va;
  });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const type = url.searchParams.get("type") || "all"; // all | matches | channels
  const sport = url.searchParams.get("sport") || "";

  try {
    // Fetch from all sources in parallel
    const [streamedPkMatches, dlhdData, embedSportsMatches, vipMatches, watchfootyMatches] = await Promise.allSettled([
      fetchStreamedPk(),
      fetchDlhd(),
      fetchEmbedSports(),
      fetchVipStreamed(),
      fetchWatchfooty(),
    ]);

    // Collect all matches
    const allMatchLists: LiveMatch[][] = [];
    if (streamedPkMatches.status === "fulfilled") allMatchLists.push(streamedPkMatches.value);
    if (embedSportsMatches.status === "fulfilled") allMatchLists.push(embedSportsMatches.value);
    if (vipMatches.status === "fulfilled") allMatchLists.push(vipMatches.value);
    if (watchfootyMatches.status === "fulfilled") allMatchLists.push(watchfootyMatches.value);
    if (dlhdData.status === "fulfilled") allMatchLists.push(dlhdData.value.matches);

    let matches = mergeMatches(allMatchLists);

    // Filter by sport if specified
    if (sport) {
      matches = matches.filter(m => m.sport.toLowerCase() === sport.toLowerCase());
    }

    // Collect channels
    let channels: TVChannel[] = [];
    if (dlhdData.status === "fulfilled") {
      channels = dlhdData.value.channels;
    }

    // If no channels from API, add some well-known ones
    if (channels.length === 0) {
      channels = [
        { id: "espn", name: "ESPN", category: "Sports", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/ESPN_logo.svg/512px-ESPN_logo.svg.png", embedUrl: "https://embedstreams.me/espn-1", country: "US", language: "English" },
        { id: "skysports", name: "Sky Sports Premier League", category: "Football", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Sky_Sports_Premier_League_logo.svg/512px-Sky_Sports_Premier_League_logo.svg.png", embedUrl: "https://embedstreams.me/sky-sports-premier-league", country: "UK", language: "English" },
        { id: "sony1", name: "Sony SIX", category: "Cricket", logo: "", embedUrl: "https://embedstreams.me/sony-six", country: "IN", language: "English" },
        { id: "sony2", name: "Sony TEN 1", category: "Sports", logo: "", embedUrl: "https://embedstreams.me/sony-ten-1", country: "IN", language: "English" },
        { id: "skycricket", name: "Sky Sports Cricket", category: "Cricket", logo: "", embedUrl: "https://embedstreams.me/sky-sports-cricket", country: "UK", language: "English" },
        { id: "tsn1", name: "TSN1", category: "Sports", logo: "", embedUrl: "https://embedstreams.me/tsn-1", country: "CA", language: "English" },
        { id: "bt1", name: "TNT Sports 1", category: "Football", logo: "", embedUrl: "https://embedstreams.me/tnt-sports-1", country: "UK", language: "English" },
        { id: "star1", name: "Star Sports 1", category: "Cricket", logo: "", embedUrl: "https://embedstreams.me/star-sports-1-hindi", country: "IN", language: "Hindi" },
        { id: "bein1", name: "beIN Sports 1", category: "Football", logo: "", embedUrl: "https://embedstreams.me/bein-sports-1", country: "QA", language: "English" },
        { id: "supersport", name: "SuperSport", category: "Sports", logo: "", embedUrl: "https://embedstreams.me/supersport-premier-league", country: "ZA", language: "English" },
        { id: "fox1", name: "Fox Sports 1", category: "Sports", logo: "", embedUrl: "https://embedstreams.me/fox-sports-1", country: "US", language: "English" },
        { id: "nbcsn", name: "NBC Sports", category: "Sports", logo: "", embedUrl: "https://embedstreams.me/nbc-sports", country: "US", language: "English" },
      ];
    }

    if (type === "matches") {
      return NextResponse.json({ matches, total: matches.length });
    }
    if (type === "channels") {
      return NextResponse.json({ channels, total: channels.length });
    }

    return NextResponse.json({ matches, channels, total: matches.length + channels.length });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to fetch live data", details: error.message },
      { status: 500 }
    );
  }
}
