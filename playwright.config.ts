import { defineConfig, devices } from "@playwright/test";

// With BASE_URL unset, the suite serves the static export itself through
// `wrangler dev` — the same Workers Assets routing production uses (clean
// URLs, the 404 page), which `next dev` does not reproduce. CI and the
// production smoke test set BASE_URL instead: CI to a server it has already
// started, the deploy to https://haijieliu.com.
const BASE_URL = process.env.BASE_URL;
const LOCAL_URL = "http://127.0.0.1:8788";

export default defineConfig({
  testDir: "tests/e2e",
  // Every test here has a deterministic cause when it fails; a retry would
  // only hide it. See TESTING.md.
  retries: 0,
  // Measured over 30 passing runs (5 × 6 tests, local): p50 2.3s, p95 3.9s,
  // slowest 4.2s. 15s leaves room for a slower CI runner without letting a
  // hang sit at Playwright's 30s default. Revisit against CI's own timings.
  timeout: 15_000,
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI
    ? [["list"], ["html", { open: "never" }]]
    : "list",
  use: {
    baseURL: BASE_URL ?? LOCAL_URL,
    trace: "retain-on-failure",
  },
  projects: [
    // Every bug that got past a desktop check on this site was WebKit-only:
    // the H.264 level that no iPhone would decode, and the service worker
    // that left every page but the home page unopenable on iOS.
    { name: "iphone-webkit", use: { ...devices["iPhone 14"] } },
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: BASE_URL
    ? undefined
    : {
        command: `npx wrangler dev --ip 127.0.0.1 --port 8788`,
        url: LOCAL_URL,
        reuseExistingServer: true,
        env: { WRANGLER_SEND_METRICS: "false" },
      },
});
