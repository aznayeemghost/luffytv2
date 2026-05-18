---
Task ID: 1
Agent: Main Agent
Task: Add AnixTV Hindi server with AniList ID mapper and comprehensive sandbox

Work Log:
- Read existing embed-servers.ts, watch-page.tsx, embed-sandbox.tsx, hindi-anime-db.ts, store.ts
- Updated anixtvHindi in embed-servers.ts with correct URL format: `https://anixtv.in/anime-watch?action=hindi_1_player&id={anilistId}&season={season}&episode={episode}&title={title}`
- Created /home/z/my-project/myanime/src/lib/anilist-mapper.ts with:
  - Built-in index of 55+ popular anime with titles, types, episode counts
  - lookupAniListLocal() for instant local lookups
  - lookupAniListAPI() for live AniList GraphQL API lookups with 30-min cache
  - lookupAniList() smart lookup (local first, then API fallback)
  - searchAniList() for anime search via AniList GraphQL
  - lookupAniListByTitle() for fuzzy title matching
- Updated watch-page.tsx to pass `title: animeTitle` to server.generateUrl()
- Rebuilt embed-sandbox.tsx with comprehensive testing for ALL providers:
  - Miruro Kiwi (native HLS)
  - MegaPlay Decryptor (native HLS)
  - VidNest (iframe, sub/dub/hindi)
  - VidNest Animepahe (iframe, sub/dub/hindi)
  - VidEasy (iframe, sub/dub)
  - MegaPlay Embed (iframe, sub/dub/hindi)
  - TryEmbed (iframe, sub/dub)
  - VidPlus (iframe, sub/dub)
  - AnixTV Hindi (iframe, hindi only, needs title)
  - Added AniList Mapper section with auto title lookup + manual edit
  - Added AniList search with debounced live results
  - Added sub/dub/hindi language toggle
  - Added season input for AnixTV
  - Added 16 quick pick anime with Hindi flags
  - Provider cards auto-filter by selected language
- Fixed store.ts: Added "hindi" to Route union type, navigate(), and parseHash()
- TypeScript check: 0 new errors, all 15 existing errors are pre-existing

Stage Summary:
- AnixTV Hindi server fully integrated with correct URL format
- AniList mapper provides automatic title/season lookup for URL generation
- Sandbox completely rebuilt with ALL 9 providers + mapper + search + sub/dub/hindi
- Watch page now passes anime title to all embed servers for proper URL generation
- Hindi route type fixed in store (was causing TS error before)
