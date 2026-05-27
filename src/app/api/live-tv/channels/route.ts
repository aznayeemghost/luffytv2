import { NextResponse } from "next/server";

// ============================================================
// DADDYLIVE CHANNELS API — Fetches channels from daddylive.org
// Returns categorized channels with embed URLs
// ============================================================

export const dynamic = "force-dynamic";
export const revalidate = 300; // Cache for 5 minutes

const TIMEOUT = 15000;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

// Country detection from channel name
const COUNTRY_PATTERNS: Record<string, { code: string; name: string; flag: string }> = {
  "USA": { code: "US", name: "United States", flag: "🇺🇸" },
  "UK": { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
  "France": { code: "FR", name: "France", flag: "🇫🇷" },
  "Italy": { code: "IT", name: "Italy", flag: "🇮🇹" },
  "Germany": { code: "DE", name: "Germany", flag: "🇩🇪" },
  "Spain": { code: "ES", name: "Spain", flag: "🇪🇸" },
  "Canada": { code: "CA", name: "Canada", flag: "🇨🇦" },
  "Poland": { code: "PL", name: "Poland", flag: "🇵🇱" },
  "Portugal": { code: "PT", name: "Portugal", flag: "🇵🇹" },
  "Greece": { code: "GR", name: "Greece", flag: "🇬🇷" },
  "Serbia": { code: "RS", name: "Serbia", flag: "🇷🇸" },
  "Israel": { code: "IL", name: "Israel", flag: "🇮🇱" },
  "Bulgaria": { code: "BG", name: "Bulgaria", flag: "🇧🇬" },
  "South Africa": { code: "ZA", name: "South Africa", flag: "🇿🇦" },
  "Sweden": { code: "SE", name: "Sweden", flag: "🇸🇪" },
  "Denmark": { code: "DK", name: "Denmark", flag: "🇩🇰" },
  "Qatar": { code: "QA", name: "Qatar", flag: "🇶🇦" },
  "Mexico": { code: "MX", name: "Mexico", flag: "🇲🇽" },
  "Czech": { code: "CZ", name: "Czech Republic", flag: "🇨🇿" },
  "Netherlands": { code: "NL", name: "Netherlands", flag: "🇳🇱" },
  "Brazil": { code: "BR", name: "Brazil", flag: "🇧🇷" },
  "Romania": { code: "RO", name: "Romania", flag: "🇷🇴" },
  "Australia": { code: "AU", name: "Australia", flag: "🇦🇺" },
  "New Zealand": { code: "NZ", name: "New Zealand", flag: "🇳🇿" },
  "Argentina": { code: "AR", name: "Argentina", flag: "🇦🇷" },
  "Turkey": { code: "TR", name: "Turkey", flag: "🇹🇷" },
  "UAE": { code: "AE", name: "UAE", flag: "🇦🇪" },
  "Malaysia": { code: "MY", name: "Malaysia", flag: "🇲🇾" },
  "Saudi Arabia": { code: "SA", name: "Saudi Arabia", flag: "🇸🇦" },
  "Croatia": { code: "HR", name: "Croatia", flag: "🇭🇷" },
  "Cyprus": { code: "CY", name: "Cyprus", flag: "🇨🇾" },
  "Russia": { code: "RU", name: "Russia", flag: "🇷🇺" },
  "India": { code: "IN", name: "India", flag: "🇮🇳" },
  "Ireland": { code: "IE", name: "Ireland", flag: "🇮🇪" },
  "Pakistan": { code: "PK", name: "Pakistan", flag: "🇵🇰" },
  "Angola": { code: "AO", name: "Angola", flag: "🇦🇴" },
  "Austria": { code: "AT", name: "Austria", flag: "🇦🇹" },
  "Bosnia": { code: "BA", name: "Bosnia", flag: "🇧🇦" },
  "Bangladesh": { code: "BD", name: "Bangladesh", flag: "🇧🇩" },
  "Chile": { code: "CL", name: "Chile", flag: "🇨🇱" },
  "Colombia": { code: "CO", name: "Colombia", flag: "🇨🇴" },
  "Egypt": { code: "EG", name: "Egypt", flag: "🇪🇬" },
  "Hungary": { code: "HU", name: "Hungary", flag: "🇭🇺" },
  "Uruguay": { code: "UY", name: "Uruguay", flag: "🇺🇾" },
  "Switzerland": { code: "CH", name: "Switzerland", flag: "🇨🇭" },
  "Norway": { code: "NO", name: "Norway", flag: "🇳🇴" },
  "Finland": { code: "FI", name: "Finland", flag: "🇫🇮" },
  "Japan": { code: "JP", name: "Japan", flag: "🇯🇵" },
  "Korea": { code: "KR", name: "South Korea", flag: "🇰🇷" },
  "China": { code: "CN", name: "China", flag: "🇨🇳" },
  "Thailand": { code: "TH", name: "Thailand", flag: "🇹🇭" },
  "Philippines": { code: "PH", name: "Philippines", flag: "🇵🇭" },
  "Indonesia": { code: "ID", name: "Indonesia", flag: "🇮🇩" },
  "Peru": { code: "PE", name: "Peru", flag: "🇵🇪" },
  "Venezuela": { code: "VE", name: "Venezuela", flag: "🇻🇪" },
  "Ecuador": { code: "EC", name: "Ecuador", flag: "🇪🇨" },
  "Cuba": { code: "CU", name: "Cuba", flag: "🇨🇺" },
  "Nigeria": { code: "NG", name: "Nigeria", flag: "🇳🇬" },
  "Kenya": { code: "KE", name: "Kenya", flag: "🇰🇪" },
  "Ghana": { code: "GH", name: "Ghana", flag: "🇬🇭" },
  "Morocco": { code: "MA", name: "Morocco", flag: "🇲🇦" },
  "Iraq": { code: "IQ", name: "Iraq", flag: "🇮🇶" },
  "Iran": { code: "IR", name: "Iran", flag: "🇮🇷" },
  "Afghanistan": { code: "AF", name: "Afghanistan", flag: "🇦🇫" },
  "Sri Lanka": { code: "LK", name: "Sri Lanka", flag: "🇱🇰" },
  "Nepal": { code: "NP", name: "Nepal", flag: "🇳🇵" },
  "Uzbekistan": { code: "UZ", name: "Uzbekistan", flag: "🇺🇿" },
  "Kazakhstan": { code: "KZ", name: "Kazakhstan", flag: "🇰🇿" },
  "Belarus": { code: "BY", name: "Belarus", flag: "🇧🇾" },
  "Ukraine": { code: "UA", name: "Ukraine", flag: "🇺🇦" },
  "Moldova": { code: "MD", name: "Moldova", flag: "🇲🇩" },
  "Georgia": { code: "GE", name: "Georgia", flag: "🇬🇪" },
  "Armenia": { code: "AM", name: "Armenia", flag: "🇦🇲" },
  "Azerbaijan": { code: "AZ", name: "Azerbaijan", flag: "🇦🇿" },
  "Albania": { code: "AL", name: "Albania", flag: "🇦🇱" },
  "North Macedonia": { code: "MK", name: "North Macedonia", flag: "🇲🇰" },
  "Slovenia": { code: "SI", name: "Slovenia", flag: "🇸🇮" },
  "Slovakia": { code: "SK", name: "Slovakia", flag: "🇸🇰" },
  "Lithuania": { code: "LT", name: "Lithuania", flag: "🇱🇹" },
  "Latvia": { code: "LV", name: "Latvia", flag: "🇱🇻" },
  "Estonia": { code: "EE", name: "Estonia", flag: "🇪🇪" },
  "Iceland": { code: "IS", name: "Iceland", flag: "🇮🇸" },
  "Luxembourg": { code: "LU", name: "Luxembourg", flag: "🇱🇺" },
  "Belgium": { code: "BE", name: "Belgium", flag: "🇧🇪" },
  "Singapore": { code: "SG", name: "Singapore", flag: "🇸🇬" },
  "Vietnam": { code: "VN", name: "Vietnam", flag: "🇻🇳" },
  "Myanmar": { code: "MM", name: "Myanmar", flag: "🇲🇲" },
  "Cambodia": { code: "KH", name: "Cambodia", flag: "🇰🇭" },
  "Laos": { code: "LA", name: "Laos", flag: "🇱🇦" },
  "Mongolia": { code: "MN", name: "Mongolia", flag: "🇲🇳" },
};

// Category detection keywords
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Sports: ["sport", "espn", "fox sport", "nba", "nfl", "mlb", "nhl", "ufc", "f1", "cricket", "golf", "tennis", "racing", "motor", "fight", "boxing", "wwe", "premier", "laliga", "serie a", "bundesliga", "champions", "bein", "sky sport", "bt sport", "tnt", "cbs sport", "nbc sport", "arena sport", "abu dhabi sport", "alkass", "super sport", "tsn", "dsn", "acl", "acc", "sirius", "willow", "fan", "olympic", "euro sport", "sport1", "spt", "a spor", "a sport", "star sport", "ten sport", "setanta", "premier sport", "dazn", "vamos", "match", "laliga", "ligue", "bn", "fox footy", "nrl", "afl", "world cup"],
  News: ["news", "cnn", "bbc", "al jazeera", "nbc news", "cbs news", "fox news", "sky news", "abc news", "msnbc", "cnbc", "reuters", "bloomberg", "dw", "france 24", "rt ", "ndtv", "ary news", "geo news", "express news", "abp", "aaj tak", "india today", "times now", "wion", "euronews", "itv news"],
  Entertainment: ["hbo", "cinema", "movie", "comedy", "amc", "fx", "bravo", "lifetime", "tnt", "tbs", "usa network", "syfy", "e!", "mtv", "vh1", "trutv", "freeform", "oxygen", "hallmark", "lifetime", "fxx", "spike", "paramount", "peacock", "discovery", "tlc", "hgtv", "bravo", "food network", "travel channel", "nat geo", "national geographic", "history", "ae", "investigation", "oxygen", "lifetime movie"],
  Kids: ["cartoon", "disney", "nick", "nickelodeon", "pbs kids", "baby", "boomerang", "cartoonito", "disney jr", "disney xd", "nick jr", "nicktoons", "teen", "kids"],
  Music: ["mtv", "vh1", "bet", "cmt", "music", "vevo", "trace", "mtv hits", "mtv base"],
  Documentary: ["discovery", "nat geo", "national geographic", "history", "animal planet", "science", "curiosity", "smithsonian"],
  Movies: ["cinema", "hbo", "movie", "film", "starz", "showtime", "encore", "fxm", "sundance", "ifc", "tcm"],
};

interface Channel {
  id: string;
  name: string;
  category: string;
  country: { code: string; name: string; flag: string };
  embedUrl: string;
  logo?: string;
}

function detectCountry(name: string): { code: string; name: string; flag: string } {
  const lower = name.toLowerCase();

  // Direct country suffix matching (most reliable)
  for (const [suffix, country] of Object.entries(COUNTRY_PATTERNS)) {
    if (lower.endsWith(` ${suffix.toLowerCase()}`) || lower.endsWith(` (${suffix.toLowerCase()})`)) {
      return country;
    }
  }

  // Country code patterns (US, UK, FR, etc.)
  const codeMatch = lower.match(/\b(us|uk|fr|it|de|es|ca|pl|pt|gr|rs|il|bg|za|se|dk|qa|mx|cz|nl|br|ro|au|nz|ar|tr|ae|my|sa|hr|cy|ru|in|ie|pk|ao|at|ba|bd|cl|co|eg|hu|uy|ch|no|fi|jp|kr|cn|th|ph|id)\b/i);
  if (codeMatch) {
    const code = codeMatch[1].toUpperCase();
    const found = Object.values(COUNTRY_PATTERNS).find(c => c.code === code);
    if (found) return found;
  }

  // Specific channel name patterns
  if (lower.includes("arab") || lower.includes("bein") || lower.includes("mbc")) return COUNTRY_PATTERNS["Qatar"];
  if (lower.includes("setanta") || lower.includes("eir")) return COUNTRY_PATTERNS["Ireland"];
  if (lower.includes("ten ") || lower.includes("foxtel")) return COUNTRY_PATTERNS["Australia"];
  if (lower.includes("sky ") && !lower.includes("usa")) return COUNTRY_PATTERNS["UK"];
  if (lower.includes("bt sport") || lower.includes("tnt sport")) return COUNTRY_PATTERNS["UK"];
  if (lower.includes("star ") && lower.includes("sport")) return COUNTRY_PATTERNS["India"];
  if (lower.includes("willow") || lower.includes("hotstar")) return COUNTRY_PATTERNS["India"];
  if (lower.includes("super sport")) return COUNTRY_PATTERNS["South Africa"];
  if (lower.includes("dazn ") && !lower.includes("usa")) return COUNTRY_PATTERNS["Germany"];
  if (lower.includes("movistar")) return COUNTRY_PATTERNS["Spain"];
  if (lower.includes("canal+")) return COUNTRY_PATTERNS["France"];

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

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const searchQuery = url.searchParams.get("search") || "";
    const categoryFilter = url.searchParams.get("category") || "all";
    const countryFilter = url.searchParams.get("country") || "all";

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT);

    const res = await fetch("https://daddylive.org/api/channels", {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": UA,
      },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`Daddylive API responded with status ${res.status}`);
    }

    const data = await res.json();

    if (!Array.isArray(data)) {
      throw new Error("Invalid response format from Daddylive API");
    }

    // Process and categorize channels
    let channels: Channel[] = data.map((item: any, idx: number) => {
      const id = String(item.channel_id || `ch-${idx}`);
      const name = String(item.channel_name || item.name || `Channel ${idx + 1}`);
      const embedUrl = `https://daddylive.org/embed/embed.php?id=${id}&player=1&source=tv.json`;

      return {
        id,
        name,
        category: detectCategory(name),
        country: detectCountry(name),
        embedUrl,
      };
    });

    // Apply filters
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      channels = channels.filter(ch => ch.name.toLowerCase().includes(q));
    }

    if (categoryFilter !== "all") {
      channels = channels.filter(ch => ch.category.toLowerCase() === categoryFilter.toLowerCase());
    }

    if (countryFilter !== "all") {
      channels = channels.filter(ch => ch.country.code === countryFilter);
    }

    // Compute category counts (from ALL channels, not filtered)
    const allChannels: Channel[] = data.map((item: any, idx: number) => {
      const id = String(item.channel_id || `ch-${idx}`);
      const name = String(item.channel_name || item.name || `Channel ${idx + 1}`);
      return {
        id,
        name,
        category: detectCategory(name),
        country: detectCountry(name),
        embedUrl: `https://daddylive.org/embed/embed.php?id=${id}&player=1&source=tv.json`,
      };
    });

    const categoryCounts: Record<string, number> = {};
    for (const ch of allChannels) {
      categoryCounts[ch.category] = (categoryCounts[ch.category] || 0) + 1;
    }

    const countryCounts: Record<string, { code: string; name: string; flag: string; count: number }> = {};
    for (const ch of allChannels) {
      const key = ch.country.code;
      if (!countryCounts[key]) {
        countryCounts[key] = { ...ch.country, count: 0 };
      }
      countryCounts[key].count++;
    }

    // Sort countries by count descending
    const sortedCountries = Object.values(countryCounts).sort((a, b) => b.count - a.count);

    return NextResponse.json({
      success: true,
      total: channels.length,
      totalAll: allChannels.length,
      categories: Object.entries(categoryCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
      countries: sortedCountries,
      channels,
    });
  } catch (error: any) {
    console.error("Daddylive channels API error:", error.message);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch channels", channels: [], categories: [], countries: [], total: 0, totalAll: 0 },
      { status: 500 }
    );
  }
}
