import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const TIMEOUT_MS = 10000;

interface Channel {
  id: string;
  name: string;
  category: string;
  logo: string;
  poster: string;
  servers: Array<{ label: string; embedUrl: string }>;
}

async function fetchWithTimeout(url: string, ms: number): Promise<Response | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    clearTimeout(timer);
    return res;
  } catch {
    return null;
  }
}

function mapCategory(cat: string): string {
  const c = String(cat).toLowerCase();
  if (c.includes("sport")) return "Sports";
  if (c.includes("news")) return "News";
  if (c.includes("music")) return "Music";
  if (c.includes("movie") || c.includes("entertainment")) return "Entertainment";
  if (c.includes("kids") || c.includes("cartoon")) return "Kids";
  if (c.includes("documentary") || c.includes("docs")) return "Documentary";
  if (c.includes("24/7")) return "24/7";
  return "Entertainment";
}

export async function GET() {
  const allChannels: Channel[] = [];
  const seen = new Set<string>();

  // Source 1: DamiTV 24/7 Streams
  try {
    const res = await fetchWithTimeout("https://dami-tv.pro/papi/api/streams", TIMEOUT_MS);
    if (res && res.ok) {
      const data = await res.json();
      if (data?.success && Array.isArray(data.streams)) {
        for (const cat of data.streams) {
          if (cat.category === "24/7-streams") {
            for (const stream of cat.streams) {
              const id = `damitv-${stream.id}`;
              if (seen.has(id)) continue;
              seen.add(id);

              const embedUrl = stream.embed || stream.iframe || `https://dami-tv.pro/embed/?id=${stream.id}`;
              const servers: Array<{ label: string; embedUrl: string }> = [];

              if (Array.isArray(stream.sources) && stream.sources.length > 0) {
                for (const src of stream.sources) {
                  if (src.embed) {
                    servers.push({ label: src.name || `Server ${servers.length + 1}`, embedUrl: src.embed });
                  }
                }
              }

              if (servers.length === 0) {
                servers.push({ label: "Server 1", embedUrl });
              }

              allChannels.push({
                id,
                name: stream.name,
                category: "24/7",
                logo: "",
                poster: stream.poster || "",
                servers,
              });
            }
          }
        }
      }
    }
  } catch (error) {
    console.error("[Live Channels] DamiTV error:", error);
  }

  // Source 2: DaddyLive API
  try {
    const res = await fetchWithTimeout("https://daddylive.org/api/channels", TIMEOUT_MS);
    if (res && res.ok) {
      const data = await res.json();
      const arr = Array.isArray(data) ? data : data?.channels || data?.data || [];
      if (Array.isArray(arr)) {
        for (const item of arr.slice(0, 60)) {
          const raw = item as Record<string, unknown>;
          const rawId = String(raw.channel_id || raw.id || "");
          const id = `daddy-${rawId}`;
          if (!rawId || seen.has(id)) continue;
          seen.add(id);

          const name = String(raw.channel_name || raw.name || raw.title || `Channel ${allChannels.length + 1}`);
          const category = String(raw.category || raw.group || raw.type || "Entertainment");
          const channelId = String(raw.channel_id || raw.id || rawId);

          allChannels.push({
            id,
            name,
            category: mapCategory(category),
            logo: String(raw.logo || raw.icon || ""),
            poster: "",
            servers: [
              { label: "Server 1", embedUrl: `https://daddylive.org/embed/embed.php?id=${channelId}&player=1&source=tv.json` },
            ],
          });
        }
      }
    }
  } catch (error) {
    console.error("[Live Channels] DaddyLive error:", error);
  }

  return NextResponse.json(allChannels);
}
