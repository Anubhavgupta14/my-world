import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useRef } from "react";
import { PHASES, type CycleInfo } from "@/lib/cycle";
import { buzz, burst } from "@/lib/fx";

const SIZE = 300;
const C = SIZE / 2;
const R = 122;
const STROKE = 24;
const CIRC = 2 * Math.PI * R;
const GAP = 5;

/** Where on the ring (in degrees, 0 = top) a cycle day sits. */
const angleFor = (day: number, len: number) => ((day - 0.5) / len) * 360;

function polar(deg: number, r = R) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: C + r * Math.cos(rad), y: C + r * Math.sin(rad) };
}

export function CycleRing({ info }: { info: CycleInfo }) {
  const root = useRef<HTMLDivElement>(null);
  const marker = useRef<SVGGElement>(null);
  const dayNum = useRef<HTMLSpanElement>(null);

  const len = info.cycleLength;
  const markerDay = Math.min(info.day, len);
  const target = angleFor(markerDay, len);
  const ovDay = len - 14;

  useGSAP(
    () => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.from(".ring-seg", {
        attr: { "stroke-dasharray": `0 ${CIRC}` },
        duration: 0.9,
        stagger: 0.12,
      })
        .fromTo(
          marker.current,
          { rotation: 0, svgOrigin: `${C} ${C}` },
          { rotation: target, svgOrigin: `${C} ${C}`, duration: 1.3, ease: "expo.out" },
          0.25,
        )
        .from(".ring-center > *", { y: 12, opacity: 0, stagger: 0.08, duration: 0.6 }, 0.3);
      const counter = { v: 1 };
      tl.to(
        counter,
        {
          v: info.day,
          duration: 1.2,
          ease: "expo.out",
          onUpdate: () => {
            if (dayNum.current) dayNum.current.textContent = String(Math.round(counter.v));
          },
        },
        0.3,
      );
    },
    { scope: root, dependencies: [info.cycleStart, info.day, len] },
  );

  const onTap = () => {
    buzz(15);
    if (root.current) burst(root.current, [info.phase.emoji, "💗", "✨"], 12);
    gsap.fromTo(
      root.current,
      { scale: 0.96 },
      { scale: 1, duration: 0.6, ease: "elastic.out(1, 0.4)" },
    );
  };

  const subline = info.onPeriod
    ? `Day ${info.periodDay} of your period`
    : info.daysUntilNext > 0
      ? `Period in ${info.daysUntilNext} day${info.daysUntilNext === 1 ? "" : "s"}`
      : info.daysUntilNext === 0
        ? "Period expected today"
        : `${-info.daysUntilNext} day${info.daysUntilNext === -1 ? "" : "s"} late`;

  const ovPos = polar(angleFor(ovDay, len), R + 30);
  const startPos = polar(angleFor(1, len), R + 30);

  return (
    <div ref={root} className="relative mx-auto aspect-square w-full max-w-[320px]">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-full w-full overflow-visible">
        {/* track */}
        <circle cx={C} cy={C} r={R} fill="none" stroke="var(--line)" strokeWidth={STROKE} opacity={0.7} />
        <g transform={`rotate(-90 ${C} ${C})`}>
          {info.segments.map((s) => {
            const from = ((s.from - 1) / len) * CIRC;
            const length = ((s.to - s.from + 1) / len) * CIRC - GAP;
            return (
              <circle
                key={s.phase}
                className="ring-seg"
                cx={C}
                cy={C}
                r={R}
                fill="none"
                stroke={PHASES[s.phase].color}
                strokeWidth={STROKE}
                strokeDasharray={`${Math.max(0, length)} ${CIRC}`}
                strokeDashoffset={-from - GAP / 2}
                opacity={s.phase === info.phase.id || (info.phase.id === "ovulation" && s.phase === "fertile") ? 1 : 0.5}
              />
            );
          })}
        </g>
        {/* little landmarks outside the ring */}
        <text x={startPos.x} y={startPos.y} textAnchor="middle" dominantBaseline="central" fontSize="18">
          🌙
        </text>
        <text x={ovPos.x} y={ovPos.y} textAnchor="middle" dominantBaseline="central" fontSize="18">
          🌟
        </text>
        {/* today marker */}
        <g ref={marker}>
          <circle cx={C} cy={C - R} r={STROKE / 2 + 7} fill="white" stroke="var(--ink)" strokeWidth={4} />
          <circle cx={C} cy={C - R} r={5} fill="var(--accent)" />
        </g>
      </svg>

      <button
        onClick={onTap}
        aria-label="Tap for a little sparkle"
        className="ring-center absolute inset-[22%] flex flex-col items-center justify-center rounded-full bg-white text-center shadow-[0_20px_40px_-20px_rgba(120,40,70,0.45)]"
      >
        <span className="eyebrow">Cycle day</span>
        <span className="font-display text-[64px] leading-none font-semibold tracking-tight text-accent">
          <span ref={dayNum}>{info.day}</span>
        </span>
        <span className="mt-1 font-display text-[15px] font-semibold">
          {info.phase.emoji} {info.phase.name}
        </span>
        <span className="mt-0.5 text-xs font-medium text-ink-soft">{subline}</span>
      </button>
    </div>
  );
}
