import { useEffect, useState } from "react";
import { sound } from "@/lib/sound";
import { ChapterHeader, ChapterNav } from "../ui";
import { centerOf, useUniverse } from "../universe-context";

type Step = "locked" | "chat" | "ringing" | "call" | "rcb";

const pad = (n: number) => String(n).padStart(2, "0");

export default function TodayCall() {
  const { celebrate, completeGame } = useUniverse();
  const [step, setStep] = useState<Step>("locked");
  const [seconds, setSeconds] = useState(0);

  const onCall = step === "call" || step === "rcb";

  useEffect(() => {
    if (!onCall) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [onCall]);

  return (
    <div className="scene-inner">
      <ChapterHeader title="And Then, Today…" subtitle="Two little things happened today that I can't stop smiling about." />

      <div className="phone" aria-live="polite">
        <div className="phone-notch" aria-hidden />

        {step === "locked" && (
          <div className="phone-screen lock">
            <p className="lock-time">7:30</p>
            <p className="lock-date">Today · Good morning</p>
            <div className="notif rise">
              <span className="notif-avatar" aria-hidden>
                D
              </span>
              <span className="min-w-0 flex-1">
                <span className="notif-name">
                  Doctor <span className="notif-when">now</span>
                </span>
                <span className="notif-text">Good morning ☀️</span>
              </span>
            </div>
          </div>
        )}

        {step === "chat" && (
          <div className="phone-screen chat">
            <p className="chat-head">Doctor 💗</p>
            <p className="chat-bubble them rise">Good morning ☀️</p>
            <p className="chat-bubble me rise" style={{ animationDelay: "600ms" }}>
              Good morning! ☀️ This just made my whole day. 🥹
            </p>
          </div>
        )}

        {step === "ringing" && (
          <div className="phone-screen ringing">
            <span className="call-avatar" aria-hidden>
              <span>🩺</span>
            </span>
            <p className="call-name">Doctor</p>
            <p className="call-sub">Incoming video call… 📹</p>
            <button
              type="button"
              className="call-accept"
              onClick={(event) => {
                sound.play("chime");
                celebrate({ ...centerOf(event.currentTarget), count: 16 });
                setStep("call");
              }}
            >
              <span aria-hidden>📹</span>
              <span className="sr-only">Accept the video call</span>
            </button>
            <p className="call-hint">Tap to accept</p>
          </div>
        )}

        {onCall && (
          <div className="phone-screen video">
            <p className="video-timer">
              <span className="rec-dot" aria-hidden /> {pad(Math.floor(seconds / 60))}:{pad(seconds % 60)}
            </p>
            <div className="video-main" aria-hidden>
              <span>🩺</span>
              <p>Doctor</p>
            </div>
            <div className="video-self" aria-hidden>
              <span>🙈</span>
              <p>Engineer (shy)</p>
            </div>
          </div>
        )}
      </div>

      <div className="today-text">
        {step === "locked" && (
          <button
            type="button"
            className="btn btn-primary btn-lg btn-glow"
            onClick={() => {
              sound.play("pop");
              setStep("chat");
            }}
          >
            Open her message 💬
          </button>
        )}

        {step === "chat" && (
          <>
            <p className="story-line rise">
              Your good morning message today
              <br />
              <span className="story-em">felt like heaven to me.</span> ☁️✨
            </p>
            <button
              type="button"
              className="btn btn-primary btn-glow"
              onClick={() => {
                sound.play("tap");
                setStep("ringing");
              }}
            >
              And then… 📹
            </button>
          </>
        )}

        {onCall && (
          <p className="story-line rise">
            Thank you for the video call today.
            <br />
            <span className="story-em">I was honestly too shy to ask for it…</span> 🙈💗
          </p>
        )}

        {step === "call" && (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              sound.play("pop");
              setStep("rcb");
              completeGame("today");
            }}
          >
            One more confession… 🏏
          </button>
        )}

        {step === "rcb" && (
          <div className="rcb-card rise">
            <p className="rcb-badge">❤️ RCB fan · since forever</p>
            <p className="rcb-text">
              I&apos;m an RCB fan — we waited <strong>18 long seasons</strong> for our first trophy and never once
              switched sides.
            </p>
            <p className="rcb-punch">Loyalty comes first. Always. That&apos;s the kind of loyalty you get from me. 🏏</p>
          </div>
        )}
      </div>

      <ChapterNav nextLabel="Doctor, a patient is waiting 🩺" ready={step === "rcb"} />
    </div>
  );
}
