import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 300; // Cache for 5 minutes

const TIMEOUT_MS = 12000;

interface Channel {
  id: string;
  name: string;
  category: string;
  logo: string;
  letter: string;
  servers: Array<{ label: string; embedUrl: string }>;
}

// Category mapping based on channel name keywords
function categorizeChannel(name: string): string {
  const n = name.toLowerCase();
  // Sports channels
  if (n.includes("espn") || n.includes("fox sports") || n.includes("fs1") || n.includes("fs2") ||
      n.includes("nba") || n.includes("nfl") || n.includes("mlb") || n.includes("nhl") ||
      n.includes("ncaa") || n.includes("sec ") || n.includes("big ten") ||
      n.includes("bein") || n.includes("dazn") || n.includes("sky sports") ||
      n.includes("bt sport") || n.includes("tnt sports") || n.includes("arena sport") ||
      n.includes("supersport") || n.includes("astro") || n.includes("willow") ||
      n.includes("tennis") || n.includes("golf") || n.includes("f1") ||
      n.includes("motor") || n.includes("prima sport") || n.includes("sport") ||
      n.includes("tsn") || n.includes("sn ") || n.includes("sportsnet") ||
      n.includes("canal+ sport") || n.includes("movistar") || n.includes("eleven") ||
      n.includes("paramount+") || n.includes("peacock") || n.includes("fanduel") ||
      n.includes("msg") || n.includes("marquee") || n.includes("yes ") ||
      n.includes("bally") || n.includes("spectrum") || n.includes("root sports") ||
      n.includes("acl") || n.includes("monumental") || n.includes("space") ||
      n.includes("win sports") || n.includes("directv") || n.includes("gol tv") ||
      n.includes("victory") || n.includes("ontime") || n.includes("bst") ||
      n.includes("alkass") || n.includes("abu dhabi sport") || n.includes("beout") ||
      n.includes("ssc") || n.includes("cric") || n.includes("star sport") ||
      n.includes("sony ten") || n.includes("sony six") || n.includes("dd sport") ||
      n.includes("super sport") || n.includes("cosmote") || n.includes("nova sport") ||
      n.includes("megalos") || n.includes("trl") || n.includes("trt spor") ||
      n.includes("s sport") || n.includes("a spor") || n.includes("fanatik") ||
      n.includes("digi sport") || n.includes("pro tv") || n.includes("tvp sport") ||
      n.includes("polsat sport") || n.includes("viaplay") || n.includes("v sport") ||
      n.includes("setanta") || n.includes("mir") || n.includes("match") ||
      n.includes("optus") || n.includes("stan sport") || n.includes("kayo") ||
      n.includes("spark") || n.includes("sky sport nz") || n.includes("racing") ||
      n.includes("trak") || n.includes("iran") || n.includes("ufc") ||
      n.includes("wwe") || n.includes("aew") || n.includes("boxing") ||
      n.includes("fight") || n.includes("ppv") || n.includes("manorama") ||
      n.includes("zdf") || n.includes("ard") || n.includes("eurosport") ||
      n.includes("olympic") || n.includes("pluto tv sport")) {
    return "Sports";
  }
  // News channels
  if (n.includes("cnn") || n.includes("bbc") || n.includes("fox news") || n.includes("msnbc") ||
      n.includes("cnbc") || n.includes("news") || n.includes("al jazeera") || n.includes("sky news") ||
      n.includes("nbc news") || n.includes("cbs news") || n.includes("abc news") ||
      n.includes("hln") || n.includes("dw") || n.includes("france 24") || n.includes("rt ") ||
      n.includes("ndtv") || n.includes("aaj tak") || n.includes("republic") ||
      n.includes("times now") || n.includes("india today")) {
    return "News";
  }
  // Entertainment
  if (n.includes("hbo") || n.includes("showtime") || n.includes("starz") || n.includes("cinemax") ||
      n.includes("amc") || n.includes("fx") || n.includes("tnt") || n.includes("tbs") ||
      n.includes("comedy") || n.includes("bravo") || n.includes("e!") || n.includes("usa network") ||
      n.includes("syfy") || n.includes("freeform") || n.includes("lifetime") ||
      n.includes("oxygen") || n.includes("tru tv") || n.includes("spike") ||
      n.includes("paramount") || n.includes("cbs") || n.includes("nbc") || n.includes("abc") ||
      n.includes("fox ") || n.includes("cw") || n.includes("pbs") || n.includes("a&e") ||
      n.includes("discovery") || n.includes("history") || n.includes("national geographic") ||
      n.includes("animal planet") || n.includes("science") || n.includes("tlc") ||
      n.includes("hgtv") || n.includes("food network") || n.includes("travel") ||
      n.includes("investigation") || n.includes("mtv") || n.includes("vh1") ||
      n.includes("bet") || n.includes("cmt") || n.includes("logo") ||
      n.includes("antenna") || n.includes("ion") || n.includes("grit") ||
      n.includes("charge") || n.includes("comet") || n.includes("bounce")) {
    return "Entertainment";
  }
  // Kids
  if (n.includes("cartoon") || n.includes("disney") || n.includes("nick") || n.includes("pbs kids") ||
      n.includes("baby") || n.includes("kids") || n.includes("boomerang")) {
    return "Kids";
  }
  // Music
  if (n.includes("mtv") || n.includes("music") || n.includes("vh1") || n.includes("cmt") ||
      n.includes("bet") || n.includes("bpm") || n.includes("trace")) {
    return "Music";
  }
  return "Entertainment";
}

async function fetchWithTimeout(url: string, ms: number): Promise<Response | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "Accept": "text/html,application/json",
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
  const allChannels: Channel[] = [];
  const seen = new Set<string>();

  // ─── Source 1: DLHD 24/7 Channels (900+ channels with IDs) ───
  // Parse HTML to get channel id + name, then build DamiTV embed URLs
  try {
    const [dlhdRes, damitvRes] = await Promise.all([
      fetchWithTimeout("https://dlhd.pk/24-7-channels.php", TIMEOUT_MS),
      fetchWithTimeout("https://dami-tv.pro/channels.json", TIMEOUT_MS),
    ]);

    // Build logo lookup from DamiTV channels.json
    const logoMap = new Map<string, string>();
    if (damitvRes && damitvRes.ok) {
      try {
        const damitvData = await damitvRes.json();
        const channels = damitvData?.channels || [];
        for (const ch of channels) {
          if (ch.name && ch.logo) {
            // Key: lowercase, no spaces/special chars
            const key = String(ch.name).toLowerCase().replace(/[^a-z0-9]/g, "");
            logoMap.set(key, ch.logo);
          }
        }
      } catch (e) {
        console.error("[Live Channels] DamiTV channels.json parse error:", e);
      }
    }

    // Parse DLHD HTML for channel cards
    if (dlhdRes && dlhdRes.ok) {
      const html = await dlhdRes.text();

      // Pattern: <a class="card" href="/watch.php?id=51" data-title="abc usa" data-first="A">
      const cardPattern = /href="\/watch\.php\?id=(\d+)"[^>]*data-title="([^"]+)"[^>]*data-first="([^"]*)"/gi;
      let match;
      while ((match = cardPattern.exec(html)) !== null) {
        const dlhdId = match[1];
        const rawName = match[2].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
        const letter = match[3] || rawName.charAt(0).toUpperCase();
        const name = rawName.replace(/\b\w/g, l => l.toUpperCase()); // Title case

        if (seen.has(dlhdId)) continue;
        seen.add(dlhdId);

        // Filter out 18+ channels
        if (name.toLowerCase().includes("18+")) continue;

        // Find logo from DamiTV
        const nameKey = rawName.toLowerCase().replace(/[^a-z0-9]/g, "");
        let logo = logoMap.get(nameKey) || "";

        // Fuzzy match if no exact match
        if (!logo) {
          for (const [key, url] of logoMap) {
            if (nameKey.includes(key) || key.includes(nameKey)) {
              logo = url;
              break;
            }
          }
        }

        // Build DamiTV embed URL: https://dami-tv.pro/player/hls/?v=300&resolve={id}&name={encoded_name}
        const encodedName = encodeURIComponent(name);
        const damitvEmbedUrl = `https://dami-tv.pro/player/hls/?v=300&resolve=${dlhdId}&name=${encodedName}`;

        // Also add the DLHD embed as backup
        const dlhdEmbedUrl = `https://daddylive.org/embed/embed.php?id=${dlhdId}&player=1&source=tv.json`;

        const category = categorizeChannel(name);

        allChannels.push({
          id: `dlhd-${dlhdId}`,
          name,
          category,
          logo,
          letter,
          servers: [
            { label: "DamiTV HD", embedUrl: damitvEmbedUrl },
            { label: "DLHD Server", embedUrl: dlhdEmbedUrl },
          ],
        });
      }
    }
  } catch (error) {
    console.error("[Live Channels] DLHD parse error:", error);
  }

  // ─── Source 2: DamiTV CDN Streams (channels with direct embed URLs) ───
  try {
    const res = await fetchWithTimeout("https://dami-tv.pro/channels.json", TIMEOUT_MS);
    if (res && res.ok) {
      const data = await res.json();
      const channels = data?.channels || [];

      for (const ch of channels) {
        const chId = `cdn-${ch.id || ""}`;
        if (seen.has(chId) || !ch.name) continue;
        seen.add(chId);

        // Only add channels not already covered by DLHD
        // Use the CDN-stream URL as the embed
        const embedUrl = ch.defaultUrl || ch.iframeUrl || `https://dami-tv.pro/cdn-stream/${encodeURIComponent(ch.name)}`;

        allChannels.push({
          id: chId,
          name: ch.name,
          category: categorizeChannel(ch.name),
          logo: ch.logo || "",
          letter: ch.name.charAt(0).toUpperCase(),
          servers: [
            { label: "DamiTV CDN HD", embedUrl },
          ],
        });
      }
    }
  } catch (error) {
    console.error("[Live Channels] DamiTV CDN error:", error);
  }

  // Sort by name
  allChannels.sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json(allChannels);
}
