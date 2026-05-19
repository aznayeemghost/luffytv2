"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAppStore } from "./store";
import AnimeCard from "./anime-card";
import type { AnimeItem } from "./store";
import type { MiruroAnimeResult } from "@/lib/miruro-api";
import type { TMDBContentItem } from "./store";
import type { AniListMedia } from "@/lib/anilist-api";

interface HomeData {
  trending?: AnimeItem[];
  recent?: AnimeItem[];
  miruroTrending?: MiruroAnimeResult[];
  miruroPopular?: MiruroAnimeResult[];
  miruroRecent?: MiruroAnimeResult[];
  _sources?: Record<string, string>;
}

// Hero slide for TMDB trending items — 90vh, Ken Burns, staggered animations
function HeroSlide({ item, isActive }: { item: TMDBContentItem; isActive: boolean }) {
  const navigate = useAppStore(s => s.navigate);
  const title = item.title || item.name || "Unknown";
  const image = item.backdrop_path ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}` : "";
  const posterImage = item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : "";
  const isMovie = item.media_type === "movie" || !!item.release_date || !!item.original_title;
  const year = (item.release_date || item.first_air_date || "").split("-")[0];
  const rating = (item.vote_average != null && item.vote_average > 0) ? (item.vote_average > 10 ? item.vote_average / 10 : item.vote_average).toFixed(1) : null;

  if (!isActive) return null;

  return (
    <div className="relative w-full min-h-[90vh] sm:min-h-[85vh] lg:min-h-[90vh] overflow-hidden hero-slide">
      {/* Background image with Ken Burns effect */}
      {image && (
        <img
          src={image}
          alt={title}
          className="absolute inset-0 w-full h-full object-cover ken-burns"
          key={`hero-${item.id}`}
        />
      )}

      {/* Dual gradient overlay — right-to-left + bottom-to-top */}
      <div className="absolute inset-0 bg-gradient-to-l from-transparent via-[#0b1116]/40 to-[#0b1116]/95" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0b1116] via-[#0b1116]/50 to-transparent" />

      {/* Content — staggered animations */}
      <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-12 pb-20 lg:pb-24">
        <div className="max-w-2xl space-y-4">
          {/* Trending badge */}
          <div className="stagger-reveal stagger-1">
            <span className="badge-trending text-[10px] font-bold inline-flex items-center gap-1.5">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
              </svg>
              TRENDING
            </span>
          </div>

          {/* Type + meta badges */}
          <div className="stagger-reveal stagger-2 flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
              isMovie ? "bg-rose-500/15 text-rose-300 border border-rose-500/20" : "bg-cyan-500/15 text-cyan-300 border border-cyan-500/20"
            }`}>
              {isMovie ? "MOVIE" : "TV SHOW"}
            </span>
            {year && (
              <span className="text-[11px] text-zinc-300 font-medium">{year}</span>
            )}
            {rating && (
              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                {rating}
              </span>
            )}
          </div>

          {/* Title */}
          <h2 className="stagger-reveal stagger-3 text-3xl sm:text-4xl lg:text-5xl font-bold text-white line-clamp-2 leading-tight">
            {title}
          </h2>

          {/* Description */}
          {item.overview && (
            <p className="stagger-reveal stagger-4 text-sm sm:text-base text-zinc-400 line-clamp-3 max-w-lg leading-relaxed">
              {item.overview}
            </p>
          )}

          {/* Action buttons */}
          <div className="stagger-reveal stagger-5 flex items-center gap-3 pt-2">
            <button
              onClick={() => isMovie
                ? navigate({ page: "movie-watch", id: item.id })
                : navigate({ page: "tv-detail", id: item.id })
              }
              className="pill-btn pill-btn-primary"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
              Play
            </button>
            <button
              onClick={() => isMovie
                ? navigate({ page: "movie-detail", id: item.id })
                : navigate({ page: "tv-detail", id: item.id })
              }
              className="pill-btn pill-btn-ghost"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Details
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Horizontal scroll section — anixtv style with left-border accent + scroll buttons
function ContentSection({ title, children, icon, viewAllAction }: { title: string; children: React.ReactNode; icon?: React.ReactNode; viewAllAction?: () => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftBtn, setShowLeftBtn] = useState(false);
  const [showRightBtn, setShowRightBtn] = useState(true);

  const checkScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setShowLeftBtn(scrollLeft > 10);
    setShowRightBtn(scrollLeft + clientWidth < scrollWidth - 10);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    return () => el.removeEventListener("scroll", checkScroll);
  }, [checkScroll]);

  const scroll = (dir: "left" | "right") => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir === "left" ? -400 : 400, behavior: "smooth" });
    }
  };

  return (
    <section className="space-y-3 scroll-section">
      <div className="flex items-center justify-between">
        <div className="section-header flex items-center gap-2">
          {icon}
          <h2 className="text-base sm:text-lg font-bold text-white">{title}</h2>
        </div>
        <div className="flex items-center gap-2">
          {viewAllAction && (
            <button onClick={viewAllAction} className="text-xs text-cyan-400 hover:text-cyan-300 font-medium transition-colors flex items-center gap-1">
              View All
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M9 5l7 7-7 7" /></svg>
            </button>
          )}
          <button onClick={() => scroll("left")} className={`scroll-btn p-2 text-zinc-500 hover:text-white bg-[#1a2530]/80 hover:bg-cyan-500/20 rounded-full transition-all backdrop-blur-sm border border-white/[0.06] ${showLeftBtn ? "" : "opacity-0 pointer-events-none"}`}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M15 19l-7-7 7-7" /></svg>
          </button>
          <button onClick={() => scroll("right")} className={`scroll-btn p-2 text-zinc-500 hover:text-white bg-[#1a2530]/80 hover:bg-cyan-500/20 rounded-full transition-all backdrop-blur-sm border border-white/[0.06] ${showRightBtn ? "" : "opacity-0 pointer-events-none"}`}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>
      <div ref={scrollRef} className="scroll-container flex gap-3 overflow-x-auto pb-2">
        {children}
      </div>
    </section>
  );
}

// Safely normalize any anime item to MiruroAnimeResult format
// Handles data from AniList, Official MAL API, or Miruro sources
function safeNormalizeAnime(item: any): MiruroAnimeResult {
  // Safely extract title — handle object, string, or missing
  let title: { romaji?: string; english?: string; native?: string };
  if (item.title && typeof item.title === "object") {
    title = {
      romaji: item.title.romaji || undefined,
      english: item.title.english || undefined,
      native: item.title.native || undefined,
    };
  } else if (typeof item.title === "string" && item.title) {
    title = { romaji: item.title, english: item.title };
  } else if (item.name) {
    title = { romaji: item.name, english: item.englishName || item.name };
  } else {
    title = { romaji: "Unknown" };
  }

  // Safely extract coverImage
  let coverImage: MiruroAnimeResult["coverImage"];
  if (item.coverImage && typeof item.coverImage === "object") {
    coverImage = {
      extraLarge: item.coverImage.extraLarge || undefined,
      large: item.coverImage.large || undefined,
      medium: item.coverImage.medium || undefined,
      color: item.coverImage.color || undefined,
    };
  } else if (item.thumbnail) {
    coverImage = { extraLarge: item.thumbnail, large: item.thumbnail, medium: item.thumbnail };
  }

  return {
    id: item.id || 0,
    title,
    coverImage,
    bannerImage: item.bannerImage || undefined,
    type: item.type || undefined,
    format: item.format || undefined,
    status: item.status || undefined,
    description: item.description || undefined,
    season: item.season || undefined,
    seasonYear: item.seasonYear || item.year || undefined,
    episodes: item.episodes ?? undefined,
    duration: item.duration ?? undefined,
    genres: Array.isArray(item.genres) ? item.genres : undefined,
    averageScore: item.averageScore ?? (item.score ? Math.round(item.score * 10) : undefined),
    popularity: item.popularity ?? undefined,
    trending: item.trending ?? undefined,
    countryOfOrigin: item.countryOfOrigin || undefined,
    isAdult: item.isAdult || undefined,
  };
}

// Map anime items to MiruroAnimeResult format — works with any API source
function mapAniListToMiruro(items: any[]): MiruroAnimeResult[] {
  return items.map(safeNormalizeAnime);
}

export default function HomePage() {
  const [animeData, setAnimeData] = useState<HomeData | null>(null);
  const [anilistTrending, setAnilistTrending] = useState<MiruroAnimeResult[]>([]);
  const [anilistPopular, setAnilistPopular] = useState<MiruroAnimeResult[]>([]);
  const [anilistTopRated, setAnilistTopRated] = useState<MiruroAnimeResult[]>([]);
  const [trendingAll, setTrendingAll] = useState<TMDBContentItem[]>([]);
  const [trendingMovies, setTrendingMovies] = useState<TMDBContentItem[]>([]);
  const [popularMovies, setPopularMovies] = useState<TMDBContentItem[]>([]);
  const [popularTV, setPopularTV] = useState<TMDBContentItem[]>([]);
  const [topRatedMovies, setTopRatedMovies] = useState<TMDBContentItem[]>([]);
  const [topRatedTV, setTopRatedTV] = useState<TMDBContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [heroIdx, setHeroIdx] = useState(0);

  useEffect(() => {
    async function load() {
      const promises = [
        fetch("/api/anime/home").then(r => r.ok ? r.json() : null).catch(() => null),
        fetch("/api/anime/anilist-trending").then(r => r.ok ? r.json() : null).catch(() => null),
        fetch("/api/tmdb/trending?type=all&time=week").then(r => r.ok ? r.json() : null).catch(() => null),
        fetch("/api/tmdb/trending?type=movie&time=week").then(r => r.ok ? r.json() : null).catch(() => null),
        fetch("/api/tmdb/movies?category=popular").then(r => r.ok ? r.json() : null).catch(() => null),
        fetch("/api/tmdb/tv?category=popular").then(r => r.ok ? r.json() : null).catch(() => null),
        fetch("/api/tmdb/movies?category=top_rated").then(r => r.ok ? r.json() : null).catch(() => null),
        fetch("/api/tmdb/tv?category=top_rated").then(r => r.ok ? r.json() : null).catch(() => null),
      ];

      const [anime, anilist, trending, tMovies, pMovies, pTV, trMovies, trTV] = await Promise.all(promises);

      if (anime) setAnimeData(anime);
      // AniList PRIMARY for anime sections
      if (anilist) {
        if (anilist.trending?.length > 0) setAnilistTrending(mapAniListToMiruro(anilist.trending));
        if (anilist.popular?.length > 0) setAnilistPopular(mapAniListToMiruro(anilist.popular));
        if (anilist.topRated?.length > 0) setAnilistTopRated(mapAniListToMiruro(anilist.topRated));
      }
      if (trending?.results) setTrendingAll(trending.results);
      if (tMovies?.results) setTrendingMovies(tMovies.results);
      if (pMovies?.results) setPopularMovies(pMovies.results);
      if (pTV?.results) setPopularTV(pTV.results);
      if (trMovies?.results) setTopRatedMovies(trMovies.results);
      if (trTV?.results) setTopRatedTV(trTV.results);

      setLoading(false);
    }
    load();
  }, []);

  // Hero carousel auto-advance
  const heroItems = trendingAll.length > 0 ? trendingAll : (anilistTrending.length > 0 ? anilistTrending : (animeData?.miruroTrending || []));
  const heroTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (heroItems.length === 0) return;
    // Clear previous timer
    if (heroTimerRef.current) clearInterval(heroTimerRef.current);
    heroTimerRef.current = setInterval(() => {
      setHeroIdx(i => (i + 1) % Math.min(heroItems.length, 10));
    }, 7000);
    return () => { if (heroTimerRef.current) clearInterval(heroTimerRef.current); };
  }, [heroItems.length]);

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="min-h-[90vh] skeleton rounded-2xl" />
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="space-y-3">
            <div className="h-5 w-40 skeleton rounded" />
            <div className="flex gap-3 overflow-hidden">
              {Array.from({ length: 6 }).map((_, j) => (
                <div key={j} className="shrink-0 w-[160px] aspect-[2/3] skeleton rounded-xl" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  const heroItem = heroItems[heroIdx];
  const heroTotal = Math.min(heroItems.length, 10);

  return (
    <div className="space-y-12 fade-in" style={{ marginTop: -75 }}>
      {/* Hero Carousel — 90vh, overlaps navbar */}
      {heroItem && (
        <div className="relative">
          {trendingAll.length > 0 ? (
            <HeroSlide item={heroItem as TMDBContentItem} isActive={true} />
          ) : (
            // Fallback to anime hero (Miruro style)
            <div className="relative w-full min-h-[90vh] sm:min-h-[85vh] overflow-hidden group" key={`miruro-hero-${heroIdx}`}>
              {(() => {
                const anime = heroItem as MiruroAnimeResult;
                const img = anime.bannerImage || anime.coverImage?.extraLarge || "";
                const ttl = anime.title?.english || anime.title?.romaji || anime.title?.native || "Unknown";
                return (
                  <>
                    {img && <img src={img} alt={ttl} className="absolute inset-0 w-full h-full object-cover ken-burns" key={`img-${anime.id}`} />}
                    <div className="absolute inset-0 bg-gradient-to-l from-transparent via-[#0b1116]/40 to-[#0b1116]/95" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0b1116] via-[#0b1116]/50 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-12 pb-20 lg:pb-24">
                      <div className="max-w-2xl space-y-4">
                        <div className="stagger-reveal stagger-1">
                          <span className="badge-anime text-[10px] font-bold">ANIME</span>
                        </div>
                        <h2 className="stagger-reveal stagger-3 text-3xl sm:text-4xl lg:text-5xl font-bold text-white line-clamp-2 leading-tight">{ttl}</h2>
                        <div className="stagger-reveal stagger-5 flex items-center gap-3 pt-2">
                          <button
                            onClick={() => useAppStore.getState().navigate({ page: "anime", id: String(anime.id) })}
                            className="pill-btn pill-btn-primary"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                            Play
                          </button>
                          {anime.averageScore && (
                            <span className="flex items-center gap-1 text-sm font-bold text-emerald-400">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                              {(anime.averageScore > 10 ? anime.averageScore / 10 : anime.averageScore).toFixed(1)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {/* Hero thumbnails — bottom right */}
          {heroTotal > 1 && trendingAll.length > 0 && (
            <div className="absolute bottom-8 right-6 lg:bottom-12 lg:right-12 hidden lg:flex items-end gap-2 z-10">
              {Array.from({ length: heroTotal }).map((_, i) => {
                const item = heroItems[i] as TMDBContentItem;
                const poster = item?.poster_path ? `https://image.tmdb.org/t/p/w92${item.poster_path}` : "";
                return (
                  <button
                    key={i}
                    onClick={() => setHeroIdx(i)}
                    className={`rounded-lg overflow-hidden transition-all duration-300 border-2 ${
                      i === heroIdx
                        ? "w-14 h-20 border-cyan-500 shadow-lg shadow-cyan-500/30 scale-110"
                        : "w-10 h-14 border-transparent opacity-50 hover:opacity-80"
                    }`}
                  >
                    {poster ? (
                      <img src={poster} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-[#1a2530]" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Progress indicator dots */}
          {heroTotal > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
              {Array.from({ length: heroTotal }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setHeroIdx(i)}
                  className="group relative flex items-center justify-center"
                >
                  {/* Progress track */}
                  <div className={`h-1 rounded-full transition-all duration-300 ${
                    i === heroIdx ? "w-8 bg-cyan-500" : "w-2 bg-white/20 hover:bg-white/40"
                  }`}>
                    {/* Active progress fill */}
                    {i === heroIdx && (
                      <div
                        className="h-full bg-cyan-300 rounded-full"
                        style={{
                          animation: "carouselProgress 7s linear forwards",
                        }}
                      />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Trending Now */}
      {trendingAll.length > 0 && (
        <ContentSection
          title="Trending Now"
          icon={<svg className="w-5 h-5 text-rose-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" /></svg>}
        >
          {trendingAll.slice(0, 20).map((item, i) => (
            <div key={`${item.id}-${item.media_type}`} className="shrink-0 w-[140px] sm:w-[160px] lg:w-[180px]">
              <AnimeCard tmdbItem={item} index={i} />
            </div>
          ))}
        </ContentSection>
      )}

      {/* Popular Movies */}
      {popularMovies.length > 0 && (
        <ContentSection
          title="Popular Movies"
          icon={<svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" /><line x1="7" y1="2" x2="7" y2="22" /><line x1="17" y1="2" x2="17" y2="22" /><line x1="2" y1="12" x2="22" y2="12" /></svg>}
        >
          {popularMovies.slice(0, 20).map((item, i) => (
            <div key={item.id} className="shrink-0 w-[140px] sm:w-[160px] lg:w-[180px]">
              <AnimeCard tmdbItem={{ ...item, media_type: "movie" }} index={i} />
            </div>
          ))}
        </ContentSection>
      )}

      {/* Popular TV Shows */}
      {popularTV.length > 0 && (
        <ContentSection
          title="Popular TV Shows"
          icon={<svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="2" y="7" width="20" height="15" rx="2" ry="2" /><polyline points="17 2 12 7 7 2" /></svg>}
        >
          {popularTV.slice(0, 20).map((item, i) => (
            <div key={item.id} className="shrink-0 w-[140px] sm:w-[160px] lg:w-[180px]">
              <AnimeCard tmdbItem={{ ...item, media_type: "tv" }} index={i} />
            </div>
          ))}
        </ContentSection>
      )}

      {/* Anime Trending — AniList PRIMARY */}
      {anilistTrending.length > 0 ? (
        <ContentSection
          title="Trending Anime"
          icon={<svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" /></svg>}
        >
          {anilistTrending.slice(0, 20).map((anime, i) => (
            <div key={anime.id} className="shrink-0 w-[140px] sm:w-[160px] lg:w-[180px]">
              <AnimeCard anime={anime} index={i} />
            </div>
          ))}
        </ContentSection>
      ) : animeData?.miruroTrending && animeData.miruroTrending.length > 0 && (
        <ContentSection
          title="Trending Anime"
          icon={<svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" /></svg>}
        >
          {animeData!.miruroTrending.slice(0, 20).map((anime, i) => (
            <div key={anime.id} className="shrink-0 w-[140px] sm:w-[160px] lg:w-[180px]">
              <AnimeCard anime={anime} index={i} />
            </div>
          ))}
        </ContentSection>
      )}

      {/* Top Rated Movies */}
      {topRatedMovies.length > 0 && (
        <ContentSection
          title="Top Rated Movies"
          icon={<svg className="w-5 h-5 text-amber-300" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>}
        >
          {topRatedMovies.slice(0, 20).map((item, i) => (
            <div key={item.id} className="shrink-0 w-[140px] sm:w-[160px] lg:w-[180px]">
              <AnimeCard tmdbItem={{ ...item, media_type: "movie" }} index={i} />
            </div>
          ))}
        </ContentSection>
      )}

      {/* Top Rated TV */}
      {topRatedTV.length > 0 && (
        <ContentSection
          title="Top Rated TV Shows"
          icon={<svg className="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>}
        >
          {topRatedTV.slice(0, 20).map((item, i) => (
            <div key={item.id} className="shrink-0 w-[140px] sm:w-[160px] lg:w-[180px]">
              <AnimeCard tmdbItem={{ ...item, media_type: "tv" }} index={i} />
            </div>
          ))}
        </ContentSection>
      )}

      {/* Anime Popular — AniList PRIMARY */}
      {anilistPopular.length > 0 ? (
        <ContentSection
          title="Popular Anime"
          icon={<svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>}
        >
          {anilistPopular.slice(0, 20).map((anime, i) => (
            <div key={anime.id} className="shrink-0 w-[140px] sm:w-[160px] lg:w-[180px]">
              <AnimeCard anime={anime} index={i} />
            </div>
          ))}
        </ContentSection>
      ) : animeData?.miruroPopular && animeData.miruroPopular.length > 0 && (
        <ContentSection
          title="Popular Anime"
          icon={<svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>}
        >
          {animeData!.miruroPopular.slice(0, 20).map((anime, i) => (
            <div key={anime.id} className="shrink-0 w-[140px] sm:w-[160px] lg:w-[180px]">
              <AnimeCard anime={anime} index={i} />
            </div>
          ))}
        </ContentSection>
      )}

      {/* Anime Recently Updated */}
      {animeData?.recent && animeData.recent.length > 0 && (
        <ContentSection
          title="Recently Updated Anime"
          icon={<svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>}
        >
          {animeData!.recent.slice(0, 20).map((anime, i) => (
            <div key={anime._id} className="shrink-0 w-[140px] sm:w-[160px] lg:w-[180px]">
              <AnimeCard anime={anime} index={i} />
            </div>
          ))}
        </ContentSection>
      )}

      {/* Trending Movies */}
      {trendingMovies.length > 0 && (
        <ContentSection
          title="Trending Movies"
          icon={<svg className="w-5 h-5 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" /><line x1="7" y1="2" x2="7" y2="22" /><line x1="17" y1="2" x2="17" y2="22" /><line x1="2" y1="12" x2="22" y2="12" /></svg>}
        >
          {trendingMovies.slice(0, 20).map((item, i) => (
            <div key={item.id} className="shrink-0 w-[140px] sm:w-[160px] lg:w-[180px]">
              <AnimeCard tmdbItem={{ ...item, media_type: "movie" }} index={i} />
            </div>
          ))}
        </ContentSection>
      )}

      {/* Grid: Top Anime — AniList PRIMARY */}
      {anilistTopRated.length > 0 ? (
        <section className="space-y-3">
          <div className="section-header flex items-center gap-2">
            <svg className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
            <h2 className="text-base sm:text-lg font-bold text-white">Top Anime</h2>
            <span className="text-[10px] text-zinc-500 ml-1">AniList</span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3">
            {anilistTopRated.slice(0, 14).map((anime, i) => (
              <AnimeCard key={`top-${anime.id}`} anime={anime} index={i} />
            ))}
          </div>
        </section>
      ) : animeData?.miruroTrending && animeData.miruroTrending.length > 0 && (
        <section className="space-y-3">
          <div className="section-header flex items-center gap-2">
            <svg className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
            <h2 className="text-base sm:text-lg font-bold text-white">Top Anime</h2>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3">
            {animeData!.miruroTrending.slice(0, 14).map((anime, i) => (
              <AnimeCard key={anime.id} anime={anime} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* Empty State */}
      {!animeData?.trending?.length && !trendingAll.length && !animeData?.miruroTrending?.length && (
        <div className="text-center py-20 rounded-2xl bg-[#151f2e] border border-white/[0.04] p-8">
          <p className="text-zinc-400 text-sm">No content available. Try refreshing the page...</p>
        </div>
      )}
    </div>
  );
}
