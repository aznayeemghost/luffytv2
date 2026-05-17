"use client";

import { useEffect, useState, useSyncExternalStore, useMemo, useRef } from "react";
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
// CINEMATIC INTRO V2 — Straw Hat Falling Through Darkness
// Netflix/HBO quality: dark → hat falls → stops → pulse → cracks → reveal
// Color: Deep black, muted brown/amber, cool cyan, deep crimson, white
// GPU-accelerated, CSS custom properties, 60fps smooth
// ================================================================

function PortalIntro({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<'dark' | 'fall' | 'stop' | 'pulse' | 'crack' | 'reveal'>('dark');
  const onCompleteRef = useRef(onComplete);

  useEffect(() => { onCompleteRef.current = onComplete; });

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase('fall'),   1500),  // 1.5s deep darkness
      setTimeout(() => setPhase('stop'),   4000),  // hat falls 2.5s
      setTimeout(() => setPhase('pulse'),  4500),  // brief freeze 0.5s
      setTimeout(() => setPhase('crack'),  5000),  // pulse 0.5s then crack
      setTimeout(() => setPhase('reveal'), 5500),  // cracks 0.5s then reveal
      setTimeout(() => onCompleteRef.current(), 6200), // final transition
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  // ── Ambient dust particles (50) — cinematic atmosphere ──
  const dustParticles = useMemo(() =>
    Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 0.3 + Math.random() * 1.8,
      duration: 3 + Math.random() * 8,
      delay: Math.random() * 4,
      opacity: 0.08 + Math.random() * 0.22,
      drift: (Math.random() - 0.5) * 40,
    }))
  , []);

  // ── Hat trail particles (32) — blue/cyan + red/crimson ──
  const trailParticles = useMemo(() =>
    Array.from({ length: 32 }, (_, i) => ({
      id: i,
      offsetX: (Math.random() - 0.5) * 80,
      offsetY: 10 + Math.random() * 40,
      delay: Math.random() * 2.0,
      size: 1 + Math.random() * 4,
      duration: 0.8 + Math.random() * 1.5,
      color: i % 5 === 0 ? '#00A8E1'
            : i % 5 === 1 ? '#67d8ef'
            : i % 5 === 2 ? '#E11D48'
            : i % 5 === 3 ? '#ff6b8a'
            : '#ffffff',
    }))
  , []);

  // ── Background aurora streaks (6) — blue and red neon trails ──
  const auroraStreaks = useMemo(() =>
    Array.from({ length: 6 }, (_, i) => ({
      id: i,
      x: 10 + Math.random() * 80,
      angle: -20 + Math.random() * 40,
      color: i % 2 === 0
        ? `rgba(0, 168, 225, ${0.03 + Math.random() * 0.05})`
        : `rgba(225, 29, 72, ${0.02 + Math.random() * 0.04})`,
      delay: Math.random() * 1.5,
      width: 1 + Math.random() * 2,
      blur: 15 + Math.random() * 25,
    }))
  , []);

  // ── Energy pulse particles (36) — radial explosion ──
  const pulseParticles = useMemo(() =>
    Array.from({ length: 36 }, (_, i) => ({
      id: i,
      angle: (i / 36) * 360,
      speed: 60 + Math.random() * 180,
      size: 1.5 + Math.random() * 5,
      color: i % 4 === 0 ? '#00A8E1'
            : i % 4 === 1 ? '#67d8ef'
            : i % 4 === 2 ? '#E11D48'
            : '#ffffff',
      delay: Math.random() * 0.15,
    }))
  , []);

  // ── Hat dissolution particles (20) — scatter when hat dissolves ──
  const dissolveParticles = useMemo(() =>
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      angle: (i / 20) * 360,
      speed: 30 + Math.random() * 80,
      size: 1 + Math.random() * 3,
      delay: Math.random() * 0.2,
    }))
  , []);

  // ── Cracks spreading from center (12 + 6 branches) ──
  const cracks = useMemo(() => {
    const main = Array.from({ length: 12 }, (_, i) => ({
      id: i,
      angle: (i * 30) + Math.random() * 15 - 7.5,
      length: 12 + Math.random() * 30,
      width: 0.8 + Math.random() * 2.5,
      delay: i * 0.035,
      isBranch: false,
    }));
    const branches = Array.from({ length: 6 }, (_, i) => ({
      id: 12 + i,
      angle: i * 60 + 15 + Math.random() * 20,
      length: 6 + Math.random() * 12,
      width: 0.5 + Math.random() * 1.2,
      delay: 0.15 + i * 0.03,
      isBranch: true,
    }));
    return [...main, ...branches];
  }, []);

  // ── Crack spark particles (18) — tiny sparks along crack lines ──
  const crackSparks = useMemo(() =>
    Array.from({ length: 18 }, (_, i) => ({
      id: i,
      angle: Math.random() * 360,
      dist: 5 + Math.random() * 25,
      size: 1 + Math.random() * 2,
      delay: 0.1 + Math.random() * 0.3,
      duration: 0.3 + Math.random() * 0.4,
    }))
  , []);

  // ── Shockwave rings (3 staggered) ──
  const shockwaveRings = useMemo(() => [
    { id: 0, delay: 0, size: 180, duration: 0.7 },
    { id: 1, delay: 0.08, size: 220, duration: 0.65 },
    { id: 2, delay: 0.16, size: 260, duration: 0.6 },
  ], []);
  return (
    <div className="fixed inset-0 z-[9999] bg-black overflow-hidden" style={{ perspective: '1000px' }}>
      {/* ── Deep cinematic vignette ── */}
      <div className="intro-vignette" />

      {/* ── Ambient grain overlay for filmic texture ── */}
      <div className="intro-grain" />

      {/* ── Floating dust particles — always visible until reveal ── */}
      {phase !== 'reveal' && (
        <div className="intro-dust-container">
          {dustParticles.map(p => (
            <div
              key={p.id}
              className="intro-dust"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                width: `${p.size}px`,
                height: `${p.size}px`,
                '--dust-dur': `${p.duration}s`,
                '--dust-delay': `${p.delay}s`,
                '--dust-drift': `${p.drift}px`,
                opacity: p.opacity,
              } as React.CSSProperties}
            />
          ))}
        </div>
      )}

      {/* ── Background aurora streaks during fall ── */}
      {(phase === 'fall' || phase === 'stop') && (
        <div className="intro-aurora-container">
          {auroraStreaks.map(s => (
            <div
              key={s.id}
              className="intro-aurora-streak"
              style={{
                left: `${s.x}%`,
                transform: `rotate(${s.angle}deg)`,
                background: s.color,
                width: `${s.width}px`,
                filter: `blur(${s.blur}px)`,
                '--aurora-delay': `${s.delay}s`,
              } as React.CSSProperties}
            />
          ))}
        </div>
      )}

      {/* ════════════════════════════════════════════════
          ══ STRAW HAT — The cinematic centerpiece ══
          ════════════════════════════════════════════════ */}
      {(phase === 'fall' || phase === 'stop' || phase === 'pulse') && (
        <div className={`intro-hat-container ${
          phase === 'fall'  ? 'intro-hat-falling' :
          phase === 'stop'  ? 'intro-hat-stopped' :
          'intro-hat-pulsing'
        }`}>
          {/* ── SVG Straw Hat — detailed silhouette with rim lighting ── */}
          <div className="intro-hat-wrapper">
            <svg
              className="intro-hat-svg"
              viewBox="0 0 200 120"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Hat outer shadow / glow */}
              <defs>
                {/* Cool blue rim light from left */}
                <linearGradient id="rimLightLeft" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#00A8E1" stopOpacity="0.7" />
                  <stop offset="40%" stopColor="#00A8E1" stopOpacity="0.1" />
                  <stop offset="100%" stopColor="transparent" stopOpacity="0" />
                </linearGradient>
                {/* Warm amber rim light from right */}
                <linearGradient id="rimLightRight" x1="100%" y1="0%" x2="0%" y2="0%">
                  <stop offset="0%" stopColor="#D4A55A" stopOpacity="0.6" />
                  <stop offset="40%" stopColor="#D4A55A" stopOpacity="0.1" />
                  <stop offset="100%" stopColor="transparent" stopOpacity="0" />
                </linearGradient>
                {/* Hat body gradient — muted brown/amber */}
                <radialGradient id="hatBody" cx="50%" cy="40%" r="60%">
                  <stop offset="0%" stopColor="#A08040" />
                  <stop offset="40%" stopColor="#8B6914" />
                  <stop offset="70%" stopColor="#6B5012" />
                  <stop offset="100%" stopColor="#5C4412" />
                </radialGradient>
                {/* Crown gradient */}
                <radialGradient id="hatCrown" cx="50%" cy="30%" r="65%">
                  <stop offset="0%" stopColor="#B08030" />
                  <stop offset="50%" stopColor="#8B6914" />
                  <stop offset="100%" stopColor="#5C4412" />
                </radialGradient>
                {/* Straw texture pattern */}
                <pattern id="strawWeave" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
                  <line x1="0" y1="0" x2="8" y2="8" stroke="rgba(0,0,0,0.15)" strokeWidth="0.5" />
                  <line x1="8" y1="0" x2="0" y2="8" stroke="rgba(0,0,0,0.1)" strokeWidth="0.5" />
                </pattern>
                {/* Glow filter */}
                <filter id="hatGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Brim — wide elliptical shape */}
              <ellipse cx="100" cy="82" rx="95" ry="28"
                fill="url(#hatBody)" stroke="rgba(92,68,18,0.6)" strokeWidth="1" />
              {/* Straw weave texture on brim */}
              <ellipse cx="100" cy="82" rx="93" ry="26"
                fill="url(#strawWeave)" opacity="0.5" />
              {/* Brim highlight — top edge */}
              <ellipse cx="100" cy="76" rx="88" ry="6"
                fill="none" stroke="rgba(255,220,150,0.12)" strokeWidth="1" />

              {/* Crown — dome rising from brim */}
              <path d="M 50 80 Q 50 30, 100 25 Q 150 30, 150 80"
                fill="url(#hatCrown)" stroke="rgba(92,68,18,0.5)" strokeWidth="0.8" />
              {/* Straw weave on crown */}
              <path d="M 52 78 Q 52 32, 100 27 Q 148 32, 148 78"
                fill="url(#strawWeave)" opacity="0.4" />

              {/* Hat band — crimson red stripe */}
              <path d="M 52 74 Q 52 68, 100 66 Q 148 68, 148 74 Q 148 80, 100 78 Q 52 80, 52 74"
                fill="#C41E3A" opacity="0.9" />
              <path d="M 54 73 Q 54 70, 100 68 Q 146 70, 146 73"
                fill="none" stroke="rgba(255,100,120,0.3)" strokeWidth="0.5" />

              {/* ── Cinematic rim lighting ── */}
              {/* Left side — cool blue rim light */}
              <ellipse cx="100" cy="82" rx="95" ry="28"
                fill="none" stroke="url(#rimLightLeft)" strokeWidth="2.5" />
              {/* Right side — warm amber rim light */}
              <ellipse cx="100" cy="82" rx="95" ry="28"
                fill="none" stroke="url(#rimLightRight)" strokeWidth="2" />
              {/* Crown rim lights */}
              <path d="M 50 80 Q 50 30, 100 25 Q 150 30, 150 80"
                fill="none" stroke="url(#rimLightLeft)" strokeWidth="1.5" />
              <path d="M 50 80 Q 50 30, 100 25 Q 150 30, 150 80"
                fill="none" stroke="url(#rimLightRight)" strokeWidth="1" />

              {/* ── Anime scene reflections shimmering across hat surface ── */}
              <ellipse cx="70" cy="72" rx="15" ry="6"
                fill="rgba(0,168,225,0.08)" className="intro-hat-reflection-spot intro-reflection-blue" />
              <ellipse cx="120" cy="68" rx="12" ry="5"
                fill="rgba(225,29,72,0.07)" className="intro-hat-reflection-spot intro-reflection-red" />
              <ellipse cx="100" cy="50" rx="8" ry="4"
                fill="rgba(255,255,255,0.06)" className="intro-hat-reflection-spot intro-reflection-white" />
            </svg>

            {/* ── Motion blur overlay during fall ── */}
            {phase === 'fall' && (
              <div className="intro-hat-motion-blur" />
            )}
          </div>

          {/* ── Particle trail behind hat (during fall) ── */}
          {phase === 'fall' && (
            <div className="intro-trail-container">
              {trailParticles.map(p => (
                <div
                  key={p.id}
                  className="intro-trail-particle"
                  style={{
                    '--trail-offset-x': `${p.offsetX}px`,
                    '--trail-offset-y': `${p.offsetY}px`,
                    '--trail-delay': `${p.delay}s`,
                    '--trail-dur': `${p.duration}s`,
                    width: `${p.size}px`,
                    height: `${p.size}px`,
                    backgroundColor: p.color,
                    boxShadow: `0 0 ${p.size * 2}px ${p.color}, 0 0 ${p.size * 4}px ${p.color}`,
                  } as React.CSSProperties}
                />
              ))}
            </div>
          )}

          {/* ── Illuminated dust around hat ── */}
          {(phase === 'fall' || phase === 'stop') && (
            <div className="intro-hat-illuminated-dust" />
          )}

          {/* ── Soft glow under hat ── */}
          <div className={`intro-hat-glow ${phase === 'pulse' ? 'intro-hat-glow-intense' : phase === 'stop' ? 'intro-hat-glow-frozen' : ''}`} />
        </div>
      )}

      {/* ════════════════════════════════════════════════
          ══ PULSE — anime energy explosion from hat ══
          ════════════════════════════════════════════════ */}
      {phase === 'pulse' && (
        <>
          {/* Central energy core */}
          <div className="intro-pulse-core" />

          {/* Staggered shockwave rings */}
          {shockwaveRings.map(r => (
            <div
              key={r.id}
              className="intro-shockwave-ring"
              style={{
                width: `${r.size}px`,
                height: `${r.size}px`,
                '--ring-delay': `${r.delay}s`,
                '--ring-dur': `${r.duration}s`,
              } as React.CSSProperties}
            />
          ))}

          {/* Radial energy particles */}
          {pulseParticles.map(p => (
            <div
              key={p.id}
              className="intro-pulse-particle"
              style={{
                '--pulse-angle': `${p.angle}deg`,
                '--pulse-speed': `${p.speed}px`,
                '--pulse-delay': `${p.delay}s`,
                width: `${p.size}px`,
                height: `${p.size}px`,
                backgroundColor: p.color,
                boxShadow: `0 0 ${p.size * 3}px ${p.color}, 0 0 ${p.size * 6}px ${p.color}`,
              } as React.CSSProperties}
            />
          ))}

          {/* Hat dissolution particles */}
          {dissolveParticles.map(p => (
            <div
              key={p.id}
              className="intro-dissolve-particle"
              style={{
                '--dissolve-angle': `${p.angle}deg`,
                '--dissolve-speed': `${p.speed}px`,
                '--dissolve-delay': `${p.delay}s`,
                width: `${p.size}px`,
                height: `${p.size}px`,
              } as React.CSSProperties}
            />
          ))}

          {/* Screen shake wrapper */}
          <div className="intro-screen-shake" />
        </>
      )}

      {/* ════════════════════════════════════════════════
          ══ CRACKS — glowing energy cracks + portal ══
          ════════════════════════════════════════════════ */}
      {(phase === 'crack' || phase === 'reveal') && (
        <>
          {/* Glowing cracks spreading from center */}
          {cracks.map(c => (
            <div
              key={c.id}
              className={`intro-crack ${c.isBranch ? 'intro-crack-branch' : 'intro-crack-main'}`}
              style={{
                '--crack-angle': `${c.angle}deg`,
                '--crack-length': `${c.length}vw`,
                '--crack-width': `${c.width}px`,
                '--crack-delay': `${c.delay}s`,
              } as React.CSSProperties}
            />
          ))}

          {/* Crack spark particles */}
          {crackSparks.map(s => (
            <div
              key={s.id}
              className="intro-crack-spark"
              style={{
                '--spark-angle': `${s.angle}deg`,
                '--spark-dist': `${s.dist}vw`,
                '--spark-delay': `${s.delay}s`,
                '--spark-dur': `${s.duration}s`,
                width: `${s.size}px`,
                height: `${s.size}px`,
              } as React.CSSProperties}
            />
          ))}

          {/* Homepage visible through cracks */}
          <div className={`intro-crack-portal ${phase === 'reveal' ? 'intro-crack-portal-open' : ''}`} />
        </>
      )}

      {/* ════════════════════════════════════════════════
          ══ REVEAL — camera zooms through cracks ══
          ════════════════════════════════════════════════ */}
      {phase === 'reveal' && (
        <>
          <div className="intro-reveal-flash" />
          <div className="intro-reveal-fade" />
        </>
      )}
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
          <PortalIntro onComplete={handleSplashComplete} />
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
