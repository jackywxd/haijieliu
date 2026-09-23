// Runs public/sw.js against a stand-in worker global and inspects what its
// fetch handler does with each kind of request.
//
// This is the cheapest level that can observe these failures. A browser test
// cannot: the navigation bug only surfaced when the worker's network fetch
// failed and its cache fallback came up empty, which never happens on a CI
// runner with a healthy connection.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const SOURCE = readFileSync(
  new URL("../../public/sw.js", import.meta.url),
  "utf8",
);
const ORIGIN = "https://haijieliu.com";

function loadWorker() {
  const listeners = {};
  const self = {
    location: new URL(`${ORIGIN}/sw.js`),
    addEventListener: (type, fn) => (listeners[type] = fn),
    skipWaiting: () => Promise.resolve(),
    clients: { claim: () => Promise.resolve() },
  };
  const cache = { put: async () => {}, addAll: async () => {} };
  const context = {
    self,
    URL,
    Response,
    fetch: async () => new Response("network", { status: 200 }),
    caches: {
      match: async () => undefined, // nothing cached — the failing case
      open: async () => cache,
      keys: async () => [],
      delete: async () => true,
    },
  };
  vm.runInNewContext(SOURCE, context);
  return listeners;
}

// Returns whether the worker claimed the request, and what it answered with.
async function dispatchFetch(listeners, { url, mode = "no-cors", method = "GET" }) {
  let claimed = false;
  let answer;
  listeners.fetch({
    request: { url, mode, method },
    respondWith(p) {
      claimed = true;
      answer = Promise.resolve(p);
    },
  });
  return { claimed, response: claimed ? await answer : undefined };
}

// Protects: every page except "/" failing to open on iPhone with
// "FetchEvent.respondWith received an error: Returned response is null".
test("leaves page navigations to the browser", async () => {
  const listeners = loadWorker();
  for (const path of ["/", "/videos/2026", "/gallery"]) {
    const { claimed } = await dispatchFetch(listeners, {
      url: `${ORIGIN}${path}`,
      mode: "navigate",
    });
    assert.equal(claimed, false, `${path} was intercepted`);
  }
});

// Protects: seeking breaking in Safari. Video on the CDN is served with range
// requests; a worker that answers them from a cached whole-file response
// breaks the 206 exchange the <video> element depends on.
test("leaves cross-origin media to the browser", async () => {
  const listeners = loadWorker();
  const { claimed } = await dispatchFetch(listeners, {
    url: "https://media.haijieliu.com/videos-mp4/Haijie-2026.mp4",
  });
  assert.equal(claimed, false);
});

// Whatever the worker does claim, it must always answer with a Response —
// an empty answer is the same null-response failure in another place.
test("answers every same-origin asset it claims with a Response", async () => {
  const listeners = loadWorker();
  const { claimed, response } = await dispatchFetch(listeners, {
    url: `${ORIGIN}/_next/static/chunks/app.js`,
  });
  assert.equal(claimed, true);
  assert.ok(response instanceof Response, "claimed but answered with nothing");
});
