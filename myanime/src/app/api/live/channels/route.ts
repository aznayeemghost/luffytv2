import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const TIMEOUT_MS = 8000;

interface Channel {
  id: string;
  name: string;
  category: string;
  logo: string;
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
  return "Entertainment";
}

export async function GET() {
  const allChannels: Channel[] = [];
  const seen = new Set<string>();

  // Source 1: VIPStreamed
  try {
    const res = await fetchWithTimeout("https://api.vipstreamed.live/api/streams", TIMEOUT_MS);
    if (res && res.ok) {
      const data = await res.json();
      const streams = data?.streams || (Array.isArray(data) ? data : []);
      if (Array.isArray(streams)) {
        for (const s of streams) {
          const stream = s as Record<string, unknown>;
          const id = String(stream.id || stream.slug || "");
          if (!id || seen.has(id)) continue;
          seen.add(id);
          const title = String(stream.title || stream.name || id);
          const category = String(stream.category || stream.sport || "Sports");
          const slug = id.toLowerCase().replace(/[^a-z0-9-]+/g, "-");

          allChannels.push({
            id: `vip-${id}`,
            name: title,
            category: mapCategory(category),
            logo: String(stream.team1 && (stream.team1 as Record<string, unknown>)?.logo || ""),
            servers: [
              { label: "Server 1 HD", embedUrl: `https://embedsports.top/embed/admin/${slug}/1` },
              { label: "Server 2", embedUrl: `https://embedsports.top/embed/admin/${slug}/2` },
              { label: "Server 3", embedUrl: `https://ntv.cx/embed?t=${Buffer.from(slug).toString("base64")}` },
            ],
          });
        }
      }
    }
  } catch (error) {
    console.error("[Live Channels] VIPStreamed error:", error);
  }

  // Source 2: DLHD API
  try {
    const res = await fetchWithTimeout("https://dlhd.pk/api.php", TIMEOUT_MS);
    if (res && res.ok) {
      const data = await res.json();
      const arr = Array.isArray(data) ? data : data?.channels || data?.data || data?.results || [];
      if (Array.isArray(arr)) {
        for (const item of arr.slice(0, 40)) {
          const raw = item as Record<string, unknown>;
          const id = String(raw.id || raw.channel_id || "");
          if (!id || seen.has(`dlhd-${id}`)) continue;
          seen.add(`dlhd-${id}`);
          const name = String(raw.name || raw.channel || raw.title || `Channel ${allChannels.length + 1}`);
          const category = String(raw.category || raw.group || raw.type || "Entertainment");
          const slug = String(raw.slug || id).toLowerCase().replace(/[^a-z0-9-]+/g, "-");
          const embedUrl = String(raw.embedUrl || raw.embed_url || raw.url || `https://dlhd.pk/stream/stream-${id}.php`);
          const logo = String(raw.logo || raw.icon || "");

          allChannels.push({
            id: `dlhd-${id}`,
            name,
            category: mapCategory(category),
            logo,
            servers: [
              { label: "Server 1", embedUrl: `https://embedsports.top/embed/admin/${slug}/1` },
              { label: "Server 2", embedUrl },
              { label: "Server 3", embedUrl: `https://ntv.cx/embed?t=${Buffer.from(slug).toString("base64")}` },
            ],
          });
        }
      }
    }
  } catch (error) {
    console.error("[Live Channels] DLHD error:", error);
  }

  // Source 3: EmbedSports
  if (allChannels.length === 0) {
    try {
      const res = await fetchWithTimeout("https://embedsports.top/fetch", TIMEOUT_MS);
      if (res && res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const grouped = new Map<string, { id: string; language: string }>();
          for (const s of data) {
            const stream = s as { id?: string; streamNo?: number; language?: string };
            if (!stream.id || grouped.has(stream.id)) continue;
            grouped.set(stream.id, { id: stream.id, language: stream.language || "" });
          }
          for (const [, info] of grouped) {
            const slug = info.id.toLowerCase().replace(/[^a-z0-9-]+/g, "-");
            const title = info.id.replace(/^ppv-/, "").split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
            allChannels.push({
              id: `es-${info.id}`,
              name: title,
              category: mapCategory(info.language),
              logo: "",
              servers: [
                { label: "Server 1 HD", embedUrl: `https://embedsports.top/embed/admin/${slug}/1` },
                { label: "Server 2", embedUrl: `https://embedsports.top/embed/admin/${slug}/2` },
                { label: "Server 3", embedUrl: `https://ntv.cx/embed?t=${Buffer.from(slug).toString("base64")}` },
              ],
            });
          }
        }
      }
    } catch (error) {
      console.error("[Live Channels] EmbedSports error:", error);
    }
  }

  return NextResponse.json(allChannels);
}
