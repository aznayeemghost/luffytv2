# Task: Jikan/MAL API Fallback Frontend Updates

## Summary
Updated frontend components to support Jikan/MAL API data as fallback when AniList/Miruro are down.

## Changes Made

### 1. `src/components/anime/search-page.tsx`
- Added `jikanResults` state (`MiruroAnimeResult[]`)
- Updated `performSearch` to extract `data.jikanResults` from API response
- Added `setJikanResults([])` in `handleTabChange` to clear on tab switch
- Updated `totalResults` to include `jikanResults.length`
- Added new "Anime via MAL" section to display Jikan results with distinct label
- Updated empty results check to use `totalResults === 0`

### 2. `src/components/anime/anime-card.tsx`
- **No changes needed.** Already works with MiruroAnimeResult format (which jikanToMiruro produces). The `isMiruro` check correctly identifies Jikan data, and navigation uses `String(anime.id)` which works for MAL IDs.

### 3. `src/components/anime/anime-detail.tsx`
- Added `dataSource` state to track `_source` field from info API response
- Updated `cleanId` logic to also strip `mal_` prefix: `animeId.replace(/^miruro_/, "").replace(/^mal_/, "")`
- Store `data._source` from info API response to `dataSource` state
- Updated score badge to show "MAL" instead of "AL" when `dataSource === "jikan"`

### 4. `src/components/anime/watch-page.tsx`
- Updated `cleanId` logic to also strip `mal_` prefix: `animeId.replace(/^miruro_/, "").replace(/^mal_/, "")`

### 5. `src/components/anime/home-page.tsx`
- **No changes needed.** Uses MiruroAnimeResult format; backend already returns Jikan data in this format when Miruro is unavailable.

### 6. `src/components/anime/anime-home.tsx`
- **No changes needed.** Uses MiruroAnimeResult format; backend already returns Jikan data when Miruro is unavailable. AniList fallback also still works.

## Key Design Decisions
- Jikan IDs are plain numbers (e.g., 16498). The backend info route handles them by trying AniList first (which fails with 403), then falling back to Jikan.
- The `mal_` prefix stripping was added for future-proofing in case we want to explicitly mark MAL IDs to skip AniList lookups.
- The `_source: "jikan"` field from the backend is used to show "MAL" badge instead of "AL" on the detail page.

## Lint/Type Check
- No new lint errors introduced
- No new TypeScript errors in modified files
- Pre-existing lint/TS errors remain unchanged
