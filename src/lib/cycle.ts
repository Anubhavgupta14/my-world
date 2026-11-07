import { addDays, diffDays, type DayKey } from "./dates";

/* ============================================================
   Types
   ============================================================ */

export interface Period {
  start: DayKey;
  /** Last day of bleeding. Missing = still going / not marked yet. */
  end?: DayKey;
}

/** Every mood she can log. Period-time and everyday moods share one list. */
export const MOODS = {
  cramps: { emoji: "😣", label: "Cramps" },
  bloated: { emoji: "🎈", label: "Bloated" },
  moody: { emoji: "🌧️", label: "Moody" },
  tired: { emoji: "😴", label: "Tired" },
  cravings: { emoji: "🍫", label: "Cravings" },
  great: { emoji: "🌈", label: "Great" },
  happy: { emoji: "😊", label: "Happy" },
  loved: { emoji: "🥰", label: "Loved" },
  energetic: { emoji: "⚡", label: "Energetic" },
  stressed: { emoji: "😵‍💫", label: "Stressed" },
  missing_him: { emoji: "🥺", label: "Missing him" },
} as const;

export type MoodId = keyof typeof MOODS;
export const MOOD_IDS = Object.keys(MOODS) as MoodId[];

/** Shown while she's on her period. */
export const PERIOD_MOODS: MoodId[] = ["cramps", "moody", "tired", "cravings", "bloated", "great"];
/** Shown on every other day: nothing period-related. */
export const DAY_MOODS: MoodId[] = ["happy", "loved", "energetic", "tired", "stressed", "missing_him", "cravings", "moody"];

export interface DayLog {
  /** Numeric Pain Rating Scale, 0–10. */
  pain?: number;
  moods?: MoodId[];
}

export interface Settings {
  herName: string;
  partnerName: string;
  partnerPhone: string;
  cycleLength: number;
  periodLength: number;
}

export interface AppState {
  version: 1;
  settings: Settings;
  /** Sorted oldest → newest. */
  periods: Period[];
  logs: Record<DayKey, DayLog>;
  treatsOpened: number;
  bestCrushScore: number;
}

export type PhaseId = "period" | "follicular" | "fertile" | "ovulation" | "luteal" | "late";

export interface PhaseMeta {
  id: PhaseId;
  /** The fun name she sees. */
  name: string;
  /** The real name, for when she wants to be a doctor about it. */
  clinical: string;
  emoji: string;
  /** CSS colour token. */
  color: string;
  blurb: string;
}

export const PHASES: Record<PhaseId, PhaseMeta> = {
  period: {
    id: "period",
    name: "Cozy Season",
    clinical: "Menstrual phase",
    emoji: "🌙",
    color: "var(--berry)",
    blurb: "Energy dips, cramps may visit. Warmth, rest and snacks are medically approved.",
  },
  follicular: {
    id: "follicular",
    name: "Glow-up Era",
    clinical: "Follicular phase",
    emoji: "🌱",
    color: "var(--mint)",
    blurb: "Energy climbing back. Great days for workouts, plans and judging strangers' posture.",
  },
  fertile: {
    id: "fertile",
    name: "Main Character Energy",
    clinical: "Fertile window",
    emoji: "✨",
    color: "var(--sun)",
    blurb: "Confidence high, skin glowing. The mirror is legally required to compliment you.",
  },
  ovulation: {
    id: "ovulation",
    name: "Peak Sparkle Day",
    clinical: "Predicted ovulation",
    emoji: "🌟",
    color: "var(--sun)",
    blurb: "The brightest day of the cycle. Main character, director and producer.",
  },
  luteal: {
    id: "luteal",
    name: "Snack Era",
    clinical: "Luteal phase",
    emoji: "🍫",
    color: "var(--lilac)",
    blurb: "Cravings and feelings get louder. Be extra soft with yourself; snacks have zero calories now.",
  },
  late: {
    id: "late",
    name: "Fashionably Late",
    clinical: "Period later than predicted",
    emoji: "⏳",
    color: "var(--peach)",
    blurb: "Stress, sleep and travel can all shift a cycle. If it's very late, check in with a doctor you trust.",
  },
};

/* ============================================================
   Predictions
   ============================================================ */

export interface CycleInfo {
  cycleStart: DayKey;
  /** 1-based day of the current cycle. */
  day: number;
  cycleLength: number;
  phase: PhaseMeta;
  onPeriod: boolean;
  /** Day of the period (1-based) when on period. */
  periodDay: number;
  periodEnd: DayKey;
  /** Whether she marked the end herself (vs. the default period length). */
  endLogged: boolean;
  nextStart: DayKey;
  daysUntilNext: number;
  ovulation: DayKey;
  fertileStart: DayKey;
  fertileEnd: DayKey;
  /** Where each phase starts/ends in day numbers, for drawing the ring. */
  segments: { phase: PhaseId; from: number; to: number }[];
}

export function lastPeriodOnOrBefore(periods: Period[], day: DayKey): Period | undefined {
  for (let i = periods.length - 1; i >= 0; i--) {
    if (periods[i].start <= day) return periods[i];
  }
  return undefined;
}

export function periodEndOf(p: Period, periodLength: number): DayKey {
  return p.end ?? addDays(p.start, periodLength - 1);
}

/** Ovulation is ~14 days before the next period (the luteal phase is the steady one). */
function ovulationFor(nextStart: DayKey): DayKey {
  return addDays(nextStart, -14);
}

export function getCycleInfo(state: AppState, today: DayKey): CycleInfo | null {
  const { cycleLength, periodLength } = state.settings;
  const last = lastPeriodOnOrBefore(state.periods, today);
  if (!last) return null;

  const day = diffDays(today, last.start) + 1;
  const periodEnd = periodEndOf(last, periodLength);
  const onPeriod = today <= periodEnd;
  const nextStart = addDays(last.start, cycleLength);
  const ovulation = ovulationFor(nextStart);
  const fertileStart = addDays(ovulation, -5);
  const fertileEnd = addDays(ovulation, 1);

  let phase: PhaseId;
  if (onPeriod) phase = "period";
  else if (today === ovulation) phase = "ovulation";
  else if (today >= fertileStart && today <= fertileEnd) phase = "fertile";
  else if (today < fertileStart) phase = "follicular";
  else if (today < nextStart) phase = "luteal";
  else phase = "late";

  const pLen = diffDays(periodEnd, last.start) + 1;
  const fFrom = diffDays(fertileStart, last.start) + 1;
  const fTo = diffDays(fertileEnd, last.start) + 1;

  return {
    cycleStart: last.start,
    day,
    cycleLength,
    phase: PHASES[phase],
    onPeriod,
    periodDay: day,
    periodEnd,
    endLogged: Boolean(last.end),
    nextStart,
    daysUntilNext: diffDays(nextStart, today),
    ovulation,
    fertileStart,
    fertileEnd,
    segments: [
      { phase: "period", from: 1, to: pLen },
      { phase: "follicular", from: pLen + 1, to: fFrom - 1 },
      { phase: "fertile", from: fFrom, to: fTo },
      { phase: "luteal", from: fTo + 1, to: cycleLength },
    ].filter((s) => s.to >= s.from) as CycleInfo["segments"],
  };
}

export interface DayMark {
  period?: "logged" | "predicted";
  fertile?: boolean;
  ovulation?: boolean;
}

/**
 * Everything the calendar needs to colour a range of days: logged periods,
 * plus predicted periods / fertile windows for the next year.
 */
export function markDays(state: AppState, from: DayKey, to: DayKey, today: DayKey): Map<DayKey, DayMark> {
  const marks = new Map<DayKey, DayMark>();
  const { cycleLength, periodLength } = state.settings;
  const put = (k: DayKey, m: Partial<DayMark>) => {
    if (k < from || k > to) return;
    marks.set(k, { ...marks.get(k), ...m });
  };
  const paintFertile = (nextStart: DayKey) => {
    const ov = ovulationFor(nextStart);
    for (let i = -5; i <= 1; i++) put(addDays(ov, i), { fertile: true });
    put(ov, { ovulation: true });
  };

  // Logged periods, and the fertile window inside each finished cycle.
  state.periods.forEach((p, i) => {
    const end = periodEndOf(p, periodLength);
    for (let k = p.start; k <= end; k = addDays(k, 1)) put(k, { period: "logged" });
    const next = state.periods[i + 1]?.start;
    if (next) paintFertile(next);
  });

  // Predictions from the latest period forward.
  const last = state.periods[state.periods.length - 1];
  if (!last) return marks;
  let start = addDays(last.start, cycleLength);
  paintFertile(start);
  // If she's late, the next prediction slides to today so it stays useful.
  if (start < today) start = today;
  for (let c = 0; c < 14 && start <= to; c++) {
    for (let d = 0; d < periodLength; d++) {
      const k = addDays(start, d);
      if (!marks.get(k)?.period) put(k, { period: "predicted" });
    }
    const next = addDays(start, cycleLength);
    paintFertile(next);
    start = next;
  }
  return marks;
}

export function averageCycleLength(periods: Period[]): number | null {
  const gaps: number[] = [];
  for (let i = 1; i < periods.length; i++) {
    const g = diffDays(periods[i].start, periods[i - 1].start);
    if (g >= 15 && g <= 60) gaps.push(g);
  }
  if (!gaps.length) return null;
  return Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length);
}
