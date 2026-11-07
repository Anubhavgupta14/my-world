import type { NextApiRequest, NextApiResponse } from "next";
import { speak } from "@/server/jarvis/gemini";
import { requireSession, sameOrigin } from "@/server/session";

export const config = { maxDuration: 60 };

/** Turns Jarvis's reply into speech with Gemini TTS. Returns a WAV file. */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  if (!sameOrigin(req)) return res.status(403).json({ error: "Forbidden" });
  if (!requireSession(req, res)) return;

  const text = String(req.body?.text ?? "").trim().slice(0, 1500);
  if (!text) return res.status(400).json({ error: "No text" });

  try {
    const wav = await speak(text);
    res.setHeader("Content-Type", "audio/wav");
    res.setHeader("Cache-Control", "no-store");
    res.send(wav);
  } catch (e) {
    res.status(502).json({ error: (e as Error).message });
  }
}
