"use client";

import { useState, useEffect } from "react";
import { useAppStore, getAnimeTitle, getAnimeImage } from "./store";
import type { AnimeItem } from "./store";
import type { MiruroAnimeResult } from "@/lib/miruro-api";
import type { AniListMedia } from "@/lib/anilist-api";
import CommentSection from "./comment-section";

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

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        // Load info + episodes in parallel
        const [infoRes, epRes] = await Promise.all([
          fetch(`/api/anime/info?id=${encodeURIComponent(animeId)}`),
          fetch(`/api/anime/episodes?id=${encodeURIComponent(animeId)}`),
        ]);

        if (infoRes.ok) {
          const data = await infoRes.json();
          setAnime(data.anime);
          setMiruroInfo(data.miruroInfo);
          if (data.tmdbData) setTmdbData(data.tmdbData);
          if (data.tmdbId) setTmdbId(data.tmdbId);
          // Use totalEpisodes from info API as a reliable fallback
          if (data.totalEpisodes != null && data.totalEpisodes > 0) {
            setTotalEpisodes(data.totalEpisodes);
          }
        }

        if (epRes.ok) {
          const epData = await epRes.json();
          setEpisodes(epData.episodes || []);
          setMiruroEps(epData.miruroEpisodes || { sub: [], dub: [] });
          // Use nullish coalescing to properly handle totalEpisodes=0
          const epTotal = epData.totalEpisodes ?? epData.episodes?.length ?? null;
          if (epTotal != null && epTotal > 0) {
            setTotalEpisodes(epTotal);
          }
          if (!tmdbId && epData.zenshinMappings?.themoviedb_id) setTmdbId(epData.zenshinMappings.themoviedb_id);
        }

        const cleanId = animeId.replace(/^miruro_/, "");
        if (/^\d+$/.test(cleanId)) setAnilistId(parseInt(cleanId));
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
            // Also update totalEpisodes if we didn't have it
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
      <div className="space-y-6 fade-in">
        <div className="min-h-[90vh] skeleton" />
        <div className="flex gap-6">
          <div className="w-[180px] aspect-[2/3] skeleton shrink-0" />
          <div className="flex-1 space-y-3">
            <div className="h-8 w-3/4 skeleton" />
            <div className="h-4 w-1/2 skeleton" />
            <div className="h-20 skeleton" />
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
  // TMDB vote_average is on 0-10 scale — use ?? to preserve 0 values
  const tmdbScore = tmdbData?.vote_average ?? null;
  const allanimeScore = anime?.score || null;

  const anilistGenres: string[] = miruroInfo?.genres || anime?.genres || [];
  const tmdbGenres: string[] = tmdbData?.genres?.map(g => g.name) || [];
  const allGenres = [...new Set([...anilistGenres, ...tmdbGenres])];

  const status = miruroInfo?.status || anime?.status || "";
  const type = miruroInfo?.format || miruroInfo?.type || anime?.type || "";
  const season = miruroInfo?.season && miruroInfo?.seasonYear ? `${miruroInfo.season} ${miruroInfo.seasonYear}` : anime?.season || "";
  const episodesCount = totalEpisodes || miruroInfo?.episodes || (anime as any)?.episodeCount || tmdbData?.number_of_episodes || null;
  const tmdbCast = tmdbData?.credits?.cast?.slice(0, 12) || [];
  const tmdbTrailers = tmdbData?.videos?.results?.filter(v => v.site === "YouTube" && (v.type === "Trailer" || v.type === "Opening")) || [];

  const hasMiruroEps = miruroEps.sub.length > 0 || miruroEps.dub.length > 0;
  const currentEps = hasMiruroEps
    ? (activeTab === "dub" && miruroEps.dub.length > 0 ? miruroEps.dub : miruroEps.sub)
    : episodes;

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

  // Determine if we have any episodes to show (including generated numbered ones)
  // Check if we have any episode data at all — also consider numbered fallback episodes
  const hasAnyEpisodes = episodes.length > 0 || hasMiruroEps || (episodesCount != null && episodesCount > 0);

  return (
    <div className="fade-in">
      {/* Hero Section — 90vh */}
      {banner && (
        <div className="relative min-h-[70vh] sm:min-h-[80vh] lg:min-h-[90vh] -mt-[75px] overflow-hidden">
          <img src={banner} alt="" className="absolute inset-0 w-full h-full object-cover ken-burns" key={`banner-${animeId}`} />
          <div className="absolute inset-0 bg-gradient-to-l from-transparent via-[#0b1116]/50 to-[#0b1116]/95" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b1116] via-[#0b1116]/40 to-transparent" />

          {/* Content */}
          <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 lg:p-12 pb-24 sm:pb-20 lg:pb-12">
            <div className="max-w-[1400px] mx-auto flex flex-col lg:flex-row items-end gap-6 lg:gap-8">
              <div className="flex-1 min-w-0 space-y-3 sm:space-y-4">
                {/* Badges */}
                <div className="stagger-reveal stagger-1 flex items-center gap-2 flex-wrap">
                  {anilistScore && (
                    <span className="badge-score text-[11px] font-bold inline-flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                      AL {anilistScore.toFixed(1)}
                    </span>
                  )}
                  {tmdbScore && (
                    <span className="badge-type text-[11px] font-bold">TMDB {(tmdbScore > 10 ? tmdbScore / 10 : tmdbScore).toFixed(1)}</span>
                  )}
                  {type && <span className="badge-anime text-[10px] font-bold">{type}</span>}
                  {status && <span className="badge-airing text-[10px] font-bold">{status}</span>}
                  {season && <span className="badge-type text-[10px] font-bold">{season}</span>}
                  {episodesCount && <span className="badge-quality text-[10px] font-bold">{episodesCount} EP</span>}
                </div>

                <h1 className="stagger-reveal stagger-2 text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-white line-clamp-2 overflow-hidden">{displayTitle}</h1>

                {/* Alt titles */}
                {anilistTitleRomaji && anilistTitleRomaji !== displayTitle && (
                  <p className="stagger-reveal stagger-2 text-sm text-zinc-400 line-clamp-1">{anilistTitleRomaji}</p>
                )}
                {anilistTitleNative && (
                  <p className="stagger-reveal stagger-2 text-xs text-zinc-500 line-clamp-1">{anilistTitleNative}</p>
                )}

                {/* Genre tags */}
                {allGenres.length > 0 && (
                  <div className="stagger-reveal stagger-3 flex flex-wrap gap-2">
                    {allGenres.slice(0, 8).map(g => (
                      <button
                        key={g}
                        onClick={() => navigate({ page: "genre", genre: g })}
                        className="px-3 py-1 text-xs font-medium bg-cyan-500/10 text-cyan-300 rounded-full border border-cyan-500/20 hover:bg-cyan-500/20 transition-all"
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                )}

                {/* Description */}
                {description && (
                  <p className="stagger-reveal stagger-4 text-xs sm:text-sm text-zinc-400 line-clamp-2 sm:line-clamp-3 max-w-lg leading-relaxed">{description}</p>
                )}

                {/* Action buttons */}
                <div className="stagger-reveal stagger-5 flex flex-wrap items-center gap-2 sm:gap-3 pt-2">
                  <button onClick={() => handleWatch(1)} className="pill-btn pill-btn-primary">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                    Play EP.1
                  </button>
                  <button
                    onClick={toggleBookmark}
                    className={`pill-btn ${bookmarked ? "bg-cyan-500/10 text-cyan-300 border border-cyan-500/20" : "pill-btn-ghost"}`}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill={bookmarked ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2}>
                      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                    </svg>
                    {bookmarked ? "Saved" : "Add to List"}
                  </button>
                  {tmdbTrailers.length > 0 && (
                    <a
                      href={`https://www.youtube.com/watch?v=${tmdbTrailers[0].key}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="pill-btn pill-btn-ghost"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      Trailer
                    </a>
                  )}
                </div>
              </div>

              {/* 3D tilted poster */}
              {image && (
                <div className="stagger-reveal stagger-4 hidden lg:block shrink-0">
                  <img src={image} alt={displayTitle} className="w-[240px] rounded-xl poster-3d" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Info section (when no banner) */}
      {!banner && image && (
        <div className="flex flex-col sm:flex-row gap-6 mt-4">
          <div className="shrink-0 w-[180px] mx-auto sm:mx-0">
            <img src={image} alt={displayTitle} className="w-full rounded-xl shadow-2xl shadow-black/50" />
          </div>
          <div className="flex-1 space-y-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-white">{displayTitle}</h1>
            {description && <p className="text-sm text-zinc-400 leading-relaxed line-clamp-5">{description}</p>}
          </div>
        </div>
      )}

      {/* TMDB Cast */}
      {tmdbCast.length > 0 && (
        <div className="mt-8 space-y-3">
          <div className="section-header">
            <h3 className="text-sm font-bold text-white">Top Cast</h3>
          </div>
          <div className="flex gap-4 overflow-x-auto scroll-container pb-2">
            {tmdbCast.map(c => (
              <div key={c.id} className="shrink-0 text-center w-[100px]">
                <div className="w-[100px] h-[100px] rounded-full overflow-hidden mx-auto mb-2 border-2 border-white/[0.06] bg-[#1a2530]">
                  {c.profile_path ? (
                    <img src={`https://image.tmdb.org/t/p/w185${c.profile_path}`} alt={c.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-lg text-zinc-600 font-semibold">{c.name.charAt(0)}</div>
                  )}
                </div>
                <p className="text-[10px] text-zinc-300 font-medium line-clamp-1">{c.name}</p>
                {c.character && <p className="text-[8px] text-zinc-500 line-clamp-1">{c.character}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AniList Voice Cast / Characters */}
      {anilistCharacters.length > 0 && (
        <div className="mt-8 space-y-3">
          <div className="section-header">
            <h3 className="text-sm font-bold text-white">Voice Cast &amp; Characters</h3>
            <span className="text-[10px] text-zinc-500 ml-2">AniList</span>
          </div>
          <div className="flex gap-4 overflow-x-auto scroll-container pb-2">
            {anilistCharacters.filter(c => c.role === "MAIN" || c.role === "SUPPORTING").slice(0, 16).map(c => {
              const va = c.voiceActors?.[0];
              return (
                <div key={c.id} className="shrink-0 text-center w-[120px]">
                  {/* Character */}
                  <div className="flex flex-col items-center">
                    <div className="w-[80px] h-[80px] rounded-full overflow-hidden border-2 border-cyan-500/20 bg-[#1a2530] mb-1">
                      {c.image?.large || c.image?.medium ? (
                        <img src={c.image.large || c.image.medium} alt={c.name.full} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-sm text-zinc-600 font-semibold">{c.name.full.charAt(0)}</div>
                      )}
                    </div>
                    <p className="text-[10px] text-cyan-300 font-medium line-clamp-1">{c.name.full}</p>
                    {c.name.native && <p className="text-[8px] text-zinc-500 line-clamp-1">{c.name.native}</p>}
                    <span className={`text-[8px] font-bold mt-0.5 px-2 py-0.5 rounded-full ${
                      c.role === "MAIN" ? "bg-cyan-500/15 text-cyan-300" : "bg-white/[0.05] text-zinc-400"
                    }`}>{c.role}</span>
                  </div>

                  {/* Voice Actor */}
                  {va && (
                    <div className="flex flex-col items-center mt-2">
                      <div className="w-[8px] h-[8px] rounded-full bg-zinc-700 mb-1" />
                      <div className="w-[60px] h-[60px] rounded-full overflow-hidden border-2 border-violet-500/20 bg-[#1a2530] mb-1">
                        {va.image?.large || va.image?.medium ? (
                          <img src={va.image.large || va.image.medium} alt={va.name.full} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-zinc-600 font-semibold">{va.name.full.charAt(0)}</div>
                        )}
                      </div>
                      <p className="text-[9px] text-violet-300 font-medium line-clamp-1">{va.name.full}</p>
                      {va.name.native && <p className="text-[7px] text-zinc-500 line-clamp-1">{va.name.native}</p>}
                      <span className="text-[7px] text-zinc-600">CV</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* AniList Staff */}
      {anilistStaff.length > 0 && (
        <div className="mt-8 space-y-3">
          <div className="section-header">
            <h3 className="text-sm font-bold text-white">Staff</h3>
            <span className="text-[10px] text-zinc-500 ml-2">AniList</span>
          </div>
          <div className="flex gap-4 overflow-x-auto scroll-container pb-2">
            {anilistStaff.slice(0, 12).map(s => (
              <div key={s.id} className="shrink-0 text-center w-[100px]">
                <div className="w-[80px] h-[80px] rounded-full overflow-hidden mx-auto mb-2 border-2 border-white/[0.06] bg-[#1a2530]">
                  {s.image?.large || s.image?.medium ? (
                    <img src={s.image.large || s.image.medium} alt={s.name.full} className="w-full h-full object-cover" />
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

      {/* AniList Studios */}
      {anilistStudios.length > 0 && (
        <div className="mt-8 space-y-3">
          <div className="section-header">
            <h3 className="text-sm font-bold text-white">Studios</h3>
            <span className="text-[10px] text-zinc-500 ml-2">AniList</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {anilistStudios.map(s => (
              <span key={s.id} className={`px-3 py-1.5 text-xs font-semibold rounded-full ${
                s.isAnimationStudio
                  ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/20"
                  : "bg-white/[0.05] text-zinc-400 border border-white/[0.06]"
              }`}>
                {s.name}
                {s.isAnimationStudio && <span className="ml-1 text-[8px] text-cyan-500">★</span>}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* AniList Trailer */}
      {anilistTrailer && anilistTrailer.site === "youtube" && (
        <div className="mt-8 space-y-3">
          <div className="section-header">
            <h3 className="text-sm font-bold text-white">Trailer</h3>
          </div>
          <div className="relative w-full aspect-video max-w-2xl rounded-xl overflow-hidden border border-white/[0.06]">
            <iframe
              src={`https://www.youtube.com/embed/${anilistTrailer.id}?autoplay=0&modestbranding=1`}
              className="w-full h-full"
              allowFullScreen
              allow="autoplay; encrypted-media"
              title="Trailer"
            />
          </div>
        </div>
      )}

      {/* AniList Recommendations */}
      {anilistRecommendations.length > 0 && (
        <div className="mt-8 space-y-3">
          <div className="section-header">
            <h3 className="text-sm font-bold text-white">Recommendations</h3>
            <span className="text-[10px] text-zinc-500 ml-2">AniList</span>
          </div>
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
                  <div className="w-[120px] aspect-[3/4] rounded-lg overflow-hidden border border-white/[0.04] bg-[#1a2530] mb-1.5">
                    {rImg ? (
                      <img src={rImg} alt={rTitle} className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-zinc-600">{rTitle.charAt(0)}</div>
                    )}
                  </div>
                  <p className="text-[10px] text-zinc-300 font-medium line-clamp-2 group-hover:text-cyan-300 transition-colors">{rTitle}</p>
                  {r.averageScore && (
                    <span className="text-[9px] text-emerald-400 font-semibold">{(r.averageScore > 10 ? r.averageScore / 10 : r.averageScore).toFixed(1)} ★</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* AniList Related Anime */}
      {anilistRelations.length > 0 && (
        <div className="mt-8 space-y-3">
          <div className="section-header">
            <h3 className="text-sm font-bold text-white">Related</h3>
            <span className="text-[10px] text-zinc-500 ml-2">AniList</span>
          </div>
          <div className="space-y-2">
            {anilistRelations.slice(0, 8).map(r => {
              const rTitle = r.title.english || r.title.romaji || r.title.native || "Unknown";
              const rImg = r.coverImage?.extraLarge || r.coverImage?.large || r.coverImage?.medium || "";
              return (
                <button
                  key={r.id}
                  onClick={() => navigate({ page: "anime", id: String(r.id) })}
                  className="flex items-center gap-3 w-full p-2 bg-[#131c26] rounded-lg border border-white/[0.03] hover:bg-white/[0.04] hover:border-cyan-500/20 transition-all group text-left"
                >
                  <div className="w-12 h-16 rounded-md overflow-hidden shrink-0 bg-[#1a2530]">
                    {rImg ? (
                      <img src={rImg} alt={rTitle} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[8px] text-zinc-600">{rTitle.charAt(0)}</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-zinc-300 line-clamp-1 group-hover:text-cyan-300 transition-colors">{rTitle}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-bold">{r.relationType?.replace(/_/g, " ")}</span>
                      {r.format && <span className="text-[9px] text-zinc-500">{r.format}</span>}
                      {r.episodes && <span className="text-[9px] text-zinc-500">{r.episodes} EP</span>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Episodes List — anixtv style with thumbnails */}
      {(episodes.length > 0 || hasMiruroEps) && (
        <div className="mt-8 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="section-header flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">EPISODES</h3>
              {episodesCount && <span className="text-[10px] text-zinc-500">({episodesCount} total)</span>}
            </div>
            {hasMiruroEps && miruroEps.dub.length > 0 && (
              <div className="flex items-center gap-1 bg-[#1a2530] rounded-full p-0.5 border border-white/[0.06]">
                {(["sub", "dub"] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-1.5 text-[11px] font-bold rounded-full transition-all ${
                      activeTab === tab ? "bg-cyan-500/15 text-cyan-300" : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {tab.toUpperCase()} ({tab === "sub" ? miruroEps.sub.length : miruroEps.dub.length})
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Episode grid with thumbnails (anixtv style) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
            {hasMiruroEps
              ? currentEps.map((ep) => {
                  const epThumbnail = ep.thumbnail || null;
                  const epTitle = ep.title || null;
                  return (
                    <button
                      key={`miruro-${ep.number}`}
                      onClick={() => handleWatch(ep.number)}
                      className="flex items-center gap-3 p-2 bg-[#131c26] rounded-lg border border-white/[0.03] hover:bg-white/[0.04] hover:border-cyan-500/20 transition-all group text-left"
                    >
                      {/* Thumbnail */}
                      <div className="w-20 h-12 rounded-md overflow-hidden shrink-0 bg-[#1a2530] relative">
                        {epThumbnail ? (
                          <img src={epThumbnail} alt="" className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-xs font-bold text-cyan-400">{ep.number}</span>
                          </div>
                        )}
                        {/* Play overlay on hover */}
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <svg className="w-5 h-5 text-cyan-400" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                        </div>
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-zinc-300 line-clamp-1 group-hover:text-cyan-300 transition-colors">
                          EP {ep.number}
                        </p>
                        {epTitle && (
                          <p className="text-[10px] text-zinc-500 line-clamp-1">{epTitle}</p>
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
                      className="flex items-center gap-3 p-2 bg-[#131c26] rounded-lg border border-white/[0.03] hover:bg-white/[0.04] hover:border-cyan-500/20 transition-all group text-left"
                    >
                      {/* Thumbnail */}
                      <div className="w-20 h-12 rounded-md overflow-hidden shrink-0 bg-[#1a2530] relative">
                        {epThumbnail ? (
                          <img src={epThumbnail} alt="" className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-xs font-bold text-cyan-400">{ep.episodeIdNum}</span>
                          </div>
                        )}
                        {/* Play overlay on hover */}
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <svg className="w-5 h-5 text-cyan-400" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                        </div>
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-zinc-300 line-clamp-1 group-hover:text-cyan-300 transition-colors">
                          EP {ep.episodeIdNum}
                        </p>
                        {epTitle && (
                          <p className="text-[10px] text-zinc-500 line-clamp-1">{epTitle}</p>
                        )}
                      </div>
                    </button>
                  );
                })
            }
          </div>
        </div>
      )}

      {/* Fallback when we know there are episodes but none were fetched */}
      {!episodes.length && !hasMiruroEps && episodesCount && episodesCount > 0 && (
        <div className="mt-8 space-y-4">
          <div className="section-header flex items-center gap-2">
            <h3 className="text-sm font-bold text-white">EPISODES</h3>
            <span className="text-[10px] text-zinc-500">({episodesCount} total)</span>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
            {Array.from({ length: Math.min(episodesCount, 50) }, (_, i) => i + 1).map(num => (
              <button
                key={`gen-${num}`}
                onClick={() => handleWatch(num)}
                className="server-pill justify-center text-[11px] font-semibold py-2.5 px-2 hover:bg-cyan-500/10 hover:border-cyan-500/20 hover:text-cyan-300 transition-all"
              >
                <svg className="w-3 h-3 text-cyan-400/60 shrink-0" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                {num}
              </button>
            ))}
          </div>
          {episodesCount > 50 && (
            <p className="text-xs text-zinc-500 text-center">Showing first 50 of {episodesCount} episodes</p>
          )}
        </div>
      )}

      {/* No episodes at all — only show when we truly have no episode data */}
      {!hasAnyEpisodes && !loading && (
        <div className="text-center py-12 mt-6 bg-[#151f2e] rounded-xl border border-white/[0.04]">
          <svg className="w-12 h-12 text-zinc-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707A1 1 0 0112 5.586v12.828a1 1 0 01-1.707.707L5.586 15z" />
          </svg>
          <p className="text-zinc-500 text-sm">No episodes available yet</p>
          <p className="text-zinc-600 text-xs mt-1">Try checking back later or use the search to find a stream</p>
        </div>
      )}

      {/* Comment Section with Ratings */}
      <CommentSection animeId={animeId} />
    </div>
  );
}
