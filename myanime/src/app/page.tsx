"use client";

import { useEffect, useState, useSyncExternalStore, useMemo, useRef, useCallback } from "react";
import { useAppStore, parseHash } from "@/components/anime/store";
import Navbar from "@/components/anime/navbar";
import HomePage from "@/components/anime/home-page";
import SearchPage from "@/components/anime/search-page";
import AnimeDetailPage from "@/components/anime/anime-detail";
import WatchPage from "@/components/anime/watch-page";
import GenrePage from "@/components/anime/genre-page";
import BookmarksPage from "@/components/anime/bookmarks-page";
import HistoryPage from "@/components/anime/history-page";
import AnimeHomePage from "@/components/anime/anime-home";
import MoviesPage from "@/components/anime/movies-page";
import TVPage from "@/components/anime/tv-page";
import MovieDetailPage from "@/components/anime/movie-detail";
import TVDetailPage from "@/components/anime/tv-detail";
import MovieWatchPage from "@/components/anime/movie-watch";
import TVWatchPage from "@/components/anime/tv-watch";
import MangaPage from "@/components/anime/manga-page";
import MangaDetailPage from "@/components/anime/manga-detail";
import MangaReader from "@/components/anime/manga-reader";

const emptySubscribe = () => () => {};
function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

// ================================================================
// NETFLIX-STYLE CINEMATIC INTRO — "GOANIME"
// Phases: dark → letters-in → light-streak → logo-glow → zoom-out → reveal
// Inspired by Netflix/HBO/D+ splash screens
// GPU-accelerated, 60fps, with skip button
// ================================================================

const BRAND_LETTERS = ['G', 'O', 'A', 'N', 'I', 'M', 'E'];

function NetflixIntro({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<'dark' | 'letters' | 'streak' | 'glow' | 'zoom' | 'reveal'>('dark');
  const onCompleteRef = useRef(onComplete);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { onCompleteRef.current = onComplete; });

  const skip = useCallback(() => {
    onCompleteRef.current();
  }, []);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase('letters'),  800),   // 0.8s darkness
      setTimeout(() => setPhase('streak'),    3200),  // letters settle 2.4s
      setTimeout(() => setPhase('glow'),      4400),  // streak sweep 1.2s
      setTimeout(() => setPhase('zoom'),      5600),  // glow pulse 1.2s
      setTimeout(() => setPhase('reveal'),    6200),  // zoom out 0.6s
      setTimeout(() => onCompleteRef.current(), 7000), // fade complete 0.8s
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  // Ambient floating particles for cinematic depth
  const ambientParticles = useMemo(() =>
    Array.from({ length: 35 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 0.5 + Math.random() * 2,
      duration: 4 + Math.random() * 8,
      delay: Math.random() * 3,
      opacity: 0.06 + Math.random() * 0.15,
      drift: (Math.random() - 0.5) * 30,
    }))
  , []);

  // Spark particles for the streak phase
  const streakSparks = useMemo(() =>
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      y: 30 + Math.random() * 40,
      size: 1 + Math.random() * 3,
      delay: 0.3 + Math.random() * 0.8,
      duration: 0.3 + Math.random() * 0.5,
      color: i % 3 === 0 ? '#00A8E1' : i % 3 === 1 ? '#67d8ef' : '#ffffff',
    }))
  , []);

  return (
    <div ref={containerRef} className="fixed inset-0 z-[9999] bg-black overflow-hidden">
      {/* ── Cinematic vignette ── */}
      <div className="netflix-vignette" />

      {/* ── Film grain overlay ── */}
      <div className="netflix-grain" />

      {/* ── Ambient floating particles ── */}
      {phase !== 'reveal' && (
        <div className="netflix-ambient-container">
          {ambientParticles.map(p => (
            <div
              key={p.id}
              className="netflix-ambient-particle"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                width: `${p.size}px`,
                height: `${p.size}px`,
                '--particle-dur': `${p.duration}s`,
                '--particle-delay': `${p.delay}s`,
                '--particle-drift': `${p.drift}px`,
                opacity: p.opacity,
              } as React.CSSProperties}
            />
          ))}
        </div>
      )}

      {/* ── Deep red ambient glow (like Netflix) ── */}
      {(phase === 'letters' || phase === 'streak' || phase === 'glow') && (
        <div className="netflix-ambient-glow" />
      )}

      {/* ════════════════════════════════════════════════
          ══ LETTER-BY-LETTER REVEAL — Netflix style ══
          ════════════════════════════════════════════════ */}
      {phase !== 'dark' && phase !== 'reveal' && (
        <div className={`netflix-logo-container ${
          phase === 'zoom' ? 'netflix-logo-zoom' : ''
        }`}>
          {/* ── The "GOANIME" letters ── */}
          <div className="netflix-letters-row">
            {BRAND_LETTERS.map((letter, i) => (
              <span
                key={i}
                className={`netflix-letter netflix-letter-${i} ${
                  phase === 'letters' || phase === 'streak' || phase === 'glow' || phase === 'zoom' ? 'netflix-letter-visible' : ''
                } ${phase === 'glow' ? 'netflix-letter-glowing' : ''} ${phase === 'zoom' ? 'netflix-letter-zooming' : ''}`}
                style={{
                  '--letter-index': i,
                  '--letter-delay': `${0.3 + i * 0.15}s`,
                } as React.CSSProperties}
              >
                {letter}
              </span>
            ))}
          </div>

          {/* ── Tagline under the logo ── */}
          <div className={`netflix-tagline ${phase === 'glow' ? 'netflix-tagline-visible' : ''}`}>
            Anime &bull; Movies &bull; TV
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════
          ══ HORIZONTAL LIGHT STREAK — Netflix-style ══
          ════════════════════════════════════════════════ */}
      {phase === 'streak' && (
        <>
          <div className="netflix-light-streak" />
          {/* Sparks trailing the streak */}
          {streakSparks.map(s => (
            <div
              key={s.id}
              className="netflix-streak-spark"
              style={{
                top: `${s.y}%`,
                width: `${s.size}px`,
                height: `${s.size}px`,
                backgroundColor: s.color,
                boxShadow: `0 0 ${s.size * 3}px ${s.color}`,
                '--spark-delay': `${s.delay}s`,
                '--spark-dur': `${s.duration}s`,
              } as React.CSSProperties}
            />
          ))}
        </>
      )}

      {/* ════════════════════════════════════════════════
          ══ GLOW PULSE — logo radiates energy ══
          ════════════════════════════════════════════════ */}
      {phase === 'glow' && (
        <>
          <div className="netflix-glow-pulse" />
          <div className="netflix-glow-ring" />
        </>
      )}

      {/* ════════════════════════════════════════════════
          ══ ZOOM — logo zooms toward camera ══
          ════════════════════════════════════════════════ */}
      {phase === 'zoom' && (
        <div className="netflix-zoom-flash" />
      )}

      {/* ════════════════════════════════════════════════
          ══ REVEAL — smooth fade to main content ══
          ════════════════════════════════════════════════ */}
      {phase === 'reveal' && (
        <div className="netflix-reveal-overlay" />
      )}

      {/* ── Skip Button ── */}
      <button
        onClick={skip}
        className="netflix-skip-btn"
        aria-label="Skip intro"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="mr-1">
          <path d="M5 4l10 8-10 8V4z" />
          <rect x="17" y="5" width="2" height="14" />
        </svg>
        Skip
      </button>
    </div>
  );
}

export default function MainPage() {
  const { route, navigate } = useAppStore();
  const mounted = useMounted();
  const [showSplash, setShowSplash] = useState(true);
  const [splashComplete, setSplashComplete] = useState(false);

  // Hash-based routing
  useEffect(() => {
    const handleHash = () => {
      const newRoute = parseHash(window.location.hash);
      const current = useAppStore.getState().route;
      if (JSON.stringify(current) !== JSON.stringify(newRoute)) {
        useAppStore.setState({ route: newRoute });
      }
    };
    handleHash();
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  // Keyboard shortcut: Cmd/Ctrl+K to focus search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        navigate({ page: "search" });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate]);

  const handleSplashComplete = () => {
    setSplashComplete(true);
    setTimeout(() => setShowSplash(false), 500);
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#0b1116] flex items-center justify-center">
        <div className="text-center space-y-5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mx-auto shadow-lg shadow-cyan-500/20 animate-pulse">
            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </div>
          <div className="space-y-1">
            <p className="text-cyan-400 text-sm font-bold">GoAnime</p>
            <p className="text-zinc-600 text-xs">Loading...</p>
          </div>
          <div className="w-32 h-1 bg-[#1a2530] mx-auto rounded-full overflow-hidden">
            <div className="h-full bg-cyan-500/60 animate-pulse rounded-full" style={{ width: "60%" }} />
          </div>
        </div>
      </div>
    );
  }

  const isWatchPage = route.page === "watch" || route.page === "movie-watch" || route.page === "tv-watch";
  const isMangaReader = route.page === "manga-read";

  const renderPage = () => {
    switch (route.page) {
      case "home": return <HomePage />;
      case "search": return <SearchPage initialQuery={route.query} />;
      case "anime": return <AnimeDetailPage animeId={route.id} />;
      case "watch": return <WatchPage animeId={route.id} episodeNum={route.episode} />;
      case "genre": return <GenrePage genre={route.genre} />;
      case "dub": return <AnimeHomePage />;
      case "bookmarks": return <BookmarksPage />;
      case "history": return <HistoryPage />;
      case "movies": return <MoviesPage />;
      case "tv": return <TVPage />;
      case "manga": return <MangaPage />;
      case "manga-detail": return <MangaDetailPage mangaId={route.id} />;
      case "manga-read": return <MangaReader mangaId={route.id} chapterId={route.chapterId} />;
      case "movie-detail": return <MovieDetailPage movieId={route.id} />;
      case "tv-detail": return <TVDetailPage tvId={route.id} />;
      case "movie-watch": return <MovieWatchPage movieId={route.id} />;
      case "tv-watch": return <TVWatchPage tvId={route.id} season={route.season} episode={route.episode} />;
      default: return <HomePage />;
    }
  };

  return (
    <>
      {/* Splash Screen */}
      {showSplash && (
        <div className={splashComplete ? "splash-scale-out" : ""}>
          <NetflixIntro onComplete={handleSplashComplete} />
        </div>
      )}

      {/* Main Content */}
      <div className={`min-h-screen bg-[#0b1116] flex flex-col ${!showSplash ? "content-reveal" : "opacity-0"}`}>
        {!isMangaReader && <Navbar />}
        <main className={`max-w-[1400px] mx-auto px-4 lg:px-8 ${isMangaReader ? '' : 'pt-[75px]'} ${isWatchPage || isMangaReader ? "" : "pb-24 lg:pb-12"} flex-1`}>
          {renderPage()}
        </main>
        {!isWatchPage && !isMangaReader && (
          <footer className="border-t border-white/[0.04] mt-16 bg-[#0b1116]">
            <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-12">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                <div className="col-span-2 md:col-span-1">
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                      <svg className="w-4.5 h-4.5 text-white" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                    </div>
                    <span className="text-base font-bold gradient-text">GoAnime</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 leading-relaxed mb-4">All-in-one streaming platform for anime, movies, TV shows and manga. Content sourced from third-party providers.</p>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/[0.03] rounded-lg border border-white/[0.05]">
                      <svg className="w-4 h-4 text-emerald-400" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth={1.5} fill="none" />
                      </svg>
                      <span className="text-[9px] font-bold text-zinc-400">TMDB</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/[0.03] rounded-lg border border-white/[0.05]">
                      <svg className="w-4 h-4 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
                        <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                      </svg>
                      <span className="text-[9px] font-bold text-zinc-400">AniList</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-zinc-300 mb-4 uppercase tracking-wider">Discover</h4>
                  <div className="space-y-2.5">
                    <button onClick={() => navigate({ page: "home" })} className="block text-xs text-zinc-500 hover:text-cyan-400 transition-colors">Home</button>
                    <button onClick={() => navigate({ page: "movies" })} className="block text-xs text-zinc-500 hover:text-cyan-400 transition-colors">Movies</button>
                    <button onClick={() => navigate({ page: "tv" })} className="block text-xs text-zinc-500 hover:text-cyan-400 transition-colors">TV Shows</button>
                    <button onClick={() => navigate({ page: "dub" })} className="block text-xs text-zinc-500 hover:text-cyan-400 transition-colors">Anime</button>
                    <button onClick={() => navigate({ page: "manga" })} className="block text-xs text-zinc-500 hover:text-cyan-400 transition-colors">Manga</button>
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-zinc-300 mb-4 uppercase tracking-wider">Account</h4>
                  <div className="space-y-2.5">
                    <button onClick={() => navigate({ page: "bookmarks" })} className="block text-xs text-zinc-500 hover:text-cyan-400 transition-colors">My List</button>
                    <button onClick={() => navigate({ page: "history" })} className="block text-xs text-zinc-500 hover:text-cyan-400 transition-colors">Watch History</button>
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-zinc-300 mb-4 uppercase tracking-wider">Support</h4>
                  <div className="space-y-2.5">
                    <span className="block text-xs text-zinc-600">GoAnime v4.0</span>
                    <span className="block text-xs text-zinc-600">We do not host any files</span>
                  </div>
                </div>
              </div>
              <div className="section-divider mt-10 mb-6" />
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-[10px] text-zinc-700">&copy; {new Date().getFullYear()} GoAnime. All rights reserved.</p>
                <p className="text-[10px] text-zinc-700">Powered by TMDB &amp; AniList &bull; Content from third-party providers</p>
              </div>
            </div>
          </footer>
        )}
      </div>
    </>
  );
}
