"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useAppStore } from "./store";

// ============================================================
// LIVE TV WATCH PAGE — Multi-Source with ElGato-style Server Picker
// Sources: Daddylive | DamiTV | StreamFree
// Each source can have multiple servers/qualities
// Auto-fallback on iframe errors
// ============================================================

interface LiveTVWatchProps {
  channelId: string;
  channelName: string;
  channelCategory: string;
  channelCountryCode?: string;
  channelCountryName?: string;
  channelEmbedUrl: string;
}

interface ServerOption {
  id: string;
  label: string;
  source: "daddylive" | "damitv" | "streamfree";
  embedUrl: string;
  quality?: string;
  serverNum?: number;
  color: string;
}

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

// Source config
const SOURCE_CONFIG: Record<string, { color: string; label: string; shortLabel: string }> = {
  daddylive: { color: "#3b82f6", label: "DaddyLive", shortLabel: "DADDY" },
  damitv: { color: "#22c55e", label: "DamiTV", shortLabel: "DAMI" },
  streamfree: { color: "#a855f7", label: "StreamFree", shortLabel: "SF" },
};

export default function LiveTVWatchPage(props: LiveTVWatchProps) {
  const navigate = useAppStore(s => s.navigate);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [userSelection, setUserSelection] = useState<{ channelId: string; serverId: string } | null>(null);
  const [sfQualities, setSfQualities] = useState<Record<string, boolean>>({});
  const [failedServerIds, setFailedServerIds] = useState<string[]>([]);
  const [fallbackMessage, setFallbackMessage] = useState("");

  const categoryColor = CAT_COLORS[props.channelCategory] || CAT_COLORS.General;

  // Build all available server options for this channel (computed, not in effect)
  const servers = useMemo<ServerOption[]>(() => {
    const channelId = props.channelId || "";
    const embedUrl = props.channelEmbedUrl || "";
    const availableServers: ServerOption[] = [];

    const isDami = embedUrl.includes("dami-tv.pro");
    const isSF = embedUrl.includes("streamfree.app");
    const isDaddy = embedUrl.includes("daddylive.org");

    const sfMatch = embedUrl.match(/\/embed\/([^/]+)\/([^?]+)/);
    const sfCategory = sfMatch?.[1] || "";
    const sfStreamKey = sfMatch?.[2] || channelId.replace("sf-", "");

    const damiMatch = embedUrl.match(/[?&]id=([^&]+)/) || embedUrl.match(/\/embed\/\?id=([^&]+)/);
    const damiId = damiMatch?.[1] || channelId.replace("dami-", "");

    const dlMatch = embedUrl.match(/[?&]id=([^&]+)/);
    const dlId = dlMatch?.[1] || channelId.replace("dl-", "");

    if (isSF || !isDami) {
      const sfCat = sfCategory || "sports";
      const sfKey = sfStreamKey;
      if (sfKey) {
        availableServers.push({
          id: `sf-1080p`,
          label: "StreamFree 1080p",
          source: "streamfree",
          embedUrl: `https://streamfree.app/embed/${sfCat}/${sfKey}?quality=1080p&category=${sfCat}&server=auto`,
          quality: "1080p",
          color: "#a855f7",
        });
        availableServers.push({
          id: `sf-720p`,
          label: "StreamFree 720p",
          source: "streamfree",
          embedUrl: `https://streamfree.app/embed/${sfCat}/${sfKey}?quality=720p&category=${sfCat}&server=auto`,
          quality: "720p",
          color: "#a855f7",
        });
        availableServers.push({
          id: `sf-540p`,
          label: "StreamFree 540p",
          source: "streamfree",
          embedUrl: `https://streamfree.app/embed/${sfCat}/${sfKey}?quality=540p&category=${sfCat}&server=auto`,
          quality: "540p",
          color: "#a855f7",
        });
      }
    }

    if (isDami || !isSF) {
      if (damiId) {
        availableServers.push({
          id: `dami-${damiId}`,
          label: "DamiTV",
          source: "damitv",
          embedUrl: `https://dami-tv.pro/embed/?id=${encodeURIComponent(damiId)}`,
          quality: "Auto",
          color: "#22c55e",
        });
      }
    }

    if (isDaddy || (!isDami && !isSF)) {
      if (dlId) {
        availableServers.push({
          id: `dl-${dlId}-p1`,
          label: "DaddyLive Server 1",
          source: "daddylive",
          embedUrl: `https://daddylive.org/embed/embed.php?id=${dlId}&player=1&source=tv.json`,
          serverNum: 1,
          quality: "HD",
          color: "#3b82f6",
        });
        availableServers.push({
          id: `dl-${dlId}-p2`,
          label: "DaddyLive Server 2",
          source: "daddylive",
          embedUrl: `https://daddylive.org/embed/embed.php?id=${dlId}&player=2&source=tv.json`,
          serverNum: 2,
          quality: "HD",
          color: "#3b82f6",
        });
        availableServers.push({
          id: `dl-${dlId}-p3`,
          label: "DaddyLive Server 3",
          source: "daddylive",
          embedUrl: `https://daddylive.org/embed/embed.php?id=${dlId}&player=3&source=tv.json`,
          serverNum: 3,
          quality: "HD",
          color: "#3b82f6",
        });
      }
    }

    return availableServers;
  }, [props.channelId, props.channelEmbedUrl]);

  // Compute the best initial server (not in effect)
  const bestInitialServer = useMemo(() => {
    if (servers.length === 0) return null;
    const embedUrl = props.channelEmbedUrl || "";
    const isDami = embedUrl.includes("dami-tv.pro");
    const isSF = embedUrl.includes("streamfree.app");
    const isDaddy = embedUrl.includes("daddylive.org");

    const currentSourceFirst = servers.find(s =>
      (isSF && s.source === "streamfree" && s.quality === "1080p") ||
      (isDami && s.source === "damitv") ||
      (isDaddy && s.source === "daddylive" && s.serverNum === 1)
    );
    const sf1080 = servers.find(s => s.id === "sf-1080p");
    const dami = servers.find(s => s.source === "damitv");
    const daddy1 = servers.find(s => s.source === "daddylive" && s.serverNum === 1);

    return currentSourceFirst || sf1080 || dami || daddy1 || servers[0];
  }, [servers, props.channelEmbedUrl]);

  // Derive the active server: if user selected one for this channel, use it; otherwise use the best initial
  const activeServer = useMemo(() => {
    const currentChannelId = props.channelId || "";
    if (userSelection && userSelection.channelId === currentChannelId) {
      const found = servers.find(s => s.id === userSelection.serverId);
      if (found) return found;
    }
    return bestInitialServer;
  }, [userSelection, servers, bestInitialServer, props.channelId]);

  // failedServers as Set for quick lookup
  const failedServersSet = useMemo(() => new Set(failedServerIds), [failedServerIds]);

  // Reset failed servers when channel changes
  const currentChannelId = props.channelId || "";
  // We use the channelId to detect stale state - if failedServerIds were for a different channel, clear them
  const [failedForChannel, setFailedForChannel] = useState(currentChannelId);
  if (failedForChannel !== currentChannelId) {
    // Channel changed, reset failed servers (this is safe during render as it synchronizes state)
    setFailedServerIds([]);
    setFallbackMessage("");
    setFailedForChannel(currentChannelId);
  }

  // Check StreamFree stream status for quality availability
  useEffect(() => {
    const sfKey = props.channelId?.replace("sf-", "") || "";
    if (!sfKey || !props.channelEmbedUrl?.includes("streamfree")) return;

    fetch(`https://streamfree.app/api/stream-status/${encodeURIComponent(sfKey)}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.qualities) {
          setSfQualities(data.qualities);
        }
      })
      .catch(() => {});
  }, [props.channelId, props.channelEmbedUrl]);

  const switchServer = useCallback((server: ServerOption) => {
    setIframeLoaded(false);
    setUserSelection({ channelId: props.channelId || "", serverId: server.id });
  }, [props.channelId]);

  // Auto-fallback: when iframe fails, try the next available server
  const handleIframeError = useCallback(() => {
    if (!activeServer) return;

    const failedId = activeServer.id;
    setFailedServerIds(prev => [...prev, failedId]);

    // Find next available server that hasn't failed yet
    const newFailedSet = new Set([...failedServerIds, failedId]);
    const nextServer = servers.find(s => !newFailedSet.has(s.id) && s.id !== failedId);
    if (nextServer) {
      const failedLabel = SOURCE_CONFIG[activeServer.source]?.label || activeServer.label;
      const nextLabel = SOURCE_CONFIG[nextServer.source]?.label || nextServer.label;
      setFallbackMessage(`${failedLabel} failed, trying ${nextLabel}...`);
      setIframeLoaded(false);
      setUserSelection({ channelId: props.channelId || "", serverId: nextServer.id });

      setTimeout(() => setFallbackMessage(""), 4000);
    } else {
      setFallbackMessage("All servers failed. Try refreshing or open externally.");
    }
  }, [activeServer, servers, failedServerIds, props.channelId]);

  const toggleFullscreen = async () => {
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) {
      await playerContainerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // Group servers by source
  const serversBySource = servers.reduce((acc, s) => {
    if (!acc[s.source]) acc[s.source] = [];
    acc[s.source].push(s);
    return acc;
  }, {} as Record<string, ServerOption[]>);

  const sourceOrder = ["streamfree", "damitv", "daddylive"];
  const sortedSources = sourceOrder.filter(s => serversBySource[s]);

  const currentEmbedUrl = activeServer?.embedUrl || props.channelEmbedUrl;

  return (
    <div className="min-h-screen flex flex-col -mx-4 lg:-mx-8 -mt-[75px] pt-0">
      {/* Player Area — full-width big player */}
      <div
        ref={playerContainerRef}
        className="relative w-full bg-black"
        style={{
          height: isFullscreen ? "100vh" : "80vh",
          minHeight: "600px",
          maxHeight: isFullscreen ? "100vh" : "calc(100vh - 75px)",
        }}
      >
        {/* Iframe Player */}
        <iframe
          key={activeServer?.id || "default"}
          src={currentEmbedUrl}
          title={props.channelName || "Live TV"}
          className="absolute inset-0 w-full h-full border-0"
          style={{ zIndex: 10 }}
          marginWidth={0}
          marginHeight={0}
          scrolling="no"
          frameBorder={0}
          allowFullScreen
          allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
          onLoad={() => setIframeLoaded(true)}
          onError={handleIframeError}
        />

        {/* Loading overlay */}
        {!iframeLoaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black z-20">
            <div className="w-12 h-12 rounded-full border-2 border-[#7c6cf0]/30 border-t-[#7c6cf0] animate-spin" />
            <p className="text-sm text-white/40">Loading stream...</p>
            <p className="text-[10px] text-white/20">
              {props.channelName} via {activeServer ? SOURCE_CONFIG[activeServer.source]?.label : "..."}
            </p>
          </div>
        )}

        {/* Fallback message overlay */}
        {fallbackMessage && (
          <div className="absolute top-14 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-lg bg-amber-900/80 border border-amber-500/30 text-amber-200 text-[11px] font-bold whitespace-nowrap backdrop-blur-sm">
            {fallbackMessage}
          </div>
        )}

        {/* Fullscreen Button */}
        <button
          onClick={toggleFullscreen}
          className="absolute bottom-2 right-2 z-30 p-2 rounded-lg bg-black/60 text-white/60 hover:text-white hover:bg-black/80 transition-all"
          style={{ zIndex: 30 }}
        >
          {isFullscreen ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M9 9L4 4m0 0v4m0-4h4m7 5l5-5m0 0v4m0-4h-4m-7 7l-5 5m0 0v-4m0 4h4m7-5l5 5m0 0v-4m0 4h-4" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          )}
        </button>

        {/* Back Button */}
        <button
          onClick={() => { navigate({ page: "live" }); useAppStore.getState().setSectionSubPage("tv-channels"); }}
          className="absolute top-2 left-2 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/60 text-white/70 hover:text-white hover:bg-black/80 transition-all"
          style={{ zIndex: 30 }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-[11px] font-bold">Back</span>
        </button>
      </div>

      {/* Channel Info + Server Selection */}
      <div className="px-4 lg:px-8 py-4 max-w-[1400px] mx-auto w-full">
        {/* Channel title and meta */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1
                className="text-xl font-black text-white"
                style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
              >
                {props.channelName || "Live TV Channel"}
              </h1>
              <span
                className="text-[9px] font-bold px-2 py-0.5 rounded"
                style={{ background: `${categoryColor}20`, color: categoryColor }}
              >
                {props.channelCategory}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-red-600/15 text-red-400 text-[10px] font-bold">
                <span className="w-1 h-1 rounded-full bg-red-500 animate-pulse" />
                LIVE NOW
              </span>
              {props.channelCountryName && (
                <span className="text-[11px] text-white/25">{props.channelCountryName}</span>
              )}
              {activeServer && (
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded"
                  style={{
                    background: `${activeServer.color}15`,
                    color: activeServer.color,
                  }}
                >
                  {SOURCE_CONFIG[activeServer.source]?.label} {activeServer.quality ? `• ${activeServer.quality}` : ""}
                </span>
              )}
              {failedServerIds.length > 0 && (
                <span className="text-[9px] text-amber-400/70 font-bold">
                  {failedServerIds.length} server{failedServerIds.length > 1 ? "s" : ""} failed
                </span>
              )}
            </div>
          </div>

          {/* Open in new tab */}
          <a
            href={currentEmbedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.06] text-white/50 text-[10px] font-bold hover:bg-white/[0.08] hover:text-white/70 transition-all flex-shrink-0"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
            </svg>
            Open External
          </a>
        </div>

        {/* ═══════════════════════════════════════════════
            ELGATO-STYLE SERVER/SOURCE SELECTION
            Grouped by source, with quality badges
        ═══════════════════════════════════════════════ */}
        {servers.length > 1 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-4 h-4 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
              </svg>
              <span className="text-[11px] font-bold text-white/40 uppercase tracking-wider" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>
                Servers & Sources
              </span>
            </div>

            <div className="space-y-3">
              {sortedSources.map(source => {
                const sourceServers = serversBySource[source];
                const config = SOURCE_CONFIG[source];
                const isSourceActive = activeServer?.source === source;

                return (
                  <div key={source} className={`rounded-xl border transition-all ${isSourceActive ? "border-white/[0.10]" : "border-white/[0.05]"}`}>
                    {/* Source header */}
                    <div className="flex items-center gap-2 px-3 py-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ background: config.color, boxShadow: isSourceActive ? `0 0 6px ${config.color}` : "none" }}
                      />
                      <span
                        className="text-[10px] font-black uppercase tracking-wider"
                        style={{ color: isSourceActive ? config.color : "rgba(255,255,255,0.3)" }}
                      >
                        {config.label}
                      </span>
                      {isSourceActive && (
                        <span className="text-[8px] text-white/20 font-bold ml-auto">ACTIVE</span>
                      )}
                    </div>

                    {/* Server buttons */}
                    <div className="flex flex-wrap gap-1.5 px-3 pb-2.5">
                      {sourceServers.map(server => {
                        const isActive = activeServer?.id === server.id;
                        const hasFailed = failedServersSet.has(server.id);
                        const isUnavailable = (server.source === "streamfree" &&
                          server.quality &&
                          sfQualities[server.quality] === false) || hasFailed;

                        return (
                          <button
                            key={server.id}
                            onClick={() => !isUnavailable && switchServer(server)}
                            disabled={isUnavailable}
                            className={`relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold transition-all ${
                              isActive
                                ? "text-white shadow-lg"
                                : isUnavailable
                                ? "text-white/15 cursor-not-allowed line-through"
                                : "text-white/50 hover:text-white/80 hover:bg-white/[0.06] cursor-pointer"
                            }`}
                            style={{
                              ...(isActive ? {
                                background: `linear-gradient(135deg, ${config.color}30, ${config.color}15)`,
                                border: `1px solid ${config.color}40`,
                                boxShadow: `0 0 20px ${config.color}15`,
                              } : {}),
                            }}
                          >
                            {/* Active indicator */}
                            {isActive && (
                              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: config.color }} />
                            )}

                            {/* Quality badge */}
                            {server.quality && (
                              <span
                                className="text-[8px] font-black px-1 py-0.5 rounded"
                                style={{
                                  background: isActive ? `${config.color}30` : "rgba(255,255,255,0.05)",
                                  color: isActive ? config.color : "rgba(255,255,255,0.3)",
                                }}
                              >
                                {server.quality}
                              </span>
                            )}

                            {/* Server number for DaddyLive */}
                            {server.serverNum && (
                              <span>S{server.serverNum}</span>
                            )}

                            {/* Label text */}
                            {!server.serverNum && (
                              <span>{server.quality ? `Quality` : config.shortLabel}</span>
                            )}

                            {/* Unavailable / Failed marker */}
                            {hasFailed && (
                              <span className="text-[7px] text-red-500/70 font-bold">FAIL</span>
                            )}
                            {!hasFailed && server.source === "streamfree" && server.quality && sfQualities[server.quality] === false && (
                              <span className="text-[7px] text-red-500/50 font-bold">OFF</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Info box */}
        <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
          <p className="text-[10px] text-white/20">
            {servers.length > 1 ? (
              <>Switch between sources and quality levels above. If one server doesn&apos;t work, try another. Failed servers are automatically skipped.</>
            ) : (
              <>Stream provided by <span className="font-bold" style={{ color: activeServer?.color || "#7c6cf0" }}>{activeServer ? SOURCE_CONFIG[activeServer.source]?.label : "unknown"}</span>. Stream availability depends on source server.</>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
