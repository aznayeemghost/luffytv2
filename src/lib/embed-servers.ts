// Embed Server Providers for Luffy TV
//
// Servers are categorized by content type and ID type:
// - Anime servers (1-14) → use AniList ID (iframe embeds)
//   - Servers 1-7: AniList-based direct embeds
//   - Servers 11-14: Megaplay/Miruro MAL-based embeds
// - Hindi servers → dedicated Hindi Dub servers (AniList ID)
// - TMDB servers → use TMDB ID for Movies and TV Shows (iframe embeds)
//   - Named servers: VidCore, VidPlays, VidFast, VidNest, Videasy, VidPlus,
//     Peachify, EmbedMaster, VidLink, VidSrcMe, ScreenScape, VidRock,
//     VidZen, VidAPI, VidBinge, 2Embed, VidSrc.to, VidSrc.io, DropFile, SuperEmbed

export interface EmbedServer {
  id: string;
  name: string;           // Display name: "Server 1", "VidCore", etc.
  priority: number;
  supportsSub: boolean;
  supportsDub: boolean;
  supportsHindi: boolean;
  idType: "tmdb" | "anilist";  // What ID this server uses
  color: string;
  category: "anime" | "tmdb" | "hindi";
  noSandbox?: boolean;    // If true, this server needs iframe without sandbox
  generateUrl: (params: EmbedUrlParams) => string;
}

export interface EmbedUrlParams {
  anilistId?: number;
  malId?: number;
  tmdbId?: number;
  imdbId?: string;
  episode: number;
  season?: number;
  translation: "sub" | "dub" | "hindi";
  title?: string;
  language?: string;       // Language code: en, es, ja, fr, hi, etc.
}

// =====================================================
// EMBED SERVER DEFINITIONS
// =====================================================

// ============================================================
// AniList-based servers — use AniList ID for anime embeds
// These are iframe embed servers that use the AniList ID directly
// ============================================================

const vidnestAnime: EmbedServer = {
  id: "vidnest-anime",
  name: "Server 1",
  priority: 0,
  supportsSub: true,
  supportsDub: true,
  supportsHindi: false,
  idType: "anilist",
  color: "#8B5CF6",
  category: "anime",
  generateUrl: (p) => {
    if (!p.anilistId) return "";
    const lang = p.translation === "dub" ? "dub" : "sub";
    return `https://vidnest.fun/anime/${p.anilistId}/${p.episode}/${lang}`;
  },
};

const vidnestAnimepahe: EmbedServer = {
  id: "vidnest-animepahe",
  name: "Server 2",
  priority: 1,
  supportsSub: true,
  supportsDub: true,
  supportsHindi: false,
  idType: "anilist",
  color: "#A855F7",
  category: "anime",
  generateUrl: (p) => {
    if (!p.anilistId) return "";
    const lang = p.translation === "dub" ? "dub" : "sub";
    return `https://vidnest.fun/animepahe/${p.anilistId}/${p.episode}/${lang}`;
  },
};

const videasyAnime: EmbedServer = {
  id: "videasy-anime",
  name: "Server 3",
  priority: 2,
  supportsSub: true,
  supportsDub: true,
  supportsHindi: false,
  idType: "anilist",
  color: "#8B5CF6",
  category: "anime",
  generateUrl: (p) => {
    if (!p.anilistId) return "";
    return `https://player.videasy.net/anime/${p.anilistId}/${p.episode}?nextEpisode=true&autoplayNextEpisode=true&episodeSelector=true&overlay=true&color=8B5CF6`;
  },
};

const vidplusAnime: EmbedServer = {
  id: "vidplus-anime",
  name: "Server 4",
  priority: 3,
  supportsSub: true,
  supportsDub: true,
  supportsHindi: false,
  idType: "anilist",
  color: "#EC4899",
  category: "anime",
  generateUrl: (p) => {
    if (!p.anilistId) return "";
    const isDub = p.translation === "dub";
    return `https://player.vidplus.to/embed/anime/${p.anilistId}/${p.episode}?autoplay=true&autonext=true&nextbutton=true&dub=${isDub}&primarycolor=8B5CF6`;
  },
};

const tryembedAnime: EmbedServer = {
  id: "tryembed-anime",
  name: "Server 5",
  priority: 4,
  supportsSub: true,
  supportsDub: true,
  supportsHindi: false,
  idType: "anilist",
  color: "#10B981",
  category: "anime",
  generateUrl: (p) => {
    if (!p.anilistId) return "";
    const lang = p.translation === "dub" ? "dub" : "sub";
    return `https://tryembed.us.cc/embed/anime/${p.anilistId}/${p.episode}/${lang}?autoplay=true&autoSkip=true`;
  },
};

const megaplayAniSub: EmbedServer = {
  id: "megaplay-ani-sub",
  name: "Server 6",
  priority: 5,
  supportsSub: true,
  supportsDub: false,
  supportsHindi: false,
  idType: "anilist",
  color: "#F59E0B",
  category: "anime",
  generateUrl: (p) => {
    if (!p.anilistId) return "";
    return `https://megaplay.buzz/stream/ani/${p.anilistId}/${p.episode}/sub`;
  },
};

const megaplayAniDub: EmbedServer = {
  id: "megaplay-ani-dub",
  name: "Server 7",
  priority: 6,
  supportsSub: false,
  supportsDub: true,
  supportsHindi: false,
  idType: "anilist",
  color: "#FB923C",
  category: "anime",
  generateUrl: (p) => {
    if (!p.anilistId) return "";
    return `https://megaplay.buzz/stream/ani/${p.anilistId}/${p.episode}/dub`;
  },
};

// ============================================================
// Megaplay/Miruro MAL-based servers — use MAL ID
// These are the "Server 11-14" the user requested
// megaplay.buzz /stream/mal/ endpoint
// ============================================================

const megaplayMalSub: EmbedServer = {
  id: "megaplay-mal-sub",
  name: "Server 11",
  priority: 10,
  supportsSub: true,
  supportsDub: false,
  supportsHindi: false,
  idType: "anilist",
  color: "#06B6D4",
  category: "anime",
  generateUrl: (p) => {
    // Use MAL ID if available, otherwise fall back to AniList endpoint
    if (p.malId) {
      return `https://megaplay.buzz/stream/mal/${p.malId}/${p.episode}/sub`;
    }
    if (p.anilistId) {
      return `https://megaplay.buzz/stream/ani/${p.anilistId}/${p.episode}/sub`;
    }
    return "";
  },
};

const megaplayMalDub: EmbedServer = {
  id: "megaplay-mal-dub",
  name: "Server 12",
  priority: 11,
  supportsSub: false,
  supportsDub: true,
  supportsHindi: false,
  idType: "anilist",
  color: "#3B82F6",
  category: "anime",
  generateUrl: (p) => {
    if (p.malId) {
      return `https://megaplay.buzz/stream/mal/${p.malId}/${p.episode}/dub`;
    }
    if (p.anilistId) {
      return `https://megaplay.buzz/stream/ani/${p.anilistId}/${p.episode}/dub`;
    }
    return "";
  },
};

const megaplayAniSub2: EmbedServer = {
  id: "megaplay-ani-sub2",
  name: "Server 13",
  priority: 12,
  supportsSub: true,
  supportsDub: false,
  supportsHindi: false,
  idType: "anilist",
  color: "#A78BFA",
  category: "anime",
  generateUrl: (p) => {
    if (!p.anilistId) return "";
    return `https://megaplay.buzz/stream/ani/${p.anilistId}/${p.episode}/sub`;
  },
};

const megaplayAniDub2: EmbedServer = {
  id: "megaplay-ani-dub2",
  name: "Server 14",
  priority: 13,
  supportsSub: false,
  supportsDub: true,
  supportsHindi: false,
  idType: "anilist",
  color: "#8B5CF6",
  category: "anime",
  generateUrl: (p) => {
    if (!p.anilistId) return "";
    return `https://megaplay.buzz/stream/ani/${p.anilistId}/${p.episode}/dub`;
  },
};

// ============================================================
// Hindi-specific servers — AniList-based Hindi Dub servers
// ============================================================

const anixtvHindi: EmbedServer = {
  id: "anixtv-hindi",
  name: "Hindi Server 1",
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

// ============================================================
// TMDB-based servers — use TMDB ID for Movies and TV Shows
// Based on documentation from each provider
// ============================================================

const vidcore: EmbedServer = {
  id: "vidcore",
  name: "VidCore",
  priority: 0,
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

const vidplays: EmbedServer = {
  id: "vidplays",
  name: "VidPlays",
  priority: 1,
  supportsSub: true,
  supportsDub: false,
  supportsHindi: false,
  idType: "tmdb",
  color: "#14B8A6",
  category: "tmdb",
  generateUrl: (p) => {
    if (!p.tmdbId) return "";
    if (p.season && p.season > 0) {
      return `https://vidplays.fun/embed/tv/${p.tmdbId}/${p.season}/${p.episode}`;
    }
    return `https://vidplays.fun/embed/movie/${p.tmdbId}`;
  },
};

const vidfast: EmbedServer = {
  id: "vidfast",
  name: "VidFast",
  priority: 2,
  supportsSub: true,
  supportsDub: false,
  supportsHindi: false,
  idType: "tmdb",
  color: "#3B82F6",
  category: "tmdb",
  generateUrl: (p) => {
    if (!p.tmdbId) return "";
    if (p.season && p.season > 0) {
      return `https://vidfast.pro/tv/${p.tmdbId}/${p.season}/${p.episode}?autoPlay=true&nextButton=true&autoNext=true`;
    }
    return `https://vidfast.pro/movie/${p.tmdbId}?autoPlay=true`;
  },
};

const vidnestTv: EmbedServer = {
  id: "vidnest-tv",
  name: "VidNest",
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

const videasyTv: EmbedServer = {
  id: "videasy-tv",
  name: "Videasy",
  priority: 4,
  supportsSub: true,
  supportsDub: false,
  supportsHindi: false,
  idType: "tmdb",
  color: "#8B5CF6",
  category: "tmdb",
  generateUrl: (p) => {
    if (!p.tmdbId) return "";
    if (p.season && p.season > 0) {
      return `https://player.videasy.net/tv/${p.tmdbId}/${p.season}/${p.episode}?color=8B5CF6&nextEpisode=true&autoplayNextEpisode=true`;
    }
    return `https://player.videasy.net/movie/${p.tmdbId}?color=8B5CF6`;
  },
};

const vidplus: EmbedServer = {
  id: "vidplus",
  name: "VidPlus",
  priority: 5,
  supportsSub: true,
  supportsDub: false,
  supportsHindi: false,
  idType: "tmdb",
  color: "#EC4899",
  category: "tmdb",
  generateUrl: (p) => {
    if (!p.tmdbId) return "";
    if (p.season && p.season > 0) {
      return `https://player.vidplus.to/embed/tv/${p.tmdbId}/${p.season}/${p.episode}?autoplay=true&autonext=true&nextbutton=true&primarycolor=8B5CF6`;
    }
    return `https://player.vidplus.to/embed/movie/${p.tmdbId}?autoplay=true&primarycolor=8B5CF6`;
  },
};

const peachify: EmbedServer = {
  id: "peachify",
  name: "Peachify",
  priority: 6,
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
      accent: "8B5CF6",
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

const embedmaster: EmbedServer = {
  id: "embedmaster",
  name: "EmbedMaster",
  priority: 7,
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
  name: "VidLink",
  priority: 8,
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

const vidsrcme: EmbedServer = {
  id: "vidsrcme",
  name: "VidSrcMe",
  priority: 9,
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

// ============================================================
// NEW TMDB-based servers — additional embed providers
// ============================================================

const screenscape: EmbedServer = {
  id: "screenscape",
  name: "ScreenScape",
  priority: 10,
  supportsSub: true,
  supportsDub: true,
  supportsHindi: true,
  idType: "tmdb",
  color: "#FF6B35",
  category: "tmdb",
  generateUrl: (p) => {
    if (!p.tmdbId) return "";
    if (p.season && p.season > 0) {
      let url = `https://screenscape.me/embed?tmdb=${p.tmdbId}&type=tv&season=${p.season}&episode=${p.episode}`;
      if (p.translation === "hindi") {
        url += "&lan=hindi";
      }
      return url;
    }
    let url = `https://screenscape.me/embed?tmdb=${p.tmdbId}&type=movie`;
    if (p.translation === "hindi") {
      url += "&lan=hindi";
    }
    return url;
  },
};

const vidrock: EmbedServer = {
  id: "vidrock",
  name: "VidRock",
  priority: 11,
  supportsSub: true,
  supportsDub: false,
  supportsHindi: false,
  idType: "tmdb",
  color: "#EF4444",
  category: "tmdb",
  generateUrl: (p) => {
    if (!p.tmdbId) return "";
    if (p.season && p.season > 0) {
      return `https://vidrock.ru/tv/${p.tmdbId}/${p.season}/${p.episode}`;
    }
    return `https://vidrock.ru/movie/${p.tmdbId}`;
  },
};

const vidzen: EmbedServer = {
  id: "vidzen",
  name: "VidZen",
  priority: 12,
  supportsSub: true,
  supportsDub: false,
  supportsHindi: false,
  idType: "tmdb",
  color: "#6366F1",
  category: "tmdb",
  generateUrl: (p) => {
    if (!p.tmdbId) return "";
    if (p.season && p.season > 0) {
      return `https://vidzen.fun/tv/${p.tmdbId}/${p.season}/${p.episode}`;
    }
    return `https://vidzen.fun/movie/${p.tmdbId}`;
  },
};

const vidapi: EmbedServer = {
  id: "vidapi",
  name: "VidAPI",
  priority: 13,
  supportsSub: true,
  supportsDub: true,
  supportsHindi: false,
  idType: "tmdb",
  color: "#14B8A6",
  category: "tmdb",
  generateUrl: (p) => {
    if (!p.tmdbId) return "";
    if (p.season && p.season > 0) {
      let url = `https://vaplayer.ru/embed/tv/${p.tmdbId}/${p.season}/${p.episode}`;
      if (p.language) {
        url += `?ds_lang=${p.language}`;
      }
      return url;
    }
    let url = `https://vaplayer.ru/embed/movie/${p.tmdbId}`;
    if (p.language) {
      url += `?ds_lang=${p.language}`;
    }
    return url;
  },
};

const vidbinge: EmbedServer = {
  id: "vidbinge",
  name: "VidBinge",
  priority: 14,
  supportsSub: true,
  supportsDub: false,
  supportsHindi: false,
  idType: "tmdb",
  color: "#8B5CF6",
  category: "tmdb",
  generateUrl: (p) => {
    if (!p.tmdbId) return "";
    if (p.season && p.season > 0) {
      return `https://vidbinge.to/tv/${p.tmdbId}/${p.season}/${p.episode}`;
    }
    return `https://vidbinge.to/movie/${p.tmdbId}`;
  },
};

const twoembed: EmbedServer = {
  id: "twoembed",
  name: "2Embed",
  priority: 15,
  supportsSub: true,
  supportsDub: false,
  supportsHindi: false,
  idType: "tmdb",
  color: "#F59E0B",
  category: "tmdb",
  generateUrl: (p) => {
    if (!p.tmdbId) return "";
    if (p.season && p.season > 0) {
      return `https://www.2embed.cc/embedtv/${p.tmdbId}&s=${p.season}&e=${p.episode}&tmdb=1`;
    }
    return `https://www.2embed.cc/embed/${p.tmdbId}`;
  },
};

const vidsrcto: EmbedServer = {
  id: "vidsrcto",
  name: "VidSrc.to",
  priority: 16,
  supportsSub: true,
  supportsDub: false,
  supportsHindi: false,
  idType: "tmdb",
  color: "#22C55E",
  category: "tmdb",
  generateUrl: (p) => {
    if (!p.tmdbId) return "";
    if (p.season && p.season > 0) {
      return `https://vidsrc.to/embed/tv/${p.tmdbId}/${p.season}/${p.episode}`;
    }
    return `https://vidsrc.to/embed/movie/${p.tmdbId}`;
  },
};

const vidsrcio: EmbedServer = {
  id: "vidsrcio",
  name: "VidSrc.io",
  priority: 17,
  supportsSub: true,
  supportsDub: false,
  supportsHindi: false,
  idType: "tmdb",
  color: "#10B981",
  category: "tmdb",
  generateUrl: (p) => {
    if (!p.tmdbId) return "";
    if (p.season && p.season > 0) {
      return `https://vidsrc-embed.ru/embed/tv?tmdb=${p.tmdbId}&season=${p.season}&episode=${p.episode}`;
    }
    return `https://vidsrc-embed.ru/embed/movie?tmdb=${p.tmdbId}`;
  },
};

const dropfile: EmbedServer = {
  id: "dropfile",
  name: "DropFile",
  priority: 18,
  supportsSub: true,
  supportsDub: true,
  supportsHindi: false,
  idType: "tmdb",
  color: "#A78BFA",
  category: "tmdb",
  generateUrl: (p) => {
    if (!p.tmdbId && !p.malId) return "";
    // Prefer MAL ID for anime content if available
    if (p.malId && p.season && p.season > 0) {
      const audio = p.translation === "dub" ? "dub" : "sub";
      const lang = p.language || "en";
      return `https://dropfile.cc/player/tv/mal-${p.malId}/${p.season}/${p.episode}?audio=${audio}&lang=${lang}`;
    }
    if (!p.tmdbId) return "";
    const audio = p.translation === "dub" ? "dub" : "sub";
    const lang = p.language || "en";
    if (p.season && p.season > 0) {
      return `https://dropfile.cc/player/tv/${p.tmdbId}/${p.season}/${p.episode}?audio=${audio}&lang=${lang}`;
    }
    return `https://dropfile.cc/player/movie/${p.tmdbId}?audio=${audio}&lang=${lang}`;
  },
};

const superembed: EmbedServer = {
  id: "superembed",
  name: "SuperEmbed",
  priority: 19,
  supportsSub: true,
  supportsDub: false,
  supportsHindi: false,
  idType: "tmdb",
  color: "#EC4899",
  category: "tmdb",
  generateUrl: (p) => {
    if (!p.tmdbId) return "";
    return `https://www.superembed.stream/play/${p.tmdbId}`;
  },
};

// ============================================================
// Hindi-specific TMDB server — ScreenScape Hindi
// ============================================================

const screenscapeHindi: EmbedServer = {
  id: "screenscape-hindi",
  name: "ScreenScape Hindi",
  priority: 1,
  supportsSub: false,
  supportsDub: false,
  supportsHindi: true,
  idType: "tmdb",
  color: "#FF6B35",
  category: "hindi",
  generateUrl: (p) => {
    if (!p.tmdbId) return "";
    if (p.season && p.season > 0) {
      return `https://screenscape.me/embed?tmdb=${p.tmdbId}&type=tv&season=${p.season}&episode=${p.episode}&lan=hindi`;
    }
    return `https://screenscape.me/embed?tmdb=${p.tmdbId}&type=movie&lan=hindi`;
  },
};

// ============================================================
// ALL SERVERS — raw definitions
// ============================================================

const ALL_SERVERS: EmbedServer[] = [
  // AniList-based anime servers (iframe embeds) — Servers 1-7
  vidnestAnime, vidnestAnimepahe, videasyAnime, vidplusAnime,
  tryembedAnime, megaplayAniSub, megaplayAniDub,
  // Megaplay/Miruro servers — Servers 11-14
  megaplayMalSub, megaplayMalDub, megaplayAniSub2, megaplayAniDub2,
  // Hindi servers (anilist-based)
  anixtvHindi,
  // Hindi servers (tmdb-based)
  screenscapeHindi,
  // TMDB-based Movie/TV servers (existing)
  vidcore, vidplays, vidfast, vidnestTv, videasyTv,
  vidplus, peachify, embedmaster, vidlink, vidsrcme,
  // TMDB-based Movie/TV servers (new)
  screenscape, vidrock, vidzen, vidapi, vidbinge,
  twoembed, vidsrcto, vidsrcio, dropfile, superembed,
];

/**
 * Get servers available for Anime content (SUB/DUB)
 * Includes: anilist-based servers only (iframe embeds + megaplay)
 * Excludes: Hindi-specific servers and TMDB-based servers
 * Megaplay servers 11-14 are included for SUB/DUB
 */
export function getAnimeServers(): EmbedServer[] {
  const servers = ALL_SERVERS.filter(s =>
    s.idType === "anilist" && s.category !== "hindi"
  );
  // Keep the pre-assigned names (Server 1-7 and Server 11-14)
  return servers;
}

/**
 * Get servers available for Hindi Dub
 * Includes both AniList-based and TMDB-based Hindi servers
 */
export function getHindiServers(): EmbedServer[] {
  const servers = ALL_SERVERS.filter(s => s.category === "hindi");
  return servers.map((s, i) => ({
    ...s,
    priority: i,
  }));
}

/**
 * Get servers available for Movie/TV content
 * Includes: TMDB-based servers only
 * Uses descriptive names: VidCore, VidPlays, VidFast, etc.
 */
export function getTmdbServers(): EmbedServer[] {
  const servers = ALL_SERVERS.filter(s => s.idType === "tmdb" && s.category !== "hindi");
  return servers.map((s, i) => ({
    ...s,
    priority: i,
  }));
}

/**
 * Get servers that support multiple languages
 * These servers accept a language parameter for different audio/subtitle tracks
 * Includes: DropFile, VidAPI, ScreenScape
 */
export function getMultiLangServers(): EmbedServer[] {
  const multiLangIds = ["dropfile", "vidapi", "screenscape"];
  return ALL_SERVERS.filter(s => multiLangIds.includes(s.id));
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
 * Check if any Hindi Dub server is available for the given AniList ID or TMDB ID
 */
export function hasHindiSupport(anilistId?: number, tmdbId?: number): boolean {
  const hindiServers = getHindiServers();
  if (hindiServers.length === 0) return false;
  // Check if any Hindi server supports the provided ID type
  return hindiServers.some(s => {
    if (s.idType === "anilist" && anilistId) return true;
    if (s.idType === "tmdb" && tmdbId) return true;
    return false;
  });
}

/**
 * Get the SuperEmbed API URL for fetching multiple embed sources
 * Returns the API endpoint that can be called to get a list of embed links
 */
export function getSuperEmbedApiUrl(tmdbId: number): string {
  return `https://seapi.link/?type=tmdb&id=${tmdbId}&max_results=3`;
}

/**
 * Get VidZen anime URL (for anime content with TMDB ID)
 */
export function getVidZenAnimeUrl(tmdbId: number, season: number, episode: number): string {
  return `https://vidzen.fun/anime/${tmdbId}/${season}/${episode}`;
}
