import Image from "next/image";
import { useEffect, useEffectEvent, useState, type CSSProperties } from "react";
import { KEY_LINE, LETTER } from "@/lib/content";
import { sound } from "@/lib/sound";
import { Envelope } from "../Envelope";
import { HEART_PATH, ReplayIcon } from "../icons";
import { SecretStar } from "../SecretStar";
import { ChapterHeader, ChapterNav } from "../ui";
import { useUniverse } from "../universe-context";

// Pre-compute the letter as code points so emoji never get split mid-typing.
const PARAGRAPHS = LETTER.split("\n\n").map((p) => Array.from(p));
const OFFSETS = PARAGRAPHS.reduce<number[]>((acc, p, i) => [...acc, i === 0 ? 0 : acc[i - 1] + PARAGRAPHS[i - 1].length], []);
const TOTAL = PARAGRAPHS.reduce((n, p) => n + p.length, 0);
const FLAT = PARAGRAPHS.flat();
const KEY_INDEX = PARAGRAPHS.findIndex((p) => p.join("") === KEY_LINE);
const KEY_END = OFFSETS[KEY_INDEX] + PARAGRAPHS[KEY_INDEX].length;
const SIGN_INDEX = PARAGRAPHS.findIndex((p) => p.join("").startsWith("Your friendly neighbourhood"));
const PS_INDEX = PARAGRAPHS.findIndex((p) => p.join("").startsWith("P.S."));
const PARA_ENDS = new Set(PARAGRAPHS.map((p, i) => OFFSETS[i] + p.length));

function delayAfter(i: number) {
  if (PARA_ENDS.has(i)) return i === OFFSETS[KEY_INDEX] ? 1300 : 460;
  const ch = FLAT[i - 1];
  if (".!?…".includes(ch)) return 220;
  if (",:".includes(ch)) return 110;
  return 15;
}

function paragraphClass(p: number) {
  if (p === 0) return "letter-greeting";
  if (p === KEY_INDEX) return "letter-key";
  if (p === SIGN_INDEX) return "letter-sign";
  if (p === SIGN_INDEX - 1) return "letter-closing";
  if (p === PS_INDEX) return "letter-ps";
  return "letter-p";
}

const LOVE_HEARTS = Array.from({ length: 12 }, (_, i) => ({
  left: (i * 83) % 100,
  size: 12 + ((i * 7) % 14),
  dur: 11 + ((i * 5) % 9),
  delay: -((i * 1.7) % 14),
}));

const DOCTOR_PHOTO = "https://res.cloudinary.com/dhlsvwpny/image/upload/v1793473071/D_ygdss4.png";

type Phase = "sealed" | "opening" | "letter";

export default function SecretEnvelope() {
  const { reduced, celebrate, completeGame } = useUniverse();
  const [phase, setPhase] = useState<Phase>("sealed");
  const [typed, setTyped] = useState(0);
  const [skipped, setSkipped] = useState(false);
  const [run, setRun] = useState(0);

  const finished = typed >= TOTAL;
  const keyDone = typed >= KEY_END;

  function openEnvelope() {
    if (phase !== "sealed") return;
    sound.play("open");
    setTyped(reduced ? TOTAL : 0);
    setPhase("opening");
    setTimeout(() => setPhase("letter"), reduced ? 0 : 1900);
  }

  useEffect(() => {
    if (phase !== "letter" || skipped || reduced) return;
    let i = 0;
    let timer: ReturnType<typeof setTimeout>;
    const step = () => {
      i += 1;
      setTyped(i);
      if (i < TOTAL) timer = setTimeout(step, delayAfter(i));
    };
    timer = setTimeout(step, 700);
    return () => clearTimeout(timer);
  }, [phase, skipped, reduced, run]);

  const onKeyLine = useEffectEvent(() => {
    if (skipped || reduced) return;
    sound.play("chime");
    celebrate({ mode: "rain", count: 24 });
  });
  useEffect(() => {
    if (keyDone && phase === "letter") onKeyLine();
  }, [keyDone, phase]);

  const onFinished = useEffectEvent(() => completeGame("letter"));
  useEffect(() => {
    if (finished && phase === "letter") onFinished();
  }, [finished, phase]);

  const caretAt = finished ? -1 : PARAGRAPHS.findIndex((p, i) => typed < OFFSETS[i] + p.length);

  return (
    <div className="scene-inner">
      {phase === "letter" && (
        <div className="love-rain" aria-hidden>
          {LOVE_HEARTS.map((h, i) => (
            <svg
              key={i}
              viewBox="0 0 24 24"
              style={
                {
                  left: `${h.left}%`,
                  width: h.size,
                  height: h.size,
                  animationDuration: `${h.dur}s`,
                  animationDelay: `${h.delay}s`,
                } as CSSProperties
              }
            >
              <path d={HEART_PATH} fill="currentColor" />
            </svg>
          ))}
        </div>
      )}

      <ChapterHeader title="The Secret Envelope" />

      {phase !== "letter" ? (
        <div className="envelope-stage">
          <p className="envelope-teaser rise">Doctor, there&apos;s something I haven&apos;t told you yet…</p>
          <button
            type="button"
            className={`envelope-button ${phase === "opening" ? "opening" : ""}`}
            onClick={openEnvelope}
            aria-label="Open the envelope"
            disabled={phase === "opening"}
          >
            <Envelope size="lg" open={phase === "opening"} />
          </button>
          <p className="envelope-hint" aria-live="polite">
            {phase === "opening" ? "Opening… 💌" : "Tap the envelope to open it 💌"}
          </p>
        </div>
      ) : (
        <>
          <article className="letter-card" aria-label="A letter for Doctor">
            <div className="sr-only">
              {LETTER.split("\n\n").map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
            <div className="letter-paper" aria-hidden>
              {PARAGRAPHS.map((chars, p) => {
                const shown = Math.max(0, Math.min(chars.length, typed - OFFSETS[p]));
                const glow = p === KEY_INDEX && shown === chars.length ? "glow" : "";
                return (
                  <p key={p} className={`${paragraphClass(p)} ${glow}`}>
                    <span>{chars.slice(0, shown).join("")}</span>
                    {caretAt === p && <span className="caret" />}
                    <span className="ghost">{chars.slice(shown).join("")}</span>
                  </p>
                );
              })}

              <figure className={`polaroid ${finished ? "show" : ""}`}>
                <span className="tape" aria-hidden />
                <Image
                  src={DOCTOR_PHOTO}
                  alt=""
                  width={800}
                  height={1000}
                  sizes="(max-width: 640px) 46vw, 200px"
                  className="polaroid-img"
                />
                <figcaption>Dhruviii &amp; her wall of stars ✨</figcaption>
              </figure>
            </div>
            {finished && <SecretStar id="letter" className="letter-secret" />}
          </article>

          <div className="mt-4 flex justify-center">
            {!finished ? (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setSkipped(true);
                  setTyped(TOTAL);
                }}
              >
                Show the whole letter
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setSkipped(false);
                  setTyped(reduced ? TOTAL : 0);
                  setRun((r) => r + 1);
                }}
              >
                <ReplayIcon width={18} height={18} /> Read it again
              </button>
            )}
          </div>
        </>
      )}

      <ChapterNav nextLabel="One last question… 💗" ready={finished} />
    </div>
  );
}
