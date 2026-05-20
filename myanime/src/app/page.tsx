"use client";

import { useEffect, useState, useSyncExternalStore, useRef, useCallback, Component, ReactNode, lazy, Suspense, useMemo } from "react";
import { useAppStore, parseHash } from "@/components/anime/store";
import Navbar from "@/components/anime/navbar";

// Lazy load ALL page components for faster initial load
const HomePage = lazy(() => import("@/components/anime/home-page"));
const SearchPage = lazy(() => import("@/components/anime/search-page"));
const AnimeDetailPage = lazy(() => import("@/components/anime/anime-detail"));
const WatchPage = lazy(() => import("@/components/anime/watch-page"));
const GenrePage = lazy(() => import("@/components/anime/genre-page"));
const BookmarksPage = lazy(() => import("@/components/anime/bookmarks-page"));
const HistoryPage = lazy(() => import("@/components/anime/history-page"));
const AnimeHomePage = lazy(() => import("@/components/anime/anime-home"));
const SchedulePage = lazy(() => import("@/components/anime/schedule-page"));
const MoviesPage = lazy(() => import("@/components/anime/movies-page"));
const TVPage = lazy(() => import("@/components/anime/tv-page"));
const MovieDetailPage = lazy(() => import("@/components/anime/movie-detail"));
const TVDetailPage = lazy(() => import("@/components/anime/tv-detail"));
const MovieWatchPage = lazy(() => import("@/components/anime/movie-watch"));
const TVWatchPage = lazy(() => import("@/components/anime/tv-watch"));
const MangaPage = lazy(() => import("@/components/anime/manga-page"));
const MangaDetailPage = lazy(() => import("@/components/anime/manga-detail"));
const MangaReader = lazy(() => import("@/components/anime/manga-reader"));

// Minimal page loading fallback
function PageLoader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mx-auto animate-pulse">
          <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
        </div>
        <p className="text-zinc-600 text-xs">Loading...</p>
      </div>
    </div>
  );
}

// Error Boundary
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: string }> {
  state = { hasError: false, error: "" };
  static getDerivedStateFromError(err: any) {
    return { hasError: true, error: err?.message || String(err) };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[80vh] flex items-center justify-center bg-[#0b1116]">
          <div className="text-center space-y-4 max-w-md px-6">
            <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white">Something went wrong</h2>
            <p className="text-sm text-zinc-400">{this.state.error}</p>
            <button onClick={() => { this.setState({ hasError: false, error: "" }); window.location.reload(); }} className="pill-btn pill-btn-primary">Reload Page</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const emptySubscribe = () => () => {};
function useMounted() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

// LUFFY TV INTRO — fast 2s intro
function LuffyIntro({ onComplete }: { onComplete: () => void }) {
  const onCompleteRef = useRef(onComplete);
  const [gone, setGone] = useState(false);

  useEffect(() => { onCompleteRef.current = onComplete; });

  const skip = useCallback(() => {
    setGone(true);
    onCompleteRef.current();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setGone(true);
      onCompleteRef.current();
    }, 2200); // Reduced from 3500 to 2200
    return () => clearTimeout(t);
  }, []);

  if (gone) return null;

  return (
    <div className="ltv-intro">
      <div className="ltv-letters">
        {['L','U','F','F','Y'].map((c, i) => (
          <span key={i} className="ltv-ltr ltv-ltr-purple" style={{ '--i': i } as React.CSSProperties}>{c}</span>
        ))}
        <span className="ltv-space" />
        {['T','V'].map((c, i) => (
          <span key={i+5} className="ltv-ltr ltv-ltr-white" style={{ '--i': i + 5 } as React.CSSProperties}>{c}</span>
        ))}
      </div>
      <button onClick={skip} className="ltv-skip" aria-label="Skip intro">Skip</button>
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

  // Keyboard shortcut: Cmd/Ctrl+K
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
    setTimeout(() => setShowSplash(false), 300); // Faster transition
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#0b1116] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mx-auto shadow-lg shadow-cyan-500/20 animate-pulse">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </div>
          <p className="text-cyan-400 text-sm font-bold">Luffy TV</p>
        </div>
      </div>
    );
  }

  const isWatchPage = route.page === "watch" || route.page === "movie-watch" || route.page === "tv-watch";
  const isMangaReader = route.page === "manga-read";

  const renderPage = () => {
    const page = (
      <Suspense fallback={<PageLoader />}>
        {(() => {
          switch (route.page) {
            case "home": return <HomePage />;
            case "search": return <SearchPage initialQuery={route.query} />;
            case "anime": return <AnimeDetailPage animeId={route.id} />;
            case "watch": return <WatchPage animeId={route.id} episodeNum={route.episode} />;
            case "genre": return <GenrePage genre={route.genre} />;
            case "dub": return <AnimeHomePage />;
            case "schedule": return <SchedulePage />;
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
        })()}
      </Suspense>
    );
    return page;
  };

  return (
    <>
      {showSplash && (
        <div className={splashComplete ? "splash-scale-out" : ""}>
          <LuffyIntro onComplete={handleSplashComplete} />
        </div>
      )}

      <ErrorBoundary>
      {!isWatchPage && !isMangaReader && <Navbar />}

      <div className={`min-h-screen bg-[#0b1116] flex flex-col ${!showSplash ? "content-reveal" : "opacity-0"}`}>
        <main className={`max-w-[1400px] mx-auto px-4 lg:px-8 ${isWatchPage || isMangaReader ? '' : 'pt-[75px]'} ${isWatchPage || isMangaReader ? "" : "pb-24 lg:pb-12"} flex-1`}>
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
                  <p className="text-[11px] text-zinc-500 leading-relaxed mb-4">All-in-one streaming platform for anime, movies, TV shows and manga.</p>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-zinc-300 mb-4 uppercase tracking-wider">Discover</h4>
                  <div className="space-y-2.5">
                    <button onClick={() => navigate({ page: "home" })} className="block text-xs text-zinc-500 hover:text-cyan-400 transition-colors">Home</button>
                    <button onClick={() => navigate({ page: "schedule" })} className="block text-xs text-zinc-500 hover:text-cyan-400 transition-colors">Schedule</button>
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
                <p className="text-[10px] text-zinc-700">Powered by TMDB &amp; AniList</p>
              </div>
            </div>
          </footer>
        )}
      </div>
      </ErrorBoundary>
    </>
  );
}
