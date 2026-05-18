"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useAppStore } from "./store";

// ── Floating particles ──
function Particles() {
  return (
    <div className="landing-particles">
      {Array.from({ length: 30 }).map((_, i) => (
        <div
          key={i}
          className="landing-particle"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDuration: `${6 + Math.random() * 10}s`,
            animationDelay: `${Math.random() * 5}s`,
            width: `${2 + Math.random() * 3}px`,
            height: `${2 + Math.random() * 3}px`,
            opacity: 0.2 + Math.random() * 0.4,
          }}
        />
      ))}
    </div>
  );
}

// ── Anime scene letter ──
function SceneLetter({ char, index }: { char: string; index: number }) {
  return (
    <span
      className="landing-scene-letter"
      style={{ animationDelay: `${0.3 + index * 0.08}s` }}
    >
      {char}
    </span>
  );
}

// ── Feature pill ──
function FeaturePill({ icon, text, delay }: { icon: React.ReactNode; text: string; delay: number }) {
  return (
    <div className="landing-feature-pill" style={{ animationDelay: `${delay}s` }}>
      {icon}
      <span>{text}</span>
    </div>
  );
}

export default function LandingPage({ onEnter }: { onEnter: () => void }) {
  const navigate = useAppStore(s => s.navigate);
  const [mounted, setMounted] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Parallax mouse tracking
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      setMousePos({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20,
      });
    };
    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, []);

  const handleStartWatching = () => {
    localStorage.setItem("luffytv_entered", "true");
    onEnter();
    navigate({ page: "home" });
  };

  if (!mounted) return null;

  return (
    <div className="landing-page">
      {/* Cosmic background image */}
      <div
        className="landing-bg-image"
        style={{
          transform: `translate(${mousePos.x * 0.3}px, ${mousePos.y * 0.3}px)`,
        }}
      >
        <Image
          src="/landing-bg.png"
          alt=""
          fill
          className="object-cover"
          priority
          quality={90}
        />
      </div>

      {/* Additional gradient overlays */}
      <div className="landing-gradient-overlay" />
      <div className="landing-gradient-vignette" />

      {/* Particles */}
      <Particles />

      {/* Mascot — top area, floating */}
      <div className="landing-mascot-container" style={{ transform: `translate(${mousePos.x * 0.5}px, ${mousePos.y * 0.5}px)` }}>
        <div className="landing-mascot-glow" />
        <Image
          src="/luffy-mascot.png"
          alt="Luffy"
          width={120}
          height={120}
          className="landing-mascot-img"
          priority
        />
      </div>

      {/* ── Main Content ── */}
      <div className="landing-content">
        {/* Title: LUFFY TV — large with anime scene fills */}
        <h1 className="landing-title">
          <div className="landing-title-row">
            {'LUFFY'.split('').map((char, i) => (
              <SceneLetter key={i} char={char} index={i} />
            ))}
          </div>
          <div className="landing-title-row-tv">
            {'TV'.split('').map((char, i) => (
              <SceneLetter key={`tv-${i}`} char={char} index={5 + i} />
            ))}
          </div>
        </h1>

        {/* Tagline */}
        <p className="landing-tagline">
          The anime & manga platform that&apos;s{" "}
          <span className="landing-highlight">free</span>,{" "}
          <span className="landing-highlight">ad-free</span>, and{" "}
          <span className="landing-highlight">beautiful</span>.
        </p>

        {/* Feature pills */}
        <div className="landing-features">
          <FeaturePill
            icon={
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              </svg>
            }
            text="10,000+ Anime"
            delay={0.8}
          />
          <FeaturePill
            icon={
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            }
            text="HD Quality"
            delay={0.9}
          />
          <FeaturePill
            icon={
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
              </svg>
            }
            text="Sub & Dub"
            delay={1.0}
          />
          <FeaturePill
            icon={
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 2a2 2 0 00-2 2v11a3 3 0 106 0V4a2 2 0 00-2-2H4zm1 14a1 1 0 100-2 1 1 0 000 2zm5-1.757l4.9-4.9a2 2 0 000-2.828L13.485 5.1a2 2 0 00-2.828 0L10 5.757v8.486zM16 18H9.071l6-6H16a2 2 0 012 2v2a2 2 0 01-2 2z" clipRule="evenodd" />
              </svg>
            }
            text="Manga & Movies"
            delay={1.1}
          />
        </div>

        {/* Buttons */}
        <div className="landing-buttons">
          <button onClick={handleStartWatching} className="landing-btn-primary">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            Start Watching
          </button>
          <button
            onClick={handleStartWatching}
            className="landing-btn-secondary"
          >
            Explore Library
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Bottom Feature Bar ── */}
      <div className="landing-bottom-bar">
        <div className="landing-bottom-item">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
            <path d="M8 14s1.5 2 4 2 4-2 4-2" />
            <line x1="9" y1="9" x2="9.01" y2="9" />
            <line x1="15" y1="9" x2="15.01" y2="9" />
          </svg>
          <span>Anime</span>
        </div>
        <div className="landing-bottom-item">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
          </svg>
          <span>Manga</span>
        </div>
        <div className="landing-bottom-item">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
            <line x1="7" y1="2" x2="7" y2="22" />
            <line x1="17" y1="2" x2="17" y2="22" />
            <line x1="2" y1="12" x2="22" y2="12" />
          </svg>
          <span>Movies</span>
        </div>
        <div className="landing-bottom-item">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <rect x="2" y="7" width="20" height="15" rx="2" ry="2" />
            <polyline points="17 2 12 7 7 2" />
          </svg>
          <span>TV Shows</span>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="landing-scroll-indicator">
        <div className="landing-scroll-mouse">
          <div className="landing-scroll-wheel" />
        </div>
      </div>
    </div>
  );
}
