import { NextRequest, NextResponse } from "next/server";
import { getAnimeInfo, searchAnime } from "@/lib/anime-api";
import { miruroInfo } from "@/lib/miruro-api";
import { getAnimeDetails, getAnimeBasicInfo, searchAnime as anilistSearch } from "@/lib/anilist-api";
import { zenshinByAnilistId } from "@/lib/zenshin-api";
import { tmdbTVDetails, tmdbImageUrl, tmdbFindByExternalId, tmdbFindAnimeTMDBId, tmdbSearchTV } from "@/lib/tmdb-api";
import { imdbFindAnimeId } from "@/lib/imdb-api";
import { jikanAnimeByIdAsMiruro, jikanAnimeById } from "@/lib/jikan-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseAnimeId(rawId: string): { anilistId: number | null; allanimeId: string | null; source: string } {
  const cleanId = rawId.replace(/^miruro_/, "").replace(/^mal_/, "");
  if (/^\d+$/.test(cleanId)) {
    const source = rawId.startsWith("miruro_") ? "miruro" : rawId.startsWith("mal_") ? "jikan" : "auto";
    return { anilistId: parseInt(cleanId), allanimeId: null, source };
  }
  return { anilistId: null, allanimeId: cleanId, source: "allanime" };
}

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  try {
    const { anilistId, allanimeId } = parseAnimeId(id);

    let allanimeData: any = null;
    let miruroData: any = null;
    let anilistData: any = null;
    let resolvedAllAnimeId: string | null = allanimeId;
    let zenshinMappings: any = null;
    let tmdbId: number | null = null;
    let tmdbSeason: number | null = null;
    let tmdbData: any = null;
    let imdbId: string | null = null;
    let totalEpisodes: number | null = null;
    let nextAiringEpisode: any = null;

    // Track which data source provided info
    let dataSource: "anilist" | "jikan" | "tmdb" | "miruro" | "allanime" | "failed" = "failed";

    // ============================================================
    // FALLBACK CHAIN: AniList → Jikan/MAL → TMDB → Miruro → AllAnime
    // AniList is PRIMARY. Jikan/MAL and TMDB are BACKUP when AniList is down.
    // ============================================================

    // Step 1: AniList data (PRIMARY - most reliable for anime info)
    if (anilistId) {
      try {
        anilistData = await getAnimeDetails(anilistId);
        if (anilistData) {
          dataSource = "anilist";
          totalEpisodes = anilistData.episodes || null;
          nextAiringEpisode = anilistData.nextAiringEpisode || null;
          if (!totalEpisodes && nextAiringEpisode) {
            totalEpisodes = nextAiringEpisode.episode;
          }
        }
      } catch { /* AniList details failed */ }

      // Fallback to basic info if details failed
      if (!anilistData) {
        try {
          anilistData = await getAnimeBasicInfo(anilistId);
          if (anilistData) {
            dataSource = "anilist";
            totalEpisodes = anilistData.episodes || null;
            nextAiringEpisode = anilistData.nextAiringEpisode || null;
            if (!totalEpisodes && nextAiringEpisode) {
              totalEpisodes = nextAiringEpisode.episode;
            }
          }
        } catch { /* AniList basic info also failed */ }
      }
    }

    // Step 2: Jikan/MAL — BACKUP #1 (kicks in when AniList is down)
    let jikanData: any = null;
    let isJikanSource = false;

    if (!anilistData) {
      // AniList failed — immediately try Jikan/MAL
      const cleanId = id.replace(/^mal_/, "");
      if (/^\d+$/.test(cleanId)) {
        try {
          jikanData = await jikanAnimeByIdAsMiruro(parseInt(cleanId));
          if (jikanData) {
            isJikanSource = true;
            dataSource = "jikan";
            if (!totalEpisodes && jikanData.episodes) {
              totalEpisodes = jikanData.episodes;
            }
          }
        } catch { /* Jikan fallback failed */ }
      }
    }

    // Step 3: TMDB TV Search — BACKUP #2 (when AniList and Jikan both fail)
    // Also used to find TMDB ID for embed servers even when AniList works
    let tmdbFallbackData: any = null;

    if (!anilistData && !jikanData) {
      // Both AniList and Jikan failed — try searching TMDB TV by title
      // We don't have a title yet, so try from AllAnime if available
      if (resolvedAllAnimeId) {
        try {
          const allanimeInfo = await getAnimeInfo(resolvedAllAnimeId);
          allanimeData = allanimeInfo;
          const searchName = allanimeInfo?.englishName || allanimeInfo?.name;
          if (searchName) {
            const tmdbResults = await tmdbSearchTV(searchName);
            if (tmdbResults.results.length > 0) {
              const best = tmdbResults.results[0];
              tmdbFallbackData = {
                id: best.id,
                title: {
                  english: best.name || best.original_name,
                  romaji: best.original_name,
                },
                coverImage: {
                  extraLarge: best.poster_path ? tmdbImageUrl(best.poster_path, "w500") : undefined,
                  large: best.poster_path ? tmdbImageUrl(best.poster_path, "w342") : undefined,
                },
                bannerImage: best.backdrop_path ? tmdbImageUrl(best.backdrop_path, "w780") : undefined,
                description: best.overview,
                episodes: best.number_of_episodes,
                averageScore: best.vote_average ? Math.round(best.vote_average * 10) : undefined,
                genres: best.genres?.map((g: any) => g.name) || [],
                status: best.status,
                type: "TV",
              };
              tmdbId = best.id;
              dataSource = "tmdb";
              if (!totalEpisodes && best.number_of_episodes) {
                totalEpisodes = best.number_of_episodes;
              }
            }
          }
        } catch { /* TMDB TV search failed */ }
      }
    }

    // Step 4: Miruro info (AniList metadata with additional fields)
    if (anilistId) {
      try {
        miruroData = await miruroInfo(anilistId);
        if (miruroData) {
          if (dataSource === "failed") dataSource = "miruro";
          if (!totalEpisodes && miruroData.episodes) {
            totalEpisodes = miruroData.episodes;
          }
        }
      } catch {}
    }

    // Step 5: Zenshin — resolve AniList → TMDB/IMDb IDs
    if (anilistId) {
      try {
        const zenshinResult = await zenshinByAnilistId(anilistId);
        if (zenshinResult?.mappings) {
          zenshinMappings = zenshinResult.mappings;
          tmdbId = zenshinMappings.themoviedb_id || null;
          if (zenshinMappings.season?.tmdb) tmdbSeason = zenshinMappings.season.tmdb;
          if (zenshinMappings.imdb_id) imdbId = zenshinMappings.imdb_id;
        }
      } catch {}
    }

    // Step 6: TMDB ID fallbacks via external IDs
    if (!tmdbId && imdbId) {
      try { const r = await tmdbFindByExternalId(imdbId, "imdb_id"); if (r) tmdbId = r.id; } catch {}
    }
    if (!tmdbId && zenshinMappings?.thetvdb_id) {
      try { const r = await tmdbFindByExternalId(String(zenshinMappings.thetvdb_id), "tvdb_id"); if (r) tmdbId = r.id; } catch {}
    }

    // Step 7: TMDB details — rich metadata (credits, videos, similar, recommendations)
    if (tmdbId) {
      try {
        const details = await tmdbTVDetails(tmdbId);
        if (details) {
          tmdbData = {
            id: details.id,
            name: details.name || details.original_name,
            original_name: details.original_name,
            overview: details.overview,
            poster_path: details.poster_path,
            backdrop_path: details.backdrop_path,
            vote_average: details.vote_average,
            vote_count: details.vote_count,
            genres: details.genres,
            number_of_seasons: details.number_of_seasons,
            number_of_episodes: details.number_of_episodes,
            networks: details.networks,
            seasons: details.seasons,
            external_ids: details.external_ids,
            credits: details.credits || undefined,
            videos: details.videos || undefined,
            similar: details.similar || undefined,
            recommendations: details.recommendations || undefined,
            posterUrl: tmdbImageUrl(details.poster_path, "w500"),
            backdropUrl: tmdbImageUrl(details.backdrop_path, "w780"),
          };
          if (details.external_ids?.imdb_id && !imdbId) imdbId = details.external_ids.imdb_id;
          if (!tmdbSeason && details.seasons) {
            const s = details.seasons.find((s: any) => s.season_number > 0 && s.episode_count > 0);
            if (s) tmdbSeason = s.season_number;
          }
          if (!totalEpisodes && details.number_of_episodes) {
            totalEpisodes = details.number_of_episodes;
          }
        }
      } catch {}
    }

    // Step 8: TMDB title search fallback (if we still don't have a TMDB ID)
    const miruroOrJikanData = isJikanSource ? jikanData : miruroData;
    if (!tmdbId && miruroOrJikanData) {
      try {
        const r = await tmdbFindAnimeTMDBId({
          english: miruroOrJikanData?.title?.english || undefined,
          romaji: miruroOrJikanData?.title?.romaji || undefined,
        });
        if (r) tmdbId = r.tmdbId;
      } catch {}
    }

    // Also try TMDB title search with AniList data if we have it but no TMDB ID
    if (!tmdbId && anilistData) {
      try {
        const r = await tmdbFindAnimeTMDBId({
          english: anilistData.title?.english || undefined,
          romaji: anilistData.title?.romaji || undefined,
        });
        if (r) tmdbId = r.tmdbId;
      } catch {}
    }

    // If TMDB ID was found from fallback but we don't have tmdbData yet, fetch it
    if (tmdbId && !tmdbData) {
      try {
        const details = await tmdbTVDetails(tmdbId);
        if (details) {
          tmdbData = {
            id: details.id,
            name: details.name || details.original_name,
            original_name: details.original_name,
            overview: details.overview,
            poster_path: details.poster_path,
            backdrop_path: details.backdrop_path,
            vote_average: details.vote_average,
            vote_count: details.vote_count,
            genres: details.genres,
            number_of_seasons: details.number_of_seasons,
            number_of_episodes: details.number_of_episodes,
            networks: details.networks,
            seasons: details.seasons,
            external_ids: details.external_ids,
            credits: details.credits || undefined,
            videos: details.videos || undefined,
            similar: details.similar || undefined,
            recommendations: details.recommendations || undefined,
            posterUrl: tmdbImageUrl(details.poster_path, "w500"),
            backdropUrl: tmdbImageUrl(details.backdrop_path, "w780"),
          };
          if (details.external_ids?.imdb_id && !imdbId) imdbId = details.external_ids.imdb_id;
          if (!tmdbSeason && details.seasons) {
            const s = details.seasons.find((s: any) => s.season_number > 0 && s.episode_count > 0);
            if (s) tmdbSeason = s.season_number;
          }
          if (!totalEpisodes && details.number_of_episodes) {
            totalEpisodes = details.number_of_episodes;
          }
        }
      } catch {}
    }

    // Step 9: IMDb search fallback
    if (!imdbId && miruroOrJikanData) {
      try {
        const found = await imdbFindAnimeId({
          english: miruroOrJikanData?.title?.english || undefined,
          romaji: miruroOrJikanData?.title?.romaji || undefined,
        });
        if (found) imdbId = found;
      } catch {}
    }

    // Step 10: Cross-reference to AllAnime
    const searchTitle = miruroOrJikanData?.title?.english || miruroOrJikanData?.title?.romaji ||
      anilistData?.title?.english || anilistData?.title?.romaji ||
      tmdbFallbackData?.title?.english || tmdbFallbackData?.title?.romaji;
    if (searchTitle) {
      try {
        const searchResult = await searchAnime(searchTitle, 1, 5);
        if (searchResult.results?.length > 0) {
          const best = searchResult.results.find(
            (r: any) => r.englishName?.toLowerCase() === searchTitle.toLowerCase() ||
                        r.name?.toLowerCase() === searchTitle.toLowerCase()
          ) || searchResult.results[0];
          resolvedAllAnimeId = best._id;
        }
      } catch {}
    }

    // Step 10.5: If we started with an AllAnime ID but have no anilistId yet,
    // try to resolve AniList ID from AllAnime data using title search on AniList
    if (!anilistData && resolvedAllAnimeId) {
      try {
        const allanimeInfo = await getAnimeInfo(resolvedAllAnimeId);
        allanimeData = allanimeInfo;
        const searchName = allanimeInfo?.englishName || allanimeInfo?.name;
        if (searchName) {
          const alResult = await anilistSearch(searchName, 1, 3);
          if (alResult && alResult.media && alResult.media.length > 0) {
            const match = alResult.media.find(m =>
              m.title?.english?.toLowerCase() === searchName.toLowerCase() ||
              m.title?.romaji?.toLowerCase() === searchName.toLowerCase()
            ) || alResult.media[0];
            anilistData = match;
            if (dataSource === "failed") dataSource = "allanime";
          }
        }
      } catch { /* Cross-ref failed */ }
    }

    // Step 11: AllAnime info
    if (resolvedAllAnimeId) {
      try { allanimeData = await getAnimeInfo(resolvedAllAnimeId); } catch {}
    }

    // Build anilistInfo response — merge from all available sources
    // AniList PRIMARY, then Jikan, then TMDB fallback
    const anilistInfoData = anilistData ? {
      id: anilistData.id,
      title: anilistData.title,
      coverImage: anilistData.coverImage,
      bannerImage: anilistData.bannerImage,
      description: anilistData.description,
      episodes: anilistData.episodes,
      nextAiringEpisode: anilistData.nextAiringEpisode,
      status: anilistData.status,
      format: anilistData.format,
      season: anilistData.season,
      seasonYear: anilistData.seasonYear,
      averageScore: anilistData.averageScore,
      genres: anilistData.genres,
      type: anilistData.type,
    } : tmdbFallbackData ? {
      // TMDB fallback data shaped as anilistInfo for frontend compatibility
      id: tmdbFallbackData.id,
      title: tmdbFallbackData.title,
      coverImage: tmdbFallbackData.coverImage,
      bannerImage: tmdbFallbackData.bannerImage,
      description: tmdbFallbackData.description,
      episodes: tmdbFallbackData.episodes,
      status: tmdbFallbackData.status,
      averageScore: tmdbFallbackData.averageScore,
      genres: tmdbFallbackData.genres,
      type: tmdbFallbackData.type,
    } : null;

    return NextResponse.json({
      anime: allanimeData,
      miruroInfo: isJikanSource ? jikanData : miruroData,
      anilistInfo: anilistInfoData,
      // TMDB fallback data (separate for when AniList is down)
      tmdbFallbackInfo: tmdbFallbackData,
      allAnimeId: resolvedAllAnimeId,
      // TMDB/IMDb data for embed servers
      tmdbId,
      tmdbSeason,
      tmdbData,
      imdbId,
      zenshinMappings,
      // Episode count from the most reliable source
      totalEpisodes,
      nextAiringEpisode,
      // Source indicator for frontend awareness
      _source: dataSource,
    });
  } catch {
    return NextResponse.json({
      anime: null, miruroInfo: null, anilistInfo: null, tmdbFallbackInfo: null,
      allAnimeId: null, tmdbId: null, tmdbSeason: null, tmdbData: null,
      imdbId: null, zenshinMappings: null, totalEpisodes: null,
      nextAiringEpisode: null, _source: "failed",
    });
  }
}
