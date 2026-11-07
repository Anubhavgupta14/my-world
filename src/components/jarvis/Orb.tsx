import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useRef } from "react";
import { level } from "@/lib/jarvis/voice";

export type OrbState = "idle" | "listening" | "thinking" | "speaking";

const PALETTE: Record<OrbState, { a: string; b: string; glow: string }> = {
  idle: { a: "#8fe9ff", b: "#b49bff", glow: "rgba(143,233,255,0.45)" },
  listening: { a: "#ff8fbf", b: "#ff5c93", glow: "rgba(255,111,165,0.6)" },
  thinking: { a: "#ffd27a", b: "#ff9f5a", glow: "rgba(255,190,110,0.55)" },
  speaking: { a: "#7ff0ff", b: "#4f9dff", glow: "rgba(110,220,255,0.6)" },
};

const SPEED: Record<OrbState, number> = { idle: 1, listening: 1.6, thinking: 5, speaking: 2 };

/** The arc-reactor-ish HUD orb. Rings spin with the state; the core pulses with his voice. */
export function Orb({ state, size = 240, onClick }: { state: OrbState; size?: number; onClick?: () => void }) {
  const root = useRef<HTMLButtonElement>(null);
  const spins = useRef<gsap.core.Tween[]>([]);

  // Rings spin forever; only their speed changes.
  useGSAP(
    () => {
      spins.current = [
        gsap.to(".r1", { rotation: 360, duration: 40, repeat: -1, ease: "none", svgOrigin: "120 120" }),
        gsap.to(".r2", { rotation: -360, duration: 26, repeat: -1, ease: "none", svgOrigin: "120 120" }),
        gsap.to(".r3", { rotation: 360, duration: 14, repeat: -1, ease: "none", svgOrigin: "120 120" }),
        gsap.to(".r4", { rotation: -360, duration: 60, repeat: -1, ease: "none", svgOrigin: "120 120" }),
      ];
      gsap.fromTo(root.current, { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 1, ease: "expo.out" });
    },
    { scope: root },
  );

  useGSAP(
    () => {
      // Set directly (not tweened): this context reverts on every state change.
      spins.current.forEach((t) => t.timeScale(SPEED[state]));

      const core = root.current?.querySelector(".core");
      if (!core) return;
      if (state === "speaking") {
        // quickTo can't drive the "scale" shorthand, so drive both axes.
        const sx = gsap.quickTo(core, "scaleX", { duration: 0.12, ease: "power2.out" });
        const sy = gsap.quickTo(core, "scaleY", { duration: 0.12, ease: "power2.out" });
        const tick = () => {
          const s = 1 + level() * 0.45;
          sx(s);
          sy(s);
        };
        gsap.ticker.add(tick);
        return () => {
          gsap.ticker.remove(tick);
          gsap.to(core, { scale: 1, duration: 0.4 });
        };
      }
      if (state === "listening") {
        gsap.fromTo(".ripple", { scale: 0.55, opacity: 0.8 }, { scale: 1.35, opacity: 0, duration: 1.6, stagger: 0.5, repeat: -1, ease: "power1.out" });
        gsap.to(core, { scale: 1.08, duration: 0.6, yoyo: true, repeat: -1, ease: "sine.inOut" });
      } else if (state === "thinking") {
        gsap.to(core, { scale: 0.9, duration: 0.45, yoyo: true, repeat: -1, ease: "sine.inOut" });
        gsap.to(".orbit", { rotation: 360, duration: 1.4, repeat: -1, ease: "none", svgOrigin: "120 120" });
      } else {
        gsap.to(core, { scale: 1.04, duration: 2.4, yoyo: true, repeat: -1, ease: "sine.inOut" });
      }
    },
    { scope: root, dependencies: [state], revertOnUpdate: true },
  );

  const p = PALETTE[state];
  const ticks = Array.from({ length: 72 }, (_, i) => i);

  return (
    <button
      ref={root}
      onClick={onClick}
      aria-label={state === "listening" ? "Stop listening" : "Talk to Jarvis"}
      className="relative mx-auto grid place-items-center rounded-full"
      style={{ width: size, height: size }}
    >
      <div
        className="absolute inset-[18%] rounded-full blur-2xl transition-colors duration-700"
        style={{ background: p.glow }}
      />
      <svg viewBox="0 0 240 240" className="absolute inset-0 h-full w-full overflow-visible">
        <g className="r4" opacity="0.5">
          {ticks.map((i) => (
            <line
              key={i}
              x1="120"
              y1="6"
              x2="120"
              y2={i % 6 === 0 ? 16 : 11}
              stroke={p.a}
              strokeWidth={i % 6 === 0 ? 2 : 1}
              transform={`rotate(${i * 5} 120 120)`}
              style={{ transition: "stroke 0.7s" }}
            />
          ))}
        </g>
        <circle className="r1" cx="120" cy="120" r="100" fill="none" stroke={p.a} strokeWidth="1.5" strokeDasharray="3 7" opacity="0.7" style={{ transition: "stroke 0.7s" }} />
        <circle className="r2" cx="120" cy="120" r="88" fill="none" stroke={p.b} strokeWidth="3" strokeDasharray="70 18 8 18" strokeLinecap="round" opacity="0.85" style={{ transition: "stroke 0.7s" }} />
        <circle className="r3" cx="120" cy="120" r="76" fill="none" stroke={p.a} strokeWidth="1.5" strokeDasharray="120 40" opacity="0.6" style={{ transition: "stroke 0.7s" }} />
        {state === "thinking" && (
          <g className="orbit">
            <circle cx="120" cy="32" r="4" fill={p.a} />
            <circle cx="120" cy="208" r="3" fill={p.b} />
          </g>
        )}
        {state === "listening" &&
          [0, 1, 2].map((i) => (
            <circle key={i} className="ripple" cx="120" cy="120" r="70" fill="none" stroke={p.a} strokeWidth="2" style={{ transformOrigin: "120px 120px" }} />
          ))}
      </svg>
      <div
        className="core relative rounded-full"
        style={{
          width: size * 0.42,
          height: size * 0.42,
          background: `radial-gradient(circle at 35% 30%, #fff 0%, ${p.a} 28%, ${p.b} 70%, rgba(0,0,0,0) 100%)`,
          boxShadow: `0 0 40px 6px ${p.glow}, inset 0 0 24px rgba(255,255,255,0.5)`,
          transition: "background 0.7s, box-shadow 0.7s",
        }}
      />
    </button>
  );
}
