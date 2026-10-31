/* All the words in one place, so they are easy to tweak later. */

export const SECRETS: Record<string, string> = {
  welcome:
    "Hidden star found! You're very observant — must be the Doctor in you. 🩺✨",
  worlds:
    "Fun fact: this website has had more bugs fixed than any project I've shipped at work. Motivation matters. 🐞➡️💗",
  clock:
    "Psst… I may have replayed parts of that call in my head more times than I'd admit. 🙈",
  pune:
    "Every star in this universe was placed by hand. Slightly obsessive? Maybe. Worth it? Definitely. ✨",
  galaxy:
    "You've explored this place more carefully than any QA tester I've ever worked with. Gold medal. 🏅",
  letter:
    "A tiny confession inside the confession: I smiled the entire time I was building this. 😊",
};

export const SECRET_COUNT = Object.keys(SECRETS).length;

export const PLANET_LINES = [
  "Planet D-1 says hi! 👋 Population: one very important Doctor.",
  "Fun fact: this planet runs entirely on long conversations. 🌙",
  "Okay, okay — it's getting dizzy now. Maybe try the big button? ✨",
];

/* ---------- Chapter: A Quick Check-up (blood pressure) ---------- */

export const BP_READOUT: { text: string; tone?: "warn" | "love" | "ok" }[] = [
  { text: "Patient: The Engineer" },
  { text: "Booting HeartOS v1.0 … done ✓", tone: "ok" },
  { text: "Systolic / Diastolic: 142 / 91 mmHg" },
  { text: "Heart rate: 118 bpm (racing 💓)" },
  { text: "Status: Blood pressure slightly HIGH ⚠️", tone: "warn" },
  {
    text: "Reason: The man just found the first girl he has ever truly liked — and she is his dream girl. 💗",
    tone: "love",
  },
  { text: "Prescription: More conversations with Doctor. Dosage: every single day. 💊", tone: "ok" },
];

/* ---------- Chapter: The Patient's Report (cause of the Engineer's high BP = her qualities) ---------- */

export const REPORT: { test: string; result: string; emoji: string; negative?: boolean }[] = [
  { test: "Beauty", result: "Beautiful — inside and out", emoji: "✨" },
  { test: "Cuteness", result: "Dangerously high levels", emoji: "🥹" },
  { test: "Caring nature", result: "Comes to her naturally", emoji: "💗" },
  { test: "Family values", result: "Understands and loves her family", emoji: "🏡" },
  { test: "Respect", result: "Respects everyone, and is respected back", emoji: "🌷" },
  { test: "Helping others", result: "Always the first to help", emoji: "🤝" },
  { test: "Laughter", result: "Makes everyone around her laugh", emoji: "😄" },
  { test: "Understanding", result: "Truly understands people", emoji: "🫶" },
  { test: "Festival spirit", result: "Loves every single festival", emoji: "🪔" },
  { test: "Bad habits (drinking etc.)", result: "None found. Pure gold.", emoji: "🚫", negative: true },
];

/* ---------- Chapter: Catch the Hearts ---------- */

export const HEART_SURPRISE =
  "This heart doesn't count towards your score. It's just a thank-you — for the laughs, the stories, and five hours that somehow felt like twenty minutes. 💗";

/* ---------- Chapter: Our First Date, Wherever It Is ---------- */

export type PuneItemId = "chaat" | "dosa" | "movies" | "drives" | "rasgulla" | "shopping";

export const PUNE_MENU: { id: PuneItemId; name: string; emoji: string; tag: string; message: string }[] = [
  {
    id: "chaat",
    name: "Chaat",
    emoji: "🌶️",
    tag: "spicy & tangy",
    message:
      "Pani puri, bhel, sev puri — we'll find the best chaat stall in town and then argue about who ate more. 🌶️",
  },
  {
    id: "dosa",
    name: "Dosa",
    emoji: "🫓",
    tag: "crispy, with chutney",
    message: "Crispy dosa, coconut chutney, and conversations that go on long after the plates are empty. 🫓",
  },
  {
    id: "movies",
    name: "Movies",
    emoji: "🎬",
    tag: "popcorn on me",
    message:
      "Movie nights — you pick the film, I'll handle the popcorn (and I promise not to talk during the important scenes). 🎬",
  },
  {
    id: "drives",
    name: "Long drives",
    emoji: "🚗",
    tag: "windows down",
    message: "I can take you on long drives — windows down, our playlist on, no destination needed. 🚗💨",
  },
  {
    id: "rasgulla",
    name: "Rasgulla",
    emoji: "🤍",
    tag: "her favourite",
    message:
      "I heard someone here loves rasgulla. 😋 Unlimited supply, guaranteed — and you can always have the last one.",
  },
  {
    id: "shopping",
    name: "Shopping",
    emoji: "🛍️",
    tag: "lots of it",
    message:
      "And shopping — lots and lots of it! 🛍️ Markets, malls, street stalls… you pick, I'll carry all the bags. 😄",
  },
];

export const PHOTO_CREDITS = {
  rasgulla: {
    text: "Photo: Mdsmds0, CC BY-SA 4.0",
    href: "https://commons.wikimedia.org/wiki/File:Rasgulla_Sweet.JPG",
  },
};

/* ---------- Chapter: A Little Playlist ---------- */

// IDs verified against YouTube's oEmbed endpoint (exist + embeddable).
export const SONGS = [
  {
    id: "Feoea8FQTI0",
    title: "Tum Prem Ho",
    artist: "Mohit Lalwani · RadhaKrishn",
    note: "Because some love is pure and divine. 🪈",
  },
  {
    id: "FPoDwu3odT8",
    title: "O Sanam",
    artist: "Akhil Sachdeva ft. Sara Gurpal",
    note: "Soft, sweet, and exactly how I feel. 🌙",
  },
  {
    id: "iSUK1QoK9-E",
    title: "Pehla Nasha",
    artist: "Udit Narayan, Sadhana Sargam",
    note: "Because you're my first. Pehla nasha, pehla khumaar. 💗",
  },
  {
    id: "mt9xg0mmt28",
    title: "Tum Se Hi",
    artist: "Mohit Chauhan · Jab We Met",
    note: "Every good thing lately… tum se hi. ✨",
  },
  {
    id: "BddP6PYo2gs",
    title: "Kesariya",
    artist: "Arijit Singh · Brahmāstra",
    note: "For our long drives, with the windows down. 🚗",
  },
];

/* ---------- Chapter: The Little Universe of Possibilities ---------- */

export const POSSIBILITIES = [
  {
    id: "places",
    emoji: "🌍",
    title: "Exploring the world",
    message:
      "New cities, new streets, new stories — starting with Pune and Panvel, and then everywhere else. Together. 🌍",
    colors: ["#9fd8ff", "#7a8cf0"],
    x: 22,
    y: 20,
  },
  {
    id: "photos",
    emoji: "📸",
    title: "Your personal photographer",
    message:
      "I'll click your photos — candid ones, silly ones, beautiful ones, hundreds of them. And don't worry about space: my cloud has a very, very large memory. ☁️",
    colors: ["#b5f0de", "#5ab1a6"],
    x: 78,
    y: 17,
  },
  {
    id: "talks",
    emoji: "🌙",
    title: "Long conversations",
    message:
      "The kind that start with “okay, one last topic” and end with the clock quietly asking what we're still doing up.",
    colors: ["#c9b8ff", "#6c58c9"],
    x: 86,
    y: 53,
  },
  {
    id: "dreams",
    emoji: "🌷",
    title: "Supporting each other's dreams",
    message:
      "Your long shifts, my endless deadlines — cheering each other on through both, and celebrating every little win.",
    colors: ["#ffc2d6", "#d65a8e"],
    x: 68,
    y: 85,
  },
  {
    id: "festivals",
    emoji: "🪔",
    title: "Festivals together",
    message:
      "Diwali diyas, Holi colours, and all the sweets in between — rasgullas first, obviously. Every festival, together. 🪔",
    colors: ["#ffd7a8", "#e58f5a"],
    x: 26,
    y: 82,
  },
  {
    id: "laughs",
    emoji: "😂",
    title: "Laughing at silly things",
    message:
      "Because honestly, the best part of a five-hour call was never the clock. It was all the laughing in between.",
    colors: ["#fff1a8", "#f0a85f"],
    x: 12,
    y: 50,
  },
];

/* ---------- Chapter: The Secret Envelope ---------- */

/** The confession — the original wording, plus a P.S. */
export const LETTER = `Dear Dhruvi,

I don't know how to explain it perfectly, but I genuinely enjoy talking to you.

I like the way our thoughts connect, how one conversation turns into another, and how time seems to pass so quickly when we're talking.

I don't know exactly where this connection could go, and I don't want to rush anything.

I just know that I'd love to know you more, discover more of your world, make you smile, and create some genuinely beautiful memories together.

You know, you're a Doctor and I'm an Engineer. Maybe we have different ways of looking at the world, but I think that's what makes discovering each other's perspectives so interesting.

I'd love to explore new places, share random conversations, support each other's dreams, laugh at the silliest things, and enjoy this beautiful, crazy world together.

And there's one thing I want you to know:

I want to build something beautiful with you.

No pressure. No expectations. Just an honest feeling and a little invitation to see where this story takes us.

With a little courage and a lot of affection,

Your friendly neighbourhood Engineer 🕷️❤️

P.S. If I ever do something that hurts you, please forgive me. I never, ever want to lose you. 🤍`;

export const KEY_LINE = "I want to build something beautiful with you.";
