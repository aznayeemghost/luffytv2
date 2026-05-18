import { NextRequest, NextResponse } from "next/server";
import { miruroWatch, MIRURO_PROVIDERS } from "@/lib/miruro-api";

export async function GET(req: NextRequest) {
  const requestedProvider = req.nextUrl.searchParams.get("provider") || "kiwi";
  const id = parseInt(req.nextUrl.searchParams.get("id") || "0");
  const translationType = (req.nextUrl.searchParams.get("type") || "sub") as "sub" | "dub";
  const slug = req.nextUrl.searchParams.get("slug") || "1";

  if (!id) {
    return NextResponse.json({ success: false, error: "Parameter 'id' (AniList ID) is required" }, { status: 400 });
  }

  // Try the requested provider first, then fallback to other providers
  const providers = [requestedProvider, ...MIRURO_PROVIDERS.filter(p => p !== requestedProvider)];

  for (const provider of providers) {
    try {
      const data = await miruroWatch(provider, id, translationType, slug);
      if (data && data.sources?.length > 0) {
        return NextResponse.json({ success: true, data, provider });
      }
    } catch {
      // Continue to next provider
    }
  }

  return NextResponse.json({
    success: false,
    error: "Stream unavailable — Miruro API is currently down. Try another server (Server 2+).",
  }, { status: 503 });
}
