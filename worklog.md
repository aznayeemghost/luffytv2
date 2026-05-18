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
