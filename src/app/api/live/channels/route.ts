import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface Channel {
  id: string;
  name: string;
  category: string;
  embedUrl: string;
  logo: string;
}

const FALLBACK_CHANNELS: Channel[] = [
  { id: "espn-us", name: "ESPN USA", category: "Sports", embedUrl: "https://dlhd.pk/stream/stream-1.php", logo: "📺" },
  { id: "sky-sports-pl", name: "Sky Sports Premier League", category: "Sports", embedUrl: "https://dlhd.pk/stream/stream-2.php", logo: "⚽" },
  { id: "nba-tv", name: "NBA TV", category: "Sports", embedUrl: "https://dlhd.pk/stream/stream-3.php", logo: "🏀" },
  { id: "star-sports", name: "Star Sports", category: "Sports", embedUrl: "https://dlhd.pk/stream/stream-4.php", logo: "⭐" },
  { id: "cnn", name: "CNN", category: "News", embedUrl: "https://dlhd.pk/stream/stream-5.php", logo: "📰" },
  { id: "bbc-news", name: "BBC News", category: "News", embedUrl: "https://dlhd.pk/stream/stream-6.php", logo: "📰" },
  { id: "mtv", name: "MTV", category: "Music", embedUrl: "https://dlhd.pk/stream/stream-7.php", logo: "🎵" },
  { id: "cartoon-network", name: "Cartoon Network", category: "Entertainment", embedUrl: "https://dlhd.pk/stream/stream-8.php", logo: "🎬" },
];

export async function GET() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch("https://dlhd.pk/api.php", {
      signal: controller.signal,
      headers: {
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`Channels API responded with status ${res.status}`);
    }

    const data = await res.json();

    // Try to normalize the API response into our Channel format
    // The API might return various formats, so we handle common patterns
    if (Array.isArray(data)) {
      const channels: Channel[] = data.map((item: Record<string, unknown>, idx: number) => {
        const id = String(item.id || item.channel_id || `ch-${idx}`);
        const name = String(item.name || item.channel || item.title || `Channel ${idx + 1}`);
        const category = String(item.category || item.group || item.type || "Entertainment");
        const streamId = String(item.stream_id || item.id || idx + 1);
        const embedUrl = String(
          item.embedUrl || item.embed_url || item.url ||
          `https://dlhd.pk/stream/stream-${streamId}.php`
        );
        const logo = String(item.logo || item.icon || getCategoryEmoji(category));

        return { id, name, category, embedUrl, logo };
      });
      return NextResponse.json(channels);
    }

    // If the data is in an object with a key like "channels" or "data"
    if (data && typeof data === "object") {
      const arr = data.channels || data.data || data.results || data.list;
      if (Array.isArray(arr)) {
        const channels: Channel[] = arr.map((item: Record<string, unknown>, idx: number) => {
          const id = String(item.id || item.channel_id || `ch-${idx}`);
          const name = String(item.name || item.channel || item.title || `Channel ${idx + 1}`);
          const category = String(item.category || item.group || item.type || "Entertainment");
          const streamId = String(item.stream_id || item.id || idx + 1);
          const embedUrl = String(
            item.embedUrl || item.embed_url || item.url ||
            `https://dlhd.pk/stream/stream-${streamId}.php`
          );
          const logo = String(item.logo || item.icon || getCategoryEmoji(category));

          return { id, name, category, embedUrl, logo };
        });
        return NextResponse.json(channels);
      }
    }

    // If we can't parse the data, fall back
    throw new Error("Unable to parse channels API response");
  } catch (error) {
    console.error("[Live Channels API] Error fetching channels:", error);
    // Return hardcoded fallback channels
    return NextResponse.json(FALLBACK_CHANNELS, { status: 200 });
  }
}

function getCategoryEmoji(category: string): string {
  const cat = String(category).toLowerCase();
  if (cat.includes("sport")) return "📺";
  if (cat.includes("news")) return "📰";
  if (cat.includes("music")) return "🎵";
  if (cat.includes("entertainment") || cat.includes("movie")) return "🎬";
  if (cat.includes("kids") || cat.includes("cartoon")) return "🎨";
  if (cat.includes("documentary")) return "🌍";
  return "📡";
}
