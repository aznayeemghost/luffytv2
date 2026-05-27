// MegaPlay Decryptor API Client
// BASE URL: https://megaplaydecryptor.vercel.app
// All endpoints are GET-only, no authentication required.
// Response envelope: { "success": true, "results": ... }

const MEGAPLAY_API = "https://megaplaydecryptor.vercel.app";

const HEADERS = {
  "User-Agent": "LuffyTV/1.0",
  "Accept": "application/json",
};

async function fetchWithTimeout(url: string, timeout = 15000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { headers: HEADERS, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

// ── Types ──

export interface MegaPlayAnimeTitle {
  romaji?: string;
  english?: string;
  native?: string;
}

export interface MegaPlayCoverImage {
  large?: string;
  medium?: string;
}

export interface MegaPlayAnimeItem {
  id: number;
  title: MegaPlayAnimeTitle;
  coverImage: MegaPlayCoverImage;
  format?: string;
  status?: string;
  episodes?: number;
  seasonYear?: number;
  averageScore?: number;
  genres?: string[];
  bannerImage?: string;
  description?: string;
  duration?: number;
  season?: string;
  popularity?: number;
  trending?: number;
  countryOfOrigin?: string;
  isAdult?: boolean;
}

export interface MegaPlayStreamServer {
  server_name: string;
  embed: string;
}

export interface MegaPlayEpisodeItem {
  episode_no: number;
  hasSub: boolean;
  hasDub: boolean;
  streams: {
    sub: MegaPlayStreamServer[];
    dub: MegaPlayStreamServer[];
  };
}

export interface MegaPlayEpisodesData {
  total: number;
  list: MegaPlayEpisodeItem[];
}

export interface MegaPlayStreamResult {
  embedUrl: string;
  dataId: string;
  m3u8: string;
  tracks: MegaPlayTrack[];
  intro?: { start: number; end: number };
  outro?: { start: number; end: number };
}

export interface MegaPlayTrack {
  file: string;
  label: string;
  kind: string;
}

export interface MegaPlayInfoResult {
  id: number;
  title: MegaPlayAnimeTitle;
  description?: string;
  coverImage: MegaPlayCoverImage;
  bannerImage?: string;
  format?: string;
  status?: string;
  episodes: MegaPlayEpisodesData;
  duration?: number;
  season?: string;
  seasonYear?: number;
  averageScore?: number;
  genres?: string[];
  studios?: Array<{ id: number; name: string }>;
  nextAiringEpisode?: { episode: number; airingAt: number };
  relations?: Array<{
    id: number;
    relationType: string;
    title: MegaPlayAnimeTitle;
    coverImage: MegaPlayCoverImage;
    format?: string;
  }>;
}

export interface MegaPlayScheduleItem {
  id: number;
  title: MegaPlayAnimeTitle;
  coverImage: MegaPlayCoverImage;
  episode_no: number;
  airingAt: number;
  airingDate: string;
  airingTime: string;
  timeUntilAiring: number;
}

export interface MegaPlayScheduleData {
  date: string;
  schedule: MegaPlayScheduleItem[];
}

export interface MegaPlayTopTenCategory {
  today: MegaPlayAnimeItem[];
  week: MegaPlayAnimeItem[];
  month: MegaPlayAnimeItem[];
}

export interface MegaPlayPageInfo {
  currentPage: number;
  hasNextPage: boolean;
  totalPages?: number;
}

// ── API Functions ──

/**
 * GET /api/home
 * Returns: spotlights[], trending[], popular[], topRated[]
 */
export async function megaplayHome(): Promise<{
  spotlights: MegaPlayAnimeItem[];
  trending: MegaPlayAnimeItem[];
  popular: MegaPlayAnimeItem[];
  topRated: MegaPlayAnimeItem[];
} | null> {
  try {
    const res = await fetchWithTimeout(`${MEGAPLAY_API}/api/home`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.success) return null;
    return data.results;
  } catch {
    return null;
  }
}

/**
 * GET /api/search?q=QUERY&page=N
 * Returns: { pageInfo, media[] }
 */
export async function megaplaySearch(query: string, page = 1): Promise<{
  pageInfo: MegaPlayPageInfo;
  media: MegaPlayAnimeItem[];
} | null> {
  try {
    const res = await fetchWithTimeout(
      `${MEGAPLAY_API}/api/search?q=${encodeURIComponent(query)}&page=${page}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.success) return null;
    return data.results;
  } catch {
    return null;
  }
}

/**
 * GET /api/suggest?q=QUERY
 * Returns: array of 10 autocomplete suggestions
 */
export async function megaplaySuggest(query: string): Promise<string[]> {
  try {
    const res = await fetchWithTimeout(
      `${MEGAPLAY_API}/api/suggest?q=${encodeURIComponent(query)}`
    );
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : (data.results || []);
  } catch {
    return [];
  }
}

/**
 * GET /api/info?id=ANILIST_ID
 * Returns full anime detail with episodes
 */
export async function megaplayInfo(anilistId: number): Promise<MegaPlayInfoResult | null> {
  try {
    const res = await fetchWithTimeout(`${MEGAPLAY_API}/api/info?id=${anilistId}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.success) return null;
    return data.results;
  } catch {
    return null;
  }
}

/**
 * GET /api/stream?aniId=ID&epNum=N&lang=sub|dub
 * Returns: { embedUrl, dataId, m3u8, tracks[], intro, outro }
 */
export async function megaplayStream(
  aniId: number,
  epNum: number,
  lang: "sub" | "dub" = "sub"
): Promise<MegaPlayStreamResult | null> {
  try {
    const res = await fetchWithTimeout(
      `${MEGAPLAY_API}/api/stream?aniId=${aniId}&epNum=${epNum}&lang=${lang}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.success) return null;
    return data.results;
  } catch {
    return null;
  }
}

/**
 * GET /api/trending?page=N
 */
export async function megaplayTrending(page = 1): Promise<{
  pageInfo: MegaPlayPageInfo;
  media: MegaPlayAnimeItem[];
} | null> {
  try {
    const res = await fetchWithTimeout(`${MEGAPLAY_API}/api/trending?page=${page}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.success) return null;
    return data.results;
  } catch {
    return null;
  }
}

/**
 * GET /api/popular?page=N
 */
export async function megaplayPopular(page = 1): Promise<{
  pageInfo: MegaPlayPageInfo;
  media: MegaPlayAnimeItem[];
} | null> {
  try {
    const res = await fetchWithTimeout(`${MEGAPLAY_API}/api/popular?page=${page}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.success) return null;
    return data.results;
  } catch {
    return null;
  }
}

/**
 * GET /api/top-ten
 * Returns: { today[], week[], month[] }
 */
export async function megaplayTopTen(): Promise<MegaPlayTopTenCategory | null> {
  try {
    const res = await fetchWithTimeout(`${MEGAPLAY_API}/api/top-ten`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.success) return null;
    return data.results;
  } catch {
    return null;
  }
}

/**
 * GET /api/schedule?page=N
 * Returns: { date, schedule[], pageInfo }
 */
export async function megaplaySchedule(page = 1): Promise<{
  pageInfo: MegaPlayPageInfo;
  schedules: MegaPlayScheduleData[];
} | null> {
  try {
    const res = await fetchWithTimeout(`${MEGAPLAY_API}/api/schedule?page=${page}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.success) return null;
    return data.results;
  } catch {
    return null;
  }
}

/**
 * GET /api/seasons?season=FALL&year=2024&page=N
 * season values: WINTER, SPRING, SUMMER, FALL
 */
export async function megaplaySeasons(
  season: string,
  year: number,
  page = 1
): Promise<{
  pageInfo: MegaPlayPageInfo;
  media: MegaPlayAnimeItem[];
} | null> {
  try {
    const res = await fetchWithTimeout(
      `${MEGAPLAY_API}/api/seasons?season=${season.toUpperCase()}&year=${year}&page=${page}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.success) return null;
    return data.results;
  } catch {
    return null;
  }
}

/**
 * GET /api/genre/:genre?page=N
 */
export async function megaplayGenre(
  genre: string,
  page = 1
): Promise<{
  pageInfo: MegaPlayPageInfo;
  media: MegaPlayAnimeItem[];
} | null> {
  try {
    const res = await fetchWithTimeout(
      `${MEGAPLAY_API}/api/genre/${encodeURIComponent(genre.toLowerCase())}?page=${page}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.success) return null;
    return data.results;
  } catch {
    return null;
  }
}

/**
 * GET /api/random
 * Returns a random anime's full detail
 */
export async function megaplayRandom(): Promise<MegaPlayInfoResult | null> {
  try {
    const res = await fetchWithTimeout(`${MEGAPLAY_API}/api/random`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.success) return null;
    return data.results;
  } catch {
    return null;
  }
}
