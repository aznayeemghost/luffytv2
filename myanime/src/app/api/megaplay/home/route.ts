import { NextRequest, NextResponse } from "next/server";

// Proxy route for MegaPlay Decryptor home API
// Avoids CORS issues by proxying requests server-side
export async function GET(request: NextRequest) {
  try {
    const url = `https://megaplaydecryptor.vercel.app/api/home`;
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
      { success: false, error: err.message || "Failed to fetch home" },
      { status: 500 }
    );
  }
}
