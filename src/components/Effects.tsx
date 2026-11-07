import { useEffect, useRef, type CSSProperties } from "react";
import { CloseIcon } from "./icons";
import { useReducedMotion } from "@/lib/useReducedMotion";

export interface Particle {
  id: number;
  glyph: string;
  x: number;
  y: number;
  dx: number;
  dy: number;
  rot: number;
  size: number;
  delay: number;
  dur: number;
}

export interface Burst {
  id: number;
  mode: "burst" | "rain";
  particles: Particle[];
}

export interface ToastData {
  id: number;
  message: string;
  title?: string;
  icon?: string;
}

export function BurstLayer({ bursts }: { bursts: Burst[] }) {
  return (
    <div className="burst-layer" aria-hidden>
      {bursts.map((burst) =>
        burst.particles.map((p) => (
          <span
            key={`${burst.id}-${p.id}`}
            className={burst.mode === "rain" ? "rain-particle" : "burst-particle"}
            style={
              {
                left: `${p.x}px`,
                top: `${p.y}px`,
                fontSize: `${p.size}px`,
                "--dx": `${p.dx}px`,
                "--dy": `${p.dy}px`,
                "--rot": `${p.rot}deg`,
                animationDelay: `${p.delay}ms`,
                animationDuration: `${p.dur}ms`,
              } as CSSProperties
            }
          >
            {p.glyph}
          </span>
        )),
      )}
    </div>
  );
}

export function Toast({ data, onClose }: { data: ToastData | null; onClose: () => void }) {
  return (
    <div className="toast-region" role="status" aria-live="polite">
      {data && (
        <div key={data.id} className="toast glass">
          {data.icon && (
            <span className="toast-icon" aria-hidden>
              {data.icon}
            </span>
          )}
          <div className="flex-1">
            {data.title && <p className="toast-title">{data.title}</p>}
            <p className="toast-message">{data.message}</p>
          </div>
          <button type="button" className="toast-close" onClick={onClose} aria-label="Dismiss message">
            <CloseIcon width={18} height={18} />
          </button>
        </div>
      )}
    </div>
  );
}

const STREAKS = Array.from({ length: 16 }, (_, i) => ({
  angle: (360 / 16) * i + (i % 2 ? 7 : -5),
  delay: (i % 4) * 40,
  length: 28 + ((i * 37) % 30),
}));

/** A soft star-streak "warp" that plays between chapters. */
export function Warp() {
  return (
    <div className="warp" aria-hidden>
      <div className="warp-flash" />
      {STREAKS.map((s, i) => (
        <span
          key={i}
          className="warp-streak"
          style={
            {
              "--angle": `${s.angle}deg`,
              "--len": `${s.length}vmax`,
              animationDelay: `${s.delay}ms`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

/** Gentle sparkle trail for mouse/trackpad users only. */
export function SparkleCursor() {
  const layer = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const host = layer.current;
    if (!host || reduced || !window.matchMedia("(pointer: fine)").matches) return;
    const colors = ["#ff9cc2", "#c9a7ff", "#ffe2a0", "#ffffff"];
    let last = 0;
    let count = 0;

    function onMove(event: PointerEvent) {
      if (event.pointerType !== "mouse") return;
      const now = performance.now();
      if (now - last < 45 || !host) return;
      last = now;
      const dot = document.createElement("span");
      dot.className = "cursor-sparkle";
      dot.style.left = `${event.clientX}px`;
      dot.style.top = `${event.clientY}px`;
      dot.style.color = colors[count++ % colors.length];
      dot.style.setProperty("--dx", `${(Math.random() - 0.5) * 30}px`);
      dot.style.setProperty("--dy", `${10 + Math.random() * 24}px`);
      dot.addEventListener("animationend", () => dot.remove(), { once: true });
      host.appendChild(dot);
    }

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      host.replaceChildren();
    };
  }, [reduced]);

  return <div ref={layer} className="cursor-layer" aria-hidden />;
}
