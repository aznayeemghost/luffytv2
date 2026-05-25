"use client";

import { useState, useEffect, useRef } from "react";
import { useAppStore } from "./store";

// ============================================================
// LIVE WATCH PAGE — Separate page for watching live streams
// Shows: Full-width iframe player (NO sandbox), match info, logo,
// multiple server selection, and back navigation
// ============================================================

interface StreamInfo {
  id: string;
  streamNo: number;
  language: string;
  hd: boolean;
  embedUrl: string;
  source: string;
  viewers: number;
}

interface LiveWatchProps {
  matchId: string;
  matchTitle: string;
  matchSport: string;
  matchLeague: string;
  matchHomeTeam: string;
  matchAwayTeam: string;
  matchHomeScore: string;
  matchAwayScore: string;
  matchLogo: string;
  matchStatus: string;
  matchStreams: string; // JSON string of StreamInfo[]
}

// Sport icon map
const sportIcons: Record<string, string> = {
  Football: "⚽", Cricket: "🏏", Basketball: "🏀", Tennis: "🎾",
  "MMA/Boxing": "🥊", Baseball: "⚾", NFL: "🏈", Hockey: "🏒",
  Motorsport: "🏎️", Rugby: "🏉", Golf: "⛳", Other: "📺",
};

const sportColors: Record<string, string> = {
  Football: "#22c55e", Cricket: "#f59e0b", Basketball: "#ef4444", Tennis: "#a855f7",
  "MMA/Boxing": "#f97316", Baseball: "#3b82f6", NFL: "#dc2626", Hockey: "#06b6d4",
  Motorsport: "#eab308", Rugby: "#10b981", Golf: "#84cc16", Other: "#6b7280",
};

export default function LiveWatchPage(props: LiveWatchProps) {
  const navigate = useAppStore(s => s.navigate);
  const [streams, setStreams] = useState<StreamInfo[]>([]);
  const [activeStream, setActiveStream] = useState<StreamInfo | null>(null);
  const [resolvedUrl, setResolvedUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [iframeKey, setIframeKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Parse streams from JSON
  useEffect(() => {
    try {
      if (props.matchStreams) {
        const parsed = JSON.parse(props.matchStreams);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setStreams(parsed);
          setActiveStream(parsed[0]);
        }
      }
    } catch {
      // If no streams provided, try to fetch from API
    }
  }, [props.matchStreams]);

  // Resolve embed URL
  useEffect(() => {
    if (!activeStream) return;

    const resolveUrl = async () => {
      setLoading(true);
      setError("");

      // If the embedUrl looks like a direct embed URL, use it
      if (activeStream.embedUrl && !activeStream.embedUrl.includes("embedsports.top/fetch")) {
        // For embedsports.top /embed/admin/ URLs, try to resolve via our API
        if (activeStream.embedUrl.includes("embedsports.top/embed/admin")) {
          try {
            const res = await fetch(
              `/api/live/embed?embedUrl=${encodeURIComponent(activeStream.embedUrl)}&id=${encodeURIComponent(props.matchId)}&streamNo=${activeStream.streamNo}&source=${activeStream.source}`
            );
            if (res.ok) {
              const data = await res.json();
              if (data.embedUrl) {
                setResolvedUrl(data.embedUrl);
                setLoading(false);
                return;
              }
            }
          } catch {
            // Fall through to direct URL
          }
        }

        setResolvedUrl(activeStream.embedUrl);
        setLoading(false);
      } else {
        // Try to resolve via our API
        try {
          const res = await fetch(
            `/api/live/embed?id=${encodeURIComponent(props.matchId)}&streamNo=${activeStream.streamNo}&source=${activeStream.source}`
          );
          if (res.ok) {
            const data = await res.json();
            if (data.embedUrl) {
              setResolvedUrl(data.embedUrl);
              setLoading(false);
              return;
            }
          }
        } catch {
          // Fall through
        }

        // Last resort: construct a fallback URL
        const fallbackUrl = `https://embedstreams.me/${props.matchId}`;
        setResolvedUrl(fallbackUrl);
        setLoading(false);
      }
    };

    resolveUrl();
  }, [activeStream, props.matchId]);

  const switchStream = (stream: StreamInfo) => {
    setActiveStream(stream);
    setIframeKey(prev => prev + 1); // Force iframe reload
  };

  const sportIcon = sportIcons[props.matchSport] || "📺";
  const sportColor = sportColors[props.matchSport] || "#6b7280";

  const isTeamMatch = props.matchHomeTeam || props.matchAwayTeam;

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Back button bar ── */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigate({ page: "live" } as any)}
          className="flex items-center gap-2 text-white/50 hover:text-white transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 19l-7-7 7-7" />
          </svg>
          <span
            className="text-[12px] font-bold uppercase tracking-wider"
            style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
          >
            Back to Live
          </span>
        </button>

        <div className="flex items-center gap-2">
          {props.matchStatus === "Live" && (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 text-[10px] font-bold uppercase tracking-wider">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
              Live
            </span>
          )}
        </div>
      </div>

      {/* ── Main content area ── */}
      <div className="flex flex-col lg:flex-row gap-6 flex-1">
        {/* ── Left: Player ── */}
        <div className="flex-1 min-w-0">
          {/* Player container — 16:9 aspect ratio */}
          <div className="relative w-full rounded-2xl overflow-hidden bg-black/80 border border-white/[0.06]" style={{ aspectRatio: "16/9" }}>
            {loading ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                <div className="w-10 h-10 rounded-full border-2 border-[#7c6cf0]/30 border-t-[#7c6cf0] animate-spin" />
                <p className="text-sm text-white/30">Loading stream...</p>
              </div>
            ) : resolvedUrl ? (
              <iframe
                key={iframeKey}
                ref={iframeRef}
                src={resolvedUrl}
                className="absolute inset-0 w-full h-full"
                allowFullScreen
                allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                referrerPolicy="no-referrer"
                style={{ border: "none" }}
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                </div>
                <p className="text-sm text-white/40">Stream unavailable</p>
                <p className="text-[10px] text-white/20">Try a different server</p>
              </div>
            )}
          </div>

          {/* ── Server selection bar ── */}
          {streams.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span
                className="text-[10px] font-bold text-white/25 uppercase tracking-wider mr-1"
                style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
              >
                Server:
              </span>
              {streams.map((stream) => (
                <button
                  key={`${stream.id}-${stream.streamNo}`}
                  onClick={() => switchStream(stream)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all ${
                    activeStream?.id === stream.id && activeStream?.streamNo === stream.streamNo
                      ? "bg-[#7c6cf0] text-white shadow-[0_0_12px_rgba(124,108,240,0.3)]"
                      : "bg-white/[0.04] text-white/40 hover:text-white/60 hover:bg-white/[0.06] border border-white/[0.06]"
                  }`}
                  style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
                >
                  Server {stream.streamNo}
                  {stream.hd && (
                    <span className="text-[8px] px-1 py-0.5 rounded bg-amber-500/20 text-amber-400">HD</span>
                  )}
                </button>
              ))}

              {/* Try embedsports.top direct embed */}
              <button
                onClick={async () => {
                  setLoading(true);
                  try {
                    const res = await fetch(`/api/live/embed?id=${encodeURIComponent(props.matchId)}&streamNo=1`);
                    if (res.ok) {
                      const data = await res.json();
                      if (data.embedUrl) {
                        setResolvedUrl(data.embedUrl);
                        setIframeKey(prev => prev + 1);
                      }
                    }
                  } catch {}
                  setLoading(false);
                }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-bold bg-white/[0.04] text-white/30 hover:text-white/50 hover:bg-white/[0.06] border border-white/[0.06] transition-all"
                style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
              >
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M21 2v6h-6M3 12a9 9 0 0115.36-6.36L21 8M3 22v-6h6M21 12a9 9 0 01-15.36 6.36L3 16" />
                </svg>
                Reload
              </button>
            </div>
          )}

          {/* Error banner */}
          {error && (
            <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* ── Right: Match info sidebar ── */}
        <div className="lg:w-80 xl:w-96 flex-shrink-0">
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden">
            {/* Sport color accent */}
            <div className="h-[3px] w-full" style={{ background: `linear-gradient(90deg, ${sportColor}, transparent)` }} />

            <div className="p-5">
              {/* Sport badge */}
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xl">{sportIcon}</span>
                <span
                  className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                  style={{ background: `${sportColor}15`, color: sportColor }}
                >
                  {props.matchSport || "Sports"}
                </span>
                {props.matchStatus === "Live" && (
                  <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 text-[10px] font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    LIVE
                  </span>
                )}
              </div>

              {/* Logo */}
              {props.matchLogo && (
                <div className="flex justify-center mb-4">
                  <img
                    src={props.matchLogo}
                    alt=""
                    className="w-20 h-20 rounded-2xl object-cover bg-white/5"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                </div>
              )}

              {/* Title */}
              <h2
                className="text-lg font-bold text-white mb-2 text-center leading-snug"
                style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
              >
                {props.matchTitle || "Live Match"}
              </h2>

              {/* League */}
              {props.matchLeague && (
                <p className="text-[11px] text-white/30 text-center mb-4">{props.matchLeague}</p>
              )}

              {/* Teams & Scores */}
              {isTeamMatch && (
                <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-4 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-white/80 font-medium">{props.matchHomeTeam || "Home"}</span>
                    <span className="text-lg font-bold text-white">{props.matchHomeScore || "-"}</span>
                  </div>
                  <div className="h-px bg-white/[0.06] my-2" />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/80 font-medium">{props.matchAwayTeam || "Away"}</span>
                    <span className="text-lg font-bold text-white">{props.matchAwayScore || "-"}</span>
                  </div>
                </div>
              )}

              {/* Match details */}
              <div className="space-y-2">
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-[11px] text-white/25">Sport</span>
                  <span className="text-[11px] text-white/60 font-medium">{props.matchSport || "Unknown"}</span>
                </div>
                {props.matchLeague && (
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-[11px] text-white/25">Competition</span>
                    <span className="text-[11px] text-white/60 font-medium">{props.matchLeague}</span>
                  </div>
                )}
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-[11px] text-white/25">Status</span>
                  <span className="text-[11px] text-white/60 font-medium">{props.matchStatus || "Unknown"}</span>
                </div>
                {streams.length > 0 && (
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-[11px] text-white/25">Servers</span>
                    <span className="text-[11px] text-white/60 font-medium">{streams.length} available</span>
                  </div>
                )}
                {activeStream && (
                  <>
                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-[11px] text-white/25">Quality</span>
                      <span className="text-[11px] text-white/60 font-medium">{activeStream.hd ? "HD" : "SD"}</span>
                    </div>
                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-[11px] text-white/25">Language</span>
                      <span className="text-[11px] text-white/60 font-medium">{activeStream.language || "English"}</span>
                    </div>
                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-[11px] text-white/25">Source</span>
                      <span className="text-[11px] text-white/60 font-medium">{activeStream.source}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Stream info note */}
              <div className="mt-5 pt-4 border-t border-white/[0.04]">
                <p className="text-[10px] text-white/15 text-center leading-relaxed">
                  If the stream doesn&apos;t load, try switching to a different server.
                  Streams are provided by third-party sources and may occasionally be unavailable.
                </p>
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => navigate({ page: "live" } as any)}
              className="flex-1 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-[11px] font-bold text-white/40 hover:text-white/60 hover:bg-white/[0.06] transition-all"
              style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
            >
              Browse More
            </button>
            <button
              onClick={() => navigate({ page: "watchnow" })}
              className="flex-1 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-[11px] font-bold text-white/40 hover:text-white/60 hover:bg-white/[0.06] transition-all"
              style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
            >
              Watch Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
