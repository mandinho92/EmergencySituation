/*
 * FamilyReady service worker.
 *
 * Strategy
 *  - /_next/static/*      cache-first (immutable, content-hashed)
 *  - page navigations     network-first; private pages under /app and public
 *                         scenario pages are cached after each successful load
 *                         so the family plan, meeting points, checklists and
 *                         contacts remain readable offline
 *  - /api/*, RSC, non-GET network-only (writes are queued by the app outbox)
 *
 * Private pages are deleted from the cache on sign-out (CLEAR_PRIVATE message).
 * Map tiles, weather and messaging are NOT available offline.
 */
const VERSION = "v1";
const STATIC_CACHE = `fr-static-${VERSION}`;
const ASSET_CACHE = `fr-assets-${VERSION}`;
const PAGE_CACHE = `fr-pages-${VERSION}`;
const PRECACHE = ["/offline", "/manifest.webmanifest", "/icons/icon.svg", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("fr-") && !k.endsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const isCacheablePage = (url) => url.pathname === "/app" || url.pathname.startsWith("/app/") || url.pathname.startsWith("/scenarios");

async function networkFirstPage(request) {
  const url = new URL(request.url);
  try {
    const response = await fetch(request);
    if (response.ok && !response.redirected && isCacheablePage(url)) {
      const cache = await caches.open(PAGE_CACHE);
      await cache.put(url.pathname + url.search, response.clone());
    }
    return response;
  } catch {
    const cache = await caches.open(PAGE_CACHE);
    const cached = (await cache.match(url.pathname + url.search)) || (await cache.match(url.pathname));
    if (cached) return cached;
    return (await caches.match("/offline")) || new Response("Sem ligação", { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } });
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) (await caches.open(ASSET_CACHE)).put(request, response.clone());
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) return;
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request));
    return;
  }
  // React Server Component payloads: let them fail offline; the router then
  // falls back to a full navigation, which is served from the page cache.
  if (request.headers.get("RSC") === "1" || url.searchParams.has("_rsc")) return;
  if (request.mode === "navigate") event.respondWith(networkFirstPage(request));
});

self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "CLEAR_PRIVATE") {
    event.waitUntil(caches.delete(PAGE_CACHE));
  }
  if (data.type === "PRECACHE_PAGES" && Array.isArray(data.urls)) {
    event.waitUntil(
      (async () => {
        const cache = await caches.open(PAGE_CACHE);
        let ok = 0;
        for (const path of data.urls.slice(0, 60)) {
          try {
            const res = await fetch(path, { credentials: "same-origin", headers: { accept: "text/html" } });
            if (res.ok && !res.redirected) {
              await cache.put(path, res);
              ok++;
            }
          } catch {
            /* ignore single failures */
          }
        }
        event.source && event.source.postMessage({ type: "PRECACHE_DONE", ok, total: data.urls.length });
      })(),
    );
  }
});
