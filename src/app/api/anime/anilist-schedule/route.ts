import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ANILIST_API = "https://graphql.anilist.co";

async function anilistQuery(query: string, variables?: Record<string, unknown>) {
  const res = await fetch(ANILIST_API, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query, variables }),
    next: { revalidate: 1800 },
  });
  if (!res.ok) throw new Error(`AniList request failed: ${res.status}`);
  const json = await res.json();
  if (json.errors) throw new Error(`AniList GraphQL error: ${json.errors[0]?.message || "Unknown"}`);
  return json.data;
}

/**
 * GET /api/anime/anilist-schedule
 * Fetches airing schedule for a 7-day window around the current date.
 * Optional query params:
 *   - day: 0-6 (0 = Sunday, 1 = Monday, etc.) — filter to a specific day
 *   - offset: number of days from today to start (default: 0)
 *
 * Returns schedule grouped by day with anime details.
 */
export async function GET(request: NextRequest) {
  const dayParam = request.nextUrl.searchParams.get("day");
  const offsetParam = request.nextUrl.searchParams.get("offset");
  const offset = offsetParam ? parseInt(offsetParam) : 0;

  try {
    const now = Math.floor(Date.now() / 1000);
    // Get schedule for 7 days starting from offset
    const startAt = now + (offset * 86400) - (now % 86400); // Start of day
    const endAt = startAt + (7 * 86400); // 7 days later

    const query = `
      query ($startAt: Int, $endAt: Int) {
        Page(page: 1, perPage: 100) {
          airingSchedules(
            airingAt_greater: $startAt
            airingAt_lesser: $endAt
            sort: TIME
          ) {
            id
            airingAt
            episode
            media {
              id
              title { romaji english native }
              coverImage { extraLarge large medium color }
              bannerImage
              type format status
              episodes duration
              genres
              averageScore
              popularity
              season seasonYear
              description(asHtml: false)
              nextAiringEpisode { episode airingAt }
              countryOfOrigin
              isAdult
            }
          }
        }
      }
    `;

    const data = await anilistQuery(query, { startAt, endAt });
    const schedules = data?.Page?.airingSchedules || [];

    // Group by day
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const grouped: Record<string, any[]> = {};

    for (const entry of schedules) {
      const date = new Date(entry.airingAt * 1000);
      const dayName = days[date.getDay()];
      const dateStr = date.toISOString().split("T")[0];

      if (!grouped[dayName]) grouped[dayName] = [];
      grouped[dayName].push({
        id: entry.id,
        airingAt: entry.airingAt,
        episode: entry.episode,
        airTime: date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }),
        dateStr,
        media: entry.media,
      });
    }

    // If specific day requested, return only that day
    if (dayParam !== null) {
      const dayIndex = parseInt(dayParam);
      const today = new Date();
      const currentDayIndex = today.getDay();
      // Find the next occurrence of the requested day
      let targetDayName: string;
      if (dayIndex >= 0 && dayIndex < 7) {
        targetDayName = days[dayIndex];
      } else {
        targetDayName = days[currentDayIndex];
      }
      return NextResponse.json({
        day: targetDayName,
        schedule: grouped[targetDayName] || [],
        allDays: Object.keys(grouped),
      });
    }

    return NextResponse.json({
      schedule: grouped,
      days: Object.keys(grouped),
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[anilist-schedule] Error:", err);
    return NextResponse.json({ error: "Failed to fetch schedule" }, { status: 500 });
  }
}
