const CACHE = "haijie-core-v4";
const PRECACHE = ["/manifest.json", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  // Navigations are left to the browser. Handling them here meant that any
  // failed fetch fell back to a cache lookup that could come up empty, and an
  // empty lookup resolves respondWith with undefined — which iOS Safari
  // surfaces as "FetchEvent.respondWith received an error: Returned response
  // is null" and no page at all. The fallback was never worth that risk: it
  // could only ever serve "/", and only if a previous visit had cached it.
  if (request.mode === "navigate") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never cache API responses or RSC data fetches — always hit the network
  // so server data shows up without a SW version bump.
  if (url.pathname.startsWith("/api/") || url.searchParams.has("_rsc")) {
    event.respondWith(fetch(request));
    return;
  }

  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        }),
    ),
  );
});
