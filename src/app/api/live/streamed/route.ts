import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ── Proxy for StreamedPK stream API ──
// Client-side can't call streamed.pk directly (CORS), so we proxy it here.
// GET /api/live/streamed?source=admin&id=ppv-xxx

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const source = searchParams.get("source");
    const id = searchParams.get("id");

    if (!source || !id) {
      return NextResponse.json(
        { success: false, error: "source and id required" },
        { status: 400 }
      );
    }

    // Validate source name — only allow known StreamedPK sources
    const ALLOWED_SOURCES = ["admin", "alpha", "bravo", "charlie", "delta", "echo", "foxtrot", "golf", "hotel", "intel"];
    if (!ALLOWED_SOURCES.includes(source)) {
      return NextResponse.json(
        { success: false, error: "Invalid source" },
        { status: 400 }
      );
    }

    const res = await fetch(`https://streamed.pk/api/stream/${source}/${encodeURIComponent(id)}`, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: `StreamedPK returned ${res.status}`, streams: [] },
        { status: res.status }
      );
    }

    const data = await res.json();

    if (!Array.isArray(data)) {
      return NextResponse.json({ success: true, streams: [] });
    }

    // Transform the StreamedPK response into our StreamInfo format
    const STREAMED_LABELS: Record<string, string> = {
      admin: "Admin", alpha: "Alpha", bravo: "Bravo", charlie: "Charlie",
      delta: "Delta", echo: "Echo", foxtrot: "Foxtrot", golf: "Golf",
      hotel: "Hotel", intel: "Intel",
    };

    const streams = data
      .filter((s: any) => s.embedUrl)
      .map((s: any) => {
        const label = STREAMED_LABELS[source] || source.charAt(0).toUpperCase() + source.slice(1);
        const streamLabel = s.streamNo && s.streamNo > 1 ? `${label} S${s.streamNo}` : label;
        return {
          url: s.embedUrl,
          type: "embed" as const,
          quality: s.hd ? "720p" : "SD",
          language: s.language || "English",
          source: streamLabel,
          hd: s.hd || false,
          streamNo: s.streamNo,
          embedUrl: s.embedUrl,
          provider: "streamed",
        };
      });

    return NextResponse.json({ success: true, streams });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch stream", streams: [] },
      { status: 500 }
    );
  }
}
