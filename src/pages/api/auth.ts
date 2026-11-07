import type { NextApiRequest, NextApiResponse } from "next";
import { hasSession, passcodeMatches, sameOrigin, startSession, tooManyAttempts } from "@/server/session";

/**
 * GET  → { unlocked: boolean }
 * POST { passcode } → sets the session cookie if it matches APP_PASSCODE.
 */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Cache-Control", "no-store");
  if (!process.env.APP_PASSCODE) {
    return res.status(500).json({ error: "APP_PASSCODE isn't set on the server (.env)." });
  }
  if (req.method === "GET") return res.json({ unlocked: hasSession(req) });
  if (req.method !== "POST") return res.status(405).json({ error: "GET or POST" });
  if (!sameOrigin(req)) return res.status(403).json({ error: "Forbidden" });
  if (tooManyAttempts(req)) return res.status(429).json({ error: "Too many tries. Wait a few minutes." });

  const passcode = String(req.body?.passcode ?? "").trim().slice(0, 100);
  if (!passcodeMatches(passcode)) return res.status(401).json({ error: "That's not it." });

  startSession(req, res);
  res.json({ unlocked: true });
}
