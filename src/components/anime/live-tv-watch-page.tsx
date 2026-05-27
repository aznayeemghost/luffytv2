"use client";

import { useState, useRef, useEffect } from "react";
import { useAppStore } from "./store";

// ============================================================
// LIVE TV WATCH PAGE — Daddylive iframe player
// ============================================================

interface LiveTVWatchProps {
  channelId: string;
  channelName: string;
  channelCategory: string;
  channelCountryCode?: string;
  channelCountryName?: string;
  channelEmbedUrl: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  Sports: "#f97316",
  News: "#3b82f6",
  Entertainment: "#a855f7",
  Kids: "#22c55e",
  Music: "#ec4899",
  Documentary: "#06b6d4",
  Movies: "#eab308",
  General: "#6b7280",
};

export default function LiveTVWatchPage(props: LiveTVWatchProps) {
  const navigate = useAppStore(s => s.navigate);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  const categoryColor = CATEGORY_COLORS[props.channelCategory] || CATEGORY_COLORS.General;

  // Handle fullscreen
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

  const embedUrl = props.channelEmbedUrl || `https://daddylive.org/embed/embed.php?id=${props.channelId}&player=1&source=tv.json`;

  return (
    <div className="min-h-screen flex flex-col -mx-4 lg:-mx-8 -mt-[75px] pt-0">
      {/* Player Area */}
      <div
        ref={playerContainerRef}
        className="relative w-full bg-black"
        style={{ aspectRatio: isFullscreen ? "auto" : "16/9", minHeight: isFullscreen ? "100vh" : "280px" }}
      >
        {/* Iframe Player */}
        <iframe
          src={embedUrl}
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
        />

        {/* Loading overlay */}
        {!iframeLoaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black z-20">
            <div className="w-12 h-12 rounded-full border-2 border-[#7c6cf0]/30 border-t-[#7c6cf0] animate-spin" />
            <p className="text-sm text-white/40">Loading channel...</p>
            <p className="text-[10px] text-white/20">{props.channelName}</p>
          </div>
        )}

        {/* Fullscreen Button */}
        <button
          onClick={toggleFullscreen}
          className="absolute bottom-3 right-3 z-30 p-2 rounded-lg bg-black/60 text-white/60 hover:text-white hover:bg-black/80 transition-all"
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
          className="absolute top-3 left-3 z-30 flex items-center gap-2 px-3 py-2 rounded-lg bg-black/60 text-white/70 hover:text-white hover:bg-black/80 transition-all"
          style={{ zIndex: 30 }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-xs font-bold">Back</span>
        </button>
      </div>

      {/* Channel Info */}
      <div className="px-4 lg:px-8 py-4 max-w-[1400px] mx-auto w-full">
        {/* Channel Name + Category */}
        <div className="flex items-center gap-3 mb-3">
          <h1
            className="text-xl font-black text-white"
            style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
          >
            {props.channelName || "Live TV Channel"}
          </h1>
          <span
            className="text-[10px] font-bold px-2 py-1 rounded-lg"
            style={{ background: `${categoryColor}20`, color: categoryColor }}
          >
            {props.channelCategory}
          </span>
        </div>

        {/* Live Badge */}
        <div className="flex items-center gap-3 mb-4">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-600/15 text-red-400 text-xs font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            LIVE NOW
          </span>
          {props.channelCountryName && (
            <span className="text-xs text-white/30">
              {props.channelCountryName}
            </span>
          )}
        </div>

        {/* Open in New Tab */}
        <a
          href={embedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/[0.06] text-white/50 text-xs font-bold hover:bg-white/[0.08] hover:text-white/70 transition-all"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
          </svg>
          Open in New Tab
        </a>

        {/* Channel Source Info */}
        <div className="mt-6 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold text-white/50" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>
              SOURCE
            </span>
          </div>
          <p className="text-xs text-white/30">
            Channel provided by Daddylive. Stream availability depends on the source server.
          </p>
          <p className="text-[10px] text-white/15 mt-1">
            Channel ID: {props.channelId}
          </p>
        </div>
      </div>
    </div>
  );
}
