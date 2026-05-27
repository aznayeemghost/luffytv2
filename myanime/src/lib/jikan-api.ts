// Jikan API (v4) Client — MyAnimeList REST API
// No API key required. Rate limit: 3 requests/second, 60/minute.
// Provides drop-in compatibility with MiruroAnimeResult via jikanToMiruro()

// ============================================================
// Jikan Types
// ============================================================

export interface JikanAnimeResult {
  mal_id: number;
  title: string;
  title_english?: string;
  title_japanese?: string;
  title_synonyms?: string[];
  images: {
    jpg: { image_url?: string; large_image_url?: string; small_image_url?: string };
    webp: { image_url?: string; large_image_url?: string; small_image_url?: string };
  };
  synopsis?: string;
  type?: string;
  episodes?: number;
  status?: string;
  score?: number;
  genres?: Array<{ mal_id: number; name: string; type?: string; url?: string }>;
  themes?: Array<{ mal_id: number; name: string; type?: string; url?: string }>;
  season?: string;
  year?: number;
  studios?: Array<{ mal_id: number; name: string; type?: string; url?: string }>;
  trailer?: {
    youtube_id?: string;
    url?: string;
    embed_url?: string;
    images?: {
      maximum_image_url?: string;
      medium_image_url?: string;
      small_image_url?: string;
      large_image_url?: string;
    };
  };
  aired?: {
    from?: string;
    to?: string;
    prop?: {
      from?: { year?: number; month?: number; day?: number };
      to?: { year?: number; month?: number; day?: number };
    };
  };
  broadcast?: { day?: string; time?: string; timezone?: string; string?: string };
  popularity?: number;
  favorites?: number;
  rank?: number;
  source?: string;
  duration?: string;
  rating?: string; // Age rating (e.g. "PG-13", "R", "Rx - Hentai")
  demographics?: Array<{ mal_id: number; name: string; type?: string; url?: string }>;
  explicit_genres?: Array<{ mal_id: number; name: string; type?: string; url?: string }>;
  opening_themes?: Array<{ mal_id?: number; name?: string }>;
  ending_themes?: Array<{ mal_id?: number; name?: string }>;
  background?: string;
  url?: string;
  approved?: boolean;
  titles?: Array<{ type: string; title: string }>;
}

export interface JikanCharacter {
  mal_id: number;
  url?: string;
  images?: {
    jpg?: { image_url?: string; small_image_url?: string };
    webp?: { image_url?: string; small_image_url?: string };
  };
  name?: string;
  name_kanji?: string;
  nicknames?: string[];
  favorites?: number;
  about?: string;
}

export interface JikanCharacterVoiceActor {
  language: string;
  person: {
    mal_id: number;
    url?: string;
    images?: {
      jpg?: { image_url?: string };
    };
    name?: string;
  };
}

export interface JikanAnimeCharacter {
  role: string;
  character: JikanCharacter;
  voice_actors: JikanCharacterVoiceActor[];
}

export interface JikanRecommendation {
  mal_id: number;
  url?: string;
  entry: {
    mal_id: number;
    url?: string;
    images?: JikanAnimeResult["images"];
    title?: string;
  };
  content?: string;
  date?: string;
  user?: {
    url?: string;
    username?: string;
  };
}

export interface JikanRelation {
  relation: string;
  entry: Array<{
    mal_id: number;
    type: string;
    name: string;
    url?: string;
  }>;
}

export interface JikanPaginatedResponse<T> {
  data: T[];
  pagination: {
    last_visible_page: number;
    has_next_page: boolean;
    current_page: number;
    items: {
      total: number;
      count: number;
      per_page: number;
    };
  };
}

export interface JikanSingleResponse<T> {
  data: T;
}

// ============================================================
// MiruroAnimeResult (re-exported for compatibility)
// ============================================================

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

export interface MiruroSearchResult {
  currentPage: number;
  hasNextPage: boolean;
  results: MiruroAnimeResult[];
}

// ============================================================
// Rate Limiter
// ============================================================

/**
 * Simple in-memory rate limiter that ensures max 3 requests per second.
 * Uses a sliding window approach with a request queue.
 */
class RateLimiter {
  private timestamps: number[] = [];
  private readonly maxRequestsPerSecond = 3;
  private readonly windowMs = 1000; // 1 second window
  private queue: Array<() => void> = [];
  private processing = false;

  /**
   * Acquire permission to make a request. Resolves when a slot is available.
   */
  async acquire(): Promise<void> {
    return new Promise<void>((resolve) => {
      this.queue.push(resolve);
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const now = Date.now();

      // Remove timestamps older than our window
      this.timestamps = this.timestamps.filter(
        (ts) => now - ts < this.windowMs
      );

      if (this.timestamps.length < this.maxRequestsPerSecond) {
        // We have a slot available
        this.timestamps.push(now);
        const resolve = this.queue.shift()!;
        resolve();
      } else {
        // Need to wait until a slot opens up
        const oldestInWindow = this.timestamps[0];
        const waitTime = this.windowMs - (now - oldestInWindow) + 10; // +10ms buffer

        await new Promise<void>((r) => setTimeout(r, waitTime));

        // Clean up and try again — don't resolve yet, loop will retry
        this.timestamps = this.timestamps.filter(
          (ts) => Date.now() - ts < this.windowMs
        );

        // Now we should have a slot
        this.timestamps.push(Date.now());
        const resolve = this.queue.shift()!;
        resolve();
      }
    }

    this.processing = false;
  }
}

const rateLimiter = new RateLimiter();

// ============================================================
// HTTP Client with Rate Limiting & Caching
// ============================================================

const JIKAN_BASE = "https://api.jikan.moe/v4";

// Simple in-memory cache with TTL
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache<T>(key: string, data: T, ttlMs: number): void {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

// Default cache TTLs (in milliseconds)
const CACHE_TTL = {
  SEARCH: 2 * 60 * 1000,     // 2 minutes — search results change often
  TOP: 5 * 60 * 1000,        // 5 minutes — top anime lists
  SEASON: 5 * 60 * 1000,     // 5 minutes — seasonal anime
  DETAIL: 30 * 60 * 1000,    // 30 minutes — individual anime details
  CHARACTERS: 30 * 60 * 1000, // 30 minutes — character data
  RECOMMENDATIONS: 15 * 60 * 1000, // 15 minutes
  RELATIONS: 30 * 60 * 1000,  // 30 minutes
} as const;

async function jikanFetch<T>(
  endpoint: string,
  cacheTtl: number,
  useCache = true
): Promise<T | null> {
  const cacheKey = `${JIKAN_BASE}${endpoint}`;

  // Check cache first
  if (useCache) {
    const cached = getCached<T>(cacheKey);
    if (cached !== null) return cached;
  }

  // Rate limit
  await rateLimiter.acquire();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(`${JIKAN_BASE}${endpoint}`, {
      headers: {
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (res.status === 429) {
      // Rate limited — wait and retry once
      console.warn("[Jikan] Rate limited (429), waiting 1s before retry...");
      await new Promise((r) => setTimeout(r, 1000));
      await rateLimiter.acquire();

      const retryRes = await fetch(`${JIKAN_BASE}${endpoint}`, {
        headers: { Accept: "application/json" },
      });

      if (!retryRes.ok) {
        console.error(`[Jikan] Retry failed: ${retryRes.status}`);
        return null;
      }

      const data = await retryRes.json();
      setCache(cacheKey, data, cacheTtl);
      return data as T;
    }

    if (!res.ok) {
      console.error(`[Jikan] Request failed: ${res.status} ${res.statusText} for ${endpoint}`);
      return null;
    }

    const data = await res.json();
    setCache(cacheKey, data, cacheTtl);
    return data as T;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      console.error(`[Jikan] Request timed out for ${endpoint}`);
    } else {
      console.error(`[Jikan] Request error for ${endpoint}:`, err);
    }
    return null;
  }
}

// ============================================================
// Status Mapping: Jikan → AniList/Miruro format
// ============================================================

const STATUS_MAP: Record<string, string> = {
  "Currently Airing": "RELEASING",
  "Finished Airing": "FINISHED",
  "Not yet aired": "NOT_YET_RELEASED",
  "On Hiatus": "PAUSED",
};

// ============================================================
// Converter: Jikan → MiruroAnimeResult
// ============================================================

/**
 * Convert a JikanAnimeResult to MiruroAnimeResult format.
 * This allows Jikan data to be used as a drop-in replacement
 * when AniList/Miruro are unavailable.
 *
 * IMPORTANT: The `id` field will be the MAL ID, not AniList ID.
 * Code using this should be aware that id === mal_id when sourced from Jikan.
 */
export function jikanToMiruro(jikan: JikanAnimeResult): MiruroAnimeResult {
  // Build coverImage — prefer webp large as extraLarge, jpg large as large
  // Jikan sometimes returns null images — handle gracefully
  const images = jikan.images || {};
  const jpg = images.jpg || {};
  const webp = images.webp || {};

  const coverImage: MiruroAnimeResult["coverImage"] = {
    extraLarge: webp.large_image_url || webp.image_url || undefined,
    large: jpg.large_image_url || jpg.image_url || undefined,
    medium: webp.image_url || jpg.small_image_url || undefined,
    color: undefined,
  };

  // Build banner image — use the largest available image
  const bannerImage =
    webp.large_image_url ||
    jpg.large_image_url ||
    undefined;

  // Map genres (combine genres + themes + demographics)
  const genres: string[] = [
    ...(jikan.genres || []).map((g) => g.name),
    ...(jikan.themes || []).map((t) => t.name),
    ...(jikan.demographics || []).map((d) => d.name),
  ];

  // Convert score from MAL 10-point scale to AniList 100-point scale
  const averageScore = jikan.score != null ? Math.round(jikan.score * 10) : undefined;

  // Map status
  const status = jikan.status ? STATUS_MAP[jikan.status] || jikan.status : undefined;

  // Determine if adult content based on rating or explicit genres
  const isAdult =
    jikan.rating === "Rx - Hentai" ||
    (jikan.explicit_genres && jikan.explicit_genres.length > 0) ||
    false;

  // Map type to format — MAL uses "TV", "Movie", "OVA", etc.
  // AniList uses "TV", "TV_SHORT", "MOVIE", "OVA", "ONA", "MUSIC", "SPECIAL"
  let format = jikan.type;
  if (format === "TV") format = "TV";
  else if (format === "Movie") format = "MOVIE";
  else if (format === "OVA") format = "OVA";
  else if (format === "ONA") format = "ONA";
  else if (format === "Special") format = "SPECIAL";
  else if (format === "Music") format = "MUSIC";

  // Parse duration string to minutes (e.g., "24 min per ep" → 24)
  let duration: number | undefined;
  if (jikan.duration) {
    const match = jikan.duration.match(/(\d+)\s*min/);
    if (match) duration = parseInt(match[1], 10);
  }

  // Capitalize season for consistency with AniList format
  const season = jikan.season
    ? jikan.season.charAt(0).toUpperCase() + jikan.season.slice(1).toLowerCase()
    : undefined;

  return {
    id: jikan.mal_id,
    title: {
      romaji: jikan.title || undefined,
      english: jikan.title_english || undefined,
      native: jikan.title_japanese || undefined,
    },
    type: jikan.type || undefined,
    format,
    status,
    description: jikan.synopsis || undefined,
    season,
    seasonYear: jikan.year || undefined,
    episodes: jikan.episodes ?? undefined,
    duration,
    coverImage,
    bannerImage,
    genres: genres.length > 0 ? genres : undefined,
    averageScore,
    popularity: jikan.popularity ?? undefined,
    trending: jikan.rank ?? undefined, // Use rank as a proxy for trending
    countryOfOrigin: "JP", // MAL is predominantly Japanese anime
    isAdult,
  };
}

// ============================================================
// API Functions
// ============================================================

/**
 * Search for anime by query string.
 * Returns paginated results in MiruroSearchResult format for compatibility.
 */
export async function jikanSearch(
  query: string,
  page = 1,
  limit = 25
): Promise<MiruroSearchResult> {
  try {
    const params = new URLSearchParams({
      q: query,
      page: String(page),
      limit: String(Math.min(limit, 25)), // Jikan max is 25 per page
    });

    const response = await jikanFetch<JikanPaginatedResponse<JikanAnimeResult>>(
      `/anime?${params.toString()}`,
      CACHE_TTL.SEARCH
    );

    if (!response?.data) {
      return { currentPage: page, hasNextPage: false, results: [] };
    }

    return {
      currentPage: response.pagination?.current_page || page,
      hasNextPage: response.pagination?.has_next_page || false,
      results: response.data.map(jikanToMiruro),
    };
  } catch (err) {
    console.error("[Jikan] Search error:", err);
    return { currentPage: page, hasNextPage: false, results: [] };
  }
}

/**
 * Get top anime with optional filter.
 * filter: "airing", "upcoming", "bypopularity", "favorite"
 */
export async function jikanTopAnime(
  page = 1,
  limit = 25,
  filter?: string
): Promise<MiruroAnimeResult[]> {
  try {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(Math.min(limit, 25)),
    });

    if (filter) {
      params.set("filter", filter);
    }

    const response = await jikanFetch<JikanPaginatedResponse<JikanAnimeResult>>(
      `/top/anime?${params.toString()}`,
      CACHE_TTL.TOP
    );

    return response?.data?.map(jikanToMiruro) || [];
  } catch (err) {
    console.error("[Jikan] Top anime error:", err);
    return [];
  }
}

/**
 * Get currently airing anime for this season.
 */
export async function jikanSeasonNow(
  page = 1,
  limit = 25
): Promise<MiruroAnimeResult[]> {
  try {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(Math.min(limit, 25)),
    });

    const response = await jikanFetch<JikanPaginatedResponse<JikanAnimeResult>>(
      `/seasons/now?${params.toString()}`,
      CACHE_TTL.SEASON
    );

    return response?.data?.map(jikanToMiruro) || [];
  } catch (err) {
    console.error("[Jikan] Season now error:", err);
    return [];
  }
}

/**
 * Get upcoming anime for next season.
 */
export async function jikanSeasonUpcoming(
  page = 1,
  limit = 25
): Promise<MiruroAnimeResult[]> {
  try {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(Math.min(limit, 25)),
    });

    const response = await jikanFetch<JikanPaginatedResponse<JikanAnimeResult>>(
      `/seasons/upcoming?${params.toString()}`,
      CACHE_TTL.SEASON
    );

    return response?.data?.map(jikanToMiruro) || [];
  } catch (err) {
    console.error("[Jikan] Season upcoming error:", err);
    return [];
  }
}

/**
 * Get full anime details by MAL ID.
 * Returns the raw Jikan result for maximum detail.
 */
export async function jikanAnimeById(
  malId: number
): Promise<JikanAnimeResult | null> {
  try {
    const response = await jikanFetch<JikanSingleResponse<JikanAnimeResult>>(
      `/anime/${malId}/full`,
      CACHE_TTL.DETAIL
    );

    return response?.data || null;
  } catch (err) {
    console.error("[Jikan] Anime by ID error:", err);
    return null;
  }
}

/**
 * Get anime details converted to MiruroAnimeResult format by MAL ID.
 * Convenience wrapper combining jikanAnimeById + jikanToMiruro.
 */
export async function jikanAnimeByIdAsMiruro(
  malId: number
): Promise<MiruroAnimeResult | null> {
  try {
    const jikan = await jikanAnimeById(malId);
    if (!jikan) return null;
    return jikanToMiruro(jikan);
  } catch (err) {
    console.error("[Jikan] Anime by ID (Miruro) error:", err);
    return null;
  }
}

/**
 * Get characters and voice actors for an anime by MAL ID.
 */
export async function jikanAnimeCharacters(
  malId: number
): Promise<JikanAnimeCharacter[]> {
  try {
    const response = await jikanFetch<JikanPaginatedResponse<JikanAnimeCharacter>>(
      `/anime/${malId}/characters`,
      CACHE_TTL.CHARACTERS
    );

    return response?.data || [];
  } catch (err) {
    console.error("[Jikan] Characters error:", err);
    return [];
  }
}

/**
 * Get user recommendations for an anime by MAL ID.
 */
export async function jikanAnimeRecommendations(
  malId: number
): Promise<JikanRecommendation[]> {
  try {
    const response = await jikanFetch<JikanPaginatedResponse<JikanRecommendation>>(
      `/anime/${malId}/recommendations`,
      CACHE_TTL.RECOMMENDATIONS
    );

    return response?.data || [];
  } catch (err) {
    console.error("[Jikan] Recommendations error:", err);
    return [];
  }
}

/**
 * Get related anime/manga for an anime by MAL ID.
 */
export async function jikanAnimeRelations(
  malId: number
): Promise<JikanRelation[]> {
  try {
    const response = await jikanFetch<JikanPaginatedResponse<JikanRelation>>(
      `/anime/${malId}/relations`,
      CACHE_TTL.RELATIONS
    );

    return response?.data || [];
  } catch (err) {
    console.error("[Jikan] Relations error:", err);
    return [];
  }
}

/**
 * Get anime by specific season and year.
 */
export async function jikanSeason(
  year: number,
  season: string,
  page = 1,
  limit = 25
): Promise<MiruroAnimeResult[]> {
  try {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(Math.min(limit, 25)),
    });

    const seasonPath = season.toLowerCase();
    const response = await jikanFetch<JikanPaginatedResponse<JikanAnimeResult>>(
      `/seasons/${year}/${seasonPath}?${params.toString()}`,
      CACHE_TTL.SEASON
    );

    return response?.data?.map(jikanToMiruro) || [];
  } catch (err) {
    console.error("[Jikan] Season error:", err);
    return [];
  }
}

// ============================================================
// Utility Functions
// ============================================================

/**
 * Clear the Jikan response cache. Useful for forcing fresh data.
 */
export function jikanClearCache(): void {
  cache.clear();
}

/**
 * Get the current cache size (number of entries).
 */
export function jikanCacheSize(): number {
  return cache.size;
}

/**
 * Convert JikanAnimeCharacter data to a simplified format
 * compatible with AniList character structure.
 */
export function jikanCharacterToAniListFormat(char: JikanAnimeCharacter) {
  return {
    id: char.character.mal_id,
    name: {
      full: char.character.name || "",
      native: char.character.name_kanji || undefined,
    },
    image: {
      large: char.character.images?.jpg?.image_url || undefined,
      medium: char.character.images?.jpg?.small_image_url || undefined,
    },
    role: char.role,
    voiceActors: (char.voice_actors || []).map((va) => ({
      id: va.person.mal_id,
      name: {
        full: va.person.name || "",
      },
      image: {
        large: va.person.images?.jpg?.image_url || undefined,
      },
      language: va.language,
    })),
  };
}

/**
 * Convert JikanRecommendation to a simplified format
 * compatible with AniList recommendation structure.
 */
export function jikanRecommendationToAniListFormat(rec: JikanRecommendation) {
  return {
    id: rec.mal_id,
    rating: 0, // Jikan doesn't provide a numeric rating for recommendations
    mediaRecommendation: {
      id: rec.entry.mal_id,
      title: {
        romaji: rec.entry.title || undefined,
        english: rec.entry.title || undefined,
      },
      coverImage: rec.entry.images
        ? {
            extraLarge: rec.entry.images.webp?.large_image_url || undefined,
            large: rec.entry.images.jpg?.large_image_url || undefined,
            medium: rec.entry.images.webp?.image_url || rec.entry.images.jpg?.image_url || undefined,
          }
        : undefined,
    },
  };
}

/**
 * Convert JikanRelation to a simplified format
 * compatible with AniList relation structure.
 */
export function jikanRelationToAniListFormat(rel: JikanRelation) {
  return {
    relationType: rel.relation.toUpperCase().replace(/\s+/g, "_"),
    entries: rel.entry.map((e) => ({
      id: e.mal_id,
      title: {
        romaji: e.name,
        english: e.name,
      },
      type: e.type,
      format: e.type === "anime" ? "TV" : e.type,
    })),
  };
}
