import { NextRequest, NextResponse } from "next/server";
import { getAnimeDetails, getAnimeCharactersAndStaff } from "@/lib/anilist-api";
import { jikanAnimeCharacters, jikanAnimeRecommendations, jikanAnimeRelations, jikanCharacterToAniListFormat, jikanRecommendationToAniListFormat, jikanRelationToAniListFormat } from "@/lib/jikan-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/anime/anilist-detail?id=12345
 * Returns full AniList detail including characters, voice actors, staff,
 * studios, recommendations, relations, trailer, nextAiringEpisode, etc.
 * Falls back to Jikan/MAL API when AniList is unavailable.
 */
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const anilistId = parseInt(id);
  if (isNaN(anilistId)) return NextResponse.json({ error: "invalid id" }, { status: 400 });

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

        return NextResponse.json({
          characters: characters.status === "fulfilled"
            ? characters.value.map(jikanCharacterToAniListFormat) : [],
          staff: [], // Jikan doesn't have a dedicated staff endpoint
          recommendations: recommendations.status === "fulfilled"
            ? recommendations.value.map(jikanRecommendationToAniListFormat) : [],
          relations: relations.status === "fulfilled"
            ? relations.value.flatMap(r => jikanRelationToAniListFormat(r).entries) : [],
          studios: [], // Studios come from the main anime info endpoint
          trailer: null,
          details: null,
          _source: "jikan",
        });
      } catch {
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
    console.error("[anilist-detail] AniList error, trying Jikan fallback:", err);

    // AniList completely failed — try Jikan as fallback
    try {
      const [characters, recommendations, relations] = await Promise.allSettled([
        jikanAnimeCharacters(anilistId),
        jikanAnimeRecommendations(anilistId),
        jikanAnimeRelations(anilistId),
      ]);

      return NextResponse.json({
        characters: characters.status === "fulfilled"
          ? characters.value.map(jikanCharacterToAniListFormat) : [],
        staff: [], // Jikan doesn't have a dedicated staff endpoint
        recommendations: recommendations.status === "fulfilled"
          ? recommendations.value.map(jikanRecommendationToAniListFormat) : [],
        relations: relations.status === "fulfilled"
          ? relations.value.flatMap(r => jikanRelationToAniListFormat(r).entries) : [],
        studios: [], // Studios come from the main anime info endpoint
        trailer: null,
        details: null,
        _source: "jikan",
      });
    } catch {
      return NextResponse.json({ error: "Failed to fetch anime detail data from both AniList and Jikan" }, { status: 500 });
    }
  }
}
