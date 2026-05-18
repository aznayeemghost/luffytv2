"use client";

import { useState, useEffect, useCallback } from "react";
import { useAppStore, getAnimeTitle, getAnimeImage } from "./store";
import type { AnimeItem } from "./store";
import type { MiruroAnimeResult } from "@/lib/miruro-api";
import type { MegaPlayInfoResult, MegaPlayEpisodeItem } from "@/lib/megaplay-api";
import type { AniListMedia } from "@/lib/anilist-api";

interface AnimeDetailProps {
  animeId: string;
}

interface EpisodeData {
  episodeIdNum: number;
  notes?: string | null;
  thumbnails?: string[];
  title?: string | null;
  thumbnail?: string | null;
  source?: string;
  subSlug?: string;
  dubSlug?: string | null;
  anitakuSlug?: string | null;
}

interface MiruroEpData {
  sub: Array<{ number: number; slug: string; title?: string; thumbnail?: string }>;
  dub: Array<{ number: number; slug: string; title?: string; thumbnail?: string }>;
}

interface TMDBData {
  id: number;
  name?: string;
  overview?: string;
  poster_path?: string;
  backdrop_path?: string;
  vote_average?: number;
  vote_count?: number;
  genres?: Array<{ id: number; name: string }>;
  number_of_seasons?: number;
  number_of_episodes?: number;
  seasons?: Array<{
    id: number; name: string; season_number: number;
    episode_count: number; poster_path?: string; air_date?: string;
  }>;
  networks?: Array<{ id: number; name: string; logo_path?: string }>;
  credits?: {
    cast: Array<{ id: number; name: string; character?: string; profile_path?: string }>;
  };
  videos?: {
    results: Array<{ id: string; key: string; name: string; site: string; type: string }>;
  };
  similar?: { results: Array<any> };
  recommendations?: { results: Array<any> };
  posterUrl?: string;
  backdropUrl?: string;
}

interface AniListCharacter {
  id: number;
  name: { full: string; native?: string };
  image?: { large?: string; medium?: string };
  role: string;
  voiceActors?: Array<{
    id: number;
    name: { full: string; native?: string };
    image?: { large?: string; medium?: string };
    language: string;
  }>;
}

interface AniListStaff {
  id: number;
  name: { full: string; native?: string };
  image?: { large?: string; medium?: string };
  role: string;
}

interface AniListRecommendation {
  id: number;
  title: { romaji?: string; english?: string; native?: string };
  coverImage: { extraLarge?: string; large?: string; medium?: string };
  type?: string;
  episodes?: number;
  averageScore?: number;
  status?: string;
  rating?: number;
}

interface AniListRelation {
  relationType: string;
  id: number;
  title: { romaji?: string; english?: string; native?: string };
  coverImage: { extraLarge?: string; large?: string; medium?: string };
  type?: string;
  format?: string;
  episodes?: number;
  status?: string;
}

interface AniListStudio {
  id: number;
  name: string;
  isAnimationStudio: boolean;
}

// ── Star Rating Component ──
function StarRating({ rating, maxStars = 5 }: { rating: number; maxStars?: number }) {
  const normalizedRating = rating > 10 ? rating / 10 : rating;
  const filledStars = Math.round(normalizedRating / 2);
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: maxStars }, (_, i) => (
        <svg
          key={i}
          className={`w-5 h-5 ${i < filledStars ? "text-amber-400" : "text-zinc-600"}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      <span className="ml-1 text-sm font-semibold text-zinc-300">{normalizedRating.toFixed(1)}</span>
    </div>
  );
}

export default function AnimeDetailPage({ animeId }: AnimeDetailProps) {
  const navigate = useAppStore(s => s.navigate);
  const bookmarks = useAppStore(s => s.bookmarks);
  const setBookmarks = useAppStore(s => s.setBookmarks);

  const [anime, setAnime] = useState<AnimeItem | null>(null);
  const [miruroInfo, setMiruroInfo] = useState<MiruroAnimeResult | null>(null);
  const [anilistMedia, setAnilistMedia] = useState<AniListMedia | null>(null);
  const [episodes, setEpisodes] = useState<EpisodeData[]>([]);
  const [miruroEps, setMiruroEps] = useState<MiruroEpData>({ sub: [], dub: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"sub" | "dub">("sub");
  const [totalEpisodes, setTotalEpisodes] = useState<number | null>(null);
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [showAllCast, setShowAllCast] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);

  // TMDB data
  const [tmdbData, setTmdbData] = useState<TMDBData | null>(null);
  const [tmdbId, setTmdbId] = useState<number | null>(null);
  const [anilistId, setAnilistId] = useState<number | null>(null);

  // AniList voice cast / characters
  const [anilistCharacters, setAnilistCharacters] = useState<AniListCharacter[]>([]);
  const [anilistStaff, setAnilistStaff] = useState<AniListStaff[]>([]);
  const [anilistRecommendations, setAnilistRecommendations] = useState<AniListRecommendation[]>([]);
  const [anilistRelations, setAnilistRelations] = useState<AniListRelation[]>([]);
  const [anilistStudios, setAnilistStudios] = useState<AniListStudio[]>([]);
  const [anilistTrailer, setAnilistTrailer] = useState<{ id: string; site: string; thumbnail: string } | null>(null);
  const [anilistDetailLoading, setAnilistDetailLoading] = useState(false);

  // MegaPlay info
  const [megaplayInfo, setMegaplayInfo] = useState<MegaPlayInfoResult | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const cleanId = animeId.replace(/^miruro_/, "");
        const isNumeric = /^\d+$/.test(cleanId);
        if (isNumeric) setAnilistId(parseInt(cleanId));

        const [infoRes, epRes] = await Promise.all([
          fetch(`/api/anime/info?id=${encodeURIComponent(animeId)}`),
          fetch(`/api/anime/episodes?id=${encodeURIComponent(animeId)}`),
        ]);

        // Also fetch MegaPlay info if we have a numeric AniList ID
        if (isNumeric) {
          fetch(`/api/megaplay/info?id=${cleanId}`)
            .then(r => r.ok ? r.json() : null)
            .then(data => {
              if (data?.success && data.results) {
                setMegaplayInfo(data.results);
              }
            })
            .catch(() => {});
        }

        if (infoRes.ok) {
          const data = await infoRes.json();
          setAnime(data.anime);
          setMiruroInfo(data.miruroInfo);
          if (data.tmdbData) setTmdbData(data.tmdbData);
          if (data.tmdbId) setTmdbId(data.tmdbId);
          if (data.totalEpisodes != null && data.totalEpisodes > 0) {
            setTotalEpisodes(data.totalEpisodes);
          }
        }

        if (epRes.ok) {
          const epData = await epRes.json();
          setEpisodes(epData.episodes || []);
          setMiruroEps(epData.miruroEpisodes || { sub: [], dub: [] });
          const epTotal = epData.totalEpisodes ?? epData.episodes?.length ?? null;
          if (epTotal != null && epTotal > 0) {
            setTotalEpisodes(epTotal);
          }
          if (!tmdbId && epData.zenshinMappings?.themoviedb_id) setTmdbId(epData.zenshinMappings.themoviedb_id);
        }

      } catch { /* ignore */ }
      setLoading(false);
    }
    load();
  }, [animeId]);

  // Fetch AniList characters & voice actors
  useEffect(() => {
    if (!anilistId) return;
    async function loadAnilistDetail() {
      setAnilistDetailLoading(true);
      try {
        const res = await fetch(`/api/anime/anilist-detail?id=${anilistId}`);
        if (res.ok) {
          const data = await res.json();
          setAnilistCharacters(data.characters || []);
          setAnilistStaff(data.staff || []);
          if (data.recommendations) setAnilistRecommendations(data.recommendations);
          if (data.relations) setAnilistRelations(data.relations);
          if (data.studios) setAnilistStudios(data.studios);
          if (data.trailer) setAnilistTrailer(data.trailer);
          if (data.details) {
            setAnilistMedia(data.details);
            if (!totalEpisodes && data.details.episodes) {
              setTotalEpisodes(data.details.episodes);
            }
          }
        }
      } catch { /* ignore */ }
      setAnilistDetailLoading(false);
    }
    loadAnilistDetail();
  }, [anilistId]);

  if (loading) {
    return (
      <div className="fade-in">
        <div className="min-h-[70vh] -mt-[75px] skeleton" />
        <div className="max-w-[1400px] mx-auto px-4 lg:px-8 -mt-20 relative z-10">
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="w-[220px] aspect-[2/3] skeleton rounded-xl shrink-0" />
            <div className="flex-1 space-y-4">
              <div className="h-10 w-3/4 skeleton rounded" />
              <div className="h-5 w-1/2 skeleton rounded" />
              <div className="h-24 skeleton rounded" />
              <div className="flex gap-3">
                <div className="h-10 w-32 skeleton rounded-full" />
                <div className="h-10 w-32 skeleton rounded-full" />
                <div className="h-10 w-32 skeleton rounded-full" />
              </div>
            </div>
            <div className="w-[280px] space-y-3 shrink-0 hidden lg:block">
              <div className="h-6 w-32 skeleton rounded" />
              {Array.from({ length: 5 }, (_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full skeleton" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3 w-24 skeleton rounded" />
                    <div className="h-2 w-16 skeleton rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Merge info from all sources
  const anilistTitle = miruroInfo?.title?.english || miruroInfo?.title?.romaji || "";
  const anilistTitleRomaji = miruroInfo?.title?.romaji || "";
  const anilistTitleNative = miruroInfo?.title?.native || "";
  const tmdbTitle = tmdbData?.name || "";
  const allanimeTitle = anime ? (anime.englishName || anime.name) : "";

  const displayTitle = anilistTitle || tmdbTitle || allanimeTitle || "Unknown";
  const image = miruroInfo?.coverImage?.extraLarge || miruroInfo?.coverImage?.large || tmdbData?.posterUrl || anime?.thumbnail || "";
  const banner = miruroInfo?.bannerImage || tmdbData?.backdropUrl || image;

  const anilistDesc = miruroInfo?.description?.replace(/<[^>]*>/g, "") || "";
  const tmdbDesc = tmdbData?.overview || "";
  const allanimeDesc = anime?.description || "";
  const description = anilistDesc || tmdbDesc || allanimeDesc;

  const anilistScore = miruroInfo?.averageScore
    ? (miruroInfo.averageScore > 10 ? miruroInfo.averageScore / 10 : miruroInfo.averageScore)
    : null;
  const tmdbScore = tmdbData?.vote_average ?? null;
  const allanimeScore = anime?.score || null;
  const bestScore = anilistScore || tmdbScore || allanimeScore;

  const anilistGenres: string[] = miruroInfo?.genres || anime?.genres || [];
  const tmdbGenres: string[] = tmdbData?.genres?.map(g => g.name) || [];
  const allGenres = [...new Set([...anilistGenres, ...tmdbGenres])];

  const status = miruroInfo?.status || anime?.status || "";
  const type = miruroInfo?.format || miruroInfo?.type || anime?.type || "";
  const season = miruroInfo?.season && miruroInfo?.seasonYear ? `${miruroInfo.season} ${miruroInfo.seasonYear}` : anime?.season || "";
  const episodesCount = totalEpisodes || miruroInfo?.episodes || (anime as any)?.episodeCount || tmdbData?.number_of_episodes || null;
  const tmdbCast = tmdbData?.credits?.cast || [];
  const tmdbTrailers = tmdbData?.videos?.results?.filter(v => v.site === "YouTube" && (v.type === "Trailer" || v.type === "Opening")) || [];

  const hasMiruroEps = miruroEps.sub.length > 0 || miruroEps.dub.length > 0;
  const hasMegaplayEps = megaplayInfo?.episodes?.list?.length > 0;
  const currentEps = hasMiruroEps
    ? (activeTab === "dub" && miruroEps.dub.length > 0 ? miruroEps.dub : miruroEps.sub)
    : episodes;

  // MegaPlay episode info map (episode_no → { hasSub, hasDub })
  const megaplayEpMap = new Map<number, { hasSub: boolean; hasDub: boolean }>();
  if (hasMegaplayEps) {
    for (const ep of megaplayInfo!.episodes.list) {
      megaplayEpMap.set(ep.episode_no, { hasSub: ep.hasSub, hasDub: ep.hasDub });
    }
  }

  const handleWatch = (episodeNum: number) => {
    navigate({ page: "watch", id: animeId, episode: episodeNum, title: displayTitle, image });
  };

  const bookmarked = bookmarks.some(b => b.animeId === animeId);
  const toggleBookmark = () => {
    if (bookmarked) {
      setBookmarks(bookmarks.filter(b => b.animeId !== animeId));
    } else {
      setBookmarks([...bookmarks, { id: animeId, animeId, animeName: displayTitle, thumbnail: image, score: anilistScore || tmdbScore || 0, type: type || "TV", status: "", createdAt: new Date().toISOString() }]);
    }
  };

  const hasAnyEpisodes = episodes.length > 0 || hasMiruroEps || hasMegaplayEps || (episodesCount != null && episodesCount > 0);

  // Next airing episode countdown from MegaPlay
  const nextAiring = megaplayInfo?.nextAiringEpisode;
  const nextAiringCountdown = nextAiring ? (() => {
    const now = Math.floor(Date.now() / 1000);
    const diff = nextAiring.airingAt - now;
    if (diff <= 0) return "Airing now";
    const days = Math.floor(diff / 86400);
    const hours = Math.floor((diff % 86400) / 3600);
    if (days > 0) return `${days}d ${hours}h until EP ${nextAiring.episode}`;
    const mins = Math.floor((diff % 3600) / 60);
    return `${hours}h ${mins}m until EP ${nextAiring.episode}`;
  })() : null;

  // Combine TMDB cast + AniList characters for the sidebar
  const allCast = [
    ...tmdbCast.map(c => ({
      id: `tmdb-${c.id}`,
      name: c.name,
      role: c.character || "",
      image: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : "",
    })),
    ...anilistCharacters.filter(c => c.role === "MAIN" || c.role === "SUPPORTING").map(c => ({
      id: `al-${c.id}`,
      name: c.name.full,
      role: c.role === "MAIN" ? "Main" : "Supporting",
      image: c.image?.large || c.image?.medium || "",
    })),
  ];
  const visibleCast = showAllCast ? allCast : allCast.slice(0, 8);

  // Get the YouTube trailer key
  const trailerKey = anilistTrailer?.site === "youtube"
    ? anilistTrailer.id
    : tmdbTrailers[0]?.key || null;

  return (
    <div className="fade-in">
      {/* ═══════════════════════════════════════════════
          HERO SECTION — Full-width backdrop
          ═══════════════════════════════════════════════ */}
      <div className="relative min-h-[75vh] -mt-[75px] overflow-hidden">
        {banner && (
          <img src={banner} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ animation: 'kenBurns 12s ease-out forwards' }} key={`banner-${animeId}`} />
        )}
        {/* Multi-layer gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#000000] via-[#000000]/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#000000] via-transparent to-[#000000]/30" />
        <div className="absolute inset-0 hero-gradient" />

        {/* Content inside hero */}
        <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-12">
          <div className="max-w-[1400px] mx-auto">
            {/* Title area */}
            <div className="stagger-reveal stagger-1 flex items-center gap-3 flex-wrap mb-3">
              {type && (
                <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider bg-purple-500/15 text-purple-300 rounded-full border border-purple-500/20">
                  {type}
                </span>
              )}
              {status && (
                <span className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border ${
                  status === "RELEASING" ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/20" :
                  status === "FINISHED" ? "bg-blue-500/15 text-blue-300 border-blue-500/20" :
                  "bg-zinc-500/15 text-zinc-300 border-zinc-500/20"
                }`}>
                  {status === "RELEASING" ? "Airing" : status === "FINISHED" ? "Completed" : status}
                </span>
              )}
              {season && (
                <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider bg-violet-500/15 text-violet-300 rounded-full border border-violet-500/20">
                  {season}
                </span>
              )}
              {episodesCount && (
                <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-300 rounded-full border border-amber-500/20">
                  {episodesCount} Episodes
                </span>
              )}
            </div>

            <h1 className="stagger-reveal stagger-2 text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-tight mb-2">{displayTitle}</h1>

            {anilistTitleRomaji && anilistTitleRomaji !== displayTitle && (
              <p className="stagger-reveal stagger-2 text-base text-zinc-400 line-clamp-1 mb-1">{anilistTitleRomaji}</p>
            )}
            {anilistTitleNative && (
              <p className="stagger-reveal stagger-2 text-sm text-zinc-500 line-clamp-1">{anilistTitleNative}</p>
            )}

            {/* Rating stars */}
            {bestScore && (
              <div className="stagger-reveal stagger-3 mt-4">
                <StarRating rating={bestScore} />
              </div>
            )}

            {/* Action buttons */}
            <div className="stagger-reveal stagger-4 flex items-center gap-3 mt-5">
              <button onClick={() => handleWatch(1)} className="pill-btn pill-btn-primary text-sm">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                Play EP.1
              </button>
              {/* Next airing countdown */}
              {nextAiringCountdown && (
                <div className="pill-btn text-sm bg-amber-500/15 text-amber-300 border border-amber-500/25 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                  {nextAiringCountdown}
                </div>
              )}
              <button
                onClick={toggleBookmark}
                className={`pill-btn text-sm ${bookmarked ? "bg-purple-500/15 text-purple-300 border border-purple-500/25" : "pill-btn-ghost"}`}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill={bookmarked ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2}>
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                </svg>
                {bookmarked ? "Watchlist" : "Watchlist"}
              </button>
              <button className="pill-btn pill-btn-ghost text-sm">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                Favorite
              </button>
              <button className="pill-btn pill-btn-ghost text-sm">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Share
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          MAIN CONTENT — 3-column layout below hero
          ═══════════════════════════════════════════════ */}
      <div className="max-w-[1400px] mx-auto px-4 lg:px-8 -mt-16 relative z-10">
        <div className="flex flex-col lg:flex-row gap-8">

          {/* ── LEFT COLUMN: Poster + Quick Info ── */}
          <div className="shrink-0 w-full lg:w-[240px]">
            <div className="relative">
              {image && (
                <img
                  src={image}
                  alt={displayTitle}
                  className="w-[200px] lg:w-[240px] rounded-xl shadow-2xl shadow-black/60 border border-white/[0.08]"
                />
              )}
              {/* Score badge on poster */}
              {bestScore && (
                <div className="absolute -top-3 -right-3 w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30 border-2 border-emerald-400/50">
                  <span className="text-white text-sm font-black">{bestScore.toFixed(1)}</span>
                </div>
              )}
            </div>

            {/* Quick info below poster */}
            <div className="mt-4 space-y-2">
              {type && (
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <svg className="w-4 h-4 text-purple-400/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" /></svg>
                  <span className="text-zinc-300 font-medium">{type}</span>
                </div>
              )}
              {episodesCount && (
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <svg className="w-4 h-4 text-purple-400/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <span className="text-zinc-300 font-medium">{episodesCount} Episodes</span>
                </div>
              )}
              {season && (
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <svg className="w-4 h-4 text-purple-400/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  <span className="text-zinc-300 font-medium">{season}</span>
                </div>
              )}
              {status && (
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <svg className="w-4 h-4 text-purple-400/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  <span className="text-zinc-300 font-medium">{status === "RELEASING" ? "Currently Airing" : status === "FINISHED" ? "Finished" : status}</span>
                </div>
              )}

              {/* Studios */}
              {anilistStudios.length > 0 && (
                <div className="pt-3 border-t border-white/[0.06] mt-3">
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mb-2">Studios</p>
                  {anilistStudios.map(s => (
                    <span key={s.id} className="block text-xs text-zinc-300 font-medium">
                      {s.name} {s.isAnimationStudio && <span className="text-purple-400 text-[8px]">★</span>}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── CENTER COLUMN: Main content ── */}
          <div className="flex-1 min-w-0 space-y-8">

            {/* Where to Watch / Streaming */}
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Where to Watch</span>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.04] rounded-lg border border-white/[0.06]">
                  <svg className="w-4 h-4 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /></svg>
                  <span className="text-[10px] font-bold text-zinc-300">AniList</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.04] rounded-lg border border-white/[0.06]">
                  <svg className="w-4 h-4 text-emerald-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth={1.5} fill="none" /></svg>
                  <span className="text-[10px] font-bold text-zinc-300">TMDB</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.04] rounded-lg border border-white/[0.06]">
                  <svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                  <span className="text-[10px] font-bold text-zinc-300">Sub & Dub</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.04] rounded-lg border border-white/[0.06]">
                  <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><polygon points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>
                  <span className="text-[10px] font-bold text-zinc-300">MegaPlay</span>
                </div>
              </div>
            </div>

            {/* Genres */}
            {allGenres.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {allGenres.slice(0, 10).map(g => (
                  <button
                    key={g}
                    onClick={() => navigate({ page: "genre", genre: g })}
                    className="px-4 py-1.5 text-xs font-semibold bg-white/[0.05] text-zinc-300 rounded-full border border-white/[0.08] hover:bg-purple-500/10 hover:text-purple-300 hover:border-purple-500/20 transition-all"
                  >
                    {g}
                  </button>
                ))}
              </div>
            )}

            {/* Overview / Synopsis */}
            {description && (
              <div>
                <h3 className="text-lg font-bold text-white mb-2">Overview</h3>
                <p className={`text-sm text-zinc-400 leading-relaxed ${!showFullDesc ? "line-clamp-4" : ""}`}>
                  {description}
                </p>
                {description.length > 200 && (
                  <button
                    onClick={() => setShowFullDesc(!showFullDesc)}
                    className="mt-2 text-xs font-semibold text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    {showFullDesc ? "Show Less" : "Read More"}
                  </button>
                )}
              </div>
            )}

            {/* Trailer / Media Preview */}
            {trailerKey && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-bold text-white">Media</h3>
                  <button
                    onClick={() => setShowTrailer(!showTrailer)}
                    className="text-xs font-semibold text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {showTrailer ? "Hide Trailer" : "Play Trailer"}
                  </button>
                </div>
                {showTrailer && (
                  <div className="relative w-full aspect-video max-w-2xl rounded-xl overflow-hidden border border-white/[0.06] shadow-xl shadow-black/30">
                    <iframe
                      src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&mute=1&modestbranding=1`}
                      className="w-full h-full"
                      allowFullScreen
                      allow="autoplay; encrypted-media"
                      title="Trailer"
                    />
                  </div>
                )}
                {!showTrailer && (
                  <div
                    className="relative w-full max-w-2xl aspect-video rounded-xl overflow-hidden border border-white/[0.06] cursor-pointer group"
                    onClick={() => setShowTrailer(true)}
                  >
                    <img
                      src={anilistTrailer?.thumbnail || `https://img.youtube.com/vi/${trailerKey}/maxresdefault.jpg`}
                      alt="Trailer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/50 transition-colors">
                      <div className="w-16 h-16 rounded-full bg-purple-500/90 flex items-center justify-center shadow-lg shadow-purple-500/30 group-hover:scale-110 transition-transform">
                        <svg className="w-7 h-7 text-white ml-1" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Characters Grid */}
            {anilistCharacters.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-white mb-4">Characters</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {anilistCharacters.filter(c => c.role === "MAIN" || c.role === "SUPPORTING").slice(0, 12).map(c => {
                    const va = c.voiceActors?.[0];
                    return (
                      <div
                        key={c.id}
                        className="bg-[#0a0a0a] rounded-xl border border-white/[0.04] overflow-hidden hover:border-purple-500/20 transition-all group"
                      >
                        <div className="flex items-center gap-3 p-3">
                          {/* Character image */}
                          <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 border-2 border-purple-500/20 bg-[#1a1a1a]">
                            {c.image?.large || c.image?.medium ? (
                              <img src={c.image.large || c.image.medium} alt={c.name.full} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-sm text-zinc-600 font-semibold">{c.name.full.charAt(0)}</div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-zinc-200 line-clamp-1 group-hover:text-purple-300 transition-colors">{c.name.full}</p>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                              c.role === "MAIN" ? "bg-purple-500/15 text-purple-300" : "bg-white/[0.05] text-zinc-500"
                            }`}>{c.role}</span>
                          </div>
                        </div>
                        {/* Voice actor if available */}
                        {va && (
                          <div className="flex items-center gap-3 px-3 py-2 border-t border-white/[0.04] bg-white/[0.01]">
                            <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-violet-500/20 bg-[#1a1a1a]">
                              {va.image?.large || va.image?.medium ? (
                                <img src={va.image.large || va.image.medium} alt={va.name.full} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[8px] text-zinc-600 font-semibold">{va.name.full.charAt(0)}</div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] text-violet-300 font-medium line-clamp-1">{va.name.full}</p>
                              <p className="text-[8px] text-zinc-600">CV</p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Episodes Section */}
            {(episodes.length > 0 || hasMiruroEps) && (
              <div>
                <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white">Episodes</h3>
                    {episodesCount && <span className="text-xs text-zinc-500">({episodesCount} total)</span>}
                  </div>
                  {hasMiruroEps && miruroEps.dub.length > 0 && (
                    <div className="flex items-center gap-1 bg-[#1a1a1a] rounded-full p-0.5 border border-white/[0.06]">
                      {(["sub", "dub"] as const).map(tab => (
                        <button
                          key={tab}
                          onClick={() => setActiveTab(tab)}
                          className={`px-4 py-1.5 text-[11px] font-bold rounded-full transition-all ${
                            activeTab === tab ? "bg-purple-500/15 text-purple-300" : "text-zinc-500 hover:text-zinc-300"
                          }`}
                        >
                          {tab.toUpperCase()} ({tab === "sub" ? miruroEps.sub.length : miruroEps.dub.length})
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {hasMiruroEps
                    ? currentEps.map((ep) => {
                        const epThumbnail = ep.thumbnail || null;
                        const epTitle = ep.title || null;
                        return (
                          <button
                            key={`miruro-${ep.number}`}
                            onClick={() => handleWatch(ep.number)}
                            className="flex items-center gap-3 p-2.5 bg-[#111111] rounded-lg border border-white/[0.03] hover:bg-white/[0.04] hover:border-purple-500/20 transition-all group text-left"
                          >
                            <div className="w-24 h-14 rounded-md overflow-hidden shrink-0 bg-[#1a1a1a] relative">
                              {epThumbnail ? (
                                <img src={epThumbnail} alt="" className="w-full h-full object-cover" loading="lazy" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500/10 to-transparent">
                                  <span className="text-sm font-bold text-purple-400">{ep.number}</span>
                                </div>
                              )}
                              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <svg className="w-5 h-5 text-purple-400" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-zinc-300 line-clamp-1 group-hover:text-purple-300 transition-colors">
                                EP {ep.number}
                              </p>
                              {epTitle && <p className="text-[10px] text-zinc-500 line-clamp-1">{epTitle}</p>}
                              {/* Sub/Dub indicators from MegaPlay */}
                              {megaplayEpMap.has(ep.number) && (
                                <div className="flex gap-1 mt-1">
                                  {megaplayEpMap.get(ep.number)!.hasSub && (
                                    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400">SUB</span>
                                  )}
                                  {megaplayEpMap.get(ep.number)!.hasDub && (
                                    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400">DUB</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      })
                    : episodes.map((ep) => {
                        const epThumbnail = ep.thumbnail || ep.thumbnails?.[0] || null;
                        const epTitle = ep.title || ep.notes || null;
                        return (
                          <button
                            key={`aa-${ep.episodeIdNum}`}
                            onClick={() => handleWatch(ep.episodeIdNum)}
                            className="flex items-center gap-3 p-2.5 bg-[#111111] rounded-lg border border-white/[0.03] hover:bg-white/[0.04] hover:border-purple-500/20 transition-all group text-left"
                          >
                            <div className="w-24 h-14 rounded-md overflow-hidden shrink-0 bg-[#1a1a1a] relative">
                              {epThumbnail ? (
                                <img src={epThumbnail} alt="" className="w-full h-full object-cover" loading="lazy" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500/10 to-transparent">
                                  <span className="text-sm font-bold text-purple-400">{ep.episodeIdNum}</span>
                                </div>
                              )}
                              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <svg className="w-5 h-5 text-purple-400" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-zinc-300 line-clamp-1 group-hover:text-purple-300 transition-colors">
                                EP {ep.episodeIdNum}
                              </p>
                              {epTitle && <p className="text-[10px] text-zinc-500 line-clamp-1">{epTitle}</p>}
                            </div>
                          </button>
                        );
                      })
                  }
                </div>
              </div>
            )}

            {/* Fallback numbered episodes */}
            {!episodes.length && !hasMiruroEps && episodesCount && episodesCount > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-lg font-bold text-white">Episodes</h3>
                  <span className="text-xs text-zinc-500">({episodesCount} total)</span>
                </div>
                <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2">
                  {Array.from({ length: Math.min(episodesCount, 50) }, (_, i) => i + 1).map(num => (
                    <button
                      key={`gen-${num}`}
                      onClick={() => handleWatch(num)}
                      className="server-pill justify-center text-[11px] font-semibold py-2.5 px-2 hover:bg-purple-500/10 hover:border-purple-500/20 hover:text-purple-300 transition-all"
                    >
                      {num}
                    </button>
                  ))}
                </div>
                {episodesCount > 50 && (
                  <p className="text-xs text-zinc-500 text-center mt-3">Showing first 50 of {episodesCount} episodes</p>
                )}
              </div>
            )}

            {/* No episodes */}
            {!hasAnyEpisodes && !loading && (
              <div className="text-center py-12 bg-[#0a0a0a] rounded-xl border border-white/[0.04]">
                <svg className="w-12 h-12 text-zinc-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707A1 1 0 0112 5.586v12.828a1 1 0 01-1.707.707L5.586 15z" />
                </svg>
                <p className="text-zinc-500 text-sm">No episodes available yet</p>
                <p className="text-zinc-600 text-xs mt-1">Try checking back later</p>
              </div>
            )}

            {/* Staff */}
            {anilistStaff.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-white mb-4">Staff</h3>
                <div className="flex gap-4 overflow-x-auto scroll-container pb-2">
                  {anilistStaff.slice(0, 12).map(s => (
                    <div key={s.id} className="shrink-0 text-center w-[90px]">
                      <div className="w-[70px] h-[70px] rounded-full overflow-hidden mx-auto mb-2 border-2 border-white/[0.06] bg-[#1a1a1a]">
                        {s.image?.large || s.image?.medium ? (
                          <img src={s.image.large || s.image.medium} alt={s.name.full} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-sm text-zinc-600 font-semibold">{s.name.full.charAt(0)}</div>
                        )}
                      </div>
                      <p className="text-[10px] text-zinc-300 font-medium line-clamp-1">{s.name.full}</p>
                      {s.role && <p className="text-[8px] text-zinc-500 line-clamp-1">{s.role}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {anilistRecommendations.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-white mb-4">Recommendations</h3>
                <div className="flex gap-3 overflow-x-auto scroll-container pb-2">
                  {anilistRecommendations.slice(0, 12).map(r => {
                    const rTitle = r.title.english || r.title.romaji || r.title.native || "Unknown";
                    const rImg = r.coverImage?.extraLarge || r.coverImage?.large || r.coverImage?.medium || "";
                    return (
                      <button
                        key={r.id}
                        onClick={() => navigate({ page: "anime", id: String(r.id) })}
                        className="shrink-0 w-[120px] group text-left"
                      >
                        <div className="w-[120px] aspect-[3/4] rounded-lg overflow-hidden border border-white/[0.04] bg-[#1a1a1a] mb-1.5">
                          {rImg ? (
                            <img src={rImg} alt={rTitle} className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs text-zinc-600">{rTitle.charAt(0)}</div>
                          )}
                        </div>
                        <p className="text-[10px] text-zinc-300 font-medium line-clamp-2 group-hover:text-purple-300 transition-colors">{rTitle}</p>
                        {r.averageScore && (
                          <span className="text-[9px] text-emerald-400 font-semibold">{(r.averageScore > 10 ? r.averageScore / 10 : r.averageScore).toFixed(1)} ★</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Related Anime */}
            {anilistRelations.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-white mb-4">Related</h3>
                <div className="space-y-2">
                  {anilistRelations.slice(0, 8).map(r => {
                    const rTitle = r.title.english || r.title.romaji || r.title.native || "Unknown";
                    const rImg = r.coverImage?.extraLarge || r.coverImage?.large || r.coverImage?.medium || "";
                    return (
                      <button
                        key={r.id}
                        onClick={() => navigate({ page: "anime", id: String(r.id) })}
                        className="flex items-center gap-3 w-full p-3 bg-[#111111] rounded-xl border border-white/[0.03] hover:bg-white/[0.04] hover:border-purple-500/20 transition-all group text-left"
                      >
                        <div className="w-14 h-20 rounded-lg overflow-hidden shrink-0 bg-[#1a1a1a]">
                          {rImg ? (
                            <img src={rImg} alt={rTitle} className="w-full h-full object-cover" loading="lazy" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[8px] text-zinc-600">{rTitle.charAt(0)}</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-zinc-300 line-clamp-1 group-hover:text-purple-300 transition-colors">{rTitle}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 font-bold">{r.relationType?.replace(/_/g, " ")}</span>
                            {r.format && <span className="text-[10px] text-zinc-500">{r.format}</span>}
                            {r.episodes && <span className="text-[10px] text-zinc-500">{r.episodes} EP</span>}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT COLUMN: Cast & Credits sidebar ── */}
          {allCast.length > 0 && (
            <div className="shrink-0 w-full lg:w-[280px]">
              <div className="bg-[#0a0a0a] rounded-xl border border-white/[0.06] p-5 sticky top-24">
                <h3 className="text-base font-bold text-white mb-4">Casts & Credits</h3>
                <div className="space-y-3">
                  {visibleCast.map(c => (
                    <div key={c.id} className="flex items-center gap-3 group">
                      <div className="w-11 h-11 rounded-full overflow-hidden shrink-0 border-2 border-white/[0.06] bg-[#1a1a1a]">
                        {c.image ? (
                          <img src={c.image} alt={c.name} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-sm text-zinc-600 font-semibold">{c.name.charAt(0)}</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-zinc-200 line-clamp-1 group-hover:text-purple-300 transition-colors">{c.name}</p>
                        {c.role && <p className="text-[10px] text-zinc-500 line-clamp-1">{c.role}</p>}
                      </div>
                    </div>
                  ))}
                </div>
                {allCast.length > 8 && (
                  <button
                    onClick={() => setShowAllCast(!showAllCast)}
                    className="mt-4 w-full flex items-center justify-center gap-1 text-xs font-semibold text-purple-400 hover:text-purple-300 transition-colors py-2 rounded-lg hover:bg-purple-500/5"
                  >
                    {showAllCast ? "Show Less" : `Show All (${allCast.length})`}
                    <svg className={`w-3.5 h-3.5 transition-transform ${showAllCast ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
