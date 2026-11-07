import { useState } from "react";
import { CHAPTERS } from "@/lib/chapters";
import { PLANET_LINES } from "@/lib/content";
import { sound } from "@/lib/sound";
import { Envelope } from "../Envelope";
import { HeartIcon } from "../icons";
import { SecretStar } from "../SecretStar";
import { centerOf, useUniverse } from "../universe-context";

export default function Welcome() {
  const { go, progress, celebrate, toast, musicOn, sfxOn, enableAllSound, toggleMusic, toggleSfx } = useUniverse();
  const [spins, setSpins] = useState(0);
  const resumeAt = progress.last > 0 && progress.last < CHAPTERS.length ? progress.last : 0;
  const soundOn = musicOn || sfxOn;

  return (
    <div className="scene-inner welcome">
      <SecretStar id="welcome" className="left-[2%] bottom-[6%] sm:left-[6%]" />

      <div className="welcome-stage">
        <div className="planet-halo" aria-hidden />
        <button
          type="button"
          className={`planet-wrap ${spins > 0 ? (spins % 2 ? "spin-a" : "spin-b") : ""}`}
          aria-label="A tiny glowing planet. Tap to say hi."
          onClick={() => {
            sound.play("star");
            toast(PLANET_LINES[spins % PLANET_LINES.length], { icon: "🪐" });
            setSpins((s) => s + 1);
          }}
        >
          <span className="planet-ring back" aria-hidden />
          <span className="planet" aria-hidden />
          <span className="planet-ring front" aria-hidden />
          <span className="planet-orbit" aria-hidden>
            <HeartIcon className="planet-moon" />
          </span>
        </button>

        <button
          type="button"
          className="welcome-envelope"
          aria-label="A sealed envelope"
          onClick={() => {
            sound.play("tap");
            toast("Not yet! This envelope opens a little later in the journey. 😌💌", { icon: "💌" });
          }}
        >
          <Envelope size="sm" wiggle />
        </button>
      </div>

      <p className="hand-note rise" style={{ animationDelay: "150ms" }}>
        psst… this is for you
      </p>
      <h1 className="welcome-title rise" style={{ animationDelay: "280ms" }} tabIndex={-1} data-scene-heading>
        Hey Doctor! <span className="inline-block heartbeat">💗</span>
      </h1>
      <p className="welcome-lead rise" style={{ animationDelay: "440ms" }}>
        An Engineer has been working on something… and for once, it&apos;s not a software project.
      </p>

      <div className="welcome-actions rise" style={{ animationDelay: "620ms" }}>
        <button
          type="button"
          className="btn btn-primary btn-lg btn-glow"
          onClick={(event) => {
            celebrate({ ...centerOf(event.currentTarget), count: 22 });
            sound.play("success");
            go(1);
          }}
        >
          Enter Our Little Universe ✨
        </button>
        {resumeAt > 0 && (
          <button type="button" className="btn btn-ghost" onClick={() => go(resumeAt)}>
            Continue from Chapter {resumeAt + 1} →
          </button>
        )}
      </div>

      <div className="sound-chip rise" style={{ animationDelay: "780ms" }}>
        {soundOn ? (
          <>
            <span aria-hidden>🎶</span>
            <span>Sound is on.</span>
            <button
              type="button"
              className="btn-link"
              onClick={() => {
                if (musicOn) toggleMusic();
                if (sfxOn) toggleSfx();
              }}
            >
              Mute everything
            </button>
          </>
        ) : (
          <>
            <span aria-hidden>🎧</span>
            <span>Optional:</span>
            <button type="button" className="btn-link" onClick={enableAllSound}>
              turn on soft music &amp; sounds
            </button>
          </>
        )}
      </div>
    </div>
  );
}
