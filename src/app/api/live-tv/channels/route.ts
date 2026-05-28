import { NextResponse } from "next/server";

// ============================================================
// LIVE TV CHANNELS API — DamiTV + StreamFree ONLY
// Sources: DamiTV (dami-tv.pro/channels.json) + StreamFree (streamfree.app/streams)
// DamiTV embed: iframeUrl from channels.json (cdnlivetv.tv player)
// StreamFree embed: https://streamfree.app/embed/{category}/{key}?quality=1080p&category={cat}&server=origin
// All iframe embeds use sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
// ?source=damitv|streamfree|all (default: all)
// ============================================================

export const dynamic = "force-dynamic";
export const revalidate = 300; // Cache for 5 minutes

const TIMEOUT = 12000;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

// StreamFree category mapping (display category for the UI)
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

// Known StreamFree channel → correct embed category mapping
// The StreamFree API may group channels under "sports" but the embed URL needs
// the specific category (cricket, tennis, racing, etc.)
const SF_EMBED_CATEGORY_MAP: Record<string, string> = {
  skyf1: "racing",
  willow: "cricket",
  cricketsky: "cricket",
  skytennis: "tennis",
  skysportsgolf: "golf",
  skysportsfootball: "football",
  skysportsnews: "news",
  // Generic sports channels → soccer (their primary content)
  skysports: "soccer",
  skysportsaction: "soccer",
  skysportsarena: "soccer",
  btsport: "soccer",
  tntsports1: "soccer",
  espn: "soccer",
  cbc: "soccer",
  bbc: "soccer",
  supersport: "soccer",
};

// Smart StreamFree category resolver for embed URLs
function resolveSfEmbedCategory(streamKey: string, apiCategory: string, channelName: string): string {
  // Priority 1: Known channel mapping
  if (SF_EMBED_CATEGORY_MAP[streamKey]) return SF_EMBED_CATEGORY_MAP[streamKey];
  // Priority 2: If API category is specific (not generic "sports"), use it
  if (apiCategory && apiCategory !== "sports" && apiCategory !== "other") return apiCategory;
  // Priority 3: Detect from channel name
  const name = (channelName || "").toLowerCase();
  if (name.includes("cricket")) return "cricket";
  if (name.includes("tennis")) return "tennis";
  if (name.includes("f1") || name.includes("racing") || name.includes("rally") || name.includes("motor")) return "racing";
  if (name.includes("golf")) return "golf";
  if (name.includes("football") || name.includes("soccer")) return "football";
  if (name.includes("basketball") || name.includes("nba")) return "basketball";
  if (name.includes("baseball") || name.includes("mlb")) return "baseball";
  if (name.includes("hockey") || name.includes("nhl")) return "hockey";
  if (name.includes("fight") || name.includes("ufc") || name.includes("boxing")) return "combat";
  if (name.includes("rugby")) return "rugby";
  if (name.includes("news")) return "news";
  // Fallback
  return apiCategory || "sports";
}

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

// Category detection keywords
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Sports: ["sport", "espn", "fox sport", "nba", "nfl", "mlb", "nhl", "ufc", "f1", "cricket", "golf", "tennis", "racing", "motor", "fight", "boxing", "wwe", "premier", "laliga", "serie a", "bundesliga", "champions", "bein", "sky sport", "bt sport", "tnt", "cbs sport", "nbc sport", "arena sport", "super sport", "tsn", "willow", "olympic", "euro sport", "dazn", "afl", "nrl", "world cup"],
  News: ["news", "cnn", "bbc", "al jazeera", "nbc news", "cbs news", "fox news", "sky news", "cnbc", "bloomberg", "dw", "france 24", "ndtv", "geo news", "euronews"],
  Entertainment: ["hbo", "cinema", "movie", "comedy", "amc", "fx", "bravo", "lifetime", "tnt", "tbs", "paramount", "peacock", "discovery", "tlc", "hgtv", "nat geo", "big brother"],
  Kids: ["cartoon", "disney", "nick", "nickelodeon", "pbs kids", "boomerang", "kids"],
  Music: ["mtv", "vh1", "bet", "cmt", "music", "vevo"],
  Documentary: ["discovery", "nat geo", "national geographic", "history", "animal planet", "science", "smithsonian"],
  Movies: ["cinema", "hbo", "movie", "film", "starz", "showtime", "tcm"],
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
  "Serbia": { code: "RS", name: "Serbia", flag: "🇷🇸" },
  "Croatia": { code: "HR", name: "Croatia", flag: "🇭🇷" },
  "Israel": { code: "IL", name: "Israel", flag: "🇮🇱" },
};

interface Channel {
  id: string;
  name: string;
  category: string;
  sport?: string;
  country: { code: string; name: string; flag: string };
  embedUrl: string;
  source: "damitv" | "streamfree";
  poster?: string;
  logoUrl?: string;
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
  // DamiTV-specific extra data for the watch page
  damitvId?: string; // The resolve ID for HLS player
  damitvCdnUrl?: string; // cdnlivetv fallback URL
  damitvName?: string; // Channel name for embed generation
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
  if (lower.includes("arena sport")) {
    if (lower.includes("serbia")) return COUNTRY_PATTERNS["Serbia"];
    if (lower.includes("croatia")) return COUNTRY_PATTERNS["Croatia"];
  }
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

// ── Fetch DamiTV TV channels (from dami-tv.pro/channels.json) ──
// This provides 371+ TV channels (ESPN, Sky Sports, etc.) with logos
// PRIMARY embed: https://cdnlivetv.tv/api/v1/channels/player/?name={name}&code={code}&user=cdnlivetv&plan=free
// FALLBACK embed: https://dami-tv.pro/cdn-stream/{name}
async function fetchDamiTVChannels(): Promise<Channel[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT);

    const res = await fetch("https://dami-tv.pro/channels.json", {
      signal: controller.signal,
      headers: { Accept: "application/json", "User-Agent": UA, Referer: "https://dami-tv.pro/" },
    });
    clearTimeout(timeout);

    if (!res.ok) return [];
    const data = await res.json();

    const channelList = data.channels || [];
    if (!Array.isArray(channelList)) return [];

    const channels: Channel[] = [];
    for (const ch of channelList) {
      const name = ch.name || "";
      if (!name) continue;

      const category = detectCategory(name);
      const country = ch.country || { code: ch.code || "int", name: ch.countryName || "International", flag: ch.countryFlag || "🌍" };
      const channelId = ch.id || "";
      const encodedName = encodeURIComponent(name);

      // DamiTV iframe embed from channels.json — PRIMARY for all channels
      // iframeUrl is the cdnlivetv.tv player URL that works in iframe with sandbox
      const cdnIframeUrl = ch.iframeUrl || "";
      const defaultStreamUrl = ch.defaultUrl || "";

      // PRIMARY embed URL: iframeUrl from channels.json (cdnlivetv.tv CDN player)
      const embedUrl = cdnIframeUrl || defaultStreamUrl || `https://dami-tv.pro/cdn-stream/${encodedName}`;

      // Logo URL — comes from channels.json
      let logoUrl = ch.logo || "";
      if (logoUrl && !logoUrl.startsWith("http")) {
        logoUrl = `https://dami-tv.pro${logoUrl}`;
      }

      channels.push({
        id: `dami-${channelId || name.toLowerCase().replace(/[^a-z0-9]/g, "")}`,
        name,
        category,
        country: {
          code: (country.code || "int").toUpperCase(),
          name: country.name || "International",
          flag: country.flag || "🌍",
        },
        embedUrl,
        source: "damitv",
        poster: ch.poster || "",
        logoUrl,
        isLive: true,
        isAlwaysLive: true,
        status: "live",
        viewers: ch.viewers || 0,
        // DamiTV-specific data for the watch page to build multiple servers
        // channelId from channels.json is like "cdn-0"
        // Pass the channel name as damitvName for fallback server construction
        damitvId: channelId,
        damitvCdnUrl: cdnIframeUrl,
        damitvName: name,
        streamKey: channelId,
        streamCategory: name,
      });
    }
    return channels;
  } catch {
    return [];
  }
}

// ── Fetch StreamFree streams (live TV channels) ──
// Embed: https://streamfree.app/embed/{category}/{stream_key}?quality=1080p&category={cat}&server=origin
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
        // IMPORTANT: Resolve the CORRECT StreamFree category for embed URLs.
        // The API may return a generic "sports" category, but embed URLs need
        // the specific sport category (cricket, tennis, racing, etc.).
        const rawSfCategory = category || s.category;
        const sfCategory = resolveSfEmbedCategory(s.stream_key, rawSfCategory, s.name || "");

        const embedUrl = `https://streamfree.app/embed/${encodeURIComponent(sfCategory)}/${encodeURIComponent(s.stream_key)}?quality=1080p&category=${encodeURIComponent(sfCategory)}&server=origin`;

        channels.push({
          id: `sf-${s.stream_key}`,
          name: s.name || "Live Stream",
          category: SF_CATEGORY_MAP[category] || "General",
          sport: SF_SPORT_NAMES[category] || category,
          country: detectCountry(s.name || ""),
          embedUrl,
          source: "streamfree",
          poster: s.thumbnail_url ? `https://streamfree.app${s.thumbnail_url}` : "",
          logoUrl: s.team1?.logo || s.channel_logo || "",
          isLive,
          status: isLive ? "live" : "upcoming",
          league: s.league || "",
          homeTeam,
          awayTeam,
          homeBadge,
          awayBadge,
          streamKey: s.stream_key,
          streamCategory: sfCategory,
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
  const url = new URL(req.url);
  const sourceParam = url.searchParams.get("source") || "all";
  const searchQuery = url.searchParams.get("search") || "";
  const categoryFilter = url.searchParams.get("category") || "all";
  const countryFilter = url.searchParams.get("country") || "all";

  let allChannels: Channel[] = [];
  const errors: string[] = [];

  try {
    // Fetch from selected source(s) in parallel with per-source timeout
    // Each source gets its own timeout so a slow source doesn't block the other
    const SOURCE_TIMEOUT = 8000; // 8s per source (faster than the 12s internal timeout)
    const fetchPromises: Promise<{ channels: Channel[]; source: string }>[] = [];

    if (sourceParam === "damitv" || sourceParam === "all") {
      fetchPromises.push(
        Promise.race([
          fetchDamiTVChannels().then(channels => ({ channels, source: "damitv" })),
          new Promise<{ channels: Channel[]; source: string }>((resolve) =>
            setTimeout(() => resolve({ channels: [], source: "damitv" }), SOURCE_TIMEOUT)
          ),
        ])
      );
    }
    if (sourceParam === "streamfree" || sourceParam === "all") {
      fetchPromises.push(
        Promise.race([
          fetchStreamFreeChannels().then(channels => ({ channels, source: "streamfree" })),
          new Promise<{ channels: Channel[]; source: string }>((resolve) =>
            setTimeout(() => resolve({ channels: [], source: "streamfree" }), SOURCE_TIMEOUT)
          ),
        ])
      );
    }

    // Wait for all sources with an overall 15s timeout
    const overallTimeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Overall API timeout (15s)")), 15000)
    );

    let results: { channels: Channel[]; source: string }[];
    try {
      results = await Promise.race([
        Promise.allSettled(fetchPromises).then(settled =>
          settled
            .filter((r): r is PromiseFulfilledResult<{ channels: Channel[]; source: string }> => r.status === "fulfilled")
            .map(r => r.value)
        ),
        overallTimeout,
      ]);
    } catch {
      // Overall timeout — return whatever we have
      results = [];
    }

    for (const result of results) {
      if (result.channels.length > 0) {
        allChannels.push(...result.channels);
      } else {
        errors.push(`${result.source} returned no channels (may have timed out)`);
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

    // Source counts — ONLY DamiTV + StreamFree
    const damitvCount = allChannels.filter(c => c.source === "damitv").length;
    const sfCount = allChannels.filter(c => c.source === "streamfree").length;

    return NextResponse.json({
      success: allChannels.length > 0,
      total: filtered.length,
      totalAll: allChannels.length,
      damitvCount,
      sfCount,
      categories: Object.entries(categoryCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
      countries: sortedCountries,
      channels: filtered,
      ...(errors.length > 0 ? { warnings: errors } : {}),
    });
  } catch (error: any) {
    // Even on unexpected error, return whatever channels we collected
    console.error("Live TV channels API error:", error.message);
    const damitvCount = allChannels.filter(c => c.source === "damitv").length;
    const sfCount = allChannels.filter(c => c.source === "streamfree").length;

    if (allChannels.length > 0) {
      // Return partial results instead of 500 error
      return NextResponse.json({
        success: true,
        total: allChannels.length,
        totalAll: allChannels.length,
        damitvCount,
        sfCount,
        categories: [],
        countries: [],
        channels: allChannels,
        warnings: [`Partial results: ${error.message}`],
      });
    }

    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch channels", channels: [], categories: [], countries: [], total: 0, totalAll: 0, damitvCount: 0, sfCount: 0 },
      { status: 500 }
    );
  }
}
