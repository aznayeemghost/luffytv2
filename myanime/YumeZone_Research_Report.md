# YumeZone Anime API Research Report

## Executive Summary

YumeZone is an **open-source anime & manga streaming platform** that acts as a frontend aggregator. It does NOT host any video content itself — instead, it orchestrates multiple third-party APIs to resolve anime metadata, episode lists, and streaming URLs (m3u8/HLS). The site lives at **yumezone.vercel.app** and its source code is at **github.com/OTAKUWeBer/YumeZone**.

---

## 1. YumeZone Architecture Overview

### Repository
- **GitHub**: https://github.com/OTAKUWeBer/YumeZone
- **Live site**: https://yumezone.vercel.app
- **Author**: OTAKUWeBer (also contributed PR #5 to walterwhite-69/Miruro-API for "API v2.0")
- **Tech stack**: React / Next.js, deployed on Vercel

### Core API Dependencies
| API | Purpose |
|-----|---------|
| **Miruro API** | Primary — anime catalog, episode resolution, m3u8 stream URLs |
| **AniList GraphQL API** | Metadata fallback — anime/manga details, character data, scoring |
| **MyAnimeList (via Jikan)** | Secondary metadata source |

### Key Quote from README
> "It hooks into AniList and MyAnimeList and utilizes the **Miruro API** to provide a comprehensive anime library — along with a fully integrated manga reader — all wrapped in a gorgeous Glassmorphism user interface."

### Confirmed API Endpoint
From YumeZone GitHub Issue #14: `https://api.miruro.tv/` is the primary API endpoint used by YumeZone.

---

## 2. The Miruro API v2.0 (YumeZone's Core API)

This is the **primary API** that YumeZone calls for all streaming data. It is a decrypted, reverse-engineered version of Miruro's native API.

### Base URLs (multiple mirrors)
- `https://api.miruro.tv/` (primary, used by YumeZone)
- `https://miruro-api.vercel.app/` (public hosted version)
- `https://www.anifake.com/` (alternative mirror)

### Search & Discovery Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/search?query={q}&page=1&per_page=20` | Search anime by name. Returns full metadata per result (title, cover, genres, studios, scores, etc.) |
| GET | `/suggestions?query={q}` | Lightweight autocomplete. Max 8 results. Returns: id, title, poster, format, status, year, episodes |
| GET | `/spotlight` | Top 10 trending/popular anime (hero banners) |
| GET | `/filter?genre=...&tag=...&year=...&season=...&format=...&status=...&sort=...&page=...&per_page=...` | Advanced filter/browse |

**Filter Values:**
- **genre**: Action, Romance, Comedy, Drama, Fantasy, Sci-Fi, etc.
- **tag**: Isekai, Time Skip, Reincarnation, etc.
- **season**: WINTER, SPRING, SUMMER, FALL
- **format**: TV, MOVIE, OVA, ONA, SPECIAL
- **status**: RELEASING, FINISHED, NOT_YET_RELEASED, CANCELLED
- **sort**: SCORE_DESC, POPULARITY_DESC, TRENDING_DESC, START_DATE_DESC

### Collection Endpoints (All Paginated)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/trending?page=1&per_page=20` | Currently trending |
| GET | `/popular?page=1&per_page=20` | All-time most popular |
| GET | `/upcoming?page=1&per_page=20` | Not yet aired |
| GET | `/recent?page=1&per_page=20` | Currently airing / this season |
| GET | `/schedule?page=1&per_page=20` | Next episodes airing soon (includes `airingAt` UNIX timestamp, `timeUntilAiring` seconds, `next_episode` number) |

### Anime Detail Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/info/{anilist_id}` | Complete anime page data (title, description, coverImage, bannerImage, format, season, episodes, duration, status, scores, genres, tags, studios, characters, staff, relations, recommendations, trailer, externalLinks, streamingEpisodes, stats, etc.) |
| GET | `/anime/{id}/characters?page=1&per_page=25` | Paginated characters with voice actors |
| GET | `/anime/{id}/relations` | Sequels, prequels, spin-offs |
| GET | `/anime/{id}/recommendations?page=1&per_page=10` | Community recommendations |

### Streaming: 3-Step Flow

This is the **critical flow** for how YumeZone gets from anime page → stream URL:

#### Step 1: Get Episode List
```
GET /episodes/{anilist_id}
```

**Response structure:**
```json
{
  "mappings": {
    "anilistId": 178005,
    "malId": 56885
  },
  "providers": {
    "kiwi": {
      "episodes": {
        "sub": [
          {
            "id": "watch/kiwi/178005/sub/animepahe-1",
            "number": 1,
            "title": "Episode Title",
            "image": "https://...",
            "airDate": "2026-01-04",
            "duration": 1420,
            "description": "...",
            "filler": false
          }
        ],
        "dub": [ ... ]
      }
    },
    "arc": { ... },
    "zoro": { ... }
  }
}
```

**Key points:**
- Episodes are organized by **provider** (kiwi, arc, zoro, jet)
- Within each provider, episodes are split by **sub** and **dub**
- Each episode has a unique `id` string that is used as the slug in Step 2
- The `id` format follows: `watch/{provider}/{anilistId}/{sub|dub}/{source-slug}`

#### Step 2: Get Stream Sources (Recommended)
```
GET /watch/{provider}/{anilistId}/{category}/{slug}
```

Example: `GET /watch/kiwi/178005/sub/animepahe-1`

**Response:**
```json
{
  "streams": [
    {
      "url": "https://.../master.m3u8",
      "type": "hls",
      "quality": "1080p"
    }
  ],
  "subtitles": [
    {
      "file": "...",
      "label": "English"
    }
  ],
  "intro": { "start": 0, "end": 90 },
  "outro": { "start": 1300, "end": 1420 }
}
```

**Alternative detailed option:**
```
GET /sources?episodeId=...&provider=...&anilistId=...&category=...
```

#### Step 3: Play the Stream
- Take `streams[0].url` (an m3u8/HLS URL)
- Feed into any HLS-compatible player (Video.js, hls.js, VLC, mpv, etc.)
- Subtitles: hard-subbed (kiwi/pahe) or in the `subtitles` array (zoro/arc)
- Use `intro`/`outro` timestamps for skip buttons

### Internal Provider Names (Miruro)
| Provider | Description | Subtitles |
|----------|-------------|-----------|
| **kiwi** | Maps to AnimePahe sources | Hard-subbed |
| **arc** | Alternative source | Soft subs in `subtitles` array |
| **zoro** | Maps to Zoro/HiAnime sources | Soft subs in `subtitles` array |
| **jet** | Additional source | Varies |

### Miruro API Encryption
The native Miruro frontend encrypts all API communication:
- **Pipeline**: base64-encode → gzip-compress → AES encrypt (Web Crypto / secure pipe)
- **Bypass**: The `walterwhite-69/Miruro-API` Python library decrypts this by extracting the encryption key from Miruro's JS bundle and replicating the decryption logic natively
- This is why the hosted API mirrors (api.miruro.tv, miruro-api.vercel.app) exist — they handle the decryption server-side

---

## 3. The AllAnime API Ecosystem

While YumeZone uses the Miruro API, many other sites (ReAnime, AllManga, etc.) use the **AllAnime GraphQL API** directly. This is a distinct but related ecosystem.

### Core API
- **Base URL**: `https://allanime.day`
- **GraphQL endpoint**: `https://allanime.day/api/graphql`
- **Protocol**: GraphQL with **Persisted Query Protocol** (queries are sent as hashes, not raw text)
- **Technical spec**: https://gist.github.com/minhmc2007/91c3ba5dde9604d076e83787bb34a8b6

### GraphQL Query Structure (from animdl/anipy-cli source code)
The AllAnime API uses specific query hashes for different operations:
- **Search**: Query shows by search string
- **Show details**: Get anime metadata by `showId`
- **Episode list**: Get episodes by `showId` and `translationType` (sub/dub)
- **Episode sources**: Get streaming URLs by episode ID

### Key Fields
| Field | Description |
|-------|-------------|
| `showId` | Unique identifier for an anime show |
| `translationType` | `"sub"` or `"dub"` — controls which audio version |
| `sourceUrl` | The streaming/embed URL for an episode |
| `serverName` | Name of the embed server (e.g., "Miku", "Megaplay") |
| `tobeparsed` | Encrypted response field (base64 + AES-256-GCM encrypted) |

### Server Names / Embed Players
AllAnime returns multiple server options per episode:

| Server Name | Type | Description |
|-------------|------|-------------|
| **Miku** | Embed | Returns an iframe embed URL — requires additional extraction to get the actual m3u8 |
| **Megaplay** | Embed | Another embed player — returns iframe URL that wraps the video |
| **EXTERNAL** | External | Points to an external streaming page/URL |
| **Default/Other** | Direct | Some servers return direct m3u8 URLs |

### Encryption Change (2025)
AllAnime recently started encrypting GraphQL episode responses:
- **Before**: Plain JSON with `sourceUrl` field
- **After**: `tobeparsed` field containing base64-encoded + AES-256-GCM encrypted data
- **Fix**: Decrypt `tobeparsed` using the same client-side decryption logic found in AllAnime's JS bundle
- This broke tools like `ani-cli`, `animdl`, etc. until they added decryption support

### Sites Using AllAnime API
| Site | URL | Integration Method |
|------|-----|-------------------|
| **AllAnime** | allanime.day | Direct (native) |
| **AllManga** | allmanga.to | Direct (shared backend) |
| **ReAnime** | reanime.tv | Direct |
| **ani-cli** | CLI tool | Scrapes AllAnime GraphQL API |
| **anipy-cli** | CLI tool | AllAnimeProvider class |
| **animdl** | Python downloader | gql_api.py module |
| **AnimeStream addon** | Stremio addon | Cloudflare Worker scraper |
| **Yuzono extensions** | Aniyomi extensions | Kotlin extension for AllAnime |

---

## 4. The Complete Flow: Anime Page → Stream URL → Embed Player

### Flow A: YumeZone (Miruro API Path)
```
1. User browses/searches anime
   → GET /search?query=naruto
   → Returns list of anime with AniList IDs

2. User clicks an anime
   → GET /info/{anilist_id}
   → Returns full metadata (title, cover, description, etc.)

3. User goes to watch page
   → GET /episodes/{anilist_id}
   → Returns episode list organized by provider (kiwi, arc, zoro) and sub/dub

4. User selects episode + provider + sub/dub
   → GET /watch/kiwi/178005/sub/animepahe-1
   → Returns m3u8 URLs, subtitles, intro/outro timestamps

5. YumeZone's player (hls.js or Video.js)
   → Fetches the m3u8 manifest
   → Plays the HLS stream directly
   → NO iframe/embed needed — direct m3u8 playback
```

### Flow B: AllAnime-based Sites (AllAnime GraphQL Path)
```
1. User searches anime
   → POST /api/graphql with search query hash
   → Returns list of shows with showIds

2. User clicks an anime
   → POST /api/graphql with show query hash + showId
   → Returns anime metadata

3. User selects episode
   → POST /api/graphql with episode query hash + showId + translationType
   → Returns episode list with sourceUrls and serverNames
   → May need to decrypt "tobeparsed" field (AES-256-GCM)

4. For EXTERNAL/Miku/Megaplay servers:
   → sourceUrl is an embed/iframe URL
   → Need to fetch the embed page HTML
   → Extract the actual m3u8 URL from the page's JavaScript
   → Some use MegaCloud, DoodStream, or other video hosts

5. For direct servers:
   → sourceUrl may be a direct m3u8 URL
   → Play directly in HLS player

6. Sub/Dub switching:
   → Re-query with translationType: "sub" or "dub"
   → Different episode lists may be returned
   → Some shows only have sub OR dub, not both
```

### Key Difference
- **YumeZone/Miruro**: The API resolves everything server-side → returns **direct m3u8 URLs**. No iframe embeds needed.
- **AllAnime-based sites**: The API returns **embed URLs** for some servers (Miku, Megaplay, EXTERNAL) → additional client-side extraction needed to get the actual video URL.

---

## 5. Sub/Dub Switching Mechanism

### In Miruro API (YumeZone)
- Episodes are organized in a nested structure: `providers.{name}.episodes.{sub|dub}`
- Switching sub/dub = selecting a different category within the same provider
- The episode `id` includes the category: `watch/kiwi/178005/sub/animepahe-1` vs `watch/kiwi/178005/dub/animepahe-1`
- Some providers may only offer sub OR dub, not both

### In AllAnime API
- The `translationType` parameter controls sub/dub: `"sub"` or `"dub"`
- Separate GraphQL queries needed for each translation type
- The returned episode lists and server options may differ between sub and dub

---

## 6. Related Projects & Tools

### Direct YumeZone Alternatives
| Project | GitHub | Notes |
|---------|--------|-------|
| **YumeAnime** | Riteshp2001/YumeAnime | Similar open-source anime streaming site |
| **Miruro** | Miruro-no-kuon/Miruro | Original Miruro site (React + Vite, powered by Consumet) |

### API Libraries
| Project | GitHub | Language | Purpose |
|---------|--------|----------|---------|
| **Miruro-API** | walterwhite-69/Miruro-API | Python | Decrypted Miruro API bypassing Web Crypto |
| **mo7-mmed/Miruro-API** | mo7-mmed/Miruro-API | Python | Alternative Miruro API tool for Windows |
| **Proxify-Streams** | walterwhite-69/Proxify-Streams | Python/Flask | Aggregates Miruro, Anikuro, LunarAnime, Animanga providers |
| **Consumet** | consumet/consumet.org | Node.js | High-level APIs for anime/manga streaming sources |
| **HACHI-API** | Pal-droid/HACHI-API | Python/FastAPI | Lightweight anime metadata & streaming scraper |

### AllAnime Scrapers
| Project | GitHub | Language | Purpose |
|---------|--------|----------|---------|
| **ani-cli** | pystardust/ani-cli | Bash | CLI anime player using AllAnime |
| **anipy-cli** | sdaqo/anipy-cli | Python | CLI anime tool with AllAnimeProvider |
| **animdl** | justfoolingaround/animdl | Python | Fast anime downloader with AllAnime gql_api.py |
| **AnimeStream addon** | Zen0-99/animestream-addon | JavaScript | Stremio addon using AllAnime GraphQL |
| **Yuzono extensions** | yuzono/anime-extensions | Kotlin | Aniyomi extensions including AllAnime v14.40 |

---

## 7. Summary of Key URLs & Patterns

### YumeZone
- Live: `https://yumezone.vercel.app`
- API: `https://api.miruro.tv/`
- Example anime page: `https://yumezone.vercel.app/anime/156001`

### Miruro API Endpoints
- Search: `GET /search?query=naruto&page=1&per_page=20`
- Info: `GET /info/20` (Naruto = AniList ID 20)
- Episodes: `GET /episodes/178005`
- Watch: `GET /watch/kiwi/178005/sub/animepahe-1`
- Sources: `GET /sources?episodeId=...&provider=kiwi&anilistId=178005&category=sub`

### AllAnime API
- GraphQL: `POST https://allanime.day/api/graphql`
- Spec: `https://gist.github.com/minhmc2007/91c3ba5dde9604d076e83787bb34a8b6`

### Other Mirrors
- Miruro API v2: `https://miruro-api.vercel.app/`
- Miruro API alt: `https://www.anifake.com/`
- AllManga: `https://allmanga.to/`

---

## 8. Technical Notes

1. **AniList IDs are the universal key**: Both Miruro and AllAnime use AniList IDs as the primary anime identifier. This allows cross-referencing between different APIs and providers.

2. **M3U8/HLS is the universal format**: All providers ultimately resolve to m3u8/HLS streams. Some embed servers (Miku, Megaplay) wrap this in an iframe, but the underlying video is always HLS.

3. **Encryption layers**:
   - Miruro: Web Crypto / secure pipe (base64 + gzip + AES encryption on API communication)
   - AllAnime: AES-256-GCM encryption on episode source data (tobeparsed field)
   - Both have been reverse-engineered and bypassed in open-source tools

4. **The "provider" abstraction**: Both APIs abstract multiple video sources behind provider names. If one source is down, the client can try another. This is why you see multiple providers (kiwi, arc, zoro) in Miruro and multiple servers (Miku, Megaplay) in AllAnime.

5. **Global Image Proxying**: Miruro API v2.0 proxies all images through `serveproxy.com` to prevent ISP blocking and CORS issues.

6. **Pagination**: All collection endpoints return `{ page, perPage, total, hasNextPage, results[] }`.
