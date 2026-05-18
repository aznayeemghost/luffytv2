import { NextRequest, NextResponse } from "next/server";
import { getHomePage } from "@/lib/anime-api";
import { miruroTrending, miruroPopular, miruroRecent } from "@/lib/miruro-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Home page data: combines AllAnime + Miruro (AniList only for anime — no Jikan/TMDB)
export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get("type") || "sub";

  try {
    const [allanimeData, trending, popular, recent] = await Promise.allSettled([
      getHomePage(type),
      miruroTrending(1, 20),
      miruroPopular(1, 20),
      miruroRecent(1, 20),
    ]);

    const miruroTrendingData = trending.status === "fulfilled" ? trending.value : [];
    const miruroPopularData = popular.status === "fulfilled" ? popular.value : [];
    const miruroRecentData = recent.status === "fulfilled" ? recent.value : [];

    return NextResponse.json({
      trending: allanimeData.status === "fulfilled" ? allanimeData.value.trending : [],
      recent: allanimeData.status === "fulfilled" ? allanimeData.value.recent : [],
      miruroTrending: miruroTrendingData,
      miruroPopular: miruroPopularData,
      miruroRecent: miruroRecentData,
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch home data" }, { status: 500 });
  }
}
