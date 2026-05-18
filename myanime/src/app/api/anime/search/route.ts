import { NextRequest, NextResponse } from "next/server";
import { searchAnime } from "@/lib/anilist-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") || "";
  const page = parseInt(request.nextUrl.searchParams.get("page") || "1");

  if (!q) return NextResponse.json({ results: [], hasNextPage: false });

  try {
    const data = await searchAnime(q, page, 25);
    if (!data) {
      return NextResponse.json({ results: [], hasNextPage: false });
    }

    // Map AniList results to a clean format
    const results = data.media.map(m => ({
      id: m.id,
      title: m.title,
      coverImage: m.coverImage,
      bannerImage: m.bannerImage,
      type: m.type,
      format: m.format,
      status: m.status,
      episodes: m.episodes,
      genres: m.genres,
      averageScore: m.averageScore,
      popularity: m.popularity,
      season: m.season,
      seasonYear: m.seasonYear,
      description: m.description,
      nextAiringEpisode: m.nextAiringEpisode,
    }));

    return NextResponse.json({
      results,
      hasNextPage: data.pageInfo?.hasNextPage || false,
      currentPage: data.pageInfo?.currentPage || page,
    });
  } catch (err: any) {
    console.error("[anime/search] Error:", err?.message || err);
    return NextResponse.json({ results: [], hasNextPage: false });
  }
}
