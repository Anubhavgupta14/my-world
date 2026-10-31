import { useRef, useState } from "react";
import { between } from "@/lib/random";
import { sound } from "@/lib/sound";
import { ReplayIcon } from "../icons";
import { ChapterHeader } from "../ui";
import { centerOf, useUniverse } from "../universe-context";

const TEASES = [
  "Nope! 🙈",
  "Too slow 😄",
  "This button is shy… just like I was before the video call 🙈",
  "It swung off to get chaat 🌶️",
  "Error 404: “Can't Say” not found 😅",
  "RCB fans don't give up that easily 🏏",
];

export default function FinalQuestion() {
  const { go, back, celebrate } = useUniverse();
  const [said, setSaid] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [dodges, setDodges] = useState(0);
  const arenaRef = useRef<HTMLDivElement>(null);
  const yesRef = useRef<HTMLButtonElement>(null);

  /** Jump to a random spot inside the arena, away from the finger/cursor and never on top of YES. */
  function dodge(btn: HTMLElement) {
    const arena = arenaRef.current?.getBoundingClientRect();
    const yes = yesRef.current?.getBoundingClientRect();
    if (!arena) return;
    const b = btn.getBoundingClientRect();
    const maxX = Math.max(0, arena.width - b.width);
    const maxY = Math.max(0, arena.height - b.height);
    let x = 0;
    let y = 0;
    for (let i = 0; i < 30; i++) {
      x = between(0, maxX);
      y = between(0, maxY);
      const left = arena.left + x;
      const top = arena.top + y;
      const onYes =
        yes && left < yes.right + 10 && left + b.width > yes.left - 10 && top < yes.bottom + 10 && top + b.height > yes.top - 10;
      const farEnough = Math.hypot(left - b.left, top - b.top) > Math.min(110, arena.width / 3);
      if (!onYes && farEnough) break;
    }
    setPos({ x, y });
    setDodges((d) => d + 1);
    sound.play("pop");
  }

  return (
    <div className="scene-inner final">
      <div className="final-heart" aria-hidden>
        <span className="final-glow" />
        <span className="final-orbit o1">✦</span>
        <span className="final-orbit o2">✧</span>
        <span className="final-orbit o3">✦</span>
        <svg viewBox="0 0 24 24" className="final-heart-svg">
          <defs>
            <linearGradient id="final-heart-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ffb3cf" />
              <stop offset="55%" stopColor="#f0679a" />
              <stop offset="100%" stopColor="#a77bef" />
            </linearGradient>
          </defs>
          <path
            d="M12 20.6s-7.6-4.7-9.9-9.4C.6 8.1 2.3 4.2 6 3.8c2.1-.2 4.1 1 6 3.2 1.9-2.2 3.9-3.4 6-3.2 3.7.4 5.4 4.3 3.9 7.4-2.3 4.7-9.9 9.4-9.9 9.4z"
            fill="url(#final-heart-grad)"
          />
        </svg>
      </div>

      <ChapterHeader title={<>Hey Dhruvi, I started liking you. 💗</>} subtitle="Let's explore the world together?" />
      {!said ? (
        <>
          <div ref={arenaRef} className="runaway-arena rise" style={{ animationDelay: "200ms" }}>
            <button
              ref={yesRef}
              type="button"
              className="btn btn-choice choice-a yes-btn"
              onClick={(event) => {
                setSaid(true);
                sound.play("success");
                celebrate({ ...centerOf(event.currentTarget), count: 34 });
                celebrate({ mode: "rain" });
              }}
            >
              YES, Of course! 💗
            </button>

            <button
              type="button"
              className={`btn btn-ghost runaway-btn ${pos ? "moved" : ""}`}
              style={pos ? { left: pos.x, top: pos.y } : undefined}
              onPointerEnter={(event) => {
                // Hover-dodging only where a real hover exists (mouse/trackpad); phones dodge on touch.
                if (event.pointerType === "mouse" && window.matchMedia("(hover: hover)").matches) {
                  dodge(event.currentTarget);
                }
              }}
              onPointerDown={(event) => {
                event.preventDefault();
                dodge(event.currentTarget);
              }}
              onFocus={(event) => dodge(event.currentTarget)}
              onClick={(event) => dodge(event.currentTarget)}
            >
              Can&apos;t Say 🙈
            </button>
          </div>

          <p className="tease" aria-live="polite">
            {dodges > 0 ? TEASES[Math.min(dodges - 1, TEASES.length - 1)] : " "}
          </p>
          {dodges >= 7 && (
            <p className="hand-note honest rise">
              (Okay, jokes apart — you can always tell me honestly, anytime. No pressure. 😊)
            </p>
          )}
        </>
      ) : (
        <div className="glass final-card rise" role="status">
          <p className="final-emoji" aria-hidden>
            🥹
          </p>
          <p className="final-message">You just made me the happiest Engineer alive! 💗</p>
          <p className="final-sub">
            Here&apos;s to chaat and dosa, long drives, movie nights, festivals together — and exploring the
            whole world, one beautiful moment at a time.
          </p>
          <p className="hand-note dark">(Psst — the Engineer can&apos;t see this screen. Go tell him! 😄)</p>
        </div>
      )}

      <div className="final-footer">
        <button type="button" className="btn btn-ghost" onClick={back}>
          Read the letter again 💌
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => go(0)}>
          <ReplayIcon width={18} height={18} /> Replay the journey
        </button>
      </div>

      <p className="hand-note final-thanks">Thank you for exploring this little universe, Doctor. ✨</p>
    </div>
  );
}
