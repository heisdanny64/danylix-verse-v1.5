import { useState, useEffect, useCallback } from "react";
import type { TMDBMovie } from "./tmdb";

const WATCHLIST_KEY = "dverse_watchlist";
const CONTINUE_KEY = "dverse_continue_watching";

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

export function useLibrary() {
  const [watchlist, setWatchlist] = useState<(TMDBMovie & { mediaType: string })[]>(() =>
    loadJSON(WATCHLIST_KEY, [])
  );
  const [continueWatching, setContinueWatching] = useState<ContinueWatchingItem[]>(() =>
    loadJSON(CONTINUE_KEY, [])
  );

  useEffect(() => saveJSON(WATCHLIST_KEY, watchlist), [watchlist]);
  useEffect(() => saveJSON(CONTINUE_KEY, continueWatching), [continueWatching]);

  const addToWatchlist = useCallback((movie: TMDBMovie, mediaType: "movie" | "tv" | "anime" = "movie") => {
    setWatchlist((prev) => {
      if (prev.some((m) => m.id === movie.id && m.mediaType === mediaType)) return prev;
      return [{ ...movie, mediaType }, ...prev];
    });
  }, []);

  const removeFromWatchlist = useCallback((id: number, mediaType?: string) => {
    setWatchlist((prev) => prev.filter((m) => !(m.id === id && (!mediaType || m.mediaType === mediaType))));
  }, []);

  const isInWatchlist = useCallback(
    (id: number, mediaType?: string) => watchlist.some((m) => m.id === id && (!mediaType || m.mediaType === mediaType)),
    [watchlist]
  );

  const toggleWatchlist = useCallback((movie: TMDBMovie, mediaType: "movie" | "tv" | "anime" = "movie") => {
    if (isInWatchlist(movie.id, mediaType)) {
      removeFromWatchlist(movie.id, mediaType);
      return false;
    } else {
      addToWatchlist(movie, mediaType);
      return true;
    }
  }, [isInWatchlist, removeFromWatchlist, addToWatchlist]);

  const updateProgress = useCallback(
    (movie: TMDBMovie, mediaType: "movie" | "tv" | "anime", progress: number, season?: number, episode?: number) => {
      setContinueWatching((prev) => {
        // Match by id + mediaType to avoid cross-type collisions
        const filtered = prev.filter((item) => !(item.movie.id === movie.id && item.mediaType === mediaType));
        // Don't add completed items
        if (progress >= 100) return filtered;
        return [
          { movie, mediaType, progress, season, episode, updatedAt: Date.now() },
          ...filtered,
        ];
      });
    },
    []
  );

  const removeFromContinue = useCallback((id: number, mediaType?: string) => {
    setContinueWatching((prev) => prev.filter((item) => !(item.movie.id === id && (!mediaType || item.mediaType === mediaType))));
  }, []);

  // Filter out completed items from the getter
  const activeContinueWatching = continueWatching.filter(item => item.progress < 100);

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
