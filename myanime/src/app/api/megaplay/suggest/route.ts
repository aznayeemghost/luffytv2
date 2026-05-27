import { NextRequest, NextResponse } from "next/server";

// Proxy route for MegaPlay Decryptor suggest API
// Avoids CORS issues by proxying requests server-side
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");

  if (!q) {
    return NextResponse.json(
      { success: false, error: "Missing q parameter" },
      { status: 400 }
    );
  }

  try {
    const url = `https://megaplaydecryptor.vercel.app/api/suggest?q=${encodeURIComponent(q)}`;
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
      { success: false, error: err.message || "Failed to fetch suggestions" },
      { status: 500 }
    );
  }
}
