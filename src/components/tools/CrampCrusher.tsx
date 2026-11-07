import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useEffect, useRef, useState } from "react";
import { buzz, burst } from "@/lib/fx";
import { actions } from "@/lib/store";
import { CrampBlob } from "../illustrations";

const ROUND_MS = 25_000;
const HOLES = 9;
const TICK = 80;

interface Hole {
  kind: "cramp" | "golden" | null;
  up: boolean;
  squished: boolean;
  expiresAt: number;
}

interface Game {
  phase: "idle" | "playing" | "done";
  startedAt: number;
  now: number;
  nextSpawn: number;
  score: number;
  holes: Hole[];
}

const emptyHoles = (): Hole[] =>
  Array.from({ length: HOLES }, () => ({ kind: null, up: false, squished: false, expiresAt: 0 }));

const idle = (): Game => ({ phase: "idle", startedAt: 0, now: 0, nextSpawn: 0, score: 0, holes: emptyHoles() });

const RANKS = [
  { min: 0, title: "Cramp Intern", line: "Everyone starts somewhere. Even the cramps feel a bit sorry for you." },
  { min: 8, title: "Junior Cramp Physio", line: "Solid technique. Cramps have been referred elsewhere." },
  { min: 18, title: "Senior Cramp Specialist", line: "Cramps are filing complaints about you. Excellent." },
  { min: 28, title: "HOD, Dept. of Cramp Destruction", line: "Legendary. The cramps have unionised and gone on strike." },
];

/** Advance the game by one tick: expire, spawn, and finish when time runs out. */
function step(g: Game, now: number): Game {
  if (g.phase !== "playing") return g;
  const elapsed = now - g.startedAt;
  if (elapsed >= ROUND_MS) return { ...g, now, phase: "done", holes: emptyHoles() };

  const progress = elapsed / ROUND_MS;
  const holes = g.holes.map((h) => {
    if (h.kind && h.up && now >= h.expiresAt) return { ...h, up: false, expiresAt: now + 180 };
    if (h.kind && !h.up && now >= h.expiresAt) return { ...h, kind: null, squished: false };
    return h;
  });

  let nextSpawn = g.nextSpawn;
  if (now >= nextSpawn) {
    const free = holes.map((h, i) => (h.kind ? -1 : i)).filter((i) => i >= 0);
    const count = progress > 0.55 && Math.random() < 0.45 ? 2 : 1;
    for (let c = 0; c < count && free.length; c++) {
      const pick = free.splice(Math.floor(Math.random() * free.length), 1)[0];
      holes[pick] = {
        kind: Math.random() < 0.12 ? "golden" : "cramp",
        up: true,
        squished: false,
        expiresAt: now + 1050 - progress * 450,
      };
    }
    nextSpawn = now + 760 - progress * 360;
  }
  return { ...g, now, holes, nextSpawn };
}

export function CrampCrusher({ best }: { best: number }) {
  const root = useRef<HTMLDivElement>(null);
  const [game, setGame] = useState<Game>(idle);

  useEffect(() => {
    if (game.phase !== "playing") return;
    const id = window.setInterval(() => setGame((g) => step(g, Date.now())), TICK);
    return () => window.clearInterval(id);
  }, [game.phase]);

  useEffect(() => {
    if (game.phase === "done") {
      actions.recordCrushScore(game.score);
      buzz([30, 60, 30, 60, 60]);
    }
  }, [game.phase, game.score]);

  const { contextSafe } = useGSAP({ scope: root });

  const bumpScore = contextSafe(() => {
    gsap.fromTo(".score", { scale: 1.35 }, { scale: 1, duration: 0.4, ease: "back.out(3)" });
  });

  const start = () => {
    const now = Date.now();
    setGame({ ...idle(), phase: "playing", startedAt: now, now, nextSpawn: now + 400 });
  };

  const whack = (i: number, e: React.PointerEvent<HTMLButtonElement>) => {
    const h = game.holes[i];
    if (!h.kind || !h.up || h.squished || game.phase !== "playing") return;
    const golden = h.kind === "golden";
    buzz(golden ? [15, 30, 15] : 12);
    burst({ x: e.clientX, y: e.clientY }, golden ? ["⭐", "✨", "💛"] : ["💥", "✨"], golden ? 10 : 6);
    bumpScore();
    setGame((g) => {
      const holes = g.holes.slice();
      holes[i] = { ...holes[i], squished: true, up: true, expiresAt: Date.now() + 260 };
      return { ...g, holes, score: g.score + (golden ? 3 : 1) };
    });
  };

  const timeLeft = game.phase === "playing" ? Math.max(0, ROUND_MS - (game.now - game.startedAt)) : ROUND_MS;
  const rank = [...RANKS].reverse().find((r) => game.score >= r.min)!;

  return (
    <div ref={root} className="pb-4">
      <div className="mb-4 grid grid-cols-3 gap-2 text-center">
        <div className="card py-2.5">
          <p className="eyebrow">Score</p>
          <p className="score font-display text-3xl font-semibold text-lilac">{game.score}</p>
        </div>
        <div className="card py-2.5">
          <p className="eyebrow">Time</p>
          <p className="font-display text-3xl font-semibold tabular-nums">{Math.ceil(timeLeft / 1000)}</p>
        </div>
        <div className="card py-2.5">
          <p className="eyebrow">Best</p>
          <p className="font-display text-3xl font-semibold">{Math.max(best, game.phase === "done" ? game.score : 0)}</p>
        </div>
      </div>

      <div className="relative">
        <div className="grid grid-cols-3 gap-3 rounded-[28px] bg-gradient-to-b from-lilac-soft to-white p-4">
          {game.holes.map((h, i) => (
            <button
              key={i}
              onPointerDown={(e) => whack(i, e)}
              className="relative aspect-square touch-none overflow-hidden rounded-[22px]"
              aria-label={h.kind && h.up ? "Squish the cramp!" : "Empty hole"}
            >
              <span className="absolute inset-x-1 bottom-1 h-1/3 rounded-[50%] bg-[#6a4fb8]/25" />
              <span
                className="absolute inset-x-2 bottom-1 top-3 transition-transform duration-150 ease-out"
                style={{ transform: h.kind && h.up ? "translateY(0)" : "translateY(110%)" }}
              >
                {h.kind && <CrampBlob squished={h.squished} golden={h.kind === "golden"} />}
              </span>
            </button>
          ))}
        </div>

        {game.phase !== "playing" && (
          <div className="absolute inset-0 grid place-items-center rounded-[28px] bg-white/80 p-6 text-center backdrop-blur-sm">
            {game.phase === "idle" ? (
              <div>
                <p className="font-display text-2xl font-semibold">Cramp Crusher</p>
                <p className="mt-2 text-sm text-ink-soft">
                  Squish the grumpy cramps before they hide. Golden ones are worth 3. You have 25 seconds.
                </p>
                <button className="btn btn-primary mt-5" onClick={start}>
                  Let&apos;s squish 👊
                </button>
              </div>
            ) : (
              <div>
                <p className="eyebrow">You crushed {game.score} cramps</p>
                <p className="mt-1 font-display text-2xl font-semibold">{rank.title}</p>
                <p className="mt-2 text-sm text-ink-soft">{rank.line}</p>
                <button className="btn btn-primary mt-5" onClick={start}>
                  Again!
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      <p className="mt-4 text-center text-xs text-ink-soft">
        No real cramps were harmed. Unfortunately.
      </p>
    </div>
  );
}
