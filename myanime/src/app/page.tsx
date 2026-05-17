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
// SIMPLE CLEAN ANIME INTRO — "LUFFY TV"
// Straw hat spins in → LUFFY TV text reveals → smooth exit → website
// Clean, smooth, no over-engineering
// ================================================================

function LuffyIntro({ onComplete }: { onComplete: () => void }) {
  const onCompleteRef = useRef(onComplete);
  const [visible, setVisible] = useState(true);
  const [showText, setShowText] = useState(false);
  const [exitAnim, setExitAnim] = useState(false);

  useEffect(() => { onCompleteRef.current = onComplete; });

  const skip = useCallback(() => {
    if (!visible) return;
    setVisible(false);
    onCompleteRef.current();
  }, [visible]);

  useEffect(() => {
    const timers = [
      setTimeout(() => setShowText(true), 1800),   // hat lands, text appears
      setTimeout(() => setExitAnim(true), 3800),    // start exit
      setTimeout(() => setVisible(false), 4500),    // remove
      setTimeout(() => onCompleteRef.current(), 4600),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  if (!visible) return null;

  return (
    <div className={`lt-intro ${exitAnim ? 'lt-intro-exit' : ''}`}>
      {/* Red ambient glow */}
      <div className="lt-glow" />

      {/* Straw Hat — spins in from above */}
      <div className={`lt-hat ${showText ? 'lt-hat-landed' : ''}`}>
        <svg viewBox="0 0 120 70" xmlns="http://www.w3.org/2000/svg">
          {/* Brim */}
          <ellipse cx="60" cy="48" rx="55" ry="11" fill="#C8963E" stroke="#A67C3D" strokeWidth="1.5" />
          <ellipse cx="60" cy="48" rx="50" ry="9" fill="none" stroke="#B8942E" strokeWidth="0.6" strokeDasharray="3,3" />
          {/* Crown */}
          <path d="M36,28 Q36,14 60,10 Q84,14 84,28 L84,44 L36,44 Z" fill="#C8963E" stroke="#A67C3D" strokeWidth="1.5" />
          {/* Weave */}
          <g stroke="#B08630" strokeWidth="0.5" opacity="0.35">
            <line x1="38" y1="22" x2="82" y2="22" />
            <line x1="38" y1="28" x2="82" y2="28" />
            <line x1="38" y1="34" x2="82" y2="34" />
            <line x1="38" y1="40" x2="82" y2="40" />
          </g>
          {/* Band */}
          <rect x="36" y="41" width="48" height="8" rx="1.5" fill="#8B4513" stroke="#6B3410" strokeWidth="0.5" />
          {/* Buckle */}
          <rect x="50" y="39" width="20" height="12" rx="2" fill="#DAA520" stroke="#B8860B" strokeWidth="0.8" />
          <rect x="56" y="42" width="8" height="6" rx="1" fill="#6B3410" />
        </svg>
      </div>

      {/* LUFFY TV Text */}
      <div className={`lt-text ${showText ? 'lt-text-in' : ''}`}>
        <span className="lt-word" style={{ '--word-delay': '0s' } as React.CSSProperties}>LUFFY</span>
        <span className="lt-word lt-word-tv" style={{ '--word-delay': '0.15s' } as React.CSSProperties}>TV</span>
      </div>

      {/* Skip */}
      <button onClick={skip} className="lt-skip" aria-label="Skip intro">
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
