"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Hls from "hls.js";
import {
  getAnimeServers, getEmbedUrl, type EmbedServer, type EmbedUrlParams,
} from "@/lib/embed-servers";
import { lookupAniList, searchAniList, lookupAniListLocal, type AniListMapping } from "@/lib/anilist-mapper";

// ============================================================
// EMBED SANDBOX — Test ALL streaming providers with AniList ID
// Includes: Kiwi (native), MegaPlay Decryptor (native),
//   VidNest, VidEasy, MegaPlay Embed, TryEmbed, VidPlus,
//   AnixTV Hindi — with AniList mapper for title/season lookup
// ============================================================

type LangType = "sub" | "dub" | "hindi";

interface ProviderInfo {
  id: string;
  name: string;
  type: "iframe" | "native";
  color: string;
  description: string;
  languages: LangType[];
  requiresTitle?: boolean;
}

// Provider metadata — matches embed-servers.ts definitions
const PROVIDERS: ProviderInfo[] = [
  {
    id: "miruro-kiwi",
    name: "Miruro Kiwi",
    type: "native",
    color: "#00ff88",
    description: "Direct HLS — Miruro Kiwi provider, best quality with multi-source support",
    languages: ["sub", "dub"],
  },
  {
    id: "megaplay-decryptor",
    name: "MegaPlay Decryptor",
    type: "native",
    color: "#a855f7",
    description: "REST API — Returns direct m3u8 URL, subtitle tracks (VTT), intro/outro skip timestamps",
    languages: ["sub", "dub"],
  },
  {
    id: "vidnest-anime",
    name: "VidNest",
    type: "iframe",
    color: "#8B5CF6",
    description: "Iframe embed — VidNest anime server, supports sub/dub/hindi",
    languages: ["sub", "dub", "hindi"],
  },
  {
    id: "vidnest-animepahe",
    name: "VidNest Animepahe",
    type: "iframe",
    color: "#A855F7",
    description: "Iframe embed — VidNest via Animepahe source, supports sub/dub/hindi",
    languages: ["sub", "dub", "hindi"],
  },
  {
    id: "videasy-anime",
    name: "VidEasy",
    type: "iframe",
    color: "#00A8E1",
    description: "Iframe embed — VidEasy anime player, auto-provides sub & dub tracks",
    languages: ["sub", "dub"],
  },
  {
    id: "megaplay-embed",
    name: "MegaPlay Embed",
    type: "iframe",
    color: "#F59E0B",
    description: "Iframe embed — MegaPlay iframe, supports sub/dub/hindi, requires referrer",
    languages: ["sub", "dub", "hindi"],
  },
  {
    id: "tryembed",
    name: "TryEmbed",
    type: "iframe",
    color: "#10B981",
    description: "Iframe embed — Zero ads, auto-skip intro/outro, PostMessage API",
    languages: ["sub", "dub"],
  },
  {
    id: "vidplus-anime",
    name: "VidPlus",
    type: "iframe",
    color: "#EC4899",
    description: "Iframe embed — VidPlus anime, supports sub/dub with Netflix-style icons",
    languages: ["sub", "dub"],
  },
  {
    id: "anixtv-hindi",
    name: "AnixTV Hindi",
    type: "iframe",
    color: "#FF6B35",
    description: "Iframe embed — AnixTV Hindi dubbed anime, requires anime title for URL",
    languages: ["hindi"],
    requiresTitle: true,
  },
];

// Quick pick anime — popular choices with known AniList IDs and titles
const QUICK_PICKS: { id: number; name: string; hasHindi?: boolean }[] = [
  { id: 154587, name: "Frieren", hasHindi: false },
  { id: 172463, name: "Solo Leveling", hasHindi: false },
  { id: 16498, name: "Attack on Titan", hasHindi: true },
  { id: 1535, name: "Death Note", hasHindi: true },
  { id: 51009, name: "Spy x Family", hasHindi: true },
  { id: 21, name: "One Piece", hasHindi: true },
  { id: 1, name: "Cowboy Bebop", hasHindi: false },
  { id: 11061, name: "Hunter x Hunter", hasHindi: true },
  { id: 21519, name: "One-Punch Man", hasHindi: false },
  { id: 99269, name: "Chainsaw Man", hasHindi: true },
  { id: 40748, name: "Jujutsu Kaisen", hasHindi: true },
  { id: 31964, name: "My Hero Academia", hasHindi: true },
  { id: 7442, name: "Bleach", hasHindi: true },
  { id: 38000, name: "Demon Slayer", hasHindi: true },
  { id: 10165, name: "Naruto Shippuden", hasHindi: true },
  { id: 20, name: "Naruto", hasHindi: true },
];

export default function EmbedSandbox() {
  // Config state
  const [anilistId, setAnilistId] = useState(1535);
  const [episode, setEpisode] = useState(1);
  const [season, setSeason] = useState(1);
  const [lang, setLang] = useState<LangType>("sub");
  const [animeTitle, setAnimeTitle] = useState("Death Note");
  const [activeProvider, setActiveProvider] = useState<string>("vidnest-anime");
  const [embedUrl, setEmbedUrl] = useState("");
  const [useProxy, setUseProxy] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<AniListMapping[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Title lookup state
  const [titleLookupLoading, setTitleLookupLoading] = useState(false);
  const [titleLookupSource, setTitleLookupSource] = useState<string>("");

  // Native player state
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [nativeLoading, setNativeLoading] = useState(false);
  const [nativeError, setNativeError] = useState<string | null>(null);
  const [nativeData, setNativeData] = useState<any>(null);
  const [m3u8Url, setM3u8Url] = useState("");

  const currentProvider = PROVIDERS.find(p => p.id === activeProvider)!;

  // ── AniList title mapper ──────────────────────────────────────────────
  // When anilistId changes, look up the title for URL generation

  const lookupTitle = useCallback(async (id: number) => {
    // Check local index first (instant)
    const local = lookupAniListLocal(id);
    if (local) {
      setAnimeTitle(local.titleEnglish || local.title);
      setSeason(local.season || 1);
      setTitleLookupSource("local index");
      return;
    }

    // Fall back to AniList API
    setTitleLookupLoading(true);
    try {
      const mapping = await lookupAniList(id);
      if (mapping) {
        setAnimeTitle(mapping.titleEnglish || mapping.title);
        setSeason(mapping.season || 1);
        setTitleLookupSource("AniList API");
      } else {
        setAnimeTitle(`Anime-${id}`);
        setTitleLookupSource("fallback");
      }
    } catch {
      setAnimeTitle(`Anime-${id}`);
      setTitleLookupSource("error");
    }
    setTitleLookupLoading(false);
  }, []);

  // Auto-lookup title when ID changes
  useEffect(() => {
    lookupTitle(anilistId);
  }, [anilistId, lookupTitle]);

  // ── Search anime ──────────────────────────────────────────────────────

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    try {
      const results = await searchAniList(query);
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    }
    setSearchLoading(false);
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        handleSearch(searchQuery);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, handleSearch]);

  // ── Build embed URL ───────────────────────────────────────────────────

  const buildUrl = useCallback((): string => {
    // Use the embed-servers.ts system for consistency
    const params: EmbedUrlParams = {
      anilistId,
      episode,
      season,
      translation: lang,
      title: animeTitle,
    };

    if (currentProvider.type === "native") {
      // Native servers use special markers
      if (activeProvider === "miruro-kiwi") {
        return `/api/miruro/watch?provider=kiwi&id=${anilistId}&type=${lang}&slug=${episode}`;
      }
      if (activeProvider === "megaplay-decryptor") {
        const mpLang = lang === "hindi" ? "sub" : lang;
        return `/api/megaplay/stream?aniId=${anilistId}&epNum=${episode}&lang=${mpLang}`;
      }
    }

    return getEmbedUrl(activeProvider, params);
  }, [anilistId, episode, season, lang, animeTitle, activeProvider, currentProvider]);

  // ── Load player ───────────────────────────────────────────────────────

  const loadPlayer = useCallback(() => {
    const url = buildUrl();

    if (currentProvider.type === "iframe") {
      if (!url) {
        setNativeError("Could not generate URL — check that the anime ID and language are supported by this provider.");
        return;
      }
      setEmbedUrl(url);
      setNativeData(null);
      setM3u8Url("");
      setNativeError(null);
    } else {
      // Native: fetch from API then play m3u8
      setEmbedUrl("");
      loadNativeStream(url);
    }
  }, [buildUrl, currentProvider]);

  const loadNativeStream = useCallback(async (apiUrl: string) => {
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

      // MegaPlay Decryptor format
      if (json.success === false) throw new Error(json.error || "Extraction failed");
      if (json.results?.m3u8) {
        const results = json.results;
        setNativeData(results);
        setM3u8Url(results.m3u8);

        if (results.m3u8 && videoRef.current) {
          const video = videoRef.current;
          if (Hls.isSupported()) {
            const hls = new Hls({ maxBufferLength: 30, maxMaxBufferLength: 60 });
            hls.loadSource(results.m3u8);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, () => { video.play().catch(() => {}); });
            hls.on(Hls.Events.ERROR, (_e, data) => {
              if (data.fatal) setNativeError(`HLS Error: ${data.type}`);
            });
            hlsRef.current = hls;
          } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
            video.src = results.m3u8;
            video.play().catch(() => {});
          }
        }
      }
      // Miruro Kiwi format
      else if (json.data?.sources || json.sources) {
        const data = json.data || json;
        const source = data.sources?.[0];
        if (source?.url && videoRef.current) {
          const video = videoRef.current;
          if (Hls.isSupported()) {
            const hls = new Hls({ maxBufferLength: 30, maxMaxBufferLength: 60 });
            hls.loadSource(source.url);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, () => { video.play().catch(() => {}); });
            hls.on(Hls.Events.ERROR, (_e, data) => {
              if (data.fatal) setNativeError(`HLS Error: ${data.type}`);
            });
            hlsRef.current = hls;
          } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
            video.src = source.url;
            video.play().catch(() => {});
          }
          setNativeData(data);
          setM3u8Url(source.url);
        } else {
          throw new Error("No stream sources available");
        }
      } else {
        throw new Error("Unexpected API response format");
      }
    } catch (err: any) {
      setNativeError(err.message || "Failed to load stream");
    }
    setNativeLoading(false);
  }, []);

  // Cleanup HLS on unmount
  useEffect(() => {
    return () => {
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    };
  }, []);

  // ── PostMessage listener ──────────────────────────────────────────────

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

  // ── Filter providers by selected language ─────────────────────────────

  const availableProviders = PROVIDERS.filter(p => p.languages.includes(lang));

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
          <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-black text-white">Embed Sandbox</h1>
          <p className="text-xs text-zinc-500">Test ALL streaming providers with AniList ID — includes Hindi</p>
        </div>
      </div>

      {/* Configuration Panel */}
      <div className="glass-card rounded-xl p-5 space-y-5">
        {/* AniList ID + Episode + Season */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">AniList ID</label>
            <input
              type="number"
              value={anilistId}
              onChange={(e) => setAnilistId(parseInt(e.target.value) || 0)}
              className="w-full bg-[#1a2530] border border-white/[0.08] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500/40 transition-colors"
              placeholder="e.g. 1535"
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
            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Season</label>
            <input
              type="number"
              min={1}
              value={season}
              onChange={(e) => setSeason(parseInt(e.target.value) || 1)}
              className="w-full bg-[#1a2530] border border-white/[0.08] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500/40 transition-colors"
              placeholder="1"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Language</label>
            <div className="flex items-center gap-1 bg-[#1a2530] rounded-lg p-1 border border-white/[0.08]">
              {(["sub", "dub", "hindi"] as const).map(l => (
                <button
                  key={l}
                  onClick={() => {
                    setLang(l);
                    // Reset provider if current doesn't support this language
                    const stillValid = PROVIDERS.find(p => p.id === activeProvider)?.languages.includes(l);
                    if (!stillValid) {
                      const firstAvailable = PROVIDERS.find(p => p.languages.includes(l));
                      if (firstAvailable) setActiveProvider(firstAvailable.id);
                    }
                  }}
                  className={`flex-1 py-2 text-[11px] font-bold rounded-md transition-all ${
                    lang === l
                      ? l === "sub" ? "bg-cyan-500/15 text-cyan-300" : l === "dub" ? "bg-violet-500/15 text-violet-300" : "bg-orange-500/15 text-orange-300"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {l === "hindi" ? "🇮🇳 HINDI" : l.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* AniList Mapper: Title Lookup */}
        <div className="bg-[#0b1116] rounded-lg p-4 border border-white/[0.06] space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              AniList Mapper — Title Lookup
            </h3>
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
              titleLookupLoading
                ? "bg-yellow-500/15 text-yellow-300"
                : titleLookupSource === "local index"
                  ? "bg-emerald-500/15 text-emerald-300"
                  : titleLookupSource === "AniList API"
                    ? "bg-cyan-500/15 text-cyan-300"
                    : "bg-zinc-500/15 text-zinc-400"
            }`}>
              {titleLookupLoading ? "Looking up..." : titleLookupSource || "idle"}
            </span>
          </div>

          {/* Title display */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="block text-[9px] text-zinc-600 mb-1">Resolved Title</label>
              <input
                type="text"
                value={animeTitle}
                onChange={(e) => setAnimeTitle(e.target.value)}
                className="w-full bg-[#131c26] border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500/40 transition-colors"
                placeholder="Anime title (auto-filled or manual)"
              />
            </div>
            <button
              onClick={() => lookupTitle(anilistId)}
              disabled={titleLookupLoading}
              className="mt-4 px-3 py-2 text-[10px] font-bold rounded-lg bg-orange-500/10 text-orange-300 hover:bg-orange-500/20 border border-orange-500/15 transition-all disabled:opacity-50"
            >
              Re-fetch
            </button>
          </div>

          {/* Search anime */}
          <div>
            <label className="block text-[9px] text-zinc-600 mb-1">Search Anime</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#131c26] border border-white/[0.06] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/40 transition-colors"
              placeholder="Type anime name to search AniList..."
            />
            {searchLoading && (
              <div className="flex items-center gap-2 mt-2">
                <div className="w-3 h-3 rounded-full border border-cyan-500/20 border-t-cyan-500/60 animate-spin" />
                <span className="text-[10px] text-zinc-500">Searching AniList...</span>
              </div>
            )}
            {searchResults.length > 0 && (
              <div className="mt-2 max-h-40 overflow-y-auto rounded-lg bg-[#0b1116] border border-white/[0.04]">
                {searchResults.map((result) => (
                  <button
                    key={result.id}
                    onClick={() => {
                      setAnilistId(result.id);
                      setAnimeTitle(result.titleEnglish || result.title);
                      setSearchQuery("");
                      setSearchResults([]);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-white/[0.04] transition-colors border-b border-white/[0.03] last:border-0"
                  >
                    <span className="text-[10px] font-bold text-cyan-400 shrink-0">#{result.id}</span>
                    <span className="text-[11px] text-white truncate flex-1">{result.title}</span>
                    {result.type && (
                      <span className="text-[9px] text-zinc-500 shrink-0">{result.type}</span>
                    )}
                    {result.episodes && (
                      <span className="text-[9px] text-zinc-600 shrink-0">{result.episodes} eps</span>
                    )}
                  </button>
                ))}
              </div>
            )}
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
                {pick.hasHindi && <span className="ml-1 text-orange-400/60">🇮🇳</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Provider Selection */}
        <div>
          <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">
            Provider
            <span className="text-zinc-600 ml-2">({availableProviders.length} available for {lang.toUpperCase()})</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {availableProviders.map(provider => (
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
                <div className="flex items-center gap-1.5 mt-2">
                  {provider.languages.map(l => (
                    <span key={l} className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${
                      l === "sub" ? "bg-cyan-500/10 text-cyan-400" :
                      l === "dub" ? "bg-violet-500/10 text-violet-400" :
                      "bg-orange-500/10 text-orange-400"
                    }`}>
                      {l === "hindi" ? "🇮🇳" : l.toUpperCase()}
                    </span>
                  ))}
                  {provider.requiresTitle && (
                    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400">
                      NEEDS TITLE
                    </span>
                  )}
                </div>
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
            <code className="text-[11px] text-cyan-400/80 break-all">{buildUrl() || "—"}</code>
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
              title={`${currentProvider.name} - ${animeTitle} EP${episode}`}
            />
          </div>
        )}

        {/* Native HLS Player */}
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
                  <p className="text-purple-300/60 text-xs font-medium">Extracting stream...</p>
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

        {/* Native API Response Data */}
        {currentProvider.type === "native" && nativeData && (
          <div className="glass-card rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              API Response Data
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {m3u8Url && (
                <div className="bg-[#0b1116] rounded-lg p-3 border border-white/[0.06]">
                  <p className="text-[9px] text-zinc-600 uppercase tracking-wider font-semibold mb-1">M3U8 Stream</p>
                  <p className="text-[10px] text-emerald-400 truncate">{m3u8Url.slice(0, 40)}...</p>
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

      {/* Provider Reference Cards — ALL providers */}
      <div>
        <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          Provider Reference
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                <span className={`ml-auto text-[8px] font-bold px-1.5 py-0.5 rounded-full ${
                  provider.type === "iframe" ? "bg-blue-500/15 text-blue-300" : "bg-purple-500/15 text-purple-300"
                }`}>
                  {provider.type.toUpperCase()}
                </span>
              </div>
              <div className="space-y-1.5 text-[10px]">
                {provider.id === "miruro-kiwi" && (
                  <>
                    <p className="text-zinc-400"><span className="text-zinc-600">API:</span> /api/miruro/watch?provider=kiwi</p>
                    <p className="text-zinc-400"><span className="text-zinc-600">Lang:</span> sub, dub</p>
                    <p className="text-zinc-400"><span className="text-zinc-600">Player:</span> hls.js required</p>
                    <p className="text-zinc-400"><span className="text-zinc-600">Features:</span> Multi-source, quality selector, subtitles</p>
                  </>
                )}
                {provider.id === "megaplay-decryptor" && (
                  <>
                    <p className="text-zinc-400"><span className="text-zinc-600">API:</span> megaplaydecryptor.vercel.app/api/stream</p>
                    <p className="text-zinc-400"><span className="text-zinc-600">Params:</span> aniId, epNum, lang (sub/dub)</p>
                    <p className="text-zinc-400"><span className="text-zinc-600">Returns:</span> m3u8, tracks[], intro, outro</p>
                    <p className="text-zinc-400"><span className="text-zinc-600">Rate:</span> 90 req/min</p>
                  </>
                )}
                {provider.id === "vidnest-anime" && (
                  <>
                    <p className="text-zinc-400"><span className="text-zinc-600">URL:</span> vidnest.fun/anime/{"{id}"}/{"{ep}"}/{"{lang}"}</p>
                    <p className="text-zinc-400"><span className="text-zinc-600">Lang:</span> sub, dub, hindi</p>
                    <p className="text-zinc-400"><span className="text-zinc-600">Type:</span> Iframe embed</p>
                  </>
                )}
                {provider.id === "vidnest-animepahe" && (
                  <>
                    <p className="text-zinc-400"><span className="text-zinc-600">URL:</span> vidnest.fun/animepahe/{"{id}"}/{"{ep}"}/{"{lang}"}</p>
                    <p className="text-zinc-400"><span className="text-zinc-600">Lang:</span> sub, dub, hindi</p>
                    <p className="text-zinc-400"><span className="text-zinc-600">Type:</span> Iframe embed (Animepahe source)</p>
                  </>
                )}
                {provider.id === "videasy-anime" && (
                  <>
                    <p className="text-zinc-400"><span className="text-zinc-600">URL:</span> player.videasy.net/anime/{"{id}"}/{"{ep}"}</p>
                    <p className="text-zinc-400"><span className="text-zinc-600">Lang:</span> sub, dub (auto)</p>
                    <p className="text-zinc-400"><span className="text-zinc-600">Params:</span> nextEpisode, autoplayNextEpisode, dub</p>
                  </>
                )}
                {provider.id === "megaplay-embed" && (
                  <>
                    <p className="text-zinc-400"><span className="text-zinc-600">URL:</span> megaplay.buzz/stream/ani/{"{id}"}/{"{ep}"}/{"{lang}"}</p>
                    <p className="text-zinc-400"><span className="text-zinc-600">Lang:</span> sub, dub, hindi</p>
                    <p className="text-zinc-400"><span className="text-zinc-600">Note:</span> Requires iframe referrer</p>
                    <p className="text-zinc-400"><span className="text-zinc-600">Events:</span> megacloud channel</p>
                  </>
                )}
                {provider.id === "tryembed" && (
                  <>
                    <p className="text-zinc-400"><span className="text-zinc-600">URL:</span> tryembed.us.cc/embed/anime/{"{id}"}/{"{ep}"}/{"{lang}"}</p>
                    <p className="text-zinc-400"><span className="text-zinc-600">Lang:</span> sub, dub</p>
                    <p className="text-zinc-400"><span className="text-zinc-600">Features:</span> Zero ads, auto-skip, PostMessage API</p>
                  </>
                )}
                {provider.id === "vidplus-anime" && (
                  <>
                    <p className="text-zinc-400"><span className="text-zinc-600">URL:</span> player.vidplus.to/embed/anime/{"{id}"}/{"{ep}"}</p>
                    <p className="text-zinc-400"><span className="text-zinc-600">Lang:</span> sub, dub (via ?dub=true)</p>
                    <p className="text-zinc-400"><span className="text-zinc-600">Features:</span> Netflix-style icons, episode list, poster</p>
                  </>
                )}
                {provider.id === "anixtv-hindi" && (
                  <>
                    <p className="text-zinc-400"><span className="text-zinc-600">URL:</span> anixtv.in/anime-watch?action=hindi_1_player</p>
                    <p className="text-zinc-400"><span className="text-zinc-600">Params:</span> id, season, episode, title</p>
                    <p className="text-zinc-400"><span className="text-zinc-600">Lang:</span> Hindi only</p>
                    <p className="text-zinc-400"><span className="text-zinc-600">Requires:</span> Anime title for URL (uses mapper)</p>
                  </>
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-3">
                {provider.languages.map(l => (
                  <span key={l} className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${
                    l === "sub" ? "bg-cyan-500/10 text-cyan-400" :
                    l === "dub" ? "bg-violet-500/10 text-violet-400" :
                    "bg-orange-500/10 text-orange-400"
                  }`}>
                    {l === "hindi" ? "🇮🇳 HINDI" : l.toUpperCase()}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
