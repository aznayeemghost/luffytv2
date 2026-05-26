import { NextResponse } from "next/server";

// ============================================================
// EDGE M3U8 CATCH-ALL PROXY — Handles rewritten manifest URLs
// When the main proxy rewrites M3U8 manifests, segment URLs point
// to /api/live/proxy/https://host/path — this catch-all handles those
// ============================================================

export const runtime = "edge";

const ALLOWED_HOSTS = [
  "streamfree.app",
  "afafjhahkjfhkajsf.shop",
  "cdn-lab.shop",
  "lb1.strmd.top", "lb2.strmd.top", "lb3.strmd.top",
  "lb4.strmd.top", "lb5.strmd.top", "lb6.strmd.top",
  "lb7.strmd.top", "lb8.strmd.top", "lb9.strmd.top",
  "lb10.strmd.top", "lb11.strmd.top", "lb12.strmd.top",
  "strmd.top",
  "edge.cdnlivetv.ru",
  "cdnlivetv.ru",
  "cdnlivetv.tv",
  "dami-tv.pro",
  "sportsembed.su",
  "embedsports.top",
  "streamed.pk",
];

function getRefererForHost(hostname: string): string {
  if (hostname.includes("streamfree") || hostname.includes("cdn-lab") || hostname.includes("afafjhahkjfhkajsf")) {
    return "https://streamfree.app/";
  } else if (hostname.includes("cdnlivetv")) {
    return "https://cdnlivetv.tv/";
  } else if (hostname.includes("dami-tv")) {
    return "https://dami-tv.pro/";
  } else if (hostname.includes("strmd")) {
    return "https://embedsports.top/";
  } else if (hostname.includes("sportsembed")) {
    return "https://sportsembed.su/";
  } else if (hostname.includes("embedsports")) {
    return "https://embedsports.top/";
  } else if (hostname.includes("streamed")) {
    return "https://streamed.pk/";
  }
  return "";
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const pathStr = path.join("/");
  const url = new URL(req.url);

  // Reconstruct the target URL from the path
  let targetUrl: string;
  if (pathStr.startsWith("http:/") || pathStr.startsWith("https:/")) {
    // Fix double-slash: https:/host → https://host
    targetUrl = pathStr.startsWith("http:/") && !pathStr.startsWith("http://")
      ? pathStr.replace("http:/", "http://")
      : pathStr.startsWith("https:/") && !pathStr.startsWith("https://")
        ? pathStr.replace("https:/", "https://")
        : pathStr;
  } else {
    return NextResponse.json({ error: "Invalid proxy path" }, { status: 400 });
  }

  // Append any remaining query params
  const cleanParams = new URLSearchParams(url.searchParams);
  const cleanQs = cleanParams.toString();
  if (cleanQs) targetUrl = `${targetUrl}?${cleanQs}`;

  // Validate host
  let targetHost: string;
  try { targetHost = new URL(targetUrl).hostname; } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  const isAllowed = ALLOWED_HOSTS.some(h => targetHost === h || targetHost.endsWith(`.${h}`));
  if (!isAllowed) {
    return NextResponse.json({ error: "Host not allowed" }, { status: 403 });
  }

  const referer = getRefererForHost(targetHost);

  try {
    const headers: Record<string, string> = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      Accept: "*/*",
    };

    if (referer) {
      headers["Referer"] = referer;
      try { headers["Origin"] = new URL(referer).origin; } catch {}
    }

    const range = req.headers.get("range");
    if (range) headers["Range"] = range;

    const res = await fetch(targetUrl, { headers, redirect: "follow" });
    const body = await res.arrayBuffer();

    const responseHeaders: Record<string, string> = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "*",
      "Cache-Control": "public, max-age=5",
    };

    for (const h of ["content-type", "content-length", "content-range", "accept-ranges"]) {
      const val = res.headers.get(h);
      if (val) responseHeaders[h] = val;
    }

    // For M3U8 manifests, rewrite URLs to go through proxy
    const contentType = res.headers.get("content-type") || "";
    const isManifest = contentType.includes("mpegurl") || targetUrl.includes(".m3u8");

    if (isManifest) {
      let manifest = new TextDecoder().decode(body);

      for (const host of ALLOWED_HOSTS) {
        manifest = manifest.replace(
          new RegExp(`https?://${host.replace(/\./g, "\\.")}/`, "g"),
          `/api/live/proxy/https://${host}/`
        );
      }

      const baseUrl = targetUrl.substring(0, targetUrl.lastIndexOf("/") + 1);
      manifest = manifest.replace(
        /^([^#\n][^\s]+(\.ts|\.js|\.m3u8)[^\n]*)$/gm,
        (match, segment) => {
          if (segment.startsWith("http") || segment.startsWith("/api/")) return match;
          return `/api/live/proxy/${baseUrl}${segment}`;
        }
      );

      return new NextResponse(new TextEncoder().encode(manifest), {
        status: res.status,
        headers: responseHeaders,
      });
    }

    return new NextResponse(body, {
      status: res.status,
      headers: responseHeaders,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Edge proxy failed", detail: err.message },
      { status: 502 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Max-Age": "86400",
    },
  });
}
