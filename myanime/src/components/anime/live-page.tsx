"use client";

import { useState, useEffect, useCallback } from "react";
import { useAppStore } from "./store";

// ============================================================
// Types
// ============================================================

interface ServerInfo {
  label: string;
  embedUrl: string;
  hd: boolean;
}

interface LiveMatch {
  id: string;
  title: string;
  category: string;
  league: string;
  viewers: number;
  hd: boolean;
  servers: ServerInfo[];
}

interface Channel {
  id: string;
  name: string;
  category: string;
  logo: string;
  servers: Array<{ label: string; embedUrl: string }>;
}

// ============================================================
// Live Pulse
// ============================================================

function LivePulse({ size = "sm" }: { size?: "sm" | "md" | "lg" }) {
  const sz = size === "lg" ? "h-3 w-3" : size === "md" ? "h-2.5 w-2.5" : "h-2 w-2";
  return (
    <span className={`relative flex ${sz}`}>
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
      <span className={`relative inline-flex rounded-full ${sz} bg-red-500`} />
    </span>
  );
}

// ============================================================
// Sport Icon SVGs
// ============================================================

function SportIcon({ sport, className }: { sport: string; className?: string }) {
  const s = sport.toLowerCase();
  if (s.includes("cricket")) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2v20M7 4l5 8-5 8M17 4l-5 8 5 8" />
      </svg>
    );
  }
  if (s.includes("football") || s.includes("soccer")) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
        <path d="M2 12h20" />
      </svg>
    );
  }
  if (s.includes("basketball")) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2v20M2 12h20" />
        <path d="M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07" />
      </svg>
    );
  }
  if (s.includes("mma") || s.includes("boxing") || s.includes("fight")) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <circle cx="12" cy="12" r="10" />
        <path d="M9 9l6 6M15 9l-6 6" />
      </svg>
    );
  }
  if (s.includes("baseball")) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <circle cx="12" cy="12" r="10" />
        <path d="M8 2c0 0-1 4-1 10s1 10 1 10" />
        <path d="M16 2c0 0 1 4 1 10s-1 10-1 10" />
      </svg>
    );
  }
  if (s.includes("hockey")) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <circle cx="12" cy="12" r="10" />
        <path d="M8 12l4-4 4 4M12 8v8" />
      </svg>
    );
  }
  if (s.includes("tennis")) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a14.5 14.5 0 0 0 0 20" />
        <path d="M12 2a14.5 14.5 0 0 1 0 20" />
      </svg>
    );
  }
  if (s.includes("motor") || s.includes("f1") || s.includes("racing")) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    );
  }
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

// ============================================================
// Sport Colors & Emojis
// ============================================================

const sportStyles: Record<string, { gradient: string; accent: string; bg: string; emoji: string }> = {
  cricket: { gradient: "from-amber-500/25 via-amber-600/10 to-transparent", accent: "text-amber-400", bg: "bg-amber-500/10", emoji: "🏏" },
  football: { gradient: "from-emerald-500/25 via-emerald-600/10 to-transparent", accent: "text-emerald-400", bg: "bg-emerald-500/10", emoji: "⚽" },
  soccer: { gradient: "from-emerald-500/25 via-emerald-600/10 to-transparent", accent: "text-emerald-400", bg: "bg-emerald-500/10", emoji: "⚽" },
  basketball: { gradient: "from-orange-500/25 via-orange-600/10 to-transparent", accent: "text-orange-400", bg: "bg-orange-500/10", emoji: "🏀" },
  "mma/boxing": { gradient: "from-rose-500/25 via-rose-600/10 to-transparent", accent: "text-rose-400", bg: "bg-rose-500/10", emoji: "🥊" },
  mma: { gradient: "from-rose-500/25 via-rose-600/10 to-transparent", accent: "text-rose-400", bg: "bg-rose-500/10", emoji: "🥊" },
  boxing: { gradient: "from-rose-500/25 via-rose-600/10 to-transparent", accent: "text-rose-400", bg: "bg-rose-500/10", emoji: "🥊" },
  baseball: { gradient: "from-red-500/25 via-red-600/10 to-transparent", accent: "text-red-400", bg: "bg-red-500/10", emoji: "⚾" },
  hockey: { gradient: "from-cyan-500/25 via-cyan-600/10 to-transparent", accent: "text-cyan-400", bg: "bg-cyan-500/10", emoji: "🏒" },
  tennis: { gradient: "from-lime-500/25 via-lime-600/10 to-transparent", accent: "text-lime-400", bg: "bg-lime-500/10", emoji: "🎾" },
  motorsport: { gradient: "from-violet-500/25 via-violet-600/10 to-transparent", accent: "text-violet-400", bg: "bg-violet-500/10", emoji: "🏎️" },
  rugby: { gradient: "from-teal-500/25 via-teal-600/10 to-transparent", accent: "text-teal-400", bg: "bg-teal-500/10", emoji: "🏉" },
  golf: { gradient: "from-green-500/25 via-green-600/10 to-transparent", accent: "text-green-400", bg: "bg-green-500/10", emoji: "⛳" },
  sports: { gradient: "from-[#7c6cf0]/25 via-[#7c6cf0]/10 to-transparent", accent: "text-[#a78bfa]", bg: "bg-[#7c6cf0]/10", emoji: "📺" },
};

function getSportStyle(category: string) {
  const c = category.toLowerCase();
  for (const key of Object.keys(sportStyles)) {
    if (c.includes(key)) return sportStyles[key];
  }
  return sportStyles.sports;
}

// ============================================================
// Skeleton
// ============================================================

function MatchSkeleton() {
  return (
    <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl overflow-hidden animate-pulse">
      <div className="h-36 bg-white/[0.03]" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-white/[0.04] rounded w-3/4" />
        <div className="h-3 bg-white/[0.03] rounded w-1/2" />
      </div>
    </div>
  );
}

// ============================================================
// Main Live Page
// ============================================================

export default function LivePage() {
  const { navigate } = useAppStore();

  // Data
  const [matches, setMatches] = useState<LiveMatch[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sportFilter, setSportFilter] = useState("all");
  const [channelFilter, setChannelFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"matches" | "channels">("matches");
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Fetch all data in parallel
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [matchesRes, channelsRes] = await Promise.all([
        fetch("/api/live/matches"),
        fetch("/api/live/channels"),
      ]);

      if (matchesRes.ok) {
        const data = await matchesRes.json();
        if (Array.isArray(data)) setMatches(data);
      }

      if (channelsRes.ok) {
        const data = await channelsRes.json();
        if (Array.isArray(data)) setChannels(data);
      }

      setLastRefresh(new Date());
    } catch (err) {
      console.error("Error fetching live data:", err);
      setError("Failed to load live streams. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Auto refresh every 60s
  useEffect(() => {
    const interval = setInterval(fetchAllData, 60000);
    return () => clearInterval(interval);
  }, [fetchAllData]);

  // Navigate to watch page
  const handleWatchMatch = (match: LiveMatch) => {
    navigate({
      page: "live-watch",
      matchId: match.id,
      title: match.title,
      category: match.category,
      servers: JSON.stringify(match.servers),
    });
  };

  const handleWatchChannel = (channel: Channel) => {
    const servers: ServerInfo[] = channel.servers.map(s => ({
      label: s.label,
      embedUrl: s.embedUrl,
      hd: s.label.toLowerCase().includes("hd") || s.label.includes("1"),
    }));
    navigate({
      page: "live-watch",
      matchId: channel.id,
      title: channel.name,
      category: channel.category,
      servers: JSON.stringify(servers),
    });
  };

  // Categories
  const categories = Array.from(new Set(matches.map(m => m.category).filter(Boolean))).sort();
  const channelCategories = Array.from(new Set(channels.map(c => c.category).filter(Boolean))).sort();

  // Filtered
  const filteredMatches = matches.filter(m => {
    const matchesSport = sportFilter === "all" || m.category === sportFilter;
    const matchesSearch = !searchQuery || m.title.toLowerCase().includes(searchQuery.toLowerCase()) || m.league.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSport && matchesSearch;
  });

  const filteredChannels = channels.filter(c => {
    const matchesCat = channelFilter === "all" || c.category === channelFilter;
    const matchesSearch = !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  // Stats
  const totalViewers = matches.reduce((sum, m) => sum + (m.viewers || 0), 0);
  const hdCount = matches.filter(m => m.hd).length;

  // Time since refresh
  const [timeSinceRefresh, setTimeSinceRefresh] = useState("");
  useEffect(() => {
    const update = () => {
      const diff = Math.floor((Date.now() - lastRefresh.getTime()) / 1000);
      if (diff < 5) setTimeSinceRefresh("just now");
      else if (diff < 60) setTimeSinceRefresh(`${diff}s ago`);
      else setTimeSinceRefresh(`${Math.floor(diff / 60)}m ago`);
    };
    update();
    const interval = setInterval(update, 5000);
    return () => clearInterval(interval);
  }, [lastRefresh]);

  return (
    <div className="space-y-6 fade-in">
      {/* ═════════════════════════════════════════════
          HERO HEADER
          ═════════════════════════════════════════════ */}
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.06]" style={{ background: "linear-gradient(135deg, rgba(239,68,68,0.1) 0%, rgba(124,108,240,0.08) 40%, rgba(6,182,212,0.05) 100%)" }}>
        {/* Animated orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 w-80 h-80 bg-red-500/8 rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-[#7c6cf0]/8 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1.5s" }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-cyan-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "3s" }} />
        </div>

        <div className="relative z-10 p-6 sm:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* Left: Title & Stats */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-500/15 border border-red-500/25">
                  <LivePulse size="md" />
                  <span className="text-[11px] font-bold text-red-400 uppercase tracking-wider" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>
                    Live Now
                  </span>
                </div>
                {!loading && (
                  <>
                    <span className="px-3 py-1.5 rounded-xl bg-[#7c6cf0]/15 border border-[#7c6cf0]/25 text-[11px] font-bold text-[#a78bfa]" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>
                      {matches.length + channels.length} Streams
                    </span>
                    {matches.length > 0 && (
                      <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-bold text-emerald-400" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>
                        {matches.length} Matches
                      </span>
                    )}
                    {hdCount > 0 && (
                      <span className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] font-bold text-amber-400" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>
                        {hdCount} HD
                      </span>
                    )}
                  </>
                )}
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>
                Live{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-[#7c6cf0] to-cyan-400">
                  TV & Sports
                </span>
              </h1>

              <p className="text-sm text-white/35 max-w-lg leading-relaxed" style={{ fontFamily: "var(--font-inter), 'Inter', sans-serif" }}>
                Stream live sports and TV channels with multiple servers. Click any match to watch — switch servers if one isn&apos;t working.
              </p>

              {/* Live Stats Bar */}
              {!loading && matches.length > 0 && (
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <span className="text-[11px] text-white/30 font-bold" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>
                      {totalViewers.toLocaleString()} viewers
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-[11px] text-white/30 font-bold" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>
                      Updated {timeSinceRefresh}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Controls */}
            <div className="flex flex-col items-start lg:items-end gap-3">
              {/* Search */}
              <div className="relative w-full lg:w-72">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search matches, channels..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white text-[12px] placeholder-white/20 outline-none focus:border-[#7c6cf0]/30 focus:bg-white/[0.06] transition-all"
                  style={{ fontFamily: "var(--font-inter), 'Inter', sans-serif" }}
                />
              </div>

              {/* Refresh Button */}
              <button
                onClick={fetchAllData}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-bold bg-white/[0.04] text-white/50 hover:text-white border border-white/[0.06] hover:border-white/[0.12] transition-all disabled:opacity-50"
                style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
              >
                <svg className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
                </svg>
                REFRESH
              </button>
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 p-1 bg-white/[0.03] rounded-xl border border-white/[0.05] w-fit mt-6">
            <button
              onClick={() => setViewMode("matches")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-[11px] font-bold transition-all ${
                viewMode === "matches"
                  ? "bg-[#7c6cf0] text-white shadow-lg shadow-[#7c6cf0]/25"
                  : "text-white/40 hover:text-white"
              }`}
              style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
            >
              <SportIcon sport="sports" className="w-3.5 h-3.5" />
              Live Matches ({matches.length})
            </button>
            <button
              onClick={() => setViewMode("channels")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-[11px] font-bold transition-all ${
                viewMode === "channels"
                  ? "bg-[#7c6cf0] text-white shadow-lg shadow-[#7c6cf0]/25"
                  : "text-white/40 hover:text-white"
              }`}
              style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
              TV Channels ({channels.length})
            </button>
          </div>
        </div>
      </div>

      {/* ═════════════════════════════════════════════
          ERROR STATE
          ═════════════════════════════════════════════ */}
      {error && !loading && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-sm font-bold text-white/60 mb-2" style={{ fontFamily: "var(--font-inter), 'Inter', sans-serif" }}>{error}</p>
          <button
            onClick={fetchAllData}
            className="px-6 py-2.5 rounded-xl bg-[#7c6cf0] text-white text-[11px] font-bold hover:bg-[#6b5ce0] transition-all shadow-lg shadow-[#7c6cf0]/25"
            style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
          >
            TRY AGAIN
          </button>
        </div>
      )}

      {/* ═════════════════════════════════════════════
          MATCHES VIEW
          ═════════════════════════════════════════════ */}
      {viewMode === "matches" && !error && (
        <section className="space-y-5">
          {/* Sport Filter Pills with Emojis */}
          <div className="flex items-center gap-2 overflow-x-auto scroll-container pb-2">
            <button
              onClick={() => setSportFilter("all")}
              className={`flex items-center gap-2 px-4 py-2 text-[11px] font-bold rounded-xl transition-all whitespace-nowrap ${
                sportFilter === "all"
                  ? "bg-[#7c6cf0] text-white shadow-lg shadow-[#7c6cf0]/25"
                  : "bg-white/[0.03] text-white/35 hover:text-white hover:bg-white/[0.06] border border-white/[0.05]"
              }`}
              style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
            >
              🌐 All
            </button>
            {categories.map((cat) => {
              const style = getSportStyle(cat);
              const count = matches.filter(m => m.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setSportFilter(cat)}
                  className={`flex items-center gap-2 px-4 py-2 text-[11px] font-bold rounded-xl transition-all whitespace-nowrap ${
                    sportFilter === cat
                      ? "bg-[#7c6cf0] text-white shadow-lg shadow-[#7c6cf0]/25"
                      : `bg-white/[0.03] ${style.accent} hover:bg-white/[0.06] border border-white/[0.05]`
                  }`}
                  style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
                >
                  <span>{style.emoji}</span>
                  {cat}
                  <span className="text-[9px] opacity-50">({count})</span>
                </button>
              );
            })}
          </div>

          {/* Loading */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => <MatchSkeleton key={i} />)}
            </div>
          ) : filteredMatches.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMatches.map((match) => {
                const style = getSportStyle(match.category);
                return (
                  <div
                    key={match.id}
                    onClick={() => handleWatchMatch(match)}
                    className="group relative bg-white/[0.02] border border-white/[0.05] rounded-2xl overflow-hidden hover:bg-white/[0.05] hover:border-white/[0.12] transition-all duration-300 cursor-pointer hover:scale-[1.02] hover:shadow-xl hover:shadow-black/20"
                  >
                    {/* Card Top - Sport gradient */}
                    <div className={`relative h-36 bg-gradient-to-br ${style.gradient} flex items-center justify-center overflow-hidden`}>
                      {/* Dot pattern */}
                      <div
                        className="absolute inset-0 opacity-[0.03]"
                        style={{
                          backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
                          backgroundSize: "20px 20px",
                        }}
                      />

                      {/* Live Badge */}
                      <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/90 backdrop-blur-sm shadow-lg shadow-red-500/20">
                        <LivePulse size="sm" />
                        <span className="text-[9px] font-bold text-white" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>LIVE</span>
                      </div>

                      {/* HD Badge */}
                      {match.hd && (
                        <div className="absolute top-3 right-3 px-2 py-0.5 rounded-md bg-amber-500/90 text-[9px] font-bold text-black" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>
                          HD
                        </div>
                      )}

                      {/* Sport Emoji + Icon */}
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-3xl opacity-60 group-hover:opacity-80 group-hover:scale-110 transition-all duration-500">
                          {style.emoji}
                        </span>
                      </div>

                      {/* Viewers */}
                      {match.viewers > 0 && (
                        <div className="absolute bottom-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/50 backdrop-blur-sm">
                          <svg className="w-3 h-3 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          <span className="text-[9px] font-bold text-white/50" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>
                            {match.viewers.toLocaleString()}
                          </span>
                        </div>
                      )}

                      {/* Play button on hover */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 bg-black/20">
                        <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center scale-75 group-hover:scale-100 transition-transform duration-300 shadow-xl">
                          <svg className="w-6 h-6 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                            <polygon points="5 3 19 12 5 21 5 3" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-4 space-y-3">
                      <h3 className="text-[13px] font-bold text-white/90 leading-snug line-clamp-2 group-hover:text-white transition-colors" style={{ fontFamily: "var(--font-inter), 'Inter', sans-serif" }}>
                        {match.title}
                      </h3>

                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold ${style.bg} ${style.accent}`} style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>
                          <SportIcon sport={match.category} className="w-3 h-3" />
                          {match.category}
                        </span>
                        {match.league && (
                          <span className="text-[10px] text-white/25 font-bold" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>
                            {match.league}
                          </span>
                        )}
                      </div>

                      {/* Server count */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            {match.servers.slice(0, 3).map((server, idx) => (
                              <div
                                key={idx}
                                className={`w-1.5 h-1.5 rounded-full ${server.hd ? "bg-amber-400" : "bg-white/20"}`}
                                title={server.label}
                              />
                            ))}
                          </div>
                          <span className="text-[9px] text-white/20 font-bold" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>
                            {match.servers.length} SERVER{match.servers.length > 1 ? "S" : ""}
                          </span>
                        </div>
                        <span className="text-[9px] font-bold text-[#7c6cf0]/40 group-hover:text-[#7c6cf0] transition-colors" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>
                          WATCH →
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-white/[0.03] flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-white/15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              </div>
              <p className="text-sm font-bold text-white/30 mb-1" style={{ fontFamily: "var(--font-inter), 'Inter', sans-serif" }}>
                No live matches found
              </p>
              <p className="text-[11px] text-white/15" style={{ fontFamily: "var(--font-inter), 'Inter', sans-serif" }}>
                {searchQuery ? "Try a different search" : "Check back later for upcoming matches"}
              </p>
            </div>
          )}
        </section>
      )}

      {/* ═════════════════════════════════════════════
          CHANNELS VIEW
          ═════════════════════════════════════════════ */}
      {viewMode === "channels" && !error && (
        <section className="space-y-5">
          {/* Channel Category Filter */}
          <div className="flex items-center gap-2 overflow-x-auto scroll-container pb-2">
            <button
              onClick={() => setChannelFilter("all")}
              className={`px-4 py-2 text-[11px] font-bold rounded-xl transition-all whitespace-nowrap ${
                channelFilter === "all"
                  ? "bg-[#7c6cf0] text-white shadow-lg shadow-[#7c6cf0]/25"
                  : "bg-white/[0.03] text-white/35 hover:text-white hover:bg-white/[0.06] border border-white/[0.05]"
              }`}
              style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
            >
              All
            </button>
            {channelCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setChannelFilter(cat)}
                className={`px-4 py-2 text-[11px] font-bold rounded-xl transition-all whitespace-nowrap ${
                  channelFilter === cat
                    ? "bg-[#7c6cf0] text-white shadow-lg shadow-[#7c6cf0]/25"
                    : "bg-white/[0.03] text-white/35 hover:text-white hover:bg-white/[0.06] border border-white/[0.05]"
                }`}
                style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
              >
                {cat}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => <MatchSkeleton key={i} />)}
            </div>
          ) : filteredChannels.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredChannels.map((channel) => (
                <div
                  key={channel.id}
                  onClick={() => handleWatchChannel(channel)}
                  className="group relative bg-white/[0.02] border border-white/[0.05] rounded-xl overflow-hidden hover:bg-white/[0.05] hover:border-white/[0.12] hover:border-[#7c6cf0]/20 transition-all duration-300 cursor-pointer hover:scale-[1.02]"
                >
                  <div className="p-4 flex items-center gap-3">
                    {/* Channel Logo/Icon */}
                    <div className="w-10 h-10 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center shrink-0 overflow-hidden">
                      {channel.logo ? (
                        <img
                          src={channel.logo}
                          alt={channel.name}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <svg className="w-5 h-5 text-white/15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <rect x="2" y="3" width="20" height="14" rx="2" />
                          <line x1="8" y1="21" x2="16" y2="21" />
                          <line x1="12" y1="17" x2="12" y2="21" />
                        </svg>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="text-[12px] font-bold text-white/80 truncate group-hover:text-white transition-colors" style={{ fontFamily: "var(--font-inter), 'Inter', sans-serif" }}>
                        {channel.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] font-bold text-white/20 uppercase" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>
                          {channel.category}
                        </span>
                        <span className="text-[9px] font-bold text-[#7c6cf0]/40" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>
                          {channel.servers.length} servers
                        </span>
                      </div>
                    </div>

                    {/* Play icon */}
                    <div className="shrink-0 w-8 h-8 rounded-lg bg-[#7c6cf0]/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                      <svg className="w-3.5 h-3.5 text-[#7c6cf0]" fill="currentColor" viewBox="0 0 24 24">
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-sm font-bold text-white/30 mb-1" style={{ fontFamily: "var(--font-inter), 'Inter', sans-serif" }}>
                No channels found
              </p>
              <p className="text-[11px] text-white/15" style={{ fontFamily: "var(--font-inter), 'Inter', sans-serif" }}>
                Check back later
              </p>
            </div>
          )}
        </section>
      )}

      {/* ═════════════════════════════════════════════
          INFO FOOTER
          ═════════════════════════════════════════════ */}
      <div className="rounded-2xl border border-white/[0.04] bg-white/[0.01] p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-[12px] font-bold text-white/40" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>
              STREAM TIPS
            </h3>
            <p className="text-[11px] text-white/20 leading-relaxed max-w-md" style={{ fontFamily: "var(--font-inter), 'Inter', sans-serif" }}>
              If a stream isn&apos;t working, try switching to another server. Streams auto-refresh every 60 seconds. Data provided by EmbedSports, VIPStreamed, and DLHD.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span className="text-[9px] font-bold text-white/25" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>HD</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
              <span className="text-[9px] font-bold text-white/25" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>SD</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
