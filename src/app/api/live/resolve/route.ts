import { NextResponse } from "next/server";

// ============================================================
// DAMITV RESOLVE API — Resolves TV channel stream URLs
// Uses DamiTV /papi/tv/resolve/{id} endpoint to get stream URLs
// Returns the resolved stream URL for iframe embedding
// ============================================================

export const runtime = "edge";

const TIMEOUT = 10000;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const channelId = url.searchParams.get("id") || "";

  if (!channelId) {
    return NextResponse.json({ error: "Missing channel id" }, { status: 400 });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT);

    // Call DamiTV resolve endpoint
    const resolveUrl = `https://dami-tv.pro/papi/tv/resolve/${encodeURIComponent(channelId)}`;
    const res = await fetch(resolveUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": UA,
        Accept: "application/json",
        Referer: "https://dami-tv.pro/",
      },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return NextResponse.json({
        error: `Resolve endpoint returned ${res.status}`,
        channelId,
      });
    }

    const data = await res.json();

    if (data.success && data.stream) {
      // The stream path is like /papi/tv/playlist/{base64}
      // Construct the full URL for the DamiTV playlist
      const streamUrl = data.stream.startsWith("http")
        ? data.stream
        : `https://dami-tv.pro${data.stream}`;

      // Also provide the DamiTV embed URL as an alternative
      const embedUrl = `https://dami-tv.pro/embed/?id=${encodeURIComponent(channelId)}`;

      return NextResponse.json({
        success: true,
        channelId,
        streamUrl,
        embedUrl,
        raw: data,
      });
    }

    return NextResponse.json({
      error: "Resolve endpoint did not return a valid stream",
      channelId,
      raw: data,
    });
  } catch (err: any) {
    return NextResponse.json({
      error: err.message || "Failed to resolve channel",
      channelId,
    });
  }
}
