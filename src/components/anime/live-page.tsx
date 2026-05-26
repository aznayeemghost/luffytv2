"use client";

import { useState, useEffect, useCallback } from "react";
import { useAppStore } from "./store";

// ─── Types ───
interface MatchSource {
  source: string;
  sourceId: string;
  streamType: "m3u8" | "embed" | "channel";
}

interface LiveMatch {
  id: string;
  title: string;
  category: string;
  sport: string;
  league?: string;
  status: "live" | "upcoming" | "ended";
  date?: number;
  poster?: string;
  viewers?: number;
  homeTeam?: string;
  awayTeam?: string;
  homeLogo?: string;
  awayLogo?: string;
  sources: MatchSource[];
  type: "sport" | "channel";
  channelImage?: string;
  countryCode?: string;
}

type TabType = "sports" | "channels" | "all";

// ─── Live Pulse Dot ───
function LivePulse({ size = "sm" }: { size?: "sm" | "md" | "lg" }) {
  const s = size === "lg" ? "h-3.5 w-3.5" : size === "md" ? "h-2.5 w-2.5" : "h-2 w-2";
  const ps = size === "lg" ? "h-3.5 w-3.5" : size === "md" ? "h-2.5 w-2.5" : "h-2 w-2";
  return (
    <span className="relative flex items-center justify-center">
      <span className={`animate-ping absolute inline-flex ${ps} rounded-full bg-red-400 opacity-75`} />
      <span className={`relative inline-flex rounded-full ${s} bg-red-500`} />
    </span>
  );
}

// ─── Category Filter Config ───
const SPORT_FILTERS = [
  { id: "all", label: "All Sports", icon: "🏟️" },
  { id: "soccer", label: "Soccer", icon: "⚽" },
  { id: "basketball", label: "Basketball", icon: "🏀" },
  { id: "baseball", label: "Baseball", icon: "⚾" },
  { id: "hockey", label: "Hockey", icon: "🏒" },
  { id: "football", label: "Football", icon: "🏈" },
  { id: "tennis", label: "Tennis", icon: "🎾" },
  { id: "fighting", label: "Fighting", icon: "🥊" },
  { id: "other", label: "Other", icon: "🎯" },
];

const CHANNEL_CATEGORIES = [
  { id: "all", label: "All Channels" },
  { id: "us", label: "🇺🇸 USA" },
  { id: "uk", label: "🇬🇧 UK" },
  { id: "de", label: "🇩🇪 Germany" },
  { id: "fr", label: "🇫🇷 France" },
  { id: "es", label: "🇪🇸 Spain" },
  { id: "it", label: "🇮🇹 Italy" },
  { id: "in", label: "🇮🇳 India" },
  { id: "br", label: "🇧🇷 Brazil" },
  { id: "other", label: "🌍 Other" },
];

// ─── Sport Match Card ───
function MatchCard({ match, onWatch }: { match: LiveMatch; onWatch: (m: LiveMatch) => void }) {
  const isLive = match.status === "live";
  const isUpcoming = match.status === "upcoming";
  const primarySource = match.sources[0];

  const formatTime = (ts?: number) => {
    if (!ts) return "";
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <button
      onClick={() => primarySource && onWatch(match)}
      disabled={!primarySource}
      className="group relative w-full text-left rounded-2xl overflow-hidden border border-white/[0.05] hover:border-red-500/20 transition-all duration-300 hover:shadow-[0_0_30px_rgba(244,63,94,0.08)] hover:-translate-y-1"
    >
      {/* Background */}
      <div className={`absolute inset-0 ${isLive ? "bg-gradient-to-br from-red-500/[0.08] via-[#0f1923] to-[#0f1923]" : "bg-[#0f1923]"}`} />

      {/* Live glow top border */}
      {isLive && (
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-red-500/60 to-transparent" />
      )}

      <div className="relative p-4">
        {/* Top row: Status + Source badges */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {isLive && <LivePulse />}
            <span className={`text-[10px] font-bold uppercase tracking-wider ${
              isLive ? "text-red-400" : isUpcoming ? "text-amber-400" : "text-zinc-500"
            }`}>
              {isLive ? "LIVE" : isUpcoming ? "UPCOMING" : "ENDED"}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {match.sources.slice(0, 4).map((s, i) => (
              <span key={i} className="text-[8px] font-bold px-1.5 py-0.5 rounded-md bg-white/[0.04] text-zinc-500 border border-white/[0.04]">
                {s.source === "watchfooty" ? "WF" : s.source.startsWith("streamed-") ? s.source.replace("streamed-", "").slice(0, 4).toUpperCase() : s.source === "dami-tv" ? "DAMI" : s.source === "cdnlivetv" ? "CDN" : s.source === "streamfree" ? "SF" : s.source === "cdnlivetv-channel" ? "TV" : s.source.slice(0, 3).toUpperCase()}
              </span>
            ))}
            {match.sources.length > 3 && (
              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-md bg-white/[0.04] text-zinc-600">
                +{match.sources.length - 3}
              </span>
            )}
          </div>
        </div>

        {/* Teams / Title */}
        {match.homeTeam && match.awayTeam ? (
          <div className="space-y-2.5">
            <div className="flex items-center gap-3">
              {match.homeLogo ? (
                <img src={match.homeLogo} alt="" className="w-8 h-8 object-contain rounded-lg bg-white/[0.03] p-0.5" />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-[10px] font-bold text-red-400">
                  {match.homeTeam.slice(0, 2).toUpperCase()}
                </div>
              )}
              <span className="text-sm font-semibold text-white truncate flex-1">{match.homeTeam}</span>
            </div>
            <div className="flex items-center gap-2 px-2">
              <div className="h-px flex-1 bg-white/[0.04]" />
              <span className="text-[9px] font-bold text-zinc-600 bg-white/[0.03] px-2 py-0.5 rounded">VS</span>
              <div className="h-px flex-1 bg-white/[0.04]" />
            </div>
            <div className="flex items-center gap-3">
              {match.awayLogo ? (
                <img src={match.awayLogo} alt="" className="w-8 h-8 object-contain rounded-lg bg-white/[0.03] p-0.5" />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-[10px] font-bold text-cyan-400">
                  {match.awayTeam.slice(0, 2).toUpperCase()}
                </div>
              )}
              <span className="text-sm font-semibold text-white truncate flex-1">{match.awayTeam}</span>
            </div>
          </div>
        ) : (
          <h3 className="text-sm font-semibold text-white truncate leading-snug min-h-[3rem] flex items-center">{match.title}</h3>
        )}

        {/* Bottom row: League + Viewers + Time */}
        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-white/[0.04]">
          <span className="text-[10px] text-zinc-500 font-medium truncate max-w-[60%]">{match.league || match.sport}</span>
          <div className="flex items-center gap-2">
            {match.viewers ? (
              <span className="flex items-center gap-1 text-[10px] text-zinc-500">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>
                {match.viewers > 1000 ? `${(match.viewers/1000).toFixed(1)}k` : match.viewers}
              </span>
            ) : null}
            {match.date ? (
              <span className="text-[10px] text-zinc-600">{formatTime(match.date)}</span>
            ) : null}
          </div>
        </div>

        {/* Hover overlay for live matches */}
        {isLive && primarySource && (
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
            <div className="flex items-center gap-2 bg-red-500/90 text-white px-5 py-2.5 rounded-full text-xs font-bold shadow-lg shadow-red-500/30">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3" /></svg>
              Watch Live
            </div>
          </div>
        )}
      </div>
    </button>
  );
}

// ─── TV Channel Card ───
function ChannelCard({ channel, onWatch }: { channel: LiveMatch; onWatch: (c: LiveMatch) => void }) {
  return (
    <button
      onClick={() => onWatch(channel)}
      className="group relative w-full text-left rounded-2xl overflow-hidden border border-white/[0.05] hover:border-cyan-500/20 transition-all duration-300 hover:shadow-[0_0_30px_rgba(0,168,225,0.08)] hover:-translate-y-1 bg-[#0f1923]"
    >
      {/* Channel logo/image */}
      <div className="relative h-20 flex items-center justify-center bg-gradient-to-b from-white/[0.03] to-transparent">
        {channel.channelImage ? (
          <img
            src={channel.channelImage}
            alt={channel.title}
            className="h-12 object-contain group-hover:scale-110 transition-transform duration-300"
          />
        ) : (
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500/10 to-purple-500/10 flex items-center justify-center text-lg font-bold text-cyan-400">
            {channel.title.slice(0, 2).toUpperCase()}
          </div>
        )}
        {/* Live badge */}
        <div className="absolute top-2 right-2 flex items-center gap-1 bg-red-500/90 backdrop-blur-sm px-2 py-0.5 rounded-md">
          <LivePulse size="sm" />
          <span className="text-[8px] font-bold text-white">LIVE</span>
        </div>
        {/* Country flag */}
        {channel.countryCode && (
          <div className="absolute top-2 left-2 text-[10px] opacity-60">
            {channel.countryCode === "us" ? "🇺🇸" : channel.countryCode === "uk" ? "🇬🇧" : channel.countryCode === "de" ? "🇩🇪" : channel.countryCode === "fr" ? "🇫🇷" : channel.countryCode === "es" ? "🇪🇸" : channel.countryCode === "in" ? "🇮🇳" : channel.countryCode === "it" ? "🇮🇹" : channel.countryCode === "br" ? "🇧🇷" : "🌍"}
          </div>
        )}
      </div>

      {/* Channel name */}
      <div className="p-3 pt-2">
        <h4 className="text-xs font-semibold text-white truncate">{channel.title}</h4>
        <p className="text-[10px] text-zinc-500 mt-0.5">TV Channel</p>
      </div>

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
        <div className="flex items-center gap-2 bg-cyan-500/90 text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg shadow-cyan-500/30">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3" /></svg>
          Watch
        </div>
      </div>
    </button>
  );
}

// ─── Main Live Page ───
export default function LivePage() {
  const navigate = useAppStore((s) => s.navigate);
  const [matches, setMatches] = useState<LiveMatch[]>([]);
  const [channels, setChannels] = useState<LiveMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [sportFilter, setSportFilter] = useState("all");
  const [channelFilter, setChannelFilter] = useState("all");
  const [sourceStats, setSourceStats] = useState<Record<string, number | string>>({});
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchData = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/live/matches");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      if (data.success) {
        setMatches(data.matches || []);
        setChannels(data.channels || []);
        setSourceStats(data.sources || {});
      }
      setLastRefresh(new Date());
      setError(null);
    } catch (e: any) {
      setError(e.message || "Failed to load");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleWatch = (item: LiveMatch) => {
    const primarySource = item.sources[0];
    if (!primarySource) return;
    navigate({
      page: "live-watch",
      matchId: item.id,
      source: primarySource.source,
      sourceId: primarySource.sourceId,
      title: item.title,
    });
  };

  // Filter logic
  const filteredMatches = matches.filter((m) => {
    const matchesSport = sportFilter === "all" ||
      m.category.toLowerCase().includes(sportFilter) ||
      m.sport.toLowerCase().includes(sportFilter);
    const matchesSearch = !searchQuery ||
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.homeTeam || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.awayTeam || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.league || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSport && matchesSearch;
  });

  const filteredChannels = channels.filter((c) => {
    const matchesCountry = channelFilter === "all" ||
      (channelFilter === "other" && !["us","uk","de","fr","es","it","in","br"].includes(c.countryCode || "")) ||
      c.countryCode === channelFilter;
    const matchesSearch = !searchQuery ||
      c.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCountry && matchesSearch;
  });

  // Group sports matches by status
  const liveMatches = filteredMatches.filter((m) => m.status === "live");
  const upcomingMatches = filteredMatches.filter((m) => m.status === "upcoming");
  const endedMatches = filteredMatches.filter((m) => m.status === "ended");

  const totalLive = liveMatches.length;
  const totalUpcoming = upcomingMatches.length;
  const totalAll = filteredMatches.length;
  const totalChannels = filteredChannels.length;

  return (
    <div className="fade-in space-y-6 pb-8">
      {/* ── Hero Section ── */}
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.05]">
        {/* Animated background */}
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/8 via-[#0b1116] to-cyan-500/5" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-red-500/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-cyan-500/5 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/3" />
        <div className="absolute top-1/2 left-1/2 w-[300px] h-[300px] bg-purple-500/3 rounded-full blur-[80px] -translate-x-1/2 -translate-y-1/2" />

        <div className="relative px-6 py-10 md:px-10 md:py-14">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
            <div className="space-y-5">
              {/* Logo + Title */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  {/* Main logo */}
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 via-red-600 to-rose-700 flex items-center justify-center shadow-2xl shadow-red-500/30">
                    <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="4" width="20" height="14" rx="2" ry="2" />
                      <path d="M8 10l4 3 4-3" />
                      <circle cx="17" cy="7" r="1.5" fill="currentColor" />
                    </svg>
                  </div>
                  {/* Pulse ring */}
                  <div className="absolute -inset-1.5 rounded-2xl border border-red-500/20 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
                      Luffy <span className="bg-gradient-to-r from-red-400 via-red-500 to-rose-500 bg-clip-text text-transparent">TV Live</span>
                    </h1>
                    <div className="flex items-center gap-1.5 bg-red-500/15 px-2.5 py-1 rounded-full border border-red-500/20">
                      <LivePulse size="md" />
                      <span className="text-[10px] font-bold text-red-400 uppercase">Live</span>
                    </div>
                  </div>
                  <p className="text-sm text-zinc-500 font-medium mt-1">
                    Sports, TV Channels & Entertainment — Watch free from anywhere
                  </p>
                </div>
              </div>

              {/* Stats row */}
              <div className="flex items-center gap-3 flex-wrap">
                {totalLive > 0 && (
                  <div className="flex items-center gap-2 bg-red-500/10 px-4 py-2 rounded-xl border border-red-500/15">
                    <LivePulse size="md" />
                    <span className="text-sm font-bold text-red-400">{totalLive} Live</span>
                  </div>
                )}
                {totalUpcoming > 0 && (
                  <div className="flex items-center gap-2 bg-amber-500/10 px-4 py-2 rounded-xl border border-amber-500/15">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span className="text-sm font-bold text-amber-400">{totalUpcoming} Upcoming</span>
                  </div>
                )}
                {totalChannels > 0 && (
                  <div className="flex items-center gap-2 bg-cyan-500/10 px-4 py-2 rounded-xl border border-cyan-500/15">
                    <svg className="w-4 h-4 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <rect x="2" y="4" width="20" height="14" rx="2" />
                      <path d="M8 10l4 3 4-3" />
                    </svg>
                    <span className="text-sm font-bold text-cyan-400">{totalChannels} Channels</span>
                  </div>
                )}
                <div className="flex items-center gap-2 bg-white/[0.03] px-4 py-2 rounded-xl border border-white/[0.05]">
                  <span className="text-sm font-bold text-zinc-400">{totalAll} Events</span>
                </div>
              </div>
            </div>

            {/* Right side controls */}
            <div className="flex flex-col gap-3 w-full lg:w-auto">
              {/* Search */}
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  placeholder="Search matches, channels..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full lg:w-[280px] h-10 pl-10 pr-4 bg-white/[0.06] border border-white/[0.08] rounded-xl text-sm text-white placeholder-zinc-500 outline-none focus:border-red-500/30 focus:bg-white/[0.08] transition-all"
                />
              </div>
              {/* Refresh */}
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchData}
                  disabled={refreshing}
                  className="flex items-center gap-2 px-4 py-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] rounded-xl text-xs text-zinc-400 hover:text-white transition-all disabled:opacity-50"
                >
                  <svg className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </button>
                <span className="text-[10px] text-zinc-600">
                  {lastRefresh.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              {/* Source health indicators */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {Object.entries(sourceStats).map(([key, count]) => (
                  <div key={key} className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/[0.04]">
                    <span className={`w-1.5 h-1.5 rounded-full ${count === "error" ? "bg-red-500" : typeof count === "number" && count > 0 ? "bg-emerald-400" : "bg-zinc-600"}`} />
                    <span className="text-[9px] font-medium text-zinc-500">
                      {key === "watchfooty" ? "WF" : key === "streamed" ? "STR" : key === "dami-tv" ? "DAMI" : key === "cdnlivetv" ? "CDN" : key === "streamfree" ? "SF" : key === "tv-channels" ? "TV" : key.slice(0, 4).toUpperCase()}
                    </span>
                    {typeof count === "number" && count > 0 && (
                      <span className="text-[9px] text-zinc-600">{count}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tab Navigation ── */}
      <div className="flex items-center gap-2">
        {[
          { id: "all" as TabType, label: "All", icon: "🌐" },
          { id: "sports" as TabType, label: "Live Sports", icon: "⚽" },
          { id: "channels" as TabType, label: "TV Channels", icon: "📺" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === tab.id
                ? "bg-red-500/15 text-red-300 border border-red-500/25 shadow-[0_0_15px_rgba(244,63,94,0.1)]"
                : "bg-white/[0.03] text-zinc-500 border border-white/[0.04] hover:text-zinc-300 hover:bg-white/[0.06]"
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
            {tab.id === "sports" && totalLive > 0 && (
              <span className="text-[10px] font-bold bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full">{totalLive}</span>
            )}
            {tab.id === "channels" && totalChannels > 0 && (
              <span className="text-[10px] font-bold bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded-full">{totalChannels}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Sport Category Filters (only for sports/all tabs) ── */}
      {(activeTab === "sports" || activeTab === "all") && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {SPORT_FILTERS.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSportFilter(cat.id)}
              className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                sportFilter === cat.id
                  ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/20 shadow-[0_0_12px_rgba(0,168,225,0.08)]"
                  : "bg-white/[0.03] text-zinc-500 border border-white/[0.04] hover:text-zinc-300 hover:bg-white/[0.06]"
              }`}
            >
              <span>{cat.icon}</span>
              {cat.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Channel Country Filters (only for channels tab) ── */}
      {activeTab === "channels" && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {CHANNEL_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setChannelFilter(cat.id)}
              className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                channelFilter === cat.id
                  ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/20"
                  : "bg-white/[0.03] text-zinc-500 border border-white/[0.04] hover:text-zinc-300 hover:bg-white/[0.06]"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Loading State ── */}
      {loading && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-44 rounded-2xl skeleton" />
            ))}
          </div>
        </div>
      )}

      {/* ── Error State ── */}
      {error && !loading && (
        <div className="text-center py-20 space-y-4">
          <div className="w-20 h-20 rounded-full bg-rose-500/10 flex items-center justify-center mx-auto">
            <svg className="w-10 h-10 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white">Failed to Load</h3>
          <p className="text-sm text-zinc-400 max-w-md mx-auto">{error}</p>
          <button onClick={fetchData} className="pill-btn pill-btn-primary text-xs py-2 px-6">Retry</button>
        </div>
      )}

      {/* ── No Results ── */}
      {!loading && !error && filteredMatches.length === 0 && filteredChannels.length === 0 && (
        <div className="text-center py-20 space-y-4">
          <div className="w-20 h-20 rounded-full bg-zinc-500/10 flex items-center justify-center mx-auto">
            <svg className="w-10 h-10 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white">No Events Found</h3>
          <p className="text-sm text-zinc-400">No live or upcoming events right now. Check back later!</p>
        </div>
      )}

      {/* ── Live Now Section ── */}
      {!loading && liveMatches.length > 0 && (activeTab === "sports" || activeTab === "all") && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <LivePulse size="lg" />
              <h2 className="text-xl font-bold text-white">Live Now</h2>
            </div>
            <div className="h-px flex-1 bg-gradient-to-r from-red-500/30 via-red-500/10 to-transparent" />
            <span className="text-[10px] font-bold text-red-400/60">{liveMatches.length} live</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {liveMatches.map((match) => (
              <MatchCard key={match.id} match={match} onWatch={handleWatch} />
            ))}
          </div>
        </div>
      )}

      {/* ── Upcoming Section ── */}
      {!loading && upcomingMatches.length > 0 && (activeTab === "sports" || activeTab === "all") && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Starting Soon
            </h2>
            <div className="h-px flex-1 bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent" />
            <span className="text-[10px] font-bold text-amber-400/60">{upcomingMatches.length} upcoming</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {upcomingMatches.slice(0, 12).map((match) => (
              <MatchCard key={match.id} match={match} onWatch={handleWatch} />
            ))}
          </div>
        </div>
      )}

      {/* ── TV Channels Section ── */}
      {!loading && filteredChannels.length > 0 && (activeTab === "channels" || activeTab === "all") && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <rect x="2" y="4" width="20" height="14" rx="2" />
                <path d="M8 10l4 3 4-3" />
              </svg>
              TV Channels
            </h2>
            <div className="h-px flex-1 bg-gradient-to-r from-cyan-500/20 via-cyan-500/10 to-transparent" />
            <span className="text-[10px] font-bold text-cyan-400/60">{filteredChannels.length} channels</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
            {filteredChannels.slice(0, activeTab === "channels" ? 200 : 32).map((channel) => (
              <ChannelCard key={channel.id} channel={channel} onWatch={handleWatch} />
            ))}
          </div>
          {activeTab === "all" && filteredChannels.length > 32 && (
            <div className="text-center">
              <button
                onClick={() => setActiveTab("channels")}
                className="pill-btn pill-btn-ghost text-xs"
              >
                View All {filteredChannels.length} Channels →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Ended Section (collapsed) ── */}
      {!loading && endedMatches.length > 0 && (activeTab === "sports" || activeTab === "all") && (
        <details className="group">
          <summary className="flex items-center gap-3 cursor-pointer py-2">
            <h2 className="text-sm font-bold text-zinc-500">Finished ({endedMatches.length})</h2>
            <div className="h-px flex-1 bg-gradient-to-r from-zinc-500/20 to-transparent" />
            <svg className="w-4 h-4 text-zinc-600 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M19 9l-7 7-7-7" />
            </svg>
          </summary>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mt-2 opacity-50">
            {endedMatches.slice(0, 8).map((match) => (
              <MatchCard key={match.id} match={match} onWatch={handleWatch} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
