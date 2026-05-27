import { NextResponse } from "next/server";

// ============================================================
// LIVE TV & SPORTS — Multi-Source Aggregator
// Sources: streamfree.app (M3U8), cdnlivetv.tv (762 channels),
//          dami-tv.pro (match data), watchfooty.st (match data + streams),
//          streamed.pk (backup), ESPN (schedules),
//          sportsembed.su (embeds)
// ============================================================

const TIMEOUT = 10000;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

function makeCtrl() { const c = new AbortController(); setTimeout(() => c.abort(), TIMEOUT); return c; }
async function httpGet(url: string, headers: Record<string, string> = {}): Promise<Response> {
  return fetch(url, { signal: makeCtrl().signal, headers: { "User-Agent": UA, Accept: "application/json", ...headers } });
}

// Sport color mapping
const SPORT_COLORS: Record<string, string> = {
  football: "#22c55e", basketball: "#ef4444", "american-football": "#dc2626", hockey: "#06b6d4",
  baseball: "#3b82f6", tennis: "#a855f7", fight: "#f97316", fighting: "#f97316", "motor-sports": "#eab308",
  racing: "#eab308", rugby: "#10b981", golf: "#84cc16", cricket: "#f59e0b", billiards: "#8b5cf6",
  afl: "#14b8a6", "australian-football": "#14b8a6", darts: "#f43f5e", other: "#6b7280",
  futsal: "#06b6d4", motorsport: "#eab308", cycling: "#84cc16", horse_racing: "#eab308",
  "horse_racing_(uk)": "#eab308", combat: "#f97316", volleyball: "#f59e0b",
};

const SPORT_NAMES: Record<string, string> = {
  football: "Football", basketball: "Basketball", "american-football": "American Football",
  hockey: "Hockey", baseball: "Baseball", tennis: "Tennis", fight: "Fight / MMA / Boxing",
  fighting: "Fight / MMA / Boxing", "motor-sports": "Motor Sports", racing: "Motor Sports",
  motorsport: "Motor Sports", rugby: "Rugby", golf: "Golf", cricket: "Cricket",
  billiards: "Billiards", afl: "AFL", "australian-football": "AFL", darts: "Darts",
  other: "Other", futsal: "Futsal", cycling: "Cycling", horse_racing: "Horse Racing",
  "horse_racing_(uk)": "Horse Racing", combat: "Combat", volleyball: "Volleyball",
};

interface LiveMatch {
  id: string;
  title: string;
  sport: string;
  sportName: string;
  date: number;
  poster: string;
  popular: boolean;
  homeTeam: string;
  awayTeam: string;
  homeBadge: string;
  awayBadge: string;
  isLive: boolean;
  apiSource: string;
  sources: { source: string; id: string }[];
  // Provider-specific fields for stream resolution
  streamKey?: string;
  streamCategory?: string;
  channelCode?: string;
  channelName?: string;
  damitvId?: string;
  watchfootyId?: number;
  sportsrcCategory?: string;
  sportsrcId?: string;
  // WatchFooty extended fields
  watchfootyStreams?: { id: string; url: string; quality: string; language: string; isRedirect: boolean; nsfw: boolean; ads: boolean }[];
  league?: string;
  leagueLogo?: string;
  homeScore?: number;
  awayScore?: number;
  currentMinute?: string;
}

interface SportCategory { id: string; name: string; displayName?: string; liveCount?: number; }

// ── SOURCE 1: streamfree.app (PRIMARY — TV channels + M3U8 with CORS CDN!) ──
// StreamFree provides both TV channels (Sky F1, Willow, etc.) and live match streams.
// We also check /api/stream-status/{key} to verify which channels are actually available.
const STREAMFREE_CHANNELS = [
  { key: "skyf1", name: "Sky Sports F1", category: "racing", sport: "motor-sports" },
  { key: "willow", name: "Willow Cricket", category: "cricket", sport: "cricket" },
  { key: "cricketsky", name: "Sky Sports Cricket", category: "cricket", sport: "cricket" },
  { key: "skytennis", name: "Sky Sports Tennis", category: "tennis", sport: "tennis" },
  { key: "skysports", name: "Sky Sports Main Event", category: "sports", sport: "other" },
  { key: "skysportsfootball", name: "Sky Sports Football", category: "football", sport: "football" },
  { key: "skysportsnews", name: "Sky Sports News", category: "news", sport: "other" },
  { key: "skysportsgolf", name: "Sky Sports Golf", category: "golf", sport: "golf" },
  { key: "skysportsaction", name: "Sky Sports Action", category: "sports", sport: "other" },
  { key: "skysportsarena", name: "Sky Sports Arena", category: "sports", sport: "other" },
  { key: "btsport", name: "BT Sport", category: "sports", sport: "other" },
  { key: "tntsports1", name: "TNT Sports 1", category: "sports", sport: "other" },
  { key: "espn", name: "ESPN", category: "sports", sport: "other" },
  { key: "cbc", name: "CBC", category: "sports", sport: "other" },
  { key: "bbc", name: "BBC Sport", category: "sports", sport: "other" },
  { key: "supersport", name: "SuperSport", category: "sports", sport: "other" },
];

async function fetchStreamfreeChannelStatus(): Promise<LiveMatch[]> {
  // Check availability of known TV channels via /api/stream-status/{key}
  const channels: LiveMatch[] = [];
  const results = await Promise.allSettled(
    STREAMFREE_CHANNELS.map(async (ch) => {
      try {
        const res = await httpGet(`https://streamfree.app/api/stream-status/${ch.key}`);
        if (!res.ok) return null;
        const data = await res.json();
        if (!data.available) return null;
        // Find best available quality
        const qualities = data.qualities || {};
        const bestQuality = qualities["1080p"] ? "1080p" : qualities["720p"] ? "720p" : qualities["540p"] ? "540p" : "1080p";
        return {
          id: `sf-ch-${ch.key}`,
          title: ch.name,
          sport: ch.sport,
          sportName: SPORT_NAMES[ch.sport] || ch.name,
          date: 0,
          poster: "",
          popular: false,
          homeTeam: "",
          awayTeam: "",
          homeBadge: "",
          awayBadge: "",
          isLive: true,
          apiSource: "streamfree",
          sources: [],
          streamKey: ch.key,
          streamCategory: ch.category,
          channelName: ch.name,
          channelCode: ch.category,
        } as LiveMatch;
      } catch { return null; }
    })
  );
  for (const r of results) {
    if (r.status === "fulfilled" && r.value) channels.push(r.value);
  }
  return channels;
}

async function fetchStreamfreeStreams(): Promise<LiveMatch[]> {
  try {
    const res = await httpGet("https://streamfree.app/streams");
    if (!res.ok) return [];
    const data = await res.json();
    if (!data || typeof data !== "object") return [];

    const root = data.streams && typeof data.streams === "object" ? data.streams : data;
    const matches: LiveMatch[] = [];
    for (const [category, streams] of Object.entries(root)) {
      if (!Array.isArray(streams)) continue;
      for (const s of streams as any[]) {
        const sport = mapCategoryToSport(s.category || category);
        const homeTeam = s.home_team || s.team1?.name || extractTeam(s.title || s.name || "", 0);
        const awayTeam = s.away_team || s.team2?.name || extractTeam(s.title || s.name || "", 1);
        const homeBadge = s.home_logo || s.home_badge || s.team1?.logo || "";
        const awayBadge = s.away_logo || s.away_badge || s.team2?.logo || "";
        const ts = s.match_timestamp ? s.match_timestamp * 1000 :
                   s.starts_at ? s.starts_at * 1000 :
                   s.date ? new Date(s.date).getTime() : 0;

        // Determine if this is a TV channel or a real match
        const isChannel = !homeTeam && !awayTeam && !ts;

        matches.push({
          id: `sf-${s.stream_key || s.key || s.id || Math.random().toString(36).slice(2)}`,
          title: s.title || s.name || formatTitle(s.stream_key || ""),
          sport: isChannel ? "other" : sport,
          sportName: isChannel ? "TV Channel" : (SPORT_NAMES[sport] || capitalize(s.category || category)),
          date: ts,
          poster: s.poster || s.image || s.thumbnail_url ? `https://streamfree.app${s.thumbnail_url}` : "",
          popular: !isChannel && (s.featured || s.popular || false),
          homeTeam,
          awayTeam,
          homeBadge,
          awayBadge,
          isLive: s.live || s.is_live || s.status === "live" || isChannel || false,
          apiSource: "streamfree",
          sources: [],
          streamKey: s.stream_key || s.key || s.id || "",
          streamCategory: s.category || category,
          channelName: isChannel ? (s.title || s.name || "") : undefined,
          channelCode: isChannel ? (s.category || category) : undefined,
        });
      }
    }
    return matches;
  } catch { return []; }
}

// ── SOURCE 2: dami-tv.pro (ONLY actual live/upcoming matches — no 24/7 channels) ──
// DamiTV has a lot of 24/7 channels (South Park, COWS, etc.) that flood the match list.
// We ONLY want actual live sports matches here. TV channels go to fetchDamiTVChannels().
async function fetchDamiTVStreams(): Promise<LiveMatch[]> {
  try {
    const res = await httpGet("https://dami-tv.pro/papi/api/streams");
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.streams || !Array.isArray(data.streams)) return [];

    const matches: LiveMatch[] = [];
    for (const category of data.streams) {
      if (!Array.isArray(category.streams)) continue;
      // Skip 24/7 stream categories entirely — those go to TV Channels
      const catName = (category.category || "").toLowerCase();
      if (catName.includes("24/7") || catName === "24-7-streams") continue;

      for (const s of category.streams) {
        // Skip 24/7 always-live channels — they are NOT real matches
        if (s.always_live === 1) continue;
        // Skip ended matches — no point showing them as regular matches
        if (s.status === "ended" || s.status === "finished") continue;
        // Only include actual live or upcoming sports matches
        const isLive = s.status === "live" || s.is_live === true;
        const isUpcoming = s.status === "upcoming" || s.status === "pre";
        if (!isLive && !isUpcoming) continue;

        const sport = mapCategoryToSport(s.category_name || category.category || "");
        const homeTeam = s.teams?.home?.name || extractTeam(s.name || "", 0);
        const awayTeam = s.teams?.away?.name || extractTeam(s.name || "", 1);
        const homeBadge = s.teams?.home?.badge || "";
        const awayBadge = s.teams?.away?.badge || "";
        const ts = s.starts_at ? s.starts_at * 1000 : 0;
        matches.push({
          id: `dami-${s.id || s.uri_name || Math.random().toString(36).slice(2)}`,
          title: s.name || s.title || formatTitle(s.id || ""),
          sport,
          sportName: SPORT_NAMES[sport] || capitalize(s.category_name || category.category || ""),
          date: ts,
          poster: s.poster || "",
          popular: isLive, // Only live matches are popular
          homeTeam,
          awayTeam,
          homeBadge,
          awayBadge,
          isLive,
          apiSource: "damitv",
          sources: [],
          damitvId: s.uri_name || s.id || "",
        });
      }
    }
    return matches;
  } catch { return []; }
}

// ── SOURCE 2b: dami-tv.pro TV channels (24/7 streams + live channels) ──
// ONLY returns always-live TV channels (24/7 South Park, Rally TV, etc.)
// and channels that don't have real team matchups. These go in the TV Channels section.
async function fetchDamiTVChannels(): Promise<LiveMatch[]> {
  try {
    const res = await httpGet("https://dami-tv.pro/papi/api/streams");
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.streams || !Array.isArray(data.streams)) return [];

    const channels: LiveMatch[] = [];
    for (const category of data.streams) {
      if (!Array.isArray(category.streams)) continue;
      for (const s of category.streams) {
        // ONLY include always-live channels and 24/7 streams
        // Regular live/upcoming matches are handled by fetchDamiTVStreams()
        const isAlwaysLive = s.always_live === 1;
        const catName = (s.category_name || category.category || "").toLowerCase();
        const is247Category = catName.includes("24/7") || catName === "24-7-streams";
        if (!isAlwaysLive && !is247Category) continue;

        const sport = mapCategoryToSport(s.category_name || category.category || "");
        channels.push({
          id: `dami-ch-${s.id || s.uri_name || Math.random().toString(36).slice(2)}`,
          title: s.name || s.title || formatTitle(s.id || ""),
          sport: is247Category ? "other" : sport,
          sportName: is247Category ? "TV Channel" : (SPORT_NAMES[sport] || capitalize(s.category_name || "")),
          date: 0, // TV channels have no specific match time
          poster: s.poster || "",
          popular: false, // TV channels are not "popular matches"
          homeTeam: "",
          awayTeam: "",
          homeBadge: s.poster || "",
          awayBadge: "",
          isLive: true, // Always-live channels are always live
          apiSource: "damitv",
          sources: [],
          damitvId: s.uri_name || s.id || "",
          channelName: s.name || "",
          channelCode: s.category_name || category.category || "",
        });
      }
    }
    return channels;
  } catch { return []; }
}

// ── SOURCE 4: watchfooty.st (rich match data + embed URLs + scores + streams) ──
const WF_BASE = "https://api.watchfooty.st";

function mapWfSport(sport: string): string {
  const m: Record<string, string> = {
    football: "football", basketball: "basketball", "american-football": "american-football",
    hockey: "hockey", baseball: "baseball", tennis: "tennis", fighting: "fight",
    fight: "fight", motorsport: "motor-sports", "motor-sports": "motor-sports",
    racing: "motor-sports", rugby: "rugby", golf: "golf", cricket: "cricket",
    afl: "afl", "australian-football": "afl", darts: "darts", futsal: "futsal",
    cycling: "cycling", horse_racing: "horse_racing", combat: "fight",
    volleyball: "volleyball", billiards: "billiards",
  };
  return m[sport?.toLowerCase()] || sport || "other";
}

async function fetchWatchfootyLive(): Promise<LiveMatch[]> {
  try {
    const res = await httpGet(`${WF_BASE}/api/v1/matches/live`);
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data.map((raw: any): LiveMatch => {
      const m = deepToPrimitive(raw); // Convert ALL {value, displayValue} objects to primitives
      const sport = mapWfSport(m.sport || "other");
      const streams = Array.isArray(m.streams) ? m.streams.map((s: any) => ({
        id: String(s.id || ""),
        url: s.url || "",
        quality: s.quality || "hd",
        language: s.language || "english",
        isRedirect: s.isRedirect || false,
        nsfw: s.nsfw || false,
        ads: s.ads || false,
      })) : [];
      return {
        id: `wf-${m.matchId || Math.random()}`,
        title: m.title || "Match",
        sport,
        sportName: SPORT_NAMES[sport] || m.sport || capitalize(sport),
        date: m.date ? new Date(m.date).getTime() : (m.timestamp ? m.timestamp * 1000 : 0),
        poster: m.poster ? (m.poster.startsWith("http") ? m.poster : `${WF_BASE}${m.poster}`) : "",
        popular: true,
        homeTeam: m.teams?.home?.name || "",
        awayTeam: m.teams?.away?.name || "",
        homeBadge: m.teams?.home?.logoUrl ? (m.teams.home.logoUrl.startsWith("http") ? m.teams.home.logoUrl : `${WF_BASE}${m.teams.home.logoUrl}`) : (m.teams?.home?.logo ? (m.teams.home.logo.startsWith("http") ? m.teams.home.logo : `${WF_BASE}${m.teams.home.logo}`) : ""),
        awayBadge: m.teams?.away?.logoUrl ? (m.teams.away.logoUrl.startsWith("http") ? m.teams.away.logoUrl : `${WF_BASE}${m.teams.away.logoUrl}`) : (m.teams?.away?.logo ? (m.teams.away.logo.startsWith("http") ? m.teams.away.logo : `${WF_BASE}${m.teams.away.logo}`) : ""),
        isLive: true, // This endpoint ONLY returns matches that are currently live
        apiSource: "watchfooty",
        sources: [],
        watchfootyId: m.matchId,
        watchfootyStreams: streams,
        league: m.league || "",
        leagueLogo: m.leagueLogo ? (m.leagueLogo.startsWith("http") ? m.leagueLogo : `${WF_BASE}${m.leagueLogo}`) : "",
        homeScore: toPrimitive(m.scores?.home) ?? undefined,
        awayScore: toPrimitive(m.scores?.away) ?? undefined,
        currentMinute: toPrimitive(m.currentMinute) || undefined,
      };
    });
  } catch { return []; }
}

async function fetchWatchfootyAll(): Promise<LiveMatch[]> {
  try {
    const res = await httpGet(`${WF_BASE}/api/v1/matches/all`);
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data.map((raw: any): LiveMatch => {
      const m = deepToPrimitive(raw); // Convert ALL {value, displayValue} objects to primitives
      const sport = mapWfSport(m.sport || "other");
      const streams = Array.isArray(m.streams) ? m.streams.map((s: any) => ({
        id: String(s.id || ""),
        url: s.url || "",
        quality: s.quality || "hd",
        language: s.language || "english",
        isRedirect: s.isRedirect || false,
        nsfw: s.nsfw || false,
        ads: s.ads || false,
      })) : [];
      return {
        id: `wf-${m.matchId || Math.random()}`,
        title: m.title || "Match",
        sport,
        sportName: SPORT_NAMES[sport] || m.sport || capitalize(sport),
        date: m.date ? new Date(m.date).getTime() : (m.timestamp ? m.timestamp * 1000 : 0),
        poster: m.poster ? (m.poster.startsWith("http") ? m.poster : `${WF_BASE}${m.poster}`) : "",
        popular: false,
        homeTeam: m.teams?.home?.name || "",
        awayTeam: m.teams?.away?.name || "",
        homeBadge: m.teams?.home?.logoUrl ? (m.teams.home.logoUrl.startsWith("http") ? m.teams.home.logoUrl : `${WF_BASE}${m.teams.home.logoUrl}`) : (m.teams?.home?.logo ? (m.teams.home.logo.startsWith("http") ? m.teams.home.logo : `${WF_BASE}${m.teams.home.logo}`) : ""),
        awayBadge: m.teams?.away?.logoUrl ? (m.teams.away.logoUrl.startsWith("http") ? m.teams.away.logoUrl : `${WF_BASE}${m.teams.away.logoUrl}`) : (m.teams?.away?.logo ? (m.teams.away.logo.startsWith("http") ? m.teams.away.logo : `${WF_BASE}${m.teams.away.logo}`) : ""),
        isLive: m.status === "in" || m.status === "live" || m.status === "1" || m.status === "2" || m.status === "HT" || m.status === "Q1" || m.status === "Q2" || m.status === "Q3" || m.status === "Q4" || m.status === "LIVE",
        apiSource: "watchfooty",
        sources: [],
        watchfootyId: m.matchId,
        watchfootyStreams: streams,
        league: m.league || "",
        leagueLogo: m.leagueLogo ? (m.leagueLogo.startsWith("http") ? m.leagueLogo : `${WF_BASE}${m.leagueLogo}`) : "",
        homeScore: toPrimitive(m.scores?.home) ?? undefined,
        awayScore: toPrimitive(m.scores?.away) ?? undefined,
        currentMinute: toPrimitive(m.currentMinute) || undefined,
      };
    });
  } catch { return []; }
}

async function fetchWatchfootyPopularLive(): Promise<LiveMatch[]> {
  try {
    const res = await httpGet(`${WF_BASE}/api/v1/matches/popular/live`);
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data.map((raw: any): LiveMatch => {
      const m = deepToPrimitive(raw); // Convert ALL {value, displayValue} objects to primitives
      const sport = mapWfSport(m.sport || "other");
      const streams = Array.isArray(m.streams) ? m.streams.map((s: any) => ({
        id: String(s.id || ""),
        url: s.url || "",
        quality: s.quality || "hd",
        language: s.language || "english",
        isRedirect: s.isRedirect || false,
        nsfw: s.nsfw || false,
        ads: s.ads || false,
      })) : [];
      return {
        id: `wf-${m.matchId || Math.random()}`,
        title: m.title || "Match",
        sport,
        sportName: SPORT_NAMES[sport] || m.sport || capitalize(sport),
        date: m.date ? new Date(m.date).getTime() : (m.timestamp ? m.timestamp * 1000 : 0),
        poster: m.poster ? (m.poster.startsWith("http") ? m.poster : `${WF_BASE}${m.poster}`) : "",
        popular: true,
        homeTeam: m.teams?.home?.name || "",
        awayTeam: m.teams?.away?.name || "",
        homeBadge: m.teams?.home?.logoUrl ? (m.teams.home.logoUrl.startsWith("http") ? m.teams.home.logoUrl : `${WF_BASE}${m.teams.home.logoUrl}`) : (m.teams?.home?.logo ? (m.teams.home.logo.startsWith("http") ? m.teams.home.logo : `${WF_BASE}${m.teams.home.logo}`) : ""),
        awayBadge: m.teams?.away?.logoUrl ? (m.teams.away.logoUrl.startsWith("http") ? m.teams.away.logoUrl : `${WF_BASE}${m.teams.away.logoUrl}`) : (m.teams?.away?.logo ? (m.teams.away.logo.startsWith("http") ? m.teams.away.logo : `${WF_BASE}${m.teams.away.logo}`) : ""),
        isLive: true, // This endpoint ONLY returns popular LIVE matches
        apiSource: "watchfooty",
        sources: [],
        watchfootyId: m.matchId,
        watchfootyStreams: streams,
        league: m.league || "",
        leagueLogo: m.leagueLogo ? (m.leagueLogo.startsWith("http") ? m.leagueLogo : `${WF_BASE}${m.leagueLogo}`) : "",
        homeScore: toPrimitive(m.scores?.home) ?? undefined,
        awayScore: toPrimitive(m.scores?.away) ?? undefined,
        currentMinute: toPrimitive(m.currentMinute) || undefined,
      };
    });
  } catch { return []; }
}

// ── Fetch WatchFooty sports list ──
async function fetchWatchfootySports(): Promise<SportCategory[]> {
  try {
    const res = await httpGet(`${WF_BASE}/api/v1/sports`);
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data.map((s: any) => ({
      id: mapWfSport(s.name || s.id || ""),
      name: SPORT_NAMES[mapWfSport(s.name || s.id || "")] || s.displayName || capitalize(s.name || ""),
      displayName: s.displayName || s.name || "",
    }));
  } catch { return []; }
}

// ── Fetch WatchFooty top leagues ──
async function fetchWatchfootyTopLeagues(sport?: string): Promise<string[]> {
  try {
    const url = sport
      ? `${WF_BASE}/api/v1/top-leagues/${encodeURIComponent(sport)}`
      : `${WF_BASE}/api/v1/top-leagues`;
    const res = await httpGet(url);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data.map(String) : [];
  } catch { return []; }
}

// ── Fetch WatchFooty top teams ──
async function fetchWatchfootyTopTeams(sport?: string): Promise<string[]> {
  try {
    const url = sport
      ? `${WF_BASE}/api/v1/top-teams/${encodeURIComponent(sport)}`
      : `${WF_BASE}/api/v1/top-teams`;
    const res = await httpGet(url);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data.map(String) : [];
  } catch { return []; }
}

// ── Fetch WatchFooty popular matches ──
async function fetchWatchfootyPopular(): Promise<LiveMatch[]> {
  try {
    const res = await httpGet(`${WF_BASE}/api/v1/matches/popular`);
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data.map((raw: any): LiveMatch => {
      const m = deepToPrimitive(raw); // Convert ALL {value, displayValue} objects to primitives
      const sport = mapWfSport(m.sport || "other");
      const streams = Array.isArray(m.streams) ? m.streams.map((s: any) => ({
        id: String(s.id || ""),
        url: s.url || "",
        quality: s.quality || "hd",
        language: s.language || "english",
        isRedirect: s.isRedirect || false,
        nsfw: s.nsfw || false,
        ads: s.ads || false,
      })) : [];
      return {
        id: `wf-${m.matchId || Math.random()}`,
        title: m.title || "Match",
        sport,
        sportName: SPORT_NAMES[sport] || m.sport || capitalize(sport),
        date: m.date ? new Date(m.date).getTime() : (m.timestamp ? m.timestamp * 1000 : 0),
        poster: m.poster ? (m.poster.startsWith("http") ? m.poster : `${WF_BASE}${m.poster}`) : "",
        popular: true,
        homeTeam: m.teams?.home?.name || "",
        awayTeam: m.teams?.away?.name || "",
        homeBadge: m.teams?.home?.logoUrl ? (m.teams.home.logoUrl.startsWith("http") ? m.teams.home.logoUrl : `${WF_BASE}${m.teams.home.logoUrl}`) : (m.teams?.home?.logo ? (m.teams.home.logo.startsWith("http") ? m.teams.home.logo : `${WF_BASE}${m.teams.home.logo}`) : ""),
        awayBadge: m.teams?.away?.logoUrl ? (m.teams.away.logoUrl.startsWith("http") ? m.teams.away.logoUrl : `${WF_BASE}${m.teams.away.logoUrl}`) : (m.teams?.away?.logo ? (m.teams.away.logo.startsWith("http") ? m.teams.away.logo : `${WF_BASE}${m.teams.away.logo}`) : ""),
        isLive: m.status === "in" || m.status === "live" || m.status === "1" || m.status === "2" || m.status === "HT" || m.status === "Q1" || m.status === "Q2" || m.status === "Q3" || m.status === "Q4" || m.status === "LIVE",
        apiSource: "watchfooty",
        sources: [],
        watchfootyId: m.matchId,
        watchfootyStreams: streams,
        league: m.league || "",
        leagueLogo: m.leagueLogo ? (m.leagueLogo.startsWith("http") ? m.leagueLogo : `${WF_BASE}${m.leagueLogo}`) : "",
        homeScore: toPrimitive(m.scores?.home) ?? undefined,
        awayScore: toPrimitive(m.scores?.away) ?? undefined,
        currentMinute: toPrimitive(m.currentMinute) || undefined,
      };
    });
  } catch { return []; }
}

// ── SOURCE 5: streamed.pk (9 stream sources: alpha–intel) ──
async function fetchStreamedPK(endpoint: string): Promise<LiveMatch[]> {
  try {
    const res = await httpGet(`https://streamed.pk${endpoint}`);
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data.map((m: any): LiveMatch => {
      const sources = Array.isArray(m.sources) ? m.sources.map((s: any) => ({ source: s.source || "", id: s.id || "" })) : [];
      const isLiveEndpoint = endpoint.includes("/live");

      return {
        id: `sp-${m.id || Math.random()}`,
        title: m.title || "Match",
        sport: mapCategoryToSport(m.category || m.sport || "other"),
        sportName: SPORT_NAMES[mapCategoryToSport(m.category || m.sport || "other")] || capitalize(m.category || "other"),
        date: m.date ? (typeof m.date === "number" ? (m.date > 1e12 ? m.date : m.date * 1000) : new Date(m.date).getTime()) : 0,
        poster: m.poster ? (m.poster.startsWith("http") ? m.poster : `https://streamed.pk${m.poster}`) : "",
        popular: m.popular || false,
        homeTeam: m.teams?.home?.name || m.home_team || extractTeam(m.title || "", 0),
        awayTeam: m.teams?.away?.name || m.away_team || extractTeam(m.title || "", 1),
        homeBadge: m.teams?.home?.badge ? (m.teams.home.badge.startsWith("http") ? m.teams.home.badge : `https://streamed.pk/api/images/badge/${m.teams.home.badge}.webp`) : (m.home_logo || ""),
        awayBadge: m.teams?.away?.badge ? (m.teams.away.badge.startsWith("http") ? m.teams.away.badge : `https://streamed.pk/api/images/badge/${m.teams.away.badge}.webp`) : (m.away_logo || ""),
        isLive: m.live || m.isLive || m.status === "live" || m.status === "in" || false,
        apiSource: "streamed",
        sources,
      };
    });
  } catch { return []; }
}

// ── SOURCE 6: ESPN (schedules + scores) ──
async function fetchESPNMatches(): Promise<LiveMatch[]> {
  const espnSports = [
    { sport: "basketball", league: "nba" },
    { sport: "football", league: "nfl" },
    { sport: "soccer", league: "eng.1" },
    { sport: "hockey", league: "nhl" },
    { sport: "baseball", league: "mlb" },
  ];
  const matches: LiveMatch[] = [];
  const results = await Promise.allSettled(
    espnSports.map(async (espn) => {
      try {
        const res = await httpGet(`https://site.api.espn.com/apis/site/v2/sports/${espn.sport}/${espn.league}/scoreboard`);
        if (!res.ok) return [];
        const data = await res.json();
        return (data.events || []).map((e: any): LiveMatch => {
          const comp = e.competitions?.[0];
          const home = comp?.competitors?.find((c: any) => c.homeAway === "home");
          const away = comp?.competitors?.find((c: any) => c.homeAway === "away");
          const sport = espn.sport === "soccer" ? "football" : espn.sport;
          return {
            id: `espn-${e.id}`,
            title: e.name || "Match",
            sport,
            sportName: SPORT_NAMES[sport] || capitalize(sport),
            date: e.date ? new Date(e.date).getTime() : 0,
            poster: "",
            popular: false,
            homeTeam: home?.team?.displayName || "",
            awayTeam: away?.team?.displayName || "",
            homeBadge: home?.team?.logo || "",
            awayBadge: away?.team?.logo || "",
            isLive: comp?.status?.type?.name === "in" || false,
            apiSource: "espn",
            sources: [],
            homeScore: home?.score ? parseInt(home.score) : undefined,
            awayScore: away?.score ? parseInt(away.score) : undefined,
          };
        });
      } catch { return []; }
    })
  );
  for (const r of results) {
    if (r.status === "fulfilled" && Array.isArray(r.value)) matches.push(...r.value);
  }
  return matches;
}

// ── SOURCE 7: sportsembed.su (embed URLs for live sports) ──
async function fetchSportsembedSu(): Promise<LiveMatch[]> {
  try {
    const res = await httpGet("https://sportsembed.su/api/events/live", { Referer: "https://sportsembed.su/" });
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data.map((ev: any): LiveMatch => {
      const sport = mapCategoryToSport(ev.sport || ev.category || "other");
      return {
        id: `se-${ev.id || Math.random()}`,
        title: ev.title || ev.name || "Live Event",
        sport,
        sportName: SPORT_NAMES[sport] || capitalize(ev.sport || "Sports"),
        date: ev.date ? new Date(ev.date).getTime() : (ev.start_time ? ev.start_time * 1000 : 0),
        poster: ev.poster || ev.image || "",
        popular: ev.featured || false,
        homeTeam: ev.home_team || ev.teams?.home?.name || extractTeam(ev.title || "", 0),
        awayTeam: ev.away_team || ev.teams?.away?.name || extractTeam(ev.title || "", 1),
        homeBadge: ev.home_logo || ev.teams?.home?.logo || "",
        awayBadge: ev.away_logo || ev.teams?.away?.logo || "",
        isLive: ev.live || ev.is_live || ev.status === "live" || ev.status === "in" || false,
        apiSource: "sportsembed",
        sources: [],
        sportsrcCategory: ev.category || ev.sport || "",
        sportsrcId: ev.id || "",
      };
    });
  } catch { return []; }
}

// ── Normalize team names for fuzzy matching ──
// Handles "Man City" vs "Manchester City", abbreviations, etc.
function normalizeTeamName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\bman\b/g, "manchester")
    .replace(/\bunited\b/g, "utd")
    .replace(/\bwolverhampton\b/g, "wolves")
    .replace(/\btottenham\b/g, "spurs")
    .replace(/\bblackburn\b/g, "rovers")
    .replace(/\bfc\b/g, "")
    .replace(/\bsc\b/g, "")
    .replace(/\bafc\b/g, "")
    .replace(/\binc\b/g, "")
    .trim();
}

// ── Merge & Deduplicate ──
// Uses fuzzy team name matching so "Man City vs Arsenal" (WatchFooty)
// merges with "Manchester City vs Arsenal" (StreamedPK)
function mergeMatches(lists: LiveMatch[][]): LiveMatch[] {
  const seen = new Map<string, LiveMatch>();
  // Also keep a separate index by StreamedPK source IDs for cross-provider matching
  const spSourceIndex = new Map<string, LiveMatch>(); // key: "source:id" -> match in seen

  for (const list of lists) {
    for (const m of list) {
      // Generate exact key first
      const exactKey = m.homeTeam && m.awayTeam
        ? `${m.sport}:${m.homeTeam.toLowerCase().trim()}:${m.awayTeam.toLowerCase().trim()}`
        : m.id;

      // Try exact match first
      let existing = seen.get(exactKey);

      // If no exact match, try fuzzy match by normalized team names
      if (!existing && m.homeTeam && m.awayTeam) {
        const normHome = normalizeTeamName(m.homeTeam);
        const normAway = normalizeTeamName(m.awayTeam);
        for (const [, existingMatch] of seen) {
          if (existingMatch.sport !== m.sport) continue;
          if (!existingMatch.homeTeam || !existingMatch.awayTeam) continue;
          const eNormHome = normalizeTeamName(existingMatch.homeTeam);
          const eNormAway = normalizeTeamName(existingMatch.awayTeam);
          // Direct match (order same or swapped)
          const directMatch =
            (normHome === eNormHome && normAway === eNormAway) ||
            (normHome === eNormAway && normAway === eNormHome);
          // Partial match: one team name contains the other
          const partialMatch =
            (normHome.includes(eNormHome) || eNormHome.includes(normHome)) &&
            (normAway.includes(eNormAway) || eNormAway.includes(normAway));
          if (directMatch || partialMatch) {
            existing = existingMatch;
            break;
          }
        }
      }

      // If still no match AND this match has StreamedPK sources, try matching by source IDs
      // This handles cases where team names are too different for fuzzy matching
      // but both matches reference the same StreamedPK stream
      if (!existing && m.sources && m.sources.length > 0) {
        for (const src of m.sources) {
          if (src.source && src.id) {
            const spKey = `sp:${src.source}:${src.id}`;
            if (spSourceIndex.has(spKey)) {
              existing = spSourceIndex.get(spKey)!;
              break;
            }
          }
        }
      }

      if (existing) {
        // Merge: prefer streamfree (has M3U8), fill missing fields
        if (m.apiSource === "streamfree" && existing.apiSource !== "streamfree") {
          const merged = { ...m, ...pickMissing(m, existing) };
          seen.set(exactKey, merged);
        } else {
          // Fill in missing fields from new match
          Object.assign(existing, pickMissing(existing, m));
        }
        // Also update the exactKey mapping if existing was found via fuzzy/source match
        if (!seen.has(exactKey) && existing) {
          seen.set(exactKey, existing);
        }
        continue;
      }
      seen.set(exactKey, m);

      // Index StreamedPK sources for future cross-provider matching
      if (m.sources && m.sources.length > 0) {
        for (const src of m.sources) {
          if (src.source && src.id) {
            spSourceIndex.set(`sp:${src.source}:${src.id}`, m);
          }
        }
      }
    }
  }
  return Array.from(seen.values()).sort((a, b) => {
    if (a.isLive && !b.isLive) return -1;
    if (!a.isLive && b.isLive) return 1;
    if (a.popular && !b.popular) return -1;
    if (!a.popular && b.popular) return 1;
    return a.date - b.date;
  });
}

function pickMissing(base: LiveMatch, fill: LiveMatch): Partial<LiveMatch> {
  const result: Partial<LiveMatch> = {};
  if (!base.homeBadge && fill.homeBadge) result.homeBadge = fill.homeBadge;
  if (!base.awayBadge && fill.awayBadge) result.awayBadge = fill.awayBadge;
  if (!base.poster && fill.poster) result.poster = fill.poster;
  if (!base.homeTeam && fill.homeTeam) result.homeTeam = fill.homeTeam;
  if (!base.awayTeam && fill.awayTeam) result.awayTeam = fill.awayTeam;
  if (!base.streamKey && fill.streamKey) result.streamKey = fill.streamKey;
  if (!base.streamCategory && fill.streamCategory) result.streamCategory = fill.streamCategory;
  if (fill.popular) result.popular = true;
  // Only mark as live if confirmed by a source; don't override a correct non-live status
  // from a more authoritative/recent source
  if (fill.isLive && !base.isLive) result.isLive = true;
  // ALWAYS merge sources from fill into base — be aggressive about preserving StreamedPK sources
  // This ensures StreamedPK sources are never lost even when WatchFooty matches come first
  if (fill.sources.length > 0) {
    if (base.sources.length === 0) {
      // Base has no sources — just use fill's sources
      result.sources = fill.sources;
    } else {
      // Base has sources — merge in any new ones from fill
      const existingKeys = new Set(base.sources.map(s => `${s.source}:${s.id}`));
      const newSources = fill.sources.filter(s => !existingKeys.has(`${s.source}:${s.id}`));
      if (newSources.length > 0) result.sources = [...base.sources, ...newSources];
    }
  }
  // WatchFooty fields — prefer WatchFooty data for scores, streams, league
  if (!base.watchfootyStreams && fill.watchfootyStreams && fill.watchfootyStreams.length > 0) result.watchfootyStreams = fill.watchfootyStreams;
  if (!base.league && fill.league) result.league = fill.league;
  if (!base.leagueLogo && fill.leagueLogo) result.leagueLogo = fill.leagueLogo;
  if (base.homeScore === undefined && fill.homeScore !== undefined) result.homeScore = fill.homeScore;
  if (base.awayScore === undefined && fill.awayScore !== undefined) result.awayScore = fill.awayScore;
  if (!base.currentMinute && fill.currentMinute) result.currentMinute = fill.currentMinute;
  if (!base.watchfootyId && fill.watchfootyId) result.watchfootyId = fill.watchfootyId;
  // Also pick missing DamiTV and SportsEmbed IDs
  if (!base.damitvId && fill.damitvId) result.damitvId = fill.damitvId;
  if (!base.sportsrcCategory && fill.sportsrcCategory) result.sportsrcCategory = fill.sportsrcCategory;
  if (!base.sportsrcId && fill.sportsrcId) result.sportsrcId = fill.sportsrcId;
  if (!base.channelCode && fill.channelCode) result.channelCode = fill.channelCode;
  if (!base.channelName && fill.channelName) result.channelName = fill.channelName;
  return result;
}

// ── Helpers ──
// Safely extract a primitive from API values that might be objects like {value, displayValue}
function toPrimitive(v: any): any {
  if (v === null || v === undefined) return undefined;
  if (typeof v === "object") {
    // Handle {value, displayValue} pattern from some APIs
    if ("value" in v) return toPrimitive(v.value);
    if ("displayValue" in v) return toPrimitive(v.displayValue);
    // Handle other object patterns
    if (typeof v.toString === "function" && v.toString() !== "[object Object]") return v.toString();
    return undefined;
  }
  return v;
}

// Deep conversion: recursively converts ALL {value, displayValue} objects to primitives
// Use this on raw API responses from WatchFooty BEFORE extracting fields
// NOTE: Do NOT restrict by key count — WatchFooty objects can have extra keys
// like {value, displayValue, type, shortDisplayValue} which must still be converted.
function deepToPrimitive(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(deepToPrimitive);
  if (typeof obj === "object") {
    // If this looks like a WatchFooty value object {value, displayValue}, extract the primitive
    // Do NOT limit by key count — some objects have extra metadata keys
    if ("value" in obj || "displayValue" in obj) {
      // Prefer numeric value, fall back to displayValue
      if ("value" in obj) return deepToPrimitive(obj.value);
      if ("displayValue" in obj) return deepToPrimitive(obj.displayValue);
    }
    // Recursively convert all nested properties
    const result: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
      result[k] = deepToPrimitive(v);
    }
    return result;
  }
  return obj;
}
function capitalize(s: string): string { return s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, " ") : ""; }
function mapCategoryToSport(cat: string): string {
  const m: Record<string, string> = {
    basketball: "basketball", hockey: "hockey", baseball: "baseball", soccer: "football",
    football: "american-football", tennis: "tennis", cricket: "cricket", racing: "motor-sports",
    combat: "fight", fighting: "fight", afl: "afl", rugby: "rugby", golf: "golf",
    "motor-sports": "motor-sports", motorsport: "motor-sports", darts: "darts",
  };
  return m[cat?.toLowerCase()] || "other";
}
function extractTeam(title: string, index: 0 | 1): string {
  if (!title) return "";
  const parts = title.split(/\s+vs\.?\s+|\s+@\s+|\s+-\s+/i);
  return parts[index]?.trim() || "";
}
function formatTitle(key: string): string {
  if (!key) return "";
  return key.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

// ── SPORTS LIST (default fallback) ──
const ALL_SPORTS: SportCategory[] = [
  { id: "football", name: "Football" },
  { id: "basketball", name: "Basketball" },
  { id: "american-football", name: "American Football" },
  { id: "hockey", name: "Hockey" },
  { id: "baseball", name: "Baseball" },
  { id: "tennis", name: "Tennis" },
  { id: "fight", name: "Fight / MMA / Boxing" },
  { id: "motor-sports", name: "Motor Sports" },
  { id: "rugby", name: "Rugby" },
  { id: "golf", name: "Golf" },
  { id: "cricket", name: "Cricket" },
  { id: "other", name: "TV Channels / Other" },
];

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sport = url.searchParams.get("sport") || "";
  const filter = url.searchParams.get("filter") || "";
  const mode = url.searchParams.get("mode") || ""; // "tv" for channels only

  try {
    // Fetch WatchFooty sports list + top leagues/teams in parallel with matches
    const wfSportsPromise = fetchWatchfootySports();
    const wfTopLeaguesPromise = fetchWatchfootyTopLeagues(sport || undefined);
    const wfTopTeamsPromise = fetchWatchfootyTopTeams(sport || undefined);

    // Fetch from ALL sources in parallel
    const [streamfree, streamfreeChannels, damiChannels, damiSports, wfLive, wfAll, wfPopularLive, wfPopular, streamedLive, streamedToday, streamedUpcoming, espn, sportsembed] = await Promise.allSettled([
      fetchStreamfreeStreams(),
      fetchStreamfreeChannelStatus(), // Check StreamFree TV channel availability
      fetchDamiTVChannels(),
      fetchDamiTVStreams(),
      fetchWatchfootyLive(),
      fetchWatchfootyAll(),
      fetchWatchfootyPopularLive(),
      fetchWatchfootyPopular(),
      fetchStreamedPK("/api/matches/live"),
      fetchStreamedPK("/api/matches/all-today"),
      fetchStreamedPK("/api/matches/upcoming"),
      fetchESPNMatches(),
      fetchSportsembedSu(),
    ]);

    const wfSports = await wfSportsPromise;
    const topLeagues = await wfTopLeaguesPromise;
    const topTeams = await wfTopTeamsPromise;

    // ── TV Channels (separate from matches) ──
    // Combine StreamFree verified channels + DamiTV 24/7 channels + StreamedPK TV channels
    const sfChannels = streamfreeChannels.status === "fulfilled" ? streamfreeChannels.value : [];
    const damiTVChannels = damiChannels.status === "fulfilled" ? damiChannels.value : [];
    // Also extract TV channels from StreamFree streams list (channels with no teams/timestamp)
    const sfStreamChannels = (streamfree.status === "fulfilled" ? streamfree.value : [])
      .filter(m => m.channelName && !m.homeTeam && !m.awayTeam);
    // Extract TV channels from StreamedPK (admin sources with no date = TV channels)
    const streamedTVChannels = (streamedLive.status === "fulfilled" ? streamedLive.value : [])
      .filter(m => m.sources?.some(s => s.source === "admin") && !m.date);

    // Deduplicate TV channels by name
    const allTVChannels: LiveMatch[] = [];
    const seenChannelNames = new Set<string>();
    for (const ch of [...sfChannels, ...sfStreamChannels, ...damiTVChannels, ...streamedTVChannels]) {
      const name = (ch.channelName || ch.title || "").toLowerCase().trim();
      if (!name || seenChannelNames.has(name)) continue;
      seenChannelNames.add(name);
      // Ensure channel fields are set
      if (!ch.channelName) ch.channelName = ch.title;
      if (!ch.channelCode) ch.channelCode = ch.streamCategory || ch.sport || "other";
      ch.isLive = true; // TV channels are always live
      allTVChannels.push(ch);
    }

    // Matches list: only real matches, NO TV channels mixed in
    const allLists: LiveMatch[][] = [
      // StreamFree: only real matches (filter out channels)
      (streamfree.status === "fulfilled" ? streamfree.value : []).filter(m => m.homeTeam || m.awayTeam || m.date),
      // DamiTV: only actual sports matches (already filtered in fetchDamiTVStreams)
      damiSports.status === "fulfilled" ? damiSports.value : [],
      wfLive.status === "fulfilled" ? wfLive.value : [],
      wfAll.status === "fulfilled" ? wfAll.value : [],
      wfPopularLive.status === "fulfilled" ? wfPopularLive.value : [],
      wfPopular.status === "fulfilled" ? wfPopular.value : [],
      // StreamedPK: only real matches (filter out admin/TV channels)
      (streamedLive.status === "fulfilled" ? streamedLive.value : []).filter(m => !m.sources?.some(s => s.source === "admin") || m.date),
      (streamedToday.status === "fulfilled" ? streamedToday.value : []).filter(m => !m.sources?.some(s => s.source === "admin") || m.date),
      streamedUpcoming.status === "fulfilled" ? streamedUpcoming.value : [],
      espn.status === "fulfilled" ? espn.value : [],
      sportsembed.status === "fulfilled" ? sportsembed.value : [],
    ];

    let matches = mergeMatches(allLists);

    // ── Time-based sanity check: unmark stale "live" matches ──
    const STALE_LIVE_THRESHOLD = 4 * 60 * 60 * 1000; // 4 hours (matches rarely last longer)
    const now = Date.now();
    for (const m of matches) {
      if (!m.isLive) continue;
      // Always-live TV channels (no specific match time) stay live
      if (!m.date) continue;
      // If the match started less than 4 hours ago, keep it as live
      if (m.date > now - STALE_LIVE_THRESHOLD) continue;
      // Match started over 4 hours ago — only keep live if an authoritative source confirms it
      // ESPN explicitly checks competition status type === "in"
      const confirmedByEspn = m.apiSource === "espn";
      // DamiTV always_live channels are 24/7 — keep them
      const isAlwaysLiveChannel = m.apiSource === "damitv" && !m.homeTeam && !m.awayTeam;
      // StreamedPK /api/matches/live is authoritative — only returns live matches
      const confirmedByStreamed = m.apiSource === "streamed" && m.isLive;
      // NOTE: WatchFooty /all and /popular endpoints are NOT authoritative for live status
      // They return ended matches too. Only /live endpoint is authoritative.
      // Since WatchFooty matches get apiSource "watchfooty" regardless of which endpoint,
      // we DO NOT give them a free pass for stale matches.
      if (!confirmedByEspn && !isAlwaysLiveChannel && !confirmedByStreamed) {
        m.isLive = false;
        m.popular = false; // Also unmark popular for ended matches
      }
    }

    // ── ALSO: If a match has no date and it's from WatchFooty /all or /popular ──
    // endpoint (not /live), don't trust its isLive flag blindly.
    // WatchFooty /popular returns matches that may have ended but are still "popular"

    // ── Unmark "popular" for ended matches ──
    // If a match is not live AND it started more than 4 hours ago, unmark it as popular
    // This prevents ended matches from showing in the "Popular Live" section
    for (const m of matches) {
      if (m.popular && !m.isLive && m.date && m.date < now - STALE_LIVE_THRESHOLD) {
        m.popular = false;
      }
    }

    // ── Filter out matches that have NO stream availability ──
    // If a match has no way to play it (no sources, no streamKey, no damitvId,
    // no watchfootyId, no channelCode, no sportsrcCategory/sportsrcId), remove it
    // Only filter for non-live matches that are NOT 24/7 TV channels
    matches = matches.filter(m => {
      // Always keep live matches — they might get streams from multiple providers
      if (m.isLive) return true;
      // Always keep popular matches
      if (m.popular) return true;
      // Always keep matches with any stream source
      if (m.sources && m.sources.length > 0) return true;
      if (m.streamKey) return true;
      if (m.damitvId) return true;
      if (m.watchfootyId) return true;
      if (m.channelCode) return true;
      if (m.sportsrcCategory && m.sportsrcId) return true;
      if (m.watchfootyStreams && m.watchfootyStreams.length > 0) return true;
      // For upcoming matches (future date), keep them even without sources
      // They might get streams closer to match time
      if (m.date && m.date > now) return true;
      // For non-live matches that already started but have no sources, hide them
      // unless they came from a source that might provide streams later
      if (m.apiSource === "streamfree" || m.apiSource === "damitv" || 
          m.apiSource === "sportsembed") return true;
      // No stream sources and not from a provider that could provide them — hide
      return false;
    });

    // Filter by sport
    if (sport) {
      matches = matches.filter(m => m.sport === sport);
    }

    // Filter for live matches
    if (filter === "live") {
      matches = matches.filter(m => {
        if (m.isLive) return true;
        if (!m.date) return false;
        return m.date <= now && m.date > now - 10800000;
      });
    }

    // For TV mode: use dami-tv channels as the primary source, fall back to streamfree
    if (mode === "tv") {
      const damiChannelsFound = matches.some(m => m.apiSource === "damitv" && m.channelName);
      if (!damiChannelsFound) {
        const alwaysLive = matches.filter(m => m.apiSource === "streamfree" && m.streamKey && !m.homeTeam && !m.awayTeam);
        for (const m of alwaysLive) {
          m.sport = "other";
          m.sportName = "TV Channel";
          m.channelName = m.title;
          m.channelCode = m.streamCategory || "";
          m.isLive = true;
        }
        const streamfreeAsChannels = matches.filter(m => m.apiSource === "streamfree" && m.streamKey);
        for (const m of streamfreeAsChannels) {
          if (!m.channelName) {
            m.channelName = m.homeTeam || m.title;
            m.channelCode = m.streamCategory || "";
          }
          if (m.sportName !== "TV Channel") {
            m.sportName = m.sportName || "TV Channel";
          }
        }
      }
    }

    // Compute live counts per sport
    const liveCountBySport: Record<string, number> = {};
    for (const m of matches) {
      if (m.isLive) {
        liveCountBySport[m.sport] = (liveCountBySport[m.sport] || 0) + 1;
      }
    }

    // Build sports list: prefer WatchFooty sports, merge with defaults
    let sportsList: SportCategory[] = ALL_SPORTS;
    if (wfSports.length > 0) {
      // Merge WF sports into our list
      const merged = new Map<string, SportCategory>();
      // Add WF sports first
      for (const ws of wfSports) {
        if (!merged.has(ws.id)) {
          merged.set(ws.id, { ...ws, liveCount: liveCountBySport[ws.id] || 0 });
        } else {
          const existing = merged.get(ws.id)!;
          merged.set(ws.id, { ...existing, displayName: ws.displayName || existing.displayName, liveCount: liveCountBySport[ws.id] || 0 });
        }
      }
      // Add any remaining sports that have matches
      for (const s of ALL_SPORTS) {
        if (!merged.has(s.id) && matches.some(m => m.sport === s.id)) {
          merged.set(s.id, { ...s, liveCount: liveCountBySport[s.id] || 0 });
        }
      }
      // Add the "other" category at the end
      if (!merged.has("other")) {
        merged.set("other", { id: "other", name: "Other", liveCount: liveCountBySport["other"] || 0 });
      }
      sportsList = Array.from(merged.values());
    }

    // Add live counts to sports
    sportsList = sportsList.map(s => ({ ...s, liveCount: liveCountBySport[s.id] || 0 }));

    // Count by source
    const sourceCounts: Record<string, number> = {};
    for (const m of matches) {
      sourceCounts[m.apiSource] = (sourceCounts[m.apiSource] || 0) + 1;
    }

    // Count popular live matches
    const popularLiveCount = matches.filter(m => m.isLive && m.popular).length;

    return NextResponse.json({
      matches,
      tvChannels: allTVChannels,
      sports: sportsList,
      total: matches.length,
      liveCount: Object.values(liveCountBySport).reduce((a, b) => a + b, 0),
      popularLiveCount,
      sources: sourceCounts,
      topLeagues,
      topTeams,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to fetch live data", details: error.message },
      { status: 500 }
    );
  }
}
