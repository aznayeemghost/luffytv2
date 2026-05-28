"use client";

import { useState, useEffect, useCallback } from "react";
import { useAppStore } from "./store";

// ============================================================
// LIVE NEWS PAGE — WatchFooty News API
// Dedicated news section with sport filters, search, pagination
// API: https://api.watchfooty.st/api/v1/news
// ============================================================

interface NewsArticle {
  id: string;
  headline: string;
  description: string | null;
  url: string;
  imageUrl: string | null;
  publishedAt: string;
  editedAt: string | null;
  sport: string;
  author: string | null;
  content?: string | null;
  mentions?: {
    name: string;
    url: string;
    entityId: string;
    entityType: string;
  }[] | null;
}

interface NewsPagination {
  limit: number;
  offset: number;
  nextOffset: number | null;
}

const SPORT_FILTERS = [
  { id: "all", label: "All Sports", icon: "📰", color: "#7c6cf0" },
  { id: "football", label: "Football", icon: "⚽", color: "#22c55e" },
  { id: "basketball", label: "Basketball", icon: "🏀", color: "#ef4444" },
  { id: "american-football", label: "NFL", icon: "🏈", color: "#dc2626" },
  { id: "hockey", label: "Hockey", icon: "🏒", color: "#06b6d4" },
  { id: "baseball", label: "Baseball", icon: "⚾", color: "#3b82f6" },
  { id: "tennis", label: "Tennis", icon: "🎾", color: "#a855f7" },
  { id: "fight", label: "MMA/Boxing", icon: "🥊", color: "#f97316" },
  { id: "motor-sports", label: "Motorsport", icon: "🏎️", color: "#eab308" },
  { id: "cricket", label: "Cricket", icon: "🏏", color: "#f59e0b" },
  { id: "rugby", label: "Rugby", icon: "🏉", color: "#10b981" },
  { id: "golf", label: "Golf", icon: "⛳", color: "#84cc16" },
];

const SPORT_TAG_COLORS: Record<string, string> = {
  football: "#22c55e",
  basketball: "#ef4444",
  hockey: "#06b6d4",
  baseball: "#3b82f6",
  tennis: "#a855f7",
  fight: "#f97316",
  "motor-sports": "#eab308",
  cricket: "#f59e0b",
  rugby: "#10b981",
  golf: "#84cc16",
  "american-football": "#dc2626",
  other: "#6b7280",
};

function timeAgo(dateStr: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function getSportColor(sport: string): string {
  return SPORT_TAG_COLORS[sport] || SPORT_TAG_COLORS.other;
}

export default function LiveNewsPage() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedSport, setSelectedSport] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [pagination, setPagination] = useState<NewsPagination | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);
  const [articleLoading, setArticleLoading] = useState(false);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(searchInput), 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Fetch news articles
  const fetchNews = useCallback(async (offset: number = 0, append: boolean = false) => {
    if (offset === 0) setLoading(true);
    else setLoadingMore(true);
    setError("");

    try {
      const params = new URLSearchParams();
      params.set("limit", "24");
      params.set("offset", String(offset));
      params.set("sort", "newest");
      if (selectedSport !== "all") params.set("sport", selectedSport);
      if (searchQuery) params.set("q", searchQuery);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const res = await fetch(`/api/news?${params.toString()}`, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) throw new Error("Failed to load news");
      const data = await res.json();

      const newArticles: NewsArticle[] = data.articles || [];
      if (append) {
        setArticles(prev => [...prev, ...newArticles]);
      } else {
        setArticles(newArticles);
      }
      setPagination(data.pagination || null);
    } catch (err: any) {
      setError(err.message || "Failed to load news");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [selectedSport, searchQuery]);

  useEffect(() => { fetchNews(0, false); }, [fetchNews]);

  // Load more articles
  const loadMore = useCallback(() => {
    if (pagination?.nextOffset !== null && pagination?.nextOffset !== undefined) {
      fetchNews(pagination.nextOffset, true);
    }
  }, [pagination, fetchNews]);

  // Fetch article detail
  const fetchArticleDetail = useCallback(async (articleId: string) => {
    setArticleLoading(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(`/api/news/article/${encodeURIComponent(articleId)}`, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        setSelectedArticle(data);
      }
    } catch {
      // Fallback: just use the article data we already have
    }
    setArticleLoading(false);
  }, []);

  // Handle article click — open detail view
  const handleArticleClick = (article: NewsArticle) => {
    setSelectedArticle(article);
    fetchArticleDetail(article.id);
  };

  // Close article detail
  const closeArticleDetail = () => {
    setSelectedArticle(null);
  };

  return (
    <div className="min-h-screen pb-8 -mx-4 lg:-mx-8">
      {/* Header + Search */}
      <div className="px-4 lg:px-8 pt-4 pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1
              className="text-2xl font-black text-white"
              style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
            >
              Sports News
            </h1>
            <p className="text-white/30 text-xs mt-0.5">
              {articles.length > 0 ? `${pagination?.offset !== undefined ? articles.length : articles.length} articles` : "Loading..."}
              {" "}from WatchFooty
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative w-full sm:w-64">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search news..."
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
      </div>

      {/* Sport Filter Chips */}
      <div className="px-4 lg:px-8 mb-2">
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
          {SPORT_FILTERS.map(filter => {
            const isActive = selectedSport === filter.id;
            return (
              <button
                key={filter.id}
                onClick={() => setSelectedSport(isActive ? "all" : filter.id)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all ${
                  isActive
                    ? "text-white"
                    : "bg-white/[0.03] text-white/40 hover:text-white/60 hover:bg-white/[0.06]"
                }`}
                style={{
                  ...(isActive ? {
                    background: `linear-gradient(135deg, ${filter.color}25, ${filter.color}10)`,
                    border: `1px solid ${filter.color}40`,
                  } : {}),
                  fontFamily: "var(--font-space-mono), 'Space Mono', monospace",
                }}
              >
                <span className="text-sm">{filter.icon}</span>
                {filter.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Article Detail Modal */}
      {selectedArticle && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={closeArticleDetail}>
          <div
            className="bg-[#12121a] border border-white/[0.08] rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <div className="sticky top-0 z-10 flex items-center justify-between p-4 bg-[#12121a]/95 backdrop-blur-sm border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <span
                  className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider text-white"
                  style={{ background: `${getSportColor(selectedArticle.sport)}30`, color: getSportColor(selectedArticle.sport) }}
                >
                  {selectedArticle.sport || "NEWS"}
                </span>
                {selectedArticle.author && (
                  <span className="text-[10px] text-white/30">by {selectedArticle.author}</span>
                )}
              </div>
              <button
                onClick={closeArticleDetail}
                className="p-1.5 rounded-lg bg-white/[0.06] text-white/40 hover:text-white hover:bg-white/[0.10] transition-all"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Article image */}
            {selectedArticle.imageUrl && (
              <div className="relative h-48 sm:h-64 overflow-hidden">
                <img
                  src={selectedArticle.imageUrl}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#12121a] via-transparent to-transparent" />
              </div>
            )}

            {/* Article content */}
            <div className="p-5">
              <h2 className="text-lg font-bold text-white mb-2 leading-snug" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>
                {selectedArticle.headline}
              </h2>

              <div className="flex items-center gap-2 mb-4">
                <span className="text-[10px] text-white/25">{timeAgo(selectedArticle.publishedAt)}</span>
                {selectedArticle.editedAt && (
                  <span className="text-[10px] text-white/15">(edited)</span>
                )}
              </div>

              {articleLoading ? (
                <div className="flex items-center gap-2 py-6">
                  <div className="w-5 h-5 rounded-full border-2 border-[#7c6cf0]/30 border-t-[#7c6cf0] animate-spin" />
                  <span className="text-xs text-white/30">Loading article...</span>
                </div>
              ) : (
                <>
                  {selectedArticle.content ? (
                    <div className="text-sm text-white/60 leading-relaxed whitespace-pre-wrap">
                      {selectedArticle.content}
                    </div>
                  ) : selectedArticle.description ? (
                    <p className="text-sm text-white/60 leading-relaxed">{selectedArticle.description}</p>
                  ) : (
                    <p className="text-sm text-white/30">No content available.</p>
                  )}

                  {/* Entity mentions */}
                  {selectedArticle.mentions && selectedArticle.mentions.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-white/[0.06]">
                      <p className="text-[10px] text-white/20 font-bold uppercase tracking-wider mb-2">Mentions</p>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedArticle.mentions.map((mention, i) => (
                          <a
                            key={i}
                            href={mention.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2 py-0.5 rounded text-[10px] font-medium bg-white/[0.04] text-white/40 hover:text-white/70 hover:bg-white/[0.06] transition-all"
                          >
                            {mention.name}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Read more link */}
                  <div className="mt-4 pt-3 border-t border-white/[0.06]">
                    <a
                      href={selectedArticle.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-[#7c6cf0]/15 text-[#7c6cf0] hover:bg-[#7c6cf0]/25 transition-all"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
                      </svg>
                      Read Full Article
                    </a>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && articles.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-12 h-12 rounded-full border-2 border-[#7c6cf0]/30 border-t-[#7c6cf0] animate-spin" />
          <p className="text-sm text-white/30">Loading news...</p>
          <p className="text-[10px] text-white/15">
            {selectedSport !== "all" ? `Fetching ${SPORT_FILTERS.find(f => f.id === selectedSport)?.label || selectedSport} news` : "Fetching latest sports news"}
          </p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="text-5xl">📰</div>
          <p className="text-sm text-white/40">{error}</p>
          <button
            onClick={() => fetchNews(0, false)}
            className="px-4 py-2 rounded-lg bg-white/[0.06] text-white/50 text-[11px] font-bold hover:bg-white/[0.08]"
          >
            Retry
          </button>
        </div>
      )}

      {/* News Articles Grid */}
      {!loading && !error && (
        <div className="px-4 lg:px-8">
          {/* Featured article — first article with large card */}
          {articles.length > 0 && (
            <div className="mb-6">
              <button
                onClick={() => handleArticleClick(articles[0])}
                className="group w-full block rounded-2xl overflow-hidden border border-white/[0.06] hover:border-white/[0.12] transition-all duration-300 text-left"
              >
                <div className="relative">
                  {articles[0].imageUrl ? (
                    <div className="relative h-48 sm:h-64 lg:h-72 overflow-hidden">
                      <img
                        src={articles[0].imageUrl}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                    </div>
                  ) : (
                    <div
                      className="h-32 sm:h-40"
                      style={{ background: `linear-gradient(135deg, ${getSportColor(articles[0].sport)}25, #0d0d12)` }}
                    />
                  )}

                  {/* Featured badge */}
                  <div className="absolute top-3 left-3 z-10">
                    <span className="px-2 py-0.5 rounded-md bg-[#7c6cf0] text-white text-[8px] font-black uppercase tracking-wider">
                      Featured
                    </span>
                  </div>

                  {/* Content overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider text-white"
                        style={{ background: `${getSportColor(articles[0].sport)}30`, color: getSportColor(articles[0].sport) }}
                      >
                        {articles[0].sport || "NEWS"}
                      </span>
                      <span className="text-[10px] text-white/40">{timeAgo(articles[0].publishedAt)}</span>
                    </div>
                    <h2 className="text-base sm:text-lg font-bold text-white group-hover:text-[#7c6cf0] transition-colors leading-snug mb-1" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>
                      {articles[0].headline}
                    </h2>
                    {articles[0].description && (
                      <p className="text-[11px] text-white/50 line-clamp-2 max-w-2xl">{articles[0].description}</p>
                    )}
                  </div>
                </div>
              </button>
            </div>
          )}

          {/* Article grid — remaining articles */}
          {articles.length > 1 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {articles.slice(1).map(article => {
                const sportColor = getSportColor(article.sport);

                return (
                  <button
                    key={article.id}
                    onClick={() => handleArticleClick(article)}
                    className="group block rounded-xl overflow-hidden bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.04] transition-all duration-300 hover:scale-[1.02] text-left"
                  >
                    {/* Article image */}
                    {article.imageUrl ? (
                      <div className="h-36 overflow-hidden">
                        <img
                          src={article.imageUrl}
                          alt=""
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      </div>
                    ) : (
                      <div
                        className="h-20 flex items-center justify-center"
                        style={{ background: `linear-gradient(135deg, ${sportColor}15, ${sportColor}06, #0d0d12)` }}
                      >
                        <span className="text-3xl opacity-30">📰</span>
                      </div>
                    )}

                    {/* Article content */}
                    <div className="p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider"
                          style={{ background: `${sportColor}20`, color: sportColor }}
                        >
                          {article.sport || "NEWS"}
                        </span>
                        <span className="text-[8px] text-white/25">{timeAgo(article.publishedAt)}</span>
                      </div>
                      <p className="text-[11px] font-bold text-white/80 group-hover:text-white line-clamp-2 mb-1 leading-snug">
                        {article.headline}
                      </p>
                      {article.description && (
                        <p className="text-[9px] text-white/35 line-clamp-2">{article.description}</p>
                      )}
                      {article.author && (
                        <p className="text-[8px] text-white/15 mt-1.5">by {article.author}</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Load More Button */}
          {pagination?.nextOffset !== null && pagination?.nextOffset !== undefined && (
            <div className="flex justify-center mt-6">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="px-6 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/40 text-[11px] font-bold hover:bg-white/[0.06] hover:text-white/60 transition-all disabled:opacity-50"
                style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
              >
                {loadingMore ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white/60 animate-spin" />
                    Loading more...
                  </span>
                ) : (
                  "Load More Articles"
                )}
              </button>
            </div>
          )}

          {/* No articles */}
          {articles.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="text-5xl">🔍</div>
              <p className="text-sm text-white/40">No news articles found</p>
              <p className="text-[10px] text-white/20">Try adjusting your sport filter or search query</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
