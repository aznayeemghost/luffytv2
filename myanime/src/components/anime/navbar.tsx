"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "./store";
import Image from "next/image";

// SVG icons for nav items
function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}
function MovieIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
      <line x1="7" y1="2" x2="7" y2="22" />
      <line x1="17" y1="2" x2="17" y2="22" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <line x1="2" y1="7" x2="7" y2="7" />
      <line x1="2" y1="17" x2="7" y2="17" />
      <line x1="17" y1="7" x2="22" y2="7" />
      <line x1="17" y1="17" x2="22" y2="17" />
    </svg>
  );
}
function TVIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="15" rx="2" ry="2" />
      <polyline points="17 2 12 7 7 2" />
    </svg>
  );
}
function AnimeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <line x1="9" y1="9" x2="9.01" y2="9" />
      <line x1="15" y1="9" x2="15.01" y2="9" />
    </svg>
  );
}
function MangaIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
    </svg>
  );
}
function ListIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}
function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}
function ScheduleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}
function HistoryIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

// ── Floating Luffy Mascot ──
function LuffyMascot() {
  const [hovered, setHovered] = useState(false);
  const [peeking, setPeeking] = useState(false);

  // Random peek animation
  useEffect(() => {
    const interval = setInterval(() => {
      setPeeking(true);
      setTimeout(() => setPeeking(false), 3000);
    }, 15000 + Math.random() * 20000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="luffy-mascot-wrapper"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className={`luffy-mascot ${hovered ? "luffy-mascot-hover" : ""} ${peeking ? "luffy-mascot-peek" : ""}`}>
        <Image
          src="/luffy-mascot.png"
          alt="Luffy"
          width={80}
          height={80}
          className="luffy-mascot-img"
          priority
        />
        {/* Speech bubble on hover */}
        {hovered && (
          <div className="luffy-speech-bubble">
            <span>Yo! Need help? 👋</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Navbar() {
  const { route, navigate } = useAppStore();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate({ page: "search", query: searchQuery.trim() });
      setSearchOpen(false);
      setSearchQuery("");
    }
  };

  const navItems = [
    { id: "home", label: "Home", icon: HomeIcon },
    { id: "dub", label: "Anime", icon: AnimeIcon },
    { id: "schedule", label: "Schedule", icon: ScheduleIcon },
    { id: "movies", label: "Movies", icon: MovieIcon },
    { id: "tv", label: "TV Shows", icon: TVIcon },
    { id: "manga", label: "Manga", icon: MangaIcon },
    { id: "bookmarks", label: "My List", icon: ListIcon },
  ];

  const isActive = (id: string) => {
    if (id === "home" && route.page === "home") return true;
    if (id === "movies" && route.page === "movies") return true;
    if (id === "tv" && route.page === "tv") return true;
    if (id === "dub" && (route.page === "dub" || route.page === "anime" || route.page === "watch")) return true;
    if (id === "schedule" && route.page === "schedule") return true;
    if (id === "manga" && (route.page === "manga" || route.page === "manga-detail" || route.page === "manga-read")) return true;
    if (id === "bookmarks" && route.page === "bookmarks") return true;
    return false;
  };

  const handleNav = (id: string) => {
    if (id === "home") navigate({ page: "home" });
    else if (id === "movies") navigate({ page: "movies" });
    else if (id === "tv") navigate({ page: "tv" });
    else if (id === "schedule") navigate({ page: "schedule" });
    else if (id === "dub") navigate({ page: "dub" });
    else if (id === "manga") navigate({ page: "manga" });
    else if (id === "bookmarks") navigate({ page: "bookmarks" });
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* ═══════════════════════════════════════════
          TRANSPARENT FLOATING NAVBAR — LunarAnime style
          Fully transparent at top, gains subtle blur on scroll
          Mascot sits on the left with the logo
          ═══════════════════════════════════════════ */}
      <nav
        className={`lunar-nav ${scrolled ? "lunar-nav-scrolled" : ""}`}
      >
        <div className="lunar-nav-inner">
          {/* Logo + Mascot */}
          <button onClick={() => navigate({ page: "home" })} className="lunar-logo group">
            <div className="lunar-logo-mascot">
              <Image
                src="/luffy-mascot.png"
                alt="Luffy"
                width={36}
                height={36}
                className="lunar-mascot-nav"
                priority
              />
            </div>
            <div className="lunar-logo-text">
              <span className="lunar-logo-luffy">Luffy</span>
              <span className="lunar-logo-tv">TV</span>
            </div>
          </button>

          {/* Center Nav Items — Desktop */}
          <div className="lunar-nav-links">
            {navItems.map(item => {
              const IconComp = item.icon;
              const active = isActive(item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => handleNav(item.id)}
                  className={`lunar-nav-link ${active ? "lunar-nav-active" : ""}`}
                >
                  <IconComp className="lunar-nav-icon" />
                  <span>{item.label}</span>
                  {active && <div className="lunar-nav-dot" />}
                </button>
              );
            })}
          </div>

          {/* Right side: Search + History */}
          <div className="lunar-nav-right">
            {/* Search button */}
            <button
              onClick={() => setSearchOpen(true)}
              className="lunar-search-btn"
            >
              <SearchIcon className="w-4 h-4" />
              <span className="hidden sm:inline text-sm">Search</span>
              <kbd className="lunar-search-kbd">⌘K</kbd>
            </button>

            {/* History */}
            <button
              onClick={() => navigate({ page: "history" })}
              className="lunar-icon-btn"
              title="Watch History"
            >
              <HistoryIcon className="w-4 h-4" />
            </button>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lunar-hamburger md:hidden"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                {mobileMenuOpen ? <path d="M6 18L18 6M6 6l12 12" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* Floating Mascot — bottom right corner */}
      <LuffyMascot />

      {/* Mobile Menu Overlay — LunarAnime style full screen */}
      {mobileMenuOpen && (
        <div className="lunar-mobile-menu fade-in">
          <div className="lunar-mobile-menu-inner">
            {/* Mascot at top */}
            <div className="lunar-mobile-mascot">
              <Image
                src="/luffy-mascot.png"
                alt="Luffy"
                width={60}
                height={60}
                className="rounded-2xl"
                priority
              />
              <span className="text-lg font-bold ml-3">
                <span className="text-purple-400">Luffy</span>
                <span className="text-white">TV</span>
              </span>
            </div>

            <button
              onClick={() => setMobileMenuOpen(false)}
              className="lunar-mobile-close"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="lunar-mobile-links">
              {navItems.map(item => {
                const IconComp = item.icon;
                const active = isActive(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNav(item.id)}
                    className={`lunar-mobile-link ${active ? "lunar-mobile-active" : ""}`}
                  >
                    <IconComp className="w-5 h-5" />
                    {item.label}
                    {active && <div className="lunar-mobile-active-bar" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Search Modal — LunarAnime style centered command palette */}
      {searchOpen && (
        <div className="lunar-search-overlay" onClick={() => setSearchOpen(false)}>
          <div className="lunar-search-modal" onClick={e => e.stopPropagation()}>
            <form onSubmit={handleSearch} className="lunar-search-form">
              <SearchIcon className="w-5 h-5 text-purple-400 shrink-0" />
              <input
                autoFocus
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search anime, movies, TV shows, manga..."
                className="lunar-search-input"
              />
              <button type="button" onClick={() => setSearchOpen(false)} className="lunar-search-esc">ESC</button>
            </form>
            {searchQuery && (
              <div className="lunar-search-results">
                <button
                  onClick={handleSearch}
                  className="lunar-search-result-item"
                >
                  <SearchIcon className="w-4 h-4 text-zinc-500" />
                  <span className="text-sm text-zinc-400">Search for &quot;{searchQuery}&quot;</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mobile Bottom Nav — LunarAnime style with mascot */}
      <div className="lunar-bottom-nav md:hidden">
        <div className="lunar-bottom-nav-inner">
          {navItems.slice(0, 4).map(item => {
            const IconComp = item.icon;
            const active = isActive(item.id);
            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                className={`lunar-bottom-item ${active ? "lunar-bottom-active" : ""}`}
              >
                <IconComp className="w-5 h-5" />
                <span>{item.label}</span>
                {active && <div className="lunar-bottom-indicator" />}
              </button>
            );
          })}
          <button
            onClick={() => setSearchOpen(true)}
            className="lunar-bottom-item"
          >
            <SearchIcon className="w-5 h-5 text-zinc-500" />
            <span className="text-zinc-500">Search</span>
          </button>
        </div>
      </div>
    </>
  );
}
