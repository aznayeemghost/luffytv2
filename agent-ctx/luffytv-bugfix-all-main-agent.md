# Task: LuffyTV Comprehensive Bug Fixes

## Agent: Main Agent
## Task ID: luffytv-bugfix-all
## Date: 2025-03-05

## Summary of Changes

All 8 critical tasks completed successfully. Build passes. Changes pushed to GitHub.

### Files Modified (5 files, 433 insertions, 570 deletions):

1. **`src/app/api/live/embed/route.ts`** — Complete rewrite
   - Removed `export const runtime = "edge"` (fixes Vercel build error)
   - Removed ALL M3U8/hls.js extraction code
   - All streams now returned as `streamType: "embed"` with `embedUrl`
   - Providers: StreamFree (origin + mirror), CDNLiveTV, DamiTV, WatchFooty, StreamedPK, SportsEmbed.su, EmbedSports.top, LiveHDTV
   - StreamFree uses actual category from API + mirror server (miror spelling)
   - EmbedSports.top uses sport-specific slugs (admin-football-channel etc) + 6 servers per match
   - LiveHDTV resolver added for TV channels

2. **`src/app/api/live/route.ts`** — Match deduplication fix + LiveHDTV
   - **Fixed mergeMatches**: New `normalizeTeamName()` function for better dedup key generation
   - **Aggregate ALL sources**: When same match appears from different APIs, sources are MERGED into one entry's `sources[]` array
   - **Preserve provider-specific fields**: damitvId, watchfootyId, streamKey, streamCategory, channelCode, channelName, sportsrcCategory, sportsrcId, livehdtvSlug all preserved from ALL sources
   - **Prefer ESPN for badges**: ESPN badges/logos preferred when available, then filled from other sources
   - **Added LiveHDTV source**: ~100 popular channels embedded as static data (no API call needed), each with `livehdtvSlug` and embed URL pattern
   - Each source now initializes `sources` array with its own entry (e.g., `[{ source: "streamfree", id: "xxx" }]`)

3. **`src/components/anime/live-watch-page.tsx`** — Complete rewrite
   - **Removed hls.js entirely** — no import, no M3U8 playback, no video element
   - **Player container**: `height: 85vh` instead of `aspect-ratio: 16/9`
   - **Iframe shows IMMEDIATELY** for embed streams with sandbox attribute:
     `sandbox="allow-scripts allow-same-origin allow-forms allow-presentation allow-popups"`
   - No play button for embed streams — direct iframe display
   - StreamInfo interface simplified (no m3u8Url, corsEnabled, referer fields)
   - Fetches from embed API with all provider params including livehdtvSlug
   - Passes `matchSport` and `matchTitle` to embed API for proper provider resolution

4. **`src/components/anime/live-page.tsx`** — Navigation fixes + LiveHDTV
   - Added `livehdtvSlug` to LiveMatch interface
   - `handleWatchMatch` now passes `matchLivehdtvSlug`
   - `handleWatchChannel` now matches cdnlivetv channels to LiveHDTV slugs using `LIVEHDTV_SLUG_MAP`
   - Added `LIVEHDTV_SLUG_MAP` constant with ~50 common channel name-to-slug mappings

5. **`src/components/anime/store.ts`** — Route type update
   - Added `matchLivehdtvSlug?: string` to the `live-watch` route type

## Build Status
- `DATABASE_URL="file:./dev.db" npx next build` — ✅ PASSES
- No lint errors in our modified files
- Pushed to GitHub: fahadulalalim93-cloud/luffytv-tasin (main branch)

## Key Architecture Decisions

1. **Iframe-only approach**: No hls.js dependency at runtime. All streams rendered as sandboxed iframes. This is more reliable and works across all devices/browsers.

2. **Match dedup with source aggregation**: The `mergeMatches` function now properly aggregates sources from ALL APIs into a single match entry. The dedup key uses normalized team names + sport for matches, and channel-specific keys for TV channels.

3. **LiveHDTV as static data**: Instead of fetching from an API, the LiveHDTV channel list is embedded directly in the route handler. This is more reliable and faster.

4. **EmbedSports sport-specific slugs**: Each sport maps to a specific admin slug (e.g., football → "admin-football-channel"), and 6 server entries are generated per match (/1 through /6).

5. **StreamFree mirror**: Added "miror" (intentional misspelling) mirror server alongside origin.
