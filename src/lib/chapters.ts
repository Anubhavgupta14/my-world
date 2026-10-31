import type { GameId } from "./progress";

export type Sky = "dawn" | "dusk" | "night";

export interface ChapterMeta {
  id: string;
  title: string;
  short: string;
  emoji: string;
  sky: Sky;
  game?: GameId;
}

export const CHAPTERS: ChapterMeta[] = [
  { id: "welcome", title: "The Magical Welcome", short: "Welcome", emoji: "✨", sky: "dusk" },
  { id: "worlds", title: "Two Different Worlds", short: "Two Worlds", emoji: "🩺", sky: "dawn" },
  { id: "five-hours", title: "The Five-Hour Mystery", short: "Five Hours", emoji: "⏰", sky: "dusk" },
  { id: "today", title: "And Then, Today…", short: "Today", emoji: "📱", sky: "dawn", game: "today" },
  { id: "checkup", title: "A Quick Check-up", short: "Check-up", emoji: "🩺", sky: "dawn", game: "checkup" },
  { id: "report", title: "The Patient's Report", short: "His Report", emoji: "📋", sky: "dawn", game: "report" },
  { id: "hearts", title: "Catch the Hearts", short: "Catch the Hearts", emoji: "💗", sky: "dawn", game: "hearts" },
  { id: "pune", title: "Our First Date, Wherever It Is", short: "First Date", emoji: "🍽️", sky: "dusk", game: "pune" },
  { id: "distance", title: "The Distance Between Us", short: "The Distance", emoji: "🕸️", sky: "night", game: "distance" },
  { id: "playlist", title: "A Little Playlist for You", short: "Playlist", emoji: "🎶", sky: "dusk", game: "playlist" },
  { id: "galaxy", title: "The Little Universe of Possibilities", short: "Possibilities", emoji: "🪐", sky: "night", game: "galaxy" },
  { id: "prayer", title: "A Little Prayer", short: "A Prayer", emoji: "🪔", sky: "night", game: "prayer" },
  { id: "envelope", title: "The Secret Envelope", short: "Secret Envelope", emoji: "💌", sky: "night", game: "letter" },
  { id: "final", title: "The Final Question", short: "Final Question", emoji: "💗", sky: "night" },
];
