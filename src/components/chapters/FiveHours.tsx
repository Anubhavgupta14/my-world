import { useEffect, useId, useState } from "react";
import { sound } from "@/lib/sound";
import { ReplayIcon } from "../icons";
import { SecretStar } from "../SecretStar";
import { ChapterHeader, ChapterNav } from "../ui";
import { useUniverse } from "../universe-context";

const TOTAL = 300; // minutes
const DURATION = 7500; // ms

const BUBBLES = [
  { at: 40, text: "One more topic…", side: "left" },
  { at: 110, text: "Wait, tell me more!", side: "right" },
  { at: 185, text: "How is it already so late?", side: "left" },
  { at: 255, text: "And the conversation continues…", side: "right" },
] as const;

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const pad = (n: number) => String(n).padStart(2, "0");

function teaState(minutes: number) {
  if (minutes < 60) return "hot ♨️";
  if (minutes < 150) return "warm";
  if (minutes < 240) return "cold 🧊";
  return "forgotten 🫖";
}

function skyState(minutes: number) {
  if (minutes < 90) return "evening 🌇";
  if (minutes < 200) return "night 🌙";
  return "very late 🌌";
}

export default function FiveHours() {
  const { reduced } = useUniverse();
  const [run, setRun] = useState(0);
  const [minutes, setMinutes] = useState(reduced ? TOTAL : 0);
  const gradId = useId();
  const hour = Math.floor(minutes / 60);
  const done = minutes >= TOTAL;

  useEffect(() => {
    if (reduced) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION);
      setMinutes(Math.round(easeInOut(t) * TOTAL));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [run, reduced]);

  // A soft chime each time another hour slips by.
  useEffect(() => {
    if (hour > 0) sound.play(hour === 5 ? "success" : "hour");
  }, [hour]);

  const circumference = 2 * Math.PI * 92;
  const battery = Math.round(100 - (minutes / TOTAL) * 88);

  return (
    <div className="scene-inner">
      <SecretStar id="clock" className="left-[4%] top-[30%]" />
      <ChapterHeader title="The Five-Hour Mystery" subtitle="How did five hours become so easy to spend?" />

      <div className="clock-wrap">
        <svg className="clock" viewBox="0 0 220 220" role="img" aria-label={`Clock showing ${pad(hour)}:${pad(minutes % 60)}`}>
          <defs>
            <radialGradient id={`${gradId}-face`} cx="40%" cy="35%" r="75%">
              <stop offset="0%" stopColor="#fffafc" />
              <stop offset="70%" stopColor="#f6e6f6" />
              <stop offset="100%" stopColor="#e2cdf3" />
            </radialGradient>
            <linearGradient id={`${gradId}-ring`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ff8db5" />
              <stop offset="100%" stopColor="#9b7ef0" />
            </linearGradient>
          </defs>
          <circle cx="110" cy="110" r="104" className="clock-glow" />
          <circle cx="110" cy="110" r="100" fill={`url(#${gradId}-face)`} />
          <circle cx="110" cy="110" r="92" className="clock-track" />
          <circle
            cx="110"
            cy="110"
            r="92"
            className="clock-progress"
            stroke={`url(#${gradId}-ring)`}
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - minutes / TOTAL)}
            transform="rotate(-90 110 110)"
          />
          {Array.from({ length: 12 }, (_, i) => (
            <line
              key={i}
              x1="110"
              y1={i % 3 === 0 ? 26 : 30}
              x2="110"
              y2="36"
              className={i % 3 === 0 ? "clock-tick major" : "clock-tick"}
              transform={`rotate(${i * 30} 110 110)`}
            />
          ))}
          {[1, 2, 3, 4, 5].map((h) => (
            <circle
              key={h}
              cx="110"
              cy="17"
              r="3.2"
              className={hour >= h ? "hour-dot lit" : "hour-dot"}
              transform={`rotate(${h * 30} 110 110)`}
            />
          ))}
          <line x1="110" y1="110" x2="110" y2="64" className="hand hour-hand" transform={`rotate(${minutes * 0.5} 110 110)`} />
          <line x1="110" y1="118" x2="110" y2="44" className="hand minute-hand" transform={`rotate(${minutes * 6} 110 110)`} />
          <path
            d="M110 117s-7-4.3-9.1-8.6c-1.3-2.9.2-6.4 3.6-6.8 2-.2 3.8 1 5.5 3 1.7-2 3.5-3.2 5.5-3 3.4.4 4.9 3.9 3.6 6.8-2.1 4.3-9.1 8.6-9.1 8.6z"
            className="clock-heart"
          />
        </svg>
        <p className="clock-digits" aria-live="off">
          {pad(hour)}:{pad(minutes % 60)}
          <span className="clock-unit">hrs</span>
        </p>
      </div>

      <ul className="call-stats" aria-label="Meanwhile, during the call">
        <li>
          <span aria-hidden>📱</span> Battery <strong>{battery}%</strong>
        </li>
        <li>
          <span aria-hidden>🍵</span> Tea <strong>{teaState(minutes)}</strong>
        </li>
        <li>
          <span aria-hidden>🪟</span> Outside <strong>{skyState(minutes)}</strong>
        </li>
      </ul>

      <ul className="bubbles" aria-label="Things said during the call">
        {BUBBLES.map((b) =>
          minutes >= b.at ? (
            <li key={b.text} className={`bubble bubble-${b.side}`}>
              {b.text}
            </li>
          ) : (
            <li key={b.text} className="bubble-placeholder" aria-hidden />
          ),
        )}
      </ul>

      {done && (
        <p className="story-line rise">
          Maybe some conversations don&apos;t need a pause button. <span aria-hidden>❤️</span>
        </p>
      )}

      <ChapterNav nextLabel="And then, today… 📱" ready={done}>
        <button
          type="button"
          className="btn btn-ghost btn-icon"
          onClick={() => {
            setMinutes(reduced ? TOTAL : 0);
            setRun((r) => r + 1);
          }}
          aria-label="Rewind the clock"
          title="Rewind"
        >
          <ReplayIcon />
        </button>
      </ChapterNav>
    </div>
  );
}
