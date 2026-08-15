import { useCallback, useEffect, useState } from "react";
import type { SubjectKind } from "@/services/moviebox";

/**
 * Local-only library store. Watchlist, continue-watching and resume positions
 * all live in localStorage, keyed by MovieBox subjectId.
 */

const WATCHLIST_KEY = "dverse_watchlist";
const CONTINUE_KEY = "dverse_continue_watching";
const RESUME_KEY = "dverse_resume_positions";

export interface LibraryItem {
  id: string;
  title: string;
  poster: string | null;
  type: SubjectKind;
  addedAt: number;
}

export interface ContinueWatchingItem {
  id: string;
  title: string;
  poster: string | null;
  type: SubjectKind;
  progress: number; // 0-100
  se: number;
  ep: number;
  updatedAt: number;
}

export interface LibrarySubject {
  subjectId: string;
  title: string;
  poster?: string | null;
  type: SubjectKind;
}

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveJSON<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* noop */
  }
}

/* ── Resume positions ──────────────────────────────────────────────────── */

const resumeKey = (id: string, se: number, ep: number) => `${id}:${se}:${ep}`;

export function saveLocalResume(id: string, currentTime: number, se = 0, ep = 0) {
  const map = loadJSON<Record<string, number>>(RESUME_KEY, {});
  if (currentTime > 5) map[resumeKey(id, se, ep)] = currentTime;
  else delete map[resumeKey(id, se, ep)];
  saveJSON(RESUME_KEY, map);
}

export function getLocalResume(id: string, se = 0, ep = 0): number {
  const map = loadJSON<Record<string, number>>(RESUME_KEY, {});
  return map[resumeKey(id, se, ep)] ?? 0;
}

export function clearLocalResume(id: string, se = 0, ep = 0) {
  const map = loadJSON<Record<string, number>>(RESUME_KEY, {});
  delete map[resumeKey(id, se, ep)];
  saveJSON(RESUME_KEY, map);
}

/* ── Hook ──────────────────────────────────────────────────────────────── */

const LIBRARY_EVENT = "dverse:library";

function emit() {
  window.dispatchEvent(new Event(LIBRARY_EVENT));
}

export function useLibrary() {
  const [watchlist, setWatchlist] = useState<LibraryItem[]>(() => loadJSON(WATCHLIST_KEY, []));
  const [continueWatching, setContinueWatching] = useState<ContinueWatchingItem[]>(() =>
    loadJSON(CONTINUE_KEY, []),
  );

  useEffect(() => {
    const sync = () => {
      setWatchlist(loadJSON(WATCHLIST_KEY, []));
      setContinueWatching(loadJSON(CONTINUE_KEY, []));
    };
    window.addEventListener(LIBRARY_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(LIBRARY_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const isInWatchlist = useCallback(
    (id: string | number) => watchlist.some((i) => i.id === String(id)),
    [watchlist],
  );

  const addToWatchlist = useCallback((s: LibrarySubject) => {
    const next = loadJSON<LibraryItem[]>(WATCHLIST_KEY, []).filter((i) => i.id !== s.subjectId);
    next.unshift({
      id: s.subjectId,
      title: s.title,
      poster: s.poster ?? null,
      type: s.type,
      addedAt: Date.now(),
    });
    saveJSON(WATCHLIST_KEY, next);
    setWatchlist(next);
    emit();
  }, []);

  const removeFromWatchlist = useCallback((id: string | number) => {
    const next = loadJSON<LibraryItem[]>(WATCHLIST_KEY, []).filter((i) => i.id !== String(id));
    saveJSON(WATCHLIST_KEY, next);
    setWatchlist(next);
    emit();
  }, []);

  const toggleWatchlist = useCallback(
    (s: LibrarySubject) => {
      if (loadJSON<LibraryItem[]>(WATCHLIST_KEY, []).some((i) => i.id === s.subjectId)) {
        removeFromWatchlist(s.subjectId);
        return false;
      }
      addToWatchlist(s);
      return true;
    },
    [addToWatchlist, removeFromWatchlist],
  );

  const updateProgress = useCallback(
    (s: LibrarySubject, progress: number, se = 0, ep = 0, currentTime?: number) => {
      if (currentTime !== undefined) saveLocalResume(s.subjectId, currentTime, se, ep);
      const list = loadJSON<ContinueWatchingItem[]>(CONTINUE_KEY, []).filter(
        (i) => i.id !== s.subjectId,
      );
      if (progress < 95) {
        list.unshift({
          id: s.subjectId,
          title: s.title,
          poster: s.poster ?? null,
          type: s.type,
          progress,
          se,
          ep,
          updatedAt: Date.now(),
        });
      } else {
        clearLocalResume(s.subjectId, se, ep);
      }
      const next = list.slice(0, 30);
      saveJSON(CONTINUE_KEY, next);
      setContinueWatching(next);
      emit();
    },
    [],
  );

  const removeFromContinue = useCallback((id: string | number) => {
    const next = loadJSON<ContinueWatchingItem[]>(CONTINUE_KEY, []).filter(
      (i) => i.id !== String(id),
    );
    saveJSON(CONTINUE_KEY, next);
    setContinueWatching(next);
    emit();
  }, []);

  const clearLibrary = useCallback(() => {
    saveJSON(WATCHLIST_KEY, []);
    saveJSON(CONTINUE_KEY, []);
    saveJSON(RESUME_KEY, {});
    setWatchlist([]);
    setContinueWatching([]);
    emit();
  }, []);

  return {
    watchlist,
    continueWatching: continueWatching.filter((i) => i.progress < 95),
    isInWatchlist,
    addToWatchlist,
    removeFromWatchlist,
    toggleWatchlist,
    updateProgress,
    removeFromContinue,
    clearLibrary,
  };
}
