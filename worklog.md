---
Task ID: 1
Agent: Main Agent
Task: Fix duplicate matches, iframe loading, add LiveHDTV as 2nd server

Work Log:
- Analyzed screenshots: sports page shows black player (iframe not loading), matches duplicated from different providers
- Read all key source files from GitHub repo via API
- Fixed DamiTV embed URLs in /api/live/embed/route.ts: changed from embed/?ch= and embed/?id= to player/hls/?v=300&resolve= format
- Fixed match merging in /api/live/route.ts: removed apiSource restrictions on provider ID merging, always merge ALL provider IDs (damitvId, watchfootyId, streamKey, sportsrcCategory, etc.) so one match card has ALL servers
- Fixed iframe loading in live-watch-page.tsx: removed playerState === "playing" guard that was blocking iframe from rendering, added allow-presentation to sandbox
- Added LiveHDTV as 2nd server source in /api/live-tv/channels/route.ts with 512 channels from sitemap
- Added LiveHDTV source filter in live-tv-page.tsx with cyan color (#06b6d4)
- Added LiveHDTV cross-server support in live-tv-watch-page.tsx: channels from other sources can also use LiveHDTV as fallback
- Fixed cross-provider merging in live-watch-page.tsx: always search all providers for matching teams, collect IDs from ALL providers
- All files pushed to GitHub

Stage Summary:
- 6 files updated and pushed to GitHub
- DamiTV now uses player/hls/?v=300&resolve= format (works in iframe with sandbox)
- Same match from different providers (DamiTV + StreamedPK + WatchFooty) now merges into ONE card with ALL servers
- Iframe should now load properly (removed blocking condition)
- LiveHDTV added as 2nd server with 512 channels
- Cross-server support: watching a DamiTV channel can also use LiveHDTV as fallback

---
Task ID: 1
Agent: Main Agent
Task: Fix match deduplication — same match from different APIs should appear as ONE entry with multiple server options

Work Log:
- Analyzed user screenshot showing duplicate Roland-Garros entries (TNT Sports 1 vs TNT Sports 4)
- Read full codebase: /api/live/route.ts (1100+ lines), /api/live/embed/route.ts (500+ lines), live-watch-page.tsx, live-page.tsx
- Identified root cause: DamiTV returns separate entries per channel (e.g., "Roland-Garros: TNT Sports 1" and "Roland-Garros: TNT Sports 4") but mergeMatches() only deduplicates by homeTeam/awayTeam — it doesn't merge by tournament/event name
- Added `damitvIds` array to LiveMatch interface for accumulating multiple DamiTV channel IDs per match
- Created `extractBaseEventName()` function to strip channel suffixes from DamiTV titles (e.g., "Roland-Garros: TNT Sports 1" → "roland-garros")
- Rewrote `mergeMatches()` with 3-level matching: exact team match → fuzzy team match → base event name match
- Process WatchFooty lists first so their data (title, poster, teams, scores) is used as base for merged matches
- Accumulate ALL DamiTV IDs as separate server options during merge via `mergeDamitvIds()` helper
- Updated embed route to parse `damitvIds` JSON array and resolve each DamiTV ID as a separate stream with labeled channel name (e.g., "DamiTV TNT Sports 1")
- Updated live-page.tsx and live-watch-page.tsx to pass `damitvIds` through navigation props and embed API params
- Build succeeded, pushed to GitHub (fahadulalim93-cloud/luffytv-tasin)

Stage Summary:
- Same tournament/event from different DamiTV channels now merges into ONE match card with multiple server buttons
- WatchFooty used as PRIMARY for display data (image, title, teams, scores)
- Each DamiTV channel becomes a separate stream option (labeled with channel name)
- Pushed to GitHub as commit b04f645
