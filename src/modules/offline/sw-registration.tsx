"use client";

import { useEffect } from "react";

/** Registers the service worker in production builds (HTTPS or localhost). */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production" && !process.env.NEXT_PUBLIC_ENABLE_SW_IN_DEV) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch((e) => console.warn("[sw] registration failed", e));
  }, []);
  return null;
}

/** Removes cached private pages (call before signing out). */
export async function clearPrivateCache() {
  try {
    const reg = await navigator.serviceWorker?.ready;
    reg?.active?.postMessage({ type: "CLEAR_PRIVATE" });
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith("fr-pages-")).map((k) => caches.delete(k)));
    }
  } catch {
    /* best effort */
  }
}

/** Asks the service worker to download pages for offline use. */
export async function precachePages(urls: string[]): Promise<{ ok: number; total: number } | null> {
  if (!("serviceWorker" in navigator)) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  const sw = reg?.active;
  if (!sw) return null;
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), 60_000);
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === "PRECACHE_DONE") {
        clearTimeout(timer);
        navigator.serviceWorker.removeEventListener("message", onMessage);
        resolve({ ok: e.data.ok, total: e.data.total });
      }
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    sw.postMessage({ type: "PRECACHE_PAGES", urls });
  });
}
