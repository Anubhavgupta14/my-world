import Image from "next/image";
import { useState } from "react";
import rasgullaPhoto from "../../../public/images/rasgulla.jpg";
import { PHOTO_CREDITS, PUNE_MENU, type PuneItemId } from "@/lib/content";
import { sound } from "@/lib/sound";
import { SecretStar } from "../SecretStar";
import { ChapterHeader, ChapterNav } from "../ui";
import { centerOf, useUniverse } from "../universe-context";

const RASGULLA_PHOTO = {
  src: rasgullaPhoto,
  alt: "A steel plate piled with soft white rasgullas",
  credit: PHOTO_CREDITS.rasgulla,
} as const;

export default function PuneMenu() {
  const { celebrate, completeGame } = useUniverse();
  const [open, setOpen] = useState<PuneItemId | null>(null);
  const [tried, setTried] = useState<PuneItemId[]>([]);
  const all = tried.length === PUNE_MENU.length;
  const item = PUNE_MENU.find((m) => m.id === open);
  const photo = open === "rasgulla" ? RASGULLA_PHOTO : null;

  function choose(id: PuneItemId, el: HTMLElement) {
    setOpen(id);
    sound.play(id === "shopping" ? "star" : "pop");
    if (!tried.includes(id)) {
      const next = [...tried, id];
      setTried(next);
      celebrate({ ...centerOf(el), count: 10 });
      if (next.length === PUNE_MENU.length) {
        completeGame("pune");
        setTimeout(() => {
          sound.play("success");
          celebrate({ mode: "rain", count: 28 });
        }, 500);
      }
    }
  }

  return (
    <div className="scene-inner">
      <SecretStar id="pune" className="right-[2%] top-[22%]" />
      <ChapterHeader
        title="Our First Date, Wherever It Is 📍"
        subtitle="Pune? Panvel? Somewhere in between? Wherever our first date happens, here's a little khazoor menu. Tap everything, it's all on me. 😄"
      />

      <section className="menu-card" aria-labelledby="menu-title">
        <p id="menu-title" className="menu-title">
          Our Khazoor Menu
        </p>
        <p className="menu-sub">served with love by the Engineer · {tried.length}/{PUNE_MENU.length} tasted</p>

        <div className="menu-grid" role="group" aria-label="Menu items">
          {PUNE_MENU.map((m) => (
            <button
              key={m.id}
              type="button"
              className={`menu-item ${open === m.id ? "active" : ""} ${tried.includes(m.id) ? "tried" : ""}`}
              onClick={(event) => choose(m.id, event.currentTarget)}
              aria-pressed={open === m.id}
            >
              <span className="menu-emoji" aria-hidden>
                {m.id === "rasgulla" ? (
                  <Image src={rasgullaPhoto} alt="" sizes="48px" className="menu-thumb" />
                ) : (
                  m.emoji
                )}
              </span>
              <span className="min-w-0 text-left">
                <span className="menu-name">{m.name}</span>
                <span className="menu-tag">{m.tag}</span>
              </span>
              {tried.includes(m.id) && (
                <span className="menu-check" aria-label="tasted">
                  ✓
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="menu-detail" aria-live="polite">
          {item ? (
            <div key={item.id} className="rise">
              {photo && (
                <figure className="menu-photo">
                  <Image src={photo.src} alt={photo.alt} placeholder="blur" sizes="(max-width: 640px) 90vw, 560px" />
                  <figcaption>
                    <a href={photo.credit.href} target="_blank" rel="noopener noreferrer">
                      {photo.credit.text}
                    </a>
                  </figcaption>
                </figure>
              )}
              <p className="menu-message">{item.message}</p>
            </div>
          ) : (
            <p className="menu-placeholder">Pick something from the menu 👆</p>
          )}
        </div>
      </section>

      {all && (
        <p className="story-line rise">
          Plan saved: <span className="story-em">you &amp; me, wherever it is.</span> 📍💗
        </p>
      )}

      <ChapterNav nextLabel="About the distance… 🕸️" ready={all} />
    </div>
  );
}
