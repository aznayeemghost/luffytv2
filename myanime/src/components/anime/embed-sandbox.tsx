"use client";

import { useState, useRef, useEffect } from "react";
import Hls from "hls.js";

// ============================================================
// EMBED SANDBOX — Test all 3 embed providers with AniList ID
// Providers: TryEmbed, MegaPlay Embed, MegaPlay Decryptor
// ============================================================

type Provider = "tryembed" | "megaplay-embed" | "megaplay-decryptor";
type LangType = "sub" | "dub";

interface ProviderInfo {
  id: Provider;
  name: string;
  type: "iframe" | "native";
  color: string;
  description: string;
  getUrl: (anilistId: number, episode: number, lang: LangType) => string;
}

const PROVIDERS: ProviderInfo[] = [
  {
    id: "tryembed",
    name: "TryEmbed",
    type: "iframe",
    color: "#10B981",
    description: "Iframe embed — Zero ads, auto-skip intro/outro, PostMessage API for play/pause/seek/volume",
    getUrl: (id, ep, lang) => `https://tryembed.us.cc/embed/anime/${id}/${ep}/${lang}?autoplay=true&autoSkip=true`,
  },
  {
    id: "megaplay-embed",
    name: "MegaPlay Embed",
    type: "iframe",
    color: "#F59E0B",
    description: "Iframe embed — Requires referrer, PostMessage events for time/complete/error, supports sub/dub/hindi",
    getUrl: (id, ep, lang) => `https://megaplay.buzz/stream/ani/${id}/${ep}/${lang}`,
  },
  {
    id: "megaplay-decryptor",
    name: "MegaPlay Decryptor",
    type: "native",
    color: "#a855f7",
    description: "REST API — Returns direct m3u8 URL, subtitle tracks (VTT), intro/outro skip timestamps",
    getUrl: (id, ep, lang) => `/api/megaplay/stream?aniId=${id}&epNum=${ep}&lang=${lang}`,
  },
];

// Popular anime for quick testing
const QUICK_PICKS = [
  { id: 154587, name: "Frieren: Beyond Journey's End" },
  { id: 172463, name: "Solo Leveling" },
  { id: 16498, name: "Attack on Titan" },
  { id: 1015, name: "Dragon Ball Z" },
  { id: 51009, name: "Spy x Family" },
  { id: 21, name: "One Piece" },
  { id: 1, name: "Cowboy Bebop" },
  { id: 11061, name: "Hunter x Hunter (2011)" },
  { id: 21519, name: "Kimetsu no Yaiba" },
  { id: 99269, name: "Chainsaw Man" },
];

export default function EmbedSandbox() {
  const [anilistId, setAnilistId] = useState(154587);
  const [episode, setEpisode] = useState(1);
  const [lang, setLang] = useState<LangType>("sub");
  const [activeProvider, setActiveProvider] = useState<Provider>("tryembed");
  const [embedUrl, setEmbedUrl] = useState("");
  const [useProxy, setUseProxy] = useState(false);

  // Native player state
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [nativeLoading, setNativeLoading] = useState(false);
  const [nativeError, setNativeError] = useState<string | null>(null);
  const [nativeData, setNativeData] = useState<any>(null);
  const [m3u8Url, setM3u8Url] = useState("");

  const currentProvider = PROVIDERS.find(p => p.id === activeProvider)!;

  // Build embed URL
  const buildUrl = () => {
    return currentProvider.getUrl(anilistId, episode, lang);
  };

  // Load the player
  const loadPlayer = () => {
    const url = buildUrl();

    if (currentProvider.type === "iframe") {
      setEmbedUrl(url);
    } else {
      // Native: fetch from API then play m3u8
      loadNativeStream(url);
    }
  };

  const loadNativeStream = async (apiUrl: string) => {
    setNativeLoading(true);
    setNativeError(null);
    setNativeData(null);
    setM3u8Url("");

    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }

    try {
      const res = await fetch(apiUrl);
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `HTTP ${res.status}`);
      }
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Extraction failed");

      const results = json.results;
      setNativeData(results);
      setM3u8Url(results.m3u8 || "");

      if (results.m3u8 && videoRef.current) {
        const video = videoRef.current;
        if (Hls.isSupported()) {
          const hls = new Hls({ maxBufferLength: 30, maxMaxBufferLength: 60 });
          hls.loadSource(results.m3u8);
          hls.attachMedia(video);
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            video.play().catch(() => {});
          });
          hls.on(Hls.Events.ERROR, (_e, data) => {
            if (data.fatal) setNativeError(`HLS Error: ${data.type}`);
          });
          hlsRef.current = hls;
        } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
          video.src = results.m3u8;
          video.play().catch(() => {});
        }
      }
    } catch (err: any) {
      setNativeError(err.message || "Failed to load stream");
    }
    setNativeLoading(false);
  };

  // Cleanup HLS on unmount
  useEffect(() => {
    return () => {
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    };
  }, []);

  // PostMessage listener for TryEmbed
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "PLAYER_EVENT") {
        console.log("[TryEmbed Event]", e.data.data);
      }
      if (typeof e.data === "string") {
        try {
          const parsed = JSON.parse(e.data);
          if (parsed.channel === "megacloud" || parsed.type === "watching-log") {
            console.log("[MegaPlay Event]", parsed);
          }
        } catch {}
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  return (
    <div className="fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
          <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-black text-white">Embed Sandbox</h1>
          <p className="text-xs text-zinc-500">Test all 3 streaming providers with AniList ID</p>
        </div>
      </div>

      {/* Configuration Panel */}
      <div className="glass-card rounded-xl p-5 space-y-5">
        {/* AniList ID + Episode */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">AniList ID</label>
            <input
              type="number"
              value={anilistId}
              onChange={(e) => setAnilistId(parseInt(e.target.value) || 0)}
              className="w-full bg-[#1a2530] border border-white/[0.08] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500/40 transition-colors"
              placeholder="e.g. 154587"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Episode</label>
            <input
              type="number"
              min={1}
              value={episode}
              onChange={(e) => setEpisode(parseInt(e.target.value) || 1)}
              className="w-full bg-[#1a2530] border border-white/[0.08] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500/40 transition-colors"
              placeholder="1"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Language</label>
            <div className="flex items-center gap-1 bg-[#1a2530] rounded-lg p-1 border border-white/[0.08]">
              {(["sub", "dub"] as const).map(l => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`flex-1 py-2 text-[11px] font-bold rounded-md transition-all ${
                    lang === l
                      ? l === "sub" ? "bg-cyan-500/15 text-cyan-300" : "bg-violet-500/15 text-violet-300"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Pick Anime */}
        <div>
          <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Quick Pick</label>
          <div className="flex flex-wrap gap-2">
            {QUICK_PICKS.map(pick => (
              <button
                key={pick.id}
                onClick={() => { setAnilistId(pick.id); setEpisode(1); }}
                className={`px-3 py-1.5 text-[10px] font-semibold rounded-full border transition-all ${
                  anilistId === pick.id
                    ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/25"
                    : "bg-white/[0.03] text-zinc-400 border-white/[0.06] hover:bg-white/[0.06] hover:text-zinc-300"
                }`}
              >
                {pick.name}
                <span className="ml-1 text-zinc-600">#{pick.id}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Provider Selection */}
        <div>
          <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Provider</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {PROVIDERS.map(provider => (
              <button
                key={provider.id}
                onClick={() => {
                  setActiveProvider(provider.id);
                  setEmbedUrl("");
                  setNativeData(null);
                  setM3u8Url("");
                  setNativeError(null);
                }}
                className={`p-4 rounded-xl border text-left transition-all ${
                  activeProvider === provider.id
                    ? "border-cyan-500/30 bg-cyan-500/[0.04]"
                    : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: provider.color }} />
                  <span className="text-sm font-bold text-white">{provider.name}</span>
                  <span className={`ml-auto text-[8px] font-bold px-1.5 py-0.5 rounded-full ${
                    provider.type === "iframe" ? "bg-blue-500/15 text-blue-300" : "bg-purple-500/15 text-purple-300"
                  }`}>
                    {provider.type.toUpperCase()}
                  </span>
                </div>
                <p className="text-[10px] text-zinc-500 leading-relaxed line-clamp-2">{provider.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Load Button + Proxy Toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={loadPlayer}
            className="pill-btn pill-btn-primary text-sm"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
            Load Stream
          </button>
          {currentProvider.type === "iframe" && (
            <button
              onClick={() => setUseProxy(!useProxy)}
              className={`text-[10px] font-bold py-2 px-3 rounded-full transition-all ${
                useProxy
                  ? "bg-amber-500/15 text-amber-300 border border-amber-500/25"
                  : "bg-white/[0.04] text-zinc-400 border border-white/[0.06]"
              }`}
            >
              {useProxy ? "Proxy Mode ON" : "Direct Embed"}
            </button>
          )}
        </div>

        {/* Generated URL Preview */}
        <div>
          <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Generated URL</label>
          <div className="bg-[#0b1116] rounded-lg px-4 py-3 border border-white/[0.06]">
            <code className="text-[11px] text-cyan-400/80 break-all">{buildUrl()}</code>
          </div>
        </div>
      </div>

      {/* Player Area */}
      <div className="space-y-4">
        {/* Iframe Player */}
        {currentProvider.type === "iframe" && embedUrl && (
          <div className="relative bg-black overflow-hidden aspect-video rounded-2xl border border-white/[0.06] shadow-2xl shadow-black/50">
            <iframe
              key={`${embedUrl}-${useProxy}`}
              src={useProxy ? `/api/embed/proxy?url=${encodeURIComponent(embedUrl)}` : embedUrl}
              className="w-full h-full border-0"
              allowFullScreen
              allow="autoplay; fullscreen; picture-in-picture; encrypted-media; screen-wake-lock; clipboard-write; document-domain"
              referrerPolicy="no-referrer"
              title={`${currentProvider.name} - AniList ${anilistId} EP${episode}`}
            />
          </div>
        )}

        {/* Native HLS Player (MegaPlay Decryptor) */}
        {currentProvider.type === "native" && (
          <div className="relative bg-black overflow-hidden aspect-video rounded-2xl border border-white/[0.06] shadow-2xl shadow-black/50">
            <video
              ref={videoRef}
              className="w-full h-full"
              controls
              playsInline
              autoPlay
            />
            {nativeLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
                <div className="text-center space-y-3">
                  <div className="w-12 h-12 rounded-full border-2 border-purple-500/20 border-t-purple-500/60 animate-spin mx-auto" />
                  <p className="text-purple-300/60 text-xs font-medium">Extracting stream from MegaPlay...</p>
                </div>
              </div>
            )}
            {nativeError && !nativeLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
                <div className="text-center space-y-3 max-w-sm px-6">
                  <svg className="w-8 h-8 text-rose-400/60 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-zinc-300 text-sm">{nativeError}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Native API Response Data (MegaPlay Decryptor only) */}
        {currentProvider.id === "megaplay-decryptor" && nativeData && (
          <div className="glass-card rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              MegaPlay Decryptor Response
            </h3>

            {/* Stream Info Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {m3u8Url && (
                <div className="bg-[#0b1116] rounded-lg p-3 border border-white/[0.06]">
                  <p className="text-[9px] text-zinc-600 uppercase tracking-wider font-semibold mb-1">M3U8 Stream</p>
                  <p className="text-[10px] text-emerald-400 truncate">{m3u8Url.slice(0, 40)}...</p>
                </div>
              )}
              {nativeData.embedUrl && (
                <div className="bg-[#0b1116] rounded-lg p-3 border border-white/[0.06]">
                  <p className="text-[9px] text-zinc-600 uppercase tracking-wider font-semibold mb-1">Embed URL</p>
                  <p className="text-[10px] text-amber-400 truncate">{nativeData.embedUrl.slice(0, 40)}...</p>
                </div>
              )}
              {nativeData.intro && (
                <div className="bg-[#0b1116] rounded-lg p-3 border border-white/[0.06]">
                  <p className="text-[9px] text-zinc-600 uppercase tracking-wider font-semibold mb-1">Intro Skip</p>
                  <p className="text-[10px] text-cyan-400">{nativeData.intro.start}s → {nativeData.intro.end}s</p>
                </div>
              )}
              {nativeData.outro && (
                <div className="bg-[#0b1116] rounded-lg p-3 border border-white/[0.06]">
                  <p className="text-[9px] text-zinc-600 uppercase tracking-wider font-semibold mb-1">Outro Skip</p>
                  <p className="text-[10px] text-cyan-400">{nativeData.outro.start}s → {nativeData.outro.end}s</p>
                </div>
              )}
            </div>

            {/* Subtitle Tracks */}
            {nativeData.tracks && nativeData.tracks.length > 0 && (
              <div>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mb-2">Subtitle Tracks ({nativeData.tracks.length})</p>
                <div className="flex flex-wrap gap-2">
                  {nativeData.tracks.map((track: any, i: number) => (
                    <span key={i} className="px-2.5 py-1 text-[9px] font-semibold rounded-full bg-violet-500/10 text-violet-300 border border-violet-500/15">
                      {track.label || track.kind || `Track ${i + 1}`}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Raw JSON */}
            <details className="group">
              <summary className="text-[10px] text-zinc-600 cursor-pointer hover:text-zinc-400 transition-colors">
                Raw JSON Response ▾
              </summary>
              <pre className="mt-2 bg-[#0b1116] rounded-lg p-4 text-[10px] text-zinc-400 overflow-auto max-h-64 border border-white/[0.06]">
                {JSON.stringify(nativeData, null, 2)}
              </pre>
            </details>
          </div>
        )}

        {/* Placeholder when no stream loaded */}
        {(!embedUrl && currentProvider.type === "iframe") && (
          <div className="bg-[#131c26] aspect-video rounded-2xl border border-white/[0.04] flex items-center justify-center">
            <div className="text-center space-y-3">
              <svg className="w-16 h-16 text-zinc-700 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-zinc-500 text-sm font-medium">No stream loaded</p>
                <p className="text-zinc-600 text-xs">Configure settings above and click Load Stream</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Provider Reference Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PROVIDERS.map(provider => (
          <div
            key={provider.id}
            className={`glass-card rounded-xl p-4 border transition-all ${
              activeProvider === provider.id ? "border-cyan-500/20" : "border-white/[0.04]"
            }`}
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: provider.color }} />
              <h3 className="text-sm font-bold text-white">{provider.name}</h3>
            </div>
            <div className="space-y-1.5 text-[10px]">
              {provider.id === "tryembed" && (
                <>
                  <p className="text-zinc-400"><span className="text-zinc-600">URL:</span> tryembed.us.cc/embed/anime/{"{id}"}/{"{ep}"}/{"{lang}"}</p>
                  <p className="text-zinc-400"><span className="text-zinc-600">Lang:</span> sub, dub</p>
                  <p className="text-zinc-400"><span className="text-zinc-600">Auth:</span> None</p>
                  <p className="text-zinc-400"><span className="text-zinc-600">Features:</span> Zero ads, auto-skip, PostMessage API</p>
                  <p className="text-zinc-400"><span className="text-zinc-600">Params:</span> autoplay, autoSkip, autoNext, startAt, lang-type</p>
                </>
              )}
              {provider.id === "megaplay-embed" && (
                <>
                  <p className="text-zinc-400"><span className="text-zinc-600">URL:</span> megaplay.buzz/stream/ani/{"{id}"}/{"{ep}"}/{"{lang}"}</p>
                  <p className="text-zinc-400"><span className="text-zinc-600">Lang:</span> sub, dub, hindi</p>
                  <p className="text-zinc-400"><span className="text-zinc-600">Auth:</span> None (must be iframe embedded)</p>
                  <p className="text-zinc-400"><span className="text-zinc-600">Note:</span> Direct browser access blocked</p>
                  <p className="text-zinc-400"><span className="text-zinc-600">Events:</span> megacloud channel, watching-log</p>
                </>
              )}
              {provider.id === "megaplay-decryptor" && (
                <>
                  <p className="text-zinc-400"><span className="text-zinc-600">API:</span> megaplaydecryptor.vercel.app/api/stream</p>
                  <p className="text-zinc-400"><span className="text-zinc-600">Params:</span> aniId, epNum, lang (sub/dub)</p>
                  <p className="text-zinc-400"><span className="text-zinc-600">Returns:</span> m3u8, tracks[], intro, outro</p>
                  <p className="text-zinc-400"><span className="text-zinc-600">Player:</span> hls.js required for m3u8</p>
                  <p className="text-zinc-400"><span className="text-zinc-600">Rate:</span> 90 req/min (AniList proxy)</p>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
