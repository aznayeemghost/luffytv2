// MangaDex API Client for Manga
// https://api.mangadex.org - Stable, reliable, with cover art, chapters, pages

const MANGADEX_API = "https://api.mangadex.org";

const MANGADEX_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  Accept: "application/json",
};

async function mangadexFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, {
      ...options,
      headers: { ...MANGADEX_HEADERS, ...(options.headers as Record<string, string>) },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return res;
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

// ============================================================
// Types
// ============================================================

export interface AtsuMangaEntry {
  id: string;
  title: string;
  englishTitle?: string;
  poster?: string;
  posterSmall?: string;
  posterMedium?: string;
  type?: string;
  isAdult?: boolean;
  status?: string;
  year?: number;
  authors?: string[];
  genres?: string[];
  description?: string;
  anilistId?: number;
  malId?: number;
  banner?: string;
  totalChapters?: number;
  mangadexId?: string;
  source?: string;
}

export interface AtsuMangaChapter {
  id: string;
  title: string;
  number: number;
  date?: string;
  scanGroup?: string;
  mangadexChapterId?: string;
  pages?: number;
}

export interface AtsuMangaDetail {
  id: string;
  title: string;
  englishTitle?: string;
  altTitles?: string[];
  poster?: string;
  banner?: string;
  description?: string;
  type?: string;
  status?: string;
  year?: number;
  authors?: string[];
  artists?: string[];
  genres?: string[];
  isAdult?: boolean;
  anilistId?: number;
  malId?: number;
  chapters?: AtsuMangaChapter[];
  totalChapters?: number;
  rating?: number;
  views?: number;
  mangadexId?: string;
  source?: string;
}

export interface AtsuChapterPage {
  index: number;
  url: string;
  width?: number;
  height?: number;
}

export interface AtsuHomeSection {
  title: string;
  type: string;
  items: AtsuMangaEntry[];
}

// Shared MangaDex list query params that ensure English chapters are available
// Note: Must use append() for duplicate keys (contentRating[], includes[], etc.)
function buildMangaDexListParams(extra: Record<string, string> = {}): URLSearchParams {
  const params = new URLSearchParams();
  params.append("includes[]", "cover_art");
  params.append("contentRating[]", "safe");
  params.append("contentRating[]", "suggestive");
  params.append("hasAvailableChapters", "true");
  params.append("availableTranslatedLanguage[]", "en");
  for (const [key, value] of Object.entries(extra)) {
    params.append(key, value);
  }
  return params;
}

// ============================================================
// MangaDex Helper Functions
// ============================================================

/** Get the title from a MangaDex manga attribute, preferring English */
function getMangaDexTitle(attributes: any): string {
  if (!attributes?.title) return "Unknown";
  if (typeof attributes.title === "string") return attributes.title;
  return attributes.title.en || attributes.title["ja-ro"] || attributes.title.ja ||
    Object.values(attributes.title)[0] as string || "Unknown";
}

/** Get English title from altTitles array */
function getMangaDexEnglishTitle(attributes: any): string | undefined {
  if (!attributes?.altTitles) return undefined;
  for (const alt of attributes.altTitles) {
    if (alt.en) return alt.en;
  }
  return undefined;
}

/** Get cover filename from MangaDex relationships */
function getMangaDexCoverFileName(relationships: any[]): string | null {
  if (!Array.isArray(relationships)) return null;
  for (const rel of relationships) {
    if (rel.type === "cover_art" && rel.attributes?.fileName) {
      return rel.attributes.fileName;
    }
  }
  return null;
}

/** Construct cover URL from mangaId and cover filename */
function getMangaDexCoverUrl(mangaId: string, coverFileName: string): string {
  return `https://uploads.mangadex.org/covers/${mangaId}/${coverFileName}`;
}

/** Get author/artist names from MangaDex relationships */
function getMangaDexAuthors(relationships: any[], type: "author" | "artist"): string[] {
  if (!Array.isArray(relationships)) return [];
  return relationships
    .filter(r => r.type === type && r.attributes?.name)
    .map(r => r.attributes.name);
}

/** Get tags/genres from MangaDex attributes */
function getMangaDexGenres(attributes: any): string[] {
  if (!attributes?.tags) return [];
  return attributes.tags
    .filter((t: any) => t.attributes?.name)
    .map((t: any) => {
      const name = t.attributes.name;
      return typeof name === "string" ? name : (name.en || Object.values(name)[0] as string);
    });
}

/** Map MangaDex status to readable string */
function getMangaDexStatus(attributes: any): string | undefined {
  const status = attributes?.status;
  if (!status) return undefined;
  const map: Record<string, string> = {
    ongoing: "Ongoing",
    completed: "Completed",
    hiatus: "Hiatus",
    cancelled: "Cancelled",
  };
  return map[status.toLowerCase()] || status;
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/** Map MangaDex manga to our AtsuMangaEntry format */
function mapMangaDexEntry(manga: any): AtsuMangaEntry {
  const attrs = manga.attributes || {};
  const coverFileName = getMangaDexCoverFileName(manga.relationships || []);
  const poster = coverFileName ? getMangaDexCoverUrl(manga.id, coverFileName) : undefined;

  return {
    id: manga.id,
    mangadexId: manga.id,
    title: getMangaDexTitle(attrs),
    englishTitle: getMangaDexEnglishTitle(attrs),
    poster,
    type: attrs.publicationDemographic ? capitalizeFirst(attrs.publicationDemographic) : undefined,
    isAdult: attrs.contentRating === "pornographic" || attrs.contentRating === "erotica",
    status: getMangaDexStatus(attrs),
    year: attrs.year || undefined,
    authors: getMangaDexAuthors(manga.relationships || [], "author"),
    genres: getMangaDexGenres(attrs),
    description: attrs.description?.en || attrs.description?.["ja-ro"] ||
      (typeof attrs.description === "string" ? attrs.description : undefined),
    totalChapters: attrs.lastChapter ? parseInt(attrs.lastChapter) || undefined : undefined,
    source: "mangadex",
  };
}

// ============================================================
// MangaDex API Functions (PRIMARY)
// ============================================================

/** Search manga on MangaDex */
export async function searchMangaDex(query: string, limit = 20): Promise<AtsuMangaEntry[]> {
  try {
    const params = buildMangaDexListParams({ title: query, limit: String(limit) });
    const res = await mangadexFetch(`${MANGADEX_API}/manga?${params}`);
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data?.data)) return [];
    return data.data.map(mapMangaDexEntry);
  } catch {
    return [];
  }
}

/** Get trending manga from MangaDex (most followed) */
export async function getMangaDexTrending(): Promise<AtsuMangaEntry[]> {
  try {
    const params = buildMangaDexListParams({ "order[followedCount]": "desc", limit: "20" });
    const res = await mangadexFetch(`${MANGADEX_API}/manga?${params}`);
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data?.data)) return [];
    return data.data.map(mapMangaDexEntry);
  } catch {
    return [];
  }
}

/** Get popular manga from MangaDex (by rating) */
export async function getMangaDexPopular(): Promise<AtsuMangaEntry[]> {
  try {
    const params = buildMangaDexListParams({ "order[rating]": "desc", limit: "20" });
    const res = await mangadexFetch(`${MANGADEX_API}/manga?${params}`);
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data?.data)) return [];
    return data.data.map(mapMangaDexEntry);
  } catch {
    return [];
  }
}

/** Get recently updated manga from MangaDex */
export async function getMangaDexRecent(): Promise<AtsuMangaEntry[]> {
  try {
    const params = buildMangaDexListParams({ "order[updatedAt]": "desc", limit: "20" });
    const res = await mangadexFetch(`${MANGADEX_API}/manga?${params}`);
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data?.data)) return [];
    return data.data.map(mapMangaDexEntry);
  } catch {
    return [];
  }
}

/** Get top rated manga from MangaDex */
export async function getMangaDexTopRated(): Promise<AtsuMangaEntry[]> {
  try {
    const params = buildMangaDexListParams({ "order[followedCount]": "desc", limit: "20" });
    const res = await mangadexFetch(`${MANGADEX_API}/manga?${params}`);
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data?.data)) return [];
    return data.data.map(mapMangaDexEntry);
  } catch {
    return [];
  }
}

/** Get new manga additions from MangaDex (recently created) */
export async function getMangaDexNewAdditions(): Promise<AtsuMangaEntry[]> {
  try {
    const params = buildMangaDexListParams({ "order[createdAt]": "desc", limit: "20" });
    const res = await mangadexFetch(`${MANGADEX_API}/manga?${params}`);
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data?.data)) return [];
    return data.data.map(mapMangaDexEntry);
  } catch {
    return [];
  }
}

/** Get manga detail from MangaDex */
export async function getMangaDexDetail(mangaId: string): Promise<AtsuMangaDetail | null> {
  try {
    // Fetch manga info
    const infoRes = await mangadexFetch(
      `${MANGADEX_API}/manga/${mangaId}?includes[]=cover_art&includes[]=author&includes[]=artist`
    );
    if (!infoRes.ok) return null;
    const infoData = await infoRes.json();
    const manga = infoData?.data;
    if (!manga) return null;

    const attrs = manga.attributes || {};
    const coverFileName = getMangaDexCoverFileName(manga.relationships || []);
    const poster = coverFileName ? getMangaDexCoverUrl(manga.id, coverFileName) : undefined;

    // Fetch chapters — paginate to get all English chapters
    let chapters: AtsuMangaChapter[] = [];
    let totalChapters = 0;
    let offset = 0;
    const chapterLimit = 100;
    let hasMore = true;

    while (hasMore) {
      const chaptersRes = await mangadexFetch(
        `${MANGADEX_API}/manga/${mangaId}/feed?translatedLanguage[]=en&order[chapter]=asc&limit=${chapterLimit}&offset=${offset}`
      );

      if (!chaptersRes.ok) break;

      const chaptersData = await chaptersRes.json();
      totalChapters = chaptersData?.total || 0;
      const batch = chaptersData?.data || [];

      if (!Array.isArray(batch) || batch.length === 0) break;

      for (const ch of batch) {
        if (!ch.attributes?.chapter) continue;
        chapters.push({
          id: ch.id,
          mangadexChapterId: ch.id,
          title: ch.attributes?.title || `Chapter ${ch.attributes?.chapter}`,
          number: parseFloat(ch.attributes?.chapter) || (chapters.length + 1),
          date: ch.attributes?.publishAt || ch.attributes?.readableAt,
          scanGroup: ch.relationships?.find((r: any) => r.type === "scanlation_group")?.attributes?.name,
          pages: ch.attributes?.pages,
        });
      }

      offset += chapterLimit;
      hasMore = offset < totalChapters;
    }

    // Sort chapters by number ascending (deduplicate by number, keep first)
    const seen = new Set<number>();
    const uniqueChapters = chapters.filter(ch => {
      const key = Math.round(ch.number * 100) / 100;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    uniqueChapters.sort((a, b) => a.number - b.number);
    chapters = uniqueChapters;

    return {
      id: manga.id,
      mangadexId: manga.id,
      title: getMangaDexTitle(attrs),
      englishTitle: getMangaDexEnglishTitle(attrs),
      altTitles: attrs.altTitles
        ? attrs.altTitles.map((t: any) => Object.values(t)[0] as string)
        : [],
      poster,
      banner: undefined,
      description: attrs.description?.en || attrs.description?.["ja-ro"] ||
        (typeof attrs.description === "string" ? attrs.description : undefined),
      type: attrs.publicationDemographic ? capitalizeFirst(attrs.publicationDemographic) : undefined,
      status: getMangaDexStatus(attrs),
      year: attrs.year || undefined,
      authors: getMangaDexAuthors(manga.relationships || [], "author"),
      artists: getMangaDexAuthors(manga.relationships || [], "artist"),
      genres: getMangaDexGenres(attrs),
      isAdult: attrs.contentRating === "pornographic" || attrs.contentRating === "erotica",
      totalChapters: totalChapters || (attrs.lastChapter ? parseInt(attrs.lastChapter) : undefined) || 0,
      chapters,
      source: "mangadex",
    };
  } catch {
    return null;
  }
}

/** Get chapter pages from MangaDex at-home server */
export async function getMangaDexChapterPages(chapterId: string): Promise<AtsuChapterPage[]> {
  try {
    const res = await mangadexFetch(`${MANGADEX_API}/at-home/server/${chapterId}`);
    if (!res.ok) return [];
    const data = await res.json();
    if (!data?.chapter) return [];

    const baseUrl = data.baseUrl;
    const hash = data.chapter.hash;
    const pages = data.chapter.data; // High quality images

    if (!Array.isArray(pages)) return [];

    return pages.map((filename: string, i: number) => ({
      index: i,
      url: `${baseUrl}/data/${hash}/${filename}`,
    }));
  } catch {
    return [];
  }
}

// ============================================================
// Combined API Functions (MangaDex only — Atsumaru API is down)
// ============================================================

/** Get manga home/browse sections from MangaDex */
export async function getMangaHome(): Promise<AtsuHomeSection[]> {
  const sections: AtsuHomeSection[] = [];

  try {
    const [trending, recent, topRated, newAdditions] = await Promise.all([
      getMangaDexTrending(),
      getMangaDexRecent(),
      getMangaDexTopRated(),
      getMangaDexNewAdditions(),
    ]);

    if (trending.length > 0) {
      sections.push({ title: "Trending Manga", type: "trending", items: trending });
    }
    if (topRated.length > 0) {
      sections.push({ title: "Popular Manga", type: "popular", items: topRated });
    }
    if (recent.length > 0) {
      sections.push({ title: "Recently Updated", type: "recent", items: recent });
    }
    if (newAdditions.length > 0) {
      sections.push({ title: "New Additions", type: "new", items: newAdditions });
    }
  } catch (err) {
    console.error("[manga-api] MangaDex home sections failed:", err);
  }

  // Ensure at least 3 sections with data
  if (sections.length < 3) {
    try {
      const [more1, more2] = await Promise.all([
        getMangaDexPopular(),
        getMangaDexNewAdditions(),
      ]);
      if (more1.length > 0 && !sections.some(s => s.type === "popular-fallback")) {
        sections.push({ title: "Popular Manga", type: "popular-fallback", items: more1 });
      }
      if (more2.length > 0 && !sections.some(s => s.type === "new-fallback")) {
        sections.push({ title: "New Manga", type: "new-fallback", items: more2 });
      }
    } catch { /* extra fetch failed */ }
  }

  return sections;
}

/** Search manga on MangaDex */
export async function searchManga(query: string, limit = 20): Promise<AtsuMangaEntry[]> {
  return searchMangaDex(query, limit);
}

/** Get manga details from MangaDex */
export async function getMangaDetail(mangaId: string): Promise<AtsuMangaDetail | null> {
  // Direct MangaDex lookup
  const detail = await getMangaDexDetail(mangaId);
  if (detail) return detail;

  // If UUID lookup failed, try searching by ID as title (rare edge case)
  console.log("[manga-api] MangaDex detail failed for:", mangaId);
  return null;
}

/** Get chapter images for reading from MangaDex */
export async function getChapterImages(mangaId: string, chapterId: string): Promise<AtsuChapterPage[]> {
  // Direct MangaDex chapter page fetch
  const pages = await getMangaDexChapterPages(chapterId);
  if (pages.length > 0) return pages;

  console.log("[manga-api] MangaDex chapter pages failed for:", chapterId);
  return [];
}

// ============================================================
// Re-export all MangaDex functions for direct use
// ============================================================

export {
  mapMangaDexEntry,
};
