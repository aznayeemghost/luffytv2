import { NextRequest, NextResponse } from "next/server";
import { getTrending, getPopular, getTopRated } from "@/lib/anilist-api";
import { jikanTopAnime, jikanSeasonNow } from "@/lib/jikan-api";
import { miruroTrending, miruroPopular, miruroRecent } from "@/lib/miruro-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/anime/home
 * 3-LAYER FALLBACK: AniList (primary) → Jikan/MAL (backup 1) → Miruro (backup 2)
 *
 * Returns home page data with proper cascading fallback for all sections.
 * The "recent" section uses Miruro as primary (AniList/MAL don't have recent episodes).
 */
export async function GET(request: NextRequest) {
  try {
    // ---- TRENDING: AniList → Jikan → Miruro ----
    let miruroTrendingData: any[] = [];
    let trendingSource = "anilist";

    try {
      const alTrending = await getTrending(1, 20);
      if (alTrending && alTrending.length > 0) {
        miruroTrendingData = alTrending.map(item => ({
          id: item.id,
          title: item.title,
          coverImage: item.coverImage,
          bannerImage: item.bannerImage,
          type: item.type,
          format: item.format,
          status: item.status,
          description: item.description,
          season: item.season,
          seasonYear: item.seasonYear,
          episodes: item.episodes,
          duration: item.duration,
          genres: item.genres,
          averageScore: item.averageScore,
          popularity: item.popularity,
          trending: item.trending,
          countryOfOrigin: item.countryOfOrigin,
          isAdult: item.isAdult,
        }));
      }
    } catch (err) {
      console.error("[home] AniList trending error:", err);
    }

    if (miruroTrendingData.length === 0) {
      try {
        miruroTrendingData = await jikanTopAnime(1, 20, "airing");
        if (miruroTrendingData.length > 0) trendingSource = "mal";
      } catch (err) {
        console.error("[home] Jikan trending error:", err);
      }
    }

    if (miruroTrendingData.length === 0) {
      try {
        miruroTrendingData = await miruroTrending(1, 20);
        if (miruroTrendingData.length > 0) trendingSource = "miruro";
      } catch (err) {
        console.error("[home] Miruro trending error:", err);
      }
    }

    // ---- POPULAR: AniList → Jikan → Miruro ----
    let miruroPopularData: any[] = [];
    let popularSource = "anilist";

    try {
      const alPopular = await getPopular(1, 20);
      if (alPopular && alPopular.length > 0) {
        miruroPopularData = alPopular.map(item => ({
          id: item.id,
          title: item.title,
          coverImage: item.coverImage,
          bannerImage: item.bannerImage,
          type: item.type,
          format: item.format,
          status: item.status,
          description: item.description,
          season: item.season,
          seasonYear: item.seasonYear,
          episodes: item.episodes,
          duration: item.duration,
          genres: item.genres,
          averageScore: item.averageScore,
          popularity: item.popularity,
          trending: item.trending,
          countryOfOrigin: item.countryOfOrigin,
          isAdult: item.isAdult,
        }));
      }
    } catch (err) {
      console.error("[home] AniList popular error:", err);
    }

    if (miruroPopularData.length === 0) {
      try {
        miruroPopularData = await jikanTopAnime(1, 20, "bypopularity");
        if (miruroPopularData.length > 0) popularSource = "mal";
      } catch (err) {
        console.error("[home] Jikan popular error:", err);
      }
    }

    if (miruroPopularData.length === 0) {
      try {
        miruroPopularData = await miruroPopular(1, 20);
        if (miruroPopularData.length > 0) popularSource = "miruro";
      } catch (err) {
        console.error("[home] Miruro popular error:", err);
      }
    }

    // ---- RECENT: Miruro primary → Jikan airing backup ----
    // AniList doesn't have a "recently updated episodes" endpoint
    let miruroRecentData: any[] = [];
    let recentSource = "miruro";

    try {
      miruroRecentData = await miruroRecent(1, 20);
      if (miruroRecentData.length > 0) recentSource = "miruro";
    } catch (err) {
      console.error("[home] Miruro recent error:", err);
    }

    if (miruroRecentData.length === 0) {
      try {
        miruroRecentData = await jikanSeasonNow(1, 20);
        if (miruroRecentData.length > 0) recentSource = "mal";
      } catch (err) {
        console.error("[home] Jikan recent error:", err);
      }
    }

    return NextResponse.json({
      miruroTrending: miruroTrendingData,
      miruroPopular: miruroPopularData,
      miruroRecent: miruroRecentData,
      _sources: {
        trending: trendingSource,
        popular: popularSource,
        recent: recentSource,
      },
    });
  } catch (error) {
    console.error("[home] Error:", error);
    return NextResponse.json({ error: "Failed to fetch home data" }, { status: 500 });
  }
}
