# D.Verse Cleanup & Extension Plan

This is a large but surgical pass. Streaming logic, Player.tsx playback engine, downloads, Supabase sync, and the existing UI/layout stay untouched.

## 1. Unified MediaItem normalization

Add `src/lib/media.ts`:
- Export `MediaItem` type as specified.
- `tmdbToMediaItem(tmdb, type)` — maps TMDB result/detail.
- `giftedToMediaItem(gifted)` — maps Gifted search result; sets `source:"gifted"`, `giftedId`.
- `normalizeTitle(t)` — strips `[…]`, `(…)`, punctuation, lowercases, collapses whitespace.
- Keep existing `TMDBMovie` shape working — `MovieCard` keeps consuming it. `MediaItem` is the *merge/dedup* layer for search + Nollywood + anime row.

## 2. Remove AniList as a metadata source

Anime currently lives as a parallel universe (`/details/anime/:anilistId`, `/player/anime/:anilistId`, `getAnimeDetails`, `animeToCard`, AniList episode/season merging). Collapse it into the TMDB TV flow.

- `src/lib/anilist.ts` → reduced to a single helper:
  - `verifyIsAnime(title, year?): Promise<boolean>` — tiny GraphQL search; returns boolean only.
  - In-memory + `sessionStorage` cache `animeVerificationCache[normTitle] -> boolean`.
  - Delete `getTrendingAnime`, `getPopularAnime`, `getAnimeDetails`, `getAnimeRecommendations`, `animeToCard`, season-merging logic, `AnimeItem`, `AnimeSeason`.
- `src/services/giftedApi.ts`: delete `resolveAnimeEpisode` and `ANIME_OFFSET_CACHE_KEY` (AniList prequel walking). Keep only TMDB-based season/episode passthrough.
- `src/lib/tastedive.ts`: delete `getAnimeRecommendationsFromTasteDive`. `getMovieTVRecommendations` covers anime since anime = TV under TMDB.

### Routing fallout
- `Player.tsx`: drop the `isAnime` branch, `getAnimeDetails`, `resolveAnimeEpisode`, `absEpisode` query, and the `anime` route handling. Anime now plays via `/player/tv/{tmdbId}?season=&episode=`. Stream URL passing logic untouched.
- `DetailsPage.tsx`: delete `AnimeDetailsView`, `AnimeEpisodeList`, `getAnimeDetails`. Anime details = TV details (existing TMDB flow). Add `isAnime` badge inside the existing TV view (keeps "TV" label per spec — internal flag only, no visible new label).
- `CategoryPage.tsx`: drop `ANIME_CATEGORIES` (anime slugs now resolve via the new TMDB+verification anime category).
- `Index.tsx`: replace the two AniList rows (Trending Anime / Popular Anime) with **one** TMDB-based "Anime" row (see §3).
- `SearchPage.tsx`: remove AniList search call + dedup branch (replaced by TMDB+Gifted merge in §6).
- `MovieCard.tsx`: drop `_isAnimeCard` and the anime route. All cards link to `/details/movie|tv/{id}`.
- `library.ts` / `supabase-library.ts`: anime entries already keyed by id+type; `"anime"` type lookups remain readable for back-compat but no new "anime" entries are written.

## 3. New Anime row (TMDB + AniList verification)

Add `getTMDBAnimeCandidates(page)` in `src/lib/tmdb.ts`:
- `/discover/tv` with `with_original_language=ja`, `with_genres=16`, `sort_by=popularity.desc`, `vote_count.gte=50`.

Add `src/lib/animeVerify.ts`:
- `filterVerifiedAnime(items)` → checks each unique title against `verifyIsAnime` (cached). Verifies in parallel with `Promise.allSettled`, never blocks first paint — the row renders TMDB-filtered results immediately, then re-renders once verification flips items off.
- Mark surviving items with `isAnime:true` for downstream code; UI keeps "TV" badge.

Index.tsx: insert a single `MovieRow title="Anime" mediaType="tv" slug="anime"` placed right after Trending Series (per spec: "not at the bottom, possibly under the new Anime row" — Nollywood goes immediately below).

## 4. Nollywood Hits row (Gifted)

Add `getNollywoodFromGifted()` in `src/services/giftedApi.ts`:
- Calls `searchGifted("Nollywood")`, normalizes via `giftedToMediaItem`.
- Detection: `isNollywood = title.includes("nollywood") || (genres?.length===1 && genres[0]==="drama")`. Mark items.

UI:
- Add `LandscapeMovieRow` (or a `variant="landscape"` prop on `MovieRow`) that uses 16:9 cards instead of 2:3 posters. Used **only** for Nollywood. Cards use `imageUrl` directly (no TMDB poster fallback stretching).
- Place row directly below the new Anime row in Index.tsx.
- Tapping a Nollywood card routes to a new `/details/gifted/{giftedId}` view (minimal: backdrop, title, overview if any, Watch + Download). Player launches via existing `subjectId` path — no matching needed since item is already a Gifted record.

## 5. Discover page: Nollywood chip

`RecommendationsPage.tsx`:
- Add chip `{ key:"nollywood", label:"Nollywood", icon:Clapperboard }`.
- In `fetchDiscoverBatch`, if `genres` includes "nollywood" → bypass TMDB entirely and fetch Gifted Nollywood (paginated). Multi-select cap of 3 unchanged; if combined with other chips, behaves as override (Nollywood-only) per spec.

## 6. Search: TMDB + Gifted merge

`SearchPage.tsx`:
- Persist query in URL: `useSearchParams` → read `q=` on mount, write on debounce. Removes back-nav state loss. Also restore scroll via `history.state`.
- Run both `searchTMDB(q)` and `searchGifted(q)` in parallel.
- Normalize both lists to `MediaItem`.
- Dedup: if a normalized Gifted title equals a TMDB title (after `normalizeTitle`), drop the Gifted duplicate. Keep variants like `Naruto [English]` because their normalized form still differs once bracket content is stripped from TMDB but remains lexically distinct via tokens like `english`/`dub` — check tokens after normalization, not just exact match (configurable via `isVariant()`).
- Final order: TMDB first, then Gifted-only. Filter chip `Gifted` added alongside All/Movies/TV.

## 7. TMDB → Gifted matching score

Replace `findBestMatch` scoring in `giftedApi.ts`:
- Title similarity via existing token Jaccard, but on `normalizeTitle` (shared helper). Threshold ≥ **0.7** for accept.
- Year: ±1 → +0.2, ±2 → +0.1, >2 → reject.
- Type match (movie vs tv): mismatch → -0.3.
- Episode count for series (when known via TMDB seasons): close match (±2) → +0.1.
- Sort candidates by composite, return single best. Reject if final score < 0.7. Cache as today.
- Delete the AniList prequel walker (already covered in §2).

## 8. Cast & Characters section

Add `src/components/CastRow.tsx`:
- Horizontal scroll, circular avatars (TMDB profile path) + actor name + character name. Skeleton on load.

`src/lib/tmdb.ts`: add `getCredits(id, mediaType)` → `/movie|tv/{id}/credits`, returns top 20 cast.

`DetailsPage.tsx`: in TV view, render between Episodes accordion and the More Like This row. In Movie view, render between description and More Like This. For Gifted-only details (Nollywood), use whatever `cast` field is on the Gifted record (skip section if absent).

## 9. TasteDive completion

`src/lib/tastedive.ts`:
- `getMovieTVRecommendations(title, type, tmdbId)` already exists — keep, but:
  - Cap at **30** results.
  - Add an in-memory + sessionStorage cache keyed by `${type}:${tmdbId}`.
  - Always run lazily — DetailsPage already gates via `useQuery enabled:!!tmdbTitle`; add `staleTime: 30*60*1000`.
  - Fallback to `/similar` already wired — keep.
- Remove the anime variant (§2).

## 10. Performance / caching

- `animeVerificationCache` (sessionStorage) — §3.
- `tasteDiveCache` (sessionStorage) — §9.
- Search query cache via React Query `staleTime: 60_000` — already present, keep.
- All verification + recommendation work runs *after* first paint (no `await` blocking row render).

## Files touched

Modified: `src/lib/anilist.ts` (gutted), `src/lib/tmdb.ts` (+credits, +anime candidates), `src/lib/tastedive.ts` (cache, anime branch removed), `src/services/giftedApi.ts` (scoring, Nollywood, normalizeTitle export, drop prequel walker), `src/pages/Index.tsx`, `src/pages/SearchPage.tsx`, `src/pages/DetailsPage.tsx`, `src/pages/CategoryPage.tsx`, `src/pages/RecommendationsPage.tsx`, `src/pages/Player.tsx`, `src/components/MovieCard.tsx`, `src/components/MovieRow.tsx` (landscape variant).

Created: `src/lib/media.ts`, `src/lib/animeVerify.ts`, `src/components/CastRow.tsx`, `src/pages/GiftedDetailsPage.tsx` (Nollywood detail).

Deleted: `src/components/AnimeEpisodeList.tsx`.

Routes (`App.tsx`): add `/details/gifted/:id`; remove `/details/anime/:id` and `/player/anime/:id` (or keep as redirect to `/details/tv/:id` for back-compat with existing library entries).

## Out of scope / untouched

- `Player.tsx` playback engine, HLS load, seek, progress sync, subtitle blob conversion.
- `DownloadModal.tsx`, `gifted-proxy` edge function.
- TMDB API key handling, Supabase schema, auth, library row UIs.

## Confirmation point

Existing library/continue-watching rows that store `type:"anime"` with AniList IDs will become orphaned (their detail/player routes are gone). Plan keeps a redirect from `/details/anime/:id` → a "Re-add this title" toast or a best-effort TMDB lookup by title. Confirm preference on approval; default = silent redirect to home.