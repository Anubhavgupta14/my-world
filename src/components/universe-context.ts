import { createContext, useContext } from "react";
import type { GameId, Progress } from "@/lib/progress";

export interface CelebrateOptions {
  x?: number;
  y?: number;
  count?: number;
  mode?: "burst" | "rain";
}

export interface ToastOptions {
  title?: string;
  icon?: string;
  duration?: number;
}

export interface UniverseApi {
  index: number;
  go: (to: number) => void;
  next: () => void;
  back: () => void;
  progress: Progress;
  reduced: boolean;
  musicOn: boolean;
  sfxOn: boolean;
  toggleMusic: () => void;
  toggleSfx: () => void;
  /** Stops the background music (e.g. when a YouTube song starts). */
  pauseMusic: () => void;
  enableAllSound: () => void;
  celebrate: (options?: CelebrateOptions) => void;
  toast: (message: string, options?: ToastOptions) => void;
  completeGame: (id: GameId) => void;
}

export const UniverseContext = createContext<UniverseApi | null>(null);

export function useUniverse(): UniverseApi {
  const api = useContext(UniverseContext);
  if (!api) throw new Error("useUniverse must be used inside <Universe>");
  return api;
}

/** Centre point of the element that triggered an event — handy for celebration bursts. */
export function centerOf(el: Element) {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}
