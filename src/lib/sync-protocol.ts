import type { DayKey } from "./dates";
import type { Content } from "./jarvis/protocol";

/** Changes the phone sends to /api/data. Each one is idempotent, so retries are safe. */
export type SyncOp =
  | { op: "periods.upsert"; rows: { start: DayKey; end: DayKey | null }[] }
  | { op: "periods.delete"; starts: DayKey[] }
  | { op: "logs.upsert"; rows: { day: DayKey; pain: number | null; moods: string[] }[] }
  | {
      op: "settings.update";
      patch: Partial<{
        cycle_length: number;
        period_length: number;
        treats_opened: number;
        best_crush_score: number;
        jarvis_introduced: boolean;
      }>;
    }
  | { op: "jarvis.upsert"; rows: { id: string; kind: string; payload: Record<string, unknown> }[] }
  | { op: "jarvis.clear" }
  /** Only used once, when moving old on-device data up to Supabase. */
  | { op: "history.set"; contents: Content[] };

export interface DataSnapshot {
  periods: { start: DayKey; end: DayKey | null }[];
  logs: { day: DayKey; pain: number | null; moods: string[] }[];
  settings: {
    cycle_length: number;
    period_length: number;
    treats_opened: number;
    best_crush_score: number;
    jarvis_introduced: boolean;
  } | null;
  messages: { id: string; kind: string; payload: Record<string, unknown> }[];
}
