"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAppStore } from "./store";

// ============================================================
// LIVE TV CHANNEL BROWSER — Daddylive Integration
// Search, Category Filters, Country Filters, Channel Grid
// ============================================================

interface TVChannel {
  id: string;
  name: string;
  category: string;
  country: { code: string; name: string; flag: string };
  embedUrl: string;
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

// Category icons and colors
const CATEGORY_META: Record<string, { icon: string; color: string }> = {
  Sports: { icon: "⚽", color: "#f97316" },
  News: { icon: "📰", color: "#3b82f6" },
  Entertainment: { icon: "🎬", color: "#a855f7" },
  Kids: { icon: "🧸", color: "#22c55e" },
  Music: { icon: "🎵", color: "#ec4899" },
  Documentary: { icon: "🔬", color: "#06b6d4" },
  Movies: { icon: "🎥", color: "#eab308" },
  General: { icon: "📺", color: "#6b7280" },
};

// Channel logo URLs — use first letter + gradient as fallback
function ChannelLogo({ name, category }: { name: string; category: string }) {
  const meta = CATEGORY_META[category] || CATEGORY_META.General;
  const letter = name.charAt(0).toUpperCase();

  return (
    <div
      className="w-full aspect-square rounded-xl flex items-center justify-center text-white font-black text-xl"
      style={{
        background: `linear-gradient(135deg, ${meta.color}40, ${meta.color}15)`,
        border: `1.5px solid ${meta.color}25`,
      }}
    >
      <span style={{ color: meta.color }}>{letter}</span>
    </div>
  );
}

export default function LiveTVPage() {
  const navigate = useAppStore(s => s.navigate);

  const [channels, setChannels] = useState<TVChannel[]>([]);
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [countries, setCountries] = useState<CountryInfo[]>([]);
  const [totalAll, setTotalAll] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedCountry, setSelectedCountry] = useState("all");

  // Fetch channels
  const fetchChannels = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      if (selectedCategory !== "all") params.set("category", selectedCategory);
      if (selectedCountry !== "all") params.set("country", selectedCountry);

      const res = await fetch(`/api/live-tv/channels?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load channels");
      const data = await res.json();

      setChannels(data.channels || []);
      setCategories(data.categories || []);
      setCountries(data.countries || []);
      setTotalAll(data.totalAll || 0);
    } catch (err: any) {
      setError(err.message || "Failed to load channels");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedCategory, selectedCountry]);

  useEffect(() => { fetchChannels(); }, [fetchChannels]);

  // Debounced search
  const [searchInput, setSearchInput] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Watch channel — navigate to live-tv-watch
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

  // Active category count
  const activeCategoryCount = useMemo(() => {
    if (selectedCategory === "all") return totalAll;
    const cat = categories.find(c => c.name === selectedCategory);
    return cat?.count || 0;
  }, [selectedCategory, categories, totalAll]);

  // Active country label
  const activeCountryLabel = useMemo(() => {
    if (selectedCountry === "all") return "";
    const country = countries.find(c => c.code === selectedCountry);
    return country ? `${country.flag} ${country.name} (${country.count})` : "";
  }, [selectedCountry, countries]);

  return (
    <div className="min-h-screen pb-8 -mx-4 lg:-mx-8">
      {/* Header */}
      <div className="px-4 lg:px-8 pt-4 pb-3">
        <h1
          className="text-2xl font-black text-white"
          style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
        >
          Live TV
        </h1>
        <p className="text-white/30 text-sm mt-1">
          {totalAll > 0 ? `${totalAll} channels available` : "Loading channels..."}
        </p>
      </div>

      {/* Search Bar */}
      <div className="px-4 lg:px-8 mb-4">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search channels..."
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-white/25 outline-none focus:border-[#7c6cf0]/40 focus:bg-white/[0.06] transition-all"
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
      <div className="px-4 lg:px-8 mb-3">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
              selectedCategory === "all"
                ? "bg-[#7c6cf0] text-white"
                : "bg-white/[0.04] text-white/45 hover:text-white/70 hover:bg-white/[0.06]"
            }`}
            style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
          >
            All ({totalAll})
          </button>
          {categories.map(cat => {
            const meta = CATEGORY_META[cat.name] || CATEGORY_META.General;
            const isActive = selectedCategory === cat.name;
            return (
              <button
                key={cat.name}
                onClick={() => setSelectedCategory(isActive ? "all" : cat.name)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                  isActive
                    ? "text-white"
                    : "bg-white/[0.04] text-white/45 hover:text-white/70 hover:bg-white/[0.06]"
                }`}
                style={{
                  ...(isActive ? {
                    background: `linear-gradient(135deg, ${meta.color}30, ${meta.color}15)`,
                    border: `1px solid ${meta.color}40`,
                  } : {}),
                  fontFamily: "var(--font-space-mono), 'Space Mono', monospace",
                }}
              >
                <span>{meta.icon}</span>
                {cat.name} ({cat.count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Country Filters */}
      <div className="px-4 lg:px-8 mb-4">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          <button
            onClick={() => setSelectedCountry("all")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
              selectedCountry === "all"
                ? "bg-[#7c6cf0] text-white"
                : "bg-white/[0.04] text-white/45 hover:text-white/70 hover:bg-white/[0.06]"
            }`}
            style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
          >
            🌍 All ({totalAll})
          </button>
          {countries.slice(0, 40).map(country => {
            const isActive = selectedCountry === country.code;
            return (
              <button
                key={country.code}
                onClick={() => setSelectedCountry(isActive ? "all" : country.code)}
                className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-white/[0.12] text-white border border-white/20"
                    : "bg-white/[0.04] text-white/45 hover:text-white/70 hover:bg-white/[0.06]"
                }`}
                style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
              >
                {country.flag} {country.name} ({country.count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Channel Count */}
      <div className="px-4 lg:px-8 mb-3 flex items-center justify-between">
        <p className="text-white/30 text-xs">
          {channels.length} channels available
          {activeCountryLabel && (
            <span className="text-white/50 ml-1">• {activeCountryLabel}</span>
          )}
        </p>
      </div>

      {/* Loading State */}
      {loading && channels.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-[#7c6cf0]/30 border-t-[#7c6cf0] animate-spin" />
          <p className="text-sm text-white/30">Loading channels...</p>
          <p className="text-[10px] text-white/15">Fetching from Daddylive</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
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

      {/* Channel Grid */}
      {!loading && !error && (
        <div className="px-4 lg:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {channels.map(channel => {
              const meta = CATEGORY_META[channel.category] || CATEGORY_META.General;
              return (
                <button
                  key={channel.id}
                  onClick={() => handleWatch(channel)}
                  className="group flex flex-col items-center gap-2 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.04] transition-all duration-200 hover:scale-[1.03] cursor-pointer"
                >
                  <ChannelLogo name={channel.name} category={channel.category} />

                  <div className="text-center w-full">
                    <p className="text-[11px] font-bold text-white/80 group-hover:text-white truncate w-full">
                      {channel.name}
                    </p>
                    <div className="flex items-center justify-center gap-1.5 mt-1">
                      <span
                        className="text-[8px] font-bold px-1.5 py-0.5 rounded"
                        style={{ background: `${meta.color}20`, color: meta.color }}
                      >
                        {channel.category}
                      </span>
                      <span className="text-[8px] text-white/20">
                        {channel.country.flag}
                      </span>
                    </div>
                    <div className="flex items-center justify-center gap-1 mt-1.5">
                      <span className="inline-flex items-center gap-0.5 text-[7px] font-bold text-red-400/80">
                        <span className="w-1 h-1 rounded-full bg-red-500 animate-pulse" />
                        LIVE
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {channels.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="text-5xl">🔍</div>
              <p className="text-sm text-white/40">No channels found</p>
              <p className="text-[10px] text-white/20">Try adjusting your filters</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
