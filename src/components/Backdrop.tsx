import type { CSSProperties } from "react";
import { mulberry32 } from "@/lib/random";
import { HEART_PATH, SPARKLE_PATH } from "./icons";

// Seeded so the server and the browser draw exactly the same sky.
const rand = mulberry32(5_0_0_0);

function starField(count: number, spread: number) {
  return Array.from({ length: count }, () => {
    const x = (rand() * 100).toFixed(2);
    const y = (rand() * 100).toFixed(2);
    const s = (rand() * spread).toFixed(2);
    const a = (0.45 + rand() * 0.55).toFixed(2);
    return `${x}vw ${y}vh 0 ${s}px rgba(255,255,255,${a})`;
  }).join(",");
}

const STAR_LAYERS = [starField(80, 0.5), starField(45, 1), starField(18, 1.6)];

const SPARKLES = Array.from({ length: 11 }, () => ({
  top: (rand() * 92).toFixed(1),
  left: (rand() * 96).toFixed(1),
  size: (8 + rand() * 12).toFixed(1),
  delay: (rand() * -6).toFixed(2),
  dur: (3 + rand() * 4).toFixed(2),
}));

const HEARTS = Array.from({ length: 9 }, (_, i) => ({
  left: (4 + rand() * 92).toFixed(1),
  size: (12 + rand() * 16).toFixed(1),
  dur: (18 + rand() * 14).toFixed(1),
  delay: (-rand() * 32).toFixed(1),
  drift: ((rand() - 0.5) * 90).toFixed(0),
  tone: i % 3,
}));

export function Backdrop() {
  return (
    <div className="backdrop" aria-hidden>
      <div className="sky sky-dawn" />
      <div className="sky sky-dusk" />
      <div className="sky sky-night" />
      <div className="nebula" />
      <div className="starfield">
        {STAR_LAYERS.map((shadow, i) => (
          <div key={i} className={`stars stars-${i}`} style={{ boxShadow: shadow }} />
        ))}
        <span className="shooting-star" />
        <span className="shooting-star late" />
      </div>
      {SPARKLES.map((s, i) => (
        <svg
          key={i}
          className="bg-sparkle"
          viewBox="0 0 24 24"
          style={
            {
              top: `${s.top}%`,
              left: `${s.left}%`,
              width: `${s.size}px`,
              height: `${s.size}px`,
              animationDelay: `${s.delay}s`,
              animationDuration: `${s.dur}s`,
            } as CSSProperties
          }
        >
          <path d={SPARKLE_PATH} fill="currentColor" />
        </svg>
      ))}
      {HEARTS.map((h, i) => (
        <svg
          key={i}
          className={`float-heart tone-${h.tone}`}
          viewBox="0 0 24 24"
          style={
            {
              left: `${h.left}%`,
              width: `${h.size}px`,
              height: `${h.size}px`,
              animationDuration: `${h.dur}s`,
              animationDelay: `${h.delay}s`,
              "--drift": `${h.drift}px`,
            } as CSSProperties
          }
        >
          <path d={HEART_PATH} fill="currentColor" />
        </svg>
      ))}
    </div>
  );
}
