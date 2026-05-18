"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAppStore } from "./store";
import AnimeCard from "./anime-card";
import type { AnimeItem } from "./store";
import type { MiruroAnimeResult } from "@/lib/miruro-api";
import type { MegaPlayAnimeItem } from "@/lib/megaplay-api";
import type { TMDBContentItem } from "./store";

interface HomeData {
  trending: AnimeItem[];
  recent: AnimeItem[];
  miruroTrending: MiruroAnimeResult[];
  miruroPopular: MiruroAnimeResult[];
  miruroRecent: MiruroAnimeResult[];
}

// Hero slide for TMDB trending items — 90vh, Ken Burns, staggered animations
function HeroSlide({ item, isActive }: { item: TMDBContentItem; isActive: boolean }) {
  const navigate = useAppStore(s => s.navigate);
  const title = item.title || item.name || "Unknown";
  const image = item.backdrop_path ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}` : "";
  const isMovie = item.media_type === "movie" || !!item.release_date || !!item.original_title;
  const year = (item.release_date || item.first_air_date || "").split("-")[0];
  const rating = (item.vote_average != null && item.vote_average > 0) ? (item.vote_average > 10 ? item.vote_average / 10 : item.vote_average).toFixed(1) : null;

  if (!isActive) return null;

  return (
    <div className="relative w-full min-h-[90vh] sm:min-h-[85vh] lg:min-h-[90vh] overflow-hidden hero-slide">
      {image && (
        <img src={image} alt={title} className="absolute inset-0 w-full h-full object-cover ken-burns" key={`hero-${item.id}`} />
      )}
      <div className="absolute inset-0 bg-gradient-to-l from-transparent via-[#000000]/40 to-[#000000]/95" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#000000] via-[#000000]/50 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-12 pb-20 lg:pb-24">
        <div className="max-w-2xl space-y-4">
          <div className="stagger-reveal stagger-1">
            <span className="badge-trending text-[10px] font-bold inline-flex items-center gap-1.5">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
              </svg>
              TRENDING
            </span>
          </div>
          <div className="stagger-reveal stagger-2 flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${isMovie ? "bg-rose-500/15 text-rose-300 border border-rose-500/20" : "bg-purple-500/15 text-purple-300 border border-purple-500/20"}`}>
              {isMovie ? "MOVIE" : "TV SHOW"}
            </span>
            {year && <span className="text-[11px] text-zinc-300 font-medium">{year}</span>}
            {rating && (
              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                {rating}
              </span>
            )}
          </div>
          <h2 className="stagger-reveal stagger-3 text-3xl sm:text-4xl lg:text-5xl font-bold text-white line-clamp-2 leading-tight">{title}</h2>
          {item.overview && (
            <p className="stagger-reveal stagger-4 text-sm sm:text-base text-zinc-400 line-clamp-3 max-w-lg leading-relaxed">{item.overview}</p>
          )}
          <div className="stagger-reveal stagger-5 flex items-center gap-3 pt-2">
            <button onClick={() => isMovie ? navigate({ page: "movie-watch", id: item.id }) : navigate({ page: "tv-detail", id: item.id })} className="pill-btn pill-btn-primary">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
              Play
            </button>
            <button onClick={() => isMovie ? navigate({ page: "movie-detail", id: item.id }) : navigate({ page: "tv-detail", id: item.id })} className="pill-btn pill-btn-ghost">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Details
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Anime Hero Slide for MegaPlay/Miruro spotlight items
function AnimeHeroSlide({ item, isActive }: { item: MegaPlayAnimeItem | MiruroAnimeResult; isActive: boolean }) {
  const navigate = useAppStore(s => s.navigate);
  const isMegaPlay = "coverImage" in item && "large" in (item.coverImage || {});
  const title = item.title?.english || item.title?.romaji || item.title?.native || "Unknown";
  const bannerImage = "bannerImage" in item ? (item as any).bannerImage : "";
  const coverImage = isMegaPlay
    ? (item as MegaPlayAnimeItem).coverImage?.large || (item as MegaPlayAnimeItem).coverImage?.medium || ""
    : (item as MiruroAnimeResult).coverImage?.extraLarge || (item as MiruroAnimeResult).coverImage?.large || "";
  const image = bannerImage || coverImage;
  const score = item.averageScore;
  const genres = item.genres || [];
  const format = item.format || item.type || "";
  const seasonYear = item.seasonYear;
  const description = "description" in item ? (item as any).description?.replace(/<[^>]*>/g, "") : "";

  if (!isActive) return null;

  return (
    <div className="relative w-full min-h-[90vh] sm:min-h-[85vh] lg:min-h-[90vh] overflow-hidden hero-slide">
      {image && <img src={image} alt={title} className="absolute inset-0 w-full h-full object-cover ken-burns" key={`anime-hero-${item.id}`} />}
      <div className="absolute inset-0 bg-gradient-to-l from-transparent via-[#000000]/40 to-[#000000]/95" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#000000] via-[#000000]/50 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-12 pb-20 lg:pb-24">
        <div className="max-w-2xl space-y-4">
          <div className="stagger-reveal stagger-1">
            <span className="badge-anime text-[10px] font-bold inline-flex items-center gap-1.5">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" /></svg>
              ANIME SPOTLIGHT
            </span>
          </div>
          <div className="stagger-reveal stagger-2 flex items-center gap-2 flex-wrap">
            {format && <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/20">{format}</span>}
            {seasonYear && <span className="text-[11px] text-zinc-300 font-medium">{seasonYear}</span>}
            {score && score > 0 && (
              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                {(score > 10 ? score / 10 : score).toFixed(1)}
              </span>
            )}
          </div>
          <h2 className="stagger-reveal stagger-3 text-3xl sm:text-4xl lg:text-5xl font-bold text-white line-clamp-2 leading-tight">{title}</h2>
          {genres.length > 0 && (
            <div className="stagger-reveal stagger-3.5 flex gap-1.5 flex-wrap">
              {genres.slice(0, 4).map(g => (
                <span key={g} className="px-2.5 py-1 text-[9px] font-semibold rounded-full bg-white/[0.05] border border-white/[0.08] text-zinc-400">{g}</span>
              ))}
            </div>
          )}
          {description && (
            <p className="stagger-reveal stagger-4 text-sm sm:text-base text-zinc-400 line-clamp-3 max-w-lg leading-relaxed">{description}</p>
          )}
          <div className="stagger-reveal stagger-5 flex items-center gap-3 pt-2">
            <button onClick={() => navigate({ page: "watch", id: String(item.id), episode: 1 })} className="pill-btn pill-btn-primary">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
              Play EP.1
            </button>
            <button onClick={() => navigate({ page: "anime", id: String(item.id) })} className="pill-btn pill-btn-ghost">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Details
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Horizontal scroll section
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
            <button onClick={viewAllAction} className="text-xs text-purple-400 hover:text-purple-300 font-medium transition-colors flex items-center gap-1">
              View All
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M9 5l7 7-7 7" /></svg>
            </button>
          )}
          <button onClick={() => scroll("left")} className={`scroll-btn p-2 text-zinc-500 hover:text-white bg-[#1a1a1a]/80 hover:bg-purple-500/20 rounded-full transition-all backdrop-blur-sm border border-white/[0.06] ${showLeftBtn ? "" : "opacity-0 pointer-events-none"}`}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M15 19l-7-7 7-7" /></svg>
          </button>
          <button onClick={() => scroll("right")} className={`scroll-btn p-2 text-zinc-500 hover:text-white bg-[#1a1a1a]/80 hover:bg-purple-500/20 rounded-full transition-all backdrop-blur-sm border border-white/[0.06] ${showRightBtn ? "" : "opacity-0 pointer-events-none"}`}>
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

export default function HomePage() {
  const navigate = useAppStore(s => s.navigate);
  const [animeData, setAnimeData] = useState<HomeData | null>(null);
  const [trendingAll, setTrendingAll] = useState<TMDBContentItem[]>([]);
  const [trendingMovies, setTrendingMovies] = useState<TMDBContentItem[]>([]);
  const [popularMovies, setPopularMovies] = useState<TMDBContentItem[]>([]);
  const [popularTV, setPopularTV] = useState<TMDBContentItem[]>([]);
  const [topRatedMovies, setTopRatedMovies] = useState<TMDBContentItem[]>([]);
  const [topRatedTV, setTopRatedTV] = useState<TMDBContentItem[]>([]);
  // MegaPlay data
  const [mpSpotlights, setMpSpotlights] = useState<MegaPlayAnimeItem[]>([]);
  const [mpTrending, setMpTrending] = useState<MegaPlayAnimeItem[]>([]);
  const [mpPopular, setMpPopular] = useState<MegaPlayAnimeItem[]>([]);
  const [mpTopRated, setMpTopRated] = useState<MegaPlayAnimeItem[]>([]);
  const [mpTopTen, setMpTopTen] = useState<{ today: MegaPlayAnimeItem[]; week: MegaPlayAnimeItem[]; month: MegaPlayAnimeItem[] } | null>(null);

  const [loading, setLoading] = useState(true);
  const [heroIdx, setHeroIdx] = useState(0);

  useEffect(() => {
    async function load() {
      const promises = [
        fetch("/api/anime/home").then(r => r.ok ? r.json() : null).catch(() => null),
        fetch("/api/tmdb/trending?type=all&time=week").then(r => r.ok ? r.json() : null).catch(() => null),
        fetch("/api/tmdb/trending?type=movie&time=week").then(r => r.ok ? r.json() : null).catch(() => null),
        fetch("/api/tmdb/movies?category=popular").then(r => r.ok ? r.json() : null).catch(() => null),
        fetch("/api/tmdb/tv?category=popular").then(r => r.ok ? r.json() : null).catch(() => null),
        fetch("/api/tmdb/movies?category=top_rated").then(r => r.ok ? r.json() : null).catch(() => null),
        fetch("/api/tmdb/tv?category=top_rated").then(r => r.ok ? r.json() : null).catch(() => null),
        // MegaPlay data
        fetch("/api/megaplay/home").then(r => r.ok ? r.json() : null).catch(() => null),
        fetch("/api/megaplay/top-ten").then(r => r.ok ? r.json() : null).catch(() => null),
      ];

      const [anime, trending, tMovies, pMovies, pTV, trMovies, trTV, mpHome, mpTopTen] = await Promise.all(promises);

      if (anime) setAnimeData(anime);
      if (trending?.results) setTrendingAll(trending.results);
      if (tMovies?.results) setTrendingMovies(tMovies.results);
      if (pMovies?.results) setPopularMovies(pMovies.results);
      if (pTV?.results) setPopularTV(pTV.results);
      if (trMovies?.results) setTopRatedMovies(trMovies.results);
      if (trTV?.results) setTopRatedTV(trTV.results);

      // Parse MegaPlay home data
      if (mpHome?.success && mpHome.results) {
        const r = mpHome.results;
        if (r.spotlights?.length) setMpSpotlights(r.spotlights);
        if (r.trending?.length) setMpTrending(r.trending);
        if (r.popular?.length) setMpPopular(r.popular);
        if (r.topRated?.length) setMpTopRated(r.topRated);
      }

      // Parse MegaPlay top ten
      if (mpTopTen?.success && mpTopTen.results) {
        setMpTopTen(mpTopTen.results);
      }

      setLoading(false);
    }
    load();
  }, []);

  // Hero items — prioritize MegaPlay spotlights, then TMDB, then Miruro
  const heroItems = mpSpotlights.length > 0
    ? mpSpotlights
    : trendingAll.length > 0
      ? trendingAll
      : (animeData?.miruroTrending || []);

  const heroIsAnime = mpSpotlights.length > 0 || (trendingAll.length === 0 && (animeData?.miruroTrending?.length || 0) > 0);

  // Hero carousel auto-advance
  const heroTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (heroItems.length === 0) return;
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
    <div className="space-y-10 fade-in" style={{ marginTop: -70 }}>
      {/* Hero Carousel — 90vh, overlaps navbar */}
      {heroItem && (
        <div className="relative">
          {heroIsAnime ? (
            <AnimeHeroSlide item={heroItem as MegaPlayAnimeItem | MiruroAnimeResult} isActive={true} />
          ) : (
            <HeroSlide item={heroItem as TMDBContentItem} isActive={true} />
          )}

          {/* Hero thumbnails — bottom right */}
          {heroTotal > 1 && !heroIsAnime && (
            <div className="absolute bottom-8 right-6 lg:bottom-12 lg:right-12 hidden lg:flex items-end gap-2 z-10">
              {Array.from({ length: heroTotal }).map((_, i) => {
                const item = heroItems[i] as TMDBContentItem;
                const poster = item?.poster_path ? `https://image.tmdb.org/t/p/w92${item.poster_path}` : "";
                return (
                  <button key={i} onClick={() => setHeroIdx(i)}
                    className={`rounded-lg overflow-hidden transition-all duration-300 border-2 ${
                      i === heroIdx ? "w-14 h-20 border-purple-500 shadow-lg shadow-purple-500/30 scale-110" : "w-10 h-14 border-transparent opacity-50 hover:opacity-80"
                    }`}>
                    {poster ? <img src={poster} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-[#1a1a1a]" />}
                  </button>
                );
              })}
            </div>
          )}

          {/* Progress indicator dots */}
          {heroTotal > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
              {Array.from({ length: heroTotal }).map((_, i) => (
                <button key={i} onClick={() => setHeroIdx(i)} className="group relative flex items-center justify-center">
                  <div className={`h-1 rounded-full transition-all duration-300 ${
                    i === heroIdx ? "w-8 bg-purple-500" : "w-2 bg-white/20 hover:bg-white/40"
                  }`}>
                    {i === heroIdx && (
                      <div className="h-full bg-purple-300 rounded-full" style={{ animation: "carouselProgress 7s linear forwards" }} />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── MegaPlay Top 10 Anime ── */}
      {mpTopTen && (mpTopTen.today?.length > 0 || mpTopTen.week?.length > 0) && (
        <TopTenSection data={mpTopTen} />
      )}

      {/* ── Trending Now (TMDB) ── */}
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

      {/* ── Trending Anime (MegaPlay) ── */}
      {mpTrending.length > 0 && (
        <ContentSection
          title="Trending Anime"
          icon={<svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" /></svg>}
          viewAllAction={() => navigate({ page: "dub" })}
        >
          {mpTrending.slice(0, 20).map((anime, i) => (
            <div key={`mp-t-${anime.id}`} className="shrink-0 w-[140px] sm:w-[160px] lg:w-[180px]">
              <AnimeCard anime={anime as any} index={i} />
            </div>
          ))}
        </ContentSection>
      )}

      {/* ── Popular Movies ── */}
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

      {/* ── Popular TV Shows ── */}
      {popularTV.length > 0 && (
        <ContentSection
          title="Popular TV Shows"
          icon={<svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="2" y="7" width="20" height="15" rx="2" ry="2" /><polyline points="17 2 12 7 7 2" /></svg>}
        >
          {popularTV.slice(0, 20).map((item, i) => (
            <div key={item.id} className="shrink-0 w-[140px] sm:w-[160px] lg:w-[180px]">
              <AnimeCard tmdbItem={{ ...item, media_type: "tv" }} index={i} />
            </div>
          ))}
        </ContentSection>
      )}

      {/* ── Popular Anime (MegaPlay) ── */}
      {mpPopular.length > 0 && (
        <ContentSection
          title="Popular Anime"
          icon={<svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>}
        >
          {mpPopular.slice(0, 20).map((anime, i) => (
            <div key={`mp-p-${anime.id}`} className="shrink-0 w-[140px] sm:w-[160px] lg:w-[180px]">
              <AnimeCard anime={anime as any} index={i} />
            </div>
          ))}
        </ContentSection>
      )}

      {/* ── Anime Trending (Miruro fallback) ── */}
      {animeData?.miruroTrending && animeData.miruroTrending.length > 0 && mpTrending.length === 0 && (
        <ContentSection
          title="Trending Anime"
          icon={<svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" /></svg>}
        >
          {animeData!.miruroTrending.slice(0, 20).map((anime, i) => (
            <div key={anime.id} className="shrink-0 w-[140px] sm:w-[160px] lg:w-[180px]">
              <AnimeCard anime={anime} index={i} />
            </div>
          ))}
        </ContentSection>
      )}

      {/* ── Top Rated Movies ── */}
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

      {/* ── Top Rated TV ── */}
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

      {/* ── Top Rated Anime (MegaPlay) ── */}
      {mpTopRated.length > 0 && (
        <ContentSection
          title="Top Rated Anime"
          icon={<svg className="w-5 h-5 text-amber-300" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>}
        >
          {mpTopRated.slice(0, 20).map((anime, i) => (
            <div key={`mp-tr-${anime.id}`} className="shrink-0 w-[140px] sm:w-[160px] lg:w-[180px]">
              <AnimeCard anime={anime as any} index={i} />
            </div>
          ))}
        </ContentSection>
      )}

      {/* ── Anime Popular (Miruro fallback) ── */}
      {animeData?.miruroPopular && animeData.miruroPopular.length > 0 && mpPopular.length === 0 && (
        <ContentSection
          title="Popular Anime"
          icon={<svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>}
        >
          {animeData!.miruroPopular.slice(0, 20).map((anime, i) => (
            <div key={anime.id} className="shrink-0 w-[140px] sm:w-[160px] lg:w-[180px]">
              <AnimeCard anime={anime} index={i} />
            </div>
          ))}
        </ContentSection>
      )}

      {/* ── Recently Updated Anime ── */}
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

      {/* ── Trending Movies ── */}
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

      {/* ── Grid: Top Anime ── */}
      {(mpTrending.length > 0 || animeData?.miruroTrending?.length) && (
        <section className="space-y-3">
          <div className="section-header flex items-center gap-2">
            <svg className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
            <h2 className="text-base sm:text-lg font-bold text-white">Top Anime</h2>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3">
            {(mpTrending.length > 0 ? mpTrending : animeData!.miruroTrending).slice(0, 14).map((anime, i) => (
              <AnimeCard key={anime.id} anime={anime as any} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* ── Empty State ── */}
      {!animeData?.trending?.length && !trendingAll.length && !mpTrending.length && !animeData?.miruroTrending?.length && (
        <div className="text-center py-20 rounded-2xl bg-[#0a0a0a] border border-white/[0.04] p-8">
          <p className="text-zinc-400 text-sm">No content available. Try refreshing the page...</p>
        </div>
      )}
    </div>
  );
}

// ── Top 10 Section with tabs ──
function TopTenSection({ data }: { data: { today: MegaPlayAnimeItem[]; week: MegaPlayAnimeItem[]; month: MegaPlayAnimeItem[] } }) {
  const [tab, setTab] = useState<"today" | "week" | "month">("today");
  const navigate = useAppStore(s => s.navigate);
  const items = data[tab] || [];

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="section-header flex items-center gap-2">
          <svg className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
          <h2 className="text-base sm:text-lg font-bold text-white">Top 10 Anime</h2>
        </div>
        <div className="flex items-center gap-1 bg-[#1a1a1a] rounded-full p-0.5 border border-white/[0.06]">
          {(["today", "week", "month"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 text-[11px] font-bold rounded-full transition-all ${
                tab === t ? "bg-amber-500/15 text-amber-300" : "text-zinc-500 hover:text-zinc-300"
              }`}>
              {t === "today" ? "Today" : t === "week" ? "This Week" : "This Month"}
            </button>
          ))}
        </div>
      </div>

      <div className="scroll-container flex gap-3 overflow-x-auto pb-2">
        {items.slice(0, 10).map((anime, i) => {
          const title = anime.title?.english || anime.title?.romaji || "Unknown";
          const image = anime.coverImage?.large || anime.coverImage?.medium || "";
          const score = anime.averageScore;
          return (
            <button
              key={`top10-${anime.id}`}
              onClick={() => navigate({ page: "anime", id: String(anime.id) })}
              className="shrink-0 w-[140px] sm:w-[160px] lg:w-[180px] text-left group"
            >
              <div className="relative aspect-[2/3] overflow-hidden bg-[#1a1a1a] rounded-xl">
                {image && <img src={image} alt={title} className="w-full h-full object-cover transition-all duration-500 group-hover:scale-110" loading="lazy" />}
                {/* Rank number */}
                <div className="absolute top-0 left-0 w-8 h-10 flex items-center justify-center bg-gradient-to-br from-amber-500 to-orange-600 rounded-br-xl">
                  <span className="text-white text-sm font-black">{i + 1}</span>
                </div>
                {/* Score */}
                {score && score > 0 && (
                  <div className="absolute top-2 right-2 bg-[#000000]/80 backdrop-blur-sm rounded-md px-1.5 py-0.5 text-[10px] font-bold text-emerald-400">
                    {(score > 10 ? score / 10 : score).toFixed(1)}
                  </div>
                )}
                {/* Bottom gradient */}
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#000000] to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-2">
                  <p className="text-[11px] font-semibold text-white line-clamp-2">{title}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
