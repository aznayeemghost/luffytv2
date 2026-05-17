import { NextRequest, NextResponse } from "next/server";
import { getHomePage } from "@/lib/anime-api";
import { miruroTrending, miruroPopular, miruroRecent } from "@/lib/miruro-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Home page data: combines AllAnime + Miruro for maximum content
export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get("type") || "sub";

  try {
    const [allanimeData, trending, popular, recent] = await Promise.allSettled([
      getHomePage(type),
      miruroTrending(1, 20),
      miruroPopular(1, 20),
      miruroRecent(1, 20),
    ]);

    return NextResponse.json({
      trending: allanimeData.status === "fulfilled" ? allanimeData.value.trending : [],
      recent: allanimeData.status === "fulfilled" ? allanimeData.value.recent : [],
      miruroTrending: trending.status === "fulfilled" ? trending.value : [],
      miruroPopular: popular.status === "fulfilled" ? popular.value : [],
      miruroRecent: recent.status === "fulfilled" ? recent.value : [],
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch home data" }, { status: 500 });
  }
}
