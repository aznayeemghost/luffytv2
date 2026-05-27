import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────
// Luffy TV Live — Multi-source aggregator
// Sources: WatchFooty (PRIMARY), streamed.pk, dami-tv.pro,
//          cdnlivetv.tv (sports + channels), streamfree.app
// Returns unified matches + TV channels with EMBED URLs
// ─────────────────────────────────────────────────────────────

interface StreamEmbed {
  url: string;           // Direct embed URL (iframe src)
  source: string;        // Provider name
  quality: string;       // HD/SD
  language: string;
}

interface MatchSource {
  source: string;
  sourceId: string;
  streamType: "m3u8" | "embed" | "channel";
  embeds?: StreamEmbed[];  // Direct embed URLs from the source (no resolution needed!)
}

interface UnifiedMatch {
  id: string;
  title: string;
  category: string;
  sport: string;
  league?: string;
  status: "live" | "upcoming" | "ended";
  date?: number;
  poster?: string;
  viewers?: number;
  homeTeam?: string;
  awayTeam?: string;
  homeLogo?: string;
  awayLogo?: string;
  sources: MatchSource[];
  type: "sport" | "channel";
  channelImage?: string;
  countryCode?: string;
  _relatedIds?: string[];  // IDs of same-game matches from other providers
}

const SPORT_MAP: Record<string, string> = {
  soccer: "Soccer", football: "Football", basketball: "Basketball",
  baseball: "Baseball", hockey: "Hockey", tennis: "Tennis",
  fighting: "Fighting", combat: "Combat", mma: "MMA", boxing: "Boxing",
  rugby: "Rugby", golf: "Golf", racing: "Racing", motorsport: "Motorsport",
  afl: "AFL", cricket: "Cricket", darts: "Darts", volleyball: "Volleyball",
  handball: "Handball", other: "Other", nfl: "NFL", nba: "NBA",
  nhl: "NHL", mlb: "MLB", f1: "F1", ufc: "UFC",
};

function getSportName(cat: string): string {
  return SPORT_MAP[cat.toLowerCase()] || cat.charAt(0).toUpperCase() + cat.slice(1);
}

// ── Source 1: WatchFooty (PRIMARY — 48 live matches with EMBED URLs!) ──
async function fetchWatchFooty(): Promise<UnifiedMatch[]> {
  try {
    const res = await fetch("https://api.watchfooty.st/api/v1/matches/live", {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data.map((match: any) => {
      // WatchFooty already gives us embed URLs in the streams array!
      const embeds: StreamEmbed[] = (match.streams || []).map((s: any) => ({
        url: s.url,  // e.g. https://sportsembed.su/embed/...
        source: s.source || "watchfooty",
        quality: s.quality || "HD",
        language: s.language || "English",
      }));

      const matchId = String(match.matchId || match.id);
      return {
        id: `wf_${matchId}`,
        title: match.title || "Unknown Match",
        category: match.sport?.toLowerCase() || "other",
        sport: getSportName(match.sport || "other"),
        league: match.league || undefined,
        status: "live" as const,
        date: match.date ? new Date(match.date).getTime() : undefined,
        poster: match.poster ? `https://api.watchfooty.st${match.poster}` : undefined,
        viewers: match.viewers || 0,
        homeTeam: match.teams?.home?.name,
        awayTeam: match.teams?.away?.name,
        homeLogo: match.teams?.home?.logoUrl ? `https://api.watchfooty.st${match.teams.home.logoUrl}` : undefined,
        awayLogo: match.teams?.away?.logoUrl ? `https://api.watchfooty.st${match.teams.away.logoUrl}` : undefined,
        sources: [{
          source: "watchfooty",
          sourceId: matchId,
          streamType: "embed" as const,
          embeds,  // Direct embed URLs — no need to resolve!
        }],
        type: "sport" as const,
      };
    });
  } catch (e) {
    console.error("[watchfooty] fetch error:", e);
    return [];
  }
}

// ── Source 2: streamed.pk (Sports embed aggregation) ──
async function fetchStreamedPK(): Promise<UnifiedMatch[]> {
  try {
    const res = await fetch("https://streamed.pk/api/matches/live", {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data.map((match: any) => {
      const catName = match.category || "other";
      const sources: MatchSource[] = (match.sources || []).map((s: any) => ({
        source: `streamed-${s.source}`,
        sourceId: s.id,
        streamType: "embed" as const,
      }));

      return {
        id: `streamed_${match.id}`,
        title: match.title || "Unknown Match",
        category: catName,
        sport: getSportName(catName),
        league: match.category?.toUpperCase(),
        status: "live" as const,
        date: match.date,
        poster: match.poster ? `https://streamed.pk${match.poster}` : undefined,
        viewers: match.popular ? 1500 : 200,
        homeTeam: match.teams?.home?.name,
        awayTeam: match.teams?.away?.name,
        homeLogo: match.teams?.home?.badge ? `https://streamed.pk/api/images/proxy/${match.teams.home.badge}` : undefined,
        awayLogo: match.teams?.away?.badge ? `https://streamed.pk/api/images/proxy/${match.teams.away.badge}` : undefined,
        sources,
        type: "sport" as const,
      };
    });
  } catch (e) {
    console.error("[streamed.pk] fetch error:", e);
    return [];
  }
}

// ── Source 3: dami-tv.pro ──
async function fetchDamiTV(): Promise<UnifiedMatch[]> {
  try {
    const res = await fetch("https://dami-tv.pro/papi/api/streams", {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.success || !data.streams) return [];

    const matches: UnifiedMatch[] = [];
    for (const category of data.streams) {
      const catName = category.category || "other";
      for (const stream of category.streams || []) {
        const status = stream.status === "live" ? "live" as const : stream.status === "ended" ? "ended" as const : "upcoming" as const;
        // Use the embed URL directly from the Dami API response
        const embedUrl: string | undefined = stream.embed;
        matches.push({
          id: `dami_${stream.id}`,
          title: stream.name || `${stream.teams?.home?.name || "TBD"} vs ${stream.teams?.away?.name || "TBD"}`,
          category: catName,
          sport: getSportName(catName),
          league: stream.league || stream.tag || catName.toUpperCase(),
          status,
          poster: stream.poster,
          viewers: stream.viewers || 0,
          homeTeam: stream.teams?.home?.name,
          awayTeam: stream.teams?.away?.name,
          sources: [{
            source: "dami-tv",
            sourceId: stream.id,
            streamType: "embed" as const,
            embeds: embedUrl ? [{ url: embedUrl, source: "DamiTV", quality: "HD", language: "English" }] : [],
          }],
          type: "sport" as const,
        });
      }
    }
    return matches;
  } catch (e) {
    console.error("[dami-tv] fetch error:", e);
    return [];
  }
}

// ── Source 4: cdnlivetv.tv — Sports Events ──
async function fetchCDNLivetvSports(): Promise<UnifiedMatch[]> {
  try {
    const res = await fetch(
      "https://api.cdnlivetv.tv/api/v1/events/sports/?user=cdnlivetv&plan=free",
      { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return [];
    const data = await res.json();
    if (!data?.["cdn-live-tv"]) return [];

    const matches: UnifiedMatch[] = [];
    const sportsData = data["cdn-live-tv"];
    for (const [sportKey, events] of Object.entries(sportsData)) {
      if (!Array.isArray(events)) continue;
      for (const event of events) {
        const sources: MatchSource[] = (event.channels || []).map((ch: any) => ({
          source: "cdnlivetv",
          sourceId: ch.url || `${ch.channel_name}_${ch.channel_code}`,
          streamType: "channel" as const,
        }));
        if (sources.length === 0) continue;
        matches.push({
          id: `cdn_${event.gameID || Math.random().toString(36).slice(2)}`,
          title: `${event.homeTeam || "TBD"} vs ${event.awayTeam || "TBD"}`,
          category: sportKey.toLowerCase(),
          sport: getSportName(sportKey),
          league: event.tournament || sportKey.toUpperCase(),
          status: event.status === "live" ? "live" : event.status === "ended" ? "ended" : "upcoming",
          sources,
          homeTeam: event.homeTeam,
          awayTeam: event.awayTeam,
          homeLogo: event.homeTeamIMG,
          awayLogo: event.awayTeamIMG,
          type: "sport" as const,
          countryCode: event.countryIMG ? event.country : undefined,
        });
      }
    }
    return matches;
  } catch (e) {
    console.error("[cdnlivetv] sports error:", e);
    return [];
  }
}

// ── Source 5: cdnlivetv.tv — TV Channels (762 channels!) ──
async function fetchCDNLivetvChannels(): Promise<UnifiedMatch[]> {
  try {
    const res = await fetch(
      "https://api.cdnlivetv.tv/api/v1/channels/?user=cdnlivetv&plan=free",
      { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const channelsData = data?.["cdn-live-tv"] || data;
    const channels = channelsData?.channels || [];
    if (!Array.isArray(channels)) return [];

    return channels
      .filter((ch: any) => ch.status === "online")
      .map((ch: any) => ({
        id: `channel_${ch.name}_${ch.code}`,
        title: ch.name,
        category: "tv",
        sport: "TV Channel",
        status: "live" as const,
        sources: [{
          source: "cdnlivetv-channel",
          sourceId: ch.url || "",
          streamType: "channel" as const,
        }],
        type: "channel" as const,
        channelImage: ch.image,
        countryCode: ch.code,
        viewers: ch.viewers || 0,
      }));
  } catch (e) {
    console.error("[cdnlivetv] channels error:", e);
    return [];
  }
}

// ── Source 6: streamfree.app ──
async function fetchStreamfree(): Promise<UnifiedMatch[]> {
  try {
    const res = await fetch("https://streamfree.app/streams", {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!data?.streams) return [];

    const matches: UnifiedMatch[] = [];
    for (const [cat, streams] of Object.entries(data.streams)) {
      if (!Array.isArray(streams)) continue;
      for (const stream of streams) {
        matches.push({
          id: `sf_${stream.id || stream.stream_key}`,
          title: stream.name || `${stream.team1?.name || "TBD"} vs ${stream.team2?.name || "TBD"}`,
          category: cat,
          sport: getSportName(cat),
          league: stream.league || cat.toUpperCase(),
          status: "upcoming" as const,
          homeTeam: stream.team1?.name,
          awayTeam: stream.team2?.name,
          homeLogo: stream.team1?.logo,
          awayLogo: stream.team2?.logo,
          viewers: stream.viewers || 0,
          sources: [{ source: "streamfree", sourceId: stream.stream_key, streamType: "m3u8" as const }],
          type: "sport" as const,
        });
      }
    }
    return matches;
  } catch (e) {
    console.error("[streamfree] fetch error:", e);
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const source = searchParams.get("source");
    const type = searchParams.get("type");

    const allMatches: UnifiedMatch[] = [];
    const allChannels: UnifiedMatch[] = [];

    // Fetch from ALL sources in parallel — WatchFooty is now PRIMARY
    const [wfMatches, streamedMatches, damiMatches, cdnSportsMatches, cdnChannels, sfMatches] = await Promise.allSettled([
      (!source || source === "watchfooty") ? fetchWatchFooty() : Promise.resolve([]),
      (!source || source === "streamed") ? fetchStreamedPK() : Promise.resolve([]),
      (!source || source === "dami-tv") ? fetchDamiTV() : Promise.resolve([]),
      (!source || source === "cdnlivetv") ? fetchCDNLivetvSports() : Promise.resolve([]),
      (!source || source === "cdnlivetv") ? fetchCDNLivetvChannels() : Promise.resolve([]),
      (!source || source === "streamfree") ? fetchStreamfree() : Promise.resolve([]),
    ]);

    // WatchFooty first (has embed URLs!), then others
    if (wfMatches.status === "fulfilled") allMatches.push(...wfMatches.value);
    if (streamedMatches.status === "fulfilled") allMatches.push(...streamedMatches.value);
    if (damiMatches.status === "fulfilled") allMatches.push(...damiMatches.value);
    if (cdnSportsMatches.status === "fulfilled") allMatches.push(...cdnSportsMatches.value);
    if (sfMatches.status === "fulfilled") allMatches.push(...sfMatches.value);
    if (cdnChannels.status === "fulfilled") allChannels.push(...cdnChannels.value);

    // Merge sports matches — combine sources from different providers.
    // Strategy: First try exact title match, then try team-based fuzzy match.
    // This handles cases like "Man City vs Arsenal" vs "Manchester City vs Arsenal".
    function normalizeTeamName(name: string): string {
      return name
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, "")
        .trim()
        // Expand common abbreviations
        .replace(/\bman\b/g, "manchester")
        .replace(/\bunited\b/g, "utd")
        .replace(/\bwolverhampton\b/g, "wolves")
        .replace(/\btottenham\b/g, "spurs")
        .replace(/\bblackburn\b/g, "rovers")
        .split(/\s+/)
        .sort()
        .join(" ");
    }

    function matchesAreSame(a: UnifiedMatch, b: UnifiedMatch): boolean {
      // Exact title match
      const keyA = a.title.toLowerCase().replace(/[^a-z0-9]/g, "");
      const keyB = b.title.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (keyA === keyB) return true;

      // Team-based fuzzy match — if both matches have teams, check if they refer to the same game
      if (a.homeTeam && a.awayTeam && b.homeTeam && b.awayTeam) {
        const aHome = normalizeTeamName(a.homeTeam);
        const aAway = normalizeTeamName(a.awayTeam);
        const bHome = normalizeTeamName(b.homeTeam);
        const bAway = normalizeTeamName(b.awayTeam);

        // Check if the sets of team names overlap significantly
        // Home vs Home + Away vs Away, OR Home vs Away + Away vs Home
        const directMatch = (aHome === bHome && aAway === bAway) || (aHome === bAway && aAway === bHome);
        if (directMatch) return true;

        // Partial match: at least one team name is the same AND same sport
        if (a.sport === b.sport) {
          const aTeams = new Set([aHome, aAway]);
          const bTeams = new Set([bHome, bAway]);
          let overlap = 0;
          for (const t of aTeams) {
            for (const bt of bTeams) {
              if (t === bt || t.includes(bt) || bt.includes(t)) overlap++;
            }
          }
          if (overlap >= 2) return true;
          // One team exact match + same category
          if (overlap >= 1 && a.category === b.category) {
            // Extra check: titles share significant words
            const aWords = new Set(a.title.toLowerCase().replace(/[^a-z0-9 ]/g, "").split(/\s+/).filter(w => w.length > 3));
            const bWords = new Set(b.title.toLowerCase().replace(/[^a-z0-9 ]/g, "").split(/\s+/).filter(w => w.length > 3));
            let wordOverlap = 0;
            for (const w of aWords) { if (bWords.has(w)) wordOverlap++; }
            if (wordOverlap >= 2) return true;
          }
        }
      }

      // Title similarity for matches without teams
      if ((!a.homeTeam || !a.awayTeam) && (!b.homeTeam || !b.awayTeam) && a.sport === b.sport) {
        const aWords = new Set(keyA.split(/(?=.)/).join("").match(/.{1,4}/g) || []);
        // Simple: check if 80%+ of shorter title is contained in longer title
        const shorter = keyA.length < keyB.length ? keyA : keyB;
        const longer = keyA.length < keyB.length ? keyB : keyA;
        let matchChars = 0;
        for (let i = 0; i < shorter.length; i++) {
          if (longer.includes(shorter.slice(i, i + 4))) matchChars++;
        }
        if (matchChars / shorter.length > 0.6) return true;
      }

      return false;
    }

    const dedupedMatches: UnifiedMatch[] = [];
    for (const m of allMatches) {
      // Find an existing match that represents the same game
      const existingIdx = dedupedMatches.findIndex(e => matchesAreSame(e, m));
      if (existingIdx >= 0) {
        const existing = dedupedMatches[existingIdx];
        // Merge sources — add any source names we don't already have
        const existingSourceKeys = new Set(existing.sources.map(s => s.source));
        for (const src of m.sources) {
          if (!existingSourceKeys.has(src.source)) {
            existing.sources.push(src);
            existingSourceKeys.add(src.source);
          }
        }
        // Keep richer data
        if (m.poster && !existing.poster) existing.poster = m.poster;
        if (m.homeTeam && !existing.homeTeam) existing.homeTeam = m.homeTeam;
        if (m.awayTeam && !existing.awayTeam) existing.awayTeam = m.awayTeam;
        if (m.homeLogo && !existing.homeLogo) existing.homeLogo = m.homeLogo;
        if (m.awayLogo && !existing.awayLogo) existing.awayLogo = m.awayLogo;
        if (m.league && !existing.league) existing.league = m.league;
        if ((m.viewers || 0) > (existing.viewers || 0)) existing.viewers = m.viewers;
        // If the merged match now has more sources, also store related IDs
        // so the watch page can find ALL sources for this game
        if (!existing._relatedIds) (existing as any)._relatedIds = [existing.id];
        (existing as any)._relatedIds.push(m.id);
      } else {
        dedupedMatches.push({ ...m, sources: [...m.sources] });
      }
    }

    // Sort: live first, then upcoming, then ended
    dedupedMatches.sort((a, b) => {
      const statusOrder = { live: 0, upcoming: 1, ended: 2 };
      return (statusOrder[a.status] || 1) - (statusOrder[b.status] || 1);
    });

    const sports = type === "channel" ? [] : dedupedMatches;
    const channels = type === "sport" ? [] : allChannels;

    const sourceStats: Record<string, number | string> = {
      "watchfooty": wfMatches.status === "fulfilled" ? wfMatches.value.length : "error",
      "streamed": streamedMatches.status === "fulfilled" ? streamedMatches.value.length : "error",
      "dami-tv": damiMatches.status === "fulfilled" ? damiMatches.value.length : "error",
      "cdnlivetv": cdnSportsMatches.status === "fulfilled" ? cdnSportsMatches.value.length : "error",
      "streamfree": sfMatches.status === "fulfilled" ? sfMatches.value.length : "error",
      "tv-channels": cdnChannels.status === "fulfilled" ? cdnChannels.value.length : "error",
    };

    return NextResponse.json({
      success: true,
      totalSports: sports.length,
      totalChannels: channels.length,
      matches: sports,
      channels,
      sources: sourceStats,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch matches" },
      { status: 500 }
    );
  }
}
