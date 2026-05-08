import { useState, useEffect, useCallback } from "react";
import type { TMDBMovie } from "./tmdb";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchCloudWatchlist,
  addToCloudWatchlist,
  removeFromCloudWatchlist,
  isInCloudWatchlist,
  fetchCloudContinueWatching,
  updateCloudProgress,
  removeFromCloudContinue,
  type CloudWatchlistItem,
  type CloudContinueItem,
} from "./supabase-library";
import { posterUrl } from "./tmdb";

const WATCHLIST_KEY = "dverse_watchlist";
const CONTINUE_KEY = "dverse_continue_watching";
const ACTIVE_USER_KEY = "dverse_active_user";
const RESUME_KEY = "dverse_resume_positions";

// ─── Resume position localStorage helpers ────────────────────────────────────
// Stored as a flat map: { "contentId:contentType:season:episode": currentTimeSec }
// Keyed by content+episode so movies, TV episodes, and Gifted content all
// have independent resume positions.

function resumeMapKey(
  contentId: string,
  contentType: string,
  season?: number,
  episode?: number,
): string {
  return `${contentId}:${contentType}:${season ?? 0}:${episode ?? 0}`;
}

export function saveLocalResume(
  contentId: string,
  contentType: string,
  currentTime: number,
  season?: number,
  episode?: number,
) {
  try {
    const map = loadJSON<Record<string, number>>(RESUME_KEY, {});
    const key = resumeMapKey(contentId, contentType, season, episode);
    if (currentTime > 5) {
      map[key] = currentTime;
    } else {
      delete map[key]; // don't store near-zero positions
    }
    saveJSON(RESUME_KEY, map);
  } catch { /* noop */ }
}

export function getLocalResume(
  contentId: string,
  contentType: string,
  season?: number,
  episode?: number,
): number {
  try {
    const map = loadJSON<Record<string, number>>(RESUME_KEY, {});
    return map[resumeMapKey(contentId, contentType, season, episode)] ?? 0;
  } catch {
    return 0;
  }
}

export function clearLocalResume(
  contentId: string,
  contentType: string,
  season?: number,
  episode?: number,
) {
  try {
    const map = loadJSON<Record<string, number>>(RESUME_KEY, {});
    delete map[resumeMapKey(contentId, contentType, season, episode)];
    saveJSON(RESUME_KEY, map);
  } catch { /* noop */ }
}

/** Clear all local library data. Called when the active user changes. */
function clearLocalLibrary() {
  try {
    localStorage.removeItem(WATCHLIST_KEY);
    localStorage.removeItem(CONTINUE_KEY);
    localStorage.removeItem(RESUME_KEY);
  } catch { /* noop */ }
}

export interface ContinueWatchingItem {
  movie: TMDBMovie;
  mediaType: "movie" | "tv" | "anime";
  progress: number; // 0-100
  season?: number;
  episode?: number;
  updatedAt: number;
  lastChannel?: number;
}

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveJSON<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

// Convert cloud watchlist item to local format
function cloudToLocalWatchlist(item: CloudWatchlistItem): TMDBMovie & { mediaType: string } {
  return {
    id: (/^\d+$/.test(item.content_id) ? Number(item.content_id) : item.content_id) as any,
    overview: "",
    poster_path: item.poster,
    backdrop_path: null,
    vote_average: 0,
    genre_ids: [],
    title: item.title,
    mediaType: item.content_type,
    _isAnimeCard: item.content_type === "anime",
  } as any;
}

// Convert cloud continue watching item to local format
function cloudToLocalContinue(item: CloudContinueItem): ContinueWatchingItem {
  return {
    movie: {
      id: (/^\d+$/.test(item.content_id) ? Number(item.content_id) : item.content_id) as any,
      overview: "",
      poster_path: item.poster,
      backdrop_path: null,
      vote_average: 0,
      genre_ids: [],
      title: item.title,
      _isAnimeCard: item.content_type === "anime",
    } as any,
    mediaType: item.content_type as "movie" | "tv" | "anime",
    progress: item.progress,
    season: item.season ?? undefined,
    episode: item.episode ?? undefined,
    updatedAt: new Date(item.updated_at).getTime(),
    lastChannel: item.last_channel ?? undefined,
  };
}

export function useLibrary() {
  const { user } = useAuth();
  const userId = user?.id;

  const [watchlist, setWatchlist] = useState<(TMDBMovie & { mediaType: string })[]>(() =>
    loadJSON(WATCHLIST_KEY, [])
  );
  const [continueWatching, setContinueWatching] = useState<ContinueWatchingItem[]>(() =>
    loadJSON(CONTINUE_KEY, [])
  );
  const [cloudLoaded, setCloudLoaded] = useState(false);

  // Detect user switching — clear local data so previous account's library
  // never bleeds into a different account before cloud sync completes.
  useEffect(() => {
    const storedUser = localStorage.getItem(ACTIVE_USER_KEY);
    const currentUser = userId ?? null;
    if (storedUser !== currentUser) {
      clearLocalLibrary();
      setWatchlist([]);
      setContinueWatching([]);
      setCloudLoaded(false);
      try {
        if (currentUser) localStorage.setItem(ACTIVE_USER_KEY, currentUser);
        else localStorage.removeItem(ACTIVE_USER_KEY);
      } catch { /* noop */ }
    }
  }, [userId]);

  // Sync from cloud on login
  useEffect(() => {
    if (!userId) { setCloudLoaded(false); return; }
    let cancelled = false;
    (async () => {
      const [cloudWl, cloudCw] = await Promise.all([
        fetchCloudWatchlist(userId),
        fetchCloudContinueWatching(userId),
      ]);
      if (cancelled) return;
      if (cloudWl.length > 0) setWatchlist(cloudWl.map(cloudToLocalWatchlist));
      if (cloudCw.length > 0) setContinueWatching(cloudCw.map(cloudToLocalContinue));
      setCloudLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [userId]);

  // Persist locally
  useEffect(() => saveJSON(WATCHLIST_KEY, watchlist), [watchlist]);
  useEffect(() => saveJSON(CONTINUE_KEY, continueWatching), [continueWatching]);

  const getTitle = (movie: TMDBMovie) => movie.title || (movie as any).name || "Untitled";
  const getPoster = (movie: TMDBMovie) => {
    if ((movie as any)._isAnimeCard && movie.poster_path && !movie.poster_path.startsWith("/")) return movie.poster_path;
    return movie.poster_path;
  };

  const addToWatchlist = useCallback((movie: TMDBMovie, mediaType: "movie" | "tv" | "anime" = "movie") => {
    setWatchlist((prev) => {
      if (prev.some((m) => m.id === movie.id && m.mediaType === mediaType)) return prev;
      return [{ ...movie, mediaType }, ...prev];
    });
    if (userId) {
      addToCloudWatchlist(userId, String(movie.id), mediaType, getTitle(movie), getPoster(movie));
    }
  }, [userId]);

  const removeFromWatchlist = useCallback((id: number | string, mediaType?: string) => {
    setWatchlist((prev) => prev.filter((m) => !(String(m.id) === String(id) && (!mediaType || m.mediaType === mediaType))));
    if (userId && mediaType) {
      removeFromCloudWatchlist(userId, String(id), mediaType);
    }
  }, [userId]);

  const isInWatchlist = useCallback(
    (id: number | string, mediaType?: string) => watchlist.some((m) => String(m.id) === String(id) && (!mediaType || m.mediaType === mediaType)),
    [watchlist]
  );

  const toggleWatchlist = useCallback((movie: TMDBMovie, mediaType: "movie" | "tv" | "anime" = "movie") => {
    if (isInWatchlist(String(movie.id), mediaType)) {
      removeFromWatchlist(String(movie.id), mediaType);
      return false;
    } else {
      addToWatchlist(movie, mediaType);
      return true;
    }
  }, [isInWatchlist, removeFromWatchlist, addToWatchlist]);

  const updateProgress = useCallback(
    (
      movie: TMDBMovie,
      mediaType: "movie" | "tv" | "anime",
      progress: number,
      season?: number,
      episode?: number,
      currentTime?: number,
      duration?: number,
    ) => {
      const contentId = String(movie.id);

      // Always save resume position to localStorage — works for guests too
      if (currentTime && currentTime > 5) {
        saveLocalResume(contentId, mediaType, currentTime, season, episode);
      }

      setContinueWatching((prev) => {
        const filtered = prev.filter(
          (item) => !(String(item.movie.id) === contentId && item.mediaType === mediaType)
        );
        // Keep entry until 95% — previously 90% which caused resume to fail
        if (progress >= 95) {
          clearLocalResume(contentId, mediaType, season, episode);
          return filtered;
        }
        return [
          { movie, mediaType, progress, season, episode, updatedAt: Date.now() },
          ...filtered,
        ];
      });

      // Sync to Supabase in the background for signed-in users
      if (userId) {
        updateCloudProgress(
          userId,
          contentId,
          mediaType,
          getTitle(movie),
          getPoster(movie),
          progress,
          season,
          episode,
          undefined,
          currentTime,
          duration,
        );
      }
    },
    [userId]
  );

  const removeFromContinue = useCallback((id: number | string, mediaType?: string) => {
    setContinueWatching((prev) => prev.filter((item) => !(String(item.movie.id) === String(id) && (!mediaType || item.mediaType === mediaType))));
    if (userId && mediaType) {
      removeFromCloudContinue(userId, String(id), mediaType);
    }
  }, [userId]);

  const activeContinueWatching = continueWatching.filter(item => item.progress < 95);

  return {
    watchlist,
    continueWatching: activeContinueWatching,
    addToWatchlist,
    removeFromWatchlist,
    isInWatchlist,
    toggleWatchlist,
    updateProgress,
    removeFromContinue,
  };
}
