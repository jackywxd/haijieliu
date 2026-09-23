#!/usr/bin/env node
/**
 * Checks a served build of the site from the outside: every route, the 404
 * page, and every piece of media each page actually points at. Read-only — it
 * issues GET/HEAD requests and changes nothing.
 *
 *   SITE=https://haijieliu.com EXPECT_BUILD_ID=<id> node scripts/smoke.mjs
 *
 * Runs twice per change: in CI against the build served locally by
 * `wrangler dev`, and after every deploy against production. Media is always
 * checked on the production CDN, because that is where every page points.
 *
 * Each check below guards something that has already gone wrong on this site
 * and was invisible from a desktop browser: an H.264 level no iPhone would
 * decode, media URLs resolving to the wrong origin, MP4s served without
 * cache-control, and a new year's video missing from the CDN.
 */
import { MAX_APPLE_H264_LEVEL, moovExtent, videoCodec } from "./lib/mp4.mjs";

const SITE = (process.env.SITE ?? "").replace(/\/$/, "");
const EXPECT_BUILD_ID = process.env.EXPECT_BUILD_ID;
// The origin the CDN's CORS rule has to admit. Always production, even when
// SITE is a local server, since that is where visitors load the pages from.
const PAGE_ORIGIN = "https://haijieliu.com";
const MEDIA_HOST = "media.haijieliu.com";

// Cloudflare swaps a Worker version in atomically, and every deploy measured
// while building this served the new build on the first request after
// `wrangler deploy` returned. The wait is logged each run so the budget can be
// set from the recorded distribution rather than from this first estimate.
const READY_TIMEOUT_MS = Number(process.env.READY_TIMEOUT_MS ?? 60_000);
const READY_POLL_MS = 3_000;
// Two bytes of avcC are all that is needed, but it sits inside moov; the first
// read only has to reach moov's header to learn how far to read next.
const HEAD_PROBE_BYTES = 64 * 1024;
// H.264 levels run 1.0–6.2 (10–62). A zero or near-zero reading means the
// parser found the wrong bytes, which must fail rather than look compliant.
const MIN_PLAUSIBLE_LEVEL = 10;

if (!SITE) {
  console.error("SITE is required, e.g. SITE=https://haijieliu.com");
  process.exit(2);
}

const failures = [];
// Returns nothing on purpose: callers `return fail(...)` to stop a check, and
// handing back push()'s count once let a failed sitemap fetch pass a number
// on as the list of routes.
const fail = (what, why) => {
  failures.push(`${what}: ${why}`);
};
const pass = (what) => console.log(`  ok  ${what}`);

async function get(url, init) {
  try {
    return await fetch(url, { redirect: "manual", ...init });
  } catch (e) {
    return { ok: false, status: 0, error: e.message, headers: new Headers() };
  }
}

async function waitForBuild() {
  if (!EXPECT_BUILD_ID) return;
  const started = Date.now();
  for (;;) {
    const res = await get(`${SITE}/`);
    const html = res.ok ? await res.text() : "";
    if (html.includes(EXPECT_BUILD_ID)) {
      console.log(`build ${EXPECT_BUILD_ID} live after ${Date.now() - started}ms`);
      return;
    }
    if (Date.now() - started > READY_TIMEOUT_MS) {
      console.error(
        `build ${EXPECT_BUILD_ID} still not served after ${READY_TIMEOUT_MS}ms — ` +
          `the checks below would be testing the previous deploy, so none were run.`,
      );
      process.exit(1);
    }
    await new Promise((r) => setTimeout(r, READY_POLL_MS));
  }
}

async function checkRoutes() {
  console.log("routes");
  const res = await get(`${SITE}/sitemap.xml`);
  if (res.status !== 200) return fail("/sitemap.xml", `status ${res.status}`);
  const paths = [...(await res.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map(
    (m) => new URL(m[1]).pathname,
  );
  if (paths.length === 0) return fail("/sitemap.xml", "lists no URLs");

  for (const path of paths) {
    const page = await get(`${SITE}${path}`);
    const type = page.headers.get("content-type") ?? "";
    if (page.status !== 200) fail(path, `status ${page.status}`);
    else if (!type.includes("text/html")) fail(path, `content-type ${type}`);
    else pass(path);
  }

  // An unknown path answered 200 is a soft 404 — search engines index it as
  // a real page, which is the kind of Search Console failure already fixed once.
  const missing = `/smoke-check-no-such-page-${Date.now()}`;
  const notFound = await get(`${SITE}${missing}`);
  if (notFound.status !== 404) fail("unknown path", `status ${notFound.status}, not 404`);
  else pass("unknown path → 404");

  return paths;
}

async function readRange(url, end) {
  const res = await get(url, {
    headers: { Range: `bytes=0-${end - 1}`, Origin: PAGE_ORIGIN },
  });
  return res.status === 206 ? { res, buf: Buffer.from(await res.arrayBuffer()) } : { res };
}

async function checkVideo(url) {
  const { res, buf: head } = await readRange(url, HEAD_PROBE_BYTES);
  // A 200 here means the CDN ignored Range, and Safari will not play a video
  // that cannot be fetched in ranges.
  if (res.status !== 206) return fail(url, `range request answered ${res.status}, not 206`);

  const type = res.headers.get("content-type") ?? "";
  if (!type.startsWith("video/mp4")) fail(url, `content-type ${type}`);
  if (!res.headers.get("cache-control")) {
    fail(url, "no cache-control — a replaced file would stay stale in browsers indefinitely");
  }
  const cors = res.headers.get("access-control-allow-origin");
  if (cors !== "*" && cors !== PAGE_ORIGIN) {
    fail(url, `access-control-allow-origin is ${cors ?? "absent"}, not ${PAGE_ORIGIN}`);
  }

  const extent = moovExtent(head);
  if (extent.error) return fail(url, extent.error);
  let buf = head;
  if (extent.end > head.length) {
    ({ buf } = await readRange(url, extent.end));
    if (!buf) return fail(url, "could not read the rest of moov");
  }
  const codec = videoCodec(buf);
  if (codec.error) return fail(url, codec.error);
  if (codec.codec !== "avc1") return fail(url, `codec ${codec.codec}, not H.264`);
  if (codec.level < MIN_PLAUSIBLE_LEVEL) {
    return fail(url, `read H.264 level ${codec.level / 10} — implausible, the parser is misreading the file`);
  }
  if (codec.level > MAX_APPLE_H264_LEVEL) {
    return fail(
      url,
      `H.264 level ${codec.level / 10} exceeds ${MAX_APPLE_H264_LEVEL / 10} — will not play on iPhone or iPad`,
    );
  }
  pass(`${url.split("/").pop()} — H.264 level ${codec.level / 10}, faststart, range, CORS, cache-control`);
}

async function checkAsset(url, expectType) {
  const res = await get(url, { method: "HEAD" });
  const type = res.headers.get("content-type") ?? "";
  if (res.status !== 200) fail(url, `status ${res.status}`);
  else if (!type.startsWith(expectType)) fail(url, `content-type ${type}`);
  else pass(url.split("/").slice(-2).join("/"));
}

// Checks the media a page's HTML actually references, not a list rebuilt here —
// so a URL built wrongly by the app is caught as the visitor would meet it.
async function checkPageMedia(paths) {
  console.log("media");
  const seen = new Set();
  for (const path of paths) {
    const html = await (await get(`${SITE}${path}`)).text();

    // Media served from the site's own origin means the CDN base URL was
    // built wrong — it happened once, when .env.local outranked
    // .env.production at build time.
    if (/["'(]\/media\//.test(html)) fail(path, "references /media/ on the site's own origin instead of the CDN");

    const urls = new Set(
      [...html.matchAll(new RegExp(`https://${MEDIA_HOST.replace(".", "\\.")}/[^"'\\s)&]+`, "g"))].map(
        (m) => m[0],
      ),
    );
    for (const url of urls) {
      if (seen.has(url)) continue;
      seen.add(url);
      if (/\.mp4$/i.test(url)) await checkVideo(url);
      else if (/\.(jpe?g|png|webp|gif)$/i.test(url)) await checkAsset(url, "image/");
      else if (/\.(mp3|m4a)$/i.test(url)) await checkAsset(url, "audio/");
    }
  }
  const videoCount = [...seen].filter((u) => u.endsWith(".mp4")).length;
  if (videoCount === 0) fail("media", "no page referenced a video — the check would have passed on nothing");
}

console.log(`smoke test: ${SITE}`);
await waitForBuild();
const paths = await checkRoutes();
if (paths) await checkPageMedia(paths);

if (failures.length) {
  console.error(`\n${failures.length} check(s) failed:`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log("\nall checks passed");
