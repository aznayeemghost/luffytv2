"use client";

import { useState, useEffect, useCallback } from "react";

// ============================================================
// Types
// ============================================================

interface LiveMatch {
  id: string;
  title: string;
  sport: string;
  league?: string;
  homeTeam?: string;
  awayTeam?: string;
  score?: string;
  status?: string;
  language?: string;
  quality?: string;
  viewers?: number;
  slug?: string;
  provider?: string;
  embedUrl?: string;
  thumbnail?: string;
  startTime?: string;
}

interface Channel {
  id: string;
  name: string;
  category: string;
  embedUrl: string;
  logo: string;
}

type SportFilter = "all" | "football" | "basketball" | "cricket" | "tennis" | "baseball" | "hockey" | "mma" | "other";
type ChannelCategoryFilter = "all" | "Sports" | "News" | "Entertainment" | "Music";

// ============================================================
// Sport Icons
// ============================================================

function SportIcon({ sport, className }: { sport: string; className?: string }) {
  const s = sport.toLowerCase();
  if (s.includes("football") || s.includes("soccer")) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
        <path d="M2 12h20" />
      </svg>
    );
  }
  if (s.includes("basketball")) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a14.5 14.5 0 0 1 0 20 14.5 14.5 0 0 1 0-20" />
        <path d="M2 12h20" />
        <path d="M12 2a10 10 0 0 1 0 20" />
      </svg>
    );
  }
  if (s.includes("cricket")) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <rect x="9" y="9" width="6" height="6" rx="1" />
        <line x1="12" y1="2" x2="12" y2="4" />
        <line x1="12" y1="20" x2="12" y2="22" />
      </svg>
    );
  }
  if (s.includes("tennis")) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a14.5 14.5 0 0 0 0 20" />
        <path d="M12 2a14.5 14.5 0 0 1 0 20" />
      </svg>
    );
  }
  if (s.includes("baseball")) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M8 2c0 0-1 4-1 10s1 10 1 10" />
        <path d="M16 2c0 0 1 4 1 10s-1 10-1 10" />
      </svg>
    );
  }
  if (s.includes("hockey")) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }
  if (s.includes("mma") || s.includes("boxing") || s.includes("fight")) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    );
  }
  // Default sports icon
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

// ============================================================
// Live Pulse Indicator
// ============================================================

function LivePulse() {
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
    </span>
  );
}

// ============================================================
// Video Player Modal (Top of Page)
// ============================================================

function VideoPlayer({ url, title, onClose }: { url: string; title: string; onClose: () => void }) {
  return (
    <div className="w-full fade-in mb-6">
      <div className="relative w-full aspect-video max-h-[70vh] rounded-xl overflow-hidden border border-white/[0.06] bg-black shadow-2xl shadow-black/60">
        <iframe
          src={url}
          title={title}
          className="w-full h-full"
          allowFullScreen
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-presentation"
        />
        {/* Close button overlay */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/80 backdrop-blur-sm border border-white/10 text-white/70 hover:text-white hover:bg-black/90 transition-all text-xs font-bold"
          style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M6 18L18 6M6 6l12 12" />
          </svg>
          CLOSE
        </button>
        {/* Title overlay */}
        <div className="absolute top-3 left-3 z-10 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/80 backdrop-blur-sm border border-white/10">
          <LivePulse />
          <span className="text-xs font-bold text-white/80" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>
            LIVE
          </span>
          <span className="text-xs text-white/50" style={{ fontFamily: "var(--font-inter), 'Inter', sans-serif" }}>
            {title}
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Main Live Page Component
// ============================================================

export default function LivePage() {
  // State
  const [activePlayer, setActivePlayer] = useState<{ url: string; title: string } | null>(null);
  const [liveMatches, setLiveMatches] = useState<LiveMatch[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(true);
  const [channelsLoading, setChannelsLoading] = useState(true);
  const [sportFilter, setSportFilter] = useState<SportFilter>("all");
  const [channelFilter, setChannelFilter] = useState<ChannelCategoryFilter>("all");
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch live matches
  const fetchMatches = useCallback(async () => {
    try {
      const res = await fetch("/api/live/matches");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const normalized: LiveMatch[] = data.map((match: Record<string, unknown>, idx: number) => ({
            id: String(match.id || match.match_id || `match-${idx}`),
            title: String(match.title || match.name || match.match || "Live Match"),
            sport: String(match.sport || match.sport_name || match.type || "Football"),
            league: String(match.league || match.competition || match.tournament || ""),
            homeTeam: String(match.home_team || match.home || match.team1 || ""),
            awayTeam: String(match.away_team || match.away || match.team2 || ""),
            score: String(match.score || match.result || ""),
            status: String(match.status || match.state || "live"),
            language: String(match.language || match.lang || "English"),
            quality: String(match.quality || "HD"),
            viewers: Number(match.viewers || match.viewers_count || 0),
            slug: String(match.slug || match.match_slug || ""),
            provider: String(match.provider || match.source || "embedsports"),
            embedUrl: String(match.embedUrl || match.embed_url || match.stream_url || ""),
            thumbnail: String(match.thumbnail || match.image || match.poster || ""),
            startTime: String(match.start_time || match.kickoff || ""),
          }));
          setLiveMatches(normalized);
        } else if (data && typeof data === "object") {
          const arr = data.matches || data.data || data.results || data.events || [];
          if (Array.isArray(arr)) {
            const normalized: LiveMatch[] = arr.map((match: Record<string, unknown>, idx: number) => ({
              id: String(match.id || match.match_id || `match-${idx}`),
              title: String(match.title || match.name || match.match || "Live Match"),
              sport: String(match.sport || match.sport_name || match.type || "Football"),
              league: String(match.league || match.competition || match.tournament || ""),
              homeTeam: String(match.home_team || match.home || match.team1 || ""),
              awayTeam: String(match.away_team || match.away || match.team2 || ""),
              score: String(match.score || match.result || ""),
              status: String(match.status || match.state || "live"),
              language: String(match.language || match.lang || "English"),
              quality: String(match.quality || "HD"),
              viewers: Number(match.viewers || match.viewers_count || 0),
              slug: String(match.slug || match.match_slug || ""),
              provider: String(match.provider || match.source || "embedsports"),
              embedUrl: String(match.embedUrl || match.embed_url || match.stream_url || ""),
              thumbnail: String(match.thumbnail || match.image || match.poster || ""),
              startTime: String(match.start_time || match.kickoff || ""),
            }));
            setLiveMatches(normalized);
          }
        }
      }
    } catch (err) {
      console.error("Error fetching live matches:", err);
    } finally {
      setMatchesLoading(false);
    }
  }, []);

  // Fetch channels
  const fetchChannels = useCallback(async () => {
    try {
      const res = await fetch("/api/live/channels");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setChannels(data);
        }
      }
    } catch (err) {
      console.error("Error fetching channels:", err);
    } finally {
      setChannelsLoading(false);
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchMatches();
    fetchChannels();
  }, [fetchMatches, fetchChannels]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchMatches();
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchMatches]);

  // Get embed URL for a match
  const getMatchEmbedUrl = (match: LiveMatch): string => {
    if (match.embedUrl) return match.embedUrl;
    const slug = match.slug || match.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const provider = match.provider || "stream";
    return `https://embedsports.top/embed/${provider}/${slug}`;
  };

  // Watch handler
  const handleWatch = (url: string, title: string) => {
    setActivePlayer({ url, title });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Filter matches by sport
  const getSportCategory = (sport: string): SportFilter => {
    const s = sport.toLowerCase();
    if (s.includes("football") || s.includes("soccer")) return "football";
    if (s.includes("basketball")) return "basketball";
    if (s.includes("cricket")) return "cricket";
    if (s.includes("tennis")) return "tennis";
    if (s.includes("baseball")) return "baseball";
    if (s.includes("hockey")) return "hockey";
    if (s.includes("mma") || s.includes("boxing") || s.includes("fight")) return "mma";
    return "other";
  };

  const filteredMatches = sportFilter === "all"
    ? liveMatches
    : liveMatches.filter((m) => getSportCategory(m.sport) === sportFilter);

  const filteredChannels = channelFilter === "all"
    ? channels
    : channels.filter((c) => c.category === channelFilter);

  // Sport filter tabs
  const sportFilters: { id: SportFilter; label: string; icon: string }[] = [
    { id: "all", label: "All", icon: "🔥" },
    { id: "football", label: "Football", icon: "⚽" },
    { id: "basketball", label: "Basketball", icon: "🏀" },
    { id: "cricket", label: "Cricket", icon: "🏏" },
    { id: "tennis", label: "Tennis", icon: "🎾" },
    { id: "baseball", label: "Baseball", icon: "⚾" },
    { id: "hockey", label: "Hockey", icon: "🏒" },
    { id: "mma", label: "MMA / Fight", icon: "🥊" },
  ];

  // Channel category tabs
  const channelCategoryFilters: { id: ChannelCategoryFilter; label: string; icon: string }[] = [
    { id: "all", label: "All", icon: "📡" },
    { id: "Sports", label: "Sports", icon: "⚽" },
    { id: "News", label: "News", icon: "📰" },
    { id: "Entertainment", label: "Entertainment", icon: "🎬" },
    { id: "Music", label: "Music", icon: "🎵" },
  ];

  // Format viewer count
  const formatViewers = (count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return String(count);
  };

  return (
    <div className="space-y-8 fade-in">
      {/* ─── Video Player ─── */}
      {activePlayer && (
        <VideoPlayer
          url={activePlayer.url}
          title={activePlayer.title}
          onClose={() => setActivePlayer(null)}
        />
      )}

      {/* ─── Header ─── */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <LivePulse />
          <h1
            className="text-2xl sm:text-3xl font-bold text-white"
            style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
          >
            Live <span className="text-[#7c6cf0]">TV & Sports</span>
          </h1>
        </div>
        <p
          className="text-sm text-zinc-500"
          style={{ fontFamily: "var(--font-inter), 'Inter', sans-serif" }}
        >
          Watch live sports matches and 24/7 TV channels from around the world
        </p>
        {/* Auto-refresh toggle */}
        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              autoRefresh
                ? "bg-[#7c6cf0]/15 text-[#7c6cf0] border border-[#7c6cf0]/25"
                : "bg-white/[0.03] text-zinc-500 border border-white/[0.05]"
            }`}
            style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${autoRefresh ? "bg-[#7c6cf0] animate-pulse" : "bg-zinc-600"}`} />
            AUTO-REFRESH {autoRefresh ? "ON" : "OFF"}
          </button>
          <button
            onClick={() => { fetchMatches(); fetchChannels(); }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-white/[0.03] text-zinc-500 hover:text-white border border-white/[0.05] hover:border-white/[0.1] transition-all"
            style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M23 4v6h-6" />
              <path d="M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
            </svg>
            REFRESH NOW
          </button>
        </div>
      </div>

      {/* ═════════════════════════════════════════════
          SECTION 1: LIVE SPORTS MATCHES
          ═════════════════════════════════════════════ */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="section-header">
            <h2
              className="text-lg sm:text-xl font-bold text-white"
              style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
            >
              Live Matches
            </h2>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/15 text-red-400 border border-red-500/25">
            {liveMatches.length} LIVE
          </span>
        </div>

        {/* Sport Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto scroll-container pb-2">
          {sportFilters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setSportFilter(filter.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                sportFilter === filter.id
                  ? "bg-[#7c6cf0] text-white shadow-lg shadow-[#7c6cf0]/25"
                  : "bg-white/[0.04] text-zinc-400 hover:text-white hover:bg-white/[0.08] border border-white/[0.06]"
              }`}
              style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
            >
              <span>{filter.icon}</span>
              {filter.label}
            </button>
          ))}
        </div>

        {/* Matches Grid */}
        {matchesLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-[16/10] skeleton rounded-xl" />
            ))}
          </div>
        ) : filteredMatches.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[800px] overflow-y-auto scroll-container pr-1 custom-scrollbar">
            {filteredMatches.map((match, idx) => (
              <div
                key={match.id || idx}
                className="group relative bg-white/[0.02] border border-white/[0.05] rounded-xl overflow-hidden hover:bg-white/[0.05] hover:border-[#7c6cf0]/20 transition-all duration-300"
              >
                {/* Thumbnail / Sport background */}
                <div className="relative h-32 bg-gradient-to-br from-[#7c6cf0]/10 via-transparent to-[#4CC9F0]/5 flex items-center justify-center overflow-hidden">
                  {match.thumbnail ? (
                    <img
                      src={match.thumbnail}
                      alt={match.title}
                      className="w-full h-full object-cover opacity-40 group-hover:opacity-60 transition-opacity"
                    />
                  ) : (
                    <SportIcon sport={match.sport} className="w-12 h-12 text-[#7c6cf0]/30 group-hover:text-[#7c6cf0]/50 transition-colors" />
                  )}
                  {/* Live badge */}
                  <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-500/90 backdrop-blur-sm">
                    <LivePulse />
                    <span className="text-[10px] font-bold text-white" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>
                      LIVE
                    </span>
                  </div>
                  {/* Sport badge */}
                  <div className="absolute top-2 right-2 px-2 py-1 rounded-md bg-black/60 backdrop-blur-sm">
                    <span className="text-[10px] font-bold text-white/70" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>
                      {match.sport}
                    </span>
                  </div>
                  {/* Score overlay */}
                  {match.score && (
                    <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-md bg-black/70 backdrop-blur-sm">
                      <span className="text-sm font-bold text-white" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>
                        {match.score}
                      </span>
                    </div>
                  )}
                </div>

                {/* Match Info */}
                <div className="p-4 space-y-3">
                  <h3
                    className="text-sm font-bold text-white leading-tight line-clamp-2 group-hover:text-[#7c6cf0] transition-colors"
                    style={{ fontFamily: "var(--font-inter), 'Inter', sans-serif" }}
                  >
                    {match.title}
                  </h3>

                  {/* League */}
                  {match.league && (
                    <p
                      className="text-[11px] text-zinc-500 truncate"
                      style={{ fontFamily: "var(--font-inter), 'Inter', sans-serif" }}
                    >
                      {match.league}
                    </p>
                  )}

                  {/* Badges */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {match.language && (
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-[#7c6cf0]/10 text-[#a78bfa] border border-[#7c6cf0]/15">
                        {match.language}
                      </span>
                    )}
                    {match.quality && (
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/15">
                        {match.quality}
                      </span>
                    )}
                    {match.viewers > 0 && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold bg-green-500/10 text-green-400 border border-green-500/15">
                        <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                        </svg>
                        {formatViewers(match.viewers)}
                      </span>
                    )}
                  </div>

                  {/* Watch Button */}
                  <button
                    onClick={() => handleWatch(getMatchEmbedUrl(match), match.title)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold bg-[#7c6cf0] text-white hover:bg-[#6b5ce0] hover:shadow-[0_0_20px_rgba(124,108,240,0.4)] transition-all"
                    style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                    WATCH LIVE
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
            <div className="w-14 h-14 rounded-xl bg-white/[0.04] flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <p className="text-zinc-500 text-sm" style={{ fontFamily: "var(--font-inter), 'Inter', sans-serif" }}>
              {sportFilter === "all"
                ? "No live matches at the moment. Check back soon!"
                : `No live ${sportFilter} matches right now.`}
            </p>
            <p className="text-zinc-600 text-xs mt-1" style={{ fontFamily: "var(--font-inter), 'Inter', sans-serif" }}>
              Live matches refresh automatically every 30 seconds
            </p>
          </div>
        )}
      </section>

      {/* Divider */}
      <div className="section-divider" />

      {/* ═════════════════════════════════════════════
          SECTION 2: LIVE TV CHANNELS
          ═════════════════════════════════════════════ */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="section-header">
            <h2
              className="text-lg sm:text-xl font-bold text-white"
              style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
            >
              Live TV Channels
            </h2>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#7c6cf0]/15 text-[#7c6cf0] border border-[#7c6cf0]/25">
            {channels.length} CHANNELS
          </span>
        </div>

        {/* Channel Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto scroll-container pb-2">
          {channelCategoryFilters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setChannelFilter(filter.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                channelFilter === filter.id
                  ? "bg-[#7c6cf0] text-white shadow-lg shadow-[#7c6cf0]/25"
                  : "bg-white/[0.04] text-zinc-400 hover:text-white hover:bg-white/[0.08] border border-white/[0.06]"
              }`}
              style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
            >
              <span>{filter.icon}</span>
              {filter.label}
            </button>
          ))}
        </div>

        {/* Channels Grid */}
        {channelsLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-square skeleton rounded-xl" />
            ))}
          </div>
        ) : filteredChannels.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 max-h-[600px] overflow-y-auto scroll-container pr-1 custom-scrollbar">
            {filteredChannels.map((channel, idx) => (
              <button
                key={channel.id || idx}
                onClick={() => handleWatch(channel.embedUrl, channel.name)}
                className="group relative bg-white/[0.02] border border-white/[0.05] rounded-xl p-4 hover:bg-white/[0.06] hover:border-[#7c6cf0]/20 transition-all duration-300 text-center space-y-3"
              >
                {/* Channel Logo */}
                <div className="w-14 h-14 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mx-auto group-hover:bg-[#7c6cf0]/10 group-hover:border-[#7c6cf0]/20 transition-all">
                  <span className="text-2xl">{channel.logo}</span>
                </div>

                {/* Channel Name */}
                <h3
                  className="text-xs font-bold text-white/80 leading-tight line-clamp-2 group-hover:text-white transition-colors"
                  style={{ fontFamily: "var(--font-inter), 'Inter', sans-serif" }}
                >
                  {channel.name}
                </h3>

                {/* Category Badge */}
                <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold ${
                  channel.category === "Sports"
                    ? "bg-green-500/10 text-green-400 border border-green-500/15"
                    : channel.category === "News"
                    ? "bg-blue-500/10 text-blue-400 border border-blue-500/15"
                    : channel.category === "Music"
                    ? "bg-pink-500/10 text-pink-400 border border-pink-500/15"
                    : "bg-amber-500/10 text-amber-400 border border-amber-500/15"
                }`}>
                  {channel.category}
                </span>

                {/* Watch indicator on hover */}
                <div className="absolute inset-0 rounded-xl flex items-center justify-center bg-[#7c6cf0]/0 group-hover:bg-[#7c6cf0]/10 transition-all">
                  <svg
                    className="w-8 h-8 text-[#7c6cf0] opacity-0 group-hover:opacity-100 transition-opacity"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
            <div className="w-14 h-14 rounded-xl bg-white/[0.04] flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
            </div>
            <p className="text-zinc-500 text-sm" style={{ fontFamily: "var(--font-inter), 'Inter', sans-serif" }}>
              No channels available for this category
            </p>
          </div>
        )}
      </section>

      {/* Divider */}
      <div className="section-divider" />

      {/* ═════════════════════════════════════════════
          SECTION 3: QUICK INFO / LEGEND
          ═════════════════════════════════════════════ */}
      <section className="space-y-4">
        <div className="section-header">
          <h2
            className="text-lg sm:text-xl font-bold text-white"
            style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
          >
            Stream Sources
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#7c6cf0]/10 flex items-center justify-center">
                <svg className="w-4 h-4 text-[#7c6cf0]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              </div>
              <span className="text-xs font-bold text-white" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>EmbedSports</span>
            </div>
            <p className="text-[11px] text-zinc-500" style={{ fontFamily: "var(--font-inter), 'Inter', sans-serif" }}>
              Live sports streams with multiple providers and quality options
            </p>
          </div>
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <rect x="2" y="3" width="20" height="14" rx="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
              </div>
              <span className="text-xs font-bold text-white" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>NTV Channels</span>
            </div>
            <p className="text-[11px] text-zinc-500" style={{ fontFamily: "var(--font-inter), 'Inter', sans-serif" }}>
              24/7 TV channel streams with token-based access
            </p>
          </div>
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <span className="text-xs font-bold text-white" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>DLHD Streams</span>
            </div>
            <p className="text-[11px] text-zinc-500" style={{ fontFamily: "var(--font-inter), 'Inter', sans-serif" }}>
              Direct streaming links for sports and entertainment channels
            </p>
          </div>
        </div>
      </section>

      {/* Custom scrollbar styles */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(124, 108, 240, 0.3);
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}
