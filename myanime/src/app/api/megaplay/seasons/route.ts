import { NextRequest, NextResponse } from "next/server";

// Proxy route for MegaPlay Decryptor seasons API
// Avoids CORS issues by proxying requests server-side
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const season = searchParams.get("season");
  const year = searchParams.get("year");
  const page = searchParams.get("page") || "1";

  if (!season || !year) {
    return NextResponse.json(
      { success: false, error: "Missing season or year parameter" },
      { status: 400 }
    );
  }

  try {
    const url = `https://megaplaydecryptor.vercel.app/api/seasons?season=${encodeURIComponent(season)}&year=${encodeURIComponent(year)}&page=${encodeURIComponent(page)}`;
    const res = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "LuffyTV/1.0",
      },
    });

    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: `Upstream returned ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch seasons" },
      { status: 500 }
    );
  }
}
