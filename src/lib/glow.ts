/** Shared types + client calls for the Glow (makeup assistant) tab. */

export interface GlowProfile {
  skinTone?: string; // Fair / Wheatish / Medium / Dusky / Deep
  undertone?: string; // Warm / Cool / Neutral
  skinType?: string; // Oily / Dry / Combination / Normal / Sensitive
  eyeColour?: string; // Dark brown / Brown / Hazel / Black
  notes?: string; // allergies, dislikes, favourites
}

export interface Product {
  type: string; // e.g. "Liquid lipstick"
  suggestion: string; // shade / finish, India-friendly brand ideas
}

export type Difficulty = "easy" | "medium" | "glam";

export interface Look {
  id: string;
  name: string;
  vibe: string;
  occasion?: string;
  difficulty: Difficulty;
  palette: string[]; // hex colours for the little swatch row
  skin: string;
  eyes: string;
  lips: string;
  cheeks: string;
  extras?: string;
  products: Product[];
}

export interface Step {
  title: string;
  detail: string;
  tip?: string;
}

export interface Tutorial {
  title: string;
  minutes: number;
  steps: Step[];
  shopping: Product[];
}

export interface Trend {
  summary: string;
  highlights: string[];
  sources: { title: string; url: string }[];
  live: boolean; // false if we couldn't reach the live web
}

export interface Analysis {
  summary: string;
  undertone: string;
  flatters: string[];
  tips: string[];
}

export const OCCASIONS = [
  { id: "everyday", label: "Everyday", emoji: "☀️" },
  { id: "date", label: "Date night", emoji: "💗" },
  { id: "diwali", label: "Diwali", emoji: "🪔" },
  { id: "wedding", label: "Wedding guest", emoji: "💍" },
  { id: "party", label: "Party", emoji: "🎉" },
  { id: "work", label: "Work", emoji: "💼" },
  { id: "navratri", label: "Navratri", emoji: "💃" },
  { id: "nomakeup", label: "No-makeup", emoji: "🌿" },
];

export const PROFILE_FIELDS = {
  skinTone: { label: "Skin tone", options: ["Fair", "Wheatish", "Medium", "Dusky", "Deep"] },
  undertone: { label: "Undertone", options: ["Warm", "Cool", "Neutral", "Not sure"] },
  skinType: { label: "Skin type", options: ["Oily", "Dry", "Combination", "Normal", "Sensitive"] },
  eyeColour: { label: "Eye colour", options: ["Black", "Dark brown", "Brown", "Hazel"] },
} as const;

/* ---------- Client calls ---------- */

async function post<T>(mode: string, payload: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch("/api/glow", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ mode, ...payload }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? `Something went wrong (${res.status}).`);
  return json as T;
}

export const glow = {
  state: () => post<{ profile: GlowProfile; saved: Look[] }>("state"),
  saveProfile: (profile: GlowProfile) => post<{ ok: true }>("saveProfile", { profile }),
  trends: (occasion?: string) => post<{ trend: Trend }>("trends", { occasion }),
  looks: (occasion: string, note?: string) => post<{ looks: Look[] }>("looks", { occasion, note }),
  tutorial: (look: Look) => post<{ tutorial: Tutorial }>("tutorial", { look }),
  /** Streams the reply; `onText` is called with the full answer-so-far each time. Resolves with the final text. */
  ask: askStream,
  recreate: (image: string, note?: string) => post<{ intro: string; tutorial: Tutorial }>("recreate", { image, note }),
  analyze: (image: string) => post<{ analysis: Analysis }>("analyze", { image }),
  saveLook: (look: Look) => post<{ ok: true }>("saveLook", { look }),
  removeLook: (id: string) => post<{ ok: true }>("removeLook", { id }),
};

/** Ask Glow, streaming the answer. Calls `onText` with the accumulated reply as it grows. */
async function askStream(question: string, onText: (full: string) => void): Promise<string> {
  const res = await fetch("/api/glow", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ mode: "ask", question }),
  });
  if (!res.ok || !res.body) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error ?? `Something went wrong (${res.status}).`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let full = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let sep: number;
    while ((sep = buf.indexOf("\n\n")) >= 0) {
      const event = buf.slice(0, sep);
      buf = buf.slice(sep + 2);
      const line = event.split("\n").find((l) => l.startsWith("data:"));
      if (!line) continue;
      let obj: { delta?: string; error?: string; done?: boolean };
      try {
        obj = JSON.parse(line.slice(5).trim());
      } catch {
        continue;
      }
      if (obj.error) throw new Error(obj.error);
      if (obj.delta) {
        full += obj.delta;
        onText(full);
      }
    }
  }
  return full;
}

/** Downscale a selected image to a data-URL (max ~1024px, JPEG) before upload. */
export function fileToCompressed(file: File, max = 1024, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Couldn't read that image."));
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That file isn't a readable image."));
    };
    img.src = url;
  });
}
