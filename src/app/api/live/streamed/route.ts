import { NextResponse } from "next/server";

// ============================================================
// StreamedPK API Proxy — Server-side proxy for streamed.pk
// Avoids CORS issues by proxying all StreamedPK API calls
// through our server.
//
// Usage:
//   ?source=admin&id=xxx   → https://streamed.pk/api/stream/admin/xxx
//   ?source=alpha&id=xxx   → https://streamed.pk/api/stream/alpha/xxx
//   ?endpoint=/api/matches/live → https://streamed.pk/api/matches/live
// ============================================================

export const runtime = "edge";

const TIMEOUT = 12000;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

const VALID_SOURCES = new Set(["admin", "alpha", "bravo", "charlie", "delta", "echo", "foxtrot", "golf", "hotel", "intel"]);

export async function GET(req: Request) {
  const url = new URL(req.url);
  const source = url.searchParams.get("source") || "";
  const id = url.searchParams.get("id") || "";
  const endpoint = url.searchParams.get("endpoint") || "";

  // CORS headers for all responses
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  // Handle OPTIONS preflight
  if (req.method === "OPTIONS") {
    return NextResponse.json({}, { headers: corsHeaders });
  }

  try {
    let targetUrl = "";

    if (source && id) {
      // Stream source + ID: proxy stream API
      if (!VALID_SOURCES.has(source.toLowerCase())) {
        return NextResponse.json(
          { error: `Invalid source: ${source}. Valid sources: ${[...VALID_SOURCES].join(", ")}` },
          { status: 400, headers: corsHeaders }
        );
      }
      targetUrl = `https://streamed.pk/api/stream/${source.toLowerCase()}/${encodeURIComponent(id)}`;
    } else if (endpoint) {
      // Arbitrary endpoint: proxy match listing or other API calls
      // Only allow /api/ paths for security
      if (!endpoint.startsWith("/api/")) {
        return NextResponse.json(
          { error: "Endpoint must start with /api/" },
          { status: 400, headers: corsHeaders }
        );
      }
      targetUrl = `https://streamed.pk${endpoint}`;
    } else {
      return NextResponse.json(
        { error: "Provide either source+id or endpoint parameter" },
        { status: 400, headers: corsHeaders }
      );
    }

    const res = await fetch(targetUrl, {
      signal: AbortSignal.timeout(TIMEOUT),
      headers: {
        "User-Agent": UA,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `StreamedPK API returned ${res.status}`, upstreamStatus: res.status },
        { status: res.status, headers: corsHeaders }
      );
    }

    const data = await res.json();

    return NextResponse.json(data, {
      headers: {
        ...corsHeaders,
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch from StreamedPK" },
      { status: 500, headers: corsHeaders }
    );
  }
}
