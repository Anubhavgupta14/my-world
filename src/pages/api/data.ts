import type { NextApiRequest, NextApiResponse } from "next";
import { MOOD_IDS } from "@/lib/cycle";
import type { DataSnapshot, SyncOp } from "@/lib/sync-protocol";
import {
  DbError,
  clearJarvis,
  deletePeriods,
  loadAll,
  saveHistory,
  upsertDayLogs,
  upsertMessages,
  upsertPeriods,
  updateSettings,
} from "@/server/db";
import { requireSession, sameOrigin } from "@/server/session";

export const config = { api: { bodyParser: { sizeLimit: "2mb" } } };

/**
 * GET  → everything the app needs (DataSnapshot).
 * POST { ops: SyncOp[] } → applies changes in order.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Cache-Control", "no-store");
  if (!sameOrigin(req)) return res.status(403).json({ error: "Forbidden" });
  if (!requireSession(req, res)) return;

  try {
    if (req.method === "GET") {
      const snap: DataSnapshot = await loadAll();
      return res.json(snap);
    }
    if (req.method === "POST") {
      const ops = req.body?.ops as SyncOp[] | undefined;
      if (!Array.isArray(ops) || ops.length > 200) return res.status(400).json({ error: "Bad ops" });
      for (const op of ops) await apply(op);
      return res.json({ ok: true });
    }
    res.status(405).json({ error: "GET or POST" });
  } catch (e) {
    const status = e instanceof DbError ? (e.status >= 500 ? 502 : 400) : 400;
    res.status(status).json({ error: (e as Error).message });
  }
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const isDay = (v: unknown): v is string => typeof v === "string" && DAY.test(v);
const MOODS = new Set<string>(MOOD_IDS);
const int = (v: unknown, min: number, max: number) =>
  typeof v === "number" && Number.isFinite(v) ? Math.max(min, Math.min(max, Math.round(v))) : undefined;

async function apply(op: SyncOp) {
  switch (op.op) {
    case "periods.upsert":
      return upsertPeriods(
        op.rows
          .filter((r) => isDay(r.start))
          .map((r) => ({ start: r.start, end: isDay(r.end) && r.end >= r.start ? r.end : null })),
      );
    case "periods.delete":
      return deletePeriods(op.starts.filter(isDay));
    case "logs.upsert":
      return upsertDayLogs(
        op.rows
          .filter((r) => isDay(r.day))
          .map((r) => ({
            day: r.day,
            pain: int(r.pain, 0, 10) ?? null,
            moods: Array.isArray(r.moods) ? r.moods.filter((m) => MOODS.has(m)) : [],
          })),
      );
    case "settings.update": {
      const p = op.patch ?? {};
      const patch: Record<string, number | boolean> = {};
      const cl = int(p.cycle_length, 15, 60);
      const pl = int(p.period_length, 1, 15);
      const to = int(p.treats_opened, 0, 1e7);
      const bc = int(p.best_crush_score, 0, 1e6);
      if (cl !== undefined) patch.cycle_length = cl;
      if (pl !== undefined) patch.period_length = pl;
      if (to !== undefined) patch.treats_opened = to;
      if (bc !== undefined) patch.best_crush_score = bc;
      if (typeof p.jarvis_introduced === "boolean") patch.jarvis_introduced = p.jarvis_introduced;
      return updateSettings(patch);
    }
    case "jarvis.upsert":
      return upsertMessages(
        op.rows
          .filter((r) => typeof r.id === "string" && r.id.length < 80 && typeof r.kind === "string")
          .map((r) => ({ id: r.id, kind: r.kind.slice(0, 20), payload: r.payload ?? {} })),
      );
    case "jarvis.clear":
      return clearJarvis();
    case "history.set":
      return Array.isArray(op.contents) ? saveHistory(op.contents.slice(-40)) : undefined;
    default:
      throw new DbError("Unknown op", 400);
  }
}
