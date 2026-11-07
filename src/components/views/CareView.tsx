import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useRef } from "react";
import type { AppState, CycleInfo } from "@/lib/cycle";
import { GiftBox, HotWaterBag } from "../illustrations";
import { TOOLS, type ToolId } from "../ui";

export function CareView({
  state,
  info,
  openTool,
}: {
  state: AppState;
  info: CycleInfo | null;
  openTool: (t: ToolId) => void;
}) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.from(".reveal", { y: 30, opacity: 0, scale: 0.97, duration: 0.6, stagger: 0.07, ease: "power3.out" });
    },
    { scope: root },
  );

  const small: ToolId[] = ["call", "stretch", "game"];

  return (
    <div ref={root} className="space-y-5 pb-6">
      <header className="reveal pt-2">
        <p className="text-sm font-semibold text-ink-soft">Open 24/7 · Staffed by one (1) devoted Engineer</p>
        <h1 className="font-display text-[28px] leading-tight font-semibold">Comfort Corner</h1>
        {info?.onPeriod && (
          <p className="mt-2 inline-flex rounded-full bg-berry-soft px-3 py-1 text-xs font-bold text-berry">
            🌙 Cozy Season, day {info.periodDay}: everything here is on the house
          </p>
        )}
      </header>

      {/* Two hero tiles */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => openTool("chocolate")}
          className="reveal card relative flex h-56 flex-col justify-between overflow-hidden p-4 text-left"
          style={{ background: "linear-gradient(160deg, #fff, #f6e2d6)" }}
        >
          <div>
            <p className="font-display text-lg leading-tight font-semibold">Chocolate box</p>
            <p className="text-xs text-ink-soft">{state.treatsOpened} treats unwrapped</p>
          </div>
          <div className="float -mb-2 self-center">
            <GiftBox size={130} />
          </div>
        </button>
        <button
          onClick={() => openTool("hotbag")}
          className="reveal card relative flex h-56 flex-col justify-between overflow-hidden p-4 text-left"
          style={{ background: "linear-gradient(160deg, #fff, #ffe2d8)" }}
        >
          <div>
            <p className="font-display text-lg leading-tight font-semibold">Hot water bag</p>
            <p className="text-xs text-ink-soft">Hold to warm up</p>
          </div>
          <div className="float -mb-6 self-center [animation-delay:-1.2s]">
            <HotWaterBag warmth={0.75} size={96} />
          </div>
        </button>
      </div>

      <div className="space-y-3">
        {small.map((t) => (
          <button
            key={t}
            onClick={() => openTool(t)}
            className="reveal card flex w-full items-center gap-4 p-4 text-left active:scale-[0.98]"
          >
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-[20px] text-3xl" style={{ background: TOOLS[t].tint }}>
              {TOOLS[t].emoji}
            </span>
            <span className="flex-1">
              <span className="block font-display text-lg font-semibold">
                {t === "call" ? `Call ${state.settings.partnerName}` : TOOLS[t].title}
              </span>
              <span className="block text-sm text-ink-soft">
                {t === "game" && state.bestCrushScore > 0 ? `Best: ${state.bestCrushScore} cramps crushed` : TOOLS[t].sub}
              </span>
            </span>
            <span className="text-2xl text-ink-soft">›</span>
          </button>
        ))}
      </div>

      <p className="reveal px-4 text-center font-hand text-xl text-ink-soft">
        “Whatever hurts, I&apos;m one tap away.” — {state.settings.partnerName}
      </p>
    </div>
  );
}
