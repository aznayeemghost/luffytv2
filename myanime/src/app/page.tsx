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
// PIRATE FLAG INTRO — "LUFFY TV"
// A Straw Hat Jolly Roger flag unfurls, then burns away smoothly
// to reveal the website. Canvas-driven fire particles + CSS burn.
// ================================================================

type IntroPhase = 'waiting' | 'entering' | 'waving' | 'burning' | 'done';

function LuffyIntro({ onComplete }: { onComplete: () => void }) {
  const onCompleteRef = useRef(onComplete);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const [phase, setPhase] = useState<IntroPhase>('waiting');
  const [visible, setVisible] = useState(true);

  useEffect(() => { onCompleteRef.current = onComplete; });

  const skip = useCallback(() => {
    if (!visible) return;
    setVisible(false);
    cancelAnimationFrame(rafRef.current);
    onCompleteRef.current();
  }, [visible]);

  // ── Fire particle system (canvas) ──
  useEffect(() => {
    if (phase !== 'burning') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    // Flag bounds (must match CSS sizing)
    const flagW = Math.min(w * 0.55, 500);
    const flagH = flagW * 0.8;
    const flagLeft = (w - flagW) / 2;
    const flagTop = (h - flagH) / 2;

    interface Particle {
      x: number; y: number;
      vx: number; vy: number;
      life: number; maxLife: number;
      size: number;
      type: 'flame' | 'ember' | 'smoke';
    }

    const particles: Particle[] = [];
    let burnProgress = 0;
    const burnDuration = 2.8;
    const startTime = performance.now();

    const addFlame = (x: number, y: number) => {
      const life = 0.3 + Math.random() * 0.5;
      particles.push({ x, y, vx: (Math.random() - 0.5) * 1.5, vy: -2 - Math.random() * 3, life, maxLife: life, size: 4 + Math.random() * 8, type: 'flame' });
    };
    const addEmber = (x: number, y: number) => {
      const life = 1 + Math.random() * 2;
      particles.push({ x, y, vx: (Math.random() - 0.5) * 4, vy: -3 - Math.random() * 5, life, maxLife: life, size: 1 + Math.random() * 2.5, type: 'ember' });
    };
    const addSmoke = (x: number, y: number) => {
      const life = 1.5 + Math.random() * 2;
      particles.push({ x, y, vx: (Math.random() - 0.5) * 1, vy: -0.5 - Math.random() * 1.5, life, maxLife: life, size: 10 + Math.random() * 20, type: 'smoke' });
    };

    let lastTime = startTime;

    const animate = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      const elapsed = (now - startTime) / 1000;
      burnProgress = Math.min(1, elapsed / burnDuration);

      // Burn line moves from flag bottom to flag top
      const burnY = flagTop + flagH * (1 - burnProgress);

      // Spawn particles
      if (burnProgress < 0.95) {
        for (let i = 0; i < 5; i++) addFlame(flagLeft + Math.random() * flagW, burnY);
        if (Math.random() < 0.4) addEmber(flagLeft + Math.random() * flagW, burnY);
        if (Math.random() < 0.15) addSmoke(flagLeft + Math.random() * flagW, burnY - 30);
      }

      // Update particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * dt * 60;
        p.y += p.vy * dt * 60;
        if (p.type === 'flame') p.vy -= 0.08;
        if (p.type === 'ember') p.vy -= 0.03;
        if (p.type === 'smoke') { p.size += dt * 8; p.vy -= 0.01; }
        p.life -= dt;
        if (p.life <= 0) particles.splice(i, 1);
      }

      ctx.clearRect(0, 0, w, h);

      // Draw smoke (behind everything)
      for (const p of particles) {
        if (p.type !== 'smoke') continue;
        const alpha = (p.life / p.maxLife) * 0.12;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(100, 80, 60, ${alpha})`;
        ctx.fill();
      }

      // Glow along burn line
      if (burnProgress < 0.95) {
        const glowH = 60;
        const grd = ctx.createLinearGradient(0, burnY - glowH, 0, burnY + 10);
        grd.addColorStop(0, 'rgba(255, 100, 0, 0)');
        grd.addColorStop(0.6, `rgba(255, 130, 20, ${0.25 * (1 - burnProgress)})`);
        grd.addColorStop(1, 'rgba(255, 60, 0, 0)');
        ctx.fillStyle = grd;
        ctx.fillRect(flagLeft - 30, burnY - glowH, flagW + 60, glowH + 10);
      }

      // Draw flames
      for (const p of particles) {
        if (p.type !== 'flame') continue;
        const alpha = Math.max(0, p.life / p.maxLife);
        const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
        if (alpha > 0.6) {
          grd.addColorStop(0, `rgba(255, 255, 200, ${alpha})`);
          grd.addColorStop(0.4, `rgba(255, 160, 30, ${alpha * 0.7})`);
          grd.addColorStop(1, 'rgba(255, 60, 0, 0)');
        } else {
          grd.addColorStop(0, `rgba(255, 100, 20, ${alpha})`);
          grd.addColorStop(1, 'rgba(150, 30, 0, 0)');
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();
      }

      // Draw embers
      for (const p of particles) {
        if (p.type !== 'ember') continue;
        const alpha = Math.max(0, p.life / p.maxLife);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, ${120 + Math.floor(alpha * 80)}, 20, ${alpha})`;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 120, 20, ${alpha * 0.15})`;
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [phase]);

  // ── Timing sequence ──
  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase('entering'), 200),    // brief dark hold
      setTimeout(() => setPhase('waving'), 1800),     // flag settles, waves
      setTimeout(() => setPhase('burning'), 3200),    // fire starts
      setTimeout(() => setPhase('done'), 6200),       // burn complete
      setTimeout(() => setVisible(false), 6700),      // intro hidden
      setTimeout(() => onCompleteRef.current(), 7000), // callback
    ];
    return () => {
      timers.forEach(clearTimeout);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className={`pirate-intro ${phase === 'done' ? 'pirate-intro-exit' : ''}`}>
      {/* ── Dark atmosphere with subtle warm glow ── */}
      <div className="pirate-atmosphere" />
      <div className="pirate-fog" />

      {/* ── Pirate Flag ── */}
      {phase !== 'waiting' && (
        <div className={`pirate-flag-container ${phase === 'entering' ? 'flag-entering' : 'flag-visible'} ${phase === 'waving' ? 'flag-waving' : ''}`}>
          <div className={`pirate-flag ${phase === 'burning' || phase === 'done' ? 'flag-burning' : ''}`}>
            <svg viewBox="0 0 400 320" className="jolly-roger-svg" xmlns="http://www.w3.org/2000/svg">
              {/* Flag cloth */}
              <path d="M30,15 C60,10 120,5 200,5 C280,5 340,10 370,15 L370,270 C340,280 280,290 200,290 C120,290 60,280 30,270 Z" fill="#0a0a0a" stroke="#222" strokeWidth="1.5"/>

              {/* Crossbones */}
              <g stroke="#d0d0d0" strokeWidth="8" strokeLinecap="round">
                <line x1="115" y1="245" x2="285" y2="155"/>
                <line x1="285" y1="245" x2="115" y2="155"/>
              </g>
              <g fill="#d0d0d0">
                <circle cx="115" cy="245" r="7"/>
                <circle cx="285" cy="245" r="7"/>
                <circle cx="115" cy="155" r="7"/>
                <circle cx="285" cy="155" r="7"/>
              </g>

              {/* Skull */}
              <ellipse cx="200" cy="115" rx="32" ry="38" fill="#d0d0d0"/>
              <ellipse cx="186" cy="110" rx="6" ry="7" fill="#0a0a0a"/>
              <ellipse cx="214" cy="110" rx="6" ry="7" fill="#0a0a0a"/>
              <path d="M197,125 L200,131 L203,125" stroke="#0a0a0a" strokeWidth="1.5" fill="none"/>
              <path d="M184,138 Q200,148 216,138" stroke="#0a0a0a" strokeWidth="2" fill="none"/>
              <g stroke="#0a0a0a" strokeWidth="1.2">
                <line x1="189" y1="138" x2="189" y2="144"/>
                <line x1="197" y1="140" x2="197" y2="146"/>
                <line x1="205" y1="140" x2="205" y2="146"/>
                <line x1="213" y1="138" x2="213" y2="144"/>
              </g>

              {/* Straw Hat */}
              <g>
                <ellipse cx="200" cy="82" rx="50" ry="9" fill="#C8963E" stroke="#A67C3D" strokeWidth="1"/>
                <path d="M176,60 Q176,52 200,50 Q224,52 224,60 L224,78 L176,78 Z" fill="#C8963E" stroke="#A67C3D" strokeWidth="1"/>
                <g stroke="#B0862E" strokeWidth="0.5" opacity="0.5">
                  <line x1="178" y1="65" x2="222" y2="65"/>
                  <line x1="178" y1="70" x2="222" y2="70"/>
                  <line x1="178" y1="75" x2="222" y2="75"/>
                </g>
                <rect x="176" y="74" width="48" height="7" fill="#8B4513" stroke="#6B3410" strokeWidth="0.5"/>
                <rect x="192" y="73" width="16" height="9" rx="2" fill="#DAA520" stroke="#B8860B" strokeWidth="0.5"/>
              </g>

              {/* LUFFY TV text */}
              <text x="200" y="265" textAnchor="middle" fill="#00A8E1" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="32" letterSpacing="6">LUFFY TV</text>
            </svg>
          </div>
        </div>
      )}

      {/* ── Fire canvas overlay ── */}
      <canvas ref={canvasRef} className="pirate-fire-canvas" />

      {/* ── Skip Button ── */}
      <button onClick={skip} className="pirate-skip-btn" aria-label="Skip intro">
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
