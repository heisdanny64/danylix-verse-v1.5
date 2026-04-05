

# D.Verse Full Backend Integration Plan

## Overview
Add Supabase-backed authentication, user profiles, cloud-persisted watchlist/continue-watching/downloads, a profile page with settings, and wire the existing localStorage-based library to sync with Supabase when logged in. The app works without login (localStorage fallback) but syncs to cloud when authenticated.

## Database Schema (1 migration)

### Tables

**profiles**
- `id` uuid PK → references `auth.users(id)` ON DELETE CASCADE
- `name` text NOT NULL
- `username` text UNIQUE NOT NULL
- `email` text NOT NULL
- `avatar_url` text NULL
- `created_at` timestamptz DEFAULT now()

**watchlist**
- `id` uuid PK DEFAULT gen_random_uuid()
- `user_id` uuid NOT NULL → references `auth.users(id)` ON DELETE CASCADE
- `content_id` text NOT NULL (string to handle both TMDB and AniList IDs)
- `content_type` text NOT NULL CHECK (content_type IN ('movie','tv','anime'))
- `title` text NOT NULL
- `poster` text
- `added_at` timestamptz DEFAULT now()
- UNIQUE(user_id, content_id, content_type)

**continue_watching**
- `id` uuid PK DEFAULT gen_random_uuid()
- `user_id` uuid NOT NULL → references `auth.users(id)` ON DELETE CASCADE
- `content_id` text NOT NULL
- `content_type` text NOT NULL CHECK (content_type IN ('movie','tv','anime'))
- `title` text NOT NULL
- `poster` text
- `season` int
- `episode` int
- `progress` real NOT NULL DEFAULT 0 (0-100)
- `last_channel` int
- `updated_at` timestamptz DEFAULT now()
- UNIQUE(user_id, content_id, content_type)

**downloads**
- `id` uuid PK DEFAULT gen_random_uuid()
- `user_id` uuid NOT NULL → references `auth.users(id)` ON DELETE CASCADE
- `content_id` text NOT NULL
- `content_type` text NOT NULL
- `title` text NOT NULL
- `poster` text
- `file_url` text
- `created_at` timestamptz DEFAULT now()

### RLS Policies
All tables: enable RLS. Users can SELECT/INSERT/UPDATE/DELETE only their own rows (`auth.uid() = user_id`). Profiles: users can SELECT/UPDATE own row only.

### Trigger
`handle_new_user` trigger on `auth.users` AFTER INSERT: auto-creates a profile row using `raw_user_meta_data->>'name'`, `raw_user_meta_data->>'username'`, and `email`.

### Function for username lookup
`get_email_by_username(username text)` — SECURITY DEFINER function that returns the email for a given username, used for login-by-username flow.

---

## Files to Create

### 1. `src/contexts/AuthContext.tsx` — Auth provider
- Wraps app with auth state via `onAuthStateChange` + `getSession`
- Exports `useAuth()` hook: `{ user, profile, loading, signUp, signIn, signOut, updateProfile, updatePassword }`
- `signUp(name, username, email, password)`: calls `supabase.auth.signUp` with metadata `{ name, username }`
- `signIn(identifier, password)`: if identifier contains `@`, sign in directly; otherwise call `get_email_by_username` RPC to resolve email first
- Fetches profile from `profiles` table after auth state change

### 2. `src/pages/AuthPage.tsx` — Login / Sign Up page
- Tab-based UI: Login | Sign Up
- Login: email-or-username + password fields
- Sign Up: name, username, email, password, confirm password
- Client-side validation (username format, password match, min length)
- Redirects to `/` on success

### 3. `src/pages/ProfilePage.tsx` — User profile page
- Shows: name, username, email
- "Edit Profile" button → inline edit or modal for name/username
- "Change Password" section: old password (not needed for Supabase — just new + confirm)
- Downloads preview row (horizontal scroll, links to `/downloads`)
- About / Privacy / Terms links (placeholder pages or modals)
- Sign Out button

### 4. `src/pages/DownloadsPage.tsx` — Full downloads list
- Grid of downloaded content cards
- Fetches from `downloads` table
- Empty state if none

### 5. `src/lib/supabase-library.ts` — Cloud-synced library functions
- `syncWatchlist(userId)`: fetch user's watchlist from Supabase
- `addToCloudWatchlist(userId, item)`: upsert into watchlist table
- `removeFromCloudWatchlist(userId, contentId, contentType)`: delete
- `syncContinueWatching(userId)`: fetch from continue_watching
- `updateCloudProgress(userId, item)`: upsert; if progress >= 95, delete instead
- All functions handle errors gracefully and fall back to localStorage

---

## Files to Modify

### 6. `src/App.tsx` — Add auth provider + new routes
- Wrap with `<AuthProvider>`
- Add routes: `/auth`, `/profile`, `/downloads`
- Add protected route wrapper (redirect to `/auth` if not logged in for profile/downloads)

### 7. `src/components/BottomNav.tsx` — Add Profile tab
- Add Profile icon/tab (User icon) → `/profile`
- Show only when logged in; show "Sign In" link when not

### 8. `src/lib/library.ts` — Hybrid localStorage + Supabase sync
- Accept optional `userId` parameter
- When user is logged in: read/write to Supabase, cache locally
- When logged out: localStorage only (current behavior)
- On login: merge localStorage data into Supabase (one-time sync)

### 9. `src/pages/DetailsPage.tsx` — Wire cloud watchlist
- Use auth context to determine if cloud or local
- Watchlist toggle calls cloud functions when logged in

### 10. `src/pages/PlayerPage.tsx` — Wire cloud continue-watching
- Save progress to Supabase when logged in
- Remove from continue_watching when progress >= 95%

### 11. `src/pages/LibraryPage.tsx` — Fetch from Supabase when logged in
- Use cloud watchlist data when authenticated
- Keep localStorage fallback for anonymous users

### 12. `src/pages/Index.tsx` — "Picked For You" row
- When logged in: derive from user's watchlist genres/types
- Simple implementation: fetch TMDB recommendations based on most recent watchlist items
- When logged out: skip row (as currently done)

---

## API Keys
The TMDB key, AniList endpoint, and TasteDive key are already hardcoded in the source. These are all **public/publishable** keys (client-side API calls to public APIs), so no env var migration is needed — they work as-is. No secrets to add.

---

## Technical Notes

- **No breaking changes**: All existing streaming, player, search, details, and recommendation features remain untouched
- **Anonymous usage preserved**: The app works fully without login; Supabase is additive
- **Content types remain**: `"movie" | "tv" | "anime"` — no changes to content classification
- **Homepage row order stays**: 16 rows as currently implemented (Section 4 matches current Index.tsx exactly, with "Picked For You" added for logged-in users)

## Files Summary

| File | Action |
|------|--------|
| Migration SQL | Create profiles, watchlist, continue_watching, downloads tables + RLS + trigger |
| `src/contexts/AuthContext.tsx` | **Create** — Auth state provider |
| `src/pages/AuthPage.tsx` | **Create** — Login/signup page |
| `src/pages/ProfilePage.tsx` | **Create** — User profile + settings |
| `src/pages/DownloadsPage.tsx` | **Create** — Downloads list page |
| `src/lib/supabase-library.ts` | **Create** — Cloud library sync functions |
| `src/App.tsx` | Modify — Add AuthProvider, new routes |
| `src/components/BottomNav.tsx` | Modify — Add Profile tab |
| `src/lib/library.ts` | Modify — Hybrid local+cloud sync |
| `src/pages/DetailsPage.tsx` | Modify — Cloud watchlist integration |
| `src/pages/PlayerPage.tsx` | Modify — Cloud progress saving |
| `src/pages/LibraryPage.tsx` | Modify — Cloud data fetching |
| `src/pages/Index.tsx` | Modify — Add "Picked For You" row |

