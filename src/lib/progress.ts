import { useSyncExternalStore } from "react";

export type GameId =
  | "today"
  | "checkup"
  | "report"
  | "hearts"
  | "pune"
  | "distance"
  | "playlist"
  | "galaxy"
  | "prayer"
  | "letter";

export interface Progress {
  /** Furthest chapter index reached. */
  furthest: number;
  /** Chapter index last visited (for "continue where you left off"). */
  last: number;
  completed: Partial<Record<GameId, boolean>>;
  best: { hearts?: number };
  secrets: string[];
  /** Sound-effects preference. Music is never persisted, so it never autoplays. */
  sfx: boolean;
}

// v2: the chapter list changed, so older saved progress is ignored.
const KEY = "little-universe-for-doctor:v2";

export const DEFAULT_PROGRESS: Progress = {
  furthest: 0,
  last: 0,
  completed: {},
  best: {},
  secrets: [],
  sfx: false,
};

let state: Progress = DEFAULT_PROGRESS;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Progress>;
      state = {
        ...DEFAULT_PROGRESS,
        ...parsed,
        completed: { ...parsed.completed },
        best: { ...parsed.best },
        secrets: Array.isArray(parsed.secrets) ? parsed.secrets : [],
      };
    }
  } catch {
    // Private mode or corrupted data: start fresh, silently.
  }
}

function persist() {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Storage unavailable — progress simply won't survive a reload.
  }
}

export function getProgress(): Progress {
  load();
  return state;
}

export function updateProgress(update: (current: Progress) => Progress) {
  load();
  state = update(state);
  persist();
  listeners.forEach((listener) => listener());
}

export function resetProgress() {
  updateProgress((current) => ({ ...DEFAULT_PROGRESS, sfx: current.sfx }));
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useProgress(): Progress {
  return useSyncExternalStore(subscribe, getProgress, () => DEFAULT_PROGRESS);
}
