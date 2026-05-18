import { NextRequest, NextResponse } from "next/server";
import { getAnimeDetails } from "@/lib/anilist-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const cleanId = id.replace(/^miruro_/, "").replace(/^mal_/, "");
  const anilistId = /^\d+$/.test(cleanId) ? parseInt(cleanId) : null;

  if (!anilistId) {
    return NextResponse.json({ error: "Invalid anime ID", anime: null, anilistInfo: null });
  }

  try {
    const anilistData = await getAnimeDetails(anilistId);

    if (!anilistData) {
      return NextResponse.json({ error: "Anime not found", anime: null, anilistInfo: null });
    }

    // Build a clean response from AniList only
    const anilistInfo = {
      id: anilistData.id,
      idMal: anilistData.idMal,
      title: anilistData.title,
      coverImage: anilistData.coverImage,
      bannerImage: anilistData.bannerImage,
      description: anilistData.description,
      type: anilistData.type,
      format: anilistData.format,
      status: anilistData.status,
      episodes: anilistData.episodes,
      duration: anilistData.duration,
      genres: anilistData.genres,
      averageScore: anilistData.averageScore,
      meanScore: anilistData.meanScore,
      popularity: anilistData.popularity,
      trending: anilistData.trending,
      season: anilistData.season,
      seasonYear: anilistData.seasonYear,
      countryOfOrigin: anilistData.countryOfOrigin,
      isAdult: anilistData.isAdult,
      source: anilistData.source,
      siteUrl: anilistData.siteUrl,
      nextAiringEpisode: anilistData.nextAiringEpisode,
      studios: anilistData.studios?.nodes || [],
      characters: (anilistData.characters?.edges || []).map((edge: any) => ({
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
      staff: (anilistData.staff?.edges || []).map((edge: any) => ({
        id: edge.node.id,
        name: edge.node.name,
        image: edge.node.image,
        role: edge.role,
      })),
      recommendations: (anilistData.recommendations?.nodes || []).map((rec: any) => ({
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
      relations: (anilistData.relations?.edges || []).map((edge: any) => ({
        relationType: edge.relationType,
        id: edge.node.id,
        title: edge.node.title,
        coverImage: edge.node.coverImage,
        type: edge.node.type,
        format: edge.node.format,
        episodes: edge.node.episodes,
        status: edge.node.status,
      })),
      trailer: anilistData.trailer,
      externalLinks: anilistData.externalLinks,
    };

    return NextResponse.json({
      anime: null,
      anilistInfo,
      totalEpisodes: anilistData.episodes || anilistData.nextAiringEpisode?.episode || null,
      nextAiringEpisode: anilistData.nextAiringEpisode || null,
      _source: "anilist",
    });
  } catch (err: any) {
    console.error("[anime/info] Error:", err?.message || err);
    return NextResponse.json({
      error: "Failed to load anime info",
      anime: null,
      anilistInfo: null,
      totalEpisodes: null,
      _source: "failed",
    });
  }
}
