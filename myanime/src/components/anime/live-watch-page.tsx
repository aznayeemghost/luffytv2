"use client";

import { useState, useEffect, useRef } from "react";
import { useAppStore } from "./store";

interface ServerInfo {
  label: string;
  embedUrl: string;
  hd: boolean;
}

export default function LiveWatchPage() {
  const { navigate, route } = useAppStore();
  const [currentServer, setCurrentServer] = useState(0);
  const [servers, setServers] = useState<ServerInfo[]>([]);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Parse route params
  useEffect(() => {
    if (route.page === "live-watch") {
      setTitle(route.title || "");
      setCategory(route.category || "");
      try {
        const parsed = JSON.parse(route.servers || "[]");
        setServers(Array.isArray(parsed) ? parsed : []);
      } catch {
        setServers([]);
      }
    }
  }, [route]);

  // Handle iframe load
  const handleIframeLoad = () => {
    setLoading(false);
  };

  const handleIframeError = () => {
    setLoading(false);
    setError("Failed to load stream. Try another server.");
  };

  // Switch server
  const switchServer = (index: number) => {
    if (index === currentServer) return;
    setLoading(true);
    setError(null);
    setCurrentServer(index);
  };

  // Auto-advance to next server on error
  const handleTryNext = () => {
    if (currentServer < servers.length - 1) {
      switchServer(currentServer + 1);
    } else {
      setError("No more servers available.");
    }
  };

  const currentUrl = servers[currentServer]?.embedUrl || "";

  return (
    <div className="space-y-4 fade-in">
      {/* Back Button */}
      <button
        onClick={() => navigate({ page: "live" })}
        className="flex items-center gap-2 text-white/40 hover:text-white transition-colors group"
      >
        <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path d="M15 19l-7-7 7-7" />
        </svg>
        <span className="text-[12px] font-bold uppercase tracking-wider" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>
          Back to Live
        </span>
      </button>

      {/* Title */}
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-xl sm:text-2xl font-bold text-white" style={{ fontFamily: "var(--font-inter), 'Inter', sans-serif" }}>
          {title}
        </h1>
        {category && (
          <span className="px-3 py-1 rounded-lg bg-[#7c6cf0]/15 text-[10px] font-bold text-[#a78bfa] border border-[#7c6cf0]/20" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>
            {category}
          </span>
        )}
      </div>

      {/* ═══════════════════════════════════════════
          IFRAME PLAYER — NO SANDBOX, 85-90vh
          ═══════════════════════════════════════════ */}
      <div className="relative w-full rounded-2xl overflow-hidden border border-white/[0.06] bg-black">
        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0f] z-10">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-2 border-[#7c6cf0]/30 border-t-[#7c6cf0] rounded-full animate-spin" />
              <p className="text-[11px] text-white/30 font-bold" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>
                Loading stream...
              </p>
            </div>
          </div>
        )}

        {/* Error overlay */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0f] z-10">
            <div className="flex flex-col items-center gap-4 text-center px-6">
              <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center">
                <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <p className="text-sm text-white/50">{error}</p>
              <button
                onClick={handleTryNext}
                className="px-5 py-2.5 rounded-xl bg-[#7c6cf0] text-white text-[11px] font-bold hover:bg-[#6b5ce0] transition-all shadow-lg shadow-[#7c6cf0]/25"
                style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
              >
                TRY NEXT SERVER
              </button>
            </div>
          </div>
        )}

        {/* IFRAME — NO SANDBOX ATTRIBUTE! */}
        {currentUrl && (
          <iframe
            ref={iframeRef}
            src={currentUrl}
            className="w-full"
            style={{ height: "87vh", minHeight: "500px" }}
            allowFullScreen
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
            onLoad={handleIframeLoad}
            onError={handleIframeError}
          />
        )}
      </div>

      {/* ═══════════════════════════════════════════
          SERVER SELECTOR
          ═══════════════════════════════════════════ */}
      {servers.length > 1 && (
        <div className="space-y-3">
          <h3 className="text-[11px] font-bold text-white/30 uppercase tracking-wider" style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}>
            Servers ({servers.length} available)
          </h3>
          <div className="flex flex-wrap gap-2">
            {servers.map((server, idx) => (
              <button
                key={idx}
                onClick={() => switchServer(idx)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-bold transition-all ${
                  idx === currentServer
                    ? "bg-[#7c6cf0] text-white shadow-lg shadow-[#7c6cf0]/25"
                    : "bg-white/[0.04] text-white/40 hover:text-white hover:bg-white/[0.08] border border-white/[0.06]"
                }`}
                style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
              >
                {server.hd && (
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[8px] font-bold">HD</span>
                )}
                {server.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Info Footer */}
      <div className="rounded-xl border border-white/[0.04] bg-white/[0.01] p-4">
        <p className="text-[11px] text-white/20 leading-relaxed" style={{ fontFamily: "var(--font-inter), 'Inter', sans-serif" }}>
          If the stream isn&apos;t working, try switching to another server above. Different servers use different providers — DamiTV, EmbedSports, WatchFooty, and more.
        </p>
      </div>
    </div>
  );
}
