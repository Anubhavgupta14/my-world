import Image from "next/image";
import { useState } from "react";
import { SONGS } from "@/lib/content";
import { sound } from "@/lib/sound";
import { ChapterHeader, ChapterNav } from "../ui";
import { useUniverse } from "../universe-context";

export default function Playlist() {
  const { pauseMusic, completeGame } = useUniverse();
  const [playing, setPlaying] = useState<string | null>(null);

  return (
    <div className="scene-inner">
      <ChapterHeader
        title="A Little Playlist for You 🎶"
        subtitle="Songs that say what I sometimes can't. Tap one to play it."
      />

      <ul className="playlist">
        {SONGS.map((song, i) => (
          <li key={song.id} className={`song glass rise ${playing === song.id ? "playing" : ""}`} style={{ animationDelay: `${100 + i * 90}ms` }}>
            <div className="song-media">
              {playing === song.id ? (
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${song.id}?autoplay=1&rel=0&playsinline=1`}
                  title={`${song.title} — ${song.artist}`}
                  allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                  loading="lazy"
                />
              ) : (
                <button
                  type="button"
                  className="song-thumb"
                  onClick={() => {
                    sound.play("tap");
                    pauseMusic();
                    setPlaying(song.id);
                    completeGame("playlist");
                  }}
                  aria-label={`Play ${song.title} by ${song.artist}`}
                >
                  <Image
                    src={`https://i.ytimg.com/vi/${song.id}/hqdefault.jpg`}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 92vw, 600px"
                    className="song-img"
                  />
                  <span className="song-play" aria-hidden>
                    ▶
                  </span>
                </button>
              )}
            </div>
            <div className="song-info">
              <p className="song-title">{song.title}</p>
              <p className="song-artist">{song.artist}</p>
              <p className="song-note">{song.note}</p>
            </div>
          </li>
        ))}
      </ul>

      <ChapterNav nextLabel="Into the galaxy 🪐" ready={playing !== null} />
    </div>
  );
}
