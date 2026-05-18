// Embed Server Providers for Luffy TV
//
// Servers are categorized by content type:
// - Anime servers → use AniList ID (native + anilist-based)
// - Hindi servers → dedicated Hindi Dub servers (AniList ID)
// - Movie/TV servers → use TMDB ID (tmdb-based)
//
// Names are generic: "Server 1", "Server 2", etc. — numbered PER CONTEXT
// Anime pages show anime + hindi servers, Movie/TV pages show only TMDB servers

export interface EmbedServer {
  id: string;
  name: string;           // Display name: "Server 1", "Server 2", etc.
  priority: number;
  supportsSub: boolean;
  supportsDub: boolean;
  supportsHindi: boolean;
  idType: "tmdb" | "anilist" | "native";  // What ID/method this server uses
  color: string;
  category: "anime" | "tmdb" | "hindi" | "native";
  isNative?: boolean;     // If true, this server uses native HLS player (not iframe)
  noSandbox?: boolean;    // If true, this server needs iframe without sandbox
  generateUrl: (params: EmbedUrlParams) => string;
}

export interface EmbedUrlParams {
  anilistId?: number;
  tmdbId?: number;
  imdbId?: string;
  episode: number;
  season?: number;
  translation: "sub" | "dub" | "hindi";
  title?: string;
}

// =====================================================
// EMBED SERVER DEFINITIONS
// =====================================================

// ============================================================
// Native servers — Miruro Miku (direct HLS, no iframe)
// Miku is the primary provider — user requested
// ============================================================

const miruroMiku: EmbedServer = {
  id: "miruro-miku",
  name: "Server 1",
  priority: 0,
  supportsSub: true,
  supportsDub: true,
  supportsHindi: false,
  idType: "native",
  color: "#00ff88",
  category: "native",
  isNative: true,
  generateUrl: () => "native:miku",
};

const miruroKiwi: EmbedServer = {
  id: "miruro-kiwi",
  name: "Server 2",
  priority: 1,
  supportsSub: true,
  supportsDub: true,
  supportsHindi: false,
  idType: "native",
  color: "#22d3ee",
  category: "native",
  isNative: true,
  generateUrl: () => "native:kiwi",
};

// ============================================================
// MegaPlay Decrypter — Native HLS via API (sub/dub, direct m3u8)
// Uses: https://megaplaydecryptor.vercel.app/api/stream
// ============================================================

const megaplayDecrypter: EmbedServer = {
  id: "megaplay-decrypter",
  name: "Server 3",
  priority: 2,
  supportsSub: true,
  supportsDub: true,
  supportsHindi: false,
  idType: "native",
  color: "#F59E0B",
  category: "native",
  isNative: true,
  generateUrl: () => "native:megaplay",
};

// ============================================================
// AniList-based servers — use AniList ID for anime embeds
// ============================================================

const vidnestAnime: EmbedServer = {
  id: "vidnest-anime",
  name: "Server 4",
  priority: 4,
  supportsSub: true,
  supportsDub: true,
  supportsHindi: false,
  idType: "anilist",
  color: "#8B5CF6",
  category: "anime",
  generateUrl: (p) => {
    if (!p.anilistId) return "";
    const lang = p.translation === "hindi" ? "hindi" : p.translation;
    return `https://vidnest.fun/anime/${p.anilistId}/${p.episode}/${lang}`;
  },
};

const vidnestAnimepahe: EmbedServer = {
  id: "vidnest-animepahe",
  name: "Server 5",
  priority: 5,
  supportsSub: true,
  supportsDub: true,
  supportsHindi: false,
  idType: "anilist",
  color: "#A855F7",
  category: "anime",
  generateUrl: (p) => {
    if (!p.anilistId) return "";
    const lang = p.translation === "hindi" ? "hindi" : p.translation;
    return `https://vidnest.fun/animepahe/${p.anilistId}/${p.episode}/${lang}`;
  },
};

const videasyAnime: EmbedServer = {
  id: "videasy-anime",
  name: "Server 6",
  priority: 6,
  supportsSub: true,
  supportsDub: true,
  supportsHindi: false,
  idType: "anilist",
  color: "#00A8E1",
  category: "anime",
  generateUrl: (p) => {
    if (!p.anilistId) return "";
    const dub = p.translation === "dub" ? "&dub=true" : "";
    return `https://player.videasy.net/anime/${p.anilistId}/${p.episode}?nextEpisode=true&autoplayNextEpisode=true&episodeSelector=true&overlay=true&color=00A8E1${dub}`;
  },
};

const megaplayEmbed: EmbedServer = {
  id: "megaplay-embed",
  name: "Server 7",
  priority: 7,
  supportsSub: true,
  supportsDub: true,
  supportsHindi: false,
  idType: "anilist",
  color: "#F59E0B",
  category: "anime",
  generateUrl: (p) => {
    if (!p.anilistId) return "";
    const lang = p.translation === "hindi" ? "hindi" : p.translation;
    return `https://megaplay.buzz/stream/ani/${p.anilistId}/${p.episode}/${lang}`;
  },
};

const tryembed: EmbedServer = {
  id: "tryembed",
  name: "Server 8",
  priority: 8,
  supportsSub: true,
  supportsDub: true,
  supportsHindi: false,
  idType: "anilist",
  color: "#10B981",
  category: "anime",
  generateUrl: (p) => {
    if (!p.anilistId) return "";
    const lang = p.translation === "hindi" ? "hindi" : p.translation;
    return `https://tryembed.us.cc/embed/anime/${p.anilistId}/${p.episode}/${lang}`;
  },
};

const vidplusAnime: EmbedServer = {
  id: "vidplus-anime",
  name: "Server 9",
  priority: 9,
  supportsSub: true,
  supportsDub: true,
  supportsHindi: false,
  idType: "anilist",
  color: "#EC4899",
  category: "anime",
  generateUrl: (p) => {
    if (!p.anilistId) return "";
    const lang = p.translation === "hindi" ? "hindi" : p.translation;
    return `https://player.vidplus.to/embed/anime/${p.anilistId}/${p.episode}/${lang}?autoplay=true`;
  },
};

// ============================================================
// Hindi-specific servers — dedicated Hindi Dub category
// ============================================================

const anixtvHindi: EmbedServer = {
  id: "anixtv-hindi",
  name: "Hindi Server",
  priority: 0,  // Top priority for Hindi
  supportsSub: false,
  supportsDub: false,
  supportsHindi: true,
  idType: "anilist",
  color: "#FF6B35",
  category: "hindi",
  noSandbox: true,  // anixtv doesn't work with sandbox
  generateUrl: (p) => {
    if (!p.anilistId) return "";
    const title = p.title ? encodeURIComponent(p.title) : "Anime";
    return `https://anixtv.in/anime-watch?action=hindi_1_player&id=${p.anilistId}&season=1&episode=${p.episode}&title=${title}`;
  },
};

const megaplayHindi: EmbedServer = {
  id: "megaplay-hindi",
  name: "Hindi Dub 2",
  priority: 1,
  supportsSub: false,
  supportsDub: false,
  supportsHindi: true,
  idType: "anilist",
  color: "#F97316",
  category: "hindi",
  generateUrl: (p) => {
    if (!p.anilistId) return "";
    return `https://megaplay.buzz/stream/ani/${p.anilistId}/${p.episode}/hindi`;
  },
};

const vidnestHindi: EmbedServer = {
  id: "vidnest-hindi",
  name: "Hindi Dub 3",
  priority: 2,
  supportsSub: false,
  supportsDub: false,
  supportsHindi: true,
  idType: "anilist",
  color: "#A855F7",
  category: "hindi",
  generateUrl: (p) => {
    if (!p.anilistId) return "";
    return `https://vidnest.fun/anime/${p.anilistId}/${p.episode}/hindi`;
  },
};

const vidnestPaheHindi: EmbedServer = {
  id: "vidnest-pahe-hindi",
  name: "Hindi Dub 4",
  priority: 3,
  supportsSub: false,
  supportsDub: false,
  supportsHindi: true,
  idType: "anilist",
  color: "#8B5CF6",
  category: "hindi",
  generateUrl: (p) => {
    if (!p.anilistId) return "";
    return `https://vidnest.fun/animepahe/${p.anilistId}/${p.episode}/hindi`;
  },
};

const tryembedHindi: EmbedServer = {
  id: "tryembed-hindi",
  name: "Hindi Dub 5",
  priority: 4,
  supportsSub: false,
  supportsDub: false,
  supportsHindi: true,
  idType: "anilist",
  color: "#10B981",
  category: "hindi",
  generateUrl: (p) => {
    if (!p.anilistId) return "";
    return `https://tryembed.us.cc/embed/anime/${p.anilistId}/${p.episode}/hindi`;
  },
};

// ============================================================
// TMDB-based servers — use TMDB ID for /tv/{tmdb_id}/{s}/{e}
// Used for Movies and TV Shows
// ============================================================

const peachify: EmbedServer = {
  id: "peachify",
  name: "Server 1",
  priority: 1,
  supportsSub: true,
  supportsDub: true,
  supportsHindi: true,
  idType: "tmdb",
  color: "#F472B6",
  category: "tmdb",
  generateUrl: (p) => {
    if (!p.tmdbId) return "";
    const params = new URLSearchParams({
      autoPlay: "true",
      autoNext: "30",
      showNextBtn: "true",
      accent: "00A8E1",
    });
    if (p.translation === "hindi") {
      params.set("dub", "Hindi");
      params.set("sub", "English");
    } else if (p.translation === "dub") {
      params.set("dub", "English");
    }
    if (p.season && p.season > 0) {
      return `https://peachify.top/embed/tv/${p.tmdbId}/${p.season}/${p.episode}?${params}`;
    }
    return `https://peachify.top/embed/movie/${p.tmdbId}?${params}`;
  },
};

const vidcore: EmbedServer = {
  id: "vidcore",
  name: "Server 2",
  priority: 2,
  supportsSub: true,
  supportsDub: false,
  supportsHindi: false,
  idType: "tmdb",
  color: "#EF4444",
  category: "tmdb",
  generateUrl: (p) => {
    if (!p.tmdbId) return "";
    if (p.season && p.season > 0) {
      return `https://vidcore.net/tv/${p.tmdbId}/${p.season}/${p.episode}?autoPlay=true`;
    }
    return `https://vidcore.net/movie/${p.tmdbId}?autoPlay=true`;
  },
};

const vidnestTv: EmbedServer = {
  id: "vidnest-tv",
  name: "Server 3",
  priority: 3,
  supportsSub: true,
  supportsDub: false,
  supportsHindi: false,
  idType: "tmdb",
  color: "#7C3AED",
  category: "tmdb",
  generateUrl: (p) => {
    if (!p.tmdbId) return "";
    const season = p.season || 1;
    return `https://vidnest.fun/tv/${p.tmdbId}/${season}/${p.episode}`;
  },
};

const vidfast: EmbedServer = {
  id: "vidfast",
  name: "Server 4",
  priority: 4,
  supportsSub: true,
  supportsDub: false,
  supportsHindi: false,
  idType: "tmdb",
  color: "#3B82F6",
  category: "tmdb",
  generateUrl: (p) => {
    if (!p.tmdbId) return "";
    if (p.season && p.season > 0) {
      return `https://vidfast.pro/tv/${p.tmdbId}/${p.season}/${p.episode}?autoPlay=true&theme=00A8E1`;
    }
    return `https://vidfast.pro/movie/${p.tmdbId}?autoPlay=true&theme=00A8E1`;
  },
};

const videasyTv: EmbedServer = {
  id: "videasy-tv",
  name: "Server 5",
  priority: 5,
  supportsSub: true,
  supportsDub: false,
  supportsHindi: false,
  idType: "tmdb",
  color: "#00A8E1",
  category: "tmdb",
  generateUrl: (p) => {
    if (!p.tmdbId) return "";
    if (p.season && p.season > 0) {
      return `https://player.videasy.net/tv/${p.tmdbId}/${p.season}/${p.episode}?color=00A8E1&nextEpisode=true&autoplayNextEpisode=true`;
    }
    return `https://player.videasy.net/movie/${p.tmdbId}?color=00A8E1`;
  },
};

const vidsrcme: EmbedServer = {
  id: "vidsrcme",
  name: "Server 6",
  priority: 6,
  supportsSub: true,
  supportsDub: false,
  supportsHindi: false,
  idType: "tmdb",
  color: "#22C55E",
  category: "tmdb",
  generateUrl: (p) => {
    if (!p.tmdbId) return "";
    const season = p.season || 1;
    return `https://vidsrcme.ru/embed/tv?tmdb=${p.tmdbId}&season=${season}&episode=${p.episode}`;
  },
};

const vidplus: EmbedServer = {
  id: "vidplus",
  name: "Server 7",
  priority: 7,
  supportsSub: true,
  supportsDub: false,
  supportsHindi: false,
  idType: "tmdb",
  color: "#EC4899",
  category: "tmdb",
  generateUrl: (p) => {
    if (!p.tmdbId) return "";
    if (p.season && p.season > 0) {
      return `https://player.vidplus.to/embed/tv/${p.tmdbId}/${p.season}/${p.episode}?autoplay=true`;
    }
    return `https://player.vidplus.to/embed/movie/${p.tmdbId}?autoplay=true`;
  },
};

const vidplays: EmbedServer = {
  id: "vidplays",
  name: "Server 8",
  priority: 8,
  supportsSub: true,
  supportsDub: false,
  supportsHindi: false,
  idType: "tmdb",
  color: "#14B8A6",
  category: "tmdb",
  generateUrl: (p) => {
    if (!p.tmdbId) return "";
    if (p.season && p.season > 0) {
      return `https://vidplays.fun/embed/tv/${p.tmdbId}/${p.season}/${p.episode}?autoplay=true`;
    }
    return `https://vidplays.fun/embed/movie/${p.tmdbId}?autoplay=true`;
  },
};

const embedmaster: EmbedServer = {
  id: "embedmaster",
  name: "Server 9",
  priority: 9,
  supportsSub: true,
  supportsDub: false,
  supportsHindi: false,
  idType: "tmdb",
  color: "#6366F1",
  category: "tmdb",
  generateUrl: (p) => {
    if (!p.tmdbId) return "";
    if (p.season && p.season > 0) {
      return `https://embedmaster.link/tv/${p.tmdbId}/${p.season}/${p.episode}`;
    }
    return `https://embedmaster.link/movie/${p.tmdbId}`;
  },
};

const vidlink: EmbedServer = {
  id: "vidlink",
  name: "Server 10",
  priority: 10,
  supportsSub: true,
  supportsDub: false,
  supportsHindi: false,
  idType: "tmdb",
  color: "#8B5CF6",
  category: "tmdb",
  generateUrl: (p) => {
    if (!p.tmdbId) return "";
    if (p.season && p.season > 0) {
      return `https://vidlink.pro/tv/${p.tmdbId}/${p.season}/${p.episode}`;
    }
    return `https://vidlink.pro/movie/${p.tmdbId}`;
  },
};

const vidzen: EmbedServer = {
  id: "vidzen",
  name: "Server 11",
  priority: 11,
  supportsSub: true,
  supportsDub: false,
  supportsHindi: false,
  idType: "tmdb",
  color: "#F97316",
  category: "tmdb",
  generateUrl: (p) => {
    if (!p.tmdbId) return "";
    if (p.season && p.season > 0) {
      return `https://vidzen.fun/tv/${p.tmdbId}/${p.season}/${p.episode}`;
    }
    return `https://vidzen.fun/movie/${p.tmdbId}`;
  },
};

const vidking: EmbedServer = {
  id: "vidking",
  name: "Server 12",
  priority: 12,
  supportsSub: true,
  supportsDub: false,
  supportsHindi: false,
  idType: "tmdb",
  color: "#E11D48",
  category: "tmdb",
  generateUrl: (p) => {
    if (!p.tmdbId) return "";
    const params = new URLSearchParams({
      color: "00A8E1",
      autoPlay: "true",
    });
    if (p.season && p.season > 0) {
      params.set("nextEpisode", "true");
      params.set("episodeSelector", "true");
      return `https://www.vidking.net/embed/tv/${p.tmdbId}/${p.season}/${p.episode}?${params}`;
    }
    return `https://www.vidking.net/embed/movie/${p.tmdbId}?${params}`;
  },
};

// ============================================================
// ALL SERVERS — raw definitions
// ============================================================

const ALL_SERVERS: EmbedServer[] = [
  miruroMiku, miruroKiwi,
  megaplayDecrypter,
  vidnestAnime, vidnestAnimepahe, videasyAnime, megaplayEmbed, tryembed, vidplusAnime,
  anixtvHindi, megaplayHindi, vidnestHindi, vidnestPaheHindi, tryembedHindi,
  peachify, vidcore, vidnestTv, vidfast, videasyTv, vidsrcme,
  vidplus, vidplays, embedmaster, vidlink, vidzen, vidking,
];

/**
 * Get servers available for Anime content (SUB/DUB)
 * Includes: native (miku + kiwi + megaplay decrypter), anilist-based
 * Excludes: Hindi-specific servers and TMDB-based servers
 */
export function getAnimeServers(): EmbedServer[] {
  const servers = ALL_SERVERS.filter(s =>
    (s.idType === "native" || s.idType === "anilist") && s.category !== "hindi"
  );
  return servers.map((s, i) => ({
    ...s,
    name: `Server ${i + 1}`,
    priority: i,
  }));
}

/**
 * Get servers available for Hindi Dub
 * These are dedicated Hindi Dub servers only
 * If this returns servers, Hindi dub is available for the anime
 */
export function getHindiServers(): EmbedServer[] {
  const servers = ALL_SERVERS.filter(s => s.category === "hindi");
  return servers.map((s, i) => ({
    ...s,
    name: i === 0 ? "Hindi Server" : `Hindi Server ${i + 1}`,
    priority: i,
  }));
}

/**
 * Get servers available for Movie/TV content
 * Includes: TMDB-based servers only
 */
export function getTmdbServers(): EmbedServer[] {
  const servers = ALL_SERVERS.filter(s => s.idType === "tmdb");
  return servers.map((s, i) => ({
    ...s,
    name: `Server ${i + 1}`,
    priority: i,
  }));
}

/**
 * Get all servers (legacy)
 */
export const EMBED_SERVERS = ALL_SERVERS;

/**
 * Generate embed URL for a specific server and episode
 */
export function getEmbedUrl(serverId: string, params: EmbedUrlParams): string {
  const server = ALL_SERVERS.find(s => s.id === serverId);
  if (!server) return "";
  return server.generateUrl(params);
}

/**
 * Get native servers (Miruro Miku + Kiwi + MegaPlay Decrypter)
 */
export function getNativeServers(): EmbedServer[] {
  return ALL_SERVERS.filter(s => s.isNative);
}

/**
 * Check if any Hindi Dub server is available for the given AniList ID
 */
export function hasHindiSupport(anilistId?: number): boolean {
  if (!anilistId) return false;
  const hindiServers = getHindiServers();
  return hindiServers.length > 0;
}
