import { NextRequest, NextResponse } from "next/server";
import { getHomePage } from "@/lib/anime-api";
import { miruroTrending, miruroPopular, miruroRecent } from "@/lib/miruro-api";
import { jikanTopAnime, jikanSeasonNow, jikanSeasonUpcoming } from "@/lib/jikan-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Home page data: combines AllAnime + Miruro for maximum content, with Jikan fallback
export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get("type") || "sub";

  try {
    const [allanimeData, trending, popular, recent] = await Promise.allSettled([
      getHomePage(type),
      miruroTrending(1, 20),
      miruroPopular(1, 20),
      miruroRecent(1, 20),
    ]);

    let miruroTrendingData = trending.status === "fulfilled" ? trending.value : [];
    let miruroPopularData = popular.status === "fulfilled" ? popular.value : [];
    let miruroRecentData = recent.status === "fulfilled" ? recent.value : [];

    // If Miruro returned empty data (API down), use Jikan as fallback
    if (miruroTrendingData.length === 0 || miruroPopularData.length === 0) {
      try {
        const [jikanTop, jikanSeason, jikanUpcoming] = await Promise.allSettled([
          jikanTopAnime(1, 25, "bypopularity"),
          jikanSeasonNow(1, 25),
          jikanSeasonUpcoming(1, 25),
        ]);

        if (miruroTrendingData.length === 0 && jikanTop.status === "fulfilled") {
          miruroTrendingData = jikanTop.value;
        }
        if (miruroPopularData.length === 0 && jikanSeason.status === "fulfilled") {
          miruroPopularData = jikanSeason.value;
        }
        if (miruroRecentData.length === 0 && jikanUpcoming.status === "fulfilled") {
          miruroRecentData = jikanUpcoming.value;
        }
      } catch { /* Jikan fallback also failed */ }
    }

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
