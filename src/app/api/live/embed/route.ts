import { NextResponse } from "next/server";

// ============================================================
// LIVE EMBED PROXY — Resolves the actual embed URL
// Fetches from embedsports.top/admin/{id}/{streamNo} to get the
// real embeddable URL, or constructs direct embed URLs
// ============================================================

const TIMEOUT = 10000;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const matchId = url.searchParams.get("id");
  const streamNo = url.searchParams.get("streamNo") || "1";
  const source = url.searchParams.get("source") || "";
  const embedUrl = url.searchParams.get("embedUrl") || "";

  if (!matchId && !embedUrl) {
    return NextResponse.json({ error: "Missing id or embedUrl" }, { status: 400 });
  }

  // If we already have an embed URL, try to resolve it
  if (embedUrl) {
    // For embedsports.top embed URLs, fetch the JSON to get the real URL
    if (embedUrl.includes("embedsports.top")) {
      try {
        const ctrl = new AbortController();
        setTimeout(() => ctrl.abort(), TIMEOUT);
        const res = await fetch(embedUrl, {
          signal: ctrl.signal,
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            Accept: "application/json",
          },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.embedUrl) {
            return NextResponse.json({
              embedUrl: data.embedUrl,
              source: data.source || "embedsports.top",
              viewers: data.viewers || 0,
              language: data.language || "",
              hd: data.hd || false,
            });
          }
        }
      } catch {
        // Fall through to direct embed
      }
    }

    // Return the embed URL as-is for other sources
    return NextResponse.json({ embedUrl, source: source || "direct" });
  }

  // Try to resolve from embedsports.top
  if (matchId) {
    try {
      const ctrl = new AbortController();
      setTimeout(() => ctrl.abort(), TIMEOUT);
      const embedEndpoint = `https://embedsports.top/embed/admin/${matchId}/${streamNo}`;
      const res = await fetch(embedEndpoint, {
        signal: ctrl.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Accept: "application/json",
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.embedUrl) {
          return NextResponse.json({
            embedUrl: data.embedUrl,
            source: data.source || "embedsports.top",
            viewers: data.viewers || 0,
            language: data.language || "",
            hd: data.hd || false,
          });
        }
      }
    } catch {
      // Fall through
    }

    // Fallback: construct a direct embed URL
    // Try various embed providers
    const fallbacks = [
      `https://embedstreams.me/${matchId}`,
      `https://ntv.cx/embed?t=${encodeURIComponent(matchId)}`,
    ];

    return NextResponse.json({
      embedUrl: fallbacks[0],
      source: "fallback",
      fallbacks,
    });
  }

  return NextResponse.json({ error: "Could not resolve embed URL" }, { status: 404 });
}
