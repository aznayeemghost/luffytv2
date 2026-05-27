"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAppStore } from "./store";

// ─── Types ───
interface StreamInfo {
  url: string;
  type: "embed";
  quality: string;
  language: string;
  source: string;
  hd?: boolean;
  streamNo?: number;
  embedUrl?: string;
  provider?: string;
}

interface LiveWatchProps {
  matchId: string;
  source: string;
  sourceId?: string;
}

// ─── Live Pulse Dot ───
function LivePulse() {
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
    </span>
  );
}

export default function LiveWatchPage({ matchId, source, sourceId }: LiveWatchProps) {
  const navigate = useAppStore((s) => s.navigate);

  const [streams, setStreams] = useState<StreamInfo[]>([]);
  const [activeStreamIdx, setActiveStreamIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [matchTitle, setMatchTitle] = useState("");
  const [matchData, setMatchData] = useState<any>(null);
  const [iframeKey, setIframeKey] = useState(0); // Force iframe reload on server switch

  // ── Fetch match details AND find ALL related matches across providers ──
  // ROOT CAUSE FIX: When a match comes from WatchFooty (id: wf_123),
  // we need to ALSO find the StreamedPK version of the same match
  // (id: streamed_456) and merge their sources together.
  // Without this, only WatchFooty sources (DamiTV, EmbedSports) show up.
  useEffect(() => {
    let cancelled = false;
    async function loadMatch() {
      try {
        const res = await fetch("/api/live/matches");
        if (!res.ok) return;
        const data = await res.json();
        const allItems = [...(data.matches || []), ...(data.channels || [])];

        // Find the clicked match
        const item = allItems.find((m: any) => m.id === matchId);
        if (!item) return;

        // ── THE KEY FIX: Find ALL matches for the same game across providers ──
        // We use team names to match - "Man City vs Arsenal" from WatchFooty
        // should also find "Manchester City vs Arsenal" from StreamedPK
        const mergedSources = [...(item.sources || [])];

        if (item.homeTeam && item.awayTeam) {
          const clickedHome = item.homeTeam.toLowerCase().replace(/[^a-z0-9]/g, "");
          const clickedAway = item.awayTeam.toLowerCase().replace(/[^a-z0-9]/g, "");

          for (const other of allItems) {
            if (other.id === matchId) continue; // skip self
            if (!other.homeTeam || !other.awayTeam) continue;
            if (other.type === "channel") continue; // channels are different

            const otherHome = other.homeTeam.toLowerCase().replace(/[^a-z0-9]/g, "");
            const otherAway = other.awayTeam.toLowerCase().replace(/[^a-z0-9]/g, "");

            // Check if this is the same game: same two teams (order may differ)
            const sameGame =
              (clickedHome === otherHome && clickedAway === otherAway) ||
              (clickedHome === otherAway && clickedAway === otherHome) ||
              // Partial match: one team name contains the other
              (clickedHome.includes(otherHome) || otherHome.includes(clickedHome)) &&
              (clickedAway.includes(otherAway) || otherAway.includes(clickedAway));

            if (sameGame) {
              // Merge sources from this related match!
              const existingSourceKeys = new Set(mergedSources.map((s: any) => s.source));
              for (const src of other.sources || []) {
                if (!existingSourceKeys.has(src.source)) {
                  mergedSources.push(src);
                  existingSourceKeys.add(src.source);
                }
              }
              // Also take richer data if available
              if (other.poster && !item.poster) item.poster = other.poster;
              if (other.homeLogo && !item.homeLogo) item.homeLogo = other.homeLogo;
              if (other.awayLogo && !item.awayLogo) item.awayLogo = other.awayLogo;
              if (other.league && !item.league) item.league = other.league;
            }
          }
        }

        // Also check _relatedIds from the API merge
        if (item._relatedIds && item._relatedIds.length > 0) {
          for (const rid of item._relatedIds) {
            const related = allItems.find((m: any) => m.id === rid);
            if (related && related.id !== matchId) {
              const existingSourceKeys = new Set(mergedSources.map((s: any) => s.source));
              for (const src of related.sources || []) {
                if (!existingSourceKeys.has(src.source)) {
                  mergedSources.push(src);
                  existingSourceKeys.add(src.source);
                }
              }
            }
          }
        }

        if (!cancelled) {
          setMatchTitle(item.title || "Live Stream");
          setMatchData({ ...item, sources: mergedSources });
        }
      } catch (e) {
        console.error("[live-watch] loadMatch error:", e);
      }
    }
    loadMatch();
    return () => { cancelled = true; };
  }, [matchId]);

  // ── Fetch streams from ALL sources in the match ──
  // Now that matchData.sources includes StreamedPK sources (admin, delta, echo etc.),
  // we fetch from EACH source independently.
  const fetchAllStreams = useCallback(async () => {
    if (!matchData?.sources || matchData.sources.length === 0) return;

    setLoading(true);
    setError(null);

    const allStreams: StreamInfo[] = [];
    const errors: string[] = [];

    console.log("[live-watch] Fetching streams from", matchData.sources.length, "sources:", matchData.sources.map((s: any) => s.source));

    // Process each source in parallel
    const promises = matchData.sources.map(async (src: any) => {
      try {
        // ── ANY source with direct embed URLs (WatchFooty, DamiTV, etc.) ──
        if (src.embeds && src.embeds.length > 0) {
          for (const emb of src.embeds) {
            allStreams.push({
              url: emb.url,
              type: "embed",
              quality: emb.quality || "720p",
              language: emb.language || "English",
              source: emb.source
                ? (emb.source.charAt(0).toUpperCase() + emb.source.slice(1))
                : src.source === "dami-tv" ? "DamiTV" : src.source,
              hd: emb.quality === "HD" || emb.quality === "720p",
              embedUrl: emb.url,
              provider: src.source,
            });
          }
          return;
        }

        // ── StreamedPK sources (admin, alpha, bravo, charlie, delta, echo, foxtrot, golf, hotel, intel) ──
        if (src.source.startsWith("streamed-")) {
          const apiSource = src.source.replace("streamed-", "");
          console.log("[live-watch] Fetching StreamedPK source:", apiSource, "id:", src.sourceId);
          // Use our server-side proxy to avoid CORS issues
          const res = await fetch(
            `/api/live/streamed?source=${encodeURIComponent(apiSource)}&id=${encodeURIComponent(src.sourceId)}`,
            { signal: AbortSignal.timeout(10000) }
          );
          if (!res.ok) {
            console.warn("[live-watch] StreamedPK proxy returned", res.status, "for", apiSource);
            return;
          }
          const data = await res.json();
          if (data.success && data.streams && data.streams.length > 0) {
            console.log("[live-watch] Got", data.streams.length, "streams from", apiSource);
            allStreams.push(...data.streams);
          } else {
            console.warn("[live-watch] No streams from", apiSource, data);
          }
          return;
        }

        // ── Other sources: use the stream API ──
        const params = new URLSearchParams({
          matchId: matchId,
          source: src.source,
          sourceId: src.sourceId || "",
        });
        const res = await fetch(`/api/live/stream?${params.toString()}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.success && data.streams) {
          allStreams.push(...data.streams);
        }
      } catch (e: any) {
        console.error("[live-watch] Source fetch error:", src.source, e.message);
        errors.push(`${src.source}: ${e.message || "failed"}`);
      }
    });

    await Promise.allSettled(promises);

    console.log("[live-watch] Total streams fetched:", allStreams.length);

    // Deduplicate by embedUrl
    const seen = new Set<string>();
    const deduped = allStreams.filter((s) => {
      const key = s.embedUrl || s.url;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Sort: StreamedPK sources first (Admin, Alpha, etc.), then others
    deduped.sort((a, b) => {
      const aStreamed = a.provider === "streamed" ? 0 : 1;
      const bStreamed = b.provider === "streamed" ? 0 : 1;
      return aStreamed - bStreamed;
    });

    setStreams(deduped);
    setLoading(false);

    if (deduped.length === 0) {
      setError("No streams available. The match may not have started yet or all servers are down.");
    }
  }, [matchData, matchId]);

  // Fetch streams when matchData is available
  useEffect(() => {
    if (matchData) {
      fetchAllStreams();
    }
  }, [matchData, fetchAllStreams]);

  // Switch stream (iframe reload)
  const switchStream = (idx: number) => {
    if (idx < streams.length && streams[idx]) {
      setActiveStreamIdx(idx);
      setIframeKey(prev => prev + 1); // Force iframe to reload
    }
  };

  const activeStream = streams[activeStreamIdx];
  const isTVChannel = matchData?.type === "channel";

  // Build the embed proxy URL for the iframe
  const getIframeSrc = (stream: StreamInfo | undefined) => {
    if (!stream) return "";
    const embedUrl = stream.embedUrl || stream.url;
    if (!embedUrl) return "";
    return `/api/embed/proxy?url=${encodeURIComponent(embedUrl)}`;
  };

  return (
    <div className="fade-in space-y-4">
      {/* Back button */}
      <button
        onClick={() => navigate({ page: "live" })}
        className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors group"
      >
        <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path d="M15 19l-7-7 7-7" />
        </svg>
        <span className="text-sm font-medium">Back to Live TV</span>
      </button>

      {/* Main grid: Player + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4">
        {/* Player Section */}
        <div className="space-y-3">
          {/* Iframe Player Container */}
          <div
            id="live-player-container"
            className="relative bg-black rounded-2xl overflow-hidden aspect-video border border-white/[0.05] shadow-[0_0_60px_rgba(0,0,0,0.5)]"
          >
            {/* Live badge overlay */}
            <div className="absolute top-3 left-3 z-30 flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-red-500/90 backdrop-blur-sm px-3 py-1 rounded-lg shadow-lg shadow-red-500/30">
                <LivePulse />
                <span className="text-[11px] font-bold text-white tracking-wider">LIVE</span>
              </div>
              {activeStream && (
                <div className="bg-black/60 backdrop-blur-sm px-3 py-1 rounded-lg">
                  <span className="text-[10px] font-bold text-zinc-300">{activeStream.source}</span>
                </div>
              )}
              {isTVChannel && (
                <div className="bg-cyan-500/80 backdrop-blur-sm px-3 py-1 rounded-lg">
                  <span className="text-[10px] font-bold text-white">TV CHANNEL</span>
                </div>
              )}
            </div>

            {/* Iframe for ALL streams — these are all JS-based embed players */}
            {activeStream && (
              <iframe
                key={iframeKey}
                src={getIframeSrc(activeStream)}
                className="w-full h-full border-0"
                allowFullScreen
                allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                referrerPolicy="no-referrer"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation"
              />
            )}

            {/* Loading overlay */}
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-20">
                <div className="text-center space-y-4">
                  <div className="relative w-16 h-16 mx-auto">
                    <div className="absolute inset-0 rounded-full border-2 border-red-500/20" />
                    <div className="absolute inset-0 rounded-full border-2 border-t-red-500 animate-spin" />
                    <div className="absolute inset-3 rounded-full border border-white/5 border-t-red-400/40 animate-spin" style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
                  </div>
                  <p className="text-red-300/60 text-xs font-medium">Loading live stream...</p>
                </div>
              </div>
            )}

            {/* No-stream fallback: Show full match stats when no stream available */}
            {error && !loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-[#0b1116] via-[#0f1923] to-[#0b1116] z-20 overflow-auto">
                <div className="w-full max-w-lg px-6 py-8 space-y-6">
                  {/* Warning header */}
                  <div className="text-center space-y-2">
                    <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto">
                      <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h3 className="text-white font-bold text-base">No Stream Available</h3>
                    <p className="text-zinc-500 text-xs">This match may not have started yet or streams are currently down</p>
                  </div>

                  {/* Full Match Stats Card */}
                  {matchData && (
                    <div className="bg-white/[0.03] rounded-xl border border-white/[0.06] overflow-hidden">
                      {/* Teams header */}
                      {matchData.homeTeam && matchData.awayTeam && (
                        <div className="p-4 border-b border-white/[0.04]">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              {matchData.homeLogo ? (
                                <img src={matchData.homeLogo} alt="" className="w-10 h-10 object-contain rounded-lg bg-white/[0.03] p-0.5 shrink-0" />
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center text-sm font-bold text-red-400 shrink-0">
                                  {matchData.homeTeam.slice(0, 2).toUpperCase()}
                                </div>
                              )}
                              <span className="text-sm font-semibold text-white truncate">{matchData.homeTeam}</span>
                            </div>
                            <span className="text-[9px] font-bold text-zinc-600 bg-white/[0.04] px-2 py-1 rounded shrink-0">VS</span>
                            <div className="flex items-center gap-3 flex-1 min-w-0 justify-end">
                              <span className="text-sm font-semibold text-white truncate text-right">{matchData.awayTeam}</span>
                              {matchData.awayLogo ? (
                                <img src={matchData.awayLogo} alt="" className="w-10 h-10 object-contain rounded-lg bg-white/[0.03] p-0.5 shrink-0" />
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center text-sm font-bold text-cyan-400 shrink-0">
                                  {matchData.awayTeam.slice(0, 2).toUpperCase()}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Channel image for TV channels */}
                      {isTVChannel && matchData.channelImage && (
                        <div className="flex justify-center p-4 border-b border-white/[0.04]">
                          <img src={matchData.channelImage} alt={matchData.title} className="h-16 object-contain" />
                        </div>
                      )}

                      {/* Stats grid */}
                      <div className="p-4 grid grid-cols-2 gap-3">
                        {matchData.league && (
                          <div className="bg-white/[0.02] rounded-lg p-2.5 border border-white/[0.03]">
                            <span className="text-[9px] text-zinc-600 uppercase font-bold block mb-0.5">League</span>
                            <span className="text-xs text-zinc-300 font-medium">{matchData.league}</span>
                          </div>
                        )}
                        {matchData.sport && (
                          <div className="bg-white/[0.02] rounded-lg p-2.5 border border-white/[0.03]">
                            <span className="text-[9px] text-zinc-600 uppercase font-bold block mb-0.5">Sport</span>
                            <span className="text-xs text-zinc-300 font-medium">{matchData.sport}</span>
                          </div>
                        )}
                        <div className="bg-white/[0.02] rounded-lg p-2.5 border border-white/[0.03]">
                          <span className="text-[9px] text-zinc-600 uppercase font-bold block mb-0.5">Status</span>
                          <div className="flex items-center gap-1.5">
                            {matchData.status === "live" && <LivePulse />}
                            <span className={`text-xs font-medium ${
                              matchData.status === "live" ? "text-red-400" :
                              matchData.status === "upcoming" ? "text-amber-400" : "text-zinc-400"
                            }`}>
                              {matchData.status?.toUpperCase()}
                            </span>
                          </div>
                        </div>
                        {matchData.viewers ? (
                          <div className="bg-white/[0.02] rounded-lg p-2.5 border border-white/[0.03]">
                            <span className="text-[9px] text-zinc-600 uppercase font-bold block mb-0.5">Viewers</span>
                            <span className="text-xs text-zinc-300 font-medium flex items-center gap-1">
                              <svg className="w-3 h-3 opacity-50" fill="currentColor" viewBox="0 0 20 20"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>
                              {matchData.viewers > 1000 ? `${(matchData.viewers/1000).toFixed(1)}k` : matchData.viewers}
                            </span>
                          </div>
                        ) : (
                          <div className="bg-white/[0.02] rounded-lg p-2.5 border border-white/[0.03]">
                            <span className="text-[9px] text-zinc-600 uppercase font-bold block mb-0.5">Sources</span>
                            <span className="text-xs text-zinc-300 font-medium">{matchData.sources?.length || 0} available</span>
                          </div>
                        )}
                        {matchData.date && (
                          <div className="bg-white/[0.02] rounded-lg p-2.5 border border-white/[0.03] col-span-2">
                            <span className="text-[9px] text-zinc-600 uppercase font-bold block mb-0.5">Time</span>
                            <span className="text-xs text-zinc-300 font-medium">
                              {new Date(matchData.date).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex items-center justify-center gap-2 flex-wrap">
                    <button
                      onClick={() => {
                        setError(null);
                        fetchAllStreams();
                      }}
                      className="pill-btn pill-btn-primary text-xs py-2 px-4"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Retry
                    </button>
                    <button
                      onClick={() => navigate({ page: "live" })}
                      className="pill-btn pill-btn-ghost text-xs py-2 px-4"
                    >
                      Back to Live
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Player Info Bar */}
          <div className="bg-[#131c26] rounded-2xl p-5 border border-white/[0.05] space-y-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <LivePulse />
                  <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">
                    {isTVChannel ? "TV Channel" : "Live Stream"}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-white truncate">
                  {matchTitle || matchData?.title || "Loading..."}
                </h2>
                {matchData?.league && (
                  <p className="text-xs text-zinc-500 mt-0.5">{matchData.league}</p>
                )}
              </div>
              {activeStream && (
                <div className="shrink-0 flex items-center gap-2">
                  <span className="text-[10px] font-bold text-zinc-500 bg-white/[0.04] px-2.5 py-1 rounded-lg">
                    {activeStream.quality}
                  </span>
                  <span className="text-[10px] font-bold text-zinc-500 bg-white/[0.04] px-2.5 py-1 rounded-lg">
                    {activeStream.language}
                  </span>
                  {activeStream.hd && (
                    <span className="text-[10px] font-bold text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-lg border border-cyan-500/15">
                      HD
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Server selection */}
            {streams.length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                  Servers ({streams.length})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {streams.map((stream, idx) => (
                    <button
                      key={idx}
                      onClick={() => switchStream(idx)}
                      className={`server-pill text-[11px] py-1.5 px-3 ${
                        activeStreamIdx === idx ? "active" : ""
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        stream.provider === "streamed" ? "bg-emerald-400" : "bg-purple-400"
                      }`} />
                      {stream.source}
                      {stream.quality && ` (${stream.quality})`}
                      {stream.hd && (
                        <span className="text-cyan-400 ml-0.5">HD</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar: Match Info */}
        <div className="space-y-3">
          {/* Match Details Card */}
          <div className="bg-[#131c26] rounded-2xl border border-white/[0.05] overflow-hidden">
            <div className="p-4 border-b border-white/[0.05]">
              <h3 className="text-sm font-bold text-white">Details</h3>
            </div>

            {matchData ? (
              <div className="p-4 space-y-4">
                {/* Teams display */}
                {matchData.homeTeam && matchData.awayTeam && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      {matchData.homeLogo ? (
                        <img src={matchData.homeLogo} alt="" className="w-10 h-10 object-contain rounded-lg bg-white/[0.03] p-0.5" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center text-sm font-bold text-red-400">
                          {matchData.homeTeam.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <span className="text-sm font-semibold text-white truncate">{matchData.homeTeam}</span>
                    </div>

                    <div className="flex items-center justify-center">
                      <span className="text-[10px] font-bold text-zinc-500 bg-white/[0.04] px-3 py-1 rounded-full">VS</span>
                    </div>

                    <div className="flex items-center gap-3">
                      {matchData.awayLogo ? (
                        <img src={matchData.awayLogo} alt="" className="w-10 h-10 object-contain rounded-lg bg-white/[0.03] p-0.5" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center text-sm font-bold text-cyan-400">
                          {matchData.awayTeam.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <span className="text-sm font-semibold text-white truncate">{matchData.awayTeam}</span>
                    </div>
                  </div>
                )}

                {/* Channel image for TV channels */}
                {isTVChannel && matchData.channelImage && (
                  <div className="flex justify-center py-2">
                    <img src={matchData.channelImage} alt={matchData.title} className="h-16 object-contain" />
                  </div>
                )}

                {/* Match meta */}
                <div className="space-y-2.5 pt-2 border-t border-white/[0.04]">
                  {matchData.league && (
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-zinc-500">League</span>
                      <span className="text-xs text-zinc-300 font-medium">{matchData.league}</span>
                    </div>
                  )}
                  {matchData.sport && (
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-zinc-500">Sport</span>
                      <span className="text-xs text-zinc-300 font-medium">{matchData.sport}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-zinc-500">Status</span>
                    <div className="flex items-center gap-1.5">
                      {matchData.status === "live" && <LivePulse />}
                      <span className={`text-xs font-medium ${
                        matchData.status === "live" ? "text-red-400" :
                        matchData.status === "upcoming" ? "text-amber-400" : "text-zinc-400"
                      }`}>
                        {matchData.status?.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  {matchData.viewers ? (
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-zinc-500">Viewers</span>
                      <span className="text-xs text-zinc-300 font-medium">
                        {matchData.viewers > 1000 ? `${(matchData.viewers/1000).toFixed(1)}k` : matchData.viewers}
                      </span>
                    </div>
                  ) : null}
                  {activeStream && (
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-zinc-500">Player</span>
                      <span className="text-xs font-medium text-purple-400">
                        Embed Player
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                <div className="h-4 skeleton rounded w-3/4" />
                <div className="h-4 skeleton rounded w-1/2" />
                <div className="h-4 skeleton rounded w-2/3" />
              </div>
            )}
          </div>

          {/* Stream Sources Card */}
          <div className="bg-[#131c26] rounded-2xl border border-white/[0.05] overflow-hidden">
            <div className="p-4 border-b border-white/[0.05]">
              <h3 className="text-sm font-bold text-white">Stream Sources</h3>
            </div>
            <div className="p-3 space-y-1">
              {streams.map((stream, idx) => (
                <button
                  key={idx}
                  onClick={() => switchStream(idx)}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all text-left ${
                    activeStreamIdx === idx
                      ? "bg-red-500/10 border border-red-500/15"
                      : "hover:bg-white/[0.02] border border-transparent"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${
                    stream.provider === "streamed" ? "bg-emerald-400" : "bg-purple-400"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-zinc-300 truncate">{stream.source}</p>
                    <p className="text-[10px] text-zinc-500">
                      {stream.quality} &middot; {stream.language}
                      {stream.hd ? " &middot; HD" : ""}
                    </p>
                  </div>
                  {activeStreamIdx === idx && (
                    <svg className="w-3.5 h-3.5 text-red-400 shrink-0 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                  )}
                </button>
              ))}
              {streams.length === 0 && !loading && (
                <p className="text-xs text-zinc-500 text-center py-4">No streams found</p>
              )}
            </div>
          </div>

          {/* Quick actions */}
          <div className="bg-[#131c26] rounded-2xl border border-white/[0.05] p-4">
            <div className="flex flex-col gap-2">
              <button
                onClick={() => navigate({ page: "live" })}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] text-xs text-zinc-400 hover:text-white transition-all"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0v-6" />
                </svg>
                Browse All Live
              </button>
              <button
                onClick={() => {
                  if (streams.length > 0) {
                    const next = (activeStreamIdx + 1) % streams.length;
                    switchStream(next);
                  }
                }}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] text-xs text-zinc-400 hover:text-white transition-all"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Switch Server
              </button>
              <button
                onClick={() => {
                  // Open embed in new tab as fallback
                  if (activeStream) {
                    const embedUrl = activeStream.embedUrl || activeStream.url;
                    if (embedUrl) window.open(embedUrl, "_blank");
                  }
                }}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] text-xs text-zinc-400 hover:text-white transition-all"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Open in New Tab
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
