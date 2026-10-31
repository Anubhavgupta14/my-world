import { useEffect, useEffectEvent, useState } from "react";
import { REPORT } from "@/lib/content";
import { sound } from "@/lib/sound";
import { ChapterHeader, ChapterNav } from "../ui";
import { useUniverse } from "../universe-context";

export default function DoctorReport() {
  const { celebrate, completeGame, reduced } = useUniverse();
  const [running, setRunning] = useState(false);
  const [shown, setShown] = useState(0);
  const done = shown >= REPORT.length;

  const onFinished = useEffectEvent(() => {
    completeGame("report");
    sound.play("success");
    celebrate({ mode: "rain", count: 30 });
  });

  useEffect(() => {
    if (!running) return;
    const timers = REPORT.map((_, i) =>
      setTimeout(
        () => {
          setShown(i + 1);
          sound.play("tap");
          if (i === REPORT.length - 1) onFinished();
        },
        reduced ? 0 : 350 + i * 420,
      ),
    );
    return () => timers.forEach(clearTimeout);
  }, [running, reduced]);

  return (
    <div className="scene-inner">
      <ChapterHeader
        title="The Patient's Report"
        subtitle="Doctor, your patient's BP was high — so we ran a few more tests to find the cause. 📋"
      />

      <section className="report glass" aria-label="Lab report">
        <header className="report-head">
          <div>
            <p className="report-kicker">Lab Report · Cause of high BP</p>
            <p className="report-meta">
              Patient: <strong>the Engineer</strong> · Doctor on duty: <strong>Doctor</strong>
            </p>
            <p className="report-meta">Suspected cause: one very special girl 💗</p>
          </div>
          <span className="report-stamp" aria-hidden>
            🩺
          </span>
        </header>

        <ul className="report-rows">
          {REPORT.map((row, i) => (
            <li key={row.test} className={`report-row ${i < shown ? "in" : ""}`} aria-hidden={i >= shown}>
              <span className="report-emoji" aria-hidden>
                {row.emoji}
              </span>
              <span className="min-w-0 flex-1">
                <span className="report-test">{row.test}</span>
                <span className="report-result">{i < shown ? row.result : "…"}</span>
              </span>
              {i < shown && (
                <span className={`report-badge ${row.negative ? "neg" : ""}`}>
                  {row.negative ? "None ✓" : "Confirmed ✓"}
                </span>
              )}
            </li>
          ))}
        </ul>

        {!running && (
          <div className="report-run">
            <button
              type="button"
              className="btn btn-primary btn-lg btn-glow"
              onClick={() => {
                sound.play("pop");
                setRunning(true);
              }}
            >
              Find the cause 🔬
            </button>
          </div>
        )}

        {done && (
          <div className="diagnosis rise">
            <p className="result-kicker">Final diagnosis</p>
            <p className="diagnosis-title">Cause found: you. 💗</p>
            <p className="diagnosis-ai">
              Special. Rare. One of a kind. The patient&apos;s condition is permanent — and he doesn&apos;t want a cure.
              (I even asked an AI to double-check this report. It agreed — completely. 🤖✨)
            </p>
          </div>
        )}
      </section>

      {done && (
        <p className="story-line rise" style={{ animationDelay: "500ms" }}>
          You are special, Doctor.
          <br />
          <span className="story-em">And I will never lose you.</span> 🤍
        </p>
      )}

      <ChapterNav nextLabel="Time for a little game 💗" ready={done} />
    </div>
  );
}
