import { useEffect, useEffectEvent, useRef, useState } from "react";
import { BP_READOUT } from "@/lib/content";
import { sound } from "@/lib/sound";
import { ReplayIcon } from "../icons";
import { ChapterHeader, ChapterNav } from "../ui";
import { useUniverse } from "../universe-context";

const TARGET = 180; // mmHg needed before the "software" activates
const MAX_DIAL = 260;

type Phase = "pumping" | "analyzing" | "done";

function Dial({ pressure }: { pressure: number }) {
  const angle = -120 + (pressure / MAX_DIAL) * 240;
  return (
    <svg className="bp-dial" viewBox="0 0 200 200" aria-hidden>
      <circle cx="100" cy="100" r="94" className="bp-dial-rim" />
      <circle cx="100" cy="100" r="84" className="bp-dial-face" />
      {Array.from({ length: 27 }, (_, i) => {
        const a = -120 + (i * 240) / 26;
        const major = i % 5 === 0;
        return (
          <line
            key={i}
            x1="100"
            y1={major ? 24 : 28}
            x2="100"
            y2="34"
            className={major ? "bp-tick major" : "bp-tick"}
            transform={`rotate(${a} 100 100)`}
          />
        );
      })}
      {[0, 50, 100, 150, 200, 250].map((v) => {
        const a = ((-120 + (v / MAX_DIAL) * 240) * Math.PI) / 180;
        return (
          <text key={v} x={100 + Math.sin(a) * 52} y={104 - Math.cos(a) * 52} className="bp-num" textAnchor="middle">
            {v}
          </text>
        );
      })}
      <text x="100" y="140" className="bp-unit" textAnchor="middle">
        mmHg
      </text>
      <g style={{ transform: `rotate(${angle}deg)`, transformOrigin: "100px 100px" }} className="bp-needle">
        <line x1="100" y1="112" x2="100" y2="30" />
      </g>
      <circle cx="100" cy="100" r="7" className="bp-hub" />
    </svg>
  );
}

export default function CheckUp() {
  const { celebrate, completeGame, reduced } = useUniverse();
  const [pressure, setPressure] = useState(0);
  const [holding, setHolding] = useState(false);
  const [phase, setPhase] = useState<Phase>("pumping");
  const [lines, setLines] = useState(0);
  const pressureRef = useRef(0);
  const lastPuff = useRef(0);

  function pump(amount: number) {
    if (phase !== "pumping") return;
    const next = Math.min(TARGET, pressureRef.current + amount);
    pressureRef.current = next;
    setPressure(next);
    const now = performance.now();
    if (now - lastPuff.current > 220) {
      lastPuff.current = now;
      sound.play("flip");
    }
    if (next >= TARGET) {
      setHolding(false);
      setPhase("analyzing");
      sound.play("chime");
    }
  }

  // Keep pumping while the bulb is held down.
  useEffect(() => {
    if (!holding || phase !== "pumping") return;
    const t = setInterval(() => {
      const next = Math.min(TARGET, pressureRef.current + 3);
      pressureRef.current = next;
      setPressure(next);
      if (next >= TARGET) {
        setHolding(false);
        setPhase("analyzing");
        sound.play("chime");
      }
    }, 55);
    return () => clearInterval(t);
  }, [holding, phase]);

  const onReportDone = useEffectEvent(() => {
    setPhase("done");
    completeGame("checkup");
    celebrate({ mode: "rain", count: 26 });
  });

  // HeartOS prints its report line by line.
  useEffect(() => {
    if (phase !== "analyzing") return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    BP_READOUT.forEach((_, i) => {
      timers.push(
        setTimeout(
          () => {
            setLines(i + 1);
            sound.play(i === 5 ? "success" : "tap");
            if (i === BP_READOUT.length - 1) onReportDone();
          },
          reduced ? 0 : 700 + i * (i >= 4 ? 1100 : 650),
        ),
      );
    });
    return () => timers.forEach(clearTimeout);
  }, [phase, reduced]);

  function reset() {
    pressureRef.current = 0;
    setPressure(0);
    setLines(0);
    setPhase("pumping");
  }

  const pct = Math.round((pressure / TARGET) * 100);

  return (
    <div className="scene-inner">
      <ChapterHeader
        title="A Quick Check-up"
        subtitle="Doctor, your patient — the Engineer — says his heart has been acting a little strange lately. Could you check his blood pressure? 🩺"
      />

      <section className="glass bp-card" aria-label="Blood pressure monitor">
        <div className="bp-device">
          <Dial pressure={pressure} />

          <div className="bp-pump">
            <svg className="bp-tube" viewBox="0 0 60 120" aria-hidden>
              <path d="M30 0 C 30 40, 6 50, 30 120" />
            </svg>
            <button
              type="button"
              className={`bp-bulb ${holding ? "squeezed" : ""}`}
              disabled={phase !== "pumping"}
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture?.(event.pointerId);
                pump(10);
                setHolding(true);
              }}
              onPointerUp={() => setHolding(false)}
              onPointerCancel={() => setHolding(false)}
              onLostPointerCapture={() => setHolding(false)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  pump(15);
                }
              }}
              onContextMenu={(event) => event.preventDefault()}
              aria-label={`Squeeze the pump bulb. Pressure ${pressure} of ${TARGET}.`}
            >
              <span className="bp-bulb-shine" aria-hidden />
            </button>
          </div>
        </div>

        {phase === "pumping" ? (
          <div className="bp-status">
            <div
              className="lab-bar"
              role="progressbar"
              aria-label="Cuff pressure"
              aria-valuemin={0}
              aria-valuemax={TARGET}
              aria-valuenow={pressure}
            >
              <span style={{ width: `${pct}%` }} />
            </div>
            <p className="bp-hint">
              {pressure === 0
                ? "Press & hold the pink bulb to pump 👆"
                : pressure < TARGET * 0.6
                  ? `Keep squeezing… ${pressure} mmHg`
                  : `Almost there… ${pressure} mmHg 💪`}
            </p>
          </div>
        ) : (
          <div className="bp-screen" role="log" aria-live="polite">
            <p className="bp-screen-title">
              <span className="rec-dot" aria-hidden /> HeartOS · diagnosis
            </p>
            {BP_READOUT.slice(0, lines).map((line) => (
              <p key={line.text} className={`bp-line ${line.tone ?? ""}`}>
                <span aria-hidden>›</span> {line.text}
              </p>
            ))}
            {phase === "analyzing" && <span className="caret" aria-hidden />}
          </div>
        )}
      </section>

      <ChapterNav nextLabel="His full report is ready 📋" ready={phase === "done"}>
        {phase === "done" && (
          <button type="button" className="btn btn-ghost btn-icon" onClick={reset} aria-label="Check again" title="Check again">
            <ReplayIcon />
          </button>
        )}
      </ChapterNav>
    </div>
  );
}
