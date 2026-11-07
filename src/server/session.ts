import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextApiRequest, NextApiResponse } from "next";

/**
 * Passcode "login": she enters APP_PASSCODE once per device and gets a signed,
 * HttpOnly cookie valid for a year. Changing APP_PASSCODE signs everyone out.
 */

const COOKIE = "dt_session";
const MAX_AGE_S = 365 * 24 * 60 * 60;

function secret(): string {
  const pass = process.env.APP_PASSCODE;
  if (!pass) throw new Error("APP_PASSCODE missing in .env");
  return process.env.SESSION_SECRET || `${pass}|${process.env.SUPABASE_SECRET_KEY ?? ""}|d-tracker`;
}

const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest("base64url");

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function passcodeMatches(input: string): boolean {
  const pass = process.env.APP_PASSCODE ?? "";
  // Compare HMACs so lengths always match and timing reveals nothing.
  return Boolean(pass) && safeEqual(sign(`pc:${input}`), sign(`pc:${pass}`));
}

function readCookie(req: NextApiRequest): string | undefined {
  return req.cookies?.[COOKIE];
}

export function hasSession(req: NextApiRequest): boolean {
  try {
    const token = readCookie(req);
    if (!token) return false;
    const [v, iat, sig] = token.split(".");
    if (v !== "v1" || !iat || !sig) return false;
    if (!safeEqual(sig, sign(`v1.${iat}`))) return false;
    return Date.now() / 1000 - Number(iat) < MAX_AGE_S;
  } catch {
    return false;
  }
}

export function startSession(req: NextApiRequest, res: NextApiResponse) {
  const iat = Math.floor(Date.now() / 1000).toString();
  const secure = req.headers["x-forwarded-proto"] === "https" || process.env.NODE_ENV === "production";
  res.setHeader(
    "Set-Cookie",
    `${COOKIE}=v1.${iat}.${sign(`v1.${iat}`)}; Path=/; Max-Age=${MAX_AGE_S}; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`,
  );
}

/** For API routes: returns true if allowed, otherwise sends 401 and returns false. */
export function requireSession(req: NextApiRequest, res: NextApiResponse): boolean {
  if (hasSession(req)) return true;
  res.status(401).json({ error: "locked" });
  return false;
}

/** Same-origin guard: browsers send Origin on cross-site requests. */
export function sameOrigin(req: NextApiRequest) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    return new URL(origin).host === req.headers.host;
  } catch {
    return false;
  }
}

/* Slow down passcode guessing: 8 tries per 10 minutes per IP. */
const attempts = new Map<string, number[]>();
export function tooManyAttempts(req: NextApiRequest): boolean {
  const ip = String(req.headers["x-forwarded-for"] ?? req.socket.remoteAddress ?? "?").split(",")[0].trim();
  const now = Date.now();
  const list = (attempts.get(ip) ?? []).filter((t) => now - t < 10 * 60_000);
  list.push(now);
  attempts.set(ip, list);
  return list.length > 8;
}
