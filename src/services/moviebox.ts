/**
 * MovieBox provider — the single content source for the app.
 * Wraps the Spün MovieBox worker (https://moviebox.byspun.xyz).
 *
 * NOTE: the worker secret currently ships with the client bundle. It moves
 * behind a server proxy once the new backend is in place.
 */

const BASE_URL = (import.meta.env.VITE_MOVIEBOX_API_URL ?? "https://moviebox.byspun.xyz").replace(/\/$/, "");
const SECRET = import.meta.env.VITE_MOVIEBOX_SECRET ?? "Danylix";

export type SubjectKind = "movie" | "tv" | "shorts";

export interface MovieBoxSubject {
  subjectId: string;
  subjectType: number;
  type: SubjectKind;
  title: string;
  poster: string | null;
  thumbnail?: string | null;
  backdrop?: string | null;
  backdropPath?: string | null;
  background?: string | null;
  description?: string;
  releaseDate?: string | null;
  runtime?: number | null;
  genre?: string | null;
  country?: string | null;
  rating?: number | null;
  language?: string | null;
  hasResource?: boolean;
}

export interface MovieBoxInfo extends MovieBoxSubject {
  staff?: { name: string; role: string; avatar: string | null }[];
}

export interface MovieBoxSearchResult {
  items: (MovieBoxSubject & { duration?: string })[];
  pager: { hasMore: boolean; page: string | number; perPage: number; totalCount: number };
}

export interface MovieBoxSeason {
  season: number;
  totalEpisode: number;
  episodesAvailable: number;
  resolutions: { resolution: number; epNum: number }[];
  episodes: { episode: number; title: string | null; releaseDate: string | null }[];
}

export interface MovieBoxStream {
  quality: string;
  resolution: number;
  url: string;
  format: string;
  size: string;
  codecName: string;
  duration: number;
  captions: { lang?: string; url?: string; lanName?: string }[];
  se: number;
  ep: number;
}

export interface MovieBoxRowMeta {
  title: string;
  opId: string;
}

export interface MovieBoxRow extends MovieBoxRowMeta {
  total: number;
  subjects: MovieBoxSubject[];
}

export interface DownloadPack {
  seasons: {
    season: number;
    episodes: { episode: number; qualities: MovieBoxStream[] }[];
  }[];
  total_seasons: number;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "X-Worker-Secret": SECRET,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`MovieBox request failed (${res.status}) for ${path}`);
  return (await res.json()) as T;
}

/* ── Discovery ─────────────────────────────────────────────────────────── */

export function getHomeRows() {
  return request<{ total: number; rows: MovieBoxRowMeta[] }>("/home/rows");
}

export function getHomeSubjects(opId: string) {
  return request<{ opId: string; title: string; total: number; subjects: MovieBoxSubject[] }>(
    `/home/subjects?opId=${encodeURIComponent(opId)}`,
  );
}

/* ── Search & metadata ─────────────────────────────────────────────────── */

export function searchSubjects(keyword: string, page = 1, perPage = 20) {
  return request<MovieBoxSearchResult>("/search", {
    method: "POST",
    body: JSON.stringify({ keyword, page, perPage }),
  });
}

export function getInfo(subjectId: string) {
  return request<MovieBoxInfo>(`/info/${subjectId}`);
}

export function getSeason(subjectId: string) {
  return request<{ seasons: MovieBoxSeason[] }>(`/season/${subjectId}`);
}

/* ── Playback ──────────────────────────────────────────────────────────── */

export function getStream(subjectId: string, se = 0, ep = 0) {
  return request<{ streams: MovieBoxStream[]; total: number }>(
    `/stream/${subjectId}?se=${se}&ep=${ep}`,
  );
}

export function getStreamAll(subjectId: string) {
  return request<{
    seasons: { season: number; episodes: { episode: number; streams: MovieBoxStream[]; total: number }[] }[];
    total_seasons: number;
  }>(`/stream/${subjectId}/all`);
}

export function getDownloadPack(subjectId: string) {
  return request<DownloadPack>(`/download/${subjectId}`);
}

/* ── Helpers ───────────────────────────────────────────────────────────── */

export function subjectYear(s: { releaseDate?: string | null }): number | null {
  const y = s.releaseDate ? Number(String(s.releaseDate).slice(0, 4)) : NaN;
  return Number.isFinite(y) && y > 1800 ? y : null;
}

export function subjectGenres(s: { genre?: string | null }): string[] {
  return (s.genre || "")
    .split(/[,/]/)
    .map((g) => g.trim())
    .filter(Boolean);
}

export const POSTER_FALLBACK = "/placeholder.svg";

export function posterOf(s: { poster?: string | null; thumbnail?: string | null }): string {
  return s.poster || s.thumbnail || POSTER_FALLBACK;
}

export function contentImageOf(s: {
  backdrop?: string | null;
  backdropPath?: string | null;
  background?: string | null;
  poster?: string | null;
  thumbnail?: string | null;
}): string {
  return s.backdrop || s.backdropPath || s.background || s.poster || s.thumbnail || POSTER_FALLBACK;
}

/**
 * Homepage rows we never want to show: music, sports, fights, skits, upsells
 * and other non-film noise. Matched against a normalized row title so new
 * junk rows from the API stay hidden without a code change.
 */
const EXCLUDED_ROW_PATTERNS: RegExp[] = [
  /music|song|singer|mix|mv\b/,
  /sport|football|soccer|fifa|world cup|nba|basketball|athlet/,
  /wwe|wrestl|fight|fighter|boxing|ufc|mma/,
  /skit|comedy skit/,
  /club & competition|competition picks/,
  /learn|learning|early education/,
  /tv channel|live & replay|\blive\b/,
  /\bvip\b|bet\+|premium|get the/,
  /^categories$/,
  /coming soon/,
  /^movie\/tv series$/,
];

export const HERO_ROW_TITLE = "Banner_Africa";

function normalizeRowTitle(title: string): string {
  return (title || "")
    // strip emoji / symbols
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, "")
    .trim()
    .toLowerCase();
}

export function isHeroRow(title: string): boolean {
  return normalizeRowTitle(title) === HERO_ROW_TITLE.toLowerCase();
}

export function isAllowedRow(title: string): boolean {
  const t = normalizeRowTitle(title);
  if (!t) return false;
  if (t === HERO_ROW_TITLE.toLowerCase()) return false;
  return !EXCLUDED_ROW_PATTERNS.some((re) => re.test(t));
}
