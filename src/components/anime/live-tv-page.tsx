"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAppStore } from "./store";

// ============================================================
// LIVE TV CHANNEL BROWSER — Daddylive + DamiTV
// Compact card grid, source toggle, search, category filters
// ============================================================

interface TVChannel {
  id: string;
  name: string;
  category: string;
  sport?: string;
  country: { code: string; name: string; flag: string };
  embedUrl: string;
  source: "daddylive" | "damitv";
  poster?: string;
  isLive?: boolean;
  status?: string;
  league?: string;
  homeTeam?: string;
  awayTeam?: string;
}

interface CategoryInfo {
  name: string;
  count: number;
}

interface CountryInfo {
  code: string;
  name: string;
  flag: string;
  count: number;
}

type SourceFilter = "all" | "daddylive" | "damitv";

// Category colors (compact)
const CAT_COLORS: Record<string, string> = {
  Sports: "#f97316",
  News: "#3b82f6",
  Entertainment: "#a855f7",
  Kids: "#22c55e",
  Music: "#ec4899",
  Documentary: "#06b6d4",
  Movies: "#eab308",
  General: "#6b7280",
};

const CAT_ICONS: Record<string, string> = {
  Sports: "⚽",
  News: "📰",
  Entertainment: "🎬",
  Kids: "🧸",
  Music: "🎵",
  Documentary: "🔬",
  Movies: "🎥",
  General: "📺",
};

export default function LiveTVPage() {
  const navigate = useAppStore(s => s.navigate);

  const [channels, setChannels] = useState<TVChannel[]>([]);
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [countries, setCountries] = useState<CountryInfo[]>([]);
  const [totalAll, setTotalAll] = useState(0);
  const [daddyCount, setDaddyCount] = useState(0);
  const [damiCount, setDamiCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedCountry, setSelectedCountry] = useState("all");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Fetch channels
  const fetchChannels = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      if (selectedCategory !== "all") params.set("category", selectedCategory);
      if (selectedCountry !== "all") params.set("country", selectedCountry);
      if (sourceFilter !== "all") params.set("source", sourceFilter);

      const res = await fetch(`/api/live-tv/channels?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load channels");
      const data = await res.json();

      setChannels(data.channels || []);
      setCategories(data.categories || []);
      setCountries(data.countries || []);
      setTotalAll(data.totalAll || 0);
      setDaddyCount(data.daddyCount || 0);
      setDamiCount(data.damiCount || 0);
    } catch (err: any) {
      setError(err.message || "Failed to load channels");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedCategory, selectedCountry, sourceFilter]);

  useEffect(() => { fetchChannels(); }, [fetchChannels]);

  // Watch channel
  const handleWatch = (channel: TVChannel) => {
    navigate({
      page: "live-tv-watch",
      channelId: channel.id,
      channelName: channel.name,
      channelCategory: channel.category,
      channelCountryCode: channel.country.code,
      channelCountryName: channel.country.name,
      channelEmbedUrl: channel.embedUrl,
    } as any);
  };

  return (
    <div className="min-h-screen pb-8 -mx-4 lg:-mx-8">
      {/* Header + Source Toggle */}
      <div className="px-4 lg:px-8 pt-4 pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1
              className="text-2xl font-black text-white"
              style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
            >
              Live TV
            </h1>
            <p className="text-white/30 text-xs mt-0.5">
              {totalAll > 0 ? `${totalAll} channels` : "Loading..."}
            </p>
          </div>

          {/* SOURCE TOGGLE — Daddylive / DamiTV / All */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.06]">
            {([
              { id: "all" as SourceFilter, label: "All", count: totalAll },
              { id: "daddylive" as SourceFilter, label: "DaddyLive", count: daddyCount },
              { id: "damitv" as SourceFilter, label: "DamiTV", count: damiCount },
            ]).map(src => (
              <button
                key={src.id}
                onClick={() => setSourceFilter(src.id)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                  sourceFilter === src.id
                    ? src.id === "damitv"
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : src.id === "daddylive"
                      ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                      : "bg-[#7c6cf0]/20 text-[#7c6cf0] border border-[#7c6cf0]/30"
                    : "text-white/35 hover:text-white/60 hover:bg-white/[0.04]"
                }`}
                style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
              >
                {src.label}
                <span className="ml-1 text-[9px] opacity-60">({src.count})</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-4 lg:px-8 mb-3">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search channels, matches..."
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:border-[#7c6cf0]/40 focus:bg-white/[0.06] transition-all"
            style={{ fontFamily: "var(--font-inter), 'Inter', sans-serif" }}
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Category Filters — compact pills */}
      <div className="px-4 lg:px-8 mb-2">
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all ${
              selectedCategory === "all"
                ? "bg-[#7c6cf0] text-white"
                : "bg-white/[0.03] text-white/40 hover:text-white/60 hover:bg-white/[0.06]"
            }`}
            style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
          >
            All ({totalAll})
          </button>
          {categories.map(cat => {
            const color = CAT_COLORS[cat.name] || CAT_COLORS.General;
            const icon = CAT_ICONS[cat.name] || "📺";
            const isActive = selectedCategory === cat.name;
            return (
              <button
                key={cat.name}
                onClick={() => setSelectedCategory(isActive ? "all" : cat.name)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all ${
                  isActive
                    ? "text-white"
                    : "bg-white/[0.03] text-white/40 hover:text-white/60 hover:bg-white/[0.06]"
                }`}
                style={{
                  ...(isActive ? {
                    background: `linear-gradient(135deg, ${color}25, ${color}10)`,
                    border: `1px solid ${color}35`,
                  } : {}),
                  fontFamily: "var(--font-space-mono), 'Space Mono', monospace",
                }}
              >
                <span className="text-xs">{icon}</span>
                {cat.name} ({cat.count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Country Filters — compact row */}
      <div className="px-4 lg:px-8 mb-4">
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
          <button
            onClick={() => setSelectedCountry("all")}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all ${
              selectedCountry === "all"
                ? "bg-[#7c6cf0] text-white"
                : "bg-white/[0.03] text-white/40 hover:text-white/60 hover:bg-white/[0.06]"
            }`}
            style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
          >
            🌍 All
          </button>
          {countries.slice(0, 30).map(country => {
            const isActive = selectedCountry === country.code;
            return (
              <button
                key={country.code}
                onClick={() => setSelectedCountry(isActive ? "all" : country.code)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-white/[0.10] text-white border border-white/15"
                    : "bg-white/[0.03] text-white/40 hover:text-white/60 hover:bg-white/[0.06]"
                }`}
                style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
              >
                {country.flag} {country.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Channel count */}
      <div className="px-4 lg:px-8 mb-2">
        <p className="text-white/20 text-[10px] font-bold" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>
          {channels.length} channels
          {sourceFilter !== "all" && (
            <span className="ml-1">• {sourceFilter === "damitv" ? "DamiTV" : "DaddyLive"} only</span>
          )}
        </p>
      </div>

      {/* Loading State */}
      {loading && channels.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-[#7c6cf0]/30 border-t-[#7c6cf0] animate-spin" />
          <p className="text-xs text-white/30">Loading channels...</p>
          <p className="text-[9px] text-white/15">
            {sourceFilter === "damitv" ? "Fetching from DamiTV" : sourceFilter === "daddylive" ? "Fetching from DaddyLive" : "Fetching from all sources"}
          </p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="text-4xl">📺</div>
          <p className="text-xs text-white/40">{error}</p>
          <button
            onClick={fetchChannels}
            className="px-3 py-1.5 rounded-lg bg-white/[0.06] text-white/50 text-[10px] font-bold hover:bg-white/[0.08]"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── COMPACT CHANNEL LIST ── */}
      {!loading && !error && (
        <div className="px-4 lg:px-8">
          {/* Grid for larger screens, list-like on mobile */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-1.5">
            {channels.map(channel => {
              const color = CAT_COLORS[channel.category] || CAT_COLORS.General;
              const isDami = channel.source === "damitv";
              const isLive = channel.isLive;

              return (
                <button
                  key={channel.id}
                  onClick={() => handleWatch(channel)}
                  className="group flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.05] hover:border-white/[0.12] hover:bg-white/[0.04] transition-all duration-150 cursor-pointer text-left"
                >
                  {/* Left: letter avatar */}
                  <div
                    className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black"
                    style={{
                      background: `linear-gradient(135deg, ${color}30, ${color}12)`,
                      border: `1px solid ${color}20`,
                      color,
                    }}
                  >
                    {channel.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Middle: name + meta */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-white/80 group-hover:text-white truncate">
                      {channel.name}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {/* Source badge */}
                      <span
                        className="text-[7px] font-black px-1 py-0.5 rounded"
                        style={{
                          background: isDami ? "#22c55e15" : "#3b82f615",
                          color: isDami ? "#22c55e" : "#3b82f6",
                        }}
                      >
                        {isDami ? "DAMI" : "DADDY"}
                      </span>
                      {/* Category */}
                      <span className="text-[7px] font-bold text-white/20">{channel.category}</span>
                      {/* Live dot */}
                      {isLive && (
                        <span className="inline-flex items-center gap-0.5">
                          <span className="w-1 h-1 rounded-full bg-red-500 animate-pulse" />
                          <span className="text-[7px] font-bold text-red-400">LIVE</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: play icon */}
                  <svg className="w-3.5 h-3.5 text-white/15 group-hover:text-white/40 transition-colors flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                </button>
              );
            })}
          </div>

          {channels.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="text-4xl">🔍</div>
              <p className="text-xs text-white/40">No channels found</p>
              <p className="text-[9px] text-white/20">Try adjusting your filters</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
