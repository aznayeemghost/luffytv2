"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useAppStore } from "./store";

// ============================================================
// LIVE TV WATCH PAGE — DamiTV + StreamFree + EmbedSports Multi-Source Player
// DamiTV servers:
//   1. dami-tv.pro embed with resolve: /embed/?ch={numericId} (PRIMARY)
//      Uses /papi/tv/resolve/{id} internally to get actual stream URL
//   2. dami-tv.pro cdn-stream: /cdn-stream/{name} (FALLBACK)
// StreamFree servers:
//   Origin: /embed/{category}/{key}?quality={q}&category={cat}&server=origin
//   Miror:  /embed/{category}/{key}?quality={q}&category={cat}&server=miror
// All iframes use sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
// Auto-fallback on iframe errors with 15s timeout
// ============================================================

interface LiveTVWatchProps {
  channelId: string;
  channelName: string;
  channelCategory: string;
  channelStreamCategory?: string; // Actual StreamFree embed category (cricket, racing, tennis) — NOT the display "Sports"
  channelCountryCode?: string;
  channelCountryName?: string;
  channelEmbedUrl: string;
  channelDamitvDefaultUrl?: string; // DamiTV cdn-stream fallback URL
  channelViewers?: number;
  channelLogoUrl?: string;
}

interface ServerOption {
  id: string;
  label: string;
  source: "damitv" | "streamfree" | "embedsports";
  embedUrl: string;
  quality?: string;
  serverNum?: number;
  color: string;
  isPrimary?: boolean;
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
  damitv: { color: "#f97316", label: "DamiTV", shortLabel: "DAMI" },
  streamfree: { color: "#a855f7", label: "StreamFree", shortLabel: "SF" },
  embedsports: { color: "#22c55e", label: "EmbedSports", shortLabel: "ES" },
};

// EmbedSports.top channel mapping — keyed by stream key
// IMPORTANT: Each sport gets its OWN correct slug. F1 ≠ Rally TV.
// Pattern: https://embedsports.top/embed/admin/admin-{slug}/{serverNum}
// Multiple servers available for some channels
const EMBEDSPORTS_CHANNELS: Record<string, string[]> = {
  // Cricket channels — 6 servers
  willow: [
    "https://embedsports.top/embed/admin/admin-willow-cricket/1",
    "https://embedsports.top/embed/admin/admin-willow-cricket/2",
    "https://embedsports.top/embed/admin/admin-willow-cricket/3",
    "https://embedsports.top/embed/admin/admin-willow-cricket/4",
    "https://embedsports.top/embed/admin/admin-willow-cricket/5",
    "https://embedsports.top/embed/admin/admin-willow-cricket/6",
  ],
  cricketsky: [
    "https://embedsports.top/embed/admin/admin-willow-cricket/1",
    "https://embedsports.top/embed/admin/admin-willow-cricket/2",
    "https://embedsports.top/embed/admin/admin-willow-cricket/3",
    "https://embedsports.top/embed/admin/admin-willow-cricket/4",
    "https://embedsports.top/embed/admin/admin-willow-cricket/5",
    "https://embedsports.top/embed/admin/admin-willow-cricket/6",
  ],
  // Tennis channels — 2 servers
  skytennis: [
    "https://embedsports.top/embed/admin/admin-tennis-channel/1",
    "https://embedsports.top/embed/admin/admin-tennis-channel/2",
  ],
  tntsports1: [
    "https://embedsports.top/embed/admin/admin-tennis-channel/1",
    "https://embedsports.top/embed/admin/admin-tennis-channel/2",
  ],
  // F1 / Racing channels — F1 gets its own slug, NOT rally
  skyf1: [
    "https://embedsports.top/embed/admin/admin-sky-sports-f1/1",
    "https://embedsports.top/embed/admin/admin-sky-sports-f1/2",
  ],
  // Rally TV
  rallytv: [
    "https://embedsports.top/embed/admin/admin-rally-tv/1",
  ],
  // Golf channels
  skysportsgolf: [
    "https://embedsports.top/embed/admin/admin-sky-sports-golf/1",
  ],
  // Football channels
  skysportsfootball: [
    "https://embedsports.top/embed/admin/admin-sky-sports-football/1",
  ],
  // Main event / general sports
  skysports: [
    "https://embedsports.top/embed/admin/admin-sky-sports-main-event/1",
  ],
  skysportsaction: [
    "https://embedsports.top/embed/admin/admin-sky-sports-action/1",
  ],
  skysportsarena: [
    "https://embedsports.top/embed/admin/admin-sky-sports-arena/1",
  ],
  // News
  skysportsnews: [
    "https://embedsports.top/embed/admin/admin-sky-sports-news/1",
  ],
  // ESPN
  espn: [
    "https://embedsports.top/embed/admin/admin-espn/1",
  ],
  // BT Sport / TNT
  btsport: [
    "https://embedsports.top/embed/admin/admin-tnt-sports/1",
  ],
  // Additional channels
  cbc: [
    "https://embedsports.top/embed/admin/admin-espn/1",
  ],
  bbc: [
    "https://embedsports.top/embed/admin/admin-sky-sports-main-event/1",
  ],
  supersport: [
    "https://embedsports.top/embed/admin/admin-sky-sports-main-event/1",
  ],
};

export default function LiveTVWatchPage(props: LiveTVWatchProps) {
  const navigate = useAppStore(s => s.navigate);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [userSelection, setUserSelection] = useState<{ channelId: string; serverId: string } | null>(null);
  const [failedServerIds, setFailedServerIds] = useState<string[]>([]);
  const [fallbackMessage, setFallbackMessage] = useState("");
  const [loadingElapsed, setLoadingElapsed] = useState(0); // seconds elapsed since iframe started loading
  const [allServersFailed, setAllServersFailed] = useState(false);
  const loadingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const categoryColor = CAT_COLORS[props.channelCategory] || CAT_COLORS.General;

  // Determine channel source
  const isDami = props.channelId.startsWith("dami-");
  const isSF = props.channelId.startsWith("sf-");

  // Extract DamiTV data from embed URL
  // damiResolveId: The numeric channel ID for the resolve API (e.g., "0", "1", "375")
  // This is extracted from the channelId like "dami-cdn-0" → "0"
  const damiResolveId = useMemo(() => {
    // The channelId is like "dami-cdn-0", so strip the "dami-cdn-" prefix
    // to get the numeric resolve ID
    return props.channelId.replace("dami-cdn-", "");
  }, [props.channelId]);

  // damiName: The channel name for constructing fallback URLs
  const damiName = useMemo(() => {
    // Use the channel name directly from props
    return props.channelName || "";
  }, [props.channelName]);

  // Extract StreamFree data from embed URL
  const sfMatch = useMemo(() => {
    const m = props.channelEmbedUrl.match(/\/embed\/([^/]+)\/([^?]+)/);
    return m ? { category: m[1], streamKey: m[2] } : { category: "", streamKey: "" };
  }, [props.channelEmbedUrl]);

  // StreamFree category: Use the ACTUAL embed category from the API data
  // This is the sport-specific category (cricket, racing, tennis, soccer, etc.)
  // NEVER use the display category "Sports" — that breaks embed URLs!
  const sfCategory = useMemo(() => {
    // Priority 1: The channelStreamCategory prop — the resolved embed category
    // passed directly from the API (e.g., "cricket", "racing", "tennis")
    if (props.channelStreamCategory) return props.channelStreamCategory;
    // Priority 2: Extract from the embed URL (/embed/{category}/{key})
    if (sfMatch.category && sfMatch.category !== "sports") return sfMatch.category;
    // Priority 3: Detect from channel name (fallback)
    const name = (props.channelName || "").toLowerCase();
    if (name.includes("cricket") || name.includes("willow")) return "cricket";
    if (name.includes("tennis")) return "tennis";
    if (name.includes("f1") || name.includes("racing") || name.includes("motor")) return "racing";
    if (name.includes("golf")) return "golf";
    if (name.includes("football") || name.includes("soccer")) return "soccer";
    if (name.includes("basketball") || name.includes("nba")) return "basketball";
    if (name.includes("baseball") || name.includes("mlb")) return "baseball";
    if (name.includes("hockey") || name.includes("nhl")) return "hockey";
    if (name.includes("fight") || name.includes("ufc") || name.includes("boxing")) return "combat";
    if (name.includes("rugby")) return "rugby";
    if (name.includes("news")) return "news";
    // Last resort: use what we have, but NEVER default to generic "sports"
    if (sfMatch.category) return sfMatch.category;
    return "";
  }, [props.channelStreamCategory, sfMatch.category, props.channelName]);

  // Build all available server options for this channel
  const servers = useMemo<ServerOption[]>(() => {
    const availableServers: ServerOption[] = [];

    // ── DamiTV servers ──
    // PRIMARY: Use dami-tv.pro/embed/?ch={numericId}
    // This embed page internally calls /papi/tv/resolve/{id} to get the actual stream URL
    // and plays it in an HLS player. This is the most reliable method.
    if (isDami) {
      const resolveId = damiResolveId;

      // Server 1: DamiTV Embed with Resolve API — PRIMARY
      // Format: https://dami-tv.pro/embed/?ch={numericId}
      // This internally resolves the channel and plays via HLS
      if (resolveId) {
        availableServers.push({
          id: `dami-resolve`,
          label: "DamiTV Player",
          source: "damitv",
          embedUrl: `https://dami-tv.pro/embed/?ch=${resolveId}`,
          quality: "HD",
          color: "#f97316",
          isPrimary: true,
        });
      }

      // Server 2: dami-tv.pro cdn-stream redirect (FALLBACK)
      const cdnStreamUrl = props.channelDamitvDefaultUrl || `https://dami-tv.pro/cdn-stream/${encodeURIComponent(damiName)}`;
      availableServers.push({
        id: `dami-stream`,
        label: "DamiTV Stream",
        source: "damitv",
        embedUrl: cdnStreamUrl,
        quality: "HD",
        color: "#f97316",
      });
    }

    // ── StreamFree servers ──
    if (isSF) {
      // Use the actual StreamFree category from the embed URL or prop
      // NEVER use "sports" as default — must use the real category (racing, cricket, etc.)
      const sfCat = sfCategory;
      const sfKey = sfMatch.streamKey || props.channelId.replace("sf-", "");

      if (sfKey && sfCat) {
        // Origin server (primary) — 3 quality options
        availableServers.push({
          id: `sf-origin-1080p`,
          label: "SF Origin 1080p",
          source: "streamfree",
          embedUrl: `https://streamfree.app/embed/${sfCat}/${sfKey}?quality=1080p&category=${sfCat}&server=origin`,
          quality: "1080p",
          color: "#a855f7",
          isPrimary: true,
        });
        availableServers.push({
          id: `sf-origin-720p`,
          label: "SF Origin 720p",
          source: "streamfree",
          embedUrl: `https://streamfree.app/embed/${sfCat}/${sfKey}?quality=720p&category=${sfCat}&server=origin`,
          quality: "720p",
          color: "#a855f7",
        });
        availableServers.push({
          id: `sf-origin-540p`,
          label: "SF Origin 540p",
          source: "streamfree",
          embedUrl: `https://streamfree.app/embed/${sfCat}/${sfKey}?quality=540p&category=${sfCat}&server=origin`,
          quality: "540p",
          color: "#a855f7",
        });
        // Miror server (backup) — 3 quality options
        availableServers.push({
          id: `sf-miror-1080p`,
          label: "SF Miror 1080p",
          source: "streamfree",
          embedUrl: `https://streamfree.app/embed/${sfCat}/${sfKey}?quality=1080p&category=${sfCat}&server=miror`,
          quality: "1080p",
          color: "#a855f7",
        });
        availableServers.push({
          id: `sf-miror-720p`,
          label: "SF Miror 720p",
          source: "streamfree",
          embedUrl: `https://streamfree.app/embed/${sfCat}/${sfKey}?quality=720p&category=${sfCat}&server=miror`,
          quality: "720p",
          color: "#a855f7",
        });
        availableServers.push({
          id: `sf-miror-540p`,
          label: "SF Miror 540p",
          source: "streamfree",
          embedUrl: `https://streamfree.app/embed/${sfCat}/${sfKey}?quality=540p&category=${sfCat}&server=miror`,
          quality: "540p",
          color: "#a855f7",
        });
      }
    }

    // ── EmbedSports.top servers ──
    // Add EmbedSports.top as additional servers for specific channels
    const sfKeyForES = sfMatch.streamKey || (isSF ? props.channelId.replace("sf-", "") : "");
    const esChannelUrls = EMBEDSPORTS_CHANNELS[sfKeyForES || ""];
    if (esChannelUrls && esChannelUrls.length > 0) {
      esChannelUrls.forEach((url, idx) => {
        availableServers.push({
          id: `es-${sfKeyForES}-${idx + 1}`,
          label: `EmbedSports ${idx + 1}`,
          source: "embedsports",
          embedUrl: url,
          quality: "HD",
          color: "#22c55e",
          isPrimary: idx === 0,
        });
      });
    }
    // Also check channel name for EmbedSports matches (works for DamiTV channels too)
    const chNameLower = (props.channelName || "").toLowerCase();
    if (!esChannelUrls || esChannelUrls.length === 0) {
      let esUrls: string[] = [];
      let esLabel = "";
      if (chNameLower.includes("willow") || chNameLower.includes("cricket")) {
        esUrls = [
          "https://embedsports.top/embed/admin/admin-willow-cricket/1",
          "https://embedsports.top/embed/admin/admin-willow-cricket/2",
          "https://embedsports.top/embed/admin/admin-willow-cricket/3",
          "https://embedsports.top/embed/admin/admin-willow-cricket/4",
          "https://embedsports.top/embed/admin/admin-willow-cricket/5",
          "https://embedsports.top/embed/admin/admin-willow-cricket/6",
        ];
        esLabel = "Cricket";
      } else if (chNameLower.includes("tennis")) {
        esUrls = [
          "https://embedsports.top/embed/admin/admin-tennis-channel/1",
          "https://embedsports.top/embed/admin/admin-tennis-channel/2",
        ];
        esLabel = "Tennis";
      } else if (chNameLower.includes("f1")) {
        // F1 gets its OWN EmbedSports slug — NOT rally-tv
        esUrls = [
          "https://embedsports.top/embed/admin/admin-sky-sports-f1/1",
          "https://embedsports.top/embed/admin/admin-sky-sports-f1/2",
        ];
        esLabel = "F1";
      } else if (chNameLower.includes("rally") || chNameLower.includes("motor")) {
        esUrls = [
          "https://embedsports.top/embed/admin/admin-rally-tv/1",
        ];
        esLabel = "Motor";
      } else if (chNameLower.includes("golf")) {
        esUrls = [
          "https://embedsports.top/embed/admin/admin-sky-sports-golf/1",
        ];
        esLabel = "Golf";
      } else if (chNameLower.includes("football") || chNameLower.includes("soccer")) {
        esUrls = [
          "https://embedsports.top/embed/admin/admin-sky-sports-football/1",
        ];
        esLabel = "Football";
      }

      esUrls.forEach((url, idx) => {
        availableServers.push({
          id: `es-name-${esLabel.toLowerCase()}-${idx + 1}`,
          label: `EmbedSports ${esLabel} ${idx + 1}`,
          source: "embedsports",
          embedUrl: url,
          quality: "HD",
          color: "#22c55e",
          isPrimary: idx === 0,
        });
      });
    }

    return availableServers;
  }, [props.channelId, props.channelEmbedUrl, props.channelCountryCode, props.channelDamitvDefaultUrl, isDami, isSF, damiResolveId, damiName, sfMatch, sfCategory, props.channelName]);

  // Compute the best initial server
  const bestInitialServer = useMemo(() => {
    if (servers.length === 0) return null;
    // Primary first, then any available
    return servers.find(s => s.isPrimary) || servers[0];
  }, [servers]);

  // Derive the active server
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
  const [failedForChannel, setFailedForChannel] = useState(currentChannelId);
  if (failedForChannel !== currentChannelId) {
    setFailedServerIds([]);
    setFallbackMessage("");
    setAllServersFailed(false);
    setLoadingElapsed(0);
    setFailedForChannel(currentChannelId);
  }

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

  // Loading progress timer — track how long the iframe has been loading
  useEffect(() => {
    if (iframeLoaded || !activeServer) {
      setLoadingElapsed(0);
      if (loadingTimerRef.current) {
        clearInterval(loadingTimerRef.current);
        loadingTimerRef.current = null;
      }
      return;
    }

    setLoadingElapsed(0);
    loadingTimerRef.current = setInterval(() => {
      setLoadingElapsed(prev => prev + 1);
    }, 1000);

    return () => {
      if (loadingTimerRef.current) {
        clearInterval(loadingTimerRef.current);
        loadingTimerRef.current = null;
      }
    };
  }, [activeServer, iframeLoaded]);

  // Auto-fallback with timeout: if iframe doesn't load within 12s, try next server
  // Show "taking longer" message at 8s, auto-switch at 12s
  useEffect(() => {
    if (!activeServer || iframeLoaded || allServersFailed) return;

    // 8s warning message
    const warningTimer = setTimeout(() => {
      if (!iframeLoaded && !failedServersSet.has(activeServer.id)) {
        const sourceLabel = SOURCE_CONFIG[activeServer.source]?.label || activeServer.label;
        const nextServer = servers.find(s => !failedServersSet.has(s.id) && s.id !== activeServer.id);
        if (nextServer) {
          const nextLabel = SOURCE_CONFIG[nextServer.source]?.label || nextServer.label;
          setFallbackMessage(`${sourceLabel} taking too long. Switching to ${nextLabel} in 4s...`);
        } else {
          setFallbackMessage(`${sourceLabel} stream is slow. Please wait...`);
        }
      }
    }, 8000);

    // 12s auto-switch
    const switchTimer = setTimeout(() => {
      if (!iframeLoaded && !failedServersSet.has(activeServer.id)) {
        handleIframeError();
      }
    }, 12000);

    return () => {
      clearTimeout(warningTimer);
      clearTimeout(switchTimer);
    };
  }, [activeServer, iframeLoaded, failedServersSet, handleIframeError, allServersFailed, servers]);

  // Detect when all servers have failed
  useEffect(() => {
    if (servers.length > 0 && failedServerIds.length >= servers.length) {
      setAllServersFailed(true);
    }
  }, [failedServerIds, servers]);

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

  const sourceOrder = ["damitv", "streamfree", "embedsports"];
  const sortedSources = sourceOrder.filter(s => serversBySource[s]);

  const currentEmbedUrl = activeServer?.embedUrl || props.channelEmbedUrl;

  return (
    <div className="min-h-screen flex flex-col -mx-4 lg:-mx-8 -mt-[75px] pt-0">
      {/* Player Area — FULL viewport height player */}
      <div
        ref={playerContainerRef}
        className="relative w-full bg-black"
        style={{
          height: isFullscreen ? "100vh" : "90vh",
          minHeight: "500px",
          maxHeight: isFullscreen ? "100vh" : "calc(100vh - 20px)",
        }}
      >
        {/* Iframe Player */}
        <iframe
          key={activeServer?.id || "default"}
          src={currentEmbedUrl}
          title={props.channelName || "Live TV"}
          className="absolute inset-0 w-full h-full border-0"
          style={{ zIndex: 10 }}
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          marginWidth={0}
          marginHeight={0}
          scrolling="no"
          frameBorder={0}
          allowFullScreen
          allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
          referrerPolicy="no-referrer-when-downgrade"
          onLoad={() => setIframeLoaded(true)}
          onError={handleIframeError}
        />

        {/* Loading overlay with progress indicator */}
        {!iframeLoaded && !allServersFailed && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black z-20">
            {/* Spinner with progress ring */}
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-3 border-white/10 border-t-[#7c6cf0] animate-spin" />
              {/* Progress arc showing elapsed time (12s max) */}
              <svg className="absolute inset-0 w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                <circle
                  cx="32" cy="32" r="28"
                  fill="none"
                  stroke="#7c6cf0"
                  strokeWidth="2"
                  strokeDasharray={`${Math.min(loadingElapsed / 12, 1) * 176} 176`}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
              </svg>
            </div>

            {/* Source-specific loading message */}
            <div className="text-center">
              <p className="text-sm font-bold text-white/60">
                {activeServer?.source === "damitv" ? "Connecting to DamiTV..." :
                 activeServer?.source === "streamfree" ? "Loading StreamFree..." :
                 activeServer?.source === "embedsports" ? "Loading EmbedSports..." :
                 "Loading stream..."}
              </p>
              <p className="text-[11px] text-white/30 mt-1">
                {props.channelName} via {activeServer ? SOURCE_CONFIG[activeServer.source]?.label : "..."}
              </p>
              {loadingElapsed > 0 && (
                <p className="text-[10px] text-white/20 mt-1">
                  {loadingElapsed}s elapsed
                </p>
              )}
            </div>

            {/* Warning after 10s */}
            {loadingElapsed >= 10 && (
              <div className="px-4 py-2 rounded-lg bg-amber-900/60 border border-amber-500/30 text-amber-200 text-[11px] font-bold text-center max-w-xs">
                Stream taking longer than expected.
                {servers.some(s => !failedServersSet.has(s.id) && s.id !== activeServer?.id) && (
                  <span> Trying next server soon...</span>
                )}
              </div>
            )}
          </div>
        )}

        {/* All servers failed overlay */}
        {allServersFailed && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black z-20">
            <div className="text-5xl">⚠️</div>
            <p className="text-lg font-bold text-white/70">All servers failed</p>
            <p className="text-[12px] text-white/40 max-w-xs text-center">
              Unable to load {props.channelName}. The stream may be temporarily unavailable.
            </p>
            <button
              onClick={() => {
                setFailedServerIds([]);
                setAllServersFailed(false);
                setIframeLoaded(false);
                setUserSelection(null);
                setFallbackMessage("");
              }}
              className="px-5 py-2.5 rounded-lg bg-[#7c6cf0] text-white text-[12px] font-bold hover:bg-[#7c6cf0]/80 transition-all"
            >
              🔄 Retry All Servers
            </button>
            <a
              href={currentEmbedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-lg bg-white/[0.06] text-white/50 text-[11px] font-bold hover:bg-white/[0.08] hover:text-white/70 transition-all"
            >
              Open Externally ↗
            </a>
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
                  {activeServer.isPrimary ? " • Primary" : ""}
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
            SERVER/SOURCE SELECTION
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
              {isDami && (
                <span className="text-[9px] text-orange-400/60 font-bold ml-1">(Resolve + Stream)</span>
              )}
              {isSF && (
                <span className="text-[9px] text-purple-400/60 font-bold ml-1">(2 servers: origin + miror)</span>
              )}
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
                      {source === "damitv" && (
                        <span className="text-[8px] text-white/15 font-bold ml-auto">Resolve + Stream</span>
                      )}
                      {source === "streamfree" && (
                        <span className="text-[8px] text-white/15 font-bold ml-auto">origin + miror</span>
                      )}
                      {source === "embedsports" && (
                        <span className="text-[8px] text-white/15 font-bold ml-auto">EmbedSports.top</span>
                      )}
                    </div>

                    {/* Server buttons */}
                    <div className="flex flex-wrap gap-1.5 px-3 pb-2.5">
                      {sourceServers.map(server => {
                        const isActive = activeServer?.id === server.id;
                        const hasFailed = failedServersSet.has(server.id);

                        return (
                          <button
                            key={server.id}
                            onClick={() => !hasFailed && switchServer(server)}
                            disabled={hasFailed}
                            className={`relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold transition-all ${
                              isActive
                                ? "text-white shadow-lg"
                                : hasFailed
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

                            {/* Primary badge */}
                            {server.isPrimary && !isActive && (
                              <span className="text-[7px] font-black px-1 py-0.5 rounded bg-orange-500/20 text-orange-400">
                                PRIMARY
                              </span>
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

                            {/* Server type label */}
                            {server.source === "damitv" && (
                              <span>{server.label.replace("DamiTV ", "")}</span>
                            )}
                            {server.source === "streamfree" && server.id.includes("origin") && (
                              <span>Origin</span>
                            )}
                            {server.source === "streamfree" && server.id.includes("miror") && (
                              <span>Miror</span>
                            )}
                            {server.source === "embedsports" && (
                              <span>{server.label}</span>
                            )}

                            {/* Failed marker */}
                            {hasFailed && (
                              <span className="text-[7px] text-red-500/70 font-bold">FAIL</span>
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
            {isDami ? (
              <>DamiTV Player uses the resolve API (/papi/tv/resolve/{id}) to get the actual stream URL. If it fails, auto-switches to Stream server. 12s timeout auto-fallback enabled.</>
            ) : isSF ? (
              <>StreamFree has 2 servers: Origin (primary) and Miror (backup) with quality options (1080p, 720p, 540p). Failed servers are automatically skipped.</>
            ) : (
              <>Stream provided by <span className="font-bold" style={{ color: activeServer?.color || "#7c6cf0" }}>{activeServer ? SOURCE_CONFIG[activeServer.source]?.label : "unknown"}</span>.</>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
