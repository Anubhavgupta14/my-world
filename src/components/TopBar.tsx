import { CHAPTERS } from "@/lib/chapters";
import { MapIcon, MusicIcon, SpeakerIcon } from "./icons";
import { useUniverse } from "./universe-context";

const STEP = 180 / (CHAPTERS.length - 1);
const POINTS = CHAPTERS.map((_, i) => ({
  x: Math.round((8 + i * STEP) * 10) / 10,
  y: 13 + Math.round(Math.sin(i * 1.15) * 6),
}));

export function TopBar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { index, progress, musicOn, sfxOn, toggleMusic, toggleSfx } = useUniverse();
  const furthest = Math.max(progress.furthest, index);

  return (
    <header className="topbar">
      <button type="button" className="icon-btn" onClick={onOpenMenu} aria-label="Open the journey map">
        <MapIcon />
      </button>

      <div
        className="constellation"
        role="progressbar"
        aria-label="Journey progress"
        aria-valuemin={1}
        aria-valuemax={CHAPTERS.length}
        aria-valuenow={index + 1}
        aria-valuetext={`Chapter ${index + 1} of ${CHAPTERS.length}: ${CHAPTERS[index].title}`}
      >
        <svg viewBox="0 0 196 26" aria-hidden>
          {POINTS.slice(1).map((p, i) => {
            const prev = POINTS[i];
            return (
              <line
                key={i}
                x1={prev.x}
                y1={prev.y}
                x2={p.x}
                y2={p.y}
                className={i < index ? "c-line lit" : i < furthest ? "c-line seen" : "c-line"}
              />
            );
          })}
          {POINTS.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={i === index ? 4 : 2.3}
              className={i === index ? "c-dot current" : i <= furthest ? "c-dot seen" : "c-dot"}
            />
          ))}
        </svg>
        <span className="constellation-label">
          {index + 1} / {CHAPTERS.length}
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          className={`icon-btn ${musicOn ? "is-on" : ""}`}
          onClick={toggleMusic}
          aria-pressed={musicOn}
          aria-label={musicOn ? "Turn background music off" : "Turn background music on"}
        >
          <MusicIcon off={!musicOn} />
        </button>
        <button
          type="button"
          className={`icon-btn ${sfxOn ? "is-on" : ""}`}
          onClick={toggleSfx}
          aria-pressed={sfxOn}
          aria-label={sfxOn ? "Mute sound effects" : "Unmute sound effects"}
        >
          <SpeakerIcon off={!sfxOn} />
        </button>
      </div>
    </header>
  );
}
