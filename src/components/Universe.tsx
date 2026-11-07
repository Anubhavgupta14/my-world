import { useEffect, useRef, useState, type ComponentType } from "react";
import { CHAPTERS } from "@/lib/chapters";
import { updateProgress, useProgress, type GameId } from "@/lib/progress";
import { between } from "@/lib/random";
import { sound } from "@/lib/sound";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { Backdrop } from "./Backdrop";
import { BurstLayer, SparkleCursor, Toast, Warp, type Burst, type ToastData } from "./Effects";
import { JourneyMenu } from "./JourneyMenu";
import { TopBar } from "./TopBar";
import { UniverseContext, type CelebrateOptions, type ToastOptions, type UniverseApi } from "./universe-context";
import Welcome from "./chapters/Welcome";
import TwoWorlds from "./chapters/TwoWorlds";
import FiveHours from "./chapters/FiveHours";
import TodayCall from "./chapters/TodayCall";
import CheckUp from "./chapters/CheckUp";
import DoctorReport from "./chapters/DoctorReport";
import CatchHearts from "./chapters/CatchHearts";
import PuneMenu from "./chapters/PuneMenu";
import Distance from "./chapters/Distance";
import Playlist from "./chapters/Playlist";
import Possibilities from "./chapters/Possibilities";
import Prayer from "./chapters/Prayer";
import SecretEnvelope from "./chapters/SecretEnvelope";
import FinalQuestion from "./chapters/FinalQuestion";

// Must stay in the same order as CHAPTERS in lib/chapters.ts.
const SCENES: ComponentType[] = [
  Welcome,
  TwoWorlds,
  FiveHours,
  TodayCall,
  CheckUp,
  DoctorReport,
  CatchHearts,
  PuneMenu,
  Distance,
  Playlist,
  Possibilities,
  Prayer,
  SecretEnvelope,
  FinalQuestion,
];

const LEAVE_MS = 380;
const ENTER_MS = 720;
const GLYPHS = ["💗", "💖", "✨", "💕", "🌸", "⭐", "💜"];

type Phase = "idle" | "leaving" | "entering";

export default function Universe() {
  const progress = useProgress();
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [warpId, setWarpId] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [musicOn, setMusicOn] = useState(false);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [toastData, setToastData] = useState<ToastData | null>(null);

  const sceneRef = useRef<HTMLElement>(null);
  const busy = useRef(false);
  const focusPending = useRef(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const uid = useRef(0);

  // Keep the sound engine in sync with the saved effects preference.
  useEffect(() => {
    sound.setSfx(progress.sfx);
  }, [progress.sfx]);

  // Move focus to the new chapter's heading for keyboard & screen-reader users.
  useEffect(() => {
    if (!focusPending.current) return;
    focusPending.current = false;
    sceneRef.current?.querySelector<HTMLElement>("[data-scene-heading]")?.focus({ preventScroll: true });
  }, [index]);

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );

  function go(to: number) {
    const target = Math.max(0, Math.min(CHAPTERS.length - 1, to));
    if (busy.current || target === index) return;
    updateProgress((p) => ({ ...p, last: target, furthest: Math.max(p.furthest, target) }));
    sound.play("whoosh");
    setMenuOpen(false);
    focusPending.current = true;

    if (reduced) {
      setIndex(target);
      window.scrollTo(0, 0);
      return;
    }

    busy.current = true;
    setPhase("leaving");
    setWarpId((w) => w + 1);
    setTimeout(() => {
      setIndex(target);
      setPhase("entering");
      window.scrollTo(0, 0);
    }, LEAVE_MS);
    setTimeout(() => {
      setPhase("idle");
      busy.current = false;
    }, LEAVE_MS + ENTER_MS);
  }

  function celebrate({ x, y, count, mode = "burst" }: CelebrateOptions = {}) {
    if (reduced) return;
    const id = ++uid.current;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const n = count ?? (mode === "rain" ? 42 : 26);
    const particles = Array.from({ length: n }, (_, i) => {
      if (mode === "rain") {
        return {
          id: i,
          glyph: GLYPHS[i % GLYPHS.length],
          x: between(0, w),
          y: -40,
          dx: between(-60, 60),
          dy: h + 80,
          rot: between(-90, 90),
          size: between(16, 30),
          delay: between(0, 1800),
          dur: between(2600, 4200),
        };
      }
      const angle = (Math.PI * 2 * i) / n + between(-0.3, 0.3);
      const dist = between(60, 150);
      return {
        id: i,
        glyph: GLYPHS[i % GLYPHS.length],
        x: x ?? w / 2,
        y: y ?? h / 2,
        dx: Math.cos(angle) * dist,
        dy: Math.sin(angle) * dist - 30,
        rot: between(-120, 120),
        size: between(14, 24),
        delay: between(0, 90),
        dur: between(900, 1400),
      };
    });
    setBursts((list) => [...list, { id, mode, particles }]);
    setTimeout(() => setBursts((list) => list.filter((b) => b.id !== id)), mode === "rain" ? 6500 : 1700);
  }

  function toast(message: string, { title, icon, duration = 5200 }: ToastOptions = {}) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastData({ id: ++uid.current, message, title, icon });
    toastTimer.current = setTimeout(() => setToastData(null), duration);
  }

  function toggleMusic() {
    const on = !musicOn;
    setMusicOn(on);
    sound.setMusic(on);
  }

  function toggleSfx() {
    const on = !progress.sfx;
    sound.setSfx(on, true);
    updateProgress((p) => ({ ...p, sfx: on }));
  }

  function pauseMusic() {
    if (!musicOn) return;
    setMusicOn(false);
    sound.setMusic(false);
  }

  function enableAllSound() {
    sound.setSfx(true, true);
    updateProgress((p) => ({ ...p, sfx: true }));
    if (!musicOn) {
      setMusicOn(true);
      sound.setMusic(true);
    }
  }

  function completeGame(id: GameId) {
    updateProgress((p) => ({ ...p, completed: { ...p.completed, [id]: true } }));
  }

  const api: UniverseApi = {
    index,
    go,
    next: () => go(index + 1),
    back: () => go(index - 1),
    progress,
    reduced,
    musicOn,
    sfxOn: progress.sfx,
    toggleMusic,
    toggleSfx,
    pauseMusic,
    enableAllSound,
    celebrate,
    toast,
    completeGame,
  };

  const chapter = CHAPTERS[index];
  const Scene = SCENES[index];
  const sceneClass = phase === "leaving" ? "scene-leave" : phase === "entering" ? "scene-enter" : "";

  return (
    <UniverseContext.Provider value={api}>
      <div className="universe" data-sky={chapter.sky}>
        <Backdrop />
        <SparkleCursor />
        <TopBar onOpenMenu={() => setMenuOpen(true)} />

        <main ref={sceneRef} key={`scene-${index}`} id="scene" className={`scene ${sceneClass}`} aria-label={chapter.title}>
          <Scene />
        </main>

        {warpId > 0 && <Warp key={`warp-${warpId}`} />}
        <BurstLayer bursts={bursts} />
        <Toast data={toastData} onClose={() => setToastData(null)} />
        <JourneyMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
      </div>
    </UniverseContext.Provider>
  );
}
