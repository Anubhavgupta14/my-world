import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useCallback, useEffect, useRef, useState } from "react";
import { buzz, burst } from "@/lib/fx";
import { hydrateChat, importLegacyChat, readLegacyChat } from "@/lib/jarvis/agent";
import { hydrate, importLegacy, readLegacy } from "@/lib/store";
import { loadSnapshot, setOnLocked, unlock, useSyncStatus } from "@/lib/sync";
import App from "./App";

type Phase = { kind: "loading" } | { kind: "locked" } | { kind: "error"; message: string } | { kind: "ready" };

/** Loads her data from Supabase (asking for the passcode first if needed), then shows the app. */
export default function Gate() {
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });

  const boot = useCallback(async () => {
    setPhase({ kind: "loading" });
    const r = await loadSnapshot();
    if (r.kind === "locked") return setPhase({ kind: "locked" });
    if (r.kind === "error") return setPhase({ kind: "error", message: r.message });

    hydrate(r.data);
    hydrateChat(r.data.messages);

    // First run after the move to Supabase: bring old on-device data along (only into an empty database).
    const empty = !r.data.periods.length && !r.data.logs.length && !r.data.messages.length;
    if (empty) {
      const legacy = readLegacy();
      if (legacy) void importLegacy(legacy);
      const legacyChat = readLegacyChat();
      if (legacyChat) void importLegacyChat(legacyChat);
    }
    setPhase({ kind: "ready" });
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- kicking off the initial async load
    void boot();
    setOnLocked(() => setPhase({ kind: "locked" }));
  }, [boot]);

  if (phase.kind === "ready")
    return (
      <>
        <App />
        <SyncPill />
      </>
    );

  return (
    <>
      <div className="app-backdrop" />
      <div className="relative z-10 mx-auto flex min-h-dvh max-w-[480px] flex-col items-center justify-center px-6 text-center">
        {phase.kind === "loading" && (
          <span className="float text-5xl" aria-label="Loading">
            💗
          </span>
        )}
        {phase.kind === "locked" && <Lock onUnlocked={boot} />}
        {phase.kind === "error" && (
          <div className="card w-full p-6">
            <p className="text-4xl">🛠️</p>
            <p className="mt-3 font-display text-xl font-semibold">Couldn&apos;t load your data</p>
            <p className="mt-2 text-sm text-ink-soft">{phase.message}</p>
            <button className="btn btn-primary mt-5" onClick={boot}>
              Try again
            </button>
          </div>
        )}
      </div>
    </>
  );
}

function Lock({ onUnlocked }: { onUnlocked: () => void }) {
  const root = useRef<HTMLFormElement>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useGSAP(() => {
    gsap.from(".lock-in > *", { y: 24, opacity: 0, duration: 0.6, stagger: 0.08, ease: "power3.out" });
  }, { scope: root });

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Grab the element now: React clears e.currentTarget once we await.
    const form = e.currentTarget;
    if (!code.trim() || busy) return;
    setBusy(true);
    setError("");
    const r = await unlock(code.trim());
    setBusy(false);
    if (r.ok) {
      buzz([20, 50, 20]);
      burst(form, ["💗", "✨", "🌙"], 18);
      setTimeout(onUnlocked, 500);
    } else {
      buzz([60, 40, 60]);
      setError(r.error ?? "That's not it.");
      setCode("");
      gsap.fromTo(root.current, { x: -10 }, { x: 0, duration: 0.5, ease: "elastic.out(1.2, 0.3)" });
    }
  };

  return (
    <form ref={root} onSubmit={submit} className="card lock-in w-full p-7">
      <p className="float inline-block text-5xl">🌙</p>
      <h1 className="mt-3 font-display text-2xl font-semibold">Hi Doctor</h1>
      <p className="mt-1 text-sm text-ink-soft">Enter the passcode. You only need to do this once on this phone.</p>
      <input
        type="password"
        inputMode="numeric"
        autoComplete="current-password"
        autoFocus
        value={code}
        onChange={(e) => setCode(e.target.value)}
        className="date-input mt-5 text-center tracking-[0.5em]"
        aria-label="Passcode"
        placeholder="••••"
      />
      {error && <p className="mt-2 text-sm font-semibold text-berry">{error}</p>}
      <button type="submit" disabled={busy} className="btn btn-primary mt-5 w-full disabled:opacity-60">
        {busy ? "Checking…" : "Unlock 💗"}
      </button>
    </form>
  );
}

/** A small pill when changes haven't reached the server yet. */
function SyncPill() {
  const status = useSyncStatus();
  if (status !== "offline") return null;
  return (
    <div className="fixed top-[max(0.75rem,env(safe-area-inset-top))] left-1/2 z-[60] -translate-x-1/2 rounded-full bg-ink/85 px-4 py-1.5 text-xs font-semibold text-white shadow-lg">
      Offline · will save when you&apos;re back
    </div>
  );
}
