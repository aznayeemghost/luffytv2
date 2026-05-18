"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "./store";

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

export default function Navbar() {
  const { route, navigate } = useAppStore();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
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
      {/* Floating Pill Navbar — lunar style */}
      <nav
        className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-black/70 border border-white/10 shadow-lg shadow-black/30"
            : "bg-black/50 border border-white/[0.06]"
        } backdrop-blur-md rounded-full`}
      >
        <div className="flex items-center gap-1 px-3 py-2">
          {/* Logo */}
          <button onClick={() => navigate({ page: "home" })} className="flex items-center gap-2 group shrink-0 mr-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-lg shadow-purple-500/25 group-hover:shadow-purple-500/50 transition-all group-hover:scale-105">
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            </div>
            <span className="hidden sm:block text-sm font-bold gradient-text tracking-tight">Luffy TV</span>
          </button>

          {/* Desktop Nav Items */}
          <div className="hidden md:flex items-center gap-0.5">
            {navItems.map(item => {
              const IconComp = item.icon;
              const active = isActive(item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => handleNav(item.id)}
                  className={`relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-all duration-200 ${
                    active
                      ? "text-purple-300 bg-purple-500/15"
                      : "text-zinc-400 hover:text-white hover:bg-white/[0.06]"
                  }`}
                >
                  <IconComp className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Right side: Search + History */}
          <div className="flex items-center gap-2 ml-2">
            {/* Search button */}
            <button
              onClick={() => setSearchOpen(true)}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-400 bg-white/[0.05] border border-white/[0.08] rounded-full hover:bg-white/[0.08] hover:text-white transition-all"
            >
              <SearchIcon className="w-3.5 h-3.5" />
              <span>Search</span>
              <kbd className="text-[9px] text-zinc-600 bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.06] ml-1">⌘K</kbd>
            </button>

            {/* Mobile search button */}
            <button
              onClick={() => setSearchOpen(true)}
              className="sm:hidden p-1.5 text-zinc-400 hover:text-purple-300 hover:bg-white/[0.06] rounded-full transition-all"
            >
              <SearchIcon className="w-4 h-4" />
            </button>

            {/* History icon */}
            <button
              onClick={() => navigate({ page: "history" })}
              className="p-1.5 text-zinc-400 hover:text-purple-300 hover:bg-white/[0.06] rounded-full transition-all"
              title="Watch History"
            >
              <HistoryIcon className="w-4 h-4" />
            </button>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 text-zinc-400 hover:text-white hover:bg-white/[0.06] rounded-full transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                {mobileMenuOpen ? <path d="M6 18L18 6M6 6l12 12" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-[60] bg-black/98 backdrop-blur-2xl pt-24 px-6 fade-in">
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="absolute top-5 right-5 p-2 text-zinc-400 hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="space-y-2">
            {navItems.map(item => {
              const IconComp = item.icon;
              const active = isActive(item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => handleNav(item.id)}
                  className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-base font-medium transition-all ${
                    active
                      ? "text-purple-300 bg-purple-500/10 border border-purple-500/15"
                      : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
                  }`}
                >
                  <IconComp className="w-5 h-5" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Search Modal */}
      {searchOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]" onClick={() => setSearchOpen(false)}>
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <div className="relative w-full max-w-xl mx-4 bg-[#111] rounded-2xl overflow-hidden shadow-2xl shadow-black/60 border border-white/[0.08]" onClick={e => e.stopPropagation()}>
            <form onSubmit={handleSearch} className="flex items-center gap-3 p-4">
              <SearchIcon className="w-5 h-5 text-purple-400 shrink-0" />
              <input
                autoFocus
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search movies, TV shows, anime, manga..."
                className="flex-1 bg-transparent text-white placeholder-zinc-500 text-sm outline-none"
              />
              <button type="button" onClick={() => setSearchOpen(false)} className="text-xs text-zinc-500 bg-white/[0.06] px-2 py-1 rounded-md border border-white/[0.06]">ESC</button>
            </form>
            {searchQuery && (
              <div className="p-3 border-t border-white/[0.04]">
                <button
                  onClick={handleSearch}
                  className="w-full flex items-center gap-3 p-2.5 hover:bg-white/[0.04] rounded-lg transition-colors text-left"
                >
                  <SearchIcon className="w-4 h-4 text-zinc-500" />
                  <span className="text-sm text-zinc-400">Search for &quot;{searchQuery}&quot;</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass-nav border-t border-white/[0.06]">
        <div className="flex items-center justify-around py-2 px-2" style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}>
          {navItems.slice(0, 4).map(item => {
            const IconComp = item.icon;
            const active = isActive(item.id);
            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                className="mobile-nav-item flex flex-col items-center gap-0.5 py-1 px-3"
              >
                <IconComp className={`w-5 h-5 ${active ? "text-purple-400" : "text-zinc-500"}`} />
                <span className={`text-[10px] font-medium ${active ? "text-purple-400" : "text-zinc-500"}`}>{item.label}</span>
                {active && <div className="nav-indicator" />}
              </button>
            );
          })}
          <button
            onClick={() => setSearchOpen(true)}
            className="mobile-nav-item flex flex-col items-center gap-0.5 py-1 px-3"
          >
            <SearchIcon className="w-5 h-5 text-zinc-500" />
            <span className="text-[10px] font-medium text-zinc-500">Search</span>
          </button>
        </div>
      </div>
    </>
  );
}
