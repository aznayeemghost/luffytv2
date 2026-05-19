---
Task ID: 1
Agent: Main
Task: Fix React error #310, streaming issues, TMDB mapping, Hindi support

Work Log:
- Fixed React error #310 by adding safe data normalization in anime-home.tsx
- Added null-safe getAnimeTitle and getAnimeImage in store.ts
- Fixed anime-card.tsx score rendering to prevent object-as-React-child errors
- Replaced kiwi provider with miku (primary), arc, zoro, jet for Miruro streaming
- Updated embed-servers.ts with new native server definitions (miruroMiku, miruroArc, miruroZoro, miruroJet)
- Updated watch-page.tsx to auto-fallback through all providers (miku→arc→zoro→jet)
- Fixed TMDB ID mapping by adding ani.zip API as additional fallback source
- Improved info/route.ts with better 3-layer TMDB ID resolution (Zenshin → ani.zip → TMDB search)
- Default Miruro watch provider changed from kiwi to miku
- Added Hindi streaming support via miku provider and hindi-dub-embed server
- Pushed all changes to GitHub

Stage Summary:
- React #310 fixed with null-safe data handling throughout component tree
- Streaming now uses miku/arc/zoro/jet instead of kiwi
- TMDB mapping improved with ani.zip fallback
- Hindi streaming supported through multiple server options
- Build verified successfully
- Pushed to GitHub: aznayeemghost/luffy-tv

---
Task ID: 1-6
Agent: Main Agent
Task: Fix navbar sticky+blur, hide on watch pages, fix iframe sizing, add Schedule page

Work Log:
- Fixed navbar: Added backdrop-blur-xl and bg-[#0b1116]/80 when scrolled, with transition-all duration-300
- Fixed navbar: Hidden on watch/streaming pages (isWatchPage && isMangaReader)
- Fixed iframe sizing: Added absolute inset-0, explicit width/height/minHeight styles, and injected CSS into proxy route to force fill
- Fixed landing page spacing: Changed space-y-10 to space-y-12 for better section gaps
- Built Schedule page with: scrollable day-by-day timeline, AniList airing schedule API, countdown timers, next airing banner, quick stats
- Added schedule route to store.ts (Route type, hash routing, parseHash)
- Added Schedule nav item to navbar with calendar icon
- Added Schedule link to footer
- Pushed to GitHub (force push due to conflicts)

Stage Summary:
- Navbar now stays sticky at top with backdrop-blur effect when scrolling
- Navbar is hidden on watch/streaming pages for immersive viewing
- Iframe/sandbox now fills container properly for all translation types (sub/dub/hindi)
- New Schedule page with AniList airing schedule data, countdown timers, day selector
- All changes pushed to https://github.com/aznayeemghost/luffy-tv
