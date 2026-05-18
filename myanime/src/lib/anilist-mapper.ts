/**
 * AniList ID → Title/Info Mapper
 *
 * Provides a client-side lookup for anime titles from AniList IDs.
 * Used by the embed sandbox and watch page to build proper URLs
 * for providers that need title/season parameters (e.g., AnixTV).
 *
 * Two sources:
 * 1. Built-in index of popular anime (instant, no API call)
 * 2. AniList GraphQL API (live lookup, cached in-memory)
 */

// ─────────────────────────────────────────────────────────────────────────────
// Built-in anime index — covers the most popular anime for instant lookup
// ─────────────────────────────────────────────────────────────────────────────

export interface AniListMapping {
  id: number;
  title: string;
  titleEnglish?: string;
  titleRomaji?: string;
  type?: string;
  episodes?: number;
  season?: number; // AniList season number (usually 1 per entry)
  year?: number;
}

export const ANILIST_INDEX: AniListMapping[] = [
  { id: 1, title: "Cowboy Bebop", titleEnglish: "Cowboy Bebop", type: "TV", episodes: 26, season: 1, year: 1998 },
  { id: 5, title: "Cowboy Bebop: The Movie", titleEnglish: "Cowboy Bebop: The Movie", type: "Movie", episodes: 1, season: 1, year: 2001 },
  { id: 21, title: "One Piece", titleEnglish: "One Piece", type: "TV", episodes: 1100, season: 1, year: 1999 },
  { id: 20, title: "Naruto", titleEnglish: "Naruto", type: "TV", episodes: 220, season: 1, year: 2002 },
  { id: 1535, title: "Death Note", titleEnglish: "Death Note", type: "TV", episodes: 37, season: 1, year: 2006 },
  { id: 16498, title: "Attack on Titan", titleEnglish: "Attack on Titan", type: "TV", episodes: 25, season: 1, year: 2013 },
  { id: 5114, title: "Fullmetal Alchemist: Brotherhood", titleEnglish: "Fullmetal Alchemist: Brotherhood", type: "TV", episodes: 64, season: 1, year: 2009 },
  { id: 11061, title: "Hunter x Hunter (2011)", titleEnglish: "Hunter x Hunter", type: "TV", episodes: 148, season: 1, year: 2011 },
  { id: 21519, title: "One-Punch Man", titleEnglish: "One-Punch Man", type: "TV", episodes: 12, season: 1, year: 2015 },
  { id: 51009, title: "Spy x Family", titleEnglish: "SPY x FAMILY", type: "TV", episodes: 12, season: 1, year: 2022 },
  { id: 1015, title: "Dragon Ball Z", titleEnglish: "Dragon Ball Z", type: "TV", episodes: 291, season: 1, year: 1989 },
  { id: 3775, title: "Dragon Ball Z", titleEnglish: "Dragon Ball Z", type: "TV", episodes: 291, season: 1, year: 1989 },
  { id: 6033, title: "Dragon Ball", titleEnglish: "Dragon Ball", type: "TV", episodes: 153, season: 1, year: 1986 },
  { id: 28025, title: "Dragon Ball Super", titleEnglish: "Dragon Ball Super", type: "TV", episodes: 131, season: 1, year: 2015 },
  { id: 7442, title: "Bleach", titleEnglish: "Bleach", type: "TV", episodes: 366, season: 1, year: 2004 },
  { id: 41467, title: "Bleach: Thousand-Year Blood War", titleEnglish: "Bleach: Thousand-Year Blood War", type: "TV", episodes: 13, season: 1, year: 2022 },
  { id: 31964, title: "My Hero Academia", titleEnglish: "My Hero Academia", type: "TV", episodes: 13, season: 1, year: 2016 },
  { id: 40748, title: "Jujutsu Kaisen", titleEnglish: "Jujutsu Kaisen", type: "TV", episodes: 24, season: 1, year: 2020 },
  { id: 38000, title: "Demon Slayer: Kimetsu no Yaiba", titleEnglish: "Demon Slayer: Kimetsu no Yaiba", type: "TV", episodes: 26, season: 1, year: 2019 },
  { id: 34572, title: "Black Clover", titleEnglish: "Black Clover", type: "TV", episodes: 170, season: 1, year: 2017 },
  { id: 9253, title: "Steins;Gate", titleEnglish: "Steins;Gate", type: "TV", episodes: 24, season: 1, year: 2011 },
  { id: 11757, title: "Sword Art Online", titleEnglish: "Sword Art Online", type: "TV", episodes: 25, season: 1, year: 2012 },
  { id: 10165, title: "Naruto Shippuden", titleEnglish: "Naruto Shippuden", type: "TV", episodes: 500, season: 1, year: 2007 },
  { id: 14713, title: "Tokyo Ghoul", titleEnglish: "Tokyo Ghoul", type: "TV", episodes: 12, season: 1, year: 2014 },
  { id: 19765, title: "Parasyte: The Maxim", titleEnglish: "Parasyte: The Maxim", type: "TV", episodes: 24, season: 1, year: 2014 },
  { id: 20632, title: "Assassination Classroom", titleEnglish: "Assassination Classroom", type: "TV", episodes: 22, season: 1, year: 2015 },
  { id: 20785, title: "Your Lie in April", titleEnglish: "Your Lie in April", type: "TV", episodes: 22, season: 1, year: 2014 },
  { id: 2167, title: "Fairy Tail", titleEnglish: "Fairy Tail", type: "TV", episodes: 175, season: 1, year: 2009 },
  { id: 6702, title: "Fairy Tail (2014)", titleEnglish: "Fairy Tail (2014)", type: "TV", episodes: 102, season: 1, year: 2014 },
  { id: 12011, title: "Haikyu!!", titleEnglish: "Haikyu!!", type: "TV", episodes: 25, season: 1, year: 2014 },
  { id: 99269, title: "Chainsaw Man", titleEnglish: "Chainsaw Man", type: "TV", episodes: 12, season: 1, year: 2022 },
  { id: 154587, title: "Frieren: Beyond Journey's End", titleEnglish: "Frieren: Beyond Journey's End", type: "TV", episodes: 28, season: 1, year: 2023 },
  { id: 172463, title: "Solo Leveling", titleEnglish: "Solo Leveling", type: "TV", episodes: 12, season: 1, year: 2024 },
  { id: 108700, title: "Solo Leveling", titleEnglish: "Solo Leveling", type: "TV", episodes: 12, season: 1, year: 2024 },
  { id: 113938, title: "Oshi no Ko", titleEnglish: "Oshi no Ko", type: "TV", episodes: 11, season: 1, year: 2023 },
  { id: 117819, title: "Blue Lock", titleEnglish: "Blue Lock", type: "TV", episodes: 24, season: 1, year: 2022 },
  { id: 130437, title: "Delicious in Dungeon", titleEnglish: "Delicious in Dungeon", type: "TV", episodes: 24, season: 1, year: 2024 },
  { id: 107471, title: "Dandadan", titleEnglish: "Dan Da Dan", type: "TV", episodes: 12, season: 1, year: 2024 },
  { id: 134146, title: "Sakamoto Days", titleEnglish: "Sakamoto Days", type: "TV", episodes: 11, season: 1, year: 2025 },
  { id: 104168, title: "Chainsaw Man", titleEnglish: "Chainsaw Man", type: "TV", episodes: 12, season: 1, year: 2022 },
  { id: 110277, title: "Frieren: Beyond Journey's End", titleEnglish: "Frieren: Beyond Journey's End", type: "TV", episodes: 28, season: 1, year: 2023 },
  { id: 38213, title: "The Rising of the Shield Hero", titleEnglish: "The Rising of the Shield Hero", type: "TV", episodes: 25, season: 1, year: 2019 },
  { id: 112389, title: "Mashle: Magic and Muscles", titleEnglish: "Mashle: Magic and Muscles", type: "TV", episodes: 12, season: 1, year: 2023 },
  { id: 122918, title: "Kaiju No. 8", titleEnglish: "Kaiju No. 8", type: "TV", episodes: 12, season: 1, year: 2024 },
  { id: 125731, title: "Wind Breaker", titleEnglish: "WIND BREAKER", type: "TV", episodes: 13, season: 1, year: 2024 },
  { id: 22535, title: "Kakegurui", titleEnglish: "Kakegurui", type: "TV", episodes: 12, season: 1, year: 2017 },
  { id: 30, title: "Neon Genesis Evangelion", titleEnglish: "Neon Genesis Evangelion", type: "TV", episodes: 26, season: 1, year: 1995 },
  { id: 40, title: "Fullmetal Alchemist", titleEnglish: "Fullmetal Alchemist", type: "TV", episodes: 51, season: 1, year: 2003 },
  { id: 50, title: "Cyberpunk: Edgerunners", titleEnglish: "Cyberpunk: Edgerunners", type: "TV", episodes: 10, season: 1, year: 2022 },
  { id: 6547, title: "Angel Beats!", titleEnglish: "Angel Beats!", type: "TV", episodes: 13, season: 1, year: 2010 },
  { id: 2001, title: "Monster", titleEnglish: "Monster", type: "TV", episodes: 74, season: 1, year: 2004 },
  { id: 21095, title: "Death Parade", titleEnglish: "Death Parade", type: "TV", episodes: 12, season: 1, year: 2015 },
  { id: 21507, title: "Mirai Nikki", titleEnglish: "Future Diary", type: "TV", episodes: 26, season: 1, year: 2011 },
  { id: 34599, title: "Darling in the Franxx", titleEnglish: "DARLING in the FRANXX", type: "TV", episodes: 24, season: 1, year: 2018 },
  { id: 10, title: "Akira", titleEnglish: "Akira", type: "Movie", episodes: 1, season: 1, year: 1988 },
  { id: 11, title: "Ghost in the Shell", titleEnglish: "Ghost in the Shell", type: "Movie", episodes: 1, season: 1, year: 1995 },
  { id: 98626, title: "Boruto: Naruto Next Generations", titleEnglish: "Boruto: Naruto Next Generations", type: "TV", episodes: 293, season: 1, year: 2017 },
  { id: 131526, title: "Solo Leveling Season 2", titleEnglish: "Solo Leveling Season 2", type: "TV", episodes: 13, season: 2, year: 2025 },
  { id: 101922, title: "Spy x Family", titleEnglish: "SPY x FAMILY", type: "TV", episodes: 12, season: 1, year: 2022 },
];

// ─────────────────────────────────────────────────────────────────────────────
// In-memory cache for API lookups
// ─────────────────────────────────────────────────────────────────────────────

const cache = new Map<number, { data: AniListMapping; timestamp: number }>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

// ─────────────────────────────────────────────────────────────────────────────
// Lookup functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Look up anime info from the built-in index (instant, no API call).
 * Returns null if the ID is not in the index.
 */
export function lookupAniListLocal(id: number): AniListMapping | null {
  return ANILIST_INDEX.find(a => a.id === id) ?? null;
}

/**
 * Look up anime info from the built-in index by title (fuzzy match).
 * Returns the best match or null.
 */
export function lookupAniListByTitle(query: string): AniListMapping[] {
  if (!query || query.trim().length === 0) return [];
  const normalized = query.toLowerCase().trim();
  const terms = normalized.split(/\s+/);

  const scored = ANILIST_INDEX.map((item) => {
    const titleLower = item.title.toLowerCase();
    const engLower = (item.titleEnglish || "").toLowerCase();
    let score = 0;

    if (titleLower === normalized || engLower === normalized) score += 100;
    if (titleLower.startsWith(normalized) || engLower.startsWith(normalized)) score += 50;
    if (titleLower.includes(normalized) || engLower.includes(normalized)) score += 30;
    for (const term of terms) {
      if (titleLower.includes(term) || engLower.includes(term)) score += 10;
    }

    return { item, score };
  }).filter(({ score }) => score > 0);

  scored.sort((a, b) => b.score - a.score);
  return scored.map(({ item }) => item);
}

/**
 * Fetch anime info from AniList GraphQL API.
 * Caches results in-memory for 30 minutes.
 */
export async function lookupAniListAPI(id: number): Promise<AniListMapping | null> {
  // Check cache first
  const cached = cache.get(id);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const query = `
      query ($id: Int) {
        Media(id: $id, type: ANIME) {
          id
          title { english romaji native }
          type
          episodes
          season
          seasonYear
          format
        }
      }
    `;

    const res = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables: { id } }),
    });

    if (!res.ok) return null;

    const json = await res.json();
    const media = json.data?.Media;
    if (!media) return null;

    const mapping: AniListMapping = {
      id: media.id,
      title: media.title.english || media.title.romaji || `Anime-${id}`,
      titleEnglish: media.title.english,
      titleRomaji: media.title.romaji,
      type: media.format || media.type,
      episodes: media.episodes,
      season: 1, // Each AniList entry is typically one season
      year: media.seasonYear,
    };

    cache.set(id, { data: mapping, timestamp: Date.now() });
    return mapping;
  } catch {
    return null;
  }
}

/**
 * Smart lookup: check local index first, then fall back to AniList API.
 */
export async function lookupAniList(id: number): Promise<AniListMapping | null> {
  const local = lookupAniListLocal(id);
  if (local) return local;
  return lookupAniListAPI(id);
}

/**
 * Get anime title for use in URL generation.
 * Returns the English title, romaji, or a fallback "Anime-{id}" string.
 */
export async function getAnimeTitle(id: number): Promise<string> {
  const mapping = await lookupAniList(id);
  return mapping?.titleEnglish || mapping?.title || `Anime-${id}`;
}

/**
 * Search anime by query using AniList GraphQL API.
 * Returns up to 10 results.
 */
export async function searchAniList(query: string): Promise<AniListMapping[]> {
  if (!query || query.trim().length < 2) return [];

  try {
    const gql = `
      query ($search: String) {
        Page(page: 1, perPage: 10) {
          media(search: $search, type: ANIME, sort: POPULARITY_DESC) {
            id
            title { english romaji native }
            type
            episodes
            format
            seasonYear
          }
        }
      }
    `;

    const res = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: gql, variables: { search: query } }),
    });

    if (!res.ok) return [];

    const json = await res.json();
    const results = json.data?.Page?.media;
    if (!results) return [];

    return results.map((m: any) => ({
      id: m.id,
      title: m.title.english || m.title.romaji || `Anime-${m.id}`,
      titleEnglish: m.title.english,
      titleRomaji: m.title.romaji,
      type: m.format || m.type,
      episodes: m.episodes,
      season: 1,
      year: m.seasonYear,
    }));
  } catch {
    return [];
  }
}
