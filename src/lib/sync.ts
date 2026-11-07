import { useSyncExternalStore } from "react";
import type { DataSnapshot, SyncOp } from "./sync-protocol";

/**
 * Sends changes to Supabase (via /api/data) in the background.
 * The UI never waits: stores update instantly, ops queue up here, get batched,
 * and retry with backoff if the network drops.
 */

export type SyncStatus = "idle" | "saving" | "offline" | "locked";

let queue: SyncOp[] = [];
let inFlight = false;
let timer: number | null = null;
let failures = 0;
let status: SyncStatus = "idle";
const listeners = new Set<() => void>();

function setStatus(s: SyncStatus) {
  if (s === status) return;
  status = s;
  listeners.forEach((l) => l());
}

export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => status,
    () => "idle",
  );
}

/** Queue changes; they're sent ~300ms later together with anything else that changed. */
export function enqueue(...ops: SyncOp[]) {
  if (!ops.length) return;
  queue.push(...ops);
  schedule(300);
}

function schedule(ms: number) {
  if (timer !== null) window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    timer = null;
    void flush();
  }, ms);
}

export async function flush(): Promise<boolean> {
  if (inFlight || !queue.length) return !queue.length;
  inFlight = true;
  const batch = queue.slice(0, 100);
  setStatus("saving");
  try {
    const res = await fetch("/api/data", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ops: batch }),
      keepalive: JSON.stringify(batch).length < 60_000,
    });
    if (res.status === 401) {
      setStatus("locked");
      onLocked?.();
      return false;
    }
    if (!res.ok) throw new Error(String(res.status));
    queue = queue.slice(batch.length);
    failures = 0;
    setStatus(queue.length ? "saving" : "idle");
    if (queue.length) schedule(0);
    return true;
  } catch {
    failures++;
    setStatus("offline");
    schedule(Math.min(30_000, 1000 * 2 ** failures));
    return false;
  } finally {
    inFlight = false;
  }
}

let onLocked: (() => void) | null = null;
export function setOnLocked(cb: () => void) {
  onLocked = cb;
}

// Push pending changes out when she switches away or closes the app.
if (typeof window !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") void flush();
  });
  window.addEventListener("online", () => void flush());
}

/* ---------- Loading ---------- */

export type LoadResult =
  | { kind: "ok"; data: DataSnapshot }
  | { kind: "locked" }
  | { kind: "error"; message: string };

export async function loadSnapshot(): Promise<LoadResult> {
  try {
    const res = await fetch("/api/data", { cache: "no-store" });
    if (res.status === 401) return { kind: "locked" };
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { kind: "error", message: json.error ?? `Server error ${res.status}` };
    return { kind: "ok", data: json as DataSnapshot };
  } catch {
    return { kind: "error", message: "Can't reach the server. Check the internet connection." };
  }
}

export async function unlock(passcode: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ passcode }),
    });
    const json = await res.json().catch(() => ({}));
    return res.ok ? { ok: true } : { ok: false, error: json.error ?? "Couldn't unlock." };
  } catch {
    return { ok: false, error: "Can't reach the server." };
  }
}
