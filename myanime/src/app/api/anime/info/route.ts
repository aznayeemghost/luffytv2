import { NextRequest, NextResponse } from "next/server";
import { getAnimeInfo, searchAnime } from "@/lib/anime-api";
import { miruroInfo } from "@/lib/miruro-api";
import { getAnimeDetails, getAnimeBasicInfo } from "@/lib/anilist-api";
import { zenshinByAnilistId } from "@/lib/zenshin-api";
import { tmdbTVDetails, tmdbImageUrl, tmdbFindByExternalId, tmdbFindAnimeTMDBId } from "@/lib/tmdb-api";
import { imdbFindAnimeId } from "@/lib/imdb-api";
import { jikanAnimeByIdAsMiruro } from "@/lib/jikan-api";

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

    // Step 1: AniList data (most reliable for episode counts)
    if (anilistId) {
      try {
        anilistData = await getAnimeDetails(anilistId);
        if (anilistData) {
          totalEpisodes = anilistData.episodes || null;
          nextAiringEpisode = anilistData.nextAiringEpisode || null;

          // Use nextAiringEpisode to infer more episodes
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
            totalEpisodes = anilistData.episodes || null;
            nextAiringEpisode = anilistData.nextAiringEpisode || null;
            if (!totalEpisodes && nextAiringEpisode) {
              totalEpisodes = nextAiringEpisode.episode;
            }
          }
        } catch { /* AniList basic info also failed */ }
      }
    }

    // Step 2: Miruro info (AniList metadata with additional fields)
    if (anilistId) {
      try {
        miruroData = await miruroInfo(anilistId);
        // If AniList didn't have episode count, try Miruro
        if (!totalEpisodes && miruroData?.episodes) {
          totalEpisodes = miruroData.episodes;
        }
      } catch {}
    }

    // Step 2.5: If both AniList and Miruro failed, try Jikan
    let jikanData: any = null;
    let isJikanSource = false;

    if (!anilistData && !miruroData) {
      // Check if the ID is a MAL ID (prefixed with mal_ or just a number that didn't match AniList)
      const cleanId = id.replace(/^mal_/, "");
      if (/^\d+$/.test(cleanId)) {
        try {
          jikanData = await jikanAnimeByIdAsMiruro(parseInt(cleanId));
          if (jikanData) {
            isJikanSource = true;
            if (!totalEpisodes && jikanData.episodes) {
              totalEpisodes = jikanData.episodes;
            }
          }
        } catch { /* Jikan fallback failed */ }
      }
    }

    // Step 3: Zenshin — resolve AniList → TMDB/IMDb IDs
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

    // Step 4: TMDB fallbacks via external IDs
    if (!tmdbId && imdbId) {
      try { const r = await tmdbFindByExternalId(imdbId, "imdb_id"); if (r) tmdbId = r.id; } catch {}
    }
    if (!tmdbId && zenshinMappings?.thetvdb_id) {
      try { const r = await tmdbFindByExternalId(String(zenshinMappings.thetvdb_id), "tvdb_id"); if (r) tmdbId = r.id; } catch {}
    }

    // Step 5: TMDB details — rich metadata (credits, videos, similar, recommendations)
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
            // Rich data from append_to_response
            credits: details.credits || undefined,
            videos: details.videos || undefined,
            similar: details.similar || undefined,
            recommendations: details.recommendations || undefined,
            // Image URLs
            posterUrl: tmdbImageUrl(details.poster_path, "w500"),
            backdropUrl: tmdbImageUrl(details.backdrop_path, "w780"),
          };
          if (details.external_ids?.imdb_id && !imdbId) imdbId = details.external_ids.imdb_id;
          if (!tmdbSeason && details.seasons) {
            const s = details.seasons.find((s: any) => s.season_number > 0 && s.episode_count > 0);
            if (s) tmdbSeason = s.season_number;
          }
          // Use TMDB episode count if we still don't have one
          if (!totalEpisodes && details.number_of_episodes) {
            totalEpisodes = details.number_of_episodes;
          }
        }
      } catch {}
    }

    // Step 6: TMDB title search fallback
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

    // Step 7: IMDb search fallback
    if (!imdbId && miruroOrJikanData) {
      try {
        const found = await imdbFindAnimeId({
          english: miruroOrJikanData?.title?.english || undefined,
          romaji: miruroOrJikanData?.title?.romaji || undefined,
        });
        if (found) imdbId = found;
      } catch {}
    }

    // Step 8: Cross-reference to AllAnime
    const searchTitle = miruroOrJikanData?.title?.english || miruroOrJikanData?.title?.romaji ||
      anilistData?.title?.english || anilistData?.title?.romaji;
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

    // Step 9: AllAnime info
    if (resolvedAllAnimeId) {
      try { allanimeData = await getAnimeInfo(resolvedAllAnimeId); } catch {}
    }

    return NextResponse.json({
      anime: allanimeData,
      miruroInfo: isJikanSource ? jikanData : miruroData,
      anilistInfo: anilistData ? {
        id: anilistData.id,
        title: anilistData.title,
        episodes: anilistData.episodes,
        nextAiringEpisode: anilistData.nextAiringEpisode,
        status: anilistData.status,
        format: anilistData.format,
        season: anilistData.season,
        seasonYear: anilistData.seasonYear,
        averageScore: anilistData.averageScore,
        genres: anilistData.genres,
      } : null,
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
      _source: isJikanSource ? "jikan" : "default",
    });
  } catch {
    return NextResponse.json({
      anime: null, miruroInfo: null, anilistInfo: null, allAnimeId: null,
      tmdbId: null, tmdbSeason: null, tmdbData: null, imdbId: null, zenshinMappings: null,
      totalEpisodes: null, nextAiringEpisode: null, _source: "failed",
    });
  }
}
