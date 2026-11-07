import type { Content } from "@/lib/jarvis/protocol";

/**
 * Server-only Supabase access through its REST API (PostgREST) with the secret
 * key. The secret key bypasses Row Level Security, so it must never reach the
 * browser: this file is only imported by API routes.
 */

export class DbError extends Error {
  constructor(
    message: string,
    public status = 500,
  ) {
    super(message);
  }
}

function cfg() {
  const url = (process.env.SUPABASE_URL || process.env.PROJECT_URL || "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url) throw new DbError("Supabase URL missing: set PROJECT_URL (or SUPABASE_URL) in .env");
  if (!key) throw new DbError("Supabase secret key missing: set SUPABASE_SECRET_KEY in .env");
  return { url, key };
}

async function rest<T = unknown>(
  path: string,
  init: { method?: string; body?: unknown; prefer?: string } = {},
): Promise<T> {
  const { url, key } = cfg();
  const res = await fetch(`${url}/rest/v1/${path}`, {
    method: init.method ?? "GET",
    headers: {
      apikey: key,
      "content-type": "application/json",
      ...(init.prefer ? { prefer: init.prefer } : {}),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    const text = await res.text();
    let msg = text;
    try {
      const j = JSON.parse(text);
      msg = j.message ?? j.hint ?? text;
      // Table missing → the schema hasn't been run yet.
      if (j.code === "PGRST205" || j.code === "42P01") msg = "Database tables not found. Run supabase/schema.sql in the Supabase SQL editor.";
    } catch {
      /* not JSON */
    }
    throw new DbError(msg.slice(0, 300), res.status);
  }
  if (res.status === 204 || (init.method && init.method !== "GET")) return undefined as T;
  return (await res.json()) as T;
}

const UPSERT = "resolution=merge-duplicates,return=minimal";

/* ---------- Rows ---------- */

export interface PeriodRow {
  start: string;
  end: string | null;
}
export interface DayLogRow {
  day: string;
  pain: number | null;
  moods: string[];
}
export interface SettingsRow {
  cycle_length: number;
  period_length: number;
  treats_opened: number;
  best_crush_score: number;
  jarvis_introduced: boolean;
}
export interface MessageRow {
  id: string;
  kind: string;
  payload: Record<string, unknown>;
}

/* ---------- Reads ---------- */

export async function loadAll() {
  const [periods, logs, settings, messages] = await Promise.all([
    rest<PeriodRow[]>("periods?select=start,end&order=start.asc"),
    rest<DayLogRow[]>("day_logs?select=day,pain,moods&order=day.asc"),
    rest<SettingsRow[]>("app_settings?select=cycle_length,period_length,treats_opened,best_crush_score,jarvis_introduced&id=eq.1"),
    rest<MessageRow[]>("jarvis_messages?select=id,kind,payload&order=seq.desc&limit=120"),
  ]);
  return { periods, logs, settings: settings[0] ?? null, messages: messages.reverse() };
}

export async function getSettings(): Promise<SettingsRow | null> {
  const rows = await rest<SettingsRow[]>("app_settings?select=*&id=eq.1");
  return rows[0] ?? null;
}

export async function getHistory(): Promise<Content[]> {
  const rows = await rest<{ contents: Content[] }[]>("jarvis_history?select=contents&id=eq.1");
  return Array.isArray(rows[0]?.contents) ? rows[0].contents : [];
}

/* ---------- Writes ---------- */

export const upsertPeriods = (rows: PeriodRow[]) =>
  rows.length ? rest("periods", { method: "POST", body: rows, prefer: UPSERT }) : Promise.resolve();

export const deletePeriods = (starts: string[]) =>
  starts.length ? rest(`periods?start=in.(${starts.join(",")})`, { method: "DELETE" }) : Promise.resolve();

export const upsertDayLogs = (rows: DayLogRow[]) =>
  rows.length ? rest("day_logs", { method: "POST", body: rows, prefer: UPSERT }) : Promise.resolve();

export const updateSettings = (patch: Partial<SettingsRow>) =>
  Object.keys(patch).length
    ? rest("app_settings", { method: "POST", body: [{ id: 1, ...patch }], prefer: UPSERT })
    : Promise.resolve();

export const upsertMessages = (rows: MessageRow[]) =>
  rows.length ? rest("jarvis_messages", { method: "POST", body: rows, prefer: UPSERT }) : Promise.resolve();

export const saveHistory = (contents: Content[]) =>
  rest("jarvis_history", { method: "POST", body: [{ id: 1, contents }], prefer: UPSERT });

export async function clearJarvis() {
  await Promise.all([rest("jarvis_messages?id=not.is.null", { method: "DELETE" }), saveHistory([])]);
}

/* ---------- Glow (makeup assistant) ---------- */

export async function getGlowProfile(): Promise<Record<string, unknown>> {
  const rows = await rest<{ profile: Record<string, unknown> }[]>("glow_profile?select=profile&id=eq.1");
  return rows[0]?.profile ?? {};
}

export const saveGlowProfile = (profile: Record<string, unknown>) =>
  rest("glow_profile", { method: "POST", body: [{ id: 1, profile }], prefer: UPSERT });

export const getSavedLooks = () =>
  rest<{ id: string; payload: Record<string, unknown> }[]>("glow_looks?select=id,payload&order=created_at.desc&limit=60");

export const saveLook = (id: string, payload: Record<string, unknown>) =>
  rest("glow_looks", { method: "POST", body: [{ id, payload }], prefer: UPSERT });

export const removeLook = (id: string) =>
  rest(`glow_looks?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });
