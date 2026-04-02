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
      if (prev.some((m) => m.id === movie.id)) return prev;
      return [{ ...movie, mediaType }, ...prev];
    });
  }, []);

  const removeFromWatchlist = useCallback((id: number) => {
    setWatchlist((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const isInWatchlist = useCallback(
    (id: number) => watchlist.some((m) => m.id === id),
    [watchlist]
  );

  const updateProgress = useCallback(
    (movie: TMDBMovie, mediaType: "movie" | "tv" | "anime", progress: number, season?: number, episode?: number) => {
      setContinueWatching((prev) => {
        const filtered = prev.filter((item) => item.movie.id !== movie.id);
        return [
          { movie, mediaType, progress, season, episode, updatedAt: Date.now() },
          ...filtered,
        ];
      });
    },
    []
  );

  const removeFromContinue = useCallback((id: number) => {
    setContinueWatching((prev) => prev.filter((item) => item.movie.id !== id));
  }, []);

  return {
    watchlist,
    continueWatching,
    addToWatchlist,
    removeFromWatchlist,
    isInWatchlist,
    updateProgress,
    removeFromContinue,
  };
}
