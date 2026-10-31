import { useState, type CSSProperties } from "react";
import { POSSIBILITIES } from "@/lib/content";
import { sound } from "@/lib/sound";
import { HeartIcon } from "../icons";
import { Modal } from "../Modal";
import { SecretStar } from "../SecretStar";
import { ChapterHeader, ChapterNav } from "../ui";
import { useUniverse } from "../universe-context";

export default function Possibilities() {
  const { completeGame, celebrate } = useUniverse();
  const [openId, setOpenId] = useState<string | null>(null);
  const [seen, setSeen] = useState<string[]>([]);
  const active = POSSIBILITIES.find((p) => p.id === openId);
  const allSeen = seen.length === POSSIBILITIES.length;

  function openPlanet(id: string) {
    sound.play("star");
    setOpenId(id);
    if (!seen.includes(id)) {
      const nextSeen = [...seen, id];
      setSeen(nextSeen);
      if (nextSeen.length === POSSIBILITIES.length) completeGame("galaxy");
    }
  }

  function close() {
    setOpenId(null);
  }

  return (
    <div className="scene-inner">
      <ChapterHeader
        title="The Little Universe of Possibilities"
        subtitle="Each little planet holds a possibility. Tap one to visit it."
      />

      <div className="galaxy" role="group" aria-label="Planets of possibility">
        <span className="orbit-ring r1" aria-hidden />
        <span className="orbit-ring r2" aria-hidden />
        <span className="orbit-ring r3" aria-hidden />
        <div className="galaxy-core" aria-hidden>
          <HeartIcon />
        </div>
        <SecretStar id="galaxy" className="galaxy-secret" />

        {POSSIBILITIES.map((planet, i) => (
          <button
            key={planet.id}
            type="button"
            className={`poss-planet ${seen.includes(planet.id) ? "visited" : ""}`}
            style={
              {
                left: `${planet.x}%`,
                top: `${planet.y}%`,
                "--c1": planet.colors[0],
                "--c2": planet.colors[1],
                animationDelay: `${i * -1.3}s`,
              } as CSSProperties
            }
            onClick={() => openPlanet(planet.id)}
            aria-haspopup="dialog"
          >
            <span className="poss-ball" aria-hidden>
              <span className="poss-emoji">{planet.emoji}</span>
            </span>
            <span className="poss-label">{planet.title}</span>
          </button>
        ))}
      </div>

      <p className="discover-count" aria-live="polite">
        {allSeen ? (
          <>Six little possibilities… and probably many more we haven&apos;t discovered yet. ✨</>
        ) : (
          <>
            {seen.length} of {POSSIBILITIES.length} planets visited
          </>
        )}
      </p>

      <Modal open={!!active} onClose={close} labelledBy="planet-title" className="modal-planet">
        {active && (
          <div className="text-center">
            <span
              className="poss-ball big"
              style={{ "--c1": active.colors[0], "--c2": active.colors[1] } as CSSProperties}
              aria-hidden
            >
              <span className="poss-emoji">{active.emoji}</span>
            </span>
            <h2 id="planet-title" className="mt-4 font-display text-2xl text-plum">
              {active.title}
            </h2>
            <p className="mt-3 text-[1.05rem] leading-relaxed text-plum">{active.message}</p>
            <button
              type="button"
              className="btn btn-primary mt-5 w-full"
              onClick={(event) => {
                const r = event.currentTarget.getBoundingClientRect();
                if (allSeen) celebrate({ x: r.left + r.width / 2, y: r.top, count: 20 });
                close();
              }}
            >
              {allSeen ? "All planets visited ✨" : "Back to the galaxy"}
            </button>
          </div>
        )}
      </Modal>

      <ChapterNav nextLabel="A little prayer 🪔" ready={allSeen} />
    </div>
  );
}
