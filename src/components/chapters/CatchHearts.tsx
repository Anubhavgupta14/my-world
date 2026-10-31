import { useEffect, useEffectEvent, useRef, useState, type CSSProperties, type SyntheticEvent } from "react";
import { HEART_SURPRISE } from "@/lib/content";
import { updateProgress } from "@/lib/progress";
import { between } from "@/lib/random";
import { sound } from "@/lib/sound";
import { HeartIcon, RasgullaIcon, ReplayIcon } from "../icons";
import { ChapterHeader, ChapterNav } from "../ui";
import { centerOf, useUniverse } from "../universe-context";

const GAME_MS = 20_000;

type Phase = "ready" | "countdown" | "playing" | "done";
type Kind = "heart" | "rasgulla";

interface Item {
  id: number;
  kind: Kind;
  x: number;
  size: number;
  dur: number;
  caught: boolean;
}

interface Pop {
  id: number;
  x: number;
  y: number;
  text: string;
}

export default function CatchHearts() {
  const { celebrate, progress } = useUniverse();
  const [phase, setPhase] = useState<Phase>("ready");
  const [count, setCount] = useState(3);
  const [items, setItems] = useState<Item[]>([]);
  const [pops, setPops] = useState<Pop[]>([]);
  const [timeLeft, setTimeLeft] = useState(GAME_MS);
  const [tally, setTally] = useState({ score: 0, hearts: 0, rasgullas: 0 });
  const [newBest, setNewBest] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const arenaRef = useRef<HTMLDivElement>(null);
  const caught = useRef(new Set<number>());
  const scoreRef = useRef(0);
  const nextId = useRef(0);

  // 3 · 2 · 1 …
  useEffect(() => {
    if (phase !== "countdown") return;
    const t = setTimeout(() => {
      if (count > 1) {
        setCount((c) => c - 1);
        sound.play("tap");
      } else {
        setPhase("playing");
        sound.play("chime");
      }
    }, 750);
    return () => clearTimeout(t);
  }, [phase, count]);

  const onTimeUp = useEffectEvent(() => {
    const score = scoreRef.current;
    const best = progress.best.hearts ?? 0;
    setNewBest(score > best);
    updateProgress((p) => ({
      ...p,
      completed: { ...p.completed, hearts: true },
      best: { ...p.best, hearts: Math.max(p.best.hearts ?? 0, score) },
    }));
    setItems([]);
    setPhase("done");
    sound.play("success");
    celebrate({ count: 30 });
  });

  // The game loop: a light timer that also spawns new hearts & rasgullas.
  useEffect(() => {
    if (phase !== "playing") return;
    const start = performance.now();
    let lastSpawn = -1000;
    const loop = setInterval(() => {
      const elapsed = performance.now() - start;
      const left = Math.max(0, GAME_MS - elapsed);
      setTimeLeft(left);
      const pace = elapsed / GAME_MS;
      const gap = 600 - pace * 220;
      if (left > 700 && elapsed - lastSpawn > gap) {
        lastSpawn = elapsed;
        const kind: Kind = Math.random() < 0.22 ? "rasgulla" : "heart";
        const item: Item = {
          id: ++nextId.current,
          kind,
          x: between(9, 91),
          size: kind === "rasgulla" ? 54 : 56,
          dur: between(3600, 5000) - pace * 900,
          caught: false,
        };
        setItems((list) => [...list, item]);
      }
      if (left <= 0) {
        clearInterval(loop);
        onTimeUp();
      }
    }, 80);
    return () => clearInterval(loop);
  }, [phase]);

  function start() {
    caught.current.clear();
    scoreRef.current = 0;
    setTally({ score: 0, hearts: 0, rasgullas: 0 });
    setItems([]);
    setPops([]);
    setTimeLeft(GAME_MS);
    setRevealed(false);
    setNewBest(false);
    setCount(3);
    setPhase("countdown");
    sound.play("tap");
  }

  function grab(item: Item, event: SyntheticEvent<HTMLButtonElement>) {
    if (phase !== "playing" || caught.current.has(item.id)) return;
    caught.current.add(item.id);
    const points = item.kind === "rasgulla" ? 3 : 1;
    scoreRef.current += points;
    setTally((t) => ({
      score: t.score + points,
      hearts: t.hearts + (item.kind === "heart" ? 1 : 0),
      rasgullas: t.rasgullas + (item.kind === "rasgulla" ? 1 : 0),
    }));
    setItems((list) => list.map((i) => (i.id === item.id ? { ...i, caught: true } : i)));
    sound.play(item.kind === "rasgulla" ? "star" : "pop");

    const arena = arenaRef.current?.getBoundingClientRect();
    const c = centerOf(event.currentTarget);
    if (arena) {
      const pop = { id: item.id, x: c.x - arena.left, y: c.y - arena.top, text: `+${points}` };
      setPops((list) => [...list, pop]);
      setTimeout(() => setPops((list) => list.filter((p) => p.id !== pop.id)), 750);
    }
  }

  const seconds = Math.ceil(timeLeft / 1000);

  return (
    <div className="scene-inner">
      <ChapterHeader
        title="Catch the Hearts"
        subtitle="Tap the falling hearts (+1) and the rasgullas (+3) — I hear someone loves those. 😋 You've got 20 seconds!"
      />

      <div className="hud glass" aria-live="off">
        <span className="hud-stat">
          <HeartIcon width={18} height={18} className="text-rose" /> <strong>{tally.score}</strong>
          <span className="sr-only">points</span>
        </span>
        <div
          className="hud-timer"
          role="progressbar"
          aria-label="Time left"
          aria-valuemin={0}
          aria-valuemax={20}
          aria-valuenow={seconds}
        >
          <span style={{ width: `${(timeLeft / GAME_MS) * 100}%` }} />
        </div>
        <span className="hud-stat tabular-nums">{seconds}s</span>
      </div>

      <div ref={arenaRef} className={`arena glass ${phase === "playing" ? "is-playing" : ""}`}>
        {items.map((item) => (
          <div
            key={item.id}
            className="fall-track motion-essential"
            style={
              {
                left: `${item.x}%`,
                width: `${item.size}px`,
                animationDuration: `${item.dur}ms`,
                "--size": `${item.size}px`,
              } as CSSProperties
            }
            onAnimationEnd={(event) => {
              if (event.target === event.currentTarget) setItems((list) => list.filter((i) => i.id !== item.id));
            }}
          >
            <button
              type="button"
              className={`fall-item ${item.kind} ${item.caught ? "caught" : ""}`}
              aria-label={item.kind === "rasgulla" ? "Rasgulla, 3 points" : "Heart, 1 point"}
              onPointerDown={(event) => grab(item, event)}
              onClick={(event) => {
                if (event.detail === 0) grab(item, event); // keyboard activation
              }}
            >
              {item.kind === "rasgulla" ? <RasgullaIcon /> : <HeartIcon />}
            </button>
          </div>
        ))}

        {pops.map((p) => (
          <span key={p.id} className="score-pop" style={{ left: p.x, top: p.y }} aria-hidden>
            {p.text}
          </span>
        ))}

        {phase === "ready" && (
          <div className="arena-overlay">
            <div className="arena-demo" aria-hidden>
              <HeartIcon className="text-rose" />
              <RasgullaIcon />
              <HeartIcon className="text-lilac" />
            </div>
            <p className="font-display text-xl text-plum">Ready to catch some hearts?</p>
            {progress.best.hearts !== undefined && (
              <p className="text-sm text-plum-soft">Your best so far: {progress.best.hearts} points 🏆</p>
            )}
            <button type="button" className="btn btn-primary btn-lg btn-glow" onClick={start}>
              Start the game 💗
            </button>
          </div>
        )}

        {phase === "countdown" && (
          <div className="arena-overlay" aria-live="assertive">
            <span key={count} className="countdown">
              {count}
            </span>
          </div>
        )}

        {phase === "done" && (
          <div className="arena-overlay arena-result">
            <p className="result-kicker">Time&apos;s up!</p>
            <p className="big-score">
              {tally.score}
              <span>points</span>
            </p>
            <p className="text-sm text-plum-soft">
              {tally.hearts} hearts · {tally.rasgullas} rasgullas{newBest ? " · New best! 🏆" : ""}
            </p>
            <p className="story-line small">You collected a few hearts. Here&apos;s one more… 💗</p>
            {revealed ? (
              <p className="surprise rise">{HEART_SURPRISE}</p>
            ) : (
              <button
                type="button"
                className="gift-heart"
                onClick={(event) => {
                  setRevealed(true);
                  sound.play("chime");
                  celebrate({ ...centerOf(event.currentTarget), count: 20 });
                }}
              >
                <HeartIcon aria-hidden />
                <span>Tap to open</span>
              </button>
            )}
          </div>
        )}
      </div>

      <ChapterNav nextLabel="Let's plan our first date 🍽️" ready={phase === "done"}>
        {phase === "done" && (
          <button type="button" className="btn btn-ghost btn-icon" onClick={start} aria-label="Play again" title="Play again">
            <ReplayIcon />
          </button>
        )}
      </ChapterNav>
    </div>
  );
}
