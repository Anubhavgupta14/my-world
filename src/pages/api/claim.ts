import type { NextApiRequest, NextApiResponse } from "next";
import { PEOPLE } from "@/lib/config";
import { mailConfig, mailError, sendMail } from "@/server/jarvis/mail";
import { reverseGeocode } from "@/server/jarvis/tools";
import { requireSession, sameOrigin } from "@/server/session";

export const config = { api: { bodyParser: { sizeLimit: "64kb" } } };

/**
 * A chocolate "claim" from the Chocolate Box: emails Anubhav the items she chose,
 * with her location (if her phone shared it) so he can surprise her with a delivery.
 * Honest by design: she sees the browser's own location prompt and a true
 * confirmation — nothing is captured behind a fake message.
 */

// Public endpoint behind the passcode, but still cap it.
const sent: number[] = [];
const MAX_PER_HOUR = 12;

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  if (!sameOrigin(req)) return res.status(403).json({ error: "Forbidden" });
  if (!requireSession(req, res)) return;

  if (!mailConfig().ready) {
    return res.status(503).json({ error: "Email isn't set up yet (GMAIL_USER / GMAIL_APP_PASSWORD)." });
  }

  const now = Date.now();
  while (sent.length && now - sent[0] > 3_600_000) sent.shift();
  if (sent.length >= MAX_PER_HOUR) return res.status(429).json({ error: "That's a lot of cravings! Give it a little while." });

  const body = req.body ?? {};
  const items = Array.isArray(body.items) ? body.items.map((x: unknown) => String(x).slice(0, 60)).slice(0, 20) : [];
  if (!items.length) return res.status(400).json({ error: "Pick at least one treat." });
  const note = typeof body.note === "string" ? body.note.slice(0, 300) : "";

  // Location is optional: she may have declined, or her device couldn't get a fix.
  let address: string | undefined;
  let mapsUrl: string | undefined;
  const loc = body.location;
  const locError = typeof body.locationError === "string" ? body.locationError.slice(0, 140) : "";
  if (loc && typeof loc.lat === "number" && typeof loc.lng === "number") {
    mapsUrl = `https://www.google.com/maps?q=${loc.lat},${loc.lng}`;
    address = await reverseGeocode(loc.lat, loc.lng);
  }

  const when = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });
  const html = `
  <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;margin:auto;background:#fff5ef;border-radius:24px;padding:28px;color:#2e1a2b">
    <p style="margin:0;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#806878">Chocolate Box · ${esc(PEOPLE.her)}</p>
    <h1 style="margin:8px 0 4px;font-size:26px">🍫 ${esc(PEOPLE.her)} is craving something</h1>
    <p style="margin:0 0 14px;color:#806878">Time to be a hero, ${esc(PEOPLE.him)}. 🛵</p>
    <div style="background:#fff;border-radius:18px;padding:18px">
      <h3 style="margin:0 0 8px;font-size:15px">She picked:</h3>
      <ul style="margin:0;padding-left:20px;font-size:16px;line-height:1.7">${items.map((i: string) => `<li>${esc(i)}</li>`).join("")}</ul>
    </div>
    ${note ? `<p style="margin:16px 0 0;font-style:italic">“${esc(note)}”</p>` : ""}
    ${
      address || mapsUrl
        ? `<h3 style="margin:22px 0 6px;font-size:15px">📍 Deliver to</h3>
           ${address ? `<p style="margin:0 0 10px">${esc(address)}</p>` : ""}
           ${mapsUrl ? `<a href="${mapsUrl}" style="display:inline-block;background:#e5487a;color:#fff;padding:11px 20px;border-radius:999px;text-decoration:none;font-weight:700">Open her location in Maps</a>` : ""}`
        : `<p style="margin:22px 0 0;color:#806878">No location this time${locError ? ` (${esc(locError)})` : ""} — ping her to ask where to send it.</p>`
    }
    <p style="margin:26px 0 0;font-size:13px;color:#806878">Claimed ${esc(when)} IST. She thinks it might just be a cute digital claim. Prove her wrong. 💗</p>
  </div>`;

  const text = [
    `${PEOPLE.her} is craving: ${items.join(", ")}`,
    note ? `Note: ${note}` : "",
    address ? `Deliver to: ${address}` : "",
    mapsUrl ? `Map: ${mapsUrl}` : `No location${locError ? ` (${locError})` : ""}.`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    await sendMail({ subject: `🍫 ${PEOPLE.her} is craving ${items[0]}${items.length > 1 ? ` +${items.length - 1}` : ""}`, html, text });
    sent.push(now);
    res.json({ ok: true, locationShared: Boolean(mapsUrl) });
  } catch (e) {
    res.status(502).json({ error: mailError(e) });
  }
}
