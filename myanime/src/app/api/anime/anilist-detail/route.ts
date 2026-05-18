import { NextRequest, NextResponse } from "next/server";
import { getAnimeDetails, getAnimeCharactersAndStaff } from "@/lib/anilist-api";
import { jikanAnimeCharacters, jikanAnimeRecommendations, jikanAnimeRelations, jikanCharacterToAniListFormat, jikanRecommendationToAniListFormat, jikanRelationToAniListFormat } from "@/lib/jikan-api";
import { tmdbTVDetails } from "@/lib/tmdb-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/anime/anilist-detail?id=12345
 * Returns full AniList detail including characters, voice actors, staff,
 * studios, recommendations, relations, trailer, nextAiringEpisode, etc.
 *
 * FALLBACK CHAIN: AniList → Jikan/MAL → TMDB
 * When AniList is down, Jikan provides characters/relations.
 * When both AniList and Jikan are down, TMDB provides cast/crew data.
 */
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const anilistId = parseInt(id);
  if (isNaN(anilistId)) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  // Optional TMDB ID for TMDB fallback
  const tmdbIdStr = request.nextUrl.searchParams.get("tmdbId");
  const tmdbId = tmdbIdStr ? parseInt(tmdbIdStr) : null;

  try {
    // Fetch both in parallel
    const [details, charactersAndStaff] = await Promise.all([
      getAnimeDetails(anilistId),
      getAnimeCharactersAndStaff(anilistId),
    ]);

    if (!details) {
      // AniList returned null — API may be down (403). Try Jikan as fallback.
      try {
        const [characters, recommendations, relations] = await Promise.allSettled([
          jikanAnimeCharacters(anilistId),
          jikanAnimeRecommendations(anilistId),
          jikanAnimeRelations(anilistId),
        ]);

        const jikanChars = characters.status === "fulfilled"
          ? characters.value.map(jikanCharacterToAniListFormat) : [];
        const jikanRecs = recommendations.status === "fulfilled"
          ? recommendations.value.map(jikanRecommendationToAniListFormat) : [];
        const jikanRels = relations.status === "fulfilled"
          ? relations.value.flatMap(r => jikanRelationToAniListFormat(r).entries) : [];

        // If Jikan also failed, try TMDB as last resort for cast/crew
        if (jikanChars.length === 0 && tmdbId) {
          try {
            const tmdbDetails = await tmdbTVDetails(tmdbId);
            if (tmdbDetails?.credits?.cast) {
              const tmdbCast = tmdbDetails.credits.cast.slice(0, 16).map((c: any) => ({
                id: c.id,
                name: { full: c.name || "" },
                image: c.profile_path ? {
                  large: `https://image.tmdb.org/t/p/w185${c.profile_path}`,
                  medium: `https://image.tmdb.org/t/p/w92${c.profile_path}`,
                } : undefined,
                role: c.character || "Cast",
              }));

              const tmdbRecs = (tmdbDetails.recommendations?.results || []).slice(0, 8).map((r: any) => ({
                id: r.id,
                title: { english: r.name || r.original_name, romaji: r.original_name },
                coverImage: r.poster_path ? {
                  extraLarge: `https://image.tmdb.org/t/p/w500${r.poster_path}`,
                  large: `https://image.tmdb.org/t/p/w342${r.poster_path}`,
                } : undefined,
                type: "TV",
                averageScore: r.vote_average ? Math.round(r.vote_average * 10) : undefined,
              }));

              return NextResponse.json({
                characters: tmdbCast,
                staff: [], // TMDB doesn't separate staff
                recommendations: tmdbRecs,
                relations: [],
                studios: [],
                trailer: null,
                details: null,
                _source: "tmdb",
              });
            }
          } catch { /* TMDB fallback also failed */ }
        }

        return NextResponse.json({
          characters: jikanChars,
          staff: [], // Jikan doesn't have a dedicated staff endpoint
          recommendations: jikanRecs,
          relations: jikanRels,
          studios: [], // Studios come from the main anime info endpoint
          trailer: null,
          details: null,
          _source: "jikan",
        });
      } catch {
        // Both AniList and Jikan failed — try TMDB if available
        if (tmdbId) {
          try {
            const tmdbDetails = await tmdbTVDetails(tmdbId);
            if (tmdbDetails?.credits?.cast) {
              const tmdbCast = tmdbDetails.credits.cast.slice(0, 16).map((c: any) => ({
                id: c.id,
                name: { full: c.name || "" },
                image: c.profile_path ? {
                  large: `https://image.tmdb.org/t/p/w185${c.profile_path}`,
                  medium: `https://image.tmdb.org/t/p/w92${c.profile_path}`,
                } : undefined,
                role: c.character || "Cast",
              }));

              const tmdbRecs = (tmdbDetails.recommendations?.results || []).slice(0, 8).map((r: any) => ({
                id: r.id,
                title: { english: r.name || r.original_name, romaji: r.original_name },
                coverImage: r.poster_path ? {
                  extraLarge: `https://image.tmdb.org/t/p/w500${r.poster_path}`,
                  large: `https://image.tmdb.org/t/p/w342${r.poster_path}`,
                } : undefined,
                type: "TV",
                averageScore: r.vote_average ? Math.round(r.vote_average * 10) : undefined,
              }));

              return NextResponse.json({
                characters: tmdbCast,
                staff: [],
                recommendations: tmdbRecs,
                relations: [],
                studios: [],
                trailer: null,
                details: null,
                _source: "tmdb",
              });
            }
          } catch { /* TMDB also failed */ }
        }

        return NextResponse.json({ characters: [], staff: [], _source: "failed" });
      }
    }

    // Extract recommendations from details
    const recommendations = (details.recommendations?.nodes || [])
      .filter((r: any) => r.mediaRecommendation)
      .map((r: any) => ({
        id: r.mediaRecommendation.id,
        title: r.mediaRecommendation.title,
        coverImage: r.mediaRecommendation.coverImage,
        type: r.mediaRecommendation.type,
        episodes: r.mediaRecommendation.episodes,
        averageScore: r.mediaRecommendation.averageScore,
        status: r.mediaRecommendation.status,
        rating: r.rating,
      }));

    // Extract relations
    const relations = (details.relations?.edges || []).map((edge: any) => ({
      relationType: edge.relationType,
      id: edge.node.id,
      title: edge.node.title,
      coverImage: edge.node.coverImage,
      type: edge.node.type,
      format: edge.node.format,
      episodes: edge.node.episodes,
      status: edge.node.status,
    }));

    // Extract studios
    const studios = (details.studios?.nodes || []).map((s: any) => ({
      id: s.id,
      name: s.name,
      isAnimationStudio: s.isAnimationStudio,
    }));

    // Extract trailer
    const trailer = details.trailer || null;

    return NextResponse.json({
      details,
      characters: charactersAndStaff?.characters || [],
      staff: charactersAndStaff?.staff || [],
      recommendations,
      relations,
      studios,
      trailer,
      _source: "anilist",
    });
  } catch (err) {
    console.error("[anilist-detail] AniList error, trying fallback chain:", err);

    // AniList completely failed — try Jikan, then TMDB
    try {
      const [characters, recommendations, relations] = await Promise.allSettled([
        jikanAnimeCharacters(anilistId),
        jikanAnimeRecommendations(anilistId),
        jikanAnimeRelations(anilistId),
      ]);

      const jikanChars = characters.status === "fulfilled"
        ? characters.value.map(jikanCharacterToAniListFormat) : [];

      // If Jikan also failed, try TMDB
      if (jikanChars.length === 0 && tmdbId) {
        try {
          const tmdbDetails = await tmdbTVDetails(tmdbId);
          if (tmdbDetails?.credits?.cast) {
            const tmdbCast = tmdbDetails.credits.cast.slice(0, 16).map((c: any) => ({
              id: c.id,
              name: { full: c.name || "" },
              image: c.profile_path ? {
                large: `https://image.tmdb.org/t/p/w185${c.profile_path}`,
                medium: `https://image.tmdb.org/t/p/w92${c.profile_path}`,
              } : undefined,
              role: c.character || "Cast",
            }));

            return NextResponse.json({
              characters: tmdbCast,
              staff: [],
              recommendations: (tmdbDetails.recommendations?.results || []).slice(0, 8).map((r: any) => ({
                id: r.id,
                title: { english: r.name || r.original_name, romaji: r.original_name },
                coverImage: r.poster_path ? {
                  extraLarge: `https://image.tmdb.org/t/p/w500${r.poster_path}`,
                  large: `https://image.tmdb.org/t/p/w342${r.poster_path}`,
                } : undefined,
                type: "TV",
                averageScore: r.vote_average ? Math.round(r.vote_average * 10) : undefined,
              })),
              relations: [],
              studios: [],
              trailer: null,
              details: null,
              _source: "tmdb",
            });
          }
        } catch { /* TMDB also failed */ }
      }

      return NextResponse.json({
        characters: jikanChars,
        staff: [],
        recommendations: recommendations.status === "fulfilled"
          ? recommendations.value.map(jikanRecommendationToAniListFormat) : [],
        relations: relations.status === "fulfilled"
          ? relations.value.flatMap(r => jikanRelationToAniListFormat(r).entries) : [],
        studios: [],
        trailer: null,
        details: null,
        _source: "jikan",
      });
    } catch {
      return NextResponse.json({ error: "Failed to fetch anime detail data from AniList, Jikan, and TMDB" }, { status: 500 });
    }
  }
}
