/**
 * Tiny local-date helpers. Every day is stored as a "YYYY-MM-DD" key in the
 * phone's own timezone, so a period logged at 11pm never slips to the next day.
 */

export type DayKey = string;

const pad = (n: number) => String(n).padStart(2, "0");

export function toKey(d: Date): DayKey {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromKey(key: DayKey): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function todayKey(): DayKey {
  return toKey(new Date());
}

export function addDays(key: DayKey, n: number): DayKey {
  const d = fromKey(key);
  return toKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n));
}

/** Whole days from `b` to `a` (a − b). Rounded so DST shifts don't matter. */
export function diffDays(a: DayKey, b: DayKey): number {
  return Math.round((fromKey(a).getTime() - fromKey(b).getTime()) / 86_400_000);
}

export function fmt(key: DayKey, opts: Intl.DateTimeFormatOptions): string {
  return fromKey(key).toLocaleDateString("en-IN", opts);
}

export const fmtShort = (key: DayKey) => fmt(key, { day: "numeric", month: "short" });
export const fmtLong = (key: DayKey) =>
  fmt(key, { weekday: "long", day: "numeric", month: "long" });

/** All the day keys needed to draw a month grid, padded to whole weeks (Mon first). */
export function monthGrid(year: number, month: number): { key: DayKey; inMonth: boolean }[] {
  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7; // Monday = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const total = Math.ceil((lead + daysInMonth) / 7) * 7;
  const cells: { key: DayKey; inMonth: boolean }[] = [];
  for (let i = 0; i < total; i++) {
    const d = new Date(year, month, 1 - lead + i);
    cells.push({ key: toKey(d), inMonth: d.getMonth() === month });
  }
  return cells;
}

export function greeting(now = new Date()): string {
  const h = now.getHours();
  if (h < 5) return "Up late";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Good night";
}
