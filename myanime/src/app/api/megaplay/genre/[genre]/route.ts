import { NextRequest, NextResponse } from "next/server";

// Proxy route for MegaPlay Decryptor genre API
// Avoids CORS issues by proxying requests server-side
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ genre: string }> }
) {
  const { searchParams } = new URL(request.url);
  const page = searchParams.get("page") || "1";
  const { genre } = await params;

  if (!genre) {
    return NextResponse.json(
      { success: false, error: "Missing genre parameter" },
      { status: 400 }
    );
  }

  try {
    const url = `https://megaplaydecryptor.vercel.app/api/genre/${encodeURIComponent(genre)}?page=${encodeURIComponent(page)}`;
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
      { success: false, error: err.message || "Failed to fetch genre" },
      { status: 500 }
    );
  }
}
