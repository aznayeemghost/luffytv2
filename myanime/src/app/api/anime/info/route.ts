import { NextRequest, NextResponse } from "next/server";
import { getAnimeDetails } from "@/lib/anilist-api";
import { jikanAnimeById, jikanAnimeCharacters, jikanAnimeRelations, jikanAnimeRecommendations, jikanToMiruro, jikanCharacterToAniListFormat, jikanRelationToAniListFormat, jikanRecommendationToAniListFormat } from "@/lib/jikan-api";
import { miruroInfo } from "@/lib/miruro-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Layer 1: AniList (primary)
async function fetchAniList(anilistId: number) {
  try {
    const data = await getAnimeDetails(anilistId);
    if (!data) return null;

    const anilistInfo = {
      id: data.id,
      idMal: data.idMal,
      title: data.title,
      coverImage: data.coverImage,
      bannerImage: data.bannerImage,
      description: data.description,
      type: data.type,
      format: data.format,
      status: data.status,
      episodes: data.episodes,
      duration: data.duration,
      genres: data.genres,
      averageScore: data.averageScore,
      meanScore: data.meanScore,
      popularity: data.popularity,
      trending: data.trending,
      season: data.season,
      seasonYear: data.seasonYear,
      countryOfOrigin: data.countryOfOrigin,
      isAdult: data.isAdult,
      source: data.source,
      siteUrl: data.siteUrl,
      nextAiringEpisode: data.nextAiringEpisode,
      studios: data.studios?.nodes || [],
      characters: (data.characters?.edges || []).map((edge: any) => ({
        id: edge.node.id,
        name: edge.node.name,
        image: edge.node.image,
        role: edge.role,
        voiceActors: (edge.voiceActors || []).map((va: any) => ({
          id: va.id,
          name: va.name,
          image: va.image,
          language: va.language,
        })),
      })),
      staff: (data.staff?.edges || []).map((edge: any) => ({
        id: edge.node.id,
        name: edge.node.name,
        image: edge.node.image,
        role: edge.role,
      })),
      recommendations: (data.recommendations?.nodes || []).map((rec: any) => ({
        id: rec.id,
        rating: rec.rating,
        mediaRecommendation: rec.mediaRecommendation ? {
          id: rec.mediaRecommendation.id,
          title: rec.mediaRecommendation.title,
          coverImage: rec.mediaRecommendation.coverImage,
          type: rec.mediaRecommendation.type,
          episodes: rec.mediaRecommendation.episodes,
          averageScore: rec.mediaRecommendation.averageScore,
          status: rec.mediaRecommendation.status,
        } : null,
      })).filter((r: any) => r.mediaRecommendation),
      relations: (data.relations?.edges || []).map((edge: any) => ({
        relationType: edge.relationType,
        id: edge.node.id,
        title: edge.node.title,
        coverImage: edge.node.coverImage,
        type: edge.node.type,
        format: edge.node.format,
        episodes: edge.node.episodes,
        status: edge.node.status,
      })),
      trailer: data.trailer,
      externalLinks: data.externalLinks,
    };

    return {
      anime: null,
      anilistInfo,
      totalEpisodes: data.episodes || data.nextAiringEpisode?.episode || null,
      nextAiringEpisode: data.nextAiringEpisode || null,
      _source: "anilist",
    };
  } catch (err: any) {
    console.error("[anime/info] AniList error:", err?.message || err);
    return null;
  }
}

// Layer 2: MAL/Jikan (backup 1)
async function fetchMAL(malId: number) {
  try {
    const jikanData = await jikanAnimeById(malId);
    if (!jikanData) return null;

    const miruroResult = jikanToMiruro(jikanData);

    // Fetch extra data in parallel
    const [charsData, relsData, recsData] = await Promise.all([
      jikanAnimeCharacters(malId),
      jikanAnimeRelations(malId),
      jikanAnimeRecommendations(malId),
    ]);

    const anilistInfo = {
      id: malId,
      idMal: malId,
      title: miruroResult.title,
      coverImage: miruroResult.coverImage,
      bannerImage: miruroResult.bannerImage,
      description: miruroResult.description,
      type: miruroResult.type,
      format: miruroResult.format,
      status: miruroResult.status,
      episodes: miruroResult.episodes,
      duration: miruroResult.duration,
      genres: miruroResult.genres,
      averageScore: miruroResult.averageScore,
      season: miruroResult.season,
      seasonYear: miruroResult.seasonYear,
      countryOfOrigin: miruroResult.countryOfOrigin,
      isAdult: miruroResult.isAdult,
      studios: (jikanData.studios || []).map((s: any) => ({ id: s.mal_id, name: s.name, isAnimationStudio: true })),
      characters: charsData.map(jikanCharacterToAniListFormat),
      staff: [],
      recommendations: recsData.map(jikanRecommendationToAniListFormat),
      relations: relsData.flatMap(jikanRelationToAniListFormat).map((r: any) => ({
        relationType: r.relationType,
        id: r.id,
        title: r.title,
        coverImage: r.coverImage,
        type: r.type,
        format: r.format,
        episodes: r.episodes,
      })),
      trailer: jikanData.trailer?.youtube_id ? {
        id: jikanData.trailer.youtube_id,
        site: "youtube",
        thumbnail: jikanData.trailer.images?.medium_image_url || "",
      } : null,
      externalLinks: [],
    };

    return {
      anime: null,
      anilistInfo,
      totalEpisodes: miruroResult.episodes || null,
      nextAiringEpisode: null,
      _source: "mal",
    };
  } catch (err: any) {
    console.error("[anime/info] MAL error:", err?.message || err);
    return null;
  }
}

// Layer 3: Miruro (backup 2)
async function fetchMiruro(anilistId: number) {
  try {
    const data = await miruroInfo(anilistId);
    if (!data) return null;

    const anilistInfo = {
      id: anilistId,
      idMal: null,
      title: data.title,
      coverImage: data.coverImage,
      bannerImage: data.bannerImage,
      description: data.description,
      type: data.type,
      format: data.format,
      status: data.status,
      episodes: data.episodes,
      duration: data.duration,
      genres: data.genres,
      averageScore: data.averageScore,
      season: data.season,
      seasonYear: data.seasonYear,
      countryOfOrigin: data.countryOfOrigin,
      isAdult: data.isAdult,
      studios: [],
      characters: [],
      staff: [],
      recommendations: [],
      relations: [],
      trailer: null,
      externalLinks: [],
    };

    return {
      anime: null,
      anilistInfo,
      totalEpisodes: data.episodes || null,
      nextAiringEpisode: null,
      _source: "miruro",
    };
  } catch (err: any) {
    console.error("[anime/info] Miruro error:", err?.message || err);
    return null;
  }
}

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const cleanId = id.replace(/^miruro_/, "").replace(/^mal_/, "");
  const numericId = /^\d+$/.test(cleanId) ? parseInt(cleanId) : null;

  if (!numericId) {
    return NextResponse.json({ error: "Invalid anime ID", anime: null, anilistInfo: null });
  }

  // 3-layer cascade: AniList → MAL → Miruro
  // Layer 1: Try AniList first
  const anilistResult = await fetchAniList(numericId);
  if (anilistResult) return NextResponse.json(anilistResult);

  // Layer 2: Try MAL/Jikan
  const malResult = await fetchMAL(numericId);
  if (malResult) return NextResponse.json(malResult);

  // Layer 3: Try Miruro
  const miruroResult = await fetchMiruro(numericId);
  if (miruroResult) return NextResponse.json(miruroResult);

  // All 3 failed
  return NextResponse.json({
    error: "Failed to load anime info from all sources",
    anime: null,
    anilistInfo: null,
    totalEpisodes: null,
    _source: "failed",
  });
}
