import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useRef, useState } from "react";
import { MOODS, averageCycleLength, lastPeriodOnOrBefore, markDays, periodEndOf, type AppState, type CycleInfo } from "@/lib/cycle";
import { diffDays, fmt, fmtLong, fmtShort, fromKey, monthGrid, type DayKey } from "@/lib/dates";
import { buzz, burst } from "@/lib/fx";
import { actions } from "@/lib/store";
import { ChevronLeft, ChevronRight } from "../icons";
import { Sheet } from "../Sheet";
import { LIMITS } from "@/lib/config";
import { SectionTitle, Stepper } from "../ui";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

export function CalendarView({ state, info, today }: { state: AppState; info: CycleInfo | null; today: DayKey }) {
  const root = useRef<HTMLDivElement>(null);
  const t = fromKey(today);
  const [cursor, setCursor] = useState({ y: t.getFullYear(), m: t.getMonth() });
  const [dir, setDir] = useState(0);
  const [selected, setSelected] = useState<DayKey | null>(null);
  const swipe = useRef<number | null>(null);

  const cells = monthGrid(cursor.y, cursor.m);
  const marks = markDays(state, cells[0].key, cells[cells.length - 1].key, today);
  const monthLabel = new Date(cursor.y, cursor.m, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  useGSAP(
    () => {
      gsap.from(".cal-cell", {
        x: dir * 40,
        opacity: 0,
        duration: 0.45,
        stagger: { each: 0.008, from: dir < 0 ? "end" : "start" },
        ease: "power3.out",
      });
    },
    { scope: root, dependencies: [cursor.y, cursor.m] },
  );

  useGSAP(
    () => {
      gsap.from(".reveal", { y: 24, opacity: 0, duration: 0.6, stagger: 0.08, ease: "power3.out" });
    },
    { scope: root },
  );

  const shift = (d: number) => {
    buzz(6);
    setDir(d);
    setCursor(({ y, m }) => {
      const n = new Date(y, m + d, 1);
      return { y: n.getFullYear(), m: n.getMonth() };
    });
  };

  const avg = averageCycleLength(state.periods);
  const recent = [...state.periods].reverse().slice(0, 6);

  return (
    <div ref={root} className="space-y-6 pb-6">
      <header className="reveal pt-2">
        <p className="text-sm font-semibold text-ink-soft">Your cycle calendar</p>
        <h1 className="font-display text-[28px] leading-tight font-semibold">Calendar</h1>
      </header>

      <section
        className="reveal card p-4"
        onPointerDown={(e) => (swipe.current = e.clientX)}
        onPointerUp={(e) => {
          if (swipe.current === null) return;
          const dx = e.clientX - swipe.current;
          swipe.current = null;
          if (Math.abs(dx) > 60) shift(dx < 0 ? 1 : -1);
        }}
      >
        <div className="mb-3 flex items-center justify-between">
          <button onClick={() => shift(-1)} className="grid h-10 w-10 place-items-center rounded-full bg-bg" aria-label="Previous month">
            <ChevronLeft width={20} height={20} />
          </button>
          <button
            className="font-display text-xl font-semibold"
            onClick={() => {
              setDir(0);
              setCursor({ y: t.getFullYear(), m: t.getMonth() });
            }}
          >
            {monthLabel}
          </button>
          <button onClick={() => shift(1)} className="grid h-10 w-10 place-items-center rounded-full bg-bg" aria-label="Next month">
            <ChevronRight width={20} height={20} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1.5 text-center">
          {WEEKDAYS.map((d, i) => (
            <span key={i} className="pb-1 text-[11px] font-bold text-ink-soft">
              {d}
            </span>
          ))}
          {cells.map(({ key, inMonth }) => {
            const mk = marks.get(key);
            const cls = mk?.period === "logged"
              ? "cal-period-logged"
              : mk?.period === "predicted"
                ? "cal-period-predicted"
                : mk?.ovulation
                  ? "cal-ovulation"
                  : mk?.fertile
                    ? "cal-fertile"
                    : "";
            return (
              <button
                key={key}
                onClick={() => setSelected(key)}
                className={`cal-cell ${cls} ${key === today ? "cal-today" : ""} ${inMonth ? "" : "opacity-30"}`}
              >
                {fromKey(key).getDate()}
                {state.logs[key]?.pain !== undefined && (
                  <span className="absolute bottom-1 h-1 w-1 rounded-full bg-current opacity-70" />
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[11px] font-semibold text-ink-soft">
          <Legend className="cal-period-logged" label="Period" />
          <Legend className="cal-period-predicted" label="Predicted" />
          <Legend className="cal-fertile" label="Fertile" />
          <Legend className="cal-ovulation" label="Ovulation" />
        </div>
      </section>

      <section className="reveal grid grid-cols-2 gap-3">
        <div className="card p-4">
          <p className="eyebrow">Next period</p>
          <p className="mt-1 font-display text-2xl font-semibold text-berry">{info ? fmtShort(info.nextStart) : "—"}</p>
          <p className="text-xs text-ink-soft">
            {info ? (info.daysUntilNext >= 0 ? `in ${info.daysUntilNext} days` : `${-info.daysUntilNext} days late`) : "log a period first"}
          </p>
        </div>
        <div className="card p-4">
          <p className="eyebrow">Avg. cycle</p>
          <p className="mt-1 font-display text-2xl font-semibold text-lilac">{avg ?? state.settings.cycleLength} days</p>
          <p className="text-xs text-ink-soft">{avg ? `from ${state.periods.length} periods` : "using your setting"}</p>
        </div>
      </section>

      <section className="reveal card p-5">
        <SectionTitle>Your rhythm</SectionTitle>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col items-center gap-1">
            <p className="text-sm font-semibold text-ink-soft">Cycle length</p>
            <Stepper
              value={state.settings.cycleLength}
              {...LIMITS.cycleLength}
              unit="days"
              onChange={(v) => actions.updateSettings({ cycleLength: v })}
            />
          </div>
          <div className="flex flex-col items-center gap-1">
            <p className="text-sm font-semibold text-ink-soft">Period length</p>
            <Stepper
              value={state.settings.periodLength}
              {...LIMITS.periodLength}
              unit="days"
              onChange={(v) => actions.updateSettings({ periodLength: v })}
            />
          </div>
        </div>
        {avg && avg !== state.settings.cycleLength && (
          <button
            className="mt-3 w-full text-center text-xs font-semibold text-accent underline underline-offset-4"
            onClick={() => actions.updateSettings({ cycleLength: avg })}
          >
            Your logged average is {avg} days. Use that?
          </button>
        )}
      </section>

      {recent.length > 0 && (
        <section className="reveal">
          <SectionTitle>Recent periods</SectionTitle>
          <div className="card divide-y divide-line px-4">
            {recent.map((p) => {
              const idx = state.periods.indexOf(p);
              const next = state.periods[idx + 1];
              const len = diffDays(periodEndOf(p, state.settings.periodLength), p.start) + 1;
              return (
                <div key={p.start} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-semibold">{fmt(p.start, { day: "numeric", month: "short", year: "numeric" })}</p>
                    <p className="text-xs text-ink-soft">
                      {len} day{len === 1 ? "" : "s"}
                      {!p.end && " (estimated)"}
                    </p>
                  </div>
                  <span className="rounded-full bg-lilac-soft px-3 py-1 text-xs font-bold text-lilac">
                    {next ? `${diffDays(next.start, p.start)}-day cycle` : "current"}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <DaySheet day={selected} state={state} today={today} onClose={() => setSelected(null)} />
    </div>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-3.5 w-3.5 rounded-[5px] ${className}`} /> {label}
    </span>
  );
}

function DaySheet({ day, state, today, onClose }: { day: DayKey | null; state: AppState; today: DayKey; onClose: () => void }) {
  // Keep showing the last day while the sheet animates out.
  const [shown, setShown] = useState<DayKey | null>(day);
  if (day && day !== shown) setShown(day);
  const d = day ?? shown;

  let body = null;
  if (d) {
    const marks = markDays(state, d, d, today).get(d);
    const period = state.periods.find((p) => d >= p.start && d <= periodEndOf(p, state.settings.periodLength));
    const isStart = period?.start === d;
    // Allow extending a period by up to a week past its current end, no further.
    const prev = lastPeriodOnOrBefore(state.periods, d);
    const canEnd =
      !isStart &&
      (Boolean(period) ||
        (prev !== undefined &&
          diffDays(d, periodEndOf(prev, state.settings.periodLength)) <= 7 &&
          diffDays(d, prev.start) <= 14));
    const log = state.logs[d];
    const future = d > today;

    const status = period
      ? `Period day ${diffDays(d, period.start) + 1}${period.end ? "" : " (estimated)"}`
      : marks?.period === "predicted"
        ? "Predicted period 🌙"
        : marks?.ovulation
          ? "Predicted ovulation 🌟"
          : marks?.fertile
            ? "Fertile window ✨"
            : "A regular, lovely day";

    const act = (fn: () => void) => (e: React.MouseEvent<HTMLButtonElement>) => {
      buzz([15, 30, 15]);
      burst(e.currentTarget, ["💗", "✨", "🌙"], 10);
      fn();
      onClose();
    };

    body = (
      <div className="space-y-4">
        <div className="card p-4">
          <p className="eyebrow">Status</p>
          <p className="mt-1 font-display text-xl font-semibold">{status}</p>
          {log && (log.pain !== undefined || log.moods?.length) ? (
            <p className="mt-2 text-sm text-ink-soft">
              {log.pain !== undefined && `Pain ${log.pain}/10`}
              {log.pain !== undefined && log.moods?.length ? " · " : ""}
              {log.moods?.map((m) => (MOODS[m] ? `${MOODS[m].emoji} ${MOODS[m].label}` : m)).join(", ")}
            </p>
          ) : null}
        </div>

        {future ? (
          <p className="rounded-3xl bg-white p-4 text-center text-sm text-ink-soft">
            Can&apos;t log the future. Yet. {state.settings.partnerName} is working on it. 🛠️
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {!period && (
              <button className="btn btn-primary" onClick={act(() => actions.startPeriod(d))}>
                🌙 Period started this day
              </button>
            )}
            {canEnd && (
              <button className="btn btn-soft" onClick={act(() => actions.endPeriod(d))}>
                ✅ This was the last period day
              </button>
            )}
            {isStart && (
              <button
                className="btn btn-ghost !text-berry"
                onClick={() => {
                  actions.removePeriod(d);
                  onClose();
                }}
              >
                Remove this period
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <Sheet open={Boolean(day)} onClose={onClose} eyebrow="Day details" title={d ? fmtLong(d) : ""}>
      {body}
    </Sheet>
  );
}
