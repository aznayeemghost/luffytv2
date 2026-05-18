"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAppStore } from "./store";
import { getAnimeServers, type EmbedServer } from "@/lib/embed-servers";
import Hls from "hls.js";

interface WatchPageProps {
  animeId: string;
  episodeNum: number;
}

interface StreamSource {
  url: string;
  quality?: string;
  isM3U8?: boolean;
  sourceName?: string;
  sourceType?: "internal" | "external";
  provider?: string;
  type?: string;
}

interface ServerInfo {
  id: string;
  name: string;
  url: string;
  color: string;
  icon?: string;
  idType: "tmdb" | "anilist" | "native";
  supportsSub: boolean;
  supportsDub: boolean;
  supportsHindi: boolean;
  category: "anime" | "tmdb" | "hindi" | "native";
  isNative?: boolean;
  customName?: string;
}

interface SkipData {
  intro?: { start: number; end: number };
  outro?: { start: number; end: number };
}

interface SubtitleTrack {
  file: string;
  label: string;
  kind: string;
}

const MAX_LOAD_TIME = 25000;
type TranslationType = "sub" | "dub" | "hindi";

export default function WatchPage({ animeId, episodeNum }: WatchPageProps) {
  const navigate = useAppStore(s => s.navigate);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const loadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const iframeLoadTimer = useRef<NodeJS.Timeout | null>(null);
  const skipCheckRef = useRef<NodeJS.Timeout | null>(null);

  const [useDirectEmbed, setUseDirectEmbed] = useState(true);
  const [useNativePlayer, setUseNativePlayer] = useState(false);
  const [kiwiLoading, setKiwiLoading] = useState(false);
  const [servers, setServers] = useState<ServerInfo[]>([]);
  const [activeServerId, setActiveServerId] = useState<string>("");
  const [embedUrl, setEmbedUrl] = useState<string>("");
  const [sources, setSources] = useState<StreamSource[]>([]);
  const [internalSources, setInternalSources] = useState<StreamSource[]>([]);
  const [externalSources, setExternalSources] = useState<StreamSource[]>([]);
  const [currentSource, setCurrentSource] = useState(0);
  const [sourceTab, setSourceTab] = useState<"internal" | "external">("internal");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [translation, setTranslation] = useState<TranslationType>("sub");
  const [episodeList, setEpisodeList] = useState<Array<{ number: number; slug: string }>>([]);
  const [animeTitle, setAnimeTitle] = useState("");
  const [animeImage, setAnimeImage] = useState("");
  const [animeDescription, setAnimeDescription] = useState("");
  const [anilistId, setAnilistId] = useState<number | null>(null);
  const [tmdbSeason, setTmdbSeason] = useState<number | null>(null);
  const [tmdbBackdrop, setTmdbBackdrop] = useState("");
  const [tmdbRating, setTmdbRating] = useState<number | null>(null);
  const [tmdbGenres, setTmdbGenres] = useState<string[]>([]);

  // Enhanced features
  const [skipData, setSkipData] = useState<SkipData>({});
  const [subtitleTracks, setSubtitleTracks] = useState<SubtitleTrack[]>([]);
  const [showSkipButton, setShowSkipButton] = useState<"intro" | "outro" | null>(null);
  const [showServerList, setShowServerList] = useState(false);
  const [hindiDubAvailable, setHindiDubAvailable] = useState<boolean | null>(null); // null = not checked yet

  // Parse anime ID
  useEffect(() => {
    const cleanId = animeId.replace(/^miruro_/, "");
    if (/^\d+$/.test(cleanId)) setAnilistId(parseInt(cleanId));
  }, [animeId]);

  // Load anime info
  useEffect(() => {
    let cancelled = false;
    async function loadInfo() {
      try {
        const res = await fetch(`/api/anime/info?id=${encodeURIComponent(animeId)}`);
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          const anime = data.anime;
          const miruro = data.miruroInfo;
          setAnimeTitle(anime?.englishName || anime?.name || miruro?.title?.english || miruro?.title?.romaji || "");
          setAnimeImage(anime?.thumbnail || miruro?.coverImage?.extraLarge || miruro?.coverImage?.large || "");
          setAnimeDescription(anime?.description || miruro?.description?.replace(/<[^>]*>/g, "") || "");
          if (data.tmdbSeason) setTmdbSeason(data.tmdbSeason);
          else if (data.zenshinMappings?.season?.tmdb) setTmdbSeason(data.zenshinMappings.season.tmdb);
          if (data.tmdbData) {
            if (data.tmdbData.backdropUrl) setTmdbBackdrop(data.tmdbData.backdropUrl);
            else if (data.tmdbData.backdrop_path) setTmdbBackdrop(`https://image.tmdb.org/t/p/w780${data.tmdbData.backdrop_path}`);
            if (data.tmdbData.vote_average) setTmdbRating(data.tmdbData.vote_average);
            if (data.tmdbData.genres) setTmdbGenres(data.tmdbData.genres.map((g: any) => g.name));
          }
        }
      } catch { /* ignore */ }
    }
    loadInfo();
    return () => { cancelled = true; };
  }, [animeId]);

  // Load episodes list
  useEffect(() => {
    let cancelled = false;
    async function loadEps() {
      try {
        const res = await fetch(`/api/anime/episodes?id=${encodeURIComponent(animeId)}`);
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          if (data.episodes?.length) {
            setEpisodeList(data.episodes.map((e: any) => ({ number: e.episodeIdNum, slug: String(e.episodeIdNum) })));
          }
        }
      } catch { /* ignore */ }
    }
    loadEps();
    return () => { cancelled = true; };
  }, [animeId]);

  // Build servers — show ALL servers, don't filter based on translation
  useEffect(() => {
    const animeServers = getAnimeServers();
    const availableServers: ServerInfo[] = [];
    let hasHindiSupport = false;

    for (const server of animeServers) {
      // Show all servers regardless of translation — just mark which are available
      if (server.isNative) {
        if (!anilistId) continue;
        availableServers.push({
          id: server.id, name: server.name, url: server.id === "megaplay-decryptor" ? "native:megaplay" : "native:kiwi",
          color: server.color, idType: "native",
          supportsSub: server.supportsSub, supportsDub: server.supportsDub, supportsHindi: server.supportsHindi,
          category: server.category, isNative: true,
          customName: server.customName,
        });
        if (server.supportsHindi) hasHindiSupport = true;
        continue;
      }

      const url = server.generateUrl({
        anilistId: anilistId || undefined,
        tmdbId: undefined, episode: episodeNum,
        season: tmdbSeason || undefined, translation,
        title: animeTitle || undefined,
      });
      if (url) {
        const isAvailable = translation === "hindi" ? server.supportsHindi
          : translation === "dub" ? (server.supportsDub || server.supportsHindi)
          : server.supportsSub;
        availableServers.push({
          id: server.id, name: server.name, url,
          color: server.color, idType: server.idType,
          supportsSub: server.supportsSub, supportsDub: server.supportsDub, supportsHindi: server.supportsHindi,
          category: server.category, isNative: false,
          customName: server.customName,
        });
        if (server.supportsHindi) hasHindiSupport = true;
      }
    }
    setServers(availableServers);
    setHindiDubAvailable(hasHindiSupport);
    if (availableServers.length > 0) {
      const currentStillValid = availableServers.some(s => s.id === activeServerId);
      if (!currentStillValid) setActiveServerId(availableServers[0].id);
    }
  }, [anilistId, tmdbSeason, episodeNum, translation]);

  // Skip intro/outro checker
  useEffect(() => {
    if (!useNativePlayer || !skipData) return;
    const checkSkip = () => {
      const video = videoRef.current;
      if (!video) return;
      const time = video.currentTime;

      if (skipData.intro && time >= skipData.intro.start && time <= skipData.intro.end) {
        setShowSkipButton("intro");
      } else if (skipData.outro && time >= skipData.outro.start && time <= skipData.outro.end) {
        setShowSkipButton("outro");
      } else {
        setShowSkipButton(null);
      }
    };

    skipCheckRef.current = window.setInterval(checkSkip, 1000);
    return () => { if (skipCheckRef.current) clearInterval(skipCheckRef.current); };
  }, [useNativePlayer, skipData]);

  const skipIntro = useCallback(() => {
    const video = videoRef.current;
    if (video && skipData.intro) {
      video.currentTime = skipData.intro.end;
      setShowSkipButton(null);
    }
  }, [skipData]);

  const skipOutro = useCallback(() => {
    const video = videoRef.current;
    if (video && skipData.outro) {
      video.currentTime = skipData.outro.end;
      setShowSkipButton(null);
    }
  }, [skipData]);

  // When active server changes
  useEffect(() => {
    const server = servers.find(s => s.id === activeServerId);
    if (!server) return;

    // Guard: if Hindi mode and no Hindi servers available, show error
    if (translation === "hindi" && hindiDubAvailable === false) {
      setUseNativePlayer(false);
      setEmbedUrl("");
      setLoading(false);
      setError("Hindi Dub not available for this anime");
      return;
    }

    setUseDirectEmbed(true);
    setSkipData({});
    setSubtitleTracks([]);
    setShowSkipButton(null);
    if (server.isNative) {
      setUseNativePlayer(true);
      if (server.id === "megaplay-decryptor") {
        loadMegaPlayStream();
      } else {
        loadKiwiStream();
      }
    } else {
      setUseNativePlayer(false);
      setEmbedUrl(server.url);
      setLoading(true);
      setError(null);

      if (iframeLoadTimer.current) clearTimeout(iframeLoadTimer.current);
      iframeLoadTimer.current = setTimeout(() => {
        if (loading && !playing) {
          if (useDirectEmbed) {
            setUseDirectEmbed(false);
            setLoading(true);
          } else {
            const currentIdx = servers.findIndex(s => s.id === activeServerId);
            if (currentIdx < servers.length - 1) {
              setActiveServerId(servers[currentIdx + 1].id);
            } else {
              setLoading(false);
              setError("All embed servers failed to load.");
            }
          }
        }
      }, 12000);
    }
  }, [activeServerId, episodeNum, anilistId, translation, hindiDubAvailable]);

  const loadKiwiStream = useCallback(async () => {
    if (!anilistId) return;
    setLoading(true); setError(null); setPlaying(false); setKiwiLoading(true);
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
    loadTimeoutRef.current = setTimeout(() => {
      setLoading(false); setKiwiLoading(false);
      setError("Stream is taking too long. Try another server.");
    }, MAX_LOAD_TIME);

    try {
      const slug = episodeList.find(e => e.number === episodeNum)?.slug || String(episodeNum);
      const url = `/api/miruro/watch?provider=kiwi&id=${anilistId}&type=${translation}&slug=${encodeURIComponent(slug)}`;
      const res = await fetch(url);
      if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
      if (!res.ok) {
        const nextNonNative = servers.find(s => !s.isNative && s.id !== activeServerId);
        if (nextNonNative) { setActiveServerId(nextNonNative.id); return; }
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "No sources found");
      }
      const json = await res.json();
      const data = json.data || json;
      if (!data.sources?.length) {
        const nextNonNative = servers.find(s => !s.isNative && s.id !== activeServerId);
        if (nextNonNative) { setActiveServerId(nextNonNative.id); return; }
        throw new Error("No stream sources available");
      }

      const intSources = data.sources.filter((s: StreamSource) => s.sourceType === "internal" || !s.sourceType);
      const extSources = data.sources.filter((s: StreamSource) => s.sourceType === "external");
      setSources(data.sources); setInternalSources(intSources); setExternalSources(extSources);
      const preferred = intSources.length > 0 ? intSources : extSources;
      setSourceTab(preferred === intSources ? "internal" : "external");
      setCurrentSource(0);

      // Store skip data from Miruro
      if (data.intro || data.outro) {
        setSkipData({ intro: data.intro, outro: data.outro });
      }

      if (preferred.length > 0) playSource(preferred[0], data.headers);
    } catch (err: any) {
      if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
      setError(err.message || "Failed to load stream");
    }
    setLoading(false); setKiwiLoading(false);
  }, [anilistId, episodeNum, translation, episodeList, servers, activeServerId]);

  const loadMegaPlayStream = useCallback(async () => {
    if (!anilistId) return;
    setLoading(true); setError(null); setPlaying(false); setKiwiLoading(true);
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
    loadTimeoutRef.current = setTimeout(() => {
      setLoading(false); setKiwiLoading(false);
      setError("MegaPlay stream is taking too long. Try another server.");
    }, MAX_LOAD_TIME);

    try {
      const lang = translation === "hindi" ? "sub" : translation;
      const url = `/api/megaplay/stream?aniId=${anilistId}&epNum=${episodeNum}&lang=${lang}`;
      const res = await fetch(url);
      if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
      if (!res.ok) {
        const nextNonNative = servers.find(s => !s.isNative && s.id !== activeServerId);
        if (nextNonNative) { setActiveServerId(nextNonNative.id); return; }
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "MegaPlay source not available");
      }
      const json = await res.json();

      if (!json.success) throw new Error(json.error || "MegaPlay extraction failed");
      const results = json.results;
      if (!results?.m3u8) throw new Error("No m3u8 stream found");

      const mpSources: StreamSource[] = [{
        url: results.m3u8,
        quality: "Auto",
        isM3U8: true,
        sourceName: "MegaPlay HLS",
        sourceType: "internal",
        provider: "megaplay-decryptor",
      }];

      setSources(mpSources);
      setInternalSources(mpSources);
      setExternalSources([]);
      setSourceTab("internal");
      setCurrentSource(0);

      // Store skip data from MegaPlay
      if (results.intro || results.outro) {
        setSkipData({ intro: results.intro, outro: results.outro });
      }

      // Store subtitle tracks from MegaPlay
      if (results.tracks?.length) {
        setSubtitleTracks(results.tracks);
      }

      playSource(mpSources[0]);
    } catch (err: any) {
      if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
      setError(err.message || "Failed to load MegaPlay stream");
    }
    setLoading(false); setKiwiLoading(false);
  }, [anilistId, episodeNum, translation, servers, activeServerId]);

  const playSource = useCallback((source: StreamSource, headers?: Record<string, string>) => {
    const video = videoRef.current; if (!video) return;
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    if (source.sourceType === "external") { window.open(source.url, "_blank", "noopener,noreferrer"); return; }
    const url = source.url;
    if (source.isM3U8 || url.includes(".m3u8") || url.includes("/api/stream")) {
      if (Hls.isSupported()) {
        const hls = new Hls({ maxBufferLength: 30, maxMaxBufferLength: 60, startLevel: -1,
          xhrSetup: (xhr) => { if (headers) Object.entries(headers).forEach(([k, v]) => { try { xhr.setRequestHeader(k, v); } catch {} }); },
        });
        hls.loadSource(url); hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().then(() => setPlaying(true)).catch(() => {});
          // Add subtitle tracks after manifest is parsed
          addSubtitleTracks(video);
        });
        hls.on(Hls.Events.ERROR, (_e, data) => { if (data.fatal) { if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad(); else { setError("Stream error."); hls.destroy(); } } });
        hlsRef.current = hls;
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = url;
        video.play().then(() => setPlaying(true)).catch(() => {});
        addSubtitleTracks(video);
      }
    } else {
      video.src = url;
      video.play().then(() => setPlaying(true)).catch(() => {});
      addSubtitleTracks(video);
    }
  }, [subtitleTracks]);

  const addSubtitleTracks = useCallback((video: HTMLVideoElement) => {
    // Remove existing tracks
    const existingTracks = video.querySelectorAll('track');
    existingTracks.forEach(t => t.remove());

    // Add subtitle tracks from MegaPlay
    if (subtitleTracks.length > 0) {
      for (const track of subtitleTracks) {
        if (track.kind === "captions" || track.kind === "subtitles") {
          const trackEl = document.createElement('track');
          trackEl.kind = 'subtitles';
          trackEl.src = track.file;
          trackEl.label = track.label;
          trackEl.srclang = track.label?.split(' ').pop()?.toLowerCase() || 'en';
          video.appendChild(trackEl);
        }
      }
    }
  }, [subtitleTracks]);

  useEffect(() => {
    return () => {
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
      if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
      if (iframeLoadTimer.current) clearTimeout(iframeLoadTimer.current);
      if (skipCheckRef.current) clearInterval(skipCheckRef.current);
    };
  }, []);

  const switchSource = (idx: number) => {
    const activeSources = sourceTab === "internal" ? internalSources : externalSources;
    if (idx < activeSources.length && activeSources[idx]) { setCurrentSource(idx); playSource(activeSources[idx]); }
  };
  const switchTranslation = (trans: TranslationType) => { setTranslation(trans); };
  const switchEpisode = (epNum: number) => { navigate({ page: "watch", id: animeId, episode: epNum, title: animeTitle, image: animeImage }); };
  const retryLoad = () => {
    setError(null);
    const server = servers.find(s => s.id === activeServerId);
    if (server?.isNative) {
      if (server.id === "megaplay-decryptor") { loadMegaPlayStream(); }
      else { loadKiwiStream(); }
    } else {
      if (!useDirectEmbed) {
        setUseDirectEmbed(true);
        setLoading(true);
      } else {
        const currentIdx = servers.findIndex(s => s.id === activeServerId);
        if (currentIdx < servers.length - 1) setActiveServerId(servers[currentIdx + 1].id);
        else setActiveServerId(servers[0]?.id || "");
      }
    }
  };

  // Check if a server supports the current translation
  const serverSupportsTranslation = (s: ServerInfo): boolean => {
    if (translation === "hindi") return s.supportsHindi;
    if (translation === "dub") return s.supportsDub || s.supportsHindi;
    return true; // sub is supported by all servers (they all have supportsSub: true)
  };

  const activeServer = servers.find(s => s.id === activeServerId);
  const activeSources = sourceTab === "internal" ? internalSources : externalSources;
  const prevEp = episodeNum > 1 ? episodeNum - 1 : null;
  const nextEp = episodeList.find(e => e.number === episodeNum + 1) ? episodeNum + 1 : null;

  return (
    <div className="fade-in">
      {/* Immersive blurred background */}
      {tmdbBackdrop && <div className="immersive-bg" style={{ backgroundImage: `url(${tmdbBackdrop})` }} />}

      {/* Grid: video + sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4 -mx-4 lg:-mx-8">
        {/* Video Section */}
        <div className="space-y-0">
          {/* Video Player */}
          <div className="relative bg-black overflow-hidden aspect-video rounded-none lg:rounded-2xl player-glow">
            {!useNativePlayer && embedUrl && (
              <iframe
                ref={iframeRef}
                key={`${embedUrl}-${useDirectEmbed}`}
                src={useDirectEmbed ? embedUrl : `/api/embed/proxy?url=${encodeURIComponent(embedUrl)}`}
                className="w-full h-full border-0 relative z-10"
                allowFullScreen
                allow="autoplay; fullscreen; picture-in-picture; encrypted-media; screen-wake-lock; clipboard-write; document-domain"
                referrerPolicy="no-referrer"
                onLoad={() => { setLoading(false); setPlaying(true); if (iframeLoadTimer.current) clearTimeout(iframeLoadTimer.current); }}
                onError={() => {
                  if (useDirectEmbed) {
                    setUseDirectEmbed(false);
                    setLoading(true);
                  } else {
                    const currentIdx = servers.findIndex(s => s.id === activeServerId);
                    if (currentIdx < servers.length - 1) setActiveServerId(servers[currentIdx + 1].id);
                    else { setLoading(false); setError("All embed servers failed."); }
                  }
                }}
                title={`${animeTitle} - Episode ${episodeNum}`}
              />
            )}
            {useNativePlayer && (
              <video ref={videoRef} className="w-full h-full" controls playsInline autoPlay
                onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} />
            )}

            {/* Skip Intro/Outro Button */}
            {showSkipButton && (
              <button
                onClick={showSkipButton === "intro" ? skipIntro : skipOutro}
                className="absolute bottom-20 right-4 z-30 flex items-center gap-2 px-4 py-2.5 bg-cyan-500/90 hover:bg-cyan-500 text-white text-sm font-bold rounded-lg shadow-lg shadow-cyan-500/30 transition-all backdrop-blur-sm"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
                Skip {showSkipButton === "intro" ? "Intro" : "Outro"}
              </button>
            )}

            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-20">
                <div className="text-center space-y-4">
                  <div className="w-14 h-14 rounded-full border-2 border-cyan-500/20 border-t-cyan-500/60 animate-spin mx-auto" />
                  <p className="text-cyan-300/60 text-xs font-medium">
                    {useNativePlayer ? "Loading stream..." : `Loading from ${activeServer?.name || "server"}...`}
                  </p>
                </div>
              </div>
            )}
            {error && !loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-20">
                <div className="text-center space-y-4 max-w-sm px-6">
                  {translation === "hindi" && hindiDubAvailable === false ? (
                    <>
                      <div className="w-14 h-14 rounded-full bg-orange-500/10 flex items-center justify-center mx-auto">
                        <span className="text-2xl">🇮🇳</span>
                      </div>
                      <p className="text-orange-400 text-base font-bold">Hindi Dub Not Available</p>
                      <p className="text-zinc-400 text-sm">No streaming found — Hindi Dub is not available for this anime.</p>
                      <button onClick={() => switchTranslation("sub")} className="pill-btn pill-btn-primary text-xs py-2 px-4">
                        Switch to SUB
                      </button>
                    </>
                  ) : (
                    <>
                      <svg className="w-10 h-10 text-rose-400/60 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <p className="text-zinc-300 text-sm">{error}</p>
                      <div className="flex items-center justify-center gap-2 flex-wrap">
                        <button onClick={retryLoad} className="pill-btn pill-btn-primary text-xs py-2 px-4">Retry</button>
                        <button onClick={() => {
                          const currentIdx = servers.findIndex(s => s.id === activeServerId);
                          if (currentIdx < servers.length - 1) setActiveServerId(servers[currentIdx + 1].id);
                        }} className="pill-btn pill-btn-ghost text-xs py-2 px-4">Next Server</button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Player controls bar — with ALL servers */}
          <div className="bg-[#131c26] rounded-none lg:rounded-xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">Now Playing</span>
                  <span className={`inline-flex items-center px-2 py-0.5 text-[9px] font-bold rounded-full ${
                    translation === "sub" ? "bg-cyan-500/15 text-cyan-300" : translation === "dub" ? "bg-violet-500/15 text-violet-300" : "bg-orange-500/15 text-orange-300"
                  }`}>
                    {translation.toUpperCase()}
                  </span>
                  {activeServer && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold rounded-full bg-white/[0.05] text-zinc-400">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: activeServer.color }} />
                      {activeServer.name}
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-bold text-white truncate">{animeTitle}</h3>
                <p className="text-xs text-zinc-500">Episode {episodeNum}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Episode nav */}
                {prevEp && (
                  <button onClick={() => switchEpisode(prevEp)} className="pill-btn pill-btn-ghost text-[11px] py-1.5 px-3">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M15 19l-7-7 7-7" /></svg>
                    EP {prevEp}
                  </button>
                )}
                {nextEp && (
                  <button onClick={() => switchEpisode(nextEp)} className="pill-btn pill-btn-ghost text-[11px] py-1.5 px-3">
                    EP {nextEp}
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M9 5l7 7-7 7" /></svg>
                  </button>
                )}
              </div>
            </div>

            {/* Sub/Dub Server Switcher — non-Hindi servers */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                  {translation === "hindi" ? "Hindi Dub Servers" : `Servers (${servers.filter(s => !s.supportsHindi || s.supportsSub || s.supportsDub).length})`}
                </span>
                <button
                  onClick={() => setShowServerList(!showServerList)}
                  className="sm:hidden text-[10px] text-cyan-400 hover:text-cyan-300 font-medium"
                >
                  {showServerList ? "Hide" : "Show All"}
                </button>
              </div>

              {/* Sub/Dub/Hindi translation tabs */}
              <div className="flex items-center gap-1 bg-[#0b1116] rounded-full p-0.5">
                {(["sub", "dub", "hindi"] as const).map(t => (
                  <button key={t} onClick={() => switchTranslation(t)}
                    className={`flex-1 py-1.5 text-[10px] font-bold rounded-full transition-all flex items-center justify-center gap-1 ${
                      translation === t
                        ? t === "sub" ? "bg-cyan-500/15 text-cyan-300" : t === "dub" ? "bg-violet-500/15 text-violet-300" : "bg-orange-500/15 text-orange-300"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}>
                    {t === "hindi" ? "🇮🇳 HINDI DUB" : t.toUpperCase()}
                    {t === "hindi" && hindiDubAvailable === false && (
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                    )}
                  </button>
                ))}
              </div>

              {/* Server pills for current translation */}
              {translation === "hindi" ? (
                /* Hindi Dub — separate section */
                hindiDubAvailable === false ? (
                  <div className="flex flex-col items-center justify-center py-6 px-4 text-center">
                    <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-3">
                      <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                    </div>
                    <p className="text-orange-400 text-sm font-bold mb-1">Hindi Dub Not Available</p>
                    <p className="text-zinc-500 text-[11px] leading-relaxed">
                      No streaming found — Hindi Dub is not available for this anime.
                    </p>
                    <p className="text-zinc-600 text-[10px] mt-2">
                      Try switching to SUB or DUB to watch this anime.
                    </p>
                  </div>
                ) : (
                  <div className={`flex items-center gap-1.5 flex-wrap ${!showServerList ? 'hidden sm:flex' : 'flex'}`}>
                    {servers.filter(s => s.supportsHindi).map((s) => (
                      <button key={s.id}
                        onClick={() => { setActiveServerId(s.id); setLoading(true); setError(null); }}
                        className={`server-pill text-[11px] py-1.5 px-3 flex items-center gap-1.5 ${
                          activeServerId === s.id ? "active" : ""
                        }`}
                        title={s.name}
                      >
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                        <span className="text-[9px]">🇮🇳</span>
                        {s.customName || s.name}
                      </button>
                    ))}
                    {/* Proxy / Direct toggle */}
                    {!useNativePlayer && (
                      <button
                        onClick={() => { setUseDirectEmbed(!useDirectEmbed); setLoading(true); setError(null); }}
                        className={`ml-1 text-[10px] font-bold py-1.5 px-3 rounded-full transition-all ${
                          useDirectEmbed
                            ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/25"
                            : "bg-zinc-500/10 text-zinc-400 border border-zinc-500/15"
                        }`}
                        title={useDirectEmbed ? "Direct embed — bypasses proxy" : "Proxy mode — anti-sandbox enabled"}
                      >
                        {useDirectEmbed ? "Direct" : "Proxy"}
                      </button>
                    )}
                  </div>
                )
              ) : (
                /* Sub/Dub servers */
                <div className={`flex items-center gap-1.5 flex-wrap ${!showServerList ? 'hidden sm:flex' : 'flex'}`}>
                  {servers.map((s) => {
                    const supported = serverSupportsTranslation(s);
                    // In sub/dub mode, still show Hindi Dub server but marked as N/A
                    return (
                      <button key={s.id}
                        onClick={() => { if (supported) { setActiveServerId(s.id); setLoading(true); setError(null); } }}
                        className={`server-pill text-[11px] py-1.5 px-3 flex items-center gap-1.5 ${
                          activeServerId === s.id ? "active" : ""
                        } ${!supported ? "opacity-40 cursor-not-allowed" : ""}`}
                        title={!supported ? `${s.name} doesn't support ${translation}` : s.name}
                      >
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                        {s.customName || s.name}
                        {!supported && (
                          <span className="text-[8px] text-zinc-600 ml-0.5">N/A</span>
                        )}
                      </button>
                    );
                  })}
                  {/* Proxy / Direct toggle */}
                  {!useNativePlayer && (
                    <button
                      onClick={() => { setUseDirectEmbed(!useDirectEmbed); setLoading(true); setError(null); }}
                      className={`ml-1 text-[10px] font-bold py-1.5 px-3 rounded-full transition-all ${
                        useDirectEmbed
                          ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/25"
                          : "bg-zinc-500/10 text-zinc-400 border border-zinc-500/15"
                      }`}
                      title={useDirectEmbed ? "Direct embed — bypasses proxy" : "Proxy mode — anti-sandbox enabled"}
                    >
                      {useDirectEmbed ? "Direct" : "Proxy"}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Subtitle indicator */}
            {subtitleTracks.length > 0 && useNativePlayer && (
              <div className="flex items-center gap-2">
                <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
                <span className="text-[10px] text-zinc-400">{subtitleTracks.length} subtitle track{subtitleTracks.length !== 1 ? 's' : ''} available</span>
                <div className="flex gap-1">
                  {subtitleTracks.slice(0, 5).map((t, i) => (
                    <span key={i} className="text-[8px] px-1.5 py-0.5 rounded bg-white/[0.04] text-zinc-500">{t.label}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Episode Sidebar */}
        <div className="bg-[#131c26] rounded-none lg:rounded-xl overflow-hidden border border-white/[0.04]">
          <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Episodes</h3>
            <span className="text-[10px] text-zinc-500">{episodeList.length || "?"} episodes</span>
          </div>

          {/* Translation quick toggle in sidebar */}
          <div className="p-3 border-b border-white/[0.04]">
            <div className="flex items-center gap-1 bg-[#0b1116] rounded-full p-0.5">
              {(["sub", "dub", "hindi"] as const).map(t => (
                <button key={t} onClick={() => switchTranslation(t)}
                  className={`flex-1 py-1.5 text-[10px] font-bold rounded-full transition-all flex items-center justify-center gap-1 ${
                    translation === t
                      ? t === "sub" ? "bg-cyan-500/15 text-cyan-300" : t === "dub" ? "bg-violet-500/15 text-violet-300" : "bg-orange-500/15 text-orange-300"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}>
                  {t === "hindi" ? "🇮🇳 HIN" : t.toUpperCase()}
                  {t === "hindi" && hindiDubAvailable === false && (
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                  )}
                </button>
              ))}
            </div>
            {translation === "hindi" && hindiDubAvailable === false && (
              <div className="mt-2 p-2 rounded-lg bg-red-500/5 border border-red-500/10 text-center">
                <p className="text-[10px] text-red-400/80 font-medium">Hindi Dub not available for this anime</p>
              </div>
            )}
          </div>

          {/* Episode list */}
          <div className="max-h-[620px] overflow-y-auto">
            {episodeList.length > 0 ? episodeList.map(ep => (
              <button
                key={ep.number}
                onClick={() => switchEpisode(ep.number)}
                className={`w-full flex items-center gap-3 p-3 text-left transition-all ${
                  ep.number === episodeNum
                    ? "bg-cyan-500/10 border-l-3 border-cyan-500"
                    : "hover:bg-white/[0.02]"
                }`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                  ep.number === episodeNum
                    ? "bg-cyan-500 text-white"
                    : "bg-[#1a2530] text-zinc-500"
                }`}>
                  {ep.number}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium line-clamp-1 ${ep.number === episodeNum ? "text-cyan-300" : "text-zinc-300"}`}>
                    Episode {ep.number}
                  </p>
                </div>
                {ep.number === episodeNum && (
                  <svg className="w-4 h-4 text-cyan-400 shrink-0 animate-pulse" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                )}
              </button>
            )) : (
              Array.from({ length: 8 }, (_, i) => (
                <div key={i} className="flex items-center gap-3 p-3">
                  <div className="w-9 h-9 rounded-lg skeleton" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3 w-24 skeleton rounded" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Info card below video */}
      {(animeTitle || animeDescription) && (
        <div className="mt-4 glass-card rounded-xl p-4 -mx-4 lg:-mx-8">
          <div className="flex items-start gap-4">
            {animeImage && (
              <div className="shrink-0 w-20 h-28 rounded-lg overflow-hidden border border-white/[0.06]">
                <img src={animeImage} alt={animeTitle} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-white truncate">{animeTitle}</h3>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {tmdbRating && (
                  <span className="flex items-center gap-1 text-emerald-400">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                    <span className="text-xs font-semibold">{(tmdbRating > 10 ? tmdbRating / 10 : tmdbRating).toFixed(1)}</span>
                  </span>
                )}
              </div>
              {tmdbGenres.length > 0 && (
                <div className="flex gap-1.5 flex-wrap mt-2">
                  {tmdbGenres.slice(0, 5).map((genre, i) => (
                    <span key={i} className="px-2.5 py-1 text-[9px] font-semibold rounded-full bg-white/[0.03] border border-white/[0.05] text-zinc-500">{genre}</span>
                  ))}
                </div>
              )}
              {animeDescription && (
                <p className="text-[11px] text-zinc-500 line-clamp-2 mt-2 leading-relaxed">
                  {animeDescription.slice(0, 200)}{animeDescription.length > 200 ? "..." : ""}
                </p>
              )}
              <button onClick={() => navigate({ page: "anime", id: animeId })}
                className="text-[11px] text-cyan-400/70 hover:text-cyan-400 mt-2 transition-colors font-medium">View Details →</button>
            </div>
          </div>
        </div>
      )}

      {/* Quality selector for native/kiwi */}
      {useNativePlayer && (internalSources.length > 0 || externalSources.length > 0) && (
        <div className="mt-3 -mx-4 lg:-mx-8 bg-[#131c26] rounded-xl p-4 border border-white/[0.04]">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Quality</span>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {(sourceTab === "internal" ? internalSources : externalSources).map((s, i) => (
              <button key={i} onClick={() => switchSource(i)}
                className={`server-pill text-[11px] py-1.5 px-3 ${currentSource === i && sourceTab === "internal" ? "active" : ""}`}>
                {s.quality || s.sourceName || `${i + 1}`}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
