import { NextRequest, NextResponse } from "next/server";
import { getTrending, getPopular, getTopRated, getSeasonAnime } from "@/lib/anilist-api";
import { jikanTopAnime, jikanSeasonNow } from "@/lib/jikan-api";
import { miruroTrending, miruroPopular } from "@/lib/miruro-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/anime/anilist-trending
 * 3-LAYER FALLBACK: AniList (primary) → Jikan/MAL (backup 1) → Miruro (backup 2)
 *
 * Optional query params:
 *   - section: "trending" | "popular" | "topRated" | "season" | "all" (default: all)
 *   - season: "SPRING" | "SUMMER" | "FALL" | "WINTER" (for season filter)
 *   - year: number (for season filter, e.g. 2025)
 */
export async function GET(request: NextRequest) {
  const section = request.nextUrl.searchParams.get("section") || "all";
  const season = request.nextUrl.searchParams.get("season") || undefined;
  const yearStr = request.nextUrl.searchParams.get("year");
  const year = yearStr ? parseInt(yearStr) : new Date().getFullYear();

  try {
    const results: Record<string, any> = {};

    // ---- TRENDING: AniList → Jikan → Miruro ----
    if (section === "all" || section === "trending") {
      let trendingData: any[] = [];
      let source = "anilist";

      // Layer 1: AniList
      try {
        trendingData = await getTrending(1, 25);
        if (trendingData.length > 0) source = "anilist";
      } catch (err) {
        console.error("[anilist-trending] AniList trending error:", err);
      }

      // Layer 2: Jikan/MAL backup
      if (trendingData.length === 0) {
        try {
          trendingData = await jikanTopAnime(1, 25, "airing");
          if (trendingData.length > 0) source = "mal";
        } catch (err) {
          console.error("[anilist-trending] Jikan trending error:", err);
        }
      }

      // Layer 3: Miruro backup
      if (trendingData.length === 0) {
        try {
          trendingData = await miruroTrending(1, 25);
          if (trendingData.length > 0) source = "miruro";
        } catch (err) {
          console.error("[anilist-trending] Miruro trending error:", err);
        }
      }

      results.trending = trendingData;
      results._trendingSource = source;
    }

    // ---- POPULAR: AniList → Jikan → Miruro ----
    if (section === "all" || section === "popular") {
      let popularData: any[] = [];
      let source = "anilist";

      // Layer 1: AniList
      try {
        popularData = await getPopular(1, 25);
        if (popularData.length > 0) source = "anilist";
      } catch (err) {
        console.error("[anilist-trending] AniList popular error:", err);
      }

      // Layer 2: Jikan/MAL backup
      if (popularData.length === 0) {
        try {
          popularData = await jikanTopAnime(1, 25, "bypopularity");
          if (popularData.length > 0) source = "mal";
        } catch (err) {
          console.error("[anilist-trending] Jikan popular error:", err);
        }
      }

      // Layer 3: Miruro backup
      if (popularData.length === 0) {
        try {
          popularData = await miruroPopular(1, 25);
          if (popularData.length > 0) source = "miruro";
        } catch (err) {
          console.error("[anilist-trending] Miruro popular error:", err);
        }
      }

      results.popular = popularData;
      results._popularSource = source;
    }

    // ---- TOP RATED: AniList → Jikan → Miruro ----
    if (section === "all" || section === "topRated") {
      let topRatedData: any[] = [];
      let source = "anilist";

      // Layer 1: AniList
      try {
        topRatedData = await getTopRated(1, 25);
        if (topRatedData.length > 0) source = "anilist";
      } catch (err) {
        console.error("[anilist-trending] AniList topRated error:", err);
      }

      // Layer 2: Jikan/MAL backup (top anime without filter = by score)
      if (topRatedData.length === 0) {
        try {
          topRatedData = await jikanTopAnime(1, 25);
          if (topRatedData.length > 0) source = "mal";
        } catch (err) {
          console.error("[anilist-trending] Jikan topRated error:", err);
        }
      }

      // Layer 3: Miruro backup (use popular as topRated proxy)
      if (topRatedData.length === 0) {
        try {
          topRatedData = await miruroPopular(1, 25);
          if (topRatedData.length > 0) source = "miruro";
        } catch (err) {
          console.error("[anilist-trending] Miruro topRated error:", err);
        }
      }

      results.topRated = topRatedData;
      results._topRatedSource = source;
    }

    // ---- SEASON: AniList → Jikan ----
    if (section === "season" || section === "all") {
      const currentMonth = new Date().getMonth();
      let currentSeason = season;
      if (!currentSeason) {
        if (currentMonth >= 0 && currentMonth <= 2) currentSeason = "WINTER";
        else if (currentMonth >= 3 && currentMonth <= 5) currentSeason = "SPRING";
        else if (currentMonth >= 6 && currentMonth <= 8) currentSeason = "SUMMER";
        else currentSeason = "FALL";
      }

      let seasonData: any[] = [];
      let source = "anilist";

      // Layer 1: AniList
      try {
        seasonData = await getSeasonAnime(currentSeason, year, 1, 25);
        if (seasonData.length > 0) source = "anilist";
      } catch (err) {
        console.error("[anilist-trending] AniList season error:", err);
      }

      // Layer 2: Jikan/MAL backup
      if (seasonData.length === 0) {
        try {
          seasonData = await jikanSeasonNow(1, 25);
          if (seasonData.length > 0) source = "mal";
        } catch (err) {
          console.error("[anilist-trending] Jikan season error:", err);
        }
      }

      results.season = seasonData;
      results.seasonInfo = { season: currentSeason, year };
      results._seasonSource = source;
    }

    return NextResponse.json(results);
  } catch (err) {
    console.error("[anilist-trending] Error:", err);
    return NextResponse.json({ error: "Failed to fetch trending data" }, { status: 500 });
  }
}
