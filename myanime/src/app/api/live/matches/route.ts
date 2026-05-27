import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const TIMEOUT_MS = 8000;

interface EmbedSportStream {
  id: string;
  streamNo: number;
  language: string;
  hd: boolean;
  embedUrl: string;
  source: string;
  viewers: number;
}

interface NormalizedMatch {
  id: string;
  title: string;
  category: string;
  league: string;
  viewers: number;
  hd: boolean;
  servers: Array<{ label: string; embedUrl: string; hd: boolean }>;
}

function parseCategory(id: string, language: string): string {
  const combined = (id + " " + language).toLowerCase();
  if (combined.includes("cricket") || combined.includes("ipl")) return "Cricket";
  if (combined.includes("soccer") || combined.includes("football") || combined.includes("premier") || combined.includes("la liga") || combined.includes("serie a") || combined.includes("bundesliga")) return "Football";
  if (combined.includes("basketball") || combined.includes("nba")) return "Basketball";
  if (combined.includes("baseball") || combined.includes("mlb")) return "Baseball";
  if (combined.includes("hockey") || combined.includes("nhl")) return "Hockey";
  if (combined.includes("tennis")) return "Tennis";
  if (combined.includes("mma") || combined.includes("ufc") || combined.includes("boxing") || combined.includes("fight") || combined.includes("ppv")) return "MMA/Boxing";
  if (combined.includes("rugby")) return "Rugby";
  if (combined.includes("golf")) return "Golf";
  if (combined.includes("f1") || combined.includes("motorsport") || combined.includes("racing")) return "Motorsport";
  return "Sports";
}

function parseLeague(id: string, language: string): string {
  const combined = (id + " " + language).toLowerCase();
  if (combined.includes("ipl") || combined.includes("indian premier league")) return "Indian Premier League";
  if (combined.includes("premier league") || combined.includes("epl")) return "Premier League";
  if (combined.includes("la liga")) return "La Liga";
  if (combined.includes("serie a")) return "Serie A";
  if (combined.includes("bundesliga")) return "Bundesliga";
  if (combined.includes("champions league") || combined.includes("ucl")) return "UEFA Champions League";
  if (combined.includes("nba")) return "NBA";
  if (combined.includes("mlb")) return "MLB";
  if (combined.includes("nhl")) return "NHL";
  if (combined.includes("ufc")) return "UFC";
  if (combined.includes("f1")) return "Formula 1";
  return "";
}

function formatTitle(id: string): string {
  return id
    .replace(/^ppv-/, "")
    .split("-")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
    .replace(" Vs ", " vs ");
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

export async function GET() {
  const seen = new Set<string>();
  const allMatches: NormalizedMatch[] = [];

  // ─── Source 1: EmbedSports (PRIMARY - returns direct embedUrl) ───
  try {
    const res = await fetchWithTimeout("https://embedsports.top/fetch", TIMEOUT_MS);
    if (res && res.ok) {
      const data = await res.json();
      const streams: EmbedSportStream[] = Array.isArray(data) ? data : [];

      if (streams.length > 0) {
        // Group by id — each id can have multiple streamNo (different servers)
        const grouped = new Map<string, EmbedSportStream[]>();
        for (const s of streams) {
          if (!grouped.has(s.id)) grouped.set(s.id, []);
          grouped.get(s.id)!.push(s);
        }

        for (const [id, servers] of grouped) {
          if (seen.has(id)) continue;
          seen.add(id);
          const first = servers[0];
          allMatches.push({
            id,
            title: formatTitle(id),
            category: parseCategory(id, first.language),
            league: parseLeague(id, first.language),
            viewers: servers.reduce((sum, s) => sum + (s.viewers || 0), 0),
            hd: servers.some(s => s.hd),
            servers: servers.map(s => ({
              label: `Server ${s.streamNo}${s.hd ? " HD" : ""}`,
              embedUrl: s.embedUrl,
              hd: s.hd,
            })),
          });
        }
      }
    }
  } catch (error) {
    console.error("[Live Matches] EmbedSports error:", error);
  }

  // ─── Source 2: VIPStreamed API ───
  try {
    const res = await fetchWithTimeout("https://api.vipstreamed.live/api/streams", TIMEOUT_MS);
    if (res && res.ok) {
      const data = await res.json();
      const streams = data?.streams || data?.data || (Array.isArray(data) ? data : []);

      if (Array.isArray(streams) && streams.length > 0) {
        for (const stream of streams) {
          const s = stream as Record<string, unknown>;
          const id = String(s.id || s.slug || "");
          if (!id || seen.has(id)) continue;
          seen.add(id);

          const title = String(s.title || s.name || formatTitle(id));
          const category = String(s.category || s.sport || "Sports");
          const league = String(s.league || s.competition || "");
          const slug = id.toLowerCase().replace(/[^a-z0-9-]+/g, "-");
          const viewers = Number(s.viewers || 0);
          const hlsStreams = Array.isArray(s.streams) ? s.streams : [];

          const servers: Array<{ label: string; embedUrl: string; hd: boolean }> = [];

          // Add HLS proxy URLs if available
          for (const q of hlsStreams) {
            const qual = q as Record<string, unknown>;
            if (qual.proxy_url) {
              servers.push({
                label: `${String(qual.quality || "HD")} (HLS)`,
                embedUrl: String(qual.proxy_url),
                hd: String(qual.quality || "").includes("1080") || String(qual.quality || "").includes("720"),
              });
            }
          }

          // Add EmbedSports embeds
          servers.push(
            { label: "Server 1 HD", embedUrl: `https://embedsports.top/embed/admin/${slug}/1`, hd: true },
            { label: "Server 2", embedUrl: `https://embedsports.top/embed/admin/${slug}/2`, hd: false },
          );

          // Add NTV embed
          servers.push({
            label: "Server 3",
            embedUrl: `https://ntv.cx/embed?t=${Buffer.from(slug).toString("base64")}`,
            hd: false,
          });

          allMatches.push({ id, title, category, league, viewers, hd: true, servers });
        }
      }
    }
  } catch (error) {
    console.error("[Live Matches] VIPStreamed error:", error);
  }

  // ─── Source 3: WatchFooty API ───
  try {
    const res = await fetchWithTimeout("https://api.watchfooty.st/api/v1/matches/live", TIMEOUT_MS);
    if (res && res.ok) {
      const data = await res.json();
      const matches = data?.data || data?.matches || data;
      if (Array.isArray(matches)) {
        for (const m of matches.slice(0, 30)) {
          const match = m as Record<string, unknown>;
          const id = String(match.slug || match.id || "");
          if (!id || seen.has(String(id))) continue;
          seen.add(String(id));

          const title = String(match.title || match.name || match.match || `Live Match`);
          const category = String(match.sport || match.category || "Sports");
          const slug = String(id).toLowerCase().replace(/[^a-z0-9-]+/g, "-");

          allMatches.push({
            id: String(id),
            title,
            category,
            league: String(match.league || match.competition || ""),
            viewers: Number(match.viewers || 0),
            hd: true,
            servers: [
              { label: "Server 1 HD", embedUrl: `https://embedsports.top/embed/admin/${slug}/1`, hd: true },
              { label: "Server 2", embedUrl: `https://embedsports.top/embed/admin/${slug}/2`, hd: false },
              { label: "Server 3", embedUrl: `https://ntv.cx/embed?t=${Buffer.from(slug).toString("base64")}`, hd: false },
            ],
          });
        }
      }
    }
  } catch (error) {
    console.error("[Live Matches] WatchFooty error:", error);
  }

  // ─── Source 4: DLHD API ───
  try {
    const res = await fetchWithTimeout("https://dlhd.pk/api.php", TIMEOUT_MS);
    if (res && res.ok) {
      const data = await res.json();
      const arr = Array.isArray(data) ? data : data?.channels || data?.data || [];
      if (Array.isArray(arr)) {
        for (const item of arr.slice(0, 20)) {
          const raw = item as Record<string, unknown>;
          const id = String(raw.id || raw.channel_id || "");
          if (!id || seen.has(`dlhd-${id}`)) continue;
          seen.add(`dlhd-${id}`);

          const title = String(raw.name || raw.channel || raw.title || `Live Stream`);
          const category = String(raw.category || raw.group || raw.type || "Sports");
          const slug = String(raw.slug || id).toLowerCase().replace(/[^a-z0-9-]+/g, "-");
          const embedUrl = String(raw.embedUrl || raw.embed_url || raw.url || `https://dlhd.pk/stream/stream-${id}.php`);

          allMatches.push({
            id: `dlhd-${id}`,
            title,
            category,
            league: "",
            viewers: 0,
            hd: true,
            servers: [
              { label: "Server 1 HD", embedUrl: `https://embedsports.top/embed/admin/${slug}/1`, hd: true },
              { label: "Server 2", embedUrl, hd: false },
              { label: "Server 3", embedUrl: `https://ntv.cx/embed?t=${Buffer.from(slug).toString("base64")}`, hd: false },
            ],
          });
        }
      }
    }
  } catch (error) {
    console.error("[Live Matches] DLHD error:", error);
  }

  // Sort by viewers descending
  allMatches.sort((a, b) => b.viewers - a.viewers);

  return NextResponse.json(allMatches);
}
