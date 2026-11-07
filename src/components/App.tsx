import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useEffect, useRef, useState } from "react";
import { getCycleInfo } from "@/lib/cycle";
import { buzz } from "@/lib/fx";
import { useAppState, useToday } from "@/lib/store";
import { CalendarIcon, HeartIcon, HomeIcon, SparkleIcon, WandIcon } from "./icons";
import { Sheet } from "./Sheet";
import { CallHim } from "./tools/CallHim";
import { ChocolateBox } from "./tools/ChocolateBox";
import { CrampCrusher } from "./tools/CrampCrusher";
import { HotBag } from "./tools/HotBag";
import { Stretches } from "./tools/Stretches";
import { TOOLS, type ToolId } from "./ui";
import { CalendarView } from "./views/CalendarView";
import { CareView } from "./views/CareView";
import { GlowView } from "./views/GlowView";
import { JarvisView } from "./views/JarvisView";
import { TodayView } from "./views/TodayView";

gsap.registerPlugin(useGSAP);

type Tab = "today" | "calendar" | "glow" | "jarvis" | "care";

const TABS: { id: Tab; label: string; Icon: typeof HomeIcon }[] = [
  { id: "today", label: "Today", Icon: HomeIcon },
  { id: "calendar", label: "Calendar", Icon: CalendarIcon },
  { id: "glow", label: "Glow", Icon: WandIcon },
  { id: "jarvis", label: "Jarvis", Icon: SparkleIcon },
  { id: "care", label: "Care", Icon: HeartIcon },
];

export default function App() {
  const state = useAppState();
  const today = useToday();
  const info = getCycleInfo(state, today);
  const phase = info?.phase.id ?? "period";

  const [tab, setTab] = useState<Tab>("today");
  const [tool, setTool] = useState<ToolId | null>(null);
  const [lastTool, setLastTool] = useState<ToolId>("chocolate");
  const view = useRef<HTMLDivElement>(null);

  // The whole app (including portalled sheets) is tinted by the current phase.
  // The Jarvis tab is a dark HUD; derived from the tab so nothing can get out of sync.
  const dark = tab === "jarvis";
  useEffect(() => {
    document.documentElement.toggleAttribute("data-dark", dark);
  }, [dark]);

  useEffect(() => {
    document.documentElement.dataset.phase = phase;
    const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", accent || "#e5487a");
  }, [phase]);

  useGSAP(
    () => {
      if (!view.current) return;
      gsap.fromTo(view.current, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out", clearProps: "transform" });
    },
    { dependencies: [tab] },
  );

  const goTab = (t: Tab) => {
    if (t === tab) return;
    buzz(6);
    setTab(t);
    window.scrollTo({ top: 0 });
  };

  const openTool = (t: ToolId) => {
    buzz(10);
    setLastTool(t);
    setTool(t);
  };

  const shownTool = tool ?? lastTool;
  const toolTitle = shownTool === "call" ? `Call ${state.settings.partnerName}` : TOOLS[shownTool].title;
  const activeIndex = TABS.findIndex((t) => t.id === tab);

  return (
    <>
      <div className={`app-backdrop ${dark ? "is-dark" : ""}`} />
      <main className="relative z-10 mx-auto min-h-dvh max-w-[480px] px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[calc(6.5rem+var(--safe-bottom))]">
        <div ref={view}>
          {tab === "today" && (
            <TodayView state={state} info={info} today={today} openTool={openTool} openJarvis={() => goTab("jarvis")} />
          )}
          {tab === "calendar" && <CalendarView state={state} info={info} today={today} />}
          {tab === "glow" && <GlowView />}
          {tab === "jarvis" && <JarvisView state={state} info={info} today={today} openTool={openTool} />}
          {tab === "care" && <CareView state={state} info={info} openTool={openTool} />}
        </div>
      </main>

      {/* Tab bar */}
      <nav className={`${dark ? "is-dark" : ""} fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[480px] px-4 pb-[calc(0.75rem+var(--safe-bottom))]`}>
        <div className="glass relative grid grid-cols-5 rounded-[28px] p-1.5 shadow-[0_14px_40px_-12px_rgba(90,30,60,0.35)]">
          <span
            className="absolute top-1.5 bottom-1.5 left-1.5 rounded-[22px] bg-accent-soft transition-transform duration-500 ease-[cubic-bezier(.2,1.4,.4,1)]"
            style={{ width: "calc((100% - 0.75rem) / 5)", transform: `translateX(${activeIndex * 100}%)` }}
          />
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => goTab(id)}
              aria-current={tab === id ? "page" : undefined}
              className={`relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-bold transition-colors ${
                tab === id ? "text-accent" : "text-ink-soft"
              }`}
            >
              <Icon width={22} height={22} strokeWidth={tab === id ? 2.4 : 2} />
              {label}
            </button>
          ))}
        </div>
      </nav>

      <Sheet
        open={tool !== null}
        onClose={() => setTool(null)}
        eyebrow="Comfort Corner"
        title={`${TOOLS[shownTool].emoji} ${toolTitle}`}
        full={shownTool === "stretch" || shownTool === "game" || shownTool === "chocolate"}
      >
        {shownTool === "chocolate" && <ChocolateBox settings={state.settings} />}
        {shownTool === "hotbag" && <HotBag />}
        {shownTool === "call" && <CallHim settings={state.settings} />}
        {shownTool === "stretch" && <Stretches settings={state.settings} />}
        {shownTool === "game" && <CrampCrusher best={state.bestCrushScore} />}
      </Sheet>
    </>
  );
}
