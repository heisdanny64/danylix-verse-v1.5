import { useEffect, useState, useCallback } from "react";

export type SubtitleSize = "small" | "medium" | "large";
export interface PlayerPrefs {
  quality: string;          // "Auto" | "1080p" | "720p" | "480p" | "360p"
  subtitleLang: string;     // e.g. "English"
  subtitleSize: SubtitleSize;
}

const KEY = "dverse_player_prefs";
const DEFAULTS: PlayerPrefs = { quality: "Auto", subtitleLang: "English", subtitleSize: "small" };

function read(): PlayerPrefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch { return DEFAULTS; }
}

export function getPlayerPrefs(): PlayerPrefs { return read(); }

export function cueScale(size: SubtitleSize): number {
  return size === "large" ? 1.5 : size === "medium" ? 1.2 : 1.0;
}

export function usePlayerPrefs() {
  const [prefs, setPrefsState] = useState<PlayerPrefs>(read);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => { if (e.key === KEY) setPrefsState(read()); };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const update = useCallback((patch: Partial<PlayerPrefs>) => {
    setPrefsState(prev => {
      const next = { ...prev, ...patch };
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  return { prefs, update };
}