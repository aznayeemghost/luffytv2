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
// SMOOTH CINEMATIC INTRO — "LUFFY TV"
// Fluid, buttery-smooth animation inspired by Netflix/HBO/D+
// No chunky phase jumps — continuous CSS-driven transitions
// ================================================================

const BRAND_PARTS = [
  { letters: ['L', 'U', 'F', 'F', 'Y'], gap: 2 },
  { letters: ['T', 'V'], gap: 6 },
];

function LuffyIntro({ onComplete }: { onComplete: () => void }) {
  const onCompleteRef = useRef(onComplete);
  const [started, setStarted] = useState(false);
  const [showStreak, setShowStreak] = useState(false);
  const [showGlow, setShowGlow] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => { onCompleteRef.current = onComplete; });

  const skip = useCallback(() => {
    if (!visible) return;
    setVisible(false);
    onCompleteRef.current();
  }, [visible]);

  // Smooth timed sequence — longer, more relaxed pacing
  useEffect(() => {
    const timers = [
      setTimeout(() => setStarted(true),      600),   // brief dark hold
      setTimeout(() => setShowStreak(true),    2800),  // letters settle ~2.2s
      setTimeout(() => setShowStreak(false),   3600),  // streak sweeps ~0.8s
      setTimeout(() => setShowGlow(true),      3800),  // glow starts
      setTimeout(() => setFadeOut(true),       4800),  // glow ~1s then start fade
      setTimeout(() => setVisible(false),      5600),  // fade completes ~0.8s
      setTimeout(() => onCompleteRef.current(),5700),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  // Fewer, softer ambient particles
  const ambientParticles = useMemo(() =>
    Array.from({ length: 18 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 0.8 + Math.random() * 1.5,
      duration: 6 + Math.random() * 10,
      delay: Math.random() * 4,
      opacity: 0.04 + Math.random() * 0.08,
      drift: (Math.random() - 0.5) * 20,
    }))
  , []);

  // Build flat letter array with spacing info
  const letterItems = useMemo(() => {
    const items: { letter: string; delay: number; spaceBefore: number }[] = [];
    let delay = 0;
    BRAND_PARTS.forEach((part, pi) => {
      part.letters.forEach((letter, li) => {
        items.push({
          letter,
          delay,
          spaceBefore: (pi > 0 && li === 0) ? part.gap : 0,
        });
        delay += 0.12;
      });
    });
    return items;
  }, []);

  return (
    <div className={`luffy-intro ${fadeOut ? 'luffy-intro-fadeout' : ''} ${!visible ? 'luffy-intro-gone' : ''}`}>
      {/* ── Soft vignette ── */}
      <div className="luffy-vignette" />

      {/* ── Ambient particles (fewer, softer) ── */}
      {started && !fadeOut && (
        <div className="luffy-particles">
          {ambientParticles.map(p => (
            <div
              key={p.id}
              className="luffy-particle"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                width: `${p.size}px`,
                height: `${p.size}px`,
                '--p-dur': `${p.duration}s`,
                '--p-delay': `${p.delay}s`,
                '--p-drift': `${p.drift}px`,
                opacity: p.opacity,
              } as React.CSSProperties}
            />
          ))}
        </div>
      )}

      {/* ── Subtle ambient glow ── */}
      {started && !fadeOut && <div className="luffy-ambient-glow" />}

      {/* ═══════════════════════════════════════════
          ══ LETTERS — smooth, elegant reveal ══
          ═══════════════════════════════════════════ */}
      {started && (
        <div className={`luffy-logo-wrap ${showGlow ? 'luffy-logo-glow' : ''} ${fadeOut ? 'luffy-logo-exit' : ''}`}>
          <div className="luffy-letters">
            {letterItems.map((item, i) => (
              <span
                key={i}
                className={`luffy-letter ${started ? 'luffy-letter-in' : ''}`}
                style={{
                  '--l-delay': `${item.delay}s`,
                  marginLeft: item.spaceBefore ? `${item.spaceBefore * 6}px` : undefined,
                } as React.CSSProperties}
              >
                {item.letter}
              </span>
            ))}
          </div>

          {/* ── Tagline ── */}
          <div className={`luffy-tagline ${showGlow ? 'luffy-tagline-in' : ''}`}>
            Anime &bull; Movies &bull; TV
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          ══ LIGHT STREAK — subtle sweep ══
          ═══════════════════════════════════════════ */}
      {showStreak && <div className="luffy-streak" />}

      {/* ═══════════════════════════════════════════
          ══ GLOW PULSE — soft radial bloom ══
          ═══════════════════════════════════════════ */}
      {showGlow && (
        <>
          <div className="luffy-glow-bloom" />
          <div className="luffy-glow-ring" />
        </>
      )}

      {/* ── Skip Button ── */}
      <button
        onClick={skip}
        className="luffy-skip-btn"
        aria-label="Skip intro"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="mr-1">
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
    setTimeout(() => setShowSplash(false), 400);
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
            <p className="text-cyan-400 text-sm font-bold">Luffy TV</p>
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
          <LuffyIntro onComplete={handleSplashComplete} />
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
                    <span className="text-base font-bold gradient-text">Luffy TV</span>
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
                    <span className="block text-xs text-zinc-600">Luffy TV v4.0</span>
                    <span className="block text-xs text-zinc-600">We do not host any files</span>
                  </div>
                </div>
              </div>
              <div className="section-divider mt-10 mb-6" />
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-[10px] text-zinc-700">&copy; {new Date().getFullYear()} Luffy TV. All rights reserved.</p>
                <p className="text-[10px] text-zinc-700">Powered by TMDB &amp; AniList &bull; Content from third-party providers</p>
              </div>
            </div>
          </footer>
        )}
      </div>
    </>
  );
}
