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
