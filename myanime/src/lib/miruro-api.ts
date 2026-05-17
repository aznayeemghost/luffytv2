// Miruro API Client - Direct m3u8 streaming for sub & dub
// Based on the same API that powers miruro.tv
// Returns AniList-based data with direct stream URLs

const MIRURO_API = "https://miruro-api.vercel.app";

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0",
  Accept: "application/json",
  Origin: "https://miruro.tv",
  Referer: "https://miruro.tv/",
};

async function fetchWithRetry(url: string, options: RequestInit, retries = 2): Promise<Response> {
  for (let i = 0; i <= retries; i++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok) return res;
      if (res.status === 429 || res.status >= 500) {
        if (i < retries) {
          await new Promise(r => setTimeout(r, 1000 * (i + 1)));
          continue;
        }
      }
      return res;
    } catch (err) {
      if (i === retries) throw err;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw new Error("Max retries exceeded");
}

// ---- Types ----
export interface MiruroAnimeResult {
  id: number;
  title: { romaji?: string; english?: string; native?: string };
  type?: string;
  format?: string;
  status?: string;
  description?: string;
  season?: string;
  seasonYear?: number;
  episodes?: number;
  duration?: number;
  coverImage?: { extraLarge?: string; large?: string; medium?: string; color?: string };
  bannerImage?: string;
  genres?: string[];
  averageScore?: number;
  popularity?: number;
  trending?: number;
  countryOfOrigin?: string;
  isAdult?: boolean;
}

export interface MiruroEpisode {
  number: number;
  slug: string;
  title?: string;
  thumbnail?: string;
  isFiller?: boolean;
  airDate?: string;
}

export interface MiruroWatchSource {
  url: string;
  quality?: string;
  isM3U8?: boolean;
  sourceType?: "internal" | "external"; // internal = direct play, external = iframe/redirect
}

export interface MiruroWatchResult {
  sources: MiruroWatchSource[];
  subtitles?: { url: string; lang: string; language: string }[];
  intro?: { start: number; end: number };
  outro?: { start: number; end: number };
  headers?: Record<string, string>;
  provider: string;
}

export interface MiruroSearchResult {
  currentPage: number;
  hasNextPage: boolean;
  results: MiruroAnimeResult[];
}

// ---- API Functions ----

export async function miruroSearch(query: string, page = 1): Promise<MiruroSearchResult> {
  try {
    const res = await fetchWithRetry(
      `${MIRURO_API}/search?q=${encodeURIComponent(query)}&page=${page}`,
      { headers: HEADERS, next: { revalidate: 120 } }
    );
    if (!res.ok) throw new Error(`Search failed: ${res.status}`);
    return await res.json();
  } catch {
    return { currentPage: page, hasNextPage: false, results: [] };
  }
}

export async function miruroInfo(anilistId: number): Promise<MiruroAnimeResult | null> {
  try {
    const res = await fetchWithRetry(`${MIRURO_API}/info/${anilistId}`, {
      headers: HEADERS, next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.data || data || null;
  } catch {
    return null;
  }
}

export async function miruroTrending(page = 1, perPage = 20): Promise<MiruroAnimeResult[]> {
  try {
    const res = await fetchWithRetry(
      `${MIRURO_API}/trending?page=${page}&perPage=${perPage}`,
      { headers: HEADERS, next: { revalidate: 300 } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data?.results || data?.media || [];
  } catch {
    return [];
  }
}

export async function miruroPopular(page = 1, perPage = 20): Promise<MiruroAnimeResult[]> {
  try {
    const res = await fetchWithRetry(
      `${MIRURO_API}/popular?page=${page}&perPage=${perPage}`,
      { headers: HEADERS, next: { revalidate: 600 } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data?.results || data?.media || [];
  } catch {
    return [];
  }
}

export async function miruroRecent(page = 1, perPage = 20): Promise<MiruroAnimeResult[]> {
  try {
    const res = await fetchWithRetry(
      `${MIRURO_API}/recent?page=${page}&perPage=${perPage}`,
      { headers: HEADERS, next: { revalidate: 60 } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data?.results || data?.media || [];
  } catch {
    return [];
  }
}

export async function miruroEpisodes(anilistId: number): Promise<{
  sub: MiruroEpisode[];
  dub: MiruroEpisode[];
}> {
  try {
    const res = await fetchWithRetry(`${MIRURO_API}/episodes/${anilistId}`, {
      headers: HEADERS, next: { revalidate: 600 },
    });
    if (!res.ok) return { sub: [], dub: [] };
    const data = await res.json();
    if (data?.episodes) {
      const sub = data.episodes.sub || data.episodes;
      const dub = data.episodes.dub || [];
      return { sub: Array.isArray(sub) ? sub : [], dub: Array.isArray(dub) ? dub : [] };
    }
    if (Array.isArray(data)) return { sub: data, dub: [] };
    return { sub: [], dub: [] };
  } catch {
    return { sub: [], dub: [] };
  }
}

// Classify a URL as internal (direct play) or external (iframe/redirect)
function classifySource(url: string): "internal" | "external" {
  if (!url) return "internal";
  const externalPatterns = [
    "/embed", "/e/", "vibeplayer", "otakuvid", "megaplay",
    "mp4upload", "vidnest", "ok.ru", "allanime.uns",
    "streamtape", "doodstream", "mixdrop",
  ];
  const lower = url.toLowerCase();
  if (externalPatterns.some(p => lower.includes(p))) return "external";
  return "internal";
}

export async function miruroWatch(
  provider: string,
  anilistId: number,
  translationType: "sub" | "dub",
  episodeSlug: string
): Promise<MiruroWatchResult | null> {
  try {
    const url = `${MIRURO_API}/watch/${provider}/${anilistId}/${translationType}/${episodeSlug}`;
    const res = await fetchWithRetry(url, {
      headers: HEADERS, next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.sources?.length > 0) {
      return {
        sources: data.sources.map((s: MiruroWatchSource) => ({
          ...s,
          isM3U8: s.isM3U8 || s.url?.includes(".m3u8"),
          sourceType: classifySource(s.url),
        })),
        subtitles: data.subtitles || [],
        intro: data.intro,
        outro: data.outro,
        headers: data.headers,
        provider,
      };
    }
    if (data?.data?.sources?.length > 0) {
      return {
        sources: data.data.sources.map((s: MiruroWatchSource) => ({
          ...s,
          sourceType: classifySource(s.url),
        })),
        subtitles: data.data.subtitles || [],
        intro: data.data.intro,
        outro: data.data.outro,
        headers: data.data.headers,
        provider,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export const MIRURO_PROVIDERS = ["kiwi", "arc", "zoro", "jet"] as const;
export type MiruroProvider = (typeof MIRURO_PROVIDERS)[number];

export function getProviderDisplayName(provider: string): string {
  const names: Record<string, string> = { kiwi: "Kiwi", arc: "Arc", zoro: "Zoro", jet: "Jet" };
  return names[provider] || provider.charAt(0).toUpperCase() + provider.slice(1);
}
