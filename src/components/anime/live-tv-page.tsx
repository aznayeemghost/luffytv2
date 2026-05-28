"use client";

import { useState, useEffect, useCallback } from "react";
import { useAppStore } from "./store";

// ============================================================
// LIVE TV CHANNEL BROWSER — DamiTV + StreamFree
// Big card grid with channel logos, source toggle, search, filters
// DamiTV: dami-tv.pro/channels.json + iframeUrl embed (sandbox iframe)
// StreamFree: streamfree.app/streams + embed player
// ============================================================

interface TVChannel {
  id: string;
  name: string;
  category: string;
  sport?: string;
  country: { code: string; name: string; flag: string };
  embedUrl: string;
  source: "damitv" | "streamfree";
  poster?: string;
  logoUrl?: string;
  isLive?: boolean;
  isAlwaysLive?: boolean;
  status?: string;
  league?: string;
  homeTeam?: string;
  awayTeam?: string;
  homeBadge?: string;
  awayBadge?: string;
  streamKey?: string;
  streamCategory?: string;
  viewers?: number;
  damitvId?: string;
  damitvCdnUrl?: string;
  damitvName?: string;
  damitvResolveIdx?: number;
  damitvEmbedUrl?: string;
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

type SourceFilter = "all" | "damitv" | "streamfree";

// Category colors
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

// Source colors and labels
const SOURCE_CONFIG: Record<string, { color: string; label: string; shortLabel: string }> = {
  damitv: { color: "#f97316", label: "DamiTV", shortLabel: "DAMI" },
  streamfree: { color: "#a855f7", label: "StreamFree", shortLabel: "SF" },
};

export default function LiveTVPage() {
  const navigate = useAppStore(s => s.navigate);

  const [channels, setChannels] = useState<TVChannel[]>([]);
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [countries, setCountries] = useState<CountryInfo[]>([]);
  const [totalAll, setTotalAll] = useState(0);
  const [damitvCount, setDamitvCount] = useState(0);
  const [sfCount, setSfCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
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
      if (sourceFilter !== "all") params.set("source", sourceFilter);

      // Frontend timeout (30s) to prevent infinite loading
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const res = await fetch(`/api/live-tv/channels?${params.toString()}`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error("Failed to load channels");
      const data = await res.json();

      setChannels(data.channels || []);
      setCategories(data.categories || []);
      setCountries(data.countries || []);
      setTotalAll(data.totalAll || 0);
      setDamitvCount(data.damitvCount || 0);
      setSfCount(data.sfCount || 0);
    } catch (err: any) {
      setError(err.message || "Failed to load channels");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedCategory, sourceFilter]);

  useEffect(() => { fetchChannels(); }, [fetchChannels]);

  // Watch channel
  const handleWatch = (channel: TVChannel) => {
    navigate({
      page: "live-tv-watch",
      channelId: channel.id,
      channelName: channel.name,
      channelCategory: channel.category,
      channelStreamCategory: channel.streamCategory || "", // Actual SF embed category (cricket, racing, tennis) — NOT display category
      channelCountryCode: channel.country.code,
      channelCountryName: channel.country.name,
      channelEmbedUrl: channel.embedUrl,
      channelDamitvDefaultUrl: (channel as any).damitvDefaultUrl || "",
      channelViewers: channel.viewers || 0,
      channelLogoUrl: channel.logoUrl || "",
      channelDamitvResolveIdx: (channel as any).damitvResolveIdx,
      channelDamitvEmbedUrl: (channel as any).damitvEmbedUrl || "",
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
              {totalAll > 0 ? `${totalAll} channels available` : "Loading..."}
            </p>
          </div>

          {/* SOURCE TOGGLE — 3 options: All, DamiTV, StreamFree */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.06]">
            {([
              { id: "all" as SourceFilter, label: "All", count: totalAll, color: "#7c6cf0" },
              { id: "damitv" as SourceFilter, label: "DamiTV", count: damitvCount, color: "#f97316" },
              { id: "streamfree" as SourceFilter, label: "StreamFree", count: sfCount, color: "#a855f7" },
            ]).map(src => (
              <button
                key={src.id}
                onClick={() => setSourceFilter(src.id)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                  sourceFilter === src.id
                    ? "text-white"
                    : "text-white/35 hover:text-white/60 hover:bg-white/[0.04]"
                }`}
                style={{
                  ...(sourceFilter === src.id ? {
                    background: `linear-gradient(135deg, ${src.color}25, ${src.color}10)`,
                    border: `1px solid ${src.color}40`,
                  } : {}),
                  fontFamily: "var(--font-space-mono), 'Space Mono', monospace",
                }}
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
            placeholder="Search channels, matches, teams..."
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

      {/* Category Filters */}
      <div className="px-4 lg:px-8 mb-2">
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all ${
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
            const isActive = selectedCategory === cat.name;
            return (
              <button
                key={cat.name}
                onClick={() => setSelectedCategory(isActive ? "all" : cat.name)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all ${
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
                {cat.name} ({cat.count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Channel count */}
      <div className="px-4 lg:px-8 mb-3">
        <p className="text-white/20 text-[10px] font-bold" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>
          Showing {channels.length} channels
          {sourceFilter !== "all" && (
            <span className="ml-1">from {SOURCE_CONFIG[sourceFilter]?.label || sourceFilter}</span>
          )}
        </p>
      </div>

      {/* Loading State */}
      {loading && channels.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-12 h-12 rounded-full border-2 border-[#7c6cf0]/30 border-t-[#7c6cf0] animate-spin" />
          <p className="text-sm text-white/30">Loading channels...</p>
          <p className="text-[10px] text-white/15">
            {sourceFilter === "damitv" ? "Fetching from DamiTV" :
             sourceFilter === "streamfree" ? "Fetching from StreamFree" :
             "Fetching from all sources"}
          </p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="text-5xl">📺</div>
          <p className="text-sm text-white/40">{error}</p>
          <button
            onClick={fetchChannels}
            className="px-4 py-2 rounded-lg bg-white/[0.06] text-white/50 text-[11px] font-bold hover:bg-white/[0.08]"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── CHANNEL CARDS ── */}
      {!loading && !error && (
        <div className="px-4 lg:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {channels.map(channel => {
              const color = CAT_COLORS[channel.category] || CAT_COLORS.General;
              const srcConfig = SOURCE_CONFIG[channel.source];
              const isLive = channel.isLive;
              const hasTeams = channel.homeTeam && channel.awayTeam;
              const hasBadges = channel.homeBadge || channel.awayBadge;
              // Use API-provided logo_url first, then fall back to badges
              const hasLogo = channel.logoUrl;

              return (
                <button
                  key={channel.id}
                  onClick={() => handleWatch(channel)}
                  className="group relative flex flex-col rounded-xl overflow-hidden transition-all duration-200 hover:scale-[1.02] hover:shadow-xl cursor-pointer border border-white/[0.06] hover:border-white/[0.15] text-left"
                  style={{
                    background: `linear-gradient(145deg, ${color}15, ${color}06, #0d0d12)`,
                  }}
                >
                  {/* Top section — poster / team badges / logo area */}
                  <div className="relative h-[110px] sm:h-[120px] flex items-center justify-center overflow-hidden">
                    {/* Background image */}
                    {channel.poster && (
                      <img
                        src={channel.poster}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover opacity-30"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                    {/* Live badge top-left */}
                    <div className="absolute top-2 left-2 z-10">
                      {isLive ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-600 text-white text-[8px] font-black uppercase tracking-wider shadow-lg">
                          <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
                          LIVE
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-black/60 text-white/50 text-[8px] font-bold">
                          {channel.status === "upcoming" ? "UPCOMING" : "OFFLINE"}
                        </span>
                      )}
                    </div>

                    {/* Source badge top-right */}
                    <div className="absolute top-2 right-2 z-10">
                      <span
                        className="text-[7px] font-black px-1.5 py-0.5 rounded"
                        style={{
                          background: `${srcConfig.color}20`,
                          color: srcConfig.color,
                        }}
                      >
                        {srcConfig.shortLabel}
                      </span>
                    </div>

                    {/* Center — Channel logo (from API logo_url), Team badges, or letter avatar */}
                    {hasLogo ? (
                      /* Channel logo from API — this is the PRIMARY logo source */
                      <div className="relative z-10 flex items-center justify-center">
                        <img
                          src={channel.logoUrl}
                          alt={channel.name}
                          className="w-14 h-14 sm:w-16 sm:h-16 object-contain drop-shadow-lg"
                          onError={(e) => {
                            // On error, hide and show letter fallback
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      </div>
                    ) : hasBadges ? (
                      <div className="relative z-10 flex items-center gap-3">
                        {channel.homeBadge && (
                          <img
                            src={channel.homeBadge}
                            alt={channel.homeTeam || ""}
                            className="w-10 h-10 sm:w-12 sm:h-12 object-contain drop-shadow-lg"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                          />
                        )}
                        <span className="text-[10px] text-white/30 font-bold">VS</span>
                        {channel.awayBadge && (
                          <img
                            src={channel.awayBadge}
                            alt={channel.awayTeam || ""}
                            className="w-10 h-10 sm:w-12 sm:h-12 object-contain drop-shadow-lg"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                          />
                        )}
                      </div>
                    ) : hasTeams ? (
                      <div className="relative z-10 flex flex-col items-center gap-0.5 text-center px-2">
                        <span className="text-[10px] font-bold text-white/70 truncate max-w-full">{channel.homeTeam}</span>
                        <span className="text-[9px] text-white/30 font-bold">VS</span>
                        <span className="text-[10px] font-bold text-white/70 truncate max-w-full">{channel.awayTeam}</span>
                      </div>
                    ) : (
                      /* Letter avatar for channels without logos */
                      <div
                        className="relative z-10 w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center text-xl sm:text-2xl font-black"
                        style={{
                          background: `linear-gradient(135deg, ${color}30, ${color}12)`,
                          border: `1px solid ${color}25`,
                          color,
                        }}
                      >
                        {channel.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Bottom section — name + meta */}
                  <div className="p-2.5 pt-1.5">
                    <p className="text-[11px] font-bold text-white/85 group-hover:text-white truncate leading-tight">
                      {channel.name}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      {channel.league && (
                        <span className="text-[8px] text-white/25 font-medium truncate max-w-[80%]">{channel.league}</span>
                      )}
                      {channel.sport && !channel.league && (
                        <span className="text-[8px] text-white/20 font-medium">{channel.sport}</span>
                      )}
                      {channel.viewers !== undefined && channel.viewers > 0 && (
                        <span className="text-[7px] text-white/15 font-bold ml-auto flex-shrink-0">
                          {channel.viewers} watching
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {channels.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="text-5xl">🔍</div>
              <p className="text-sm text-white/40">No channels found</p>
              <p className="text-[10px] text-white/20">Try adjusting your filters or source</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
