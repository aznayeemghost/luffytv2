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
// CINEMATIC PIRATE FLAG INTRO — "LUFFY TV"
// Full cinematic: stormy atmosphere → flag unfurls from pole →
// cloth waves → ignition spark → spreading fire with real particles →
// charred edges → ash rain → smoke plume → reveal website
// Canvas: fire, embers, ash, smoke, sparks, char debris
// ================================================================

type IntroPhase = 'dark' | 'atmosphere' | 'unfurling' | 'waving' | 'ignition' | 'burning' | 'embers' | 'reveal' | 'gone';

function LuffyIntro({ onComplete }: { onComplete: () => void }) {
  const onCompleteRef = useRef(onComplete);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const [phase, setPhase] = useState<IntroPhase>('dark');
  const phaseRef = useRef<IntroPhase>('dark');

  useEffect(() => { onCompleteRef.current = onComplete; });
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  const skip = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    setPhase('gone');
    onCompleteRef.current();
  }, []);

  // ══════════════════════════════════════════════════════
  // ══ MEGA CANVAS PARTICLE ENGINE ══
  // ══════════════════════════════════════════════════════
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = window.innerWidth;
    let h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    const onResize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    window.addEventListener('resize', onResize);

    // ── Flag geometry ──
    const getFlagBounds = () => {
      const flagW = Math.min(w * 0.5, 460);
      const flagH = flagW * 0.75;
      return { flagW, flagH, flagLeft: (w - flagW) / 2, flagTop: (h - flagH) / 2 };
    };

    // ── Particle types ──
    interface Particle {
      x: number; y: number;
      vx: number; vy: number;
      life: number; maxLife: number;
      size: number; origSize: number;
      type: 'flame' | 'ember' | 'smoke' | 'ash' | 'spark' | 'char' | 'wind' | 'rain';
      rotation?: number; rotSpeed?: number;
      color?: string;
    }

    const particles: Particle[] = [];

    // ── Spawn helpers ──
    const addFlame = (x: number, y: number, intensity = 1) => {
      const life = (0.2 + Math.random() * 0.4) * intensity;
      const sz = (3 + Math.random() * 7) * intensity;
      particles.push({
        x, y, vx: (Math.random() - 0.5) * 2, vy: -1.5 - Math.random() * 4,
        life, maxLife: life, size: sz, origSize: sz, type: 'flame'
      });
    };
    const addEmber = (x: number, y: number) => {
      const life = 1.5 + Math.random() * 3;
      particles.push({
        x, y, vx: (Math.random() - 0.5) * 5, vy: -2 - Math.random() * 6,
        life, maxLife: life, size: 0.8 + Math.random() * 2, origSize: 0.8 + Math.random() * 2, type: 'ember'
      });
    };
    const addSmoke = (x: number, y: number, size = 15) => {
      const life = 2 + Math.random() * 3;
      particles.push({
        x, y, vx: (Math.random() - 0.5) * 0.8, vy: -0.3 - Math.random() * 1.2,
        life, maxLife: life, size, origSize: size, type: 'smoke'
      });
    };
    const addAsh = (x: number, y: number) => {
      const life = 3 + Math.random() * 4;
      particles.push({
        x, y, vx: (Math.random() - 0.5) * 0.5, vy: 0.3 + Math.random() * 0.8,
        life, maxLife: life, size: 1 + Math.random() * 2.5, origSize: 1 + Math.random() * 2.5, type: 'ash',
        rotation: Math.random() * Math.PI * 2, rotSpeed: (Math.random() - 0.5) * 2
      });
    };
    const addSpark = (x: number, y: number) => {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 8;
      const life = 0.3 + Math.random() * 0.6;
      particles.push({
        x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 2,
        life, maxLife: life, size: 1 + Math.random() * 1.5, origSize: 1 + Math.random() * 1.5, type: 'spark'
      });
    };
    const addChar = (x: number, y: number) => {
      const life = 1 + Math.random() * 2;
      particles.push({
        x, y, vx: (Math.random() - 0.5) * 3, vy: -1 - Math.random() * 3,
        life, maxLife: life, size: 2 + Math.random() * 4, origSize: 2 + Math.random() * 4, type: 'char',
        rotation: Math.random() * Math.PI * 2, rotSpeed: (Math.random() - 0.5) * 5
      });
    };
    const addWind = (x: number, y: number) => {
      const life = 1.5 + Math.random() * 2;
      particles.push({
        x, y, vx: 1 + Math.random() * 2, vy: (Math.random() - 0.5) * 0.3,
        life, maxLife: life, size: 1 + Math.random() * 1.5, origSize: 1 + Math.random() * 1.5, type: 'wind'
      });
    };

    let burnStartTime = 0;
    let ignitionX = 0;
    let ignitionY = 0;
    let frameCount = 0;

    const animate = (now: number) => {
      const currentPhase = phaseRef.current;
      if (currentPhase === 'gone') return;

      ctx.clearRect(0, 0, w, h);
      frameCount++;

      const { flagW, flagH, flagLeft, flagTop } = getFlagBounds();

      // ══════════════════════════════════════════
      // ══ ATMOSPHERE: wind + rain particles ══
      // ══════════════════════════════════════════
      if ((currentPhase === 'atmosphere' || currentPhase === 'unfurling' || currentPhase === 'waving') && frameCount % 3 === 0) {
        addWind(-10, Math.random() * h);
      }

      // ══════════════════════════════════════════
      // ══ IGNITION: single spark burst ══
      // ══════════════════════════════════════════
      if (currentPhase === 'ignition') {
        if (frameCount % 2 === 0) {
          for (let i = 0; i < 4; i++) addSpark(ignitionX, ignitionY);
          addFlame(ignitionX + (Math.random() - 0.5) * 30, ignitionY, 0.7);
        }
      }

      // ══════════════════════════════════════════
      // ══ BURNING: full fire system ══
      // ══════════════════════════════════════════
      if (currentPhase === 'burning') {
        if (burnStartTime === 0) burnStartTime = now;
        const burnElapsed = (now - burnStartTime) / 1000;
        const burnDuration = 3.2;
        const burnProgress = Math.min(1, burnElapsed / burnDuration);

        // Burn line rises from bottom
        const burnY = flagTop + flagH * (1 - burnProgress);
        const burnWidth = flagW * Math.min(1, burnProgress * 3);

        // Flames along burn front
        const spawnCount = Math.floor(8 + burnProgress * 6);
        for (let i = 0; i < spawnCount; i++) {
          const fx = flagLeft + (flagW - burnWidth) / 2 + Math.random() * burnWidth;
          addFlame(fx, burnY, 0.6 + burnProgress * 0.6);
        }

        // Hot spots — bigger flames at random positions
        if (Math.random() < 0.3) {
          addFlame(flagLeft + Math.random() * flagW, burnY + (Math.random() - 0.5) * 20, 1.5);
        }

        // Embers fly up from burn zone
        if (frameCount % 2 === 0) {
          addEmber(flagLeft + Math.random() * flagW, burnY + (Math.random() - 0.5) * 10);
        }

        // Smoke from above burn line
        if (frameCount % 4 === 0) {
          addSmoke(flagLeft + Math.random() * flagW, burnY - 20 - Math.random() * 40, 12 + Math.random() * 15);
        }

        // Char debris from edges
        if (frameCount % 5 === 0 && burnProgress > 0.2) {
          addChar(flagLeft + Math.random() * flagW, burnY + Math.random() * 20);
        }

        // Sparks from burn zone
        if (frameCount % 3 === 0) {
          addSpark(flagLeft + Math.random() * flagW, burnY);
        }

        // ══ GLOW along burn line ══
        const glowH = 80;
        const grd = ctx.createLinearGradient(0, burnY - glowH, 0, burnY + 15);
        const intensity = 0.3 * (1 - burnProgress * 0.5);
        grd.addColorStop(0, 'rgba(255, 80, 0, 0)');
        grd.addColorStop(0.4, `rgba(255, 120, 10, ${intensity * 0.5})`);
        grd.addColorStop(0.7, `rgba(255, 180, 40, ${intensity})`);
        grd.addColorStop(1, 'rgba(255, 60, 0, 0)');
        ctx.fillStyle = grd;
        ctx.fillRect(flagLeft - 40, burnY - glowH, flagW + 80, glowH + 15);

        // Edge glow on sides
        const sideGlow = ctx.createRadialGradient(flagLeft, burnY, 0, flagLeft, burnY, 80);
        sideGlow.addColorStop(0, `rgba(255, 140, 30, ${intensity * 0.4})`);
        sideGlow.addColorStop(1, 'rgba(255, 80, 0, 0)');
        ctx.fillStyle = sideGlow;
        ctx.fillRect(flagLeft - 80, burnY - 40, 80, 80);

        const sideGlow2 = ctx.createRadialGradient(flagLeft + flagW, burnY, 0, flagLeft + flagW, burnY, 80);
        sideGlow2.addColorStop(0, `rgba(255, 140, 30, ${intensity * 0.4})`);
        sideGlow2.addColorStop(1, 'rgba(255, 80, 0, 0)');
        ctx.fillStyle = sideGlow2;
        ctx.fillRect(flagLeft + flagW, burnY - 40, 80, 80);
      }

      // ══════════════════════════════════════════
      // ══ EMBERS: dying phase ══
      // ══════════════════════════════════════════
      if (currentPhase === 'embers') {
        if (frameCount % 8 === 0) addEmber(flagLeft + Math.random() * flagW, flagTop + Math.random() * flagH * 0.5);
        if (frameCount % 12 === 0) addSmoke(w / 2 + (Math.random() - 0.5) * flagW, flagTop, 20 + Math.random() * 20);
      }

      // ══════════════════════════════════════════
      // ══ ASH RAIN: always during/after burn ══
      // ══════════════════════════════════════════
      if ((currentPhase === 'burning' || currentPhase === 'embers' || currentPhase === 'reveal') && frameCount % 6 === 0) {
        addAsh(Math.random() * w, -10);
      }

      // ══════════════════════════════════════════
      // ══ UPDATE ALL PARTICLES ══
      // ══════════════════════════════════════════
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        const dt = 1 / 60;
        p.x += p.vx;
        p.y += p.vy;
        p.life -= dt;

        switch (p.type) {
          case 'flame':
            p.vy -= 0.12;
            p.vx *= 0.98;
            p.size = p.origSize * Math.max(0, p.life / p.maxLife);
            break;
          case 'ember':
            p.vy -= 0.02;
            p.vx += (Math.random() - 0.5) * 0.3;
            p.vy += (Math.random() - 0.5) * 0.2;
            break;
          case 'smoke':
            p.vy -= 0.005;
            p.size += 0.3;
            p.vx += (Math.random() - 0.5) * 0.05;
            break;
          case 'ash':
            p.vx += Math.sin(frameCount * 0.02 + p.x * 0.01) * 0.02;
            if (p.rotation !== undefined && p.rotSpeed !== undefined) p.rotation += p.rotSpeed * dt;
            break;
          case 'spark':
            p.vy += 0.15;
            p.size = p.origSize * Math.max(0, p.life / p.maxLife);
            break;
          case 'char':
            p.vy += 0.05;
            if (p.rotation !== undefined && p.rotSpeed !== undefined) p.rotation += p.rotSpeed * dt;
            break;
          case 'wind':
            p.vx *= 1.01;
            break;
        }

        if (p.life <= 0 || p.y > h + 50 || p.x > w + 50 || p.x < -50) {
          particles.splice(i, 1);
        }
      }

      // ══════════════════════════════════════════
      // ══ DRAW PARTICLES (layered) ══
      // ══════════════════════════════════════════

      // Layer 1: Smoke (behind everything)
      for (const p of particles) {
        if (p.type !== 'smoke') continue;
        const a = Math.max(0, (p.life / p.maxLife) * 0.15);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(80, 65, 50, ${a})`;
        ctx.fill();
      }

      // Layer 2: Wind streaks
      for (const p of particles) {
        if (p.type !== 'wind') continue;
        const a = Math.max(0, (p.life / p.maxLife) * 0.08);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - 20, p.y);
        ctx.strokeStyle = `rgba(180, 200, 220, ${a})`;
        ctx.lineWidth = p.size;
        ctx.stroke();
      }

      // Layer 3: Flames (with layered radial gradients)
      for (const p of particles) {
        if (p.type !== 'flame') continue;
        const a = Math.max(0, p.life / p.maxLife);
        if (a <= 0 || p.size <= 0) continue;
        const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
        if (a > 0.5) {
          grd.addColorStop(0, `rgba(255, 255, 220, ${a})`);
          grd.addColorStop(0.2, `rgba(255, 230, 100, ${a * 0.9})`);
          grd.addColorStop(0.5, `rgba(255, 150, 20, ${a * 0.6})`);
          grd.addColorStop(1, 'rgba(200, 40, 0, 0)');
        } else if (a > 0.25) {
          grd.addColorStop(0, `rgba(255, 180, 50, ${a})`);
          grd.addColorStop(0.4, `rgba(220, 80, 10, ${a * 0.5})`);
          grd.addColorStop(1, 'rgba(150, 20, 0, 0)');
        } else {
          grd.addColorStop(0, `rgba(180, 50, 10, ${a})`);
          grd.addColorStop(1, 'rgba(80, 10, 0, 0)');
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();
      }

      // Layer 4: Char debris
      for (const p of particles) {
        if (p.type !== 'char') continue;
        const a = Math.max(0, p.life / p.maxLife);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation || 0);
        ctx.fillStyle = `rgba(30, 20, 15, ${a})`;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      }

      // Layer 5: Embers (bright dots with glow)
      for (const p of particles) {
        if (p.type !== 'ember') continue;
        const a = Math.max(0, p.life / p.maxLife);
        // Outer glow
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 120, 20, ${a * 0.1})`;
        ctx.fill();
        // Core
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, ${160 + Math.floor(a * 95)}, ${40 + Math.floor(a * 60)}, ${a})`;
        ctx.fill();
      }

      // Layer 6: Sparks (bright streaks)
      for (const p of particles) {
        if (p.type !== 'spark') continue;
        const a = Math.max(0, p.life / p.maxLife);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 2, p.y - p.vy * 2);
        ctx.strokeStyle = `rgba(255, 240, 180, ${a})`;
        ctx.lineWidth = p.size;
        ctx.stroke();
        // Bright core
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.8, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${a})`;
        ctx.fill();
      }

      // Layer 7: Ash (gentle falling)
      for (const p of particles) {
        if (p.type !== 'ash') continue;
        const a = Math.max(0, (p.life / p.maxLife) * 0.4);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation || 0);
        ctx.fillStyle = `rgba(160, 130, 100, ${a})`;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // ══════════════════════════════════════════════════════
  // ══ TIMING: Cinematic sequence ══
  // ══════════════════════════════════════════════════════
  useEffect(() => {
    const { flagW, flagH, flagLeft, flagTop } = {
      flagW: Math.min(window.innerWidth * 0.5, 460),
      flagH: Math.min(window.innerWidth * 0.5, 460) * 0.75,
      flagLeft: (window.innerWidth - Math.min(window.innerWidth * 0.5, 460)) / 2,
      flagTop: (window.innerHeight - Math.min(window.innerWidth * 0.5, 460) * 0.75) / 2,
    };

    const timers = [
      // Phase 1: Dark stormy atmosphere builds
      setTimeout(() => setPhase('atmosphere'), 100),
      // Phase 2: Flag unfurls from pole
      setTimeout(() => setPhase('unfurling'), 1200),
      // Phase 3: Flag waves majestically
      setTimeout(() => setPhase('waving'), 2800),
      // Phase 4: Ignition — spark catches at bottom-center
      setTimeout(() => {
        ignitionX = flagLeft + flagW * 0.5;
        ignitionY = flagTop + flagH * 0.85;
        setPhase('ignition');
      }, 4500),
      // Phase 5: Full burn
      setTimeout(() => {
        burnStartTime = 0;
        setPhase('burning');
      }, 5200),
      // Phase 6: Dying embers
      setTimeout(() => setPhase('embers'), 8500),
      // Phase 7: Reveal website
      setTimeout(() => setPhase('reveal'), 9800),
      // Phase 8: Gone
      setTimeout(() => {
        setPhase('gone');
        onCompleteRef.current();
      }, 10500),
    ];

    return () => {
      timers.forEach(clearTimeout);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  if (phase === 'gone') return null;

  const showFlag = phase === 'unfurling' || phase === 'waving' || phase === 'ignition' || phase === 'burning';
  const showFlagpole = phase !== 'dark' && phase !== 'atmosphere';
  const isBurning = phase === 'burning' || phase === 'embers';
  const isIgniting = phase === 'ignition';

  return (
    <div className={`lf-intro ${phase === 'reveal' ? 'lf-intro-reveal' : ''}`}>
      {/* ══ ATMOSPHERIC LAYERS ══ */}
      <div className="lf-storm-bg" />
      <div className="lf-lightning" />
      <div className="lf-fog-layer" />
      <div className="lf-vignette" />

      {/* ══ WIND STREAKS (CSS) ══ */}
      {(phase === 'atmosphere' || phase === 'unfurling' || phase === 'waving') && (
        <div className="lf-wind-streaks">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="lf-wind-line" style={{ '--w-delay': `${i * 0.4}s`, '--w-top': `${15 + i * 14}%`, '--w-dur': `${1.5 + i * 0.3}s` } as React.CSSProperties} />
          ))}
        </div>
      )}

      {/* ══ FLAGPOLE ══ */}
      {showFlagpole && (
        <div className={`lf-flagpole ${phase === 'unfurling' ? 'pole-enter' : ''}`}>
          <div className="lf-pole-shaft" />
          <div className="lf-pole-ball" />
          <div className="lf-pole-rope" />
        </div>
      )}

      {/* ══ PIRATE FLAG ══ */}
      {showFlag && (
        <div className={`lf-flag-area ${phase === 'unfurling' ? 'flag-unfurling' : ''} ${phase === 'waving' ? 'flag-waving' : ''} ${isIgniting ? 'flag-igniting' : ''} ${isBurning ? 'flag-burning' : ''}`}>
          <div className="lf-flag-cloth">
            <svg viewBox="0 0 420 330" className="lf-jolly-roger" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <filter id="flagTexture">
                  <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="4" result="noise" />
                  <feColorMatrix type="saturate" values="0" in="noise" result="grayNoise" />
                  <feBlend in="SourceGraphic" in2="grayNoise" mode="multiply" />
                </filter>
                <linearGradient id="clothShading" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.06)" />
                  <stop offset="50%" stopColor="rgba(0,0,0,0)" />
                  <stop offset="100%" stopColor="rgba(0,0,0,0.15)" />
                </linearGradient>
                <linearGradient id="hatGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#D4A24C" />
                  <stop offset="100%" stopColor="#A67C3D" />
                </linearGradient>
                <linearGradient id="hatBandGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#8B4513" />
                  <stop offset="50%" stopColor="#A0522D" />
                  <stop offset="100%" stopColor="#8B4513" />
                </linearGradient>
                <linearGradient id="textGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00C8FF" />
                  <stop offset="50%" stopColor="#00A8E1" />
                  <stop offset="100%" stopColor="#0088C0" />
                </linearGradient>
                <filter id="textGlow">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <filter id="skullShadow">
                  <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.4" />
                </filter>
              </defs>

              {/* Flag cloth shape */}
              <path d="M20,12 C50,6 130,2 210,2 C290,2 370,6 400,12 L400,275 C370,282 290,288 210,288 C130,288 50,282 20,275 Z" fill="#0d0d0d" filter="url(#flagTexture)" />
              <path d="M20,12 C50,6 130,2 210,2 C290,2 370,6 400,12 L400,275 C370,282 290,288 210,288 C130,288 50,282 20,275 Z" fill="url(#clothShading)" />
              <path d="M20,12 C50,6 130,2 210,2 C290,2 370,6 400,12 L400,275 C370,282 290,288 210,288 C130,288 50,282 20,275 Z" fill="none" stroke="#1a1a1a" strokeWidth="2" />

              {/* Crossbones */}
              <g filter="url(#skullShadow)">
                <line x1="120" y1="248" x2="300" y2="158" stroke="#c8c8c8" strokeWidth="9" strokeLinecap="round" />
                <line x1="300" y1="248" x2="120" y2="158" stroke="#c8c8c8" strokeWidth="9" strokeLinecap="round" />
                {/* Bone ends */}
                <circle cx="120" cy="248" r="8" fill="#d0d0d0" />
                <circle cx="300" cy="248" r="8" fill="#d0d0d0" />
                <circle cx="120" cy="158" r="8" fill="#d0d0d0" />
                <circle cx="300" cy="158" r="8" fill="#d0d0d0" />
                {/* Bone knuckles */}
                <circle cx="112" cy="242" r="4" fill="#b8b8b8" />
                <circle cx="128" cy="242" r="4" fill="#b8b8b8" />
                <circle cx="112" cy="254" r="4" fill="#b8b8b8" />
                <circle cx="128" cy="254" r="4" fill="#b8b8b8" />
                <circle cx="292" cy="242" r="4" fill="#b8b8b8" />
                <circle cx="308" cy="242" r="4" fill="#b8b8b8" />
                <circle cx="292" cy="254" r="4" fill="#b8b8b8" />
                <circle cx="308" cy="254" r="4" fill="#b8b8b8" />
              </g>

              {/* Skull */}
              <g filter="url(#skullShadow)">
                <ellipse cx="210" cy="118" rx="35" ry="42" fill="#d5d5d5" />
                {/* Cheekbones */}
                <ellipse cx="185" cy="128" rx="8" ry="5" fill="#c0c0c0" />
                <ellipse cx="235" cy="128" rx="8" ry="5" fill="#c0c0c0" />
                {/* Eye sockets */}
                <ellipse cx="195" cy="112" rx="8" ry="9" fill="#0d0d0d" />
                <ellipse cx="225" cy="112" rx="8" ry="9" fill="#0d0d0d" />
                {/* Eye glints */}
                <ellipse cx="197" cy="110" rx="2" ry="2.5" fill="rgba(255,255,255,0.1)" />
                <ellipse cx="227" cy="110" rx="2" ry="2.5" fill="rgba(255,255,255,0.1)" />
                {/* Nose */}
                <path d="M207,126 L210,131 L213,126" stroke="#0d0d0d" strokeWidth="2" fill="none" strokeLinecap="round" />
                {/* Teeth row */}
                <path d="M193,142 Q210,154 227,142" stroke="#0d0d0d" strokeWidth="2.5" fill="none" />
                <g stroke="#0d0d0d" strokeWidth="1.5">
                  <line x1="198" y1="142" x2="198" y2="149" />
                  <line x1="206" y1="145" x2="206" y2="151" />
                  <line x1="214" y1="145" x2="214" y2="151" />
                  <line x1="222" y1="142" x2="222" y2="149" />
                </g>
                {/* Jaw line */}
                <path d="M185,138 Q210,165 235,138" stroke="#c0c0c0" strokeWidth="1" fill="none" opacity="0.3" />
              </g>

              {/* Straw Hat */}
              <g>
                {/* Hat brim - wider, more detailed */}
                <ellipse cx="210" cy="85" rx="55" ry="10" fill="url(#hatGrad)" stroke="#8B6914" strokeWidth="1" />
                {/* Brim stitching */}
                <ellipse cx="210" cy="85" rx="50" ry="8" fill="none" stroke="#B8942E" strokeWidth="0.5" strokeDasharray="3,3" />
                {/* Hat crown */}
                <path d="M184,62 Q184,50 210,47 Q236,50 236,62 L236,80 L184,80 Z" fill="url(#hatGrad)" stroke="#8B6914" strokeWidth="1" />
                {/* Crown weave lines */}
                <g stroke="#C4A035" strokeWidth="0.4" opacity="0.4">
                  <line x1="186" y1="58" x2="234" y2="58" />
                  <line x1="186" y1="63" x2="234" y2="63" />
                  <line x1="186" y1="68" x2="234" y2="68" />
                  <line x1="186" y1="73" x2="234" y2="73" />
                  <line x1="186" y1="78" x2="234" y2="78" />
                </g>
                {/* Hat band */}
                <rect x="184" y="76" width="52" height="8" rx="1" fill="url(#hatBandGrad)" stroke="#6B3410" strokeWidth="0.5" />
                {/* Buckle */}
                <rect x="200" y="74" width="20" height="12" rx="2.5" fill="#DAA520" stroke="#B8860B" strokeWidth="1" />
                <rect x="206" y="77" width="8" height="6" rx="1" fill="#0d0d0d" />
              </g>

              {/* LUFFY TV text */}
              <text x="210" y="270" textAnchor="middle" fill="url(#textGrad)" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="900" fontSize="34" letterSpacing="7" filter="url(#textGlow)">LUFFY TV</text>
            </svg>
          </div>

          {/* ══ Burn overlay on flag ══ */}
          {isBurning && <div className="lf-burn-overlay" />}
          {/* ══ Char edge effect ══ */}
          {isBurning && <div className="lf-char-edges" />}
        </div>
      )}

      {/* ══ CANVAS PARTICLE LAYER ══ */}
      <canvas ref={canvasRef} className="lf-canvas" />

      {/* ══ ASH RAIN OVERLAY (CSS) ══ */}
      {(phase === 'burning' || phase === 'embers' || phase === 'reveal') && (
        <div className="lf-ash-rain">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="lf-ash-dot" style={{
              '--ash-x': `${Math.random() * 100}%`,
              '--ash-delay': `${Math.random() * 4}s`,
              '--ash-dur': `${3 + Math.random() * 5}s`,
              '--ash-size': `${1 + Math.random() * 2}px`,
              '--ash-drift': `${(Math.random() - 0.5) * 60}px`,
            } as React.CSSProperties} />
          ))}
        </div>
      )}

      {/* ══ SKIP BUTTON ══ */}
      <button onClick={skip} className="lf-skip-btn" aria-label="Skip intro">
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
