"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAppStore, getAnimeTitle, getAnimeImage } from "./store";
import AnimeCard from "./anime-card";
import type { MiruroAnimeResult } from "@/lib/miruro-api";

type Language = "sub" | "dub" | "hindi";

const ANIME_GENRES = [
  "Action", "Adventure", "Comedy", "Drama", "Fantasy", "Horror",
  "Mystery", "Romance", "Sci-Fi", "Slice of Life", "Sports",
  "Supernatural", "Thriller", "Ecchi", "Mecha", "Psychological",
  "Shounen", "Seinen", "Shoujo", "Isekai",
];

const SEASONS = [
  { label: "Spring 2026", season: "SPRING", year: 2026 },
  { label: "Winter 2026", season: "WINTER", year: 2026 },
  { label: "Fall 2025", season: "FALL", year: 2025 },
  { label: "Summer 2025", season: "SUMMER", year: 2025 },
  { label: "Spring 2025", season: "SPRING", year: 2025 },
];

// Map AniList media to MiruroAnimeResult format for compatibility with AnimeCard
function mapAniListToMiruro(items: any[]): MiruroAnimeResult[] {
  return items.map(item => ({
    id: item.id,
    title: {
      romaji: item.title?.romaji,
      english: item.title?.english,
      native: item.title?.native,
    },
    coverImage: {
      extraLarge: item.coverImage?.extraLarge,
      large: item.coverImage?.large,
      medium: item.coverImage?.medium,
      color: item.coverImage?.color,
    },
    bannerImage: item.bannerImage,
    type: item.type,
    format: item.format,
    status: item.status,
    description: item.description,
    season: item.season,
    seasonYear: item.seasonYear,
    episodes: item.episodes,
    duration: item.duration,
    genres: item.genres,
    averageScore: item.averageScore,
    popularity: item.popularity,
    trending: item.trending,
    countryOfOrigin: item.countryOfOrigin,
    isAdult: item.isAdult,
  }));
}

// Normalize any anime result to MiruroAnimeResult format
// Handles both AniList format and already-Miruro format
function normalizeAnimeItem(item: any): MiruroAnimeResult {
  // If it already has AniList-style title object with romaji, it came from AniList
  if (item.title?.romaji !== undefined || item.title?.english !== undefined) {
    return {
      id: item.id,
      title: {
        romaji: item.title?.romaji,
        english: item.title?.english,
        native: item.title?.native,
      },
      coverImage: item.coverImage ? {
        extraLarge: item.coverImage?.extraLarge,
        large: item.coverImage?.large,
        medium: item.coverImage?.medium,
        color: item.coverImage?.color,
      } : undefined,
      bannerImage: item.bannerImage,
      type: item.type,
      format: item.format,
      status: item.status,
      description: item.description,
      season: item.season,
      seasonYear: item.seasonYear,
      episodes: item.episodes,
      duration: item.duration,
      genres: item.genres,
      averageScore: item.averageScore,
      popularity: item.popularity,
      trending: item.trending,
      countryOfOrigin: item.countryOfOrigin,
      isAdult: item.isAdult,
    };
  }
  // Already in Miruro format
  return item as MiruroAnimeResult;
}

function ContentSection({ title, children, icon }: { title: string; children: React.ReactNode; icon?: React.ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null);

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
          <button onClick={() => scroll("left")} className="scroll-btn p-2 text-zinc-500 hover:text-white bg-[#1a2530]/80 hover:bg-cyan-500/20 rounded-full transition-all backdrop-blur-sm border border-white/[0.06]">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M15 19l-7-7 7-7" /></svg>
          </button>
          <button onClick={() => scroll("right")} className="scroll-btn p-2 text-zinc-500 hover:text-white bg-[#1a2530]/80 hover:bg-cyan-500/20 rounded-full transition-all backdrop-blur-sm border border-white/[0.06]">
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

export default function AnimeHomePage() {
  const navigate = useAppStore(s => s.navigate);
  const [trending, setTrending] = useState<MiruroAnimeResult[]>([]);
  const [popular, setPopular] = useState<MiruroAnimeResult[]>([]);
  const [recent, setRecent] = useState<MiruroAnimeResult[]>([]);
  const [topRated, setTopRated] = useState<MiruroAnimeResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeLang, setActiveLang] = useState<Language>("sub");
  const [activeGenre, setActiveGenre] = useState<string | null>(null);
  const [activeSeason, setActiveSeason] = useState<string | null>(null);
  const [genreResults, setGenreResults] = useState<MiruroAnimeResult[]>([]);
  const [seasonResults, setSeasonResults] = useState<MiruroAnimeResult[]>([]);

  // Load main data with 3-LAYER FALLBACK: AniList → MAL → Miruro
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        // Fetch from both endpoints — both now have 3-layer fallback built in
        const [alRes, homeRes] = await Promise.all([
          fetch("/api/anime/anilist-trending").catch(() => null),
          fetch("/api/anime/home").catch(() => null),
        ]);

        // Parse anilist-trending data (trending, popular, topRated with 3-layer fallback)
        let alData: any = null;
        if (alRes?.ok) {
          try { alData = await alRes.json(); } catch { alData = null; }
        }

        // Parse home data (miruroTrending, miruroPopular, miruroRecent with 3-layer fallback)
        let homeData: any = null;
        if (homeRes?.ok) {
          try { homeData = await homeRes.json(); } catch { homeData = null; }
        }

        // ---- TRENDING: Combine from both sources ----
        const alTrending = alData?.trending || [];
        const homeTrending = homeData?.miruroTrending || [];

        if (alTrending.length > 0) {
          setTrending(mapAniListToMiruro(alTrending));
        } else if (homeTrending.length > 0) {
          setTrending(homeTrending.map(normalizeAnimeItem));
        }

        // ---- POPULAR: Combine from both sources ----
        const alPopular = alData?.popular || [];
        const homePopular = homeData?.miruroPopular || [];

        if (alPopular.length > 0) {
          setPopular(mapAniListToMiruro(alPopular));
        } else if (homePopular.length > 0) {
          setPopular(homePopular.map(normalizeAnimeItem));
        }

        // ---- TOP RATED: From anilist-trending (has 3-layer fallback) ----
        const alTopRated = alData?.topRated || [];
        if (alTopRated.length > 0) {
          setTopRated(mapAniListToMiruro(alTopRated));
        } else if (homePopular.length > 0) {
          // Fallback: use popular as top rated proxy
          setTopRated(homePopular.map(normalizeAnimeItem));
        }

        // ---- RECENT: From home data (Miruro primary, Jikan airing backup) ----
        const homeRecent = homeData?.miruroRecent || [];
        if (homeRecent.length > 0) {
          setRecent(homeRecent.map(normalizeAnimeItem));
        } else if (alTrending.length > 0) {
          // Last resort: use trending as recent proxy
          setRecent(mapAniListToMiruro(alTrending).slice(0, 10));
        }

      } catch (err) {
        console.error("[AnimeHome] Load error:", err);
      }
      setLoading(false);
    }
    load();
  }, []);

  // Load genre anime
  useEffect(() => {
    if (!activeGenre) { return; }
    async function loadGenre() {
      try {
        const res = await fetch(`/api/anime/genre?genre=${encodeURIComponent(activeGenre)}`);
        if (res.ok) {
          const data = await res.json();
          // Convert AllAnime results to Miruro format if needed
          setGenreResults((data.anime || data.results || []).map((a: any) => ({
            id: a.id || a._id,
            title: { romaji: a.name, english: a.englishName || a.name },
            coverImage: { extraLarge: a.thumbnail, large: a.thumbnail },
            averageScore: a.score ? a.score * 10 : undefined,
            type: a.type,
            status: a.status,
            genres: a.genres,
          })));
        }
      } catch { /* ignore */ }
    }
    loadGenre();
  }, [activeGenre]);

  // Load season anime — use AniList API directly with Jikan fallback
  useEffect(() => {
    if (!activeSeason) { return; }
    async function loadSeason() {
      try {
        const seasonData = SEASONS.find(s => s.label === activeSeason);
        if (!seasonData) return;
        const res = await fetch(`/api/anime/anilist-trending?section=season&season=${seasonData.season}&year=${seasonData.year}`);
        if (res.ok) {
          const data = await res.json();
          if (data.season?.length > 0) {
            setSeasonResults(mapAniListToMiruro(data.season));
          } else {
            // Try Miruro trending and filter
            const mRes = await fetch(`/api/anime/home`);
            if (mRes.ok) {
              const mData = await mRes.json();
              const all = mData.miruroTrending || [];
              setSeasonResults(all.filter((a: MiruroAnimeResult) =>
                a.season?.toUpperCase() === seasonData.season && a.seasonYear === seasonData.year
              ));
            }
          }
        }
      } catch { /* ignore */ }
    }
    loadSeason();
  }, [activeSeason]);

  // Check if we have ANY data at all
  const hasAnyData = trending.length > 0 || popular.length > 0 || recent.length > 0 || topRated.length > 0;

  return (
    <div className="space-y-8 fade-in">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/25">
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
              <path d="M8 14s1.5 2 4 2 4-2 4-2" />
              <line x1="9" y1="9" x2="9.01" y2="9" />
              <line x1="15" y1="9" x2="15.01" y2="9" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Anime</h1>
            <p className="text-xs text-zinc-500">Stream sub, dub & Hindi anime</p>
          </div>
        </div>

        {/* Language Filter */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-zinc-600 uppercase tracking-wider font-bold shrink-0">Language</span>
          <div className="flex items-center gap-1 bg-[#1a2530] rounded-full p-0.5 border border-white/[0.06]">
            {(["sub", "dub", "hindi"] as const).map(lang => (
              <button
                key={lang}
                onClick={() => setActiveLang(lang)}
                className={`px-4 py-1.5 text-[11px] font-bold rounded-full transition-all ${
                  activeLang === lang
                    ? lang === "sub" ? "bg-cyan-500/15 text-cyan-300" : lang === "dub" ? "bg-violet-500/15 text-violet-300" : "bg-orange-500/15 text-orange-300"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {lang.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Genre Filter */}
        <div className="scroll-container flex gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveGenre(null)}
            className={`shrink-0 px-3 py-1.5 text-[10px] font-bold rounded-full transition-all border ${
              !activeGenre
                ? "bg-cyan-500/15 border-cyan-500/20 text-cyan-300"
                : "bg-[#1a2530] border-white/[0.04] text-zinc-500 hover:text-zinc-300"
            }`}
          >
            All
          </button>
          {ANIME_GENRES.map(genre => (
            <button
              key={genre}
              onClick={() => setActiveGenre(activeGenre === genre ? null : genre)}
              className={`shrink-0 px-3 py-1.5 text-[10px] font-bold rounded-full transition-all border ${
                activeGenre === genre
                  ? "bg-cyan-500/15 border-cyan-500/20 text-cyan-300"
                  : "bg-[#1a2530] border-white/[0.04] text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {genre}
            </button>
          ))}
        </div>

        {/* Season Filter */}
        <div className="scroll-container flex gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveSeason(null)}
            className={`shrink-0 px-3 py-1.5 text-[10px] font-bold rounded-full transition-all border ${
              !activeSeason
                ? "bg-cyan-500/15 border-cyan-500/20 text-cyan-300"
                : "bg-[#1a2530] border-white/[0.04] text-zinc-500 hover:text-zinc-300"
            }`}
          >
            All Seasons
          </button>
          {SEASONS.map(s => (
            <button
              key={s.label}
              onClick={() => setActiveSeason(activeSeason === s.label ? null : s.label)}
              className={`shrink-0 px-3 py-1.5 text-[10px] font-bold rounded-full transition-all border ${
                activeSeason === s.label
                  ? "bg-cyan-500/15 border-cyan-500/20 text-cyan-300"
                  : "bg-[#1a2530] border-white/[0.04] text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Genre Results */}
      {activeGenre && genreResults.length > 0 && (
        <div className="space-y-3">
          <div className="section-header flex items-center gap-2">
            <h2 className="text-base font-bold text-white">{activeGenre} Anime</h2>
            <span className="text-xs text-zinc-500">({genreResults.length})</span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3">
            {genreResults.map((anime, i) => (
              <AnimeCard key={anime.id} anime={anime} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* Season Results */}
      {activeSeason && seasonResults.length > 0 && (
        <div className="space-y-3">
          <div className="section-header flex items-center gap-2">
            <h2 className="text-base font-bold text-white">{activeSeason}</h2>
            <span className="text-xs text-zinc-500">({seasonResults.length})</span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3">
            {seasonResults.map((anime, i) => (
              <AnimeCard key={anime.id} anime={anime} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3">
          {Array.from({ length: 14 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] skeleton rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          {/* Trending Anime */}
          {trending.length > 0 && (
            <ContentSection
              title="Trending Anime"
              icon={<svg className="w-5 h-5 text-cyan-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" /></svg>}
            >
              {trending.slice(0, 20).map((anime, i) => (
                <div key={`${anime.id}-${i}`} className="shrink-0 w-[140px] sm:w-[160px] lg:w-[180px]">
                  <AnimeCard anime={anime} index={i} />
                </div>
              ))}
            </ContentSection>
          )}

          {/* Popular Anime */}
          {popular.length > 0 && (
            <ContentSection
              title="Popular Anime"
              icon={<svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>}
            >
              {popular.slice(0, 20).map((anime, i) => (
                <div key={`${anime.id}-${i}`} className="shrink-0 w-[140px] sm:w-[160px] lg:w-[180px]">
                  <AnimeCard anime={anime} index={i} />
                </div>
              ))}
            </ContentSection>
          )}

          {/* Recently Updated */}
          {recent.length > 0 && (
            <ContentSection
              title="Recently Updated"
              icon={<svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>}
            >
              {recent.slice(0, 20).map((anime, i) => (
                <div key={`${anime.id}-${i}`} className="shrink-0 w-[140px] sm:w-[160px] lg:w-[180px]">
                  <AnimeCard anime={anime} index={i} />
                </div>
              ))}
            </ContentSection>
          )}

          {/* Top Rated */}
          {topRated.length > 0 && (
            <section className="space-y-3">
              <div className="section-header flex items-center gap-2">
                <svg className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                <h2 className="text-base sm:text-lg font-bold text-white">Top Rated</h2>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3">
                {topRated.slice(0, 14).map((anime, i) => (
                  <AnimeCard key={`top-${anime.id}-${i}`} anime={anime} index={i} />
                ))}
              </div>
            </section>
          )}

          {/* Fallback: Show popular as Top Rated if no topRated */}
          {topRated.length === 0 && popular.length > 0 && (
            <section className="space-y-3">
              <div className="section-header flex items-center gap-2">
                <svg className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                <h2 className="text-base sm:text-lg font-bold text-white">Top Rated</h2>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3">
                {popular.slice(0, 14).map((anime, i) => (
                  <AnimeCard key={`top-${anime.id}-${i}`} anime={anime} index={i} />
                ))}
              </div>
            </section>
          )}

          {/* Empty State with retry */}
          {!hasAnyData && (
            <div className="text-center py-20 bg-[#151f2e] rounded-2xl border border-white/[0.04]">
              <div className="space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-cyan-500/10 flex items-center justify-center">
                  <svg className="w-8 h-8 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                </div>
                <p className="text-zinc-400 text-sm">Loading anime from backup sources...</p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 text-xs font-bold bg-cyan-500/15 text-cyan-300 rounded-full hover:bg-cyan-500/25 transition-all border border-cyan-500/20"
                >
                  Refresh Page
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
