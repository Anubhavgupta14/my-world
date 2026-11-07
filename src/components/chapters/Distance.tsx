import { useEffect, useEffectEvent, useRef, useState } from "react";
import { sound } from "@/lib/sound";
import { HEART_PATH, ReplayIcon } from "../icons";
import { ChapterHeader, ChapterNav } from "../ui";
import { useUniverse } from "../universe-context";

const SWING_PATH = "M58 62 Q110 172 160 66 Q212 172 262 60";
const SWING_MS = 2600;

type Phase = "idle" | "swinging" | "landed";

const LEFT_CITY = [
  [4, 92, 18],
  [24, 72, 22],
  [48, 62, 20],
  [70, 100, 16],
];
const RIGHT_CITY = [
  [236, 98, 16],
  [254, 58, 22],
  [278, 84, 20],
  [300, 104, 18],
];

function City({ blocks }: { blocks: number[][] }) {
  return (
    <g className="dist-city">
      {blocks.map(([x, top, w]) => (
        <g key={x}>
          <rect x={x} y={top} width={w} height={200 - top} rx="2" />
          {Array.from({ length: Math.floor((180 - top) / 12) }, (_, r) => (
            <rect
              key={r}
              x={x + w / 2 - 2}
              y={top + 6 + r * 12}
              width="4"
              height="5"
              rx="1"
              className={(r + x) % 3 === 0 ? "win dim" : "win"}
            />
          ))}
        </g>
      ))}
    </g>
  );
}

/** The emoji is dark, so it gets a soft glowing halo to stay visible on the night sky. */
function Spidey() {
  return (
    <>
      <circle r="14" className="spidey-halo" />
      <text className="spidey" textAnchor="middle" dominantBaseline="central" y="1">
        🕷️
      </text>
    </>
  );
}

export default function Distance() {
  const { reduced, celebrate, completeGame } = useUniverse();
  const [phase, setPhase] = useState<Phase>("idle");
  const [run, setRun] = useState(0);
  const motion = useRef<SVGAnimateMotionElement>(null);

  const onLanded = useEffectEvent(() => {
    setPhase("landed");
    sound.play("success");
    completeGame("distance");
    celebrate({ x: window.innerWidth * 0.78, y: window.innerHeight * 0.4, count: 22 });
  });

  useEffect(() => {
    if (phase !== "swinging") return;
    motion.current?.beginElement();
    const t = setTimeout(onLanded, SWING_MS);
    return () => clearTimeout(t);
  }, [phase, run]);

  function swing() {
    sound.play("whoosh");
    if (reduced) {
      setPhase("landed");
      completeGame("distance");
      return;
    }
    setRun((r) => r + 1);
    setPhase("swinging");
  }

  return (
    <div className="scene-inner">
      <ChapterHeader
        title="The Distance Between Us"
        subtitle="I'm in Pune, you're in Panvel — quite a distance away… but believe me, I'm Spider-Man. 🕷️"
      />

      <figure className="distance-card">
        <svg viewBox="0 0 320 200" className={`distance-svg ${phase}`} role="img" aria-label="Spider-Man swinging from Pune all the way to Panvel">
          <City blocks={LEFT_CITY} />
          <City blocks={RIGHT_CITY} />

          <path d="M80 150 H236" className="dist-gap" />
          <text x="158" y="166" textAnchor="middle" className="dist-gap-label">
            quite a distance…
          </text>

          <text x="58" y="16" textAnchor="middle" className="dist-label">
            Pune
          </text>
          <text x="265" y="16" textAnchor="middle" className="dist-label">
            Panvel 📍
          </text>

          {phase !== "idle" && (
            <g key={run}>
              <line x1="110" y1="0" x2="110" y2="120" className="web w1" />
              <line x1="212" y1="0" x2="212" y2="120" className="web w2" />
              <path d={SWING_PATH} className="web-trail" />
            </g>
          )}

          <g className={`dist-heart ${phase === "landed" ? "show" : ""}`} transform="translate(253 20)">
            <path d={HEART_PATH} />
          </g>

          {phase === "swinging" ? (
            <g key={`s-${run}`}>
              <Spidey />
              <animateMotion ref={motion} dur={`${SWING_MS}ms`} begin="indefinite" fill="freeze" path={SWING_PATH} />
            </g>
          ) : (
            <g transform={phase === "landed" ? "translate(262 60)" : "translate(58 62)"}>
              <Spidey />
            </g>
          )}
        </svg>
      </figure>

      {phase !== "landed" ? (
        <div className="flex justify-center">
          <button type="button" className="btn btn-primary btn-lg btn-glow" onClick={swing} disabled={phase === "swinging"}>
            {phase === "swinging" ? "Swinging… 🕸️" : "Send Spider-Man to Panvel 🕷️"}
          </button>
        </div>
      ) : (
        <>
          <p className="story-line small rise">
            Reached! 💗 Distance is just a few web-swings for your friendly neighbourhood Engineer.
          </p>
          <div className="glass promise-card rise" style={{ animationDelay: "400ms" }}>
            <p className="promise-emoji" aria-hidden>
              🫂
            </p>
            <p className="promise-text">
              Whenever you have a bad day, I&apos;ll be there for you.
              <br />
              <strong>Always.</strong>
            </p>
          </div>
        </>
      )}

      <ChapterNav nextLabel="A playlist for you 🎶" ready={phase === "landed"}>
        {phase === "landed" && (
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            onClick={() => setPhase("idle")}
            aria-label="Swing again"
            title="Swing again"
          >
            <ReplayIcon />
          </button>
        )}
      </ChapterNav>
    </div>
  );
}
