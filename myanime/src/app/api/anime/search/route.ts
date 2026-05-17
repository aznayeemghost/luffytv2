import { NextRequest, NextResponse } from "next/server";
import { searchAnime } from "@/lib/anime-api";
import { miruroSearch } from "@/lib/miruro-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") || "";
  const page = parseInt(request.nextUrl.searchParams.get("page") || "1");
  const type = request.nextUrl.searchParams.get("type") || ""; // "sub" or "dub"

  if (!q) return NextResponse.json({ results: [], miruroResults: [] });

  try {
    const [allanimeData, miruroData] = await Promise.allSettled([
      searchAnime(q, page, 26, type || undefined),
      miruroSearch(q, page),
    ]);

    return NextResponse.json({
      results: allanimeData.status === "fulfilled" ? allanimeData.value.results : [],
      hasNextPage: allanimeData.status === "fulfilled" ? allanimeData.value.pageInfo.hasNextPage : false,
      miruroResults: miruroData.status === "fulfilled" ? miruroData.value.results : [],
    });
  } catch {
    return NextResponse.json({ results: [], miruroResults: [] });
  }
}
