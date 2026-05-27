import { NextResponse } from "next/server";

// ============================================================
// LIVE TV CHANNELS API — Multi-Source
// Sources: Daddylive + DamiTV + StreamFree
// ?source=daddylive|damitv|streamfree|all (default: all)
// ============================================================

export const dynamic = "force-dynamic";
export const revalidate = 300; // Cache for 5 minutes

const TIMEOUT = 8000;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

// ── DamiTV sport category mapping ──
const DAMI_CATEGORY_MAP: Record<string, string> = {
  football: "Sports",
  basketball: "Sports",
  "american-football": "Sports",
  baseball: "Sports",
  fight: "Sports",
  fighting: "Sports",
  cricket: "Sports",
  rugby: "Sports",
  afl: "Sports",
  "motor-sports": "Sports",
  motorsport: "Sports",
  hockey: "Sports",
  "ice-hockey": "Sports",
  wrestling: "Sports",
  wwe: "Sports",
  "24-7-streams": "Entertainment",
  entertainment: "Entertainment",
};

const DAMI_SPORT_NAMES: Record<string, string> = {
  football: "Football",
  basketball: "Basketball",
  "american-football": "NFL",
  baseball: "MLB",
  fight: "UFC / Boxing",
  fighting: "UFC / Boxing",
  cricket: "Cricket",
  rugby: "Rugby",
  afl: "AFL",
  "motor-sports": "F1 / Motorsport",
  motorsport: "F1 / Motorsport",
  hockey: "Ice Hockey",
  "ice-hockey": "Ice Hockey",
  wrestling: "WWE",
  wwe: "WWE",
};

// StreamFree category mapping to our categories
// StreamFree is a Live TV source — map to proper categories, not all to Sports
const SF_CATEGORY_MAP: Record<string, string> = {
  soccer: "Sports",
  basketball: "Sports",
  hockey: "Sports",
  combat: "Sports",
  baseball: "Sports",
  football: "Sports",
  racing: "Sports",
  tennis: "Sports",
  cricket: "Sports",
  entertainment: "Entertainment",
  news: "News",
  kids: "Kids",
  music: "Music",
  movies: "Movies",
  documentary: "Documentary",
  lifestyle: "Entertainment",
  comedy: "Entertainment",
  reality: "Entertainment",
  drama: "Entertainment",
  science: "Documentary",
  nature: "Documentary",
  tech: "Documentary",
  education: "Documentary",
  religious: "Entertainment",
  general: "General",
};

const SF_SPORT_NAMES: Record<string, string> = {
  soccer: "Football",
  basketball: "Basketball",
  hockey: "Ice Hockey",
  combat: "UFC / Boxing",
  baseball: "MLB",
  football: "NFL",
  racing: "F1 / Motorsport",
  tennis: "Tennis",
  cricket: "Cricket",
};

// Country detection from channel name
const COUNTRY_PATTERNS: Record<string, { code: string; name: string; flag: string }> = {
  "USA": { code: "US", name: "United States", flag: "🇺🇸" },
  "UK": { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
  "France": { code: "FR", name: "France", flag: "🇫🇷" },
  "Italy": { code: "IT", name: "Italy", flag: "🇮🇹" },
  "Germany": { code: "DE", name: "Germany", flag: "🇩🇪" },
  "Spain": { code: "ES", name: "Spain", flag: "🇪🇸" },
  "Canada": { code: "CA", name: "Canada", flag: "🇨🇦" },
  "India": { code: "IN", name: "India", flag: "🇮🇳" },
  "Pakistan": { code: "PK", name: "Pakistan", flag: "🇵🇰" },
  "Australia": { code: "AU", name: "Australia", flag: "🇦🇺" },
  "Brazil": { code: "BR", name: "Brazil", flag: "🇧🇷" },
  "Japan": { code: "JP", name: "Japan", flag: "🇯🇵" },
  "Qatar": { code: "QA", name: "Qatar", flag: "🇶🇦" },
  "UAE": { code: "AE", name: "UAE", flag: "🇦🇪" },
  "Saudi Arabia": { code: "SA", name: "Saudi Arabia", flag: "🇸🇦" },
  "Turkey": { code: "TR", name: "Turkey", flag: "🇹🇷" },
  "South Africa": { code: "ZA", name: "South Africa", flag: "🇿🇦" },
  "Ireland": { code: "IE", name: "Ireland", flag: "🇮🇪" },
  "Netherlands": { code: "NL", name: "Netherlands", flag: "🇳🇱" },
  "Poland": { code: "PL", name: "Poland", flag: "🇵🇱" },
  "Portugal": { code: "PT", name: "Portugal", flag: "🇵🇹" },
  "Argentina": { code: "AR", name: "Argentina", flag: "🇦🇷" },
  "Mexico": { code: "MX", name: "Mexico", flag: "🇲🇽" },
  "Sweden": { code: "SE", name: "Sweden", flag: "🇸🇪" },
  "Denmark": { code: "DK", name: "Denmark", flag: "🇩🇰" },
  "Norway": { code: "NO", name: "Norway", flag: "🇳🇴" },
  "Russia": { code: "RU", name: "Russia", flag: "🇷🇺" },
};

// Category detection keywords for Daddylive
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Sports: ["sport", "espn", "fox sport", "nba", "nfl", "mlb", "nhl", "ufc", "f1", "cricket", "golf", "tennis", "racing", "motor", "fight", "boxing", "wwe", "premier", "laliga", "serie a", "bundesliga", "champions", "bein", "sky sport", "bt sport", "tnt", "cbs sport", "nbc sport", "arena sport", "super sport", "tsn", "willow", "olympic", "euro sport", "dazn", "afl", "nrl", "world cup"],
  News: ["news", "cnn", "bbc", "al jazeera", "nbc news", "cbs news", "fox news", "sky news", "cnbc", "bloomberg", "dw", "france 24", "ndtv", "geo news", "euronews"],
  Entertainment: ["hbo", "cinema", "movie", "comedy", "amc", "fx", "bravo", "lifetime", "tnt", "tbs", "paramount", "peacock", "discovery", "tlc", "hgtv", "nat geo"],
  Kids: ["cartoon", "disney", "nick", "nickelodeon", "pbs kids", "boomerang", "kids"],
  Music: ["mtv", "vh1", "bet", "cmt", "music", "vevo"],
  Documentary: ["discovery", "nat geo", "national geographic", "history", "animal planet", "science", "smithsonian"],
  Movies: ["cinema", "hbo", "movie", "film", "starz", "showtime", "tcm"],
};

interface Channel {
  id: string;
  name: string;
  category: string;
  sport?: string;
  country: { code: string; name: string; flag: string };
  embedUrl: string;
  source: "daddylive" | "damitv" | "streamfree";
  poster?: string;
  isLive?: boolean;
  isAlwaysLive?: boolean;
  status?: string;
  league?: string;
  homeTeam?: string;
  awayTeam?: string;
  homeBadge?: string;
  awayBadge?: string;
  streamKey?: string;
  streamCategory?: string;
  viewers?: number;
}

function detectCountry(name: string): { code: string; name: string; flag: string } {
  const lower = name.toLowerCase();
  for (const [suffix, country] of Object.entries(COUNTRY_PATTERNS)) {
    if (lower.endsWith(` ${suffix.toLowerCase()}`) || lower.endsWith(` (${suffix.toLowerCase()})`)) {
      return country;
    }
  }
  if (lower.includes("arab") || lower.includes("bein") || lower.includes("mbc")) return COUNTRY_PATTERNS["Qatar"];
  if (lower.includes("sky ") && !lower.includes("usa")) return COUNTRY_PATTERNS["UK"];
  if (lower.includes("bt sport") || lower.includes("tnt sport")) return COUNTRY_PATTERNS["UK"];
  if (lower.includes("star ") && lower.includes("sport")) return COUNTRY_PATTERNS["India"];
  if (lower.includes("willow") || lower.includes("hotstar")) return COUNTRY_PATTERNS["India"];
  if (lower.includes("super sport")) return COUNTRY_PATTERNS["South Africa"];
  if (lower.includes("dazn ") && !lower.includes("usa")) return COUNTRY_PATTERNS["Germany"];
  return { code: "INT", name: "International", flag: "🌍" };
}

function detectCategory(name: string): string {
  const lower = name.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) return category;
    }
  }
  return "General";
}

// ── Fetch Daddylive channels ──
async function fetchDaddyliveChannels(): Promise<Channel[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT);

    const res = await fetch("https://daddylive.org/api/channels", {
      signal: controller.signal,
      headers: { Accept: "application/json", "User-Agent": UA },
    });
    clearTimeout(timeout);

    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data.map((item: any, idx: number) => {
      const id = String(item.channel_id || `dl-${idx}`);
      const name = String(item.channel_name || item.name || `Channel ${idx + 1}`);
      const category = detectCategory(name);
      return {
        id: `dl-${id}`,
        name,
        category,
        country: detectCountry(name),
        embedUrl: `https://daddylive.org/embed/embed.php?id=${id}&player=1&source=tv.json`,
        source: "daddylive" as const,
        isLive: true,
        isAlwaysLive: category !== "Sports",
        status: "live",
      };
    });
  } catch {
    return [];
  }
}

// ── Fetch DamiTV streams (live + upcoming matches) ──
async function fetchDamiTVChannels(): Promise<Channel[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT);

    const res = await fetch("https://dami-tv.pro/papi/api/streams", {
      signal: controller.signal,
      headers: { Accept: "application/json", "User-Agent": UA },
    });
    clearTimeout(timeout);

    if (!res.ok) return [];
    const data = await res.json();
    if (!data.streams || !Array.isArray(data.streams)) return [];

    const channels: Channel[] = [];
    for (const category of data.streams) {
      if (!Array.isArray(category.streams)) continue;
      const catName = (category.category || "").toLowerCase();
      const is247 = catName.includes("24/7") || catName === "24-7-streams";

      for (const s of category.streams) {
        // Skip ended matches
        if (s.status === "ended" || s.status === "finished") continue;
        // For non-24/7 channels, only include live or upcoming
        if (!is247 && s.always_live !== 1) {
          const isLive = s.status === "live" || s.is_live === true;
          const isUpcoming = s.status === "upcoming" || s.status === "pre";
          if (!isLive && !isUpcoming) continue;
        }

        const sport = (s.category_name || category.category || "").toLowerCase();
        const homeTeam = s.teams?.home?.name || "";
        const awayTeam = s.teams?.away?.name || "";
        const homeBadge = s.teams?.home?.badge || s.teams?.home?.logo || "";
        const awayBadge = s.teams?.away?.badge || s.teams?.away?.logo || "";
        const isLive = s.status === "live" || s.is_live === true || s.always_live === 1;

        channels.push({
          id: `dami-${s.id || s.uri_name || Math.random().toString(36).slice(2)}`,
          name: s.name || s.title || "Live Stream",
          category: DAMI_CATEGORY_MAP[sport] || (is247 ? "Entertainment" : "Sports"),
          sport: DAMI_SPORT_NAMES[sport] || sport,
          country: detectCountry(s.name || ""),
          embedUrl: s.embed || `https://dami-tv.pro/embed/?id=${encodeURIComponent(s.id || "")}`,
          source: "damitv",
          poster: s.poster || "",
          isLive,
          isAlwaysLive: is247 || s.always_live === 1,
          status: s.status || (isLive ? "live" : "upcoming"),
          league: s.league || "",
          homeTeam,
          awayTeam,
          homeBadge,
          awayBadge,
        });
      }
    }
    return channels;
  } catch {
    return [];
  }
}

// ── Fetch StreamFree streams (live sports with team logos) ──
async function fetchStreamFreeChannels(): Promise<Channel[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT);

    const res = await fetch("https://streamfree.app/streams", {
      signal: controller.signal,
      headers: { Accept: "application/json", "User-Agent": UA },
    });
    clearTimeout(timeout);

    if (!res.ok) return [];
    const data = await res.json();
    if (!data.streams || typeof data.streams !== "object") return [];

    const channels: Channel[] = [];
    for (const [category, streams] of Object.entries(data.streams)) {
      if (!Array.isArray(streams)) continue;

      for (const s of streams as any[]) {
        if (!s.stream_key || !s.name) continue;

        const homeTeam = s.team1?.name || "";
        const awayTeam = s.team2?.name || "";
        const homeBadge = s.team1?.logo || "";
        const awayBadge = s.team2?.logo || "";
        const isLive = s.match_timestamp ? (s.match_timestamp * 1000) <= Date.now() : true;

        // Build embed URL for StreamFree player
        const embedUrl = `https://streamfree.app/embed/${encodeURIComponent(s.category || category)}/${encodeURIComponent(s.stream_key)}?quality=1080p&category=${encodeURIComponent(s.category || category)}&server=auto`;

        channels.push({
          id: `sf-${s.stream_key}`,
          name: s.name || "Live Stream",
          category: SF_CATEGORY_MAP[category] || "General",
          sport: SF_SPORT_NAMES[category] || category,
          country: detectCountry(s.name || ""),
          embedUrl,
          source: "streamfree",
          poster: s.thumbnail_url ? `https://streamfree.app${s.thumbnail_url}` : "",
          isLive,
          status: isLive ? "live" : "upcoming",
          league: s.league || "",
          homeTeam,
          awayTeam,
          homeBadge,
          awayBadge,
          streamKey: s.stream_key,
          streamCategory: s.category || category,
          viewers: s.viewers || 0,
        });
      }
    }
    return channels;
  } catch {
    return [];
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const sourceParam = url.searchParams.get("source") || "all";
    const searchQuery = url.searchParams.get("search") || "";
    const categoryFilter = url.searchParams.get("category") || "all";
    const countryFilter = url.searchParams.get("country") || "all";

    let allChannels: Channel[] = [];

    // Fetch from selected source(s) in parallel
    const fetchPromises: Promise<Channel[]>[] = [];
    if (sourceParam === "daddylive" || sourceParam === "all") fetchPromises.push(fetchDaddyliveChannels());
    if (sourceParam === "damitv" || sourceParam === "all") fetchPromises.push(fetchDamiTVChannels());
    if (sourceParam === "streamfree" || sourceParam === "all") fetchPromises.push(fetchStreamFreeChannels());

    const results = await Promise.allSettled(fetchPromises);
    for (const result of results) {
      if (result.status === "fulfilled") {
        allChannels.push(...result.value);
      }
    }

    // Sort: live first, then alphabetically
    allChannels.sort((a, b) => {
      if (a.isLive && !b.isLive) return -1;
      if (!a.isLive && b.isLive) return 1;
      return a.name.localeCompare(b.name);
    });

    // Apply filters
    let filtered = allChannels;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(ch =>
        ch.name.toLowerCase().includes(q) ||
        (ch.league && ch.league.toLowerCase().includes(q)) ||
        (ch.homeTeam && ch.homeTeam.toLowerCase().includes(q)) ||
        (ch.awayTeam && ch.awayTeam.toLowerCase().includes(q))
      );
    }
    if (categoryFilter !== "all") {
      filtered = filtered.filter(ch => ch.category.toLowerCase() === categoryFilter.toLowerCase());
    }
    if (countryFilter !== "all") {
      filtered = filtered.filter(ch => ch.country.code === countryFilter);
    }

    // Compute category counts from ALL channels
    const categoryCounts: Record<string, number> = {};
    for (const ch of allChannels) {
      categoryCounts[ch.category] = (categoryCounts[ch.category] || 0) + 1;
    }

    // Compute country counts
    const countryCounts: Record<string, { code: string; name: string; flag: string; count: number }> = {};
    for (const ch of allChannels) {
      const key = ch.country.code;
      if (!countryCounts[key]) {
        countryCounts[key] = { ...ch.country, count: 0 };
      }
      countryCounts[key].count++;
    }

    const sortedCountries = Object.values(countryCounts).sort((a, b) => b.count - a.count);

    // Source counts
    const daddyCount = allChannels.filter(c => c.source === "daddylive").length;
    const damiCount = allChannels.filter(c => c.source === "damitv").length;
    const sfCount = allChannels.filter(c => c.source === "streamfree").length;

    return NextResponse.json({
      success: true,
      total: filtered.length,
      totalAll: allChannels.length,
      daddyCount,
      damiCount,
      sfCount,
      categories: Object.entries(categoryCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
      countries: sortedCountries,
      channels: filtered,
    });
  } catch (error: any) {
    console.error("Live TV channels API error:", error.message);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch channels", channels: [], categories: [], countries: [], total: 0, totalAll: 0, daddyCount: 0, damiCount: 0, sfCount: 0 },
      { status: 500 }
    );
  }
}
