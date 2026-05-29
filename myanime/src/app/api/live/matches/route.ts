import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const TIMEOUT_MS = 10000;

interface DamiTVSource {
  source: string;
  id: string;
  name: string;
  embed: string;
}

interface DamiTVStream {
  id: string;
  name: string;
  poster: string;
  starts_at: number;
  ends_at: number;
  category_name: string;
  status: string;
  league: string;
  teams: {
    home: { name: string; badge: string };
    away: { name: string; badge: string };
  };
  uri_name: string;
  viewers: number;
  always_live: number;
  tag: string;
  iframe: string | null;
  embed: string | null;
  sources: DamiTVSource[];
}

interface DamiTVCategory {
  category: string;
  id: number;
  streams: DamiTVStream[];
}

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
  poster: string;
  status: string;
  servers: Array<{ label: string; embedUrl: string; hd: boolean }>;
}

// Map DamiTV category names to our display names
function mapDamiCategory(cat: string): string {
  const c = cat.toLowerCase();
  if (c.includes("american-football") || c.includes("american football")) return "American Football";
  if (c.includes("afl")) return "AFL";
  if (c.includes("baseball")) return "Baseball";
  if (c.includes("basketball")) return "Basketball";
  if (c.includes("fight") || c.includes("mma") || c.includes("ufc") || c.includes("boxing") || c.includes("wwe") || c.includes("aew")) return "MMA/Boxing";
  if (c.includes("cricket")) return "Cricket";
  if (c.includes("football") || c.includes("soccer")) return "Football";
  if (c.includes("hockey")) return "Hockey";
  if (c.includes("motor") || c.includes("f1") || c.includes("racing")) return "Motorsport";
  if (c.includes("rugby")) return "Rugby";
  if (c.includes("tennis")) return "Tennis";
  if (c.includes("golf")) return "Golf";
  if (c.includes("24/7")) return "24/7 Streams";
  return "Sports";
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

  // ─── Source 1: DamiTV API (PRIMARY — proper embed URLs that WORK) ───
  try {
    const res = await fetchWithTimeout("https://dami-tv.pro/papi/api/streams", TIMEOUT_MS);
    if (res && res.ok) {
      const data = await res.json();
      if (data?.success && Array.isArray(data.streams)) {
        const categories: DamiTVCategory[] = data.streams;

        for (const cat of categories) {
          // Skip 24/7 streams — those are channels, not matches
          if (cat.category === "24/7-streams") continue;

          for (const stream of cat.streams) {
            const id = `damitv-${stream.id}`;
            if (seen.has(id)) continue;
            seen.add(id);

            // Build embed URL — DamiTV provides direct embed URLs
            const embedUrl = stream.embed || stream.iframe || `https://dami-tv.pro/embed/?id=${stream.id}`;

            const servers: Array<{ label: string; embedUrl: string; hd: boolean }> = [];

            // Add DamiTV embed servers from sources array
            if (Array.isArray(stream.sources) && stream.sources.length > 0) {
              for (const src of stream.sources) {
                if (src.embed) {
                  servers.push({
                    label: src.name || `DamiTV ${servers.length + 1}`,
                    embedUrl: src.embed,
                    hd: true,
                  });
                }
              }
            }

            // Always add the main embed as first server if not already present
            if (servers.length === 0 || !servers.some(s => s.embedUrl === embedUrl)) {
              servers.unshift({
                label: "DamiTV Server 1",
                embedUrl,
                hd: true,
              });
            }

            // Also generate alternate DamiTV player URLs as backup servers
            const altEmbed1 = `https://dami-tv.pro/player/hls/?v=300&resolve=${stream.id}&name=${encodeURIComponent(stream.name)}`;
            const altEmbed2 = `https://dami-tv.pro/embed/?id=${stream.uri_name || stream.id}`;

            if (!servers.some(s => s.embedUrl === altEmbed1)) {
              servers.push({ label: "DamiTV Server 2", embedUrl: altEmbed1, hd: true });
            }
            if (!servers.some(s => s.embedUrl === altEmbed2)) {
              servers.push({ label: "DamiTV Server 3", embedUrl: altEmbed2, hd: true });
            }

            const category = mapDamiCategory(stream.category_name || cat.category);
            const leagueName = stream.league || stream.tag || "";

            allMatches.push({
              id,
              title: stream.name,
              category,
              league: leagueName,
              viewers: stream.viewers || 0,
              hd: true,
              poster: stream.poster || "",
              status: stream.status || "upcoming",
              servers,
            });
          }
        }
      }
    }
  } catch (error) {
    console.error("[Live Matches] DamiTV error:", error);
  }

  // ─── Source 2: EmbedSports (adds more servers for existing matches) ───
  try {
    const res = await fetchWithTimeout("https://embedsports.top/fetch", TIMEOUT_MS);
    if (res && res.ok) {
      const data = await res.json();
      const streams: EmbedSportStream[] = Array.isArray(data) ? data : [];

      if (streams.length > 0) {
        // Group by id
        const grouped = new Map<string, EmbedSportStream[]>();
        for (const s of streams) {
          if (!grouped.has(s.id)) grouped.set(s.id, []);
          grouped.get(s.id)!.push(s);
        }

        for (const [id, servers] of grouped) {
          const esId = `es-${id}`;

          // Try to find if this match already exists from DamiTV (dedup by title similarity)
          const title = formatTitle(id);
          const existing = allMatches.find(m =>
            m.title.toLowerCase().includes(title.toLowerCase().split(" vs ")[0]) ||
            title.toLowerCase().includes(m.title.toLowerCase().split(" vs ")[0])
          );

          if (existing) {
            // Add EmbedSports servers as additional options
            for (const s of servers) {
              existing.servers.push({
                label: `EmbedSports ${s.streamNo}${s.hd ? " HD" : ""}`,
                embedUrl: s.embedUrl,
                hd: s.hd,
              });
            }
          } else if (!seen.has(esId)) {
            // New match not in DamiTV — add it
            seen.add(esId);
            const first = servers[0];
            allMatches.push({
              id: esId,
              title,
              category: parseCategory(id, first.language),
              league: parseLeague(id, first.language),
              viewers: servers.reduce((sum, s) => sum + (s.viewers || 0), 0),
              hd: servers.some(s => s.hd),
              poster: "",
              status: "live",
              servers: servers.map(s => ({
                label: `EmbedSports ${s.streamNo}${s.hd ? " HD" : ""}`,
                embedUrl: s.embedUrl,
                hd: s.hd,
              })),
            });
          }
        }
      }
    }
  } catch (error) {
    console.error("[Live Matches] EmbedSports error:", error);
  }

  // ─── Source 3: VIPStreamed API ───
  try {
    const res = await fetchWithTimeout("https://api.vipstreamed.live/api/streams", TIMEOUT_MS);
    if (res && res.ok) {
      const data = await res.json();
      const streams = data?.streams || data?.data || (Array.isArray(data) ? data : []);

      if (Array.isArray(streams) && streams.length > 0) {
        for (const stream of streams) {
          const s = stream as Record<string, unknown>;
          const rawId = String(s.id || s.slug || "");
          const id = `vip-${rawId}`;
          if (!id || seen.has(id)) continue;
          seen.add(id);

          const title = String(s.title || s.name || formatTitle(rawId));
          const category = String(s.category || s.sport || "Sports");
          const league = String(s.league || s.competition || "");
          const slug = rawId.toLowerCase().replace(/[^a-z0-9-]+/g, "-");
          const viewers = Number(s.viewers || 0);

          const servers: Array<{ label: string; embedUrl: string; hd: boolean }> = [];

          // Add VIPStreamed HLS proxy URLs if available
          const hlsStreams = Array.isArray(s.streams) ? s.streams : [];
          for (const q of hlsStreams) {
            const qual = q as Record<string, unknown>;
            if (qual.proxy_url) {
              servers.push({
                label: `VIPStreamed ${String(qual.quality || "HD")}`,
                embedUrl: String(qual.proxy_url),
                hd: String(qual.quality || "").includes("1080") || String(qual.quality || "").includes("720"),
              });
            }
          }

          // Add embedsports embeds as backups
          servers.push(
            { label: "EmbedSports 1 HD", embedUrl: `https://embedsports.top/embed/admin/${slug}/1`, hd: true },
            { label: "EmbedSports 2", embedUrl: `https://embedsports.top/embed/admin/${slug}/2`, hd: false },
          );

          allMatches.push({
            id,
            title,
            category,
            league,
            viewers,
            hd: true,
            poster: String(s.poster || ""),
            status: "live",
            servers,
          });
        }
      }
    }
  } catch (error) {
    console.error("[Live Matches] VIPStreamed error:", error);
  }

  // ─── Source 4: WatchFooty API ───
  try {
    const res = await fetchWithTimeout("https://api.watchfooty.st/api/v1/matches/live", TIMEOUT_MS);
    if (res && res.ok) {
      const data = await res.json();
      const matches = data?.data || data?.matches || data;
      if (Array.isArray(matches)) {
        for (const m of matches.slice(0, 30)) {
          const match = m as Record<string, unknown>;
          const rawId = String(match.slug || match.id || "");
          const id = `wf-${rawId}`;
          if (!id || seen.has(id)) continue;
          seen.add(id);

          const title = String(match.title || match.name || match.match || "Live Match");
          const category = String(match.sport || match.category || "Sports");
          const league = String(match.league || match.competition || "");
          const slug = rawId.toLowerCase().replace(/[^a-z0-9-]+/g, "-");

          // Try to find existing match from DamiTV for dedup
          const existing = allMatches.find(m2 =>
            m2.title.toLowerCase().includes(title.toLowerCase().split(" vs ")[0]) ||
            title.toLowerCase().includes(m2.title.toLowerCase().split(" vs ")[0])
          );

          if (existing) {
            // Add WatchFooty servers as additional options
            existing.servers.push(
              { label: "WatchFooty 1", embedUrl: `https://embedsports.top/embed/admin/${slug}/1`, hd: true },
              { label: "WatchFooty 2", embedUrl: `https://embedsports.top/embed/admin/${slug}/2`, hd: false },
            );
          } else {
            allMatches.push({
              id,
              title,
              category,
              league,
              viewers: Number(match.viewers || 0),
              hd: true,
              poster: String(match.poster || ""),
              status: "live",
              servers: [
                { label: "WatchFooty 1 HD", embedUrl: `https://embedsports.top/embed/admin/${slug}/1`, hd: true },
                { label: "WatchFooty 2", embedUrl: `https://embedsports.top/embed/admin/${slug}/2`, hd: false },
              ],
            });
          }
        }
      }
    }
  } catch (error) {
    console.error("[Live Matches] WatchFooty error:", error);
  }

  // Sort: live matches first, then by viewers descending
  allMatches.sort((a, b) => {
    if (a.status === "live" && b.status !== "live") return -1;
    if (a.status !== "live" && b.status === "live") return 1;
    return b.viewers - a.viewers;
  });

  return NextResponse.json(allMatches);
}
