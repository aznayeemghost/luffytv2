import { NextRequest, NextResponse } from "next/server";
import { searchAnime } from "@/lib/anime-api";
import { miruroSearch } from "@/lib/miruro-api";
import { jikanSearch } from "@/lib/jikan-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") || "";
  const page = parseInt(request.nextUrl.searchParams.get("page") || "1");
  const type = request.nextUrl.searchParams.get("type") || ""; // "sub" or "dub"

  if (!q) return NextResponse.json({ results: [], miruroResults: [], jikanResults: [] });

  try {
    const [allanimeData, miruroData, jikanData] = await Promise.allSettled([
      searchAnime(q, page, 26, type || undefined),
      miruroSearch(q, page),
      jikanSearch(q, page, 25),
    ]);

    const miruroResults = miruroData.status === "fulfilled" ? miruroData.value.results : [];
    const jikanResults = jikanData.status === "fulfilled" ? jikanData.value.results : [];

    return NextResponse.json({
      results: allanimeData.status === "fulfilled" ? allanimeData.value.results : [],
      hasNextPage: allanimeData.status === "fulfilled" ? allanimeData.value.pageInfo.hasNextPage : false,
      miruroResults,
      jikanResults,
    });
  } catch {
    return NextResponse.json({ results: [], miruroResults: [], jikanResults: [] });
  }
}
