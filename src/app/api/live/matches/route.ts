import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const res = await fetch("https://api.watchfooty.st/api/v1/matches/live", {
      next: { revalidate: 0 },
      headers: {
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!res.ok) {
      throw new Error(`API responded with status ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[Live Matches API] Error fetching live matches:", error);
    // Return empty array on error so the UI can still function
    return NextResponse.json([], { status: 200 });
  }
}
