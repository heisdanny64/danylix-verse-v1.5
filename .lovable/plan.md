# Rebuild D. Verse on the MovieBox provider

Rip out every legacy content provider (TMDB, AniList, TasteDive, Gifted) and rebuild the app on top of the Spün MovieBox worker at `https://moviebox.byspun.xyz`.

## What changes for you

- Homepage is fully backend-driven: rows come from the API, not from code.
- The `Banner_Africa` row becomes the hero carousel; every other allowed row becomes a homepage carousel in the order the API returns.
- Music, sports, fights, wrestling, comedy-skit, VIP-upsell and other junk rows are filtered out automatically by keyword, so new junk rows from the API stay hidden without a code change.
- Shorts stay in (a dedicated shorts player comes later).
- Discover page is gone. Bottom nav becomes a floating translucent pill with Home, Library, You.
- Library, continue-watching and profile run on local storage for now — no login wall — until the new database is chosen.

## Build steps

### 1. New provider layer

Create `src/services/moviebox.ts` as the single API client:

- Base URL and secret from `VITE_MOVIEBOX_API_URL` / `VITE_MOVIEBOX_SECRET` (`.env`), sent as `X-Worker-Secret` on every call.
- Typed wrappers: `searchSubjects`, `getInfo`, `getSeason`, `getStream(subjectId, se, ep)`, `getStreamAll`, `getDownload`, `getHomeRows`, `getHomeSubjects(opId)`.
- Shared `MovieBoxSubject` type (`subjectId`, `subjectType`, `type`, `title`, `poster`, `rating`, `genre`, `releaseDate`, `hasResource`).
- Errors surface as thrown `Error` so React Query retries/handles them.

### 2. Delete legacy providers

Remove `src/lib/tmdb.ts`, `anilist.ts`, `animeVerify.ts`, `tastedive.ts`, `contentMap.ts`, `media.ts`, `subtitles.ts`, `src/services/giftedApi.ts`, `src/data/movies.ts`, `src/pages/RecommendationsPage.tsx`, `src/pages/CategoryPage.tsx`, and the `supabase/functions/gifted-proxy` edge function. Drop their routes from `App.tsx` and clean every import.

### 3. Homepage

- `GET /home/rows` once, filter, then one `GET /home/subjects?opId=` query per surviving row (React Query, staggered, cached ~15 min).
- Filter rules applied to row titles (case/emoji-insensitive): drop anything matching music, song, singer, sport, football, FIFA, World Cup, WWE, wrestling, fight, fighter, skit, comedy skit, club & competition, learning/learn and grow, TV channels, VIP, Bet+, Categories, Coming Soon, and generic placeholder rows.
- `Banner_Africa` never renders as a row — it feeds `HeroBanner`.
- Rows with fewer than 3 subjects are skipped.
- Row card orientation stays poster-style; shorts rows use the same card for now.

### 4. Details, search, player

- `DetailsPage`: `/info/:subjectId` for metadata + staff (cast row from `staff`), `/season/:subjectId` for the episode list when `type` is `tv` or `shorts`.
- `SearchPage`: `POST /search` with debounce and paging via `pager.hasMore`.
- `Player`: fetch `/stream/:subjectId?se=&ep=` fresh at playback, build the quality menu from the returned array (never cache signed URLs). Movies use `se=0&ep=0`, TV/shorts use real season/episode.
- `DownloadModal`: `/download/:subjectId`, grouped season → episode → qualities.
- Routing keys move from TMDB numeric ids to `subjectId`; slug routes become `/movie/:subjectId`, `/tv/:subjectId`, `/shorts/:subjectId` with old paths redirecting home.

### 5. Navigation and layout

- `BottomNav`: three tabs (Home, Library, You), floating pill — inset from the screen edges, fully rounded, translucent background with backdrop blur, subtle border and shadow, respects safe-area inset.
- Page bottom padding adjusted for the floating bar.

### 6. Local persistence

`src/lib/library.ts` becomes the single local-storage store for watchlist, continue-watching and player prefs, keyed by `subjectId`. `supabase-library.ts` and Supabase reads/writes are removed from the UI path; `AuthContext` degrades to a no-op stub so profile and library render without a session.

## Technical notes

- Secret ships in the client bundle for now (worker allows `Access-Control-Allow-Origin: *`); it moves behind a server proxy when the new backend lands.
- No hardcoded `opId`s anywhere — they are discovered per session.
- Existing Supabase migration files and client stay on disk untouched, just unused, so the future backend swap is a clean follow-up.
