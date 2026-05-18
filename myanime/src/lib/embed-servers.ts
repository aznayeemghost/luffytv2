// Embed Server Providers for Luffy TV
//
// Servers are categorized by content type:
// - Anime servers → use AniList ID (native + anilist-based + hindi)
// - Movie/TV servers → use TMDB ID (tmdb-based)
//
// Names are generic: "Server 1", "Server 2", etc. — numbered PER CONTEXT
// Anime pages show only anime servers, Movie/TV pages show only TMDB servers

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
// Internal names are descriptive; display names are set by helper functions
// =====================================================

// ============================================================
// Native servers — Miruro Kiwi (direct HLS, no iframe)
// ============================================================

const miruroKiwi: EmbedServer = {
  id: "miruro-kiwi",
  name: "Server 1",
  priority: 0,  // Highest priority - direct stream
  supportsSub: true,
  supportsDub: true,
  supportsHindi: false,
  idType: "native",
  color: "#00ff88",
  category: "native",
  isNative: true,
  generateUrl: () => "native:kiwi",  // Special marker - handled by watch page
};

// ============================================================
// Native server — MegaPlay Decryptor (direct HLS m3u8 + subs + skip data)
// ============================================================

const megaplayDecryptor: EmbedServer = {
  id: "megaplay-decryptor",
  name: "Server 2",
  priority: 1,  // Second highest after kiwi
  supportsSub: true,
  supportsDub: true,
  supportsHindi: false,
  idType: "native",
  color: "#a855f7",
  category: "native",
  isNative: true,
  generateUrl: () => "native:megaplay",  // Special marker - handled by watch page
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
// AniList-based servers — use AniList ID for /anime/{anilistId}/{ep}/{lang}
// Used for Anime content
// ============================================================

const vidnestAnime: EmbedServer = {
  id: "vidnest-anime",
  name: "Server 2",
  priority: 12,
  supportsSub: true,
  supportsDub: true,
  supportsHindi: true,
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
  name: "Server 3",
  priority: 13,
  supportsSub: true,
  supportsDub: true,
  supportsHindi: true,
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
  name: "Server 4",
  priority: 14,
  supportsSub: true,
  supportsDub: true,
  supportsHindi: false,
  idType: "anilist",
  color: "#00A8E1",
  category: "anime",
  generateUrl: (p) => {
    if (!p.anilistId) return "";
    // VidEasy auto-provides both sub & dub — no explicit param needed
    // dub param is not documented but kept as optional hint
    const params = new URLSearchParams({
      nextEpisode: "true",
      autoplayNextEpisode: "true",
      episodeSelector: "true",
      overlay: "true",
      color: "00A8E1",
    });
    if (p.translation === "dub") params.set("dub", "true");
    return `https://player.videasy.net/anime/${p.anilistId}/${p.episode}?${params}`;
  },
};

const megaplayEmbed: EmbedServer = {
  id: "megaplay-embed",
  name: "Server 5",
  priority: 15,
  supportsSub: true,
  supportsDub: true,
  supportsHindi: true,
  idType: "anilist",
  color: "#F59E0B",
  category: "anime",
  generateUrl: (p) => {
    if (!p.anilistId) return "";
    const lang = p.translation === "hindi" ? "hindi" : p.translation;
    return `https://megaplay.buzz/stream/ani/${p.anilistId}/${p.episode}/${lang}`;
  },
};

// ============================================================
// VidPlus Anime — AniList ID with dub query param
// URL: https://player.vidplus.to/embed/anime/{anilistId}/{episode}?dub=true/false
// ============================================================

const vidplusAnime: EmbedServer = {
  id: "vidplus-anime",
  name: "Server 7",
  priority: 17,
  supportsSub: true,
  supportsDub: true,
  supportsHindi: false,
  idType: "anilist",
  color: "#EC4899",
  category: "anime",
  generateUrl: (p) => {
    if (!p.anilistId) return "";
    const params = new URLSearchParams({
      autoplay: "true",
      autonext: "true",
      nextbutton: "true",
      primarycolor: "00A8E1",
      secondarycolor: "0099CC",
      iconcolor: "FFFFFF",
      icons: "netflix",
      episodelist: "true",
      poster: "true",
      title: "true",
    });
    if (p.translation === "dub") params.set("dub", "true");
    return `https://player.vidplus.to/embed/anime/${p.anilistId}/${p.episode}?${params}`;
  },
};

const tryembed: EmbedServer = {
  id: "tryembed",
  name: "Server 6",
  priority: 16,
  supportsSub: true,
  supportsDub: true,
  supportsHindi: false,  // TryEmbed only supports sub/dub
  idType: "anilist",
  color: "#10B981",
  category: "anime",
  generateUrl: (p) => {
    if (!p.anilistId) return "";
    const lang = p.translation === "dub" ? "dub" : "sub";  // Only sub/dub supported
    return `https://tryembed.us.cc/embed/anime/${p.anilistId}/${p.episode}/${lang}`;
  },
};

// ============================================================
// Hindi-specific servers — use AniList ID
// ============================================================

const anixtvHindi: EmbedServer = {
  id: "anixtv-hindi",
  name: "Server 8",
  priority: 18,
  supportsSub: false,
  supportsDub: false,
  supportsHindi: true,
  idType: "anilist",
  color: "#FF6B35",
  category: "hindi",
  generateUrl: (p) => {
    if (!p.anilistId) return "";
    const title = p.title ? encodeURIComponent(p.title) : `Anime-${p.anilistId}`;
    const season = p.season || 1;
    return `https://anixtv.in/anime-watch?action=hindi_1_player&id=${p.anilistId}&season=${season}&episode=${p.episode}&title=${title}`;
  },
};

// ============================================================
// ALL SERVERS — raw definitions (names are set by helper functions)
// ============================================================

const ALL_SERVERS: EmbedServer[] = [
  miruroKiwi, megaplayDecryptor,
  peachify, vidcore, vidnestTv, vidfast, videasyTv, vidsrcme,
  vidplus, vidplays, embedmaster, vidlink, vidzen, vidking,
  vidnestAnime, vidnestAnimepahe, videasyAnime, megaplayEmbed, tryembed,
  vidplusAnime,
  anixtvHindi,
];

/**
 * Get servers available for Anime content
 * Includes: native (kiwi), anilist-based, and hindi servers
 * Excludes: TMDB-based servers (they don't work with AniList IDs)
 * Names are re-numbered sequentially: Server 1, Server 2, ...
 */
export function getAnimeServers(): EmbedServer[] {
  const servers = ALL_SERVERS.filter(s =>
    s.idType === "native" || s.idType === "anilist"
  );
  return servers.map((s, i) => ({
    ...s,
    name: `Server ${i + 1}`,
    priority: i,
  }));
}

/**
 * Get servers available for Movie/TV content
 * Includes: TMDB-based servers only
 * Excludes: anime and hindi servers (they need AniList IDs)
 * Names are re-numbered sequentially: Server 1, Server 2, ...
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
 * Get all servers (legacy — use getAnimeServers/getTmdbServers instead)
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
 * Get native (Miruro) servers
 */
export function getNativeServers(): EmbedServer[] {
  return ALL_SERVERS.filter(s => s.isNative);
}

/**
 * Get Hindi-specific servers
 */
export function getHindiServers(): EmbedServer[] {
  return ALL_SERVERS.filter(s => s.supportsHindi && !s.isNative);
}
