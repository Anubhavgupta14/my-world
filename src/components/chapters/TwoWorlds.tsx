import { useState, type MouseEvent } from "react";
import { sound } from "@/lib/sound";
import { HeartIcon } from "../icons";
import { SecretStar } from "../SecretStar";
import { ChapterHeader, ChapterNav } from "../ui";
import { centerOf, useUniverse } from "../universe-context";

type Stage = "apart" | "merging" | "connected";

function Meter({ value, label }: { value: number; label: string }) {
  return (
    <span className="meter" role="img" aria-label={`${label}: ${value} out of 100`}>
      <span className="meter-fill" style={{ width: `${value}%` }} />
    </span>
  );
}

export default function TwoWorlds() {
  const { celebrate, reduced } = useUniverse();
  const [stage, setStage] = useState<Stage>("apart");

  function connect(event: MouseEvent<HTMLButtonElement>) {
    const point = centerOf(event.currentTarget);
    sound.play("whoosh");
    setStage("merging");
    setTimeout(
      () => {
        setStage("connected");
        sound.play("success");
        celebrate({ ...point, y: point.y - 120, count: 24 });
      },
      reduced ? 0 : 1100,
    );
  }

  return (
    <div className="scene-inner">
      <SecretStar id="worlds" className="right-[3%] top-[18%]" />
      <ChapterHeader title="Two Different Worlds" />

      <div className="worlds-grid">
        <article className="glass world-card doctor rise" style={{ animationDelay: "120ms" }}>
          <div className="avatar avatar-doctor" aria-hidden>
            <span className="avatar-emoji">🩺</span>
          </div>
          <div className="min-w-0">
            <h2 className="world-name">
              Doctor <span aria-hidden>🩺</span>
            </h2>
            <p className="world-line">Healing people, caring for hearts, and making a difference.</p>
            <svg className="ecg" viewBox="0 0 200 32" aria-hidden>
              <path d="M0 18h46l6-10 7 20 7-26 7 22 5-6h52l5-7 6 14 5-7h48" />
            </svg>
            <dl className="world-stats">
              <div>
                <dt>Kindness</dt>
                <dd>
                  <Meter value={100} label="Kindness" />
                </dd>
              </div>
              <div>
                <dt>Patience</dt>
                <dd>
                  <Meter value={96} label="Patience" />
                </dd>
              </div>
              <div>
                <dt>Handwriting</dt>
                <dd>classified 🤫</dd>
              </div>
            </dl>
          </div>
        </article>

        <article className="glass world-card engineer rise" style={{ animationDelay: "260ms" }}>
          <div className="avatar avatar-laptop" aria-hidden>
            <svg viewBox="0 0 64 64">
              <rect x="10" y="14" width="44" height="28" rx="4" className="laptop-screen" />
              <rect x="14" y="18" width="36" height="20" rx="2" className="laptop-glass" />
              <path d="M6 46h52l-4 6H10z" className="laptop-base" />
              <path d={"M32 34s-6-3.6-7.6-7.2c-1.1-2.4.2-5.4 3.1-5.7 1.7-.2 3.2.8 4.5 2.4 1.3-1.6 2.8-2.6 4.5-2.4 2.9.3 4.2 3.3 3.1 5.7C38 30.4 32 34 32 34z"} className="laptop-heart" />
            </svg>
          </div>
          <div className="min-w-0">
            <h2 className="world-name">
              Engineer <span aria-hidden>💻</span>
            </h2>
            <p className="world-line">Building things, solving bugs, and turning ideas into reality.</p>
            <code className="code-line" aria-hidden>
              while (talking) smile++;
            </code>
            <dl className="world-stats">
              <div>
                <dt>Debugging</dt>
                <dd>
                  <Meter value={90} label="Debugging" />
                </dd>
              </div>
              <div>
                <dt>Curiosity</dt>
                <dd>
                  <Meter value={98} label="Curiosity" />
                </dd>
              </div>
              <div>
                <dt>Sleep schedule</dt>
                <dd>404 not found 😅</dd>
              </div>
            </dl>
          </div>
        </article>
      </div>

      <div className={`worlds-stage ${stage}`} aria-hidden>
        <div className="worlds-link" />
        <div className="shared-galaxy">
          <HeartIcon className="shared-heart" />
        </div>
        <div className="arm arm-a">
          <span className="mini-world w-doc">
            <span>🩺</span>
          </span>
        </div>
        <div className="arm arm-b">
          <span className="mini-world w-eng">
            <span>💻</span>
          </span>
        </div>
      </div>

      {stage === "connected" ? (
        <>
          <p className="story-line rise">
            Two different worlds. Two different perspectives.
            <br />
            <span className="story-em">But somehow, conversations just flow.</span>
          </p>
          <ChapterNav nextLabel="A little mystery ⏰" />
        </>
      ) : (
        <div className="flex justify-center">
          <button
            type="button"
            className="btn btn-primary btn-lg btn-glow"
            onClick={connect}
            disabled={stage === "merging"}
          >
            {stage === "merging" ? "Connecting… ✨" : "Connect our worlds 🔗"}
          </button>
        </div>
      )}
    </div>
  );
}
