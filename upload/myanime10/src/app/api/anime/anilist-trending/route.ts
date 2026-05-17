import { NextRequest, NextResponse } from "next/server";
import { getTrending, getPopular, getTopRated, getSeasonAnime } from "@/lib/anilist-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/anime/anilist-trending
 * Returns trending, popular, and top-rated anime from AniList directly.
 * Optional query params:
 *   - section: "trending" | "popular" | "topRated" | "season" (default: all)
 *   - season: "SPRING" | "SUMMER" | "FALL" | "WINTER" (for season filter)
 *   - year: number (for season filter, e.g. 2025)
 */
export async function GET(request: NextRequest) {
  const section = request.nextUrl.searchParams.get("section") || "all";
  const season = request.nextUrl.searchParams.get("season") || undefined;
  const yearStr = request.nextUrl.searchParams.get("year");
  const year = yearStr ? parseInt(yearStr) : new Date().getFullYear();

  try {
    const results: Record<string, any[]> = {};

    if (section === "all" || section === "trending") {
      results.trending = await getTrending(1, 25);
    }
    if (section === "all" || section === "popular") {
      results.popular = await getPopular(1, 25);
    }
    if (section === "all" || section === "topRated") {
      results.topRated = await getTopRated(1, 25);
    }
    if (section === "season" || section === "all") {
      // Determine current season if not specified
      const currentMonth = new Date().getMonth();
      let currentSeason = season;
      if (!currentSeason) {
        if (currentMonth >= 0 && currentMonth <= 2) currentSeason = "WINTER";
        else if (currentMonth >= 3 && currentMonth <= 5) currentSeason = "SPRING";
        else if (currentMonth >= 6 && currentMonth <= 8) currentSeason = "SUMMER";
        else currentSeason = "FALL";
      }
      results.season = await getSeasonAnime(currentSeason, year, 1, 25);
      results.seasonInfo = { season: currentSeason, year };
    }

    return NextResponse.json(results);
  } catch (err) {
    console.error("[anilist-trending] Error:", err);
    return NextResponse.json({ error: "Failed to fetch AniList trending data" }, { status: 500 });
  }
}
