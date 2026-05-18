"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAppStore, type TMDBContentItem, type AnimeItem } from "./store";
import AnimeCard from "./anime-card";
import type { MiruroAnimeResult } from "@/lib/miruro-api";
import type { MegaPlayAnimeItem } from "@/lib/megaplay-api";

interface SearchPageProps {
  initialQuery?: string;
}

export default function SearchPage({ initialQuery }: SearchPageProps) {
  const navigate = useAppStore(s => s.navigate);
  const [query, setQuery] = useState(initialQuery || "");
  const [activeTab, setActiveTab] = useState<"all" | "anime" | "movies" | "tv">("all");
  const [animeResults, setAnimeResults] = useState<AnimeItem[]>([]);
  const [miruroResults, setMiruroResults] = useState<MiruroAnimeResult[]>([]);
  const [tmdbResults, setTmdbResults] = useState<TMDBContentItem[]>([]);
  const [megaplayResults, setMegaplayResults] = useState<MegaPlayAnimeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // Autocomplete state
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionIdx, setSuggestionIdx] = useState(-1);
  const suggestTimerRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced autocomplete
  useEffect(() => {
    if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current);
    if (!query.trim() || query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    suggestTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/megaplay/suggest?q=${encodeURIComponent(query.trim())}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.results)) {
            setSuggestions(data.results.slice(0, 8));
            setShowSuggestions(true);
            setSuggestionIdx(-1);
          }
        }
      } catch { /* ignore */ }
    }, 300);
    return () => { if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current); };
  }, [query]);

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  const performSearch = async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setSearched(true);
    setShowSuggestions(false);

    const promises: Promise<void>[] = [];

    // Search anime via existing endpoint
    if (activeTab === "all" || activeTab === "anime") {
      promises.push(
        fetch(`/api/anime/search?q=${encodeURIComponent(q)}&page=1`)
          .then(r => r.ok ? r.json() : null)
          .then(data => {
            if (data) {
              setAnimeResults(data.results || []);
              setMiruroResults(data.miruroResults || []);
            }
          })
          .catch(() => {})
      );

      // Also search MegaPlay
      promises.push(
        fetch(`/api/megaplay/search?q=${encodeURIComponent(q)}&page=1`)
          .then(r => r.ok ? r.json() : null)
          .then(data => {
            if (data?.success && data.results?.media) {
              setMegaplayResults(data.results.media);
            }
          })
          .catch(() => {})
      );
    }

    // Search TMDB
    if (activeTab === "all" || activeTab === "movies" || activeTab === "tv") {
      const searchType = activeTab === "movies" ? "movie" : activeTab === "tv" ? "tv" : "multi";
      promises.push(
        fetch(`/api/tmdb/search?q=${encodeURIComponent(q)}&type=${searchType}`)
          .then(r => r.ok ? r.json() : null)
          .then(data => {
            if (data?.results) setTmdbResults(data.results);
          })
          .catch(() => {})
      );
    }

    await Promise.all(promises);
    setLoading(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      performSearch(query);
    }
  };

  const handleSuggestionSelect = (suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    performSearch(suggestion);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSuggestionIdx(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSuggestionIdx(i => Math.max(i - 1, -1));
    } else if (e.key === "Enter" && suggestionIdx >= 0) {
      e.preventDefault();
      handleSuggestionSelect(suggestions[suggestionIdx]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    if (query.trim()) {
      setAnimeResults([]);
      setMiruroResults([]);
      setTmdbResults([]);
      setMegaplayResults([]);
      performSearch(query);
    }
  };

  // Deduplicate MegaPlay results with Miruro results (by AniList ID)
  const seenIds = new Set(miruroResults.map(r => r.id));
  const uniqueMegaplayResults = megaplayResults.filter(r => !seenIds.has(r.id));

  const totalResults = miruroResults.length + animeResults.length + tmdbResults.length + uniqueMegaplayResults.length;

  return (
    <div className="space-y-6 fade-in">
      {/* Search Input */}
      <div className="max-w-2xl mx-auto">
        <form onSubmit={handleSearch} className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
          </svg>
          <input
            ref={inputRef}
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
            placeholder="Search anime, movies, TV shows..."
            className="w-full pl-10 pr-4 py-3 bg-[#0a0a0a] border border-white/[0.06] rounded-xl text-sm text-white placeholder-zinc-500 outline-none focus:border-purple-500/30 focus:shadow-[0_0_20px_rgba(139,92,246,0.1)] transition-all"
          />

          {/* Autocomplete dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-[#0a0a0a] rounded-xl border border-white/[0.08] shadow-2xl shadow-black/60 z-50 overflow-hidden">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggestionSelect(s)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-all ${
                    i === suggestionIdx ? "bg-purple-500/10 text-purple-300" : "text-zinc-300 hover:bg-white/[0.04]"
                  }`}
                >
                  <svg className="w-4 h-4 text-zinc-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                  </svg>
                  <span className="truncate">{s}</span>
                </button>
              ))}
            </div>
          )}
        </form>

        {/* Search Type Tabs */}
        <div className="flex items-center gap-2 mt-3">
          {(["all", "anime", "movies", "tv"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-all ${
                activeTab === tab
                  ? "bg-purple-500 text-white shadow-lg shadow-purple-500/25"
                  : "bg-white/[0.04] text-zinc-400 hover:text-white hover:bg-white/[0.08] border border-white/[0.06]"
              }`}
            >
              {tab === "all" ? "All" : tab === "anime" ? "Anime" : tab === "movies" ? "Movies" : "TV Shows"}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3">
          {Array.from({ length: 14 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] skeleton rounded-xl" />
          ))}
        </div>
      ) : totalResults > 0 ? (
        <div className="space-y-6">
          <p className="text-xs text-zinc-500">{totalResults} results found</p>

          {/* TMDB Results */}
          {tmdbResults.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-zinc-300">
                {activeTab === "movies" ? "Movies" : activeTab === "tv" ? "TV Shows" : "Movies & TV Shows"}
              </h3>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3">
                {tmdbResults.map((item, i) => (
                  <AnimeCard key={`tmdb-${item.id}`} tmdbItem={item} index={i} />
                ))}
              </div>
            </div>
          )}

          {/* Anime Results (Miruro) */}
          {(miruroResults.length > 0 || animeResults.length > 0) && (activeTab === "all" || activeTab === "anime") && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-zinc-300">Anime</h3>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3">
                {miruroResults.map((item, i) => (
                  <AnimeCard key={`miruro-${item.id}`} anime={item} index={i} />
                ))}
                {animeResults.map((item, i) => (
                  <AnimeCard key={`allanime-${item._id}`} anime={item} index={miruroResults.length + i} />
                ))}
              </div>
            </div>
          )}

          {/* MegaPlay Anime Results */}
          {uniqueMegaplayResults.length > 0 && (activeTab === "all" || activeTab === "anime") && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-zinc-300">More Anime Results</h3>
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/20">MegaPlay</span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3">
                {uniqueMegaplayResults.map((item, i) => (
                  <AnimeCard key={`mp-${item.id}`} anime={item as any} index={i} />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : query && searched ? (
        <div className="text-center py-20 rounded-2xl bg-[#0a0a0a] border border-white/[0.04] p-8">
          <p className="text-zinc-400 text-sm">No results found for &quot;{query}&quot;</p>
          <p className="text-zinc-600 text-xs mt-2">Try a different search term</p>
        </div>
      ) : (
        <div className="text-center py-20">
          <div className="bg-[#0a0a0a] rounded-2xl px-8 py-6 inline-block border border-white/[0.04]">
            <p className="text-zinc-500 text-sm">Type to search for anime, movies, and TV shows</p>
          </div>
        </div>
      )}
    </div>
  );
}
