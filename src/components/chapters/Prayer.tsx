import { useId, useState } from "react";
import { sound } from "@/lib/sound";
import { ChapterHeader, ChapterNav } from "../ui";
import { centerOf, useUniverse } from "../universe-context";

function Diya({ lit }: { lit: boolean }) {
  const id = useId();
  return (
    <svg viewBox="0 0 160 140" className={`diya ${lit ? "lit" : ""}`} aria-hidden>
      <defs>
        <linearGradient id={`${id}-clay`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e9894a" />
          <stop offset="100%" stopColor="#a8492a" />
        </linearGradient>
        <radialGradient id={`${id}-flame`} cx="50%" cy="70%" r="70%">
          <stop offset="0%" stopColor="#fffbe6" />
          <stop offset="45%" stopColor="#ffd34d" />
          <stop offset="100%" stopColor="#ff7a2e" />
        </radialGradient>
        <radialGradient id={`${id}-glow`}>
          <stop offset="0%" stopColor="rgba(255, 200, 90, 0.75)" />
          <stop offset="100%" stopColor="rgba(255, 160, 60, 0)" />
        </radialGradient>
      </defs>
      <circle cx="80" cy="62" r="62" fill={`url(#${id}-glow)`} className="diya-glow" />
      <g className="diya-flame">
        <path d="M80 30 C 92 48, 92 62, 80 70 C 68 62, 68 48, 80 30 Z" fill={`url(#${id}-flame)`} />
        <path d="M80 48 C 85 56, 85 62, 80 66 C 75 62, 75 56, 80 48 Z" fill="#fffdf2" />
      </g>
      <path d="M80 70 v8" stroke="#5a3a2a" strokeWidth="3" strokeLinecap="round" />
      <path d="M18 80 Q80 76 142 80 Q132 122 80 124 Q28 122 18 80 Z" fill={`url(#${id}-clay)`} />
      <path d="M18 80 Q80 90 142 80" fill="none" stroke="#f6b27a" strokeWidth="3" strokeLinecap="round" />
      {[40, 60, 80, 100, 120].map((x, i) => (
        <circle key={x} cx={x} cy={i % 2 ? 104 : 100} r="3.2" fill="#ffd36e" />
      ))}
      <path d="M44 112 Q80 120 116 112" fill="none" stroke="#7d3a20" strokeWidth="2" opacity="0.5" />
    </svg>
  );
}

export default function Prayer() {
  const { celebrate, completeGame } = useUniverse();
  const [lit, setLit] = useState(false);

  return (
    <div className="scene-inner prayer">
      <ChapterHeader
        title="A Little Prayer 🪔"
        subtitle="You love festivals, so here's a little diya, just for you. Tap it to light it."
      />

      <button
        type="button"
        className="diya-button"
        disabled={lit}
        onClick={(event) => {
          setLit(true);
          sound.play("chime");
          completeGame("prayer");
          celebrate({ ...centerOf(event.currentTarget), count: 18 });
        }}
        aria-label={lit ? "The diya is lit" : "Light the diya"}
      >
        <Diya lit={lit} />
      </button>
      {!lit && <p className="envelope-hint">tap the diya to light it ✨</p>}

      {lit && (
        <div className="glass prayer-card rise" style={{ animationDelay: "500ms" }}>
          <p className="prayer-text">
            Before I even met you, I had already prayed to God — for a girl who would meet me for the first time and
            become my life partner, forever. 🙏
          </p>
          <p className="prayer-punch">Together, I truly believe we can win at life. 🪔✨</p>
        </div>
      )}

      <ChapterNav nextLabel="There's one more thing… 💌" ready={lit} />
    </div>
  );
}
