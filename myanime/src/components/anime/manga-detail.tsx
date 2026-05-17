"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "./store";

interface MangaChapter {
  id: string;
  title: string;
  number: number;
  date?: string;
  scanGroup?: string;
}

interface MangaDetailData {
  id: string;
  title: string;
  englishTitle?: string;
  altTitles?: string[];
  poster?: string;
  banner?: string;
  description?: string;
  type?: string;
  status?: string;
  year?: number;
  authors?: string[];
  artists?: string[];
  genres?: string[];
  isAdult?: boolean;
  anilistId?: number;
  malId?: number;
  totalChapters?: number;
  rating?: number;
  views?: number;
  chapters?: MangaChapter[];
}

interface MangaDetailProps {
  mangaId: string;
}

export default function MangaDetailPage({ mangaId }: MangaDetailProps) {
  const navigate = useAppStore(s => s.navigate);
  const [manga, setManga] = useState<MangaDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [chapterSearch, setChapterSearch] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/manga/detail?id=${encodeURIComponent(mangaId)}`);
        if (res.ok) {
          const data = await res.json();
          setManga(data);
        }
      } catch { /* ignore */ }
      setLoading(false);
    }
    load();
  }, [mangaId]);

  if (loading) {
    return (
      <div className="space-y-6 fade-in">
        <div className="min-h-[50vh] skeleton rounded-2xl" />
        <div className="flex gap-6">
          <div className="w-[180px] aspect-[2/3] skeleton shrink-0" />
          <div className="flex-1 space-y-3">
            <div className="h-8 w-3/4 skeleton" />
            <div className="h-4 w-1/2 skeleton" />
            <div className="h-20 skeleton" />
          </div>
        </div>
      </div>
    );
  }

  if (!manga) {
    return (
      <div className="text-center py-20 fade-in">
        <p className="text-zinc-400">Manga not found</p>
        <button onClick={() => navigate({ page: "manga" })} className="mt-4 pill-btn pill-btn-ghost">Back to Manga</button>
      </div>
    );
  }

  const displayTitle = manga.englishTitle || manga.title;
  const image = manga.poster || "";
  const bannerImg = manga.banner || image;

  const filteredChapters = (manga.chapters || [])
    .filter(ch => {
      if (!chapterSearch) return true;
      const q = chapterSearch.toLowerCase();
      return ch.title.toLowerCase().includes(q) || String(ch.number).includes(q);
    })
    .sort((a, b) => sortOrder === "asc" ? a.number - b.number : b.number - a.number);

  return (
    <div className="fade-in">
      {/* Hero Section */}
      {bannerImg && (
        <div className="relative min-h-[50vh] -mt-[75px] overflow-hidden">
          <img src={bannerImg} alt="" className="absolute inset-0 w-full h-full object-cover ken-burns" key={`banner-${mangaId}`} />
          <div className="absolute inset-0 bg-gradient-to-l from-transparent via-[#0b1116]/50 to-[#0b1116]/95" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b1116] via-[#0b1116]/40 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-12">
            <div className="max-w-[1400px] mx-auto flex flex-col lg:flex-row items-end gap-8">
              <div className="flex-1 space-y-4">
                <div className="stagger-reveal stagger-1 flex items-center gap-2 flex-wrap">
                  <span className="badge-anime text-[10px] font-bold">MANGA</span>
                  {manga.status && <span className="badge-airing text-[10px] font-bold">{manga.status}</span>}
                  {manga.year && <span className="badge-type text-[10px] font-bold">{manga.year}</span>}
                </div>
                <h1 className="stagger-reveal stagger-2 text-3xl sm:text-4xl lg:text-5xl font-bold text-white line-clamp-2">{displayTitle}</h1>
                {manga.altTitles && manga.altTitles.length > 0 && (
                  <p className="stagger-reveal stagger-3 text-sm text-zinc-400 line-clamp-1">{manga.altTitles[0]}</p>
                )}
                {manga.genres && manga.genres.length > 0 && (
                  <div className="stagger-reveal stagger-3 flex flex-wrap gap-2">
                    {manga.genres.slice(0, 6).map(g => (
                      <span key={g} className="px-3 py-1 text-xs font-medium bg-emerald-500/10 text-emerald-300 rounded-full border border-emerald-500/20">{g}</span>
                    ))}
                  </div>
                )}
                {manga.description && (
                  <p className="stagger-reveal stagger-4 text-sm text-zinc-400 line-clamp-3 max-w-lg leading-relaxed">{manga.description.replace(/<[^>]*>/g, "")}</p>
                )}
                <div className="stagger-reveal stagger-5 flex items-center gap-3 pt-2">
                  {filteredChapters.length > 0 && (
                    <button
                      onClick={() => navigate({ page: "manga-read", id: mangaId, chapterId: filteredChapters[0].id })}
                      className="pill-btn pill-btn-primary"
                      style={{ background: "#10b981", boxShadow: "0 4px 15px rgba(16, 185, 129, 0.3)" }}
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
                      </svg>
                      Read Ch.{filteredChapters[0].number}
                    </button>
                  )}
                </div>
              </div>
              {image && (
                <div className="stagger-reveal stagger-4 hidden lg:block shrink-0">
                  <img src={image} alt={displayTitle} className="w-[200px] rounded-xl poster-3d" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Info without banner */}
      {!bannerImg && image && (
        <div className="flex flex-col sm:flex-row gap-6 mt-4">
          <div className="shrink-0 w-[180px] mx-auto sm:mx-0">
            <img src={image} alt={displayTitle} className="w-full rounded-xl shadow-2xl shadow-black/50" />
          </div>
          <div className="flex-1 space-y-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-white">{displayTitle}</h1>
            {manga.description && <p className="text-sm text-zinc-400 leading-relaxed line-clamp-5">{manga.description.replace(/<[^>]*>/g, "")}</p>}
          </div>
        </div>
      )}

      {/* Metadata Grid */}
      <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
        {manga.authors && manga.authors.length > 0 && (
          <div className="bg-[#151f2e] rounded-xl p-4 border border-white/[0.04]">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Author</p>
            <p className="text-sm text-white font-medium">{manga.authors.join(", ")}</p>
          </div>
        )}
        {manga.artists && manga.artists.length > 0 && (
          <div className="bg-[#151f2e] rounded-xl p-4 border border-white/[0.04]">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Artist</p>
            <p className="text-sm text-white font-medium">{manga.artists.join(", ")}</p>
          </div>
        )}
        {manga.status && (
          <div className="bg-[#151f2e] rounded-xl p-4 border border-white/[0.04]">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Status</p>
            <p className="text-sm text-white font-medium">{manga.status}</p>
          </div>
        )}
        {manga.totalChapters != null && (
          <div className="bg-[#151f2e] rounded-xl p-4 border border-white/[0.04]">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Chapters</p>
            <p className="text-sm text-white font-medium">{manga.totalChapters || manga.chapters?.length || "Unknown"}</p>
          </div>
        )}
        {manga.rating != null && (
          <div className="bg-[#151f2e] rounded-xl p-4 border border-white/[0.04]">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Rating</p>
            <p className="text-sm text-emerald-400 font-bold">{manga.rating}/10</p>
          </div>
        )}
        {manga.views != null && (
          <div className="bg-[#151f2e] rounded-xl p-4 border border-white/[0.04]">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Views</p>
            <p className="text-sm text-white font-medium">{manga.views.toLocaleString()}</p>
          </div>
        )}
      </div>

      {/* Chapters List */}
      <div className="mt-8 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="section-header flex items-center gap-2">
            <h3 className="text-sm font-bold text-white">CHAPTERS</h3>
            <span className="text-[10px] text-zinc-500">({filteredChapters.length})</span>
          </div>
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search chapters..."
                value={chapterSearch}
                onChange={e => setChapterSearch(e.target.value)}
                className="h-8 pl-8 pr-3 bg-[#1a2530] border border-white/[0.06] rounded-lg text-xs text-white placeholder-zinc-500 outline-none focus:border-emerald-500/30 w-[160px] transition-colors"
              />
            </div>
            {/* Sort toggle */}
            <button
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium bg-[#1a2530] border border-white/[0.06] rounded-lg text-zinc-400 hover:text-white transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d={sortOrder === "asc" ? "M3 4h13M3 8h9M3 12h5" : "M3 4h5M3 8h9M3 12h13"} />
                <path d="M17 9l4 4-4 4" />
              </svg>
              {sortOrder === "asc" ? "Oldest" : "Newest"}
            </button>
          </div>
        </div>

        {filteredChapters.length > 0 ? (
          <div className="max-h-[600px] overflow-y-auto bg-[#131c26] rounded-xl border border-white/[0.04]">
            {filteredChapters.map(ch => (
              <button
                key={ch.id}
                onClick={() => navigate({ page: "manga-read", id: mangaId, chapterId: ch.id })}
                className="w-full flex items-center gap-3 p-3 text-left transition-all hover:bg-white/[0.02] border-b border-white/[0.03] last:border-0"
              >
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-emerald-400">{ch.number}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-300 line-clamp-1">{ch.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {ch.scanGroup && <span className="text-[9px] text-zinc-500">{ch.scanGroup}</span>}
                    {ch.date && <span className="text-[9px] text-zinc-600">{new Date(ch.date).toLocaleDateString()}</span>}
                  </div>
                </div>
                <svg className="w-4 h-4 text-zinc-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-[#151f2e] rounded-xl border border-white/[0.04]">
            <p className="text-zinc-500 text-sm">{chapterSearch ? "No matching chapters" : "No chapters available"}</p>
          </div>
        )}
      </div>
    </div>
  );
}
