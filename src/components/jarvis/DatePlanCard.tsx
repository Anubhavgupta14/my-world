import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useRef } from "react";
import type { DatePlan } from "@/lib/jarvis/protocol";

const inr = (n: number) => `₹${Math.round(n || 0).toLocaleString("en-IN")}`;

export function DatePlanCard({ plan, onSend }: { plan: DatePlan; onSend?: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const stops = Array.isArray(plan.stops) ? plan.stops : [];
  const total = stops.reduce((s, x) => s + (Number(x.cost_inr) || 0), 0);

  useGSAP(
    () => {
      gsap.from(".stop", { x: -20, opacity: 0, duration: 0.5, stagger: 0.1, ease: "power3.out", delay: 0.15 });
    },
    { scope: root },
  );

  return (
    <div ref={root} className="overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.06] text-white backdrop-blur">
      <div className="bg-gradient-to-br from-[#ff6fa5]/30 via-[#8f6ee6]/25 to-[#4f9dff]/20 p-5">
        <p className="text-[11px] font-bold tracking-[0.16em] text-white/60 uppercase">Date plan · {plan.location}</p>
        <h3 className="mt-1 font-display text-2xl leading-tight font-semibold">{plan.title}</h3>
        <p className="mt-1 font-hand text-xl text-white/80">{plan.vibe}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
          <span className="rounded-full bg-white/15 px-3 py-1">
            {inr(plan.budget_min_inr)} – {inr(plan.budget_max_inr)} for two
          </span>
          <span className="rounded-full bg-white/10 px-3 py-1">{stops.length} stops</span>
        </div>
      </div>

      <ol className="relative space-y-4 p-5">
        <span className="absolute top-7 bottom-7 left-[6.3rem] w-px bg-white/15" />
        {stops.map((s, i) => (
          <li key={i} className="stop relative grid grid-cols-[4.2rem_1fr] gap-6">
            <span className="pt-0.5 text-right text-xs font-bold text-white/60 tabular-nums">{s.time}</span>
            <div className="relative">
              <span className="absolute top-1.5 -left-[0.95rem] h-2.5 w-2.5 rounded-full bg-[#ff8fbf] shadow-[0_0_10px_#ff8fbf]" />
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold leading-snug">{s.name}</p>
                <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-bold">{inr(s.cost_inr)}</span>
              </div>
              <p className="text-sm text-white/75">
                {s.activity}
                {s.area ? ` · ${s.area}` : ""}
              </p>
              {s.why && <p className="mt-0.5 text-xs text-white/55 italic">{s.why}</p>}
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([s.name, s.area, plan.location].filter(Boolean).join(", "))}`}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-block text-xs font-semibold text-[#8fe9ff]"
              >
                Open in Maps ↗
              </a>
            </div>
          </li>
        ))}
      </ol>

      {plan.tips && plan.tips.length > 0 && (
        <div className="mx-5 mb-4 rounded-2xl bg-white/5 p-3 text-xs text-white/70">
          {plan.tips.map((t, i) => (
            <p key={i}>✦ {t}</p>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 border-t border-white/10 px-5 py-4">
        <span className="text-xs text-white/60">
          Stops add up to <b className="text-white">{inr(total)}</b>
        </span>
        {onSend && (
          <button onClick={onSend} className="rounded-full bg-[#ff6fa5] px-4 py-2 text-sm font-bold text-white active:scale-95">
            Send to him 💌
          </button>
        )}
      </div>
    </div>
  );
}
