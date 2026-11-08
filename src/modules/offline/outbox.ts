"use client";

import { createStore, get, set } from "idb-keyval";

/**
 * Offline outbox for item-state operations (IndexedDB).
 * Operations are idempotent "set" changes replayed in order through /api/sync.
 */
export interface OutboxOp {
  opId: string;
  kind: "home" | "bag";
  familyId: string;
  bagId?: string;
  key?: string;
  rowId?: string;
  patch: { quantityHave?: number; acquiredVia?: "purchased" | "owned" | null; isPacked?: boolean };
  queuedAt?: string;
}

const store = typeof indexedDB !== "undefined" ? createStore("familyready", "outbox") : undefined;
const KEY = "ops";
const EVENT = "fr-outbox-change";
const LAST_SYNC = "fr-last-sync";

export async function listOps(): Promise<OutboxOp[]> {
  if (!store) return [];
  return (await get<OutboxOp[]>(KEY, store)) ?? [];
}

async function save(ops: OutboxOp[]) {
  if (!store) return;
  await set(KEY, ops, store);
  window.dispatchEvent(new CustomEvent(EVENT, { detail: ops.length }));
}

export async function enqueue(op: OutboxOp) {
  const ops = await listOps();
  await save([...ops, { ...op, queuedAt: new Date().toISOString() }]);
}

export function onOutboxChange(cb: (count: number) => void) {
  const handler = (e: Event) => cb((e as CustomEvent<number>).detail);
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}

export function lastSyncAt(): string | null {
  try {
    return localStorage.getItem(LAST_SYNC);
  } catch {
    return null;
  }
}

type SyncResponse = { results: Array<{ opId: string; ok: boolean; error?: string }>; syncedAt: string };

async function post(ops: OutboxOp[]): Promise<SyncResponse> {
  const res = await fetch("/api/sync", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ ops: ops.map(({ queuedAt: _q, ...o }) => o) }),
  });
  if (!res.ok) throw new Error(`sync_http_${res.status}`);
  const body = (await res.json()) as SyncResponse;
  try {
    localStorage.setItem(LAST_SYNC, body.syncedAt);
  } catch {
    /* private mode */
  }
  return body;
}

/**
 * Sends one operation now; if the network is unavailable it is queued.
 * Returns "synced", "queued" or an error message.
 */
export async function submitOp(op: OutboxOp): Promise<{ status: "synced" } | { status: "queued" } | { status: "error"; error: string }> {
  if (!navigator.onLine) {
    await enqueue(op);
    return { status: "queued" };
  }
  try {
    const body = await post([op]);
    const r = body.results[0];
    return r?.ok ? { status: "synced" } : { status: "error", error: r?.error ?? "Erro ao guardar." };
  } catch (e) {
    if (e instanceof Error && /sync_http_(401|403|415|400)/.test(e.message)) return { status: "error", error: "Sessão expirada. Entre novamente." };
    await enqueue(op);
    return { status: "queued" };
  }
}

let flushing = false;

/** Replays queued operations. Failed operations (permission, removed item) are dropped and reported. */
export async function flushOutbox(): Promise<{ sent: number; failed: string[] } | null> {
  if (flushing || !navigator.onLine) return null;
  const ops = await listOps();
  if (ops.length === 0) return { sent: 0, failed: [] };
  flushing = true;
  try {
    const body = await post(ops);
    const done = new Set(body.results.map((r) => r.opId));
    const failed = body.results.filter((r) => !r.ok).map((r) => r.error ?? "Erro");
    // Keep ops added while the request was in flight.
    const remaining = (await listOps()).filter((o) => !done.has(o.opId));
    await save(remaining);
    return { sent: ops.length - failed.length, failed };
  } catch {
    return null;
  } finally {
    flushing = false;
  }
}

export function newOpId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
