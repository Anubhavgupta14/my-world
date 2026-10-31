import { useState } from "react";
import { CHAPTERS } from "@/lib/chapters";
import { SECRET_COUNT } from "@/lib/content";
import { resetProgress } from "@/lib/progress";
import { LockIcon, MusicIcon, SparkleIcon, SpeakerIcon } from "./icons";
import { Modal } from "./Modal";
import { useUniverse } from "./universe-context";

export function JourneyMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { index, progress, go, musicOn, sfxOn, toggleMusic, toggleSfx, toast } = useUniverse();
  const [confirming, setConfirming] = useState(false);
  const furthest = Math.max(progress.furthest, index);

  function close() {
    setConfirming(false);
    onClose();
  }

  function doReset() {
    resetProgress();
    setConfirming(false);
    onClose();
    toast("Progress reset. A fresh little universe, ready to explore again. ✨", { icon: "🌱" });
    go(0);
  }

  return (
    <Modal open={open} onClose={close} labelledBy="journey-title" className="modal-sheet">
      <h2 id="journey-title" className="font-display text-2xl text-plum">
        Journey Map 🗺️
      </h2>
      <p className="mt-1 text-sm text-plum-soft">Jump back to any chapter you&apos;ve visited. Every game can be replayed.</p>

      <ol className="journey-list">
        {CHAPTERS.map((chapter, i) => {
          const locked = i > furthest;
          const done = chapter.game ? progress.completed[chapter.game] : i < furthest;
          return (
            <li key={chapter.id}>
              <button
                type="button"
                className={`journey-item ${i === index ? "current" : ""}`}
                disabled={locked}
                onClick={() => {
                  close();
                  go(i);
                }}
                aria-current={i === index ? "step" : undefined}
              >
                <span className="journey-emoji" aria-hidden>
                  {locked ? <LockIcon width={18} height={18} /> : chapter.emoji}
                </span>
                <span className="flex-1 text-left">
                  <span className="block text-[0.72rem] uppercase tracking-[0.14em] opacity-70">
                    Chapter {i + 1}
                  </span>
                  <span className="block font-semibold leading-tight">
                    {locked ? "Keep exploring to unlock" : chapter.title}
                  </span>
                </span>
                {i === index ? (
                  <span className="journey-badge">You are here</span>
                ) : done && !locked ? (
                  <span className="journey-badge done" aria-label="completed">
                    ✓
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ol>

      <div className="journey-secrets">
        <span className="font-semibold">Secret stars found</span>
        <span className="flex gap-1" aria-label={`${progress.secrets.length} of ${SECRET_COUNT}`}>
          {Array.from({ length: SECRET_COUNT }, (_, i) => (
            <SparkleIcon key={i} width={16} height={16} className={i < progress.secrets.length ? "text-rose" : "opacity-25"} />
          ))}
        </span>
      </div>
      <p className="mt-1 text-xs text-plum-soft">Tiny stars are hidden around the universe. Tap them if you spot one. 👀</p>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button type="button" className="btn btn-ghost btn-sm" onClick={toggleMusic} aria-pressed={musicOn}>
          <MusicIcon off={!musicOn} width={18} height={18} /> Music {musicOn ? "on" : "off"}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={toggleSfx} aria-pressed={sfxOn}>
          <SpeakerIcon off={!sfxOn} width={18} height={18} /> Effects {sfxOn ? "on" : "off"}
        </button>
      </div>

      <div className="mt-4 border-t border-plum/10 pt-4">
        {confirming ? (
          <div className="flex flex-col gap-2" role="group" aria-label="Confirm reset">
            <p className="text-sm text-plum">Reset all games, secret stars and chapter progress?</p>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirming(false)}>
                Keep it
              </button>
              <button type="button" className="btn btn-primary btn-sm" onClick={doReset}>
                Yes, reset
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="btn-link text-sm" onClick={() => setConfirming(true)}>
            Reset progress
          </button>
        )}
      </div>
    </Modal>
  );
}
