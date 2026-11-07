import { PEOPLE } from "@/lib/config";
import { mailConfig, mailError, sendMail } from "./mail";

/* Server-side tools. Each returns a plain object that goes back to Gemini. */

type Result = Record<string, unknown>;

/* ---------- Tavily web search ---------- */

export async function webSearch(args: Record<string, unknown>): Promise<Result> {
  const key = process.env.TAVILY_API_KEY;
  if (!key)
    return {
      error:
        "Live web search is unavailable right now. Do NOT give up: carry on with your own knowledge of well-known, long-running places and finish the task (e.g. still call show_date_plan). Briefly mention prices and hours aren't live-checked.",
    };
  const query = String(args.query ?? "").slice(0, 400);
  if (!query) return { error: "Empty query" };
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({
        query,
        topic: args.topic === "news" ? "news" : "general",
        search_depth: "basic",
        max_results: 6,
        include_answer: true,
      }),
      signal: AbortSignal.timeout(20_000),
    });
    const json = await res.json();
    if (!res.ok) return { error: `Search failed: ${json.detail?.error ?? json.error ?? res.status}` };
    return {
      answer: json.answer,
      results: (json.results ?? []).map((r: { title: string; url: string; content: string }) => ({
        title: r.title,
        url: r.url,
        snippet: String(r.content ?? "").slice(0, 500),
      })),
    };
  } catch (e) {
    return { error: `Search failed: ${(e as Error).message}` };
  }
}

/* ---------- Reverse geocoding (OpenStreetMap) for get_location answers ---------- */

export async function reverseGeocode(lat: number, lng: number): Promise<string | undefined> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=16&lat=${lat}&lon=${lng}`,
      { headers: { "user-agent": "d-tracker-jarvis/1.0", "accept-language": "en" }, signal: AbortSignal.timeout(6000) },
    );
    if (!res.ok) return undefined;
    const json = await res.json();
    return json.display_name as string | undefined;
  } catch {
    return undefined;
  }
}

/* ---------- Email to Anubhav (Gmail SMTP) ---------- */

const CATEGORY: Record<string, { emoji: string; label: string }> = {
  chocolate: { emoji: "🍫", label: "Chocolate request" },
  food: { emoji: "🍜", label: "Food request" },
  flowers: { emoji: "💐", label: "Flower request" },
  hug: { emoji: "🫂", label: "Hug request" },
  miss_you: { emoji: "💗", label: "She misses you" },
  date_request: { emoji: "🗓️", label: "Date request" },
  sos: { emoji: "🚨", label: "SOS" },
  message: { emoji: "💌", label: "Message" },
};

// A deployed endpoint is public, so cap how many emails it can send.
const sent: number[] = [];
const MAX_PER_HOUR = 10;

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export async function sendToEngineer(args: Record<string, unknown>): Promise<Result> {
  if (!mailConfig().ready) {
    return { error: "Email isn't configured yet (GMAIL_USER / GMAIL_APP_PASSWORD missing). Suggest calling him instead." };
  }
  const now = Date.now();
  while (sent.length && now - sent[0] > 3_600_000) sent.shift();
  if (sent.length >= MAX_PER_HOUR) return { error: "Too many messages this hour. Suggest a call instead." };

  const cat = CATEGORY[String(args.category)] ?? CATEGORY.message;
  const items = Array.isArray(args.items) ? args.items.map(String).slice(0, 20) : [];
  const loc = (args.location ?? null) as { lat?: number; lng?: number; address?: string } | null;
  const hasCoords = typeof loc?.lat === "number" && typeof loc?.lng === "number";
  const mapsUrl = hasCoords ? `https://www.google.com/maps?q=${loc!.lat},${loc!.lng}` : undefined;
  const urgency = String(args.urgency ?? "");
  const subject = `${cat.emoji} ${String(args.subject ?? cat.label).slice(0, 120)}`;

  const html = `
  <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;margin:auto;background:#fff5ef;border-radius:24px;padding:28px;color:#2e1a2b">
    <p style="margin:0;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#806878">J.A.R.V.I.S. · on behalf of ${esc(PEOPLE.her)}</p>
    <h1 style="margin:8px 0 4px;font-size:26px">${cat.emoji} ${esc(cat.label)}</h1>
    ${urgency ? `<p style="margin:0 0 12px;font-weight:700;color:#e5487a">Urgency: ${esc(urgency.toUpperCase())}</p>` : ""}
    <div style="background:#fff;border-radius:18px;padding:18px;font-size:16px;line-height:1.5">${esc(args.message)}</div>
    ${items.length ? `<h3 style="margin:20px 0 6px">Requested items</h3><ul style="margin:0;padding-left:20px">${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>` : ""}
    ${
      loc && (hasCoords || loc.address)
        ? `<h3 style="margin:20px 0 6px">Delivery location</h3><p style="margin:0">${esc(loc.address ?? "")}</p>${
            mapsUrl ? `<p style="margin:10px 0 0"><a href="${mapsUrl}" style="display:inline-block;background:#e5487a;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none;font-weight:700">Open in Google Maps</a></p>` : ""
          }`
        : ""
    }
    <p style="margin:24px 0 0;font-size:13px;color:#806878">Sent ${esc(new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }))} IST. Respond promptly, sir. She's counting on you.</p>
  </div>`;

  // Plain-text twin: better deliverability, and readable in notification previews.
  const text = [
    `${cat.emoji} ${cat.label} from ${PEOPLE.her} (via Jarvis)`,
    urgency ? `Urgency: ${urgency.toUpperCase()}` : "",
    "",
    String(args.message ?? ""),
    items.length ? `\nRequested: ${items.join(", ")}` : "",
    loc?.address ? `\nLocation: ${loc.address}` : "",
    mapsUrl ? `Map: ${mapsUrl}` : "",
  ]
    .filter((l) => l !== "")
    .join("\n");

  try {
    await sendMail({ subject, html, text });
    sent.push(now);
    return { ok: true, sent_to: PEOPLE.him, subject, included_location: Boolean(loc) };
  } catch (e) {
    return { error: `Email failed: ${mailError(e)}` };
  }
}
