import { useSyncExternalStore } from "react";
import { PEOPLE } from "./config";
import type { CycleInfo } from "./cycle";
import { addDays, diffDays, fromKey, toKey, type DayKey } from "./dates";

/* ---------- Public holidays (fetched once per session from /api/holidays) ---------- */

interface Holiday {
  date: DayKey;
  name: string;
  tentative: boolean;
}

let holidays: Holiday[] = [];
let requested = false;
const listeners = new Set<() => void>();

function load() {
  if (requested) return;
  requested = true;
  fetch("/api/holidays")
    .then((r) => r.json())
    .then((j: { holidays?: Holiday[] }) => {
      holidays = j.holidays ?? [];
      listeners.forEach((l) => l());
    })
    .catch(() => {
      requested = false; // try again next time
    });
}

export function useHolidays(): Holiday[] {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      load();
      return () => listeners.delete(cb);
    },
    () => holidays,
    () => holidays,
  );
}

/* ---------- Long weekends ---------- */

export interface LongWeekend {
  start: DayKey;
  end: DayKey;
  days: number;
  names: string[];
  tentative: boolean;
  /** A single working day to take off to get this break. */
  leave?: DayKey;
}

const isWeekend = (k: DayKey) => {
  const d = fromKey(k).getDay();
  return d === 0 || d === 6;
};

/**
 * Breaks of 3+ days (weekend + public holiday), plus "take one day off"
 * bridges that turn a Tuesday/Thursday holiday into 4 days.
 */
export function longWeekends(list: Holiday[], today: DayKey, horizon = 180): LongWeekend[] {
  const byDay = new Map<DayKey, Holiday[]>();
  for (const h of list) byDay.set(h.date, [...(byDay.get(h.date) ?? []), h]);
  const off = (k: DayKey) => isWeekend(k) || byDay.has(k);

  // Maximal runs of days off, over a window that starts a little before today.
  const runs: { start: DayKey; end: DayKey }[] = [];
  let k = addDays(today, -4);
  const last = addDays(today, horizon);
  while (k <= last) {
    if (off(k)) {
      const start = k;
      while (off(addDays(k, 1))) k = addDays(k, 1);
      runs.push({ start, end: k });
    }
    k = addDays(k, 1);
  }

  const info = (start: DayKey, end: DayKey) => {
    const hs: Holiday[] = [];
    for (let d = start; d <= end; d = addDays(d, 1)) hs.push(...(byDay.get(d) ?? []));
    return { names: [...new Set(hs.map((h) => h.name))], tentative: hs.some((h) => h.tentative), any: hs.length > 0 };
  };

  const out: LongWeekend[] = [];
  runs.forEach((r, i) => {
    const len = diffDays(r.end, r.start) + 1;
    const h = info(r.start, r.end);
    if (len >= 3 && h.any) out.push({ start: r.start, end: r.end, days: len, names: h.names, tentative: h.tentative });

    // Bridge: exactly one working day between this run and the next one.
    const next = runs[i + 1];
    if (next && diffDays(next.start, r.end) === 2) {
      const lenNext = diffDays(next.end, next.start) + 1;
      if (len < 3 && lenNext < 3) {
        const b = info(r.start, next.end);
        if (b.any) {
          out.push({
            start: r.start,
            end: next.end,
            days: len + lenNext + 1,
            names: b.names,
            tentative: b.tentative,
            leave: addDays(r.end, 1),
          });
        }
      }
    }
  });
  return out.filter((w) => w.end >= today);
}

/* ---------- Everything for the "Coming up" list ---------- */

export interface UpcomingItem {
  key: string;
  date: DayKey;
  end?: DayKey;
  emoji: string;
  title: string;
  sub: string;
  tint: string;
}

function nextAnnual(month: number, day: number, today: DayKey): DayKey {
  const t = fromKey(today);
  let d = toKey(new Date(t.getFullYear(), month - 1, day));
  if (d < today) d = toKey(new Date(t.getFullYear() + 1, month - 1, day));
  return d;
}

const short = (k: DayKey) => fromKey(k).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });

export function upcoming(info: CycleInfo | null, list: Holiday[], today: DayKey): UpcomingItem[] {
  const items: UpcomingItem[] = [];

  if (info) {
    items.push({
      key: "period",
      date: info.nextStart < today ? today : info.nextStart,
      emoji: "🌙",
      title: "Next period",
      sub: info.daysUntilNext < 0 ? `${-info.daysUntilNext} days late` : "predicted",
      tint: "var(--berry-soft)",
    });
  }

  const her = nextAnnual(PEOPLE.herBirthday.month, PEOPLE.herBirthday.day, today);
  items.push({ key: "her-bday", date: her, emoji: "🎂", title: "Your birthday", sub: "Cake is mandatory", tint: "var(--peach-soft)" });
  items.push({
    key: "his-bday",
    date: nextAnnual(PEOPLE.hisBirthday.month, PEOPLE.hisBirthday.day, today),
    emoji: "🎁",
    title: `${PEOPLE.him}'s birthday`,
    sub: "Also Valentine's Day. Efficient.",
    tint: "var(--lilac-soft)",
  });

  for (const w of longWeekends(list, today).slice(0, 3)) {
    items.push({
      key: `lw-${w.start}`,
      date: w.start,
      end: w.end,
      emoji: w.leave ? "🧳" : "🏖️",
      title: w.leave ? `${w.days}-day break` : `${w.days}-day long weekend`,
      sub: `${w.names.join(" + ")}${w.tentative ? " (tentative)" : ""}${w.leave ? ` · take ${short(w.leave)} off` : ""}`,
      tint: "var(--mint-soft)",
    });
  }

  return items.sort((a, b) => a.date.localeCompare(b.date));
}

export function countdown(date: DayKey, today: DayKey, end?: DayKey): string {
  if (end && date <= today && today <= end) return "On now";
  const n = diffDays(date, today);
  if (n === 0) return "Today 🎉";
  if (n === 1) return "Tomorrow";
  return `in ${n} days`;
}
