import gsap from "gsap";
import { useEffect, useRef, useState } from "react";
import { buzz, burst } from "@/lib/fx";
import { HotWaterBag } from "../illustrations";

const FILL_SECONDS = 2.6;
const COZY_MINUTES = 20;

const LINES = [
  "Press & hold to fill it up",
  "Filling with warm water…",
  "Getting toasty…",
  "Almost there, hold on!",
  "Cozy level: MAXIMUM",
];

export function HotBag() {
  const bag = useRef<HTMLButtonElement>(null);
  const proxy = useRef({ w: 0 });
  const tween = useRef<gsap.core.Tween | null>(null);
  const [warmth, setWarmth] = useState(0);
  const [ready, setReady] = useState(false);
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  // Kill any running fill tween if the sheet closes mid-hold.
  useEffect(() => () => void tween.current?.kill(), []);

  const start = () => {
    if (ready) return;
    buzz(8);
    tween.current?.kill();
    tween.current = gsap.to(proxy.current, {
      w: 1,
      duration: FILL_SECONDS * (1 - proxy.current.w),
      ease: "none",
      onUpdate: () => setWarmth(proxy.current.w),
      onComplete: () => {
        setReady(true);
        buzz([20, 60, 30]);
        if (bag.current) {
          burst(bag.current, ["♨️", "💗", "✨", "🔥"], 16);
          gsap.fromTo(bag.current, { scale: 0.9 }, { scale: 1, duration: 0.8, ease: "elastic.out(1, 0.35)" });
        }
      },
    });
    gsap.to(bag.current, { scale: 1.04, duration: 0.2 });
  };

  const stop = () => {
    if (ready) return;
    tween.current?.kill();
    tween.current = gsap.to(proxy.current, {
      w: 0,
      duration: proxy.current.w * 1.2,
      ease: "power1.in",
      onUpdate: () => setWarmth(proxy.current.w),
    });
    gsap.to(bag.current, { scale: 1, duration: 0.3 });
  };

  useEffect(() => {
    if (!endsAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [endsAt]);

  const remaining = endsAt ? Math.max(0, endsAt - now) : 0;
  const mm = String(Math.floor(remaining / 60000)).padStart(2, "0");
  const ss = String(Math.floor((remaining % 60000) / 1000)).padStart(2, "0");
  const line = ready ? LINES[4] : LINES[Math.min(3, Math.ceil(warmth * 3))];

  const refill = () => {
    proxy.current.w = 0;
    setWarmth(0);
    setReady(false);
    setEndsAt(null);
  };

  return (
    <div className="flex flex-col items-center pb-4 text-center">
      <div className="relative mt-2">
        {ready && (
          <div className="pointer-events-none absolute -top-6 left-1/2 flex -translate-x-1/2 gap-3 text-2xl text-peach">
            <span className="steam">〰</span>
            <span className="steam">〰</span>
            <span className="steam">〰</span>
          </div>
        )}
        <button
          ref={bag}
          className={`select-none touch-none ${ready ? "float" : ""}`}
          onPointerDown={start}
          onPointerUp={stop}
          onPointerLeave={stop}
          onPointerCancel={stop}
          onContextMenu={(e) => e.preventDefault()}
          style={{ WebkitTouchCallout: "none" }}
          aria-label="Press and hold to warm up the hot water bag"
        >
          <HotWaterBag warmth={warmth} size={190} />
        </button>
      </div>

      <div className="mt-4 h-3 w-56 overflow-hidden rounded-full bg-white shadow-inner">
        <div
          className="h-full rounded-full bg-gradient-to-r from-sun via-peach to-berry"
          style={{ width: `${warmth * 100}%` }}
        />
      </div>
      <p className="mt-3 font-display text-xl font-semibold">{line}</p>

      {ready ? (
        <div className="mt-4 w-full space-y-3">
          <div className="card p-4 text-left">
            <p className="font-semibold">Place it on your lower tummy or lower back.</p>
            <p className="mt-1 text-sm text-ink-soft">
              Wrap it in a towel, never straight on skin. 15–20 minutes is perfect. (You know this. I just like
              saying it.)
            </p>
          </div>
          {endsAt ? (
            <div className="card p-5">
              <p className="eyebrow">Cozy timer</p>
              <p className="font-display text-5xl font-semibold tabular-nums text-accent">
                {remaining > 0 ? `${mm}:${ss}` : "Done! 🎉"}
              </p>
              <p className="mt-1 text-sm text-ink-soft">
                {remaining > 0 ? "No getting up. That's an order." : "Time for a refill, or a nap."}
              </p>
            </div>
          ) : (
            <button className="btn btn-primary w-full" onClick={() => setEndsAt(Date.now() + COZY_MINUTES * 60_000)}>
              ⏱️ Start {COZY_MINUTES}-min cozy timer
            </button>
          )}
          <button className="btn btn-ghost w-full" onClick={refill}>
            Empty & refill
          </button>
        </div>
      ) : (
        <p className="mt-1 text-sm text-ink-soft">Keep your finger on the bag. Please don&apos;t microwave the phone.</p>
      )}
    </div>
  );
}
