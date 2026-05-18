"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "./store";
import AnimeCard from "./anime-card";
import type { TMDBContentItem } from "./store";

interface TVDetail {
  id: number;
  name: string;
  original_name?: string;
  overview?: string;
  poster_path?: string;
  backdrop_path?: string;
  vote_average?: number;
  vote_count?: number;
  genres?: Array<{ id: number; name: string }>;
  first_air_date?: string;
  number_of_seasons?: number;
  number_of_episodes?: number;
  status?: string;
  tagline?: string;
  networks?: Array<{ id: number; name: string; logo_path?: string }>;
  seasons?: Array<{
    id: number; name: string; season_number: number;
    episode_count: number; poster_path?: string; air_date?: string;
  }>;
  credits?: {
    cast: Array<{ id: number; name: string; character?: string; profile_path?: string; order?: number }>;
  };
  videos?: { results: Array<{ id: string; key: string; name: string; site: string; type: string }> };
  similar?: { results: TMDBContentItem[] };
  recommendations?: { results: TMDBContentItem[] };
  external_ids?: { imdb_id?: string };
  episode_run_time?: number[];
}

interface SeasonEpisodes {
  episodes: Array<{
    id: number;
    name: string;
    overview?: string;
    episode_number: number;
    season_number: number;
    still_path?: string;
    air_date?: string;
    runtime?: number;
    vote_average?: number;
  }>;
}

// ── Star Rating Component ──
function StarRating({ rating, maxStars = 5 }: { rating: number; maxStars?: number }) {
  const normalizedRating = rating > 10 ? rating / 10 : rating;
  const filledStars = Math.round(normalizedRating / 2);
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: maxStars }, (_, i) => (
        <svg
          key={i}
          className={`w-5 h-5 ${i < filledStars ? "text-amber-400" : "text-zinc-600"}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      <span className="ml-1 text-sm font-semibold text-zinc-300">{normalizedRating.toFixed(1)}</span>
    </div>
  );
}

export default function TVDetailPage({ tvId }: { tvId: number }) {
  const navigate = useAppStore(s => s.navigate);
  const [show, setShow] = useState<TVDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTrailer, setShowTrailer] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [episodes, setEpisodes] = useState<SeasonEpisodes | null>(null);
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [showAllCast, setShowAllCast] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/tmdb/detail?id=${tvId}&type=tv`);
        if (res.ok) {
          const data = await res.json();
          setShow(data);
          if (data.number_of_seasons) setSelectedSeason(1);
        }
      } catch { /* ignore */ }
      setLoading(false);
    }
    load();
  }, [tvId]);

  // Load season episodes
  useEffect(() => {
    if (!tvId || !selectedSeason) return;
    async function loadSeason() {
      try {
        const res = await fetch(`/api/tmdb/season?tvId=${tvId}&season=${selectedSeason}`);
        if (res.ok) setEpisodes(await res.json());
      } catch { /* ignore */ }
    }
    loadSeason();
  }, [tvId, selectedSeason]);

  if (loading) {
    return (
      <div className="fade-in">
        <div className="min-h-[70vh] -mt-[75px] skeleton" />
        <div className="max-w-[1400px] mx-auto px-4 lg:px-8 -mt-16 relative z-10">
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="w-[240px] aspect-[2/3] skeleton rounded-xl shrink-0" />
            <div className="flex-1 space-y-4">
              <div className="h-10 w-3/4 skeleton rounded" />
              <div className="h-24 skeleton rounded" />
            </div>
            <div className="w-[280px] space-y-3 shrink-0 hidden lg:block">
              <div className="h-6 w-32 skeleton rounded" />
              {Array.from({ length: 5 }, (_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full skeleton" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3 w-24 skeleton rounded" />
                    <div className="h-2 w-16 skeleton rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!show) {
    return <div className="text-center py-20"><p className="text-zinc-400">TV show not found</p></div>;
  }

  const trailer = show.videos?.results?.find(v => v.type === "Trailer" && v.site === "YouTube");
  const year = show.first_air_date?.split("-")[0];
  const score = show.vote_average ?? 0;
  const castList = show.credits?.cast || [];
  const visibleCast = showAllCast ? castList : castList.slice(0, 10);

  return (
    <div className="fade-in">
      {/* ═══════════════════════════════════════════════
          HERO SECTION
          ═══════════════════════════════════════════════ */}
      <div className="relative min-h-[75vh] -mt-[75px] overflow-hidden">
        {show.backdrop_path && (
          <img src={`https://image.tmdb.org/t/p/w1280${show.backdrop_path}`} alt={show.name} className="absolute inset-0 w-full h-full object-cover" style={{ animation: 'kenBurns 12s ease-out forwards' }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-[#000000] via-[#000000]/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#000000] via-transparent to-[#000000]/30" />
        <div className="absolute inset-0 hero-gradient" />

        <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-12">
          <div className="max-w-[1400px] mx-auto">
            {/* Badges */}
            <div className="stagger-reveal stagger-1 flex items-center gap-3 flex-wrap mb-3">
              <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider bg-purple-500/15 text-purple-300 rounded-full border border-purple-500/20">TV Show</span>
              {year && <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider bg-white/[0.06] text-zinc-300 rounded-full border border-white/[0.08]">{year}</span>}
              {show.number_of_seasons && (
                <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider bg-violet-500/15 text-violet-300 rounded-full border border-violet-500/20">
                  {show.number_of_seasons} Season{show.number_of_seasons > 1 ? "s" : ""}
                </span>
              )}
              {show.number_of_episodes && (
                <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-300 rounded-full border border-amber-500/20">
                  {show.number_of_episodes} Episodes
                </span>
              )}
            </div>

            <h1 className="stagger-reveal stagger-2 text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-tight mb-2">{show.name}</h1>

            {show.tagline && (
              <p className="stagger-reveal stagger-3 text-base text-zinc-400 italic mb-3">&quot;{show.tagline}&quot;</p>
            )}

            {score > 0 && (
              <div className="stagger-reveal stagger-3 mt-2">
                <StarRating rating={score} />
              </div>
            )}

            {/* Action buttons */}
            <div className="stagger-reveal stagger-4 flex items-center gap-3 mt-5">
              <button
                onClick={() => navigate({ page: "tv-watch", id: show.id, season: 1, episode: 1 })}
                className="pill-btn pill-btn-primary text-sm"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                Watch Now
              </button>
              <button className="pill-btn pill-btn-ghost text-sm">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>
                Watchlist
              </button>
              <button className="pill-btn pill-btn-ghost text-sm">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                Favorite
              </button>
              {trailer && (
                <button onClick={() => setShowTrailer(!showTrailer)} className="pill-btn pill-btn-ghost text-sm">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  {showTrailer ? "Hide Trailer" : "Trailer"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          MAIN CONTENT — 3-column layout
          ═══════════════════════════════════════════════ */}
      <div className="max-w-[1400px] mx-auto px-4 lg:px-8 -mt-16 relative z-10">
        <div className="flex flex-col lg:flex-row gap-8">

          {/* ── LEFT: Poster + Quick Info ── */}
          <div className="shrink-0 w-full lg:w-[240px]">
            <div className="relative">
              {show.poster_path && (
                <img
                  src={`https://image.tmdb.org/t/p/w500${show.poster_path}`}
                  alt={show.name}
                  className="w-[200px] lg:w-[240px] rounded-xl shadow-2xl shadow-black/60 border border-white/[0.08]"
                />
              )}
              {score > 0 && (
                <div className="absolute -top-3 -right-3 w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30 border-2 border-emerald-400/50">
                  <span className="text-white text-sm font-black">{(score > 10 ? score / 10 : score).toFixed(1)}</span>
                </div>
              )}
            </div>

            <div className="mt-4 space-y-2">
              {show.first_air_date && (
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <svg className="w-4 h-4 text-purple-400/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  <span className="text-zinc-300 font-medium">{new Date(show.first_air_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
              )}
              {show.number_of_seasons && (
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <svg className="w-4 h-4 text-purple-400/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" /></svg>
                  <span className="text-zinc-300 font-medium">{show.number_of_seasons} Season{show.number_of_seasons > 1 ? "s" : ""}</span>
                </div>
              )}
              {show.number_of_episodes && (
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <svg className="w-4 h-4 text-purple-400/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <span className="text-zinc-300 font-medium">{show.number_of_episodes} Episodes</span>
                </div>
              )}

              {/* Networks */}
              {show.networks && show.networks.length > 0 && (
                <div className="pt-3 border-t border-white/[0.06] mt-3">
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mb-2">Networks</p>
                  <div className="flex gap-2 flex-wrap">
                    {show.networks.map(n => (
                      <div key={n.id} className="flex items-center gap-1.5 bg-white/[0.04] px-2.5 py-1.5 rounded-lg border border-white/[0.06]">
                        {n.logo_path && <img src={`https://image.tmdb.org/t/p/w92${n.logo_path}`} alt={n.name} className="h-4 brightness-75" />}
                        {!n.logo_path && <span className="text-[10px] text-zinc-400">{n.name}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── CENTER: Main content ── */}
          <div className="flex-1 min-w-0 space-y-8">
            {/* Where to Watch */}
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Where to Watch</span>
              <div className="flex items-center gap-2">
                {show.networks?.map(n => (
                  <div key={n.id} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.04] rounded-lg border border-white/[0.06]">
                    {n.logo_path && <img src={`https://image.tmdb.org/t/p/w92${n.logo_path}`} alt={n.name} className="h-4" />}
                    {!n.logo_path && <span className="text-[10px] font-bold text-zinc-300">{n.name}</span>}
                  </div>
                ))}
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.04] rounded-lg border border-white/[0.06]">
                  <svg className="w-4 h-4 text-emerald-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth={1.5} fill="none" /></svg>
                  <span className="text-[10px] font-bold text-zinc-300">TMDB</span>
                </div>
              </div>
            </div>

            {/* Genres */}
            {show.genres && show.genres.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {show.genres.map(g => (
                  <span key={g.id} className="px-4 py-1.5 text-xs font-semibold bg-white/[0.05] text-zinc-300 rounded-full border border-white/[0.08]">{g.name}</span>
                ))}
              </div>
            )}

            {/* Overview */}
            {show.overview && (
              <div>
                <h3 className="text-lg font-bold text-white mb-2">Overview</h3>
                <p className={`text-sm text-zinc-400 leading-relaxed ${!showFullDesc ? "line-clamp-4" : ""}`}>{show.overview}</p>
                {show.overview.length > 200 && (
                  <button
                    onClick={() => setShowFullDesc(!showFullDesc)}
                    className="mt-2 text-xs font-semibold text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    {showFullDesc ? "Show Less" : "Read More"}
                  </button>
                )}
              </div>
            )}

            {/* Trailer / Media */}
            {trailer && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-bold text-white">Media</h3>
                  <button
                    onClick={() => setShowTrailer(!showTrailer)}
                    className="text-xs font-semibold text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {showTrailer ? "Hide Trailer" : "Play Trailer"}
                  </button>
                </div>
                {showTrailer ? (
                  <div className="relative w-full aspect-video max-w-2xl rounded-xl overflow-hidden border border-white/[0.06] shadow-xl shadow-black/30">
                    <iframe
                      src={`https://www.youtube.com/embed/${trailer.key}?autoplay=1&mute=1&loop=1&playlist=${trailer.key}&controls=0&showinfo=0&modestbranding=1`}
                      className="w-full h-full"
                      allowFullScreen
                      allow="autoplay; encrypted-media"
                      title="Trailer"
                    />
                  </div>
                ) : (
                  <div
                    className="relative w-full max-w-2xl aspect-video rounded-xl overflow-hidden border border-white/[0.06] cursor-pointer group"
                    onClick={() => setShowTrailer(true)}
                  >
                    <img
                      src={`https://img.youtube.com/vi/${trailer.key}/maxresdefault.jpg`}
                      alt="Trailer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/50 transition-colors">
                      <div className="w-16 h-16 rounded-full bg-purple-500/90 flex items-center justify-center shadow-lg shadow-purple-500/30 group-hover:scale-110 transition-transform">
                        <svg className="w-7 h-7 text-white ml-1" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Episodes */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-white">Episodes</h3>
                  {show.number_of_seasons && show.number_of_seasons > 1 && (
                    <select
                      value={selectedSeason}
                      onChange={e => setSelectedSeason(parseInt(e.target.value))}
                      className="bg-[#1a1a1a] text-zinc-300 text-xs px-3 py-1.5 rounded-full border border-white/[0.06] outline-none focus:border-purple-500/30"
                    >
                      {Array.from({ length: show.number_of_seasons }, (_, i) => (
                        <option key={i + 1} value={i + 1}>Season {i + 1}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                {episodes?.episodes ? episodes.episodes.map(ep => (
                  <button
                    key={ep.id}
                    onClick={() => navigate({ page: "tv-watch", id: show.id, season: ep.season_number, episode: ep.episode_number })}
                    className="w-full flex items-center gap-4 p-3 rounded-xl text-left hover:bg-purple-500/[0.06] transition-all group bg-[#111111] border border-white/[0.03] hover:border-purple-500/20"
                  >
                    <div className="w-32 h-[72px] rounded-lg overflow-hidden shrink-0 bg-[#1a1a1a] relative">
                      {ep.still_path ? (
                        <img src={`https://image.tmdb.org/t/p/w300${ep.still_path}`} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500/10 to-transparent">
                          <span className="text-sm font-bold text-purple-400">{ep.episode_number}</span>
                        </div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                        <svg className="w-8 h-8 text-purple-400" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-200 line-clamp-1">{ep.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-purple-400 font-medium">EP {ep.episode_number}</span>
                        {ep.runtime && <span className="text-[10px] text-zinc-500">{ep.runtime}m</span>}
                        {ep.air_date && <span className="text-[10px] text-zinc-600">{ep.air_date}</span>}
                      </div>
                      {ep.overview && <p className="text-[11px] text-zinc-500 line-clamp-1 mt-0.5">{ep.overview}</p>}
                    </div>
                  </button>
                )) : (
                  Array.from({ length: 5 }, (_, i) => (
                    <div key={i} className="flex items-center gap-4 p-3">
                      <div className="w-32 h-[72px] rounded-lg skeleton" />
                      <div className="flex-1 space-y-1">
                        <div className="h-4 w-48 skeleton rounded" />
                        <div className="h-3 w-24 skeleton rounded" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Similar */}
            {show.similar?.results && show.similar.results.length > 0 && (
              <section>
                <h3 className="text-lg font-bold text-white mb-4">You May Also Like</h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                  {show.similar.results.slice(0, 12).map((item, i) => (
                    <AnimeCard key={item.id} tmdbItem={{ ...item, media_type: "tv" }} index={i} />
                  ))}
                </div>
              </section>
            )}

            {/* Recommendations */}
            {show.recommendations?.results && show.recommendations.results.length > 0 && (
              <section>
                <h3 className="text-lg font-bold text-white mb-4">More Like This</h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                  {show.recommendations.results.slice(0, 12).map((item, i) => (
                    <AnimeCard key={item.id} tmdbItem={{ ...item, media_type: "tv" }} index={i} />
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* ── RIGHT: Cast & Credits sidebar ── */}
          {castList.length > 0 && (
            <div className="shrink-0 w-full lg:w-[280px]">
              <div className="bg-[#0a0a0a] rounded-xl border border-white/[0.06] p-5 sticky top-24">
                <h3 className="text-base font-bold text-white mb-4">Casts & Credits</h3>
                <div className="space-y-3">
                  {visibleCast.map(person => (
                    <div key={person.id} className="flex items-center gap-3 group">
                      <div className="w-11 h-11 rounded-full overflow-hidden shrink-0 border-2 border-white/[0.06] bg-[#1a1a1a]">
                        {person.profile_path ? (
                          <img src={`https://image.tmdb.org/t/p/w185${person.profile_path}`} alt={person.name} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-sm text-zinc-600 font-semibold">{person.name.charAt(0)}</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-zinc-200 line-clamp-1 group-hover:text-purple-300 transition-colors">{person.name}</p>
                        {person.character && <p className="text-[10px] text-zinc-500 line-clamp-1">{person.character}</p>}
                      </div>
                    </div>
                  ))}
                </div>
                {castList.length > 10 && (
                  <button
                    onClick={() => setShowAllCast(!showAllCast)}
                    className="mt-4 w-full flex items-center justify-center gap-1 text-xs font-semibold text-purple-400 hover:text-purple-300 transition-colors py-2 rounded-lg hover:bg-purple-500/5"
                  >
                    {showAllCast ? "Show Less" : `Show All (${castList.length})`}
                    <svg className={`w-3.5 h-3.5 transition-transform ${showAllCast ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
