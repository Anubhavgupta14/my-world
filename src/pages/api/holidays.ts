import type { NextApiRequest, NextApiResponse } from "next";
import { sameOrigin } from "@/server/session";

/**
 * Indian public holidays from Google's public "Holidays in India" calendar
 * (no API key). Only real public holidays, not observances. Cached for 12h.
 */

const ICS =
  "https://calendar.google.com/calendar/ical/en.indian%23holiday%40group.v.calendar.google.com/public/basic.ics";

export interface Holiday {
  date: string; // YYYY-MM-DD
  name: string;
  tentative: boolean;
}

let cache: { at: number; holidays: Holiday[] } | null = null;
const TTL = 12 * 60 * 60 * 1000;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!sameOrigin(req)) return res.status(403).json({ error: "Forbidden" });
  try {
    if (!cache || Date.now() - cache.at > TTL) {
      const r = await fetch(ICS, { signal: AbortSignal.timeout(10_000) });
      if (!r.ok) throw new Error(`calendar ${r.status}`);
      cache = { at: Date.now(), holidays: parse(await r.text()) };
    }
    res.setHeader("Cache-Control", "private, max-age=21600");
    res.json({ holidays: cache.holidays });
  } catch (e) {
    // Holidays are a nice-to-have: an empty list just hides long weekends.
    res.status(200).json({ holidays: cache?.holidays ?? [], error: (e as Error).message });
  }
}

function parse(ics: string): Holiday[] {
  const text = ics.replace(/\r\n[ \t]/g, "").replace(/\r\n/g, "\n"); // unfold long lines
  const out: Holiday[] = [];
  for (const block of text.split("BEGIN:VEVENT").slice(1)) {
    const date = /DTSTART;VALUE=DATE:(\d{4})(\d{2})(\d{2})/.exec(block);
    const name = /\nSUMMARY:(.*)/.exec(block)?.[1]?.replace(/\\,/g, ",").trim();
    const desc = /\nDESCRIPTION:(.*)/.exec(block)?.[1] ?? "";
    if (!date || !name || !desc.startsWith("Public holiday")) continue;
    out.push({
      date: `${date[1]}-${date[2]}-${date[3]}`,
      name: name.replace(/\s*\(tentative\)\s*/i, ""),
      tentative: /tentative/i.test(desc) || /tentative/i.test(name),
    });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}
