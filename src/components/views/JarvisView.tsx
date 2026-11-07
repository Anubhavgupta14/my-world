import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { PEOPLE } from "@/lib/config";
import type { AppState, CycleInfo } from "@/lib/cycle";
import { telLink } from "@/lib/cheer";
import type { DayKey } from "@/lib/dates";
import { buzz } from "@/lib/fx";
import { buildContext, clearChat, sendMessage, useChat, type Msg } from "@/lib/jarvis/agent";
import {
  canListen,
  isSpeaking,
  listen,
  onSpeakingChange,
  say,
  stopListening,
  stopSpeaking,
  unlockAudio,
} from "@/lib/jarvis/voice";
import { DatePlanCard } from "../jarvis/DatePlanCard";
import { Orb, type OrbState } from "../jarvis/Orb";
import type { ToolId } from "../ui";

const SUGGESTIONS = [
  "Plan a cozy date",
  "I want chocolates 🍫",
  "Call the Engineer",
  "I have cramps, help",
  "Tell him I miss him",
  "What's my cycle looking like?",
];

const PREFS_KEY = "d-tracker:jarvis-prefs";
function readPrefs(): { voice: boolean; handsFree: boolean } {
  try {
    const saved = JSON.parse(localStorage.getItem(PREFS_KEY) ?? "{}") as {
      voice?: boolean;
      handsFree?: boolean;
      v?: number;
    };
    // v2 turns follow-up listening on. Older saves had it off only because that was the default.
    if (saved.v !== 2) return { voice: saved.voice ?? true, handsFree: true };
    return { voice: saved.voice ?? true, handsFree: saved.handsFree ?? true };
  } catch {
    return { voice: true, handsFree: true };
  }
}

export function JarvisView({
  state,
  info,
  today,
  openTool,
}: {
  state: AppState;
  info: CycleInfo | null;
  today: DayKey;
  openTool: (t: ToolId) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const chat = useChat();
  const speaking = useSyncExternalStore(onSpeakingChange, isSpeaking, () => false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [draft, setDraft] = useState("");
  const [micError, setMicError] = useState("");
  const [prefs, setPrefs] = useState(readPrefs);
  const prefsRef = useRef(prefs);
  const mounted = useRef(true);
  const listeningRef = useRef(false);
  const listenGen = useRef(0);

  useEffect(() => {
    prefsRef.current = prefs;
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify({ ...prefs, v: 2 }));
    } catch {
      /* ignore */
    }
  }, [prefs]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      stopListening();
    };
  }, []);

  // Follow the conversation.
  const count = chat.msgs.length;
  useEffect(() => {
    if (count) window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
  }, [count, chat.status]);

  useGSAP(
    () => {
      if (count) gsap.from(".msg:last-child", { y: 18, opacity: 0, duration: 0.45, ease: "power3.out" });
    },
    { scope: root, dependencies: [count] },
  );

  const orbState: OrbState = listening ? "listening" : chat.busy ? "thinking" : speaking ? "speaking" : "idle";

  const submit = (text: string) => {
    const t = text.trim();
    if (!t || chat.busy) return;
    unlockAudio();
    stopSpeaking();
    setDraft("");
    buzz(8);
    void sendMessage(t, buildContext(state, info, today), {
      phone: state.settings.partnerPhone,
      openTool: (tool) => openTool(tool),
      onReply: async (reply) => {
        if (!prefsRef.current.voice) return;
        await say(reply);
        if (!prefsRef.current.handsFree || !mounted.current || isSpeaking()) return;
        // Let the speaker fade so the mic doesn't pick his own voice back up.
        await new Promise((r) => setTimeout(r, 450));
        if (!prefsRef.current.handsFree || !mounted.current || isSpeaking()) return;
        void talk();
      },
    });
  };

  async function talk() {
    unlockAudio();
    setMicError("");
    if (isSpeaking()) stopSpeaking();
    if (listeningRef.current) {
      listenGen.current++;
      stopListening();
      listeningRef.current = false;
      setListening(false);
      setInterim("");
      return;
    }
    if (!canListen()) {
      setMicError("Voice input isn't supported in this browser. Type instead, Miss Dhruvi.");
      return;
    }
    const gen = ++listenGen.current;
    buzz(15);
    listeningRef.current = true;
    setListening(true);
    setInterim("");
    try {
      const heard = await listen(setInterim);
      if (gen === listenGen.current && heard) submit(heard);
    } catch (e) {
      if (gen === listenGen.current) setMicError((e as Error).message);
    } finally {
      if (gen === listenGen.current) {
        listeningRef.current = false;
        setListening(false);
        setInterim("");
      }
    }
  }

  const statusLine = listening
    ? interim || "Listening…"
    : chat.busy
      ? chat.status || "Thinking…"
      : speaking
        ? "Speaking…"
        : chat.msgs.length
          ? "Tap the orb to talk"
          : "";

  const hasPhone = state.settings.partnerPhone.replace(/\D/g, "").length >= 8;

  return (
    <div ref={root} className="pb-28 text-white">
      {/* Header */}
      <header className="flex items-center justify-between pt-2">
        <div>
          <p className="font-display text-xl font-semibold tracking-[0.3em]">J.A.R.V.I.S.</p>
          <p className="text-xs text-white/55">Personal assistant to Miss {PEOPLE.her}</p>
        </div>
        <div className="flex gap-2">
          <Toggle
            on={prefs.voice}
            label={prefs.voice ? "Voice on" : "Voice off"}
            onClick={() => {
              if (prefs.voice) stopSpeaking();
              setPrefs((p) => ({ ...p, voice: !p.voice }));
            }}
          >
            {prefs.voice ? "🔊" : "🔇"}
          </Toggle>
          <Toggle
            on={prefs.handsFree}
            label="Conversation mode: listens after each reply, then stops if it's quiet"
            onClick={() => setPrefs((p) => ({ ...p, handsFree: !p.handsFree }))}
          >
            ∞
          </Toggle>
          {chat.msgs.length > 0 && (
            <Toggle on={false} label="Clear conversation" onClick={() => !chat.busy && clearChat()}>
              ⟲
            </Toggle>
          )}
        </div>
      </header>

      {/* Orb */}
      <div className={`flex flex-col items-center ${chat.msgs.length ? "pt-3 pb-2" : "pt-10 pb-4"}`}>
        <Orb state={orbState} size={chat.msgs.length ? 150 : 240} onClick={talk} />
        <p className="mt-4 min-h-[1.5rem] max-w-[320px] text-center text-sm font-medium text-white/70">{statusLine}</p>
        {micError && <p className="mt-1 text-center text-xs text-[#ff8fbf]">{micError}</p>}
      </div>

      {/* Empty state */}
      {chat.msgs.length === 0 && (
        <div className="text-center">
          <p className="font-display text-2xl leading-snug font-semibold">
            At your service,
            <br />
            Miss {PEOPLE.her}.
          </p>
          <p className="mx-auto mt-2 max-w-[300px] text-sm text-white/60">
            Tap the orb and talk to me. Plans, cravings, feelings, or a direct line to {PEOPLE.him}.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => submit(s)}
                className="rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-2 text-sm font-medium text-white/85 active:scale-95"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Conversation */}
      <div className="space-y-3">
        {chat.msgs.map((m) => (
          <div key={m.id} className="msg">
            <Message m={m} hasPhone={hasPhone} phone={state.settings.partnerPhone} onSend={submit} onSpeak={(t) => { unlockAudio(); void say(t); }} />
          </div>
        ))}
      </div>

      {/* Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(draft);
        }}
        className="fixed inset-x-0 bottom-[calc(5.6rem+var(--safe-bottom))] z-30 mx-auto flex max-w-[480px] items-center gap-2 px-4"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={chat.busy ? "Jarvis is working…" : "Type to Jarvis…"}
          className="h-12 min-w-0 flex-1 rounded-full border border-white/15 bg-[#1b1530]/90 px-5 text-[15px] text-white placeholder:text-white/40 backdrop-blur-xl outline-none focus:border-[#8fe9ff]/60"
          enterKeyHint="send"
        />
        {draft.trim() ? (
          <button type="submit" disabled={chat.busy} className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#ff6fa5] text-lg font-bold disabled:opacity-50" aria-label="Send">
            ➤
          </button>
        ) : (
          <button
            type="button"
            onClick={talk}
            className={`grid h-12 w-12 shrink-0 place-items-center rounded-full text-xl transition-colors ${listening ? "bg-[#ff5c93]" : "bg-gradient-to-br from-[#8fe9ff] to-[#4f9dff] text-[#0d0a1a]"}`}
            aria-label={listening ? "Stop listening" : "Speak"}
          >
            {listening ? "■" : "🎙"}
          </button>
        )}
      </form>
    </div>
  );
}

function Toggle({ on, label, onClick, children }: { on: boolean; label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={on}
      className={`grid h-10 w-10 place-items-center rounded-full border text-base transition-colors ${
        on ? "border-[#8fe9ff]/60 bg-[#8fe9ff]/15 text-[#8fe9ff]" : "border-white/15 bg-white/5 text-white/70"
      }`}
    >
      {children}
    </button>
  );
}

function Message({
  m,
  hasPhone,
  phone,
  onSend,
  onSpeak,
}: {
  m: Msg;
  hasPhone: boolean;
  phone: string;
  onSend: (t: string) => void;
  onSpeak: (t: string) => void;
}) {
  switch (m.kind) {
    case "user":
      return (
        <div className="flex justify-end">
          <p className="max-w-[82%] rounded-[22px] rounded-br-md bg-gradient-to-br from-[#ff6fa5] to-[#e5487a] px-4 py-2.5 text-[15px] leading-snug">
            {m.text}
          </p>
        </div>
      );
    case "jarvis":
      return (
        <div className="flex items-end gap-2">
          <div className="max-w-[86%] rounded-[22px] rounded-bl-md border border-white/10 bg-white/[0.07] px-4 py-3 backdrop-blur">
            <p className="mb-1 text-[10px] font-bold tracking-[0.2em] text-[#8fe9ff]/80">JARVIS</p>
            <p className="text-[15px] leading-relaxed whitespace-pre-wrap text-white/90">{m.text}</p>
          </div>
          <button onClick={() => onSpeak(m.text)} aria-label="Say it again" className="mb-1 text-white/40 active:scale-90">
            🔈
          </button>
        </div>
      );
    case "tool":
      return (
        <p className="flex items-center gap-2 pl-1 font-mono text-[12px] text-white/55">
          <span
            className={
              m.status === "run"
                ? "inline-block h-2 w-2 animate-ping rounded-full bg-[#ffd27a]"
                : m.status === "ok"
                  ? "text-[#7ff0c0]"
                  : "text-[#ff8fbf]"
            }
          >
            {m.status === "ok" ? "✓" : m.status === "err" ? "✕" : ""}
          </span>
          <span className="truncate">
            {m.label}
            {m.summary ? ` — ${m.summary}` : ""}
          </span>
        </p>
      );
    case "plan":
      return <DatePlanCard plan={m.plan} onSend={() => onSend(`Send this date plan (${m.plan.title}) to ${PEOPLE.him} as a date request.`)} />;
    case "call":
      return (
        <div className="flex items-center gap-3 rounded-[22px] border border-[#7ff0c0]/30 bg-[#7ff0c0]/10 p-4">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-[#7ff0c0]/20 text-2xl">📞</span>
          <div className="flex-1">
            <p className="font-semibold">Calling The Engineer</p>
            <p className="text-xs text-white/60">{m.reason ?? "Direct line, priority one."}</p>
          </div>
          {hasPhone && (
            <a href={telLink(phone)} className="rounded-full bg-[#7ff0c0] px-4 py-2 text-sm font-bold text-[#0d0a1a]">
              Call
            </a>
          )}
        </div>
      );
    case "error":
      return <p className="rounded-2xl bg-[#ff5c93]/15 px-4 py-3 text-sm text-[#ffb3cf]">{m.text}</p>;
  }
}
