"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useAppStore } from "./store";
import LiveTVPage from "./live-tv-page";
import Live247Page from "./live-247-page";
import LiveNewsPage from "./live-news-page";

// ============================================================
// LIVE TV & SPORTS — WatchFooty-Style Complete Redesign
// Single scroll page with:
// A. News Ticker Bar (marquee, top)
// B. Sport Navigation Bar (sticky)
// C. Sports Category Cards (horizontal scroll)
// D. Popular Live Section (landscape poster cards)
// E. All Matches Section (grouped by sport/time, vertical list)
// F. News Section (grid at bottom)
// ============================================================

const WF_BASE = "https://api.watchfooty.st";

const defaultSportCategories = [
  { id: "all", label: "All Sports", icon: "🏟️", color: "#7c6cf0" },
  { id: "football", label: "Football", icon: "⚽", color: "#22c55e" },
  { id: "basketball", label: "Basketball", icon: "🏀", color: "#ef4444" },
  { id: "american-football", label: "NFL", icon: "🏈", color: "#dc2626" },
  { id: "hockey", label: "Hockey", icon: "🏒", color: "#06b6d4" },
  { id: "baseball", label: "Baseball", icon: "⚾", color: "#3b82f6" },
  { id: "tennis", label: "Tennis", icon: "🎾", color: "#a855f7" },
  { id: "fight", label: "MMA/Boxing", icon: "🥊", color: "#f97316" },
  { id: "motor-sports", label: "Motorsport", icon: "🏎️", color: "#eab308" },
  { id: "rugby", label: "Rugby", icon: "🏉", color: "#10b981" },
  { id: "golf", label: "Golf", icon: "⛳", color: "#84cc16" },
  { id: "cricket", label: "Cricket", icon: "🏏", color: "#f59e0b" },
  { id: "billiards", label: "Billiards", icon: "🎱", color: "#8b5cf6" },
  { id: "afl", label: "AFL", icon: "🏈", color: "#14b8a6" },
  { id: "darts", label: "Darts", icon: "🎯", color: "#f43f5e" },
  { id: "other", label: "Other", icon: "📺", color: "#6b7280" },
];

// Sport-specific gradient pairs for cards
const SPORT_GRADIENTS: Record<string, [string, string]> = {
  football: ["#1a472a", "#0d2818"],
  basketball: ["#8B0000", "#4a0000"],
  "american-football": ["#8B0000", "#3d0c02"],
  hockey: ["#003366", "#001a33"],
  baseball: ["#003087", "#001a4d"],
  tennis: ["#5b2c6f", "#2d1637"],
  fight: ["#b35900", "#5c2d00"],
  "motor-sports": ["#8b8000", "#454000"],
  rugby: ["#0b5345", "#052e28"],
  golf: ["#3d6b33", "#1e3519"],
  cricket: ["#7d6608", "#3e3304"],
  other: ["#2c2c2c", "#1a1a1a"],
};

interface MatchSource { source: string; id: string; }

interface LiveMatch {
  id: string;
  title: string;
  sport: string;
  sportName: string;
  date: number;
  poster: string;
  popular: boolean;
  homeTeam: string;
  awayTeam: string;
  homeBadge: string;
  awayBadge: string;
  sources: MatchSource[];
  isLive: boolean;
  apiSource?: string;
  streamKey?: string;
  streamCategory?: string;
  channelCode?: string;
  channelName?: string;
  damitvId?: string;
  damitvName?: string;
  watchfootyId?: number;
  sportsrcCategory?: string;
  sportsrcId?: string;
  watchfootyStreams?: { id: string; url: string; quality: string; language: string; isRedirect: boolean; nsfw: boolean; ads: boolean }[];
  league?: string;
  leagueLogo?: string;
  homeScore?: number;
  awayScore?: number;
  currentMinute?: string;
}

interface TVChannel {
  id: string;
  title: string;
  sport: string;
  sportName: string;
  isLive: boolean;
  apiSource: string;
  streamKey?: string;
  streamCategory?: string;
  channelName?: string;
  channelCode?: string;
  damitvId?: string;
  damitvName?: string;
  poster?: string;
  sources?: { source: string; id: string }[];
}

interface SportCategory { id: string; name: string; displayName?: string; liveCount?: number; }

interface NewsArticle {
  id: string;
  headline: string;
  description: string;
  url: string;
  imageUrl: string;
  publishedAt: string;
  editedAt: string | null;
  sport: string;
  author: string;
}

function getSportColor(sport: string): string {
  const cat = defaultSportCategories.find(c => c.id === sport);
  return cat?.color || "#6b7280";
}

function getSportIcon(sport: string): string {
  const cat = defaultSportCategories.find(c => c.id === sport);
  return cat?.icon || "📺";
}

function getSportGradient(sport: string): [string, string] {
  return SPORT_GRADIENTS[sport] || SPORT_GRADIENTS.other;
}

// ── Format helpers ──
function formatMatchTime(timestamp: number): string {
  if (!timestamp) return "";
  const d = new Date(timestamp);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const isTomorrow = new Date(now.getTime() + 86400000).toDateString() === d.toDateString();
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (isToday) return `Today, ${time}`;
  if (isTomorrow) return `Tomorrow, ${time}`;
  return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }) + `, ${time}`;
}

function formatTimeOnly(timestamp: number): string {
  if (!timestamp) return "";
  return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function capitalize(s: string) { return s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, " ") : ""; }
// Safe primitive extraction: handles WatchFooty {value, displayValue} objects
// NOTE: Do NOT restrict by key count — WatchFooty objects can have extra keys
function toPrimitive(v: any): any {
  if (v === null || v === undefined) return v;
  if (typeof v === "object") {
    if ("value" in v) return toPrimitive(v.value);
    if ("displayValue" in v) return toPrimitive(v.displayValue);
    return undefined;
  }
  return v;
}
function safeStr(v: any): string { const p = toPrimitive(v); if (p === null || p === undefined) return ""; if (typeof p === "object") return ""; return String(p); }

const sportTagColors: Record<string, string> = {
  football: "bg-emerald-600",
  basketball: "bg-red-700",
  hockey: "bg-cyan-700",
  baseball: "bg-blue-700",
  tennis: "bg-purple-700",
  fight: "bg-orange-700",
  "motor-sports": "bg-yellow-700",
  rugby: "bg-emerald-800",
  cricket: "bg-amber-700",
  other: "bg-gray-700",
  news: "bg-blue-900",
};

// Source badge config — shows which provider the match comes from
const SOURCE_BADGES: Record<string, { label: string; color: string; bg: string }> = {
  damitv: { label: "DamiTV", color: "#f97316", bg: "rgba(249,115,22,0.15)" },
  streamfree: { label: "StreamFree", color: "#a855f7", bg: "rgba(168,85,247,0.15)" },
  watchfooty: { label: "WatchFooty", color: "#3b82f6", bg: "rgba(59,130,246,0.15)" },
  streamedpk: { label: "StreamedPK", color: "#22c55e", bg: "rgba(34,197,94,0.15)" },
  espn: { label: "ESPN", color: "#ef4444", bg: "rgba(239,68,68,0.15)" },
  sportsembed: { label: "SportsEmbed", color: "#06b6d4", bg: "rgba(6,182,212,0.15)" },
};

// ═══════════════════════════════════════════════════════════════
// NEWS TICKER BAR — Scrolling marquee at top
// ═══════════════════════════════════════════════════════════════
function NewsTicker({ articles }: { articles: NewsArticle[] }) {
  if (articles.length === 0) return null;

  const items = articles.slice(0, 20);
  const content = items.map((a, i) => (
    <span key={a.id} className="inline-flex items-center gap-2 whitespace-nowrap">
      <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider text-white ${sportTagColors[a.sport] || "bg-gray-700"}`}>
        {a.sport || "NEWS"}
      </span>
      <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-white/80 hover:text-white text-[11px] font-medium transition-colors">
        {a.headline}
      </a>
      {i < items.length - 1 && <span className="text-white/20 mx-2">/</span>}
    </span>
  ));

  return (
    <div className="w-full bg-black border-b border-white/[0.06] overflow-hidden">
      <div className="flex items-center h-8">
        <div className="flex-shrink-0 px-3 bg-red-600 h-full flex items-center">
          <span className="text-white text-[9px] font-black uppercase tracking-widest">LIVE</span>
        </div>
        <div className="overflow-hidden flex-1 relative">
          <div className="flex animate-marquee whitespace-nowrap">
            <div className="flex items-center gap-0 px-4">{content}</div>
            <div className="flex items-center gap-0 px-4">{content}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// HORIZONTAL ROW MATCH CARD (compact variant)
// Full-width horizontal row, ~85px tall
// Left: sport icon circle | Middle: match info | Right: score/watch
// ═══════════════════════════════════════════════════════════════
function MatchCard({ match, onWatch, variant }: { match: LiveMatch; onWatch: (m: LiveMatch) => void; variant: "poster" | "compact" }) {
  const sportColor = getSportColor(match.sport);
  const hasScore = match.homeScore !== undefined && match.awayScore !== undefined;
  const sourceBadge = match.apiSource ? SOURCE_BADGES[match.apiSource] : null;

  if (variant === "compact") {
    return (
      <button
        onClick={() => onWatch(match)}
        className="group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-white/[0.06] transition-all duration-200 hover:border-white/[0.12] cursor-pointer backdrop-blur-sm"
        style={{
          background: `linear-gradient(135deg, ${sportColor}12, ${sportColor}06)`,
        }}
      >
        {/* Left: Sport icon circle with gradient */}
        <div
          className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm"
          style={{
            background: `linear-gradient(135deg, ${sportColor}30, ${sportColor}15)`,
            border: `1px solid ${sportColor}25`,
          }}
        >
          {match.homeBadge ? (
            <img src={match.homeBadge} alt="" className="w-6 h-6 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          ) : (
            <span>{getSportIcon(match.sport)}</span>
          )}
        </div>

        {/* Middle: Match info */}
        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-2">
            <p className="text-[11px] font-bold text-white truncate">{match.title}</p>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {match.isLive ? (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-600/20 text-red-400 text-[8px] font-black uppercase tracking-wider">
                <span className="w-1 h-1 rounded-full bg-red-500 animate-pulse" />
                LIVE
              </span>
            ) : (
              <span className="text-[9px] text-white/30 font-medium">{formatTimeOnly(match.date)}</span>
            )}
            {sourceBadge && (
              <span
                className="px-1.5 py-0.5 rounded text-[7px] font-bold"
                style={{ background: sourceBadge.bg, color: sourceBadge.color }}
              >
                {sourceBadge.label}
              </span>
            )}
            {match.league && (
              <span className="text-[8px] text-white/25 font-medium truncate max-w-[120px]">{match.league}</span>
            )}
            {match.currentMinute && match.isLive && (
              <span className="text-[8px] text-amber-400/80 font-bold">{safeStr(match.currentMinute)}&apos;</span>
            )}
          </div>
        </div>

        {/* Right: Score or Watch button */}
        <div className="flex-shrink-0 flex items-center">
          {hasScore ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/30 border border-white/[0.08]">
              <span className="text-[12px] font-black text-white">{safeStr(match.homeScore)}</span>
              <span className="text-[9px] text-white/30 font-bold">-</span>
              <span className="text-[12px] font-black text-white">{safeStr(match.awayScore)}</span>
            </div>
          ) : match.isLive ? (
            <span
              className="px-3 py-1 rounded-lg text-[9px] font-bold uppercase text-white transition-all group-hover:opacity-90"
              style={{
                background: `linear-gradient(135deg, ${sportColor}40, ${sportColor}20)`,
                border: `1px solid ${sportColor}30`,
              }}
            >
              Watch
            </span>
          ) : (
            <span className="text-[9px] text-white/20 font-medium">{match.sportName}</span>
          )}
        </div>
      </button>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // LANDSCAPE POSTER CARD (poster variant)
  // ~220px wide, ~140px tall, landscape orientation
  // ═══════════════════════════════════════════════════════════════
  return (
    <button
      onClick={() => onWatch(match)}
      className="group relative flex-shrink-0 w-[200px] sm:w-[220px] rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl cursor-pointer"
    >
      <div className="relative h-[130px] sm:h-[140px]" style={{ background: `linear-gradient(135deg, ${sportColor}30, #0d0d12)` }}>
        {/* Poster as background */}
        {match.poster && (
          <img
            src={match.poster}
            alt={match.title}
            className="absolute inset-0 w-full h-full object-cover opacity-50"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        )}

        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

        {/* Top-left: LIVE badge */}
        <div className="absolute top-2 left-2">
          {match.isLive ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-600 text-white text-[8px] font-black uppercase tracking-wider shadow-lg">
              <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
              LIVE
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-md bg-black/70 text-white text-[8px] font-bold">
              {formatTimeOnly(match.date)}
            </span>
          )}
        </div>

        {/* Top-right: Source badge + League badge */}
        <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
          {sourceBadge && (
            <span
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[7px] font-bold backdrop-blur-sm"
              style={{ background: sourceBadge.bg, color: sourceBadge.color }}
            >
              {sourceBadge.label}
            </span>
          )}
          {match.league && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/50 backdrop-blur-sm text-white text-[7px] font-bold uppercase max-w-[100px] truncate">
              {match.leagueLogo && <img src={match.leagueLogo} alt="" className="w-2.5 h-2.5 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />}
              {match.league}
            </span>
          )}
        </div>

        {/* Bottom: Team names and score */}
        <div className="absolute bottom-0 left-0 right-0 p-2.5 pt-6 bg-gradient-to-t from-black/90 to-transparent">
          {hasScore ? (
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="text-[10px] font-bold text-white/80 truncate max-w-[70px]">{safeStr(match.homeTeam)}</span>
              <span className="text-[12px] font-black text-white">{safeStr(match.homeScore)}</span>
              <span className="text-[8px] text-white/30">-</span>
              <span className="text-[12px] font-black text-white">{safeStr(match.awayScore)}</span>
              <span className="text-[10px] font-bold text-white/80 truncate max-w-[70px]">{safeStr(match.awayTeam)}</span>
            </div>
          ) : (
            <p className="text-[10px] font-bold text-white truncate">{match.title}</p>
          )}
          {match.currentMinute && match.isLive && (
            <p className="text-[7px] text-amber-400 font-bold text-center">{safeStr(match.currentMinute)}&apos;</p>
          )}
          {!hasScore && (
            <p className="text-[8px] text-white/40 mt-0.5">{match.sportName}</p>
          )}
        </div>
      </div>
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════
// NEWS CARD
// ═══════════════════════════════════════════════════════════════
function NewsCard({ article }: { article: NewsArticle }) {
  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-xl overflow-hidden bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.04] transition-all duration-300 hover:scale-[1.02]"
    >
      {article.imageUrl && (
        <div className="h-36 overflow-hidden">
          <img src={article.imageUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
        </div>
      )}
      <div className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider text-white ${sportTagColors[article.sport] || "bg-gray-700"}`}>
            {article.sport || "NEWS"}
          </span>
          <span className="text-[8px] text-white/25">{timeAgo(article.publishedAt)}</span>
        </div>
        <p className="text-[11px] font-bold text-white/80 group-hover:text-white line-clamp-2 mb-1">{article.headline}</p>
        {article.description && (
          <p className="text-[9px] text-white/35 line-clamp-2">{article.description}</p>
        )}
      </div>
    </a>
  );
}

// ═══════════════════════════════════════════════════════════════
// TV CHANNEL CARD
// ═══════════════════════════════════════════════════════════════
function TVChannelCard({ channel, onWatch }: { channel: TVChannel; onWatch: (ch: TVChannel) => void }) {
  const sportColor = getSportColor(channel.sport);
  const sportIcon = getSportIcon(channel.sport);
  const sourceTag = channel.apiSource === "streamfree" ? "StreamFree" :
                    channel.apiSource === "damitv" ? "DamiTV" : channel.apiSource;

  return (
    <button
      onClick={() => onWatch(channel)}
      className="group relative flex-shrink-0 w-[150px] sm:w-[170px] rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl cursor-pointer border border-white/[0.06] hover:border-white/[0.15]"
    >
      <div className="relative h-[100px] sm:h-[110px] flex flex-col items-center justify-center p-3" style={{ background: `linear-gradient(135deg, ${sportColor}25, #0d0d12)` }}>
        {/* Channel icon */}
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-lg mb-2"
          style={{
            background: `linear-gradient(135deg, ${sportColor}40, ${sportColor}20)`,
            border: `1.5px solid ${sportColor}50`,
          }}
        >
          {channel.poster ? (
            <img src={channel.poster} alt="" className="w-7 h-7 rounded-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          ) : (
            <span>{sportIcon}</span>
          )}
        </div>

        {/* Channel name */}
        <p className="text-[10px] font-bold text-white text-center truncate w-full">{channel.channelName || channel.title}</p>

        {/* Source badge + LIVE */}
        <div className="flex items-center gap-1.5 mt-1.5">
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-red-600/20 text-red-400 text-[7px] font-black uppercase tracking-wider">
            <span className="w-1 h-1 rounded-full bg-red-500 animate-pulse" />
            LIVE
          </span>
          <span className="text-[7px] font-bold text-white/25 px-1 py-0.5 rounded bg-white/[0.04]">{sourceTag}</span>
        </div>
      </div>
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════
// MATCH SECTION (grouped matches — vertical list layout)
// ═══════════════════════════════════════════════════════════════
function MatchSection({ title, icon, matches, onWatch, liveCount }: {
  title: string;
  icon: string;
  matches: LiveMatch[];
  onWatch: (m: LiveMatch) => void;
  liveCount?: number;
}) {
  const [showAll, setShowAll] = useState(false);
  const INITIAL_SHOW = 5;
  const displayedMatches = showAll ? matches : matches.slice(0, INITIAL_SHOW);
  const hasMore = matches.length > INITIAL_SHOW;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-white flex items-center gap-2" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>
          <span className="text-base">{icon}</span> {title}
          {liveCount !== undefined && liveCount > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/15 text-red-400">Live ({liveCount})</span>
          )}
        </h2>
        {hasMore && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-[10px] font-bold text-white/30 hover:text-white/60 transition-all"
            style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
          >
            {showAll ? "Show less" : `+${matches.length - INITIAL_SHOW} more`}
          </button>
        )}
      </div>
      <div className="flex flex-col gap-2">
        {displayedMatches.map(match => (
          <MatchCard key={match.id} match={match} onWatch={onWatch} variant="compact" />
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN LIVE PAGE
// ═══════════════════════════════════════════════════════════════
export default function LivePage() {
  const navigate = useAppStore(s => s.navigate);
  const sectionSubPage = useAppStore(s => s.sectionSubPage);
  const setSectionSubPage = useAppStore(s => s.setSectionSubPage);

  // ── Sports state ──
  // NOTE: ALL hooks must be called before any conditional returns.
  // Violating this causes React error #300 when switching between navbar tabs.
  const [selectedSport, setSelectedSport] = useState("all");
  const [liveOnly, setLiveOnly] = useState(false);
  const [matches, setMatches] = useState<LiveMatch[]>([]);
  const [tvChannels, setTvChannels] = useState<TVChannel[]>([]);
  const [sports, setSports] = useState<SportCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // ── News state ──
  const [newsArticles, setNewsArticles] = useState<NewsArticle[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsOffset, setNewsOffset] = useState(0);
  const [newsHasMore, setNewsHasMore] = useState(true);

  // ── Refs ──
  const sportCardsRef = useRef<HTMLDivElement>(null);
  const popularRef = useRef<HTMLDivElement>(null);

  // ── Fetch data ──
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (selectedSport !== "all") params.set("sport", selectedSport);
      if (liveOnly) params.set("filter", "live");

      // Add frontend timeout (30s) — prevents infinite loading if API hangs
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const res = await fetch(`/api/live?${params.toString()}`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error("API failed");
      const data = await res.json();

      const matchList: LiveMatch[] = (data.matches || []).map((m: any) => ({
        ...m,
        // Trust the server's isLive determination (it already applies proper status checks + time-based sanity)
        // Don't override with status strings that may be stale
      }));

      matchList.sort((a, b) => {
        if (a.isLive && !b.isLive) return -1;
        if (!a.isLive && b.isLive) return 1;
        if (a.popular && !b.popular) return -1;
        if (!a.popular && b.popular) return 1;
        return a.date - b.date;
      });

      setMatches(matchList);
      setTvChannels(data.tvChannels || []);
      setSports(data.sports || []);
      setLastUpdated(new Date());
    } catch (err: any) {
      setError(err.message || "Failed to load live data");
    } finally {
      setLoading(false);
    }
  }, [selectedSport, liveOnly]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // ── Fetch News ──
  const fetchNews = useCallback(async (offset: number = 0, append: boolean = false) => {
    setNewsLoading(true);
    try {
      const res = await fetch(`/api/news?limit=12&offset=${offset}&sort=newest`);
      if (res.ok) {
        const data = await res.json();
        const articles: NewsArticle[] = data.articles || [];
        if (append) {
          setNewsArticles(prev => [...prev, ...articles]);
        } else {
          setNewsArticles(articles);
        }
        setNewsHasMore(articles.length >= 12);
        setNewsOffset(offset + articles.length);
      }
    } catch {}
    setNewsLoading(false);
  }, []);

  useEffect(() => { fetchNews(0, false); }, [fetchNews]);

  // ── Navigate to watch a TV channel ──
  const handleWatchChannel = (channel: TVChannel) => {
    navigate({
      page: "live-watch",
      matchId: channel.id,
      matchTitle: safeStr(channel.channelName || channel.title),
      matchSport: safeStr(channel.sport),
      matchSportName: safeStr(channel.sportName),
      matchHomeTeam: "",
      matchAwayTeam: "",
      matchHomeBadge: "",
      matchAwayBadge: "",
      matchPoster: safeStr(channel.poster),
      matchPopular: false,
      matchSources: JSON.stringify(channel.sources || []),
      matchDate: 0,
      matchStreamKey: safeStr(channel.streamKey),
      matchStreamCategory: safeStr(channel.streamCategory),
      matchChannelName: safeStr(channel.channelName || channel.title),
      matchChannelCode: safeStr(channel.channelCode),
      matchDamitvId: safeStr(channel.damitvId),
      matchDamitvName: safeStr(channel.damitvName || channel.channelName || channel.title),
      matchApiSource: safeStr(channel.apiSource),
    } as any);
  };

  // ── Navigate to watch ──
  const handleWatchMatch = (match: LiveMatch) => {
    navigate({
      page: "live-watch",
      matchId: match.id,
      matchTitle: safeStr(match.title),
      matchSport: safeStr(match.sport),
      matchSportName: safeStr(match.sportName),
      matchHomeTeam: safeStr(match.homeTeam),
      matchAwayTeam: safeStr(match.awayTeam),
      matchHomeBadge: safeStr(match.homeBadge),
      matchAwayBadge: safeStr(match.awayBadge),
      matchPoster: safeStr(match.poster),
      matchPopular: match.popular,
      matchSources: JSON.stringify(match.sources),
      matchDate: match.date,
      matchStreamKey: safeStr(match.streamKey),
      matchStreamCategory: safeStr(match.streamCategory),
      matchChannelName: safeStr(match.channelName),
      matchChannelCode: safeStr(match.channelCode),
      matchDamitvId: safeStr(match.damitvId),
      matchDamitvName: safeStr(match.damitvName || match.title),
      matchApiSource: safeStr(match.apiSource),
      matchSportsrcCategory: safeStr(match.sportsrcCategory),
      matchSportsrcId: safeStr(match.sportsrcId),
      matchWatchfootyStreams: match.watchfootyStreams ? JSON.stringify(match.watchfootyStreams) : "",
      matchLeague: safeStr(match.league),
      matchLeagueLogo: safeStr(match.leagueLogo),
      matchHomeScore: toPrimitive(match.homeScore) ?? undefined,
      matchAwayScore: toPrimitive(match.awayScore) ?? undefined,
      matchCurrentMinute: toPrimitive(match.currentMinute) || "",
    } as any);
  };

  // ── Derived state ──
  const now = Date.now();
  const filteredMatches = useMemo(() => {
    let result = matches;
    if (selectedSport !== "all") result = result.filter(m => m.sport === selectedSport);
    if (liveOnly) result = result.filter(m => m.isLive);
    return result;
  }, [matches, selectedSport, liveOnly]);

  const liveMatches = useMemo(() => filteredMatches.filter(m => m.isLive), [filteredMatches]);
  const startingSoon = useMemo(() => filteredMatches.filter(m => !m.isLive && m.date > now && m.date - now < 3600000), [filteredMatches, now]);
  const todayUpcoming = useMemo(() => filteredMatches.filter(m => !m.isLive && m.date > now && m.date - now >= 3600000 && m.date - now < 86400000), [filteredMatches, now]);
  const laterMatches = useMemo(() => filteredMatches.filter(m => !m.isLive && m.date > now && m.date - now >= 86400000), [filteredMatches, now]);

  const popularLiveMatches = useMemo(() => {
    return liveMatches.filter(m => m.popular || (m.apiSource === "watchfooty" && m.poster)).slice(0, 20);
  }, [liveMatches]);

  // Most Popular — DamiTV-sourced live matches (shown at top of page)
  const mostPopularDamitv = useMemo(() => {
    return liveMatches.filter(m => m.apiSource === "damitv" && m.isLive).slice(0, 20);
  }, [liveMatches]);

  // Group matches by sport for sport sections
  const matchesBySport = useMemo(() => {
    const groups: Record<string, LiveMatch[]> = {};
    for (const m of filteredMatches) {
      if (!groups[m.sport]) groups[m.sport] = [];
      groups[m.sport].push(m);
    }
    return groups;
  }, [filteredMatches]);

  const liveCountBySport: Record<string, number> = {};
  for (const m of matches) {
    if (m.isLive) liveCountBySport[m.sport] = (liveCountBySport[m.sport] || 0) + 1;
  }
  const totalLiveCount = Object.values(liveCountBySport).reduce((a, b) => a + b, 0);

  // Merge sports from API with defaults
  const displayCategories = useMemo(() => {
    const cats = defaultSportCategories.map(cat => {
      const apiSport = sports.find(s => s.id === cat.id);
      return {
        ...cat,
        label: apiSport?.displayName || apiSport?.name || cat.label,
        liveCount: liveCountBySport[cat.id] || apiSport?.liveCount || 0,
      };
    });
    for (const s of sports) {
      if (!cats.find(c => c.id === s.id)) {
        cats.push({
          id: s.id,
          label: s.displayName || s.name || capitalize(s.id),
          icon: getSportIcon(s.id),
          color: getSportColor(s.id),
          liveCount: liveCountBySport[s.id] || s.liveCount || 0,
        });
      }
    }
    return cats;
  }, [sports, liveCountBySport]);

  const sortedNavSports = useMemo(() => {
    return [...displayCategories]
      .filter(c => c.id !== "all")
      .sort((a, b) => (b.liveCount || 0) - (a.liveCount || 0));
  }, [displayCategories]);

  const topNavSports = sortedNavSports.slice(0, 7);
  const moreNavSports = sortedNavSports.slice(7);
  const [showMoreDropdown, setShowMoreDropdown] = useState(false);

  const scrollContainer = (ref: React.RefObject<HTMLDivElement | null>, direction: "left" | "right") => {
    if (!ref.current) return;
    ref.current.scrollBy({ left: direction === "left" ? -400 : 400, behavior: "smooth" });
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════

  // ── Tab: If on tv-channels sub-page, render LiveTVPage instead ──
  // This MUST be after all hooks to avoid React error #300
  if (sectionSubPage === "tv-channels") {
    return <LiveTVPage />;
  }

  // ── Tab: If on 247-live sub-page, render Live247Page instead ──
  if (sectionSubPage === "247-live") {
    return <Live247Page />;
  }

  // ── Tab: If on news sub-page, render LiveNewsPage instead ──
  if (sectionSubPage === "news") {
    return <LiveNewsPage />;
  }

  return (
    <div className="min-h-screen pb-8 -mx-4 lg:-mx-8">

      {/* ══════════════════════════════════════════
          A. NEWS TICKER BAR (top of page)
          ══════════════════════════════════════════ */}
      <NewsTicker articles={newsArticles} />

      {/* ══════════════════════════════════════════
          B. STICKY TOP NAVIGATION BAR
          ══════════════════════════════════════════ */}
      <div className="sticky top-[65px] z-40 bg-[#0d0d12]/95 backdrop-blur-md border-b border-white/[0.06] px-4 lg:px-8">
        <div className="max-w-[1400px] mx-auto flex items-center gap-3 h-12">
          {/* Home Button */}
          <button
            onClick={() => { setSelectedSport("all"); setLiveOnly(false); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-white/60 hover:text-white hover:bg-white/[0.06] transition-all flex-shrink-0"
            style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            Home
          </button>

          {/* Live Only Toggle */}
          <button
            onClick={() => setLiveOnly(!liveOnly)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all flex-shrink-0 ${
              liveOnly
                ? "bg-red-500/20 text-red-400 border border-red-500/30"
                : "text-white/40 hover:text-white/60 hover:bg-white/[0.04]"
            }`}
            style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
          >
            <span className={`w-2 h-2 rounded-full ${liveOnly ? "bg-red-500 animate-pulse" : "bg-white/20"}`} />
            Live only
          </button>

          {/* Divider */}
          <div className="w-px h-6 bg-white/[0.06] flex-shrink-0" />

          {/* Sport Category Buttons */}
          <div className="flex items-center gap-1 overflow-x-auto flex-1 scrollbar-hide">
            {topNavSports.map(cat => {
              const isActive = selectedSport === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedSport(cat.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all flex-shrink-0 ${
                    isActive
                      ? "text-white"
                      : "text-white/40 hover:text-white/70 hover:bg-white/[0.04]"
                  }`}
                  style={{
                    ...(isActive ? {
                      background: `linear-gradient(135deg, ${cat.color}25, ${cat.color}10)`,
                      border: `1px solid ${cat.color}40`,
                    } : {}),
                    fontFamily: "var(--font-space-mono), 'Space Mono', monospace",
                  }}
                >
                  <span className="text-sm">{cat.icon}</span>
                  {cat.label}
                  {cat.liveCount > 0 && (
                    <span className="text-[8px] px-1 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-bold">Live ({cat.liveCount})</span>
                  )}
                </button>
              );
            })}

            {/* More Dropdown */}
            {moreNavSports.length > 0 && (
              <div className="relative flex-shrink-0">
                <button
                  onClick={() => setShowMoreDropdown(!showMoreDropdown)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-white/40 hover:text-white/70 hover:bg-white/[0.04] transition-all"
                >
                  More
                  <svg className={`w-3 h-3 transition-transform ${showMoreDropdown ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M6 9l6 6 6-6" /></svg>
                </button>
                {showMoreDropdown && (
                  <div className="absolute top-full right-0 mt-2 w-48 bg-[#1a1a24] border border-white/[0.08] rounded-xl shadow-2xl py-2 z-50">
                    {moreNavSports.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => { setSelectedSport(cat.id); setShowMoreDropdown(false); }}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-[11px] hover:bg-white/[0.04] transition-all ${
                          selectedSport === cat.id ? "text-white" : "text-white/50"
                        }`}
                      >
                        <span>{cat.icon}</span>
                        {cat.label}
                        {cat.liveCount > 0 && (
                          <span className="ml-auto text-[8px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400">{cat.liveCount}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          CONTENT AREA (single scroll, no tabs)
          ══════════════════════════════════════════ */}
      <div className="px-4 lg:px-8 max-w-[1400px] mx-auto pt-4 space-y-8">

        {/* Loading */}
        {loading && matches.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-12 h-12 rounded-full border-2 border-[#7c6cf0]/30 border-t-[#7c6cf0] animate-spin" />
            <p className="text-sm text-white/30">Loading live sports...</p>
            <p className="text-[10px] text-white/15">Fetching from multiple sources</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="text-5xl">⚠️</div>
            <p className="text-sm text-white/40">{error}</p>
            <button onClick={fetchData} className="px-4 py-2 rounded-lg bg-white/[0.06] text-white/50 text-[11px] font-bold hover:bg-white/[0.08]">Retry</button>
          </div>
        )}

        {!loading && (
          <>
            {/* ══════════════════════════════════════════
                MOST POPULAR — DamiTV Source (TOP OF PAGE)
                ══════════════════════════════════════════ */}
            {mostPopularDamitv.length > 0 && (
              <div ref={popularRef}>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-bold text-white flex items-center gap-2" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>
                    <span className="text-base">🔥</span> Most Popular
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400">DamiTV</span>
                  </h2>
                </div>
                <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
                  {mostPopularDamitv.map(match => (
                    <MatchCard key={match.id} match={match} onWatch={handleWatchMatch} variant="poster" />
                  ))}
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════
                C. SPORTS CATEGORY CARDS (Horizontal Scroll)
                ══════════════════════════════════════════ */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-white/60 uppercase tracking-wider flex items-center gap-2" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>
                  <span className="text-base">🏟️</span> Sports
                </h2>
                <div className="flex items-center gap-1">
                  <button onClick={() => scrollContainer(sportCardsRef, "left")} className="p-1 rounded-lg bg-white/[0.04] text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-all">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  <button onClick={() => scrollContainer(sportCardsRef, "right")} className="p-1 rounded-lg bg-white/[0.04] text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-all">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M9 5l7 7-7 7" /></svg>
                  </button>
                </div>
              </div>
              <div ref={sportCardsRef} className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
                {displayCategories.filter(c => c.id !== "all").map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedSport(selectedSport === cat.id ? "all" : cat.id)}
                    className={`group flex flex-col items-center gap-2 px-5 py-4 rounded-xl min-w-[100px] flex-shrink-0 transition-all duration-200 ${
                      selectedSport === cat.id
                        ? "border-[1.5px]"
                        : "bg-[#222] border border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.04]"
                    }`}
                    style={{
                      ...(selectedSport === cat.id ? {
                        background: `linear-gradient(135deg, ${cat.color}20, ${cat.color}08)`,
                        borderColor: `${cat.color}50`,
                      } : {}),
                    }}
                  >
                    <span className="text-2xl">{cat.icon}</span>
                    <span className="text-[10px] font-bold text-white/70 group-hover:text-white whitespace-nowrap" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>{cat.label}</span>
                    {cat.liveCount > 0 && (
                      <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400">Live ({cat.liveCount})</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* ══════════════════════════════════════════
                D. POPULAR LIVE (Landscape Poster Cards)
                ══════════════════════════════════════════ */}
            {popularLiveMatches.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-bold text-white flex items-center gap-2" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>
                    <span className="text-base">🔥</span> Popular Live
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/15 text-red-400">Live ({popularLiveMatches.length})</span>
                  </h2>
                  <div className="flex items-center gap-1">
                    <button onClick={() => scrollContainer(popularRef, "left")} className="p-1 rounded-lg bg-white/[0.04] text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-all">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <button onClick={() => scrollContainer(popularRef, "right")} className="p-1 rounded-lg bg-white/[0.04] text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-all">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M9 5l7 7-7 7" /></svg>
                    </button>
                  </div>
                </div>
                <div ref={popularRef} className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
                  {popularLiveMatches.map(match => (
                    <MatchCard key={match.id} match={match} onWatch={handleWatchMatch} variant="poster" />
                  ))}
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════
                D.5. TV CHANNELS (Sky F1, Willow, 24/7, etc.)
                ══════════════════════════════════════════ */}
            {tvChannels.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-bold text-white flex items-center gap-2" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>
                    <span className="text-base">📺</span> Live TV Channels
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400">{tvChannels.length} channels</span>
                  </h2>
                </div>
                <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
                  {tvChannels.map(channel => (
                    <TVChannelCard key={channel.id} channel={channel} onWatch={handleWatchChannel} />
                  ))}
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════
                E. MATCHES BY SPORT SECTIONS (Vertical List)
                ══════════════════════════════════════════ */}
            {/* Live Now */}
            {liveMatches.length > 0 && (
              <MatchSection
                title="Live Now"
                icon="🔴"
                matches={liveMatches}
                onWatch={handleWatchMatch}
                liveCount={liveMatches.length}
              />
            )}

            {/* Starting Soon */}
            {startingSoon.length > 0 && (
              <MatchSection
                title="Starting Soon"
                icon="⏰"
                matches={startingSoon}
                onWatch={handleWatchMatch}
              />
            )}

            {/* Today */}
            {todayUpcoming.length > 0 && (
              <MatchSection
                title="Today"
                icon="📅"
                matches={todayUpcoming}
                onWatch={handleWatchMatch}
              />
            )}

            {/* Upcoming */}
            {laterMatches.length > 0 && (
              <MatchSection
                title="Upcoming"
                icon="📆"
                matches={laterMatches}
                onWatch={handleWatchMatch}
              />
            )}

            {/* Sport-specific sections */}
            {selectedSport === "all" && Object.entries(matchesBySport)
              .filter(([sport]) => sport !== "other")
              .sort(([,a], [,b]) => {
                const aLive = a.filter(m => m.isLive).length;
                const bLive = b.filter(m => m.isLive).length;
                return bLive - aLive;
              })
              .map(([sport, sportMatches]) => {
                const sportLive = sportMatches.filter(m => m.isLive).length;
                if (sportMatches.length <= liveMatches.length + startingSoon.length + todayUpcoming.length + laterMatches.length) {
                  // Skip if already covered above
                  return null;
                }
                return (
                  <MatchSection
                    key={sport}
                    title={`Popular ${getSportIcon(sport)} ${capitalize(sport)}`}
                    icon={getSportIcon(sport)}
                    matches={sportMatches.slice(0, 20)}
                    onWatch={handleWatchMatch}
                    liveCount={sportLive}
                  />
                );
              })
            }

            {/* No matches */}
            {filteredMatches.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="text-5xl">🏟️</div>
                <p className="text-sm text-white/40">No matches found</p>
                <p className="text-[10px] text-white/20">Try a different sport or check back later</p>
                <button onClick={() => { setSelectedSport("all"); setLiveOnly(false); }} className="px-4 py-2 rounded-full bg-white/[0.06] text-white/50 text-[11px] font-bold hover:bg-white/[0.08]">Show All</button>
              </div>
            )}

            {/* ══════════════════════════════════════════
                F. NEWS SECTION
                ══════════════════════════════════════════ */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-white flex items-center gap-2" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>
                  <span className="text-base">📰</span> Latest Sports News
                </h2>
              </div>

              {newsLoading && newsArticles.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <div className="w-10 h-10 rounded-full border-2 border-[#7c6cf0]/30 border-t-[#7c6cf0] animate-spin" />
                  <p className="text-sm text-white/30">Loading news...</p>
                </div>
              )}

              {newsArticles.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {newsArticles.map(article => (
                    <NewsCard key={article.id} article={article} />
                  ))}
                </div>
              )}

              {!newsLoading && newsArticles.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <div className="text-4xl">📰</div>
                  <p className="text-sm text-white/40">No news available</p>
                </div>
              )}

              {newsHasMore && newsArticles.length > 0 && (
                <div className="flex justify-center mt-6">
                  <button
                    onClick={() => fetchNews(newsOffset, true)}
                    disabled={newsLoading}
                    className="px-6 py-2.5 rounded-xl bg-white/[0.04] text-white/40 text-[11px] font-bold hover:bg-white/[0.06] hover:text-white/60 transition-all disabled:opacity-50"
                  >
                    {newsLoading ? "Loading..." : "Load More"}
                  </button>
                </div>
              )}
            </div>

            {/* Last updated */}
            {lastUpdated && (
              <div className="text-center">
                <span className="text-[9px] text-white/15">Last updated {lastUpdated.toLocaleTimeString()} • Auto-refreshes every 60s</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Click-outside handler for More dropdown */}
      {showMoreDropdown && (
        <div className="fixed inset-0 z-30" onClick={() => setShowMoreDropdown(false)} />
      )}

      {/* Marquee animation styles */}
      <style jsx global>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 60s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
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