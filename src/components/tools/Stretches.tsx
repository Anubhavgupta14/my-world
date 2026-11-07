import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useEffect, useRef, useState } from "react";
import type { Settings } from "@/lib/cycle";
import { buzz, burst } from "@/lib/fx";
import { STRETCHES } from "@/lib/stretches";
import { ChevronLeft, ChevronRight, PlayIcon } from "../icons";
import { Pose } from "../illustrations";

/** A prescription pad she wrote for herself, plus a guided session with a breathing guide. */
export function Stretches({ settings }: { settings: Settings }) {
  const [active, setActive] = useState<number | null>(null);
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div className="flex flex-col items-center py-8 text-center">
        <span className="text-6xl">🏅</span>
        <p className="mt-4 font-display text-2xl font-semibold">Session complete!</p>
        <p className="mt-2 max-w-[300px] text-ink-soft">
          Patient compliance: excellent (for once). Recommended follow-up: blanket, snacks, and a call with{" "}
          {settings.partnerName}.
        </p>
        <button className="btn btn-primary mt-6" onClick={() => setDone(false)}>
          Back to the Rx
        </button>
      </div>
    );
  }

  if (active !== null) {
    return (
      <Session
        index={active}
        onIndex={setActive}
        onExit={() => setActive(null)}
        onFinish={() => {
          setActive(null);
          setDone(true);
        }}
      />
    );
  }

  return (
    <div className="pb-4">
      {/* Prescription pad */}
      <div className="card relative overflow-hidden p-5">
        <div className="absolute top-0 right-0 h-full w-2 bg-[repeating-linear-gradient(180deg,var(--mint)_0_10px,transparent_10px_18px)] opacity-60" />
        <div className="flex items-start justify-between">
          <span className="font-display text-5xl leading-none font-bold text-mint italic">Rx</span>
          <span className="rounded-full bg-mint-soft px-3 py-1 text-xs font-bold text-mint">Cramp Protocol</span>
        </div>
        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
          <dt className="text-ink-soft">Patient</dt>
          <dd className="font-semibold">{settings.herName}</dd>
          <dt className="text-ink-soft">Physio</dt>
          <dd className="font-semibold">{settings.herName} (yes, you)</dd>
          <dt className="text-ink-soft">Referred by</dt>
          <dd className="font-semibold">{settings.partnerName}, worried boyfriend</dd>
          <dt className="text-ink-soft">Dosage</dt>
          <dd className="font-semibold">{STRETCHES.length} stretches · slow breaths · no heroics</dd>
        </dl>
        <p className="mt-4 font-hand text-xl text-ink-soft">
          “Do as you tell your patients, not as you do.” — {settings.partnerName}
        </p>
      </div>

      <button className="btn btn-primary mt-4 w-full" onClick={() => setActive(0)}>
        <PlayIcon width={18} height={18} /> Start guided session
      </button>

      <div className="mt-5 space-y-3">
        {STRETCHES.map((s, i) => (
          <button key={s.id} onClick={() => setActive(i)} className="card flex w-full items-center gap-4 p-3.5 text-left">
            <span className="grid h-16 w-20 shrink-0 place-items-center rounded-2xl bg-mint-soft text-mint">
              <Pose pose={s.pose} className="h-12 w-16" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline justify-between gap-2">
                <span className="font-display text-lg font-semibold">{s.name}</span>
                <span className="text-xs font-bold text-ink-soft">{s.hold}s</span>
              </span>
              <span className="mt-0.5 block text-xs leading-snug text-ink-soft">{s.note}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Session({
  index,
  onIndex,
  onExit,
  onFinish,
}: {
  index: number;
  onIndex: (i: number) => void;
  onExit: () => void;
  onFinish: () => void;
}) {
  const s = STRETCHES[index];
  const root = useRef<HTMLDivElement>(null);
  const [left, setLeft] = useState(s.hold);
  const [paused, setPaused] = useState(false);
  const [breath, setBreath] = useState<"in" | "out">("in");

  // Reset the timer whenever the stretch changes.
  const [shown, setShown] = useState(index);
  if (shown !== index) {
    setShown(index);
    setLeft(s.hold);
    setPaused(false);
  }

  useEffect(() => {
    if (paused || left <= 0) return;
    const id = window.setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => window.clearTimeout(id);
  }, [left, paused]);

  useEffect(() => {
    if (left === 0) buzz([30, 80, 30]);
  }, [left]);

  // Breathing guide: in for 4s, out for 6s.
  useGSAP(
    () => {
      const tl = gsap.timeline({ repeat: -1, paused });
      tl.add(() => setBreath("in"))
        .to(".breath", { scale: 1, duration: 4, ease: "sine.inOut" })
        .add(() => setBreath("out"))
        .to(".breath", { scale: 0.62, duration: 6, ease: "sine.inOut" });
      gsap.from(".pose-card", { y: 30, opacity: 0, duration: 0.5, ease: "power3.out" });
    },
    { scope: root, dependencies: [index, paused] },
  );

  const next = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (index === STRETCHES.length - 1) {
      burst(e.currentTarget, ["🏅", "💗", "✨", "🌸"], 18);
      onFinish();
    } else onIndex(index + 1);
  };

  return (
    <div ref={root} className="pb-4">
      <div className="flex items-center justify-between">
        <button onClick={onExit} className="text-sm font-semibold text-ink-soft">
          ← All stretches
        </button>
        <span className="text-xs font-bold text-ink-soft">
          {index + 1} / {STRETCHES.length}
        </span>
      </div>
      <div className="mt-2 flex gap-1">
        {STRETCHES.map((x, i) => (
          <span key={x.id} className={`h-1.5 flex-1 rounded-full ${i <= index ? "bg-mint" : "bg-line"}`} />
        ))}
      </div>

      <div className="pose-card card mt-5 flex flex-col items-center p-6 text-center">
        <div className="relative grid h-52 w-52 place-items-center">
          <div className="breath absolute inset-0 scale-[0.62] rounded-full bg-mint-soft" />
          <div className="absolute inset-6 rounded-full border-2 border-dashed border-mint/40" />
          <Pose pose={s.pose} className="relative h-24 w-36 text-mint" />
        </div>
        <p className="font-hand text-2xl text-mint">{paused ? "paused" : breath === "in" ? "breathe in…" : "and out…"}</p>
        <h3 className="mt-1 font-display text-2xl font-semibold">{s.name}</h3>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">{s.how}</p>
        <p className="mt-4 font-display text-5xl font-semibold tabular-nums text-accent">
          {left > 0 ? `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}` : "✓"}
        </p>
        <p className="mt-2 text-xs text-ink-soft italic">Physio note: {s.note}</p>
      </div>

      <div className="mt-4 grid grid-cols-[auto_1fr_auto] gap-3">
        <button
          className="btn btn-ghost aspect-square !p-0 w-14"
          onClick={() => onIndex(Math.max(0, index - 1))}
          disabled={index === 0}
          aria-label="Previous stretch"
        >
          <ChevronLeft />
        </button>
        <button className="btn btn-soft" onClick={() => setPaused((p) => !p)} disabled={left === 0}>
          {paused ? "Resume" : "Pause"}
        </button>
        <button className="btn btn-primary aspect-square !p-0 w-14" onClick={next} aria-label="Next stretch">
          <ChevronRight />
        </button>
      </div>
    </div>
  );
}
