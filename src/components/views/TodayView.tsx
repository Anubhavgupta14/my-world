import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useRef, useState } from "react";
import { getCheer } from "@/lib/cheer";
import { DAY_MOODS, MOODS, PERIOD_MOODS, type AppState, type CycleInfo, type MoodId } from "@/lib/cycle";
import { addDays, diffDays, fmtLong, fmtShort, greeting, type DayKey } from "@/lib/dates";
import { buzz, burst } from "@/lib/fx";
import { actions } from "@/lib/store";
import { countdown, upcoming, useHolidays } from "@/lib/upcoming";
import { CycleRing } from "../CycleRing";
import { RefreshIcon, SparkleIcon } from "../icons";
import { SectionTitle, TOOLS, type ToolId } from "../ui";

const PAIN_FACES = ["😌", "🙂", "🙂", "😐", "😕", "😟", "😣", "😖", "😫", "😭", "🆘"];
const painLabel = (p: number) => (p === 0 ? "No pain" : p <= 3 ? "Mild" : p <= 6 ? "Moderate" : "Severe");

type Rec = ToolId | "jarvis";

function recommend(pain: number | undefined, moods: MoodId[], onPeriod: boolean): Rec[] {
  const out = new Set<Rec>();
  if (!onPeriod) {
    // Everyday suggestions: nothing cycle-related.
    if (moods.includes("missing_him") || moods.includes("stressed")) out.add("call");
    if (moods.some((m) => m === "happy" || m === "loved" || m === "energetic")) out.add("jarvis");
    // No hot water bag, stretches or Cramp Crusher here: those are period tools.
    if (moods.some((m) => m === "cravings" || m === "moody" || m === "stressed" || m === "tired")) out.add("chocolate");
    return [...out].slice(0, 3);
  }
  if (pain !== undefined) {
    if (pain >= 7) ["call", "hotbag", "stretch"].forEach((t) => out.add(t as ToolId));
    else if (pain >= 4) ["hotbag", "stretch", "chocolate"].forEach((t) => out.add(t as ToolId));
    else if (pain >= 1) ["chocolate", "stretch"].forEach((t) => out.add(t as ToolId));
    else ["chocolate", "game"].forEach((t) => out.add(t as ToolId));
  }
  if (moods.includes("cravings")) out.add("chocolate");
  if (moods.includes("moody")) out.add("game");
  if (moods.includes("cramps")) out.add("hotbag");
  if (moods.includes("tired")) out.add("call");
  return [...out].slice(0, 3);
}

export function TodayView({
  state,
  info,
  today,
  openTool,
  openJarvis,
}: {
  state: AppState;
  info: CycleInfo | null;
  today: DayKey;
  openTool: (t: ToolId) => void;
  openJarvis: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const { settings } = state;
  const log = state.logs[today] ?? {};
  const moods = log.moods ?? [];
  const phaseId = info?.phase.id ?? "follicular";
  const onPeriod = Boolean(info?.onPeriod);
  // Off-period the check-in is about her day, so pain doesn't feed the advice.
  const painForRx = onPeriod ? log.pain : undefined;
  const holidays = useHolidays();
  const events = upcoming(info, holidays, today);

  const [dose, setDose] = useState(() =>
    getCheer({ phase: phaseId, herName: settings.herName, partnerName: settings.partnerName }),
  );
  const [rx, setRx] = useState<string | null>(() =>
    painForRx !== undefined || moods.length
      ? getCheer({ phase: phaseId, pain: painForRx, moods, ...settings })
      : null,
  );

  useGSAP(
    () => {
      gsap.from(".reveal", { y: 28, opacity: 0, duration: 0.7, stagger: 0.07, ease: "power3.out", delay: 0.1 });
    },
    { scope: root },
  );

  const { contextSafe } = useGSAP({ scope: root });

  const newDose = contextSafe(() => {
    buzz(8);
    gsap.to(".dose-text", {
      opacity: 0,
      y: -8,
      duration: 0.2,
      onComplete: () => {
        setDose(getCheer({ phase: phaseId, herName: settings.herName, partnerName: settings.partnerName }));
        gsap.fromTo(".dose-text", { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.35, ease: "power2.out" });
      },
    });
    gsap.fromTo(".dose-spin", { rotation: 0 }, { rotation: 360, duration: 0.6, ease: "power2.out" });
  });

  const refreshRx = (pain: number | undefined, nextMoods: MoodId[]) => {
    setRx(getCheer({ phase: phaseId, pain, moods: nextMoods, ...settings }));
  };

  const onPain = (p: number) => {
    const prevBand = log.pain === undefined ? -1 : painLabel(log.pain);
    actions.logDay(today, { pain: p });
    if (painLabel(p) !== prevBand) refreshRx(p, moods);
    if (p !== log.pain) buzz(4);
  };

  const toggleMood = (m: MoodId) => {
    buzz(8);
    const next = moods.includes(m) ? moods.filter((x) => x !== m) : [...moods, m];
    actions.logDay(today, { moods: next });
    refreshRx(painForRx, next);
  };

  const startPeriod = (e: React.MouseEvent<HTMLButtonElement>) => {
    buzz([20, 40, 20]);
    burst(e.currentTarget, ["🌙", "💗", "🫶"], 12);
    actions.startPeriod(today);
  };

  const endPeriod = (e: React.MouseEvent<HTMLButtonElement>) => {
    buzz([20, 40, 20]);
    burst(e.currentTarget, ["🎉", "✨", "🌈", "💃"], 18);
    // "Ended" means today is already period-free, so yesterday was the last day.
    actions.endPeriod(info && today > info.cycleStart ? addDays(today, -1) : today);
  };

  const extendPeriod = () => {
    buzz(10);
    actions.endPeriod(today);
  };

  const recs = recommend(painForRx, moods, onPeriod);
  const moodChoices = onPeriod ? PERIOD_MOODS : DAY_MOODS;
  const showStart = !info || (!info.onPeriod && info.daysUntilNext <= 5);
  // The day right after the last period day: offer "still going" (also works as an undo).
  const canExtend = info && !info.onPeriod && diffDays(today, info.periodEnd) === 1;

  return (
    <div ref={root} className="space-y-6 pb-6">
      {/* Header */}
      <header className="reveal pt-2">
        <p className="text-sm font-semibold text-ink-soft">{fmtLong(today)}</p>
        <h1 className="font-display text-[28px] leading-tight font-semibold">
          {greeting()}, <span className="text-accent">{settings.herName}</span>
        </h1>
      </header>

      {/* Ring */}
      {info ? (
        <section className="reveal card px-4 pt-6 pb-5">
          <CycleRing info={info} />
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {info.onPeriod ? (
              <button onClick={endPeriod} className="btn btn-soft">
                🎉 My period is over
              </button>
            ) : canExtend ? (
              <button onClick={extendPeriod} className="btn btn-soft">
                🥲 Still on my period
              </button>
            ) : showStart ? (
              <button onClick={startPeriod} className="btn btn-primary">
                🌙 My period started today
              </button>
            ) : (
              <button onClick={startPeriod} className="text-sm font-semibold text-ink-soft underline decoration-dotted underline-offset-4">
                Period came early? Log it
              </button>
            )}
          </div>
        </section>
      ) : (
        <FirstPeriod today={today} />
      )}

      {/* Cozy mode */}
      {info?.onPeriod && (
        <section className="reveal overflow-hidden rounded-[28px] bg-gradient-to-br from-berry to-[#ff7fa2] p-5 text-white shadow-[var(--shadow-pop)]">
          <p className="text-xs font-bold tracking-[0.14em] uppercase opacity-80">Cozy mode is on</p>
          <p className="mt-1 font-display text-2xl leading-tight font-semibold">
            Day {info.periodDay}. You&apos;re doing amazing, sweetheart. 🫶
          </p>
          <p className="mt-1 text-sm opacity-90">Comfort kit, unlocked and on standby:</p>
          <div className="no-scrollbar -mx-5 mt-4 flex gap-3 overflow-x-auto px-5 pb-1">
            {(Object.keys(TOOLS) as ToolId[]).map((t) => (
              <button
                key={t}
                onClick={() => openTool(t)}
                className="flex w-[84px] shrink-0 flex-col items-center gap-1.5 rounded-3xl bg-white/20 px-2 py-3 backdrop-blur active:scale-95"
              >
                <span className="text-3xl">{TOOLS[t].emoji}</span>
                <span className="text-[11px] leading-tight font-semibold">{TOOLS[t].title}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Daily dose */}
      <section className="reveal card relative overflow-hidden p-5">
        <SparkleIcon className="absolute -top-3 -right-3 h-20 w-20 text-accent opacity-10" />
        <div className="flex items-center justify-between">
          <p className="eyebrow flex items-center gap-1.5">
            <SparkleIcon width={14} height={14} className="text-accent" /> Daily dose of love
          </p>
          <button onClick={newDose} aria-label="Another one" className="grid h-9 w-9 place-items-center rounded-full bg-accent-soft text-accent">
            <RefreshIcon className="dose-spin" width={18} height={18} />
          </button>
        </div>
        <p className="dose-text mt-3 font-hand text-[25px] leading-snug">{dose}</p>
      </section>

      {/* Check-in: period-aware only while she's on her period */}
      <section className="reveal card p-5">
        <SectionTitle>{onPeriod ? "How are you feeling?" : "How's your day going?"}</SectionTitle>
        {onPeriod && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">
                Pain today{" "}
                <span className="ml-1 rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-bold tracking-wider text-accent uppercase">
                  NPRS
                </span>
              </p>
              <p className="font-display text-lg font-semibold">
                {log.pain === undefined ? (
                  <span className="text-ink-soft">slide me →</span>
                ) : (
                  <>
                    {PAIN_FACES[log.pain]} {log.pain}/10 · {painLabel(log.pain)}
                  </>
                )}
              </p>
            </div>
            <input
              type="range"
              min={0}
              max={10}
              step={1}
              value={log.pain ?? 0}
              onChange={(e) => onPain(Number(e.target.value))}
              className={`nprs mt-4 ${log.pain === undefined ? "opacity-60" : ""}`}
              aria-label="Pain on a scale from 0 to 10"
            />
            <div className="mt-1.5 flex justify-between text-[11px] font-semibold text-ink-soft">
              <span>0 · none</span>
              <span>5</span>
              <span>10 · worst</span>
            </div>
            <p className="mt-1 text-[11px] text-ink-soft italic">You use this scale on patients. Your turn now.</p>
          </>
        )}
        {!onPeriod && <p className="-mt-1 text-sm text-ink-soft">Pick whatever fits. As many as you like.</p>}

        <div className={`${onPeriod ? "mt-5" : "mt-4"} flex flex-wrap gap-2`}>
          {moodChoices.map((id) => (
            <button key={id} className="chip" aria-pressed={moods.includes(id)} onClick={() => toggleMood(id)}>
              <span>{MOODS[id].emoji}</span> {MOODS[id].label}
            </button>
          ))}
        </div>

        {rx && (
          <div className="mt-5 rounded-3xl bg-accent-soft p-4">
            <p className="eyebrow !text-accent">The Engineer&apos;s prescription</p>
            <p className="mt-1.5 text-[15px] leading-snug font-medium">{rx}</p>
            {recs.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {recs.map((t) =>
                  t === "jarvis" ? (
                    <button key={t} onClick={openJarvis} className="chip !bg-white">
                      ✨ Plan a date with Jarvis
                    </button>
                  ) : (
                    <button key={t} onClick={() => openTool(t)} className="chip !bg-white">
                      {TOOLS[t].emoji} {t === "call" ? `Call ${settings.partnerName}` : TOOLS[t].title}
                    </button>
                  ),
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Coming up: next period, birthdays, long weekends */}
      <section className="reveal">
        <SectionTitle>Coming up</SectionTitle>
        <div className="card divide-y divide-line px-4">
          {events.map((ev) => {
            const soon = countdown(ev.date, today, ev.end);
            return (
              <div key={ev.key} className="flex items-center gap-3 py-3.5">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-xl" style={{ background: ev.tint }}>
                  {ev.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold leading-tight">{ev.title}</p>
                  <p className="truncate text-xs text-ink-soft">{ev.sub}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-display text-[15px] font-semibold">
                    {fmtShort(ev.date)}
                    {ev.end && ev.end !== ev.date ? `–${fmtShort(ev.end).split(" ")[0]}` : ""}
                  </p>
                  <p className={`text-[11px] font-bold ${/Today|Tomorrow|On now/.test(soon) ? "text-accent" : "text-ink-soft"}`}>
                    {soon}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Phase explainer: only while she's on her period */}
      {info && onPeriod && (
        <section className="reveal card p-5">
          <p className="eyebrow">What&apos;s happening · {info.phase.clinical}</p>
          <p className="mt-2 font-display text-xl font-semibold">
            {info.phase.emoji} {info.phase.name}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">{info.phase.blurb}</p>
        </section>
      )}
    </div>
  );
}

/** Shown until the first period is logged: one question, then the ring lights up. */
function FirstPeriod({ today }: { today: DayKey }) {
  const [day, setDay] = useState<DayKey>(today);
  const quick = [0, 1, 2, 3, 5, 7];

  const save = (e: React.MouseEvent<HTMLButtonElement>) => {
    buzz([20, 40, 20]);
    burst(e.currentTarget, ["🌙", "💗", "✨"], 14);
    actions.startPeriod(day);
  };

  return (
    <section className="reveal card p-6 text-center">
      <p className="float inline-block text-5xl">🌙</p>
      <p className="mt-3 font-display text-xl font-semibold">When did your last period start?</p>
      <p className="mt-1 text-sm text-ink-soft">A rough guess is fine. You can fix it from the Calendar.</p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {quick.map((n) => {
          const k = addDays(today, -n);
          return (
            <button key={n} className="chip" aria-pressed={day === k} onClick={() => setDay(k)}>
              {n === 0 ? "Today" : n === 1 ? "Yesterday" : `${n} days ago`}
            </button>
          );
        })}
      </div>
      <input
        type="date"
        className="date-input mt-4 text-center"
        max={today}
        min={addDays(today, -90)}
        value={day}
        onChange={(e) => e.target.value && setDay(e.target.value)}
        aria-label="Pick the start date"
      />
      <button onClick={save} className="btn btn-primary mt-4 w-full">
        Save · {fmtShort(day)}
      </button>
    </section>
  );
}
