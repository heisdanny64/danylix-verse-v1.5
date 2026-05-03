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
    id: Number(item.content_id) || 0,
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
      id: Number(item.content_id) || 0,
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

  const removeFromWatchlist = useCallback((id: number, mediaType?: string) => {
    setWatchlist((prev) => prev.filter((m) => !(m.id === id && (!mediaType || m.mediaType === mediaType))));
    if (userId && mediaType) {
      removeFromCloudWatchlist(userId, String(id), mediaType);
    }
  }, [userId]);

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
    (
      movie: TMDBMovie,
      mediaType: "movie" | "tv" | "anime",
      progress: number,
      season?: number,
      episode?: number,
      currentTime?: number,
      duration?: number,
    ) => {
      setContinueWatching((prev) => {
        const filtered = prev.filter((item) => !(item.movie.id === movie.id && item.mediaType === mediaType));
        if (progress >= 90) return filtered;
        return [
          { movie, mediaType, progress, season, episode, updatedAt: Date.now() },
          ...filtered,
        ];
      });
      if (userId) {
        updateCloudProgress(
          userId,
          String(movie.id),
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

  const removeFromContinue = useCallback((id: number, mediaType?: string) => {
    setContinueWatching((prev) => prev.filter((item) => !(item.movie.id === id && (!mediaType || item.mediaType === mediaType))));
    if (userId && mediaType) {
      removeFromCloudContinue(userId, String(id), mediaType);
    }
  }, [userId]);

  const activeContinueWatching = continueWatching.filter(item => item.progress < 90);

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
