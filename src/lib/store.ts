import { useSyncExternalStore } from "react";
import { DEFAULTS } from "./config";
import type { AppState, DayLog, Period, Settings } from "./cycle";
import { addDays, todayKey, type DayKey } from "./dates";
import { enqueue, flush } from "./sync";
import type { DataSnapshot, SyncOp } from "./sync-protocol";

/*
 * Her data lives in Supabase. This store holds it in memory for instant UI:
 * it's filled once from the server (`hydrate`), and every change is diffed
 * and queued to sync in the background.
 */

const fresh = (): AppState => ({
  version: 1,
  settings: { ...DEFAULTS },
  periods: [],
  logs: {},
  treatsOpened: 0,
  bestCrushScore: 0,
});

let state: AppState = fresh();
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

const get = () => state;

/** Load what the server returned. Names and his number always come from config.ts. */
export function hydrate(snap: DataSnapshot) {
  const logs: AppState["logs"] = {};
  for (const r of snap.logs) {
    logs[r.day] = {
      ...(r.pain !== null ? { pain: r.pain } : {}),
      ...(r.moods?.length ? { moods: r.moods as DayLog["moods"] } : {}),
    };
  }
  state = {
    version: 1,
    settings: {
      ...DEFAULTS,
      cycleLength: snap.settings?.cycle_length ?? DEFAULTS.cycleLength,
      periodLength: snap.settings?.period_length ?? DEFAULTS.periodLength,
    },
    periods: snap.periods.map((p) => (p.end ? { start: p.start, end: p.end } : { start: p.start })),
    logs,
    treatsOpened: snap.settings?.treats_opened ?? 0,
    bestCrushScore: snap.settings?.best_crush_score ?? 0,
  };
  notify();
}

function set(next: AppState) {
  const ops = diff(state, next);
  state = next;
  notify();
  enqueue(...ops);
}

/** Everything that changed between two states, as sync ops. */
export function diff(prev: AppState, next: AppState): SyncOp[] {
  const ops: SyncOp[] = [];

  if (prev.periods !== next.periods) {
    const before = new Map(prev.periods.map((p) => [p.start, p.end ?? null]));
    const after = new Map(next.periods.map((p) => [p.start, p.end ?? null]));
    const changed = [...after].filter(([k, v]) => !before.has(k) || before.get(k) !== v);
    const removed = [...before.keys()].filter((k) => !after.has(k));
    if (changed.length) ops.push({ op: "periods.upsert", rows: changed.map(([start, end]) => ({ start, end })) });
    if (removed.length) ops.push({ op: "periods.delete", starts: removed });
  }

  if (prev.logs !== next.logs) {
    const rows = Object.keys(next.logs)
      .filter((day) => prev.logs[day] !== next.logs[day])
      .map((day) => ({ day, pain: next.logs[day].pain ?? null, moods: next.logs[day].moods ?? [] }));
    if (rows.length) ops.push({ op: "logs.upsert", rows });
  }

  const patch: Extract<SyncOp, { op: "settings.update" }>["patch"] = {};
  if (prev.settings.cycleLength !== next.settings.cycleLength) patch.cycle_length = next.settings.cycleLength;
  if (prev.settings.periodLength !== next.settings.periodLength) patch.period_length = next.settings.periodLength;
  if (prev.treatsOpened !== next.treatsOpened) patch.treats_opened = next.treatsOpened;
  if (prev.bestCrushScore !== next.bestCrushScore) patch.best_crush_score = next.bestCrushScore;
  if (Object.keys(patch).length) ops.push({ op: "settings.update", patch });

  return ops;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, get, get);
}

/* ---------- One-time move of old on-device data ---------- */

const LEGACY_KEY = "d-tracker:v1";

/** Old LocalStorage data from before Supabase, if any. */
export function readLegacy(): AppState | null {
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<AppState>;
    if (!p.periods?.length && !Object.keys(p.logs ?? {}).length) return null;
    return {
      ...fresh(),
      ...p,
      settings: { ...DEFAULTS, cycleLength: p.settings?.cycleLength ?? 28, periodLength: p.settings?.periodLength ?? 5 },
    } as AppState;
  } catch {
    return null;
  }
}

/** Upload legacy data as if it had just been entered; forget the local copy only once it's saved. */
export async function importLegacy(legacy: AppState) {
  set(legacy);
  if (await flush()) {
    try {
      localStorage.removeItem(LEGACY_KEY);
    } catch {
      /* ignore */
    }
  }
}

/* ---------- Actions ---------- */

const sortPeriods = (ps: Period[]) => [...ps].sort((a, b) => a.start.localeCompare(b.start));

export const actions = {
  updateSettings(patch: Partial<Pick<Settings, "cycleLength" | "periodLength">>) {
    const s = get();
    set({ ...s, settings: { ...s.settings, ...patch } });
  },

  /** Start a period on `day`. Closes the previous one if it was left open. */
  startPeriod(day: DayKey) {
    const s = get();
    if (s.periods.some((p) => p.start === day)) return;
    const periods = s.periods.map((p) => {
      if (p.start < day && !p.end) {
        const autoEnd = addDays(p.start, s.settings.periodLength - 1);
        return { ...p, end: autoEnd < day ? autoEnd : addDays(day, -1) };
      }
      return p;
    });
    set({ ...s, periods: sortPeriods([...periods, { start: day }]) });
  },

  /** Mark `day` as the last day of the period that contains / precedes it. */
  endPeriod(day: DayKey) {
    const s = get();
    let idx = -1;
    s.periods.forEach((p, i) => {
      if (p.start <= day) idx = i;
    });
    if (idx < 0) return;
    const periods = s.periods.slice();
    periods[idx] = { ...periods[idx], end: day };
    set({ ...s, periods });
  },

  removePeriod(start: DayKey) {
    const s = get();
    set({ ...s, periods: s.periods.filter((p) => p.start !== start) });
  },

  logDay(day: DayKey, patch: Partial<DayLog>) {
    const s = get();
    set({ ...s, logs: { ...s.logs, [day]: { ...s.logs[day], ...patch } } });
  },

  openTreat() {
    const s = get();
    set({ ...s, treatsOpened: s.treatsOpened + 1 });
  },

  recordCrushScore(score: number) {
    const s = get();
    if (score > s.bestCrushScore) set({ ...s, bestCrushScore: score });
  },
};

/* ---------- Today, refreshed when the app comes back to the foreground ---------- */

function subscribeToday(cb: () => void) {
  const id = window.setInterval(cb, 60_000);
  document.addEventListener("visibilitychange", cb);
  return () => {
    window.clearInterval(id);
    document.removeEventListener("visibilitychange", cb);
  };
}

export function useToday(): DayKey {
  return useSyncExternalStore(subscribeToday, todayKey, todayKey);
}
