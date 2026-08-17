import { useCallback, useEffect, useState } from "react";

export interface PlayerPrefs {
  /** "Auto" | "1080p" | "720p" | "480p" | "360p" */
  quality: string;
  autoplayNext: boolean;
}

const KEY = "dverse_player_prefs";
const DEFAULTS: PlayerPrefs = { quality: "Auto", autoplayNext: true };

function read(): PlayerPrefs {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

export function getPlayerPrefs(): PlayerPrefs {
  return read();
}

/** Highest available resolution at or below the preferred quality. */
export function pickResolution(available: number[], quality: string): number | null {
  const sorted = [...available].sort((a, b) => b - a);
  if (!sorted.length) return null;
  const target = Number(String(quality).replace(/\D/g, ""));
  if (!target) return sorted[0];
  return sorted.find((r) => r <= target) ?? sorted[sorted.length - 1];
}

export function usePlayerPrefs() {
  const [prefs, setPrefs] = useState<PlayerPrefs>(read);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(prefs));
    } catch {
      /* noop */
    }
  }, [prefs]);

  const update = useCallback((patch: Partial<PlayerPrefs>) => {
    setPrefs((p) => ({ ...p, ...patch }));
  }, []);

  return { prefs, update };
}
