import type { NextApiRequest, NextApiResponse } from "next";
import { PEOPLE } from "@/lib/config";
import type { GlowProfile, Look } from "@/lib/glow";
import type { Content, Part } from "@/lib/jarvis/protocol";
import {
  getGlowProfile,
  getSavedLooks,
  removeLook as dbRemoveLook,
  saveGlowProfile,
  saveLook as dbSaveLook,
} from "@/server/db";
import { generateJSON, generateStream } from "@/server/jarvis/gemini";
import { webSearch } from "@/server/jarvis/tools";
import { requireSession, sameOrigin } from "@/server/session";

export const config = { api: { bodyParser: { sizeLimit: "8mb" } }, maxDuration: 60 };

/* ---------- JSON schemas Gemini must fill ---------- */

const PRODUCT = {
  type: "OBJECT",
  properties: { type: { type: "STRING" }, suggestion: { type: "STRING" } },
  required: ["type", "suggestion"],
};
const LOOK = {
  type: "OBJECT",
  properties: {
    name: { type: "STRING" },
    vibe: { type: "STRING", description: "one short line" },
    difficulty: { type: "STRING", enum: ["easy", "medium", "glam"] },
    palette: { type: "ARRAY", items: { type: "STRING", description: "hex colour, e.g. #c94f7c" } },
    skin: { type: "STRING" },
    eyes: { type: "STRING" },
    lips: { type: "STRING" },
    cheeks: { type: "STRING" },
    extras: { type: "STRING" },
    products: { type: "ARRAY", items: PRODUCT },
  },
  required: ["name", "vibe", "difficulty", "palette", "skin", "eyes", "lips", "cheeks", "products"],
};
const LOOKS_SCHEMA = { type: "OBJECT", properties: { looks: { type: "ARRAY", items: LOOK } }, required: ["looks"] };
const TUTORIAL = {
  type: "OBJECT",
  properties: {
    title: { type: "STRING" },
    minutes: { type: "NUMBER" },
    steps: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: { title: { type: "STRING" }, detail: { type: "STRING" }, tip: { type: "STRING" } },
        required: ["title", "detail"],
      },
    },
    shopping: { type: "ARRAY", items: PRODUCT },
  },
  required: ["title", "minutes", "steps"],
};
const TUTORIAL_SCHEMA = TUTORIAL;
const RECREATE_SCHEMA = {
  type: "OBJECT",
  properties: { intro: { type: "STRING" }, tutorial: TUTORIAL },
  required: ["intro", "tutorial"],
};
const ANALYSIS_SCHEMA = {
  type: "OBJECT",
  properties: {
    summary: { type: "STRING" },
    undertone: { type: "STRING" },
    flatters: { type: "ARRAY", items: { type: "STRING" } },
    tips: { type: "ARRAY", items: { type: "STRING" } },
  },
  required: ["summary", "undertone", "flatters", "tips"],
};
const TREND_SCHEMA = {
  type: "OBJECT",
  properties: { summary: { type: "STRING" }, highlights: { type: "ARRAY", items: { type: "STRING" } } },
  required: ["summary", "highlights"],
};

/* ---------- Prompt ---------- */

function systemBase(profile: GlowProfile): string {
  const bits = [
    profile.skinTone && `skin tone: ${profile.skinTone}`,
    profile.undertone && `undertone: ${profile.undertone}`,
    profile.skinType && `skin type: ${profile.skinType}`,
    profile.eyeColour && `eyes: ${profile.eyeColour}`,
    profile.notes && `notes: ${profile.notes}`,
  ].filter(Boolean);
  return `You are Glow — a warm, expert makeup artist and beauty guide for ${PEOPLE.her}, who lives in India.
- Give practical, genuinely do-able advice. Favour widely-available Indian brands (Lakmé, Sugar, Maybelline, Nykaa Cosmetics, Iba, Colorbar, Swiss Beauty, MyGlamm) and note budget vs splurge where helpful.
- Be specific about shades and finishes; flatter her real features, never one-size-fits-all.
- Warm, encouraging, body-positive. Keep text tight — it's read on a phone.
- No medical/dermatological claims; for skin concerns suggest a patch test and a dermatologist.
${bits.length ? `Her profile — ${bits.join("; ")}. Tailor everything to this.` : `Her profile isn't set; give broadly flattering advice.`}`;
}

const userPart = (text: string): Content => ({ role: "user", parts: [{ text }] });

/** Turn a data URL into a Gemini image part. Throws on anything that isn't a sane image. */
function imagePart(dataUrl: unknown): Part {
  if (typeof dataUrl !== "string") throw bad("No image provided.");
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!m) throw bad("That image format isn't supported (use a JPEG or PNG).");
  if (m[2].length > 8_000_000) throw bad("That image is too large.");
  return { inlineData: { mimeType: m[1], data: m[2] } };
}

class HttpError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
const bad = (m: string) => new HttpError(m, 400);

/* ---------- Handler ---------- */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  if (!sameOrigin(req)) return res.status(403).json({ error: "Forbidden" });
  if (!requireSession(req, res)) return;

  const mode = String(req.body?.mode ?? "");
  if (mode === "ask") return askStream(req, res);
  try {
    res.json(await run(mode, req.body ?? {}));
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 502;
    res.status(status).json({ error: friendly((e as Error).message) });
  }
}

/** Streams the "Ask Glow" reply as Server-Sent Events: {delta} fragments, then {done} or {error}. */
async function askStream(req: NextApiRequest, res: NextApiResponse) {
  const question = String(req.body?.question ?? "").trim().slice(0, 1000);
  if (!question) return res.status(400).json({ error: "Ask me something!" });

  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();
  const send = (obj: Record<string, unknown>) => res.write(`data: ${JSON.stringify(obj)}\n\n`);

  try {
    const profile = await getGlowProfile();
    const system = `${systemBase(profile)}
Answer in 2-5 short sentences, friendly and specific. You may use simple markdown — **bold** for product names/shades and "- " bullet lists for steps — but no headings.`;
    await generateStream({ systemInstruction: system, contents: [userPart(question)] }, (delta) => send({ delta }));
    send({ done: true });
  } catch (e) {
    send({ error: friendly((e as Error).message) });
  } finally {
    res.end();
  }
}

function friendly(msg: string) {
  if (/429|quota|RESOURCE_EXHAUSTED/i.test(msg)) return "Glow has used up today's AI quota. Try again later, or ask Anubhav to top up the Gemini plan.";
  if (/timed out|overloaded|UNAVAILABLE|503/i.test(msg)) return "The beauty AI is a little busy. Give it a moment and try again.";
  return msg;
}

async function run(mode: string, body: Record<string, unknown>) {
  // These two don't need the model.
  if (mode === "state") {
    const [profile, saved] = await Promise.all([getGlowProfile(), getSavedLooks()]);
    return { profile, saved: saved.map((r) => r.payload as unknown as Look) };
  }
  if (mode === "saveProfile") {
    await saveGlowProfile((body.profile as Record<string, unknown>) ?? {});
    return { ok: true };
  }
  if (mode === "saveLook") {
    const look = body.look as Look;
    if (!look?.id) throw bad("Invalid look.");
    await dbSaveLook(look.id, look as unknown as Record<string, unknown>);
    return { ok: true };
  }
  if (mode === "removeLook") {
    await dbRemoveLook(String(body.id ?? ""));
    return { ok: true };
  }

  const profile = await getGlowProfile();
  const system = systemBase(profile);

  switch (mode) {
    case "trends": {
      const occasion = typeof body.occasion === "string" ? body.occasion : "";
      const q = occasion ? `${occasion} makeup trends 2026 India looks` : "makeup trends 2026 latest popular looks";
      const search = await webSearch({ query: q });
      const live = !search.error;
      const context = live
        ? `Live web results (summarise and adapt for her):\n${(search.results as { title: string; snippet: string }[] | undefined)?.map((r) => `- ${r.title}: ${r.snippet}`).join("\n") ?? ""}\n${search.answer ? `Overview: ${search.answer}` : ""}`
        : "Live web search is unavailable; use your own up-to-date knowledge and keep it general.";
      const json = await generateJSON<{ summary: string; highlights: string[] }>({
        systemInstruction: system,
        contents: [
          userPart(
            `${context}\n\nGive a short "trending now" beauty brief for ${occasion || "right now"}, tailored to her. ` +
              `A 1-2 sentence summary, then 4-6 punchy highlight bullets she can actually try. JSON only.`,
          ),
        ],
        schema: TREND_SCHEMA,
      });
      const sources = dedupeSources((search.results as { title: string; url: string }[] | undefined) ?? []);
      return { trend: { ...json, sources, live } };
    }

    case "looks": {
      const occasion = String(body.occasion ?? "everyday");
      const note = typeof body.note === "string" ? body.note.slice(0, 300) : "";
      const json = await generateJSON<{ looks: Look[] }>({
        systemInstruction: system,
        contents: [
          userPart(
            `Suggest 4 distinct makeup looks for: ${occasion}.${note ? ` She also says: "${note}".` : ""} ` +
              `Range from easy to glam. For each: a catchy name, a one-line vibe, difficulty, a palette of 3-5 hex colours, ` +
              `and concrete skin/eyes/lips/cheeks directions plus a short product list. JSON only.`,
          ),
        ],
        schema: LOOKS_SCHEMA,
      });
      return { looks: json.looks.map((l) => ({ ...l, occasion, id: makeId(l.name) })) };
    }

    case "tutorial": {
      const look = body.look as Look;
      if (!look?.name) throw bad("Pick a look first.");
      const tutorial = await generateJSON({
        systemInstruction: system,
        contents: [
          userPart(
            `Write a step-by-step tutorial for this look:\n${JSON.stringify({
              name: look.name,
              vibe: look.vibe,
              skin: look.skin,
              eyes: look.eyes,
              lips: look.lips,
              cheeks: look.cheeks,
              extras: look.extras,
            })}\n` +
              `6-10 clear steps in order (prep → base → eyes → cheeks → lips → set), each with a short detail and an optional tip. ` +
              `Give a realistic total minutes and a short shopping list. JSON only.`,
          ),
        ],
        schema: TUTORIAL_SCHEMA,
      });
      return { tutorial };
    }

    case "recreate": {
      const part = imagePart(body.image);
      const note = typeof body.note === "string" ? body.note.slice(0, 300) : "";
      const out = await generateJSON<{ intro: string; tutorial: unknown }>({
        systemInstruction: system,
        contents: [
          {
            role: "user",
            parts: [
              part,
              {
                text:
                  `This is an inspiration photo of a makeup look.${note ? ` She adds: "${note}".` : ""} ` +
                  `In "intro", describe the look in 1-2 warm sentences and how to adapt it for her. ` +
                  `In "tutorial", give an ordered step-by-step to recreate it (prep → base → eyes → cheeks → lips → set) with realistic minutes and a short shopping list. ` +
                  `If the photo has no visible makeup/face, say so kindly in intro and give a gentle general look instead. JSON only.`,
              },
            ],
          },
        ],
        schema: RECREATE_SCHEMA,
      });
      return out;
    }

    case "analyze": {
      const part = imagePart(body.image);
      const analysis = await generateJSON({
        systemInstruction: system,
        contents: [
          {
            role: "user",
            parts: [
              part,
              {
                text:
                  `This is a selfie of ${PEOPLE.her}. Give kind, flattering, honest guidance: a warm 1-2 sentence summary, ` +
                  `your best read of her undertone, 3-4 colours/looks that would flatter her, and 3-4 practical tips. ` +
                  `Be body-positive and non-judgmental. If it's not a clear face photo, say so kindly. JSON only.`,
              },
            ],
          },
        ],
        schema: ANALYSIS_SCHEMA,
      });
      return { analysis };
    }

    default:
      throw bad("Unknown request.");
  }
}

function makeId(name: string): string {
  return `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}-${Math.random().toString(36).slice(2, 7)}`;
}

function dedupeSources(results: { title: string; url: string }[]): { title: string; url: string }[] {
  const seen = new Set<string>();
  const out: { title: string; url: string }[] = [];
  for (const r of results) {
    if (!r.url || seen.has(r.url)) continue;
    seen.add(r.url);
    out.push({ title: r.title || new URL(r.url).host, url: r.url });
    if (out.length >= 5) break;
  }
  return out;
}
