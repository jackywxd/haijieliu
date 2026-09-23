import { expect, test } from "@playwright/test";
import videos from "../../src/content/videos.json";

const latest = Math.max(...videos.map((v) => v.year));

// Protects: this year's video being unreachable — the timeline row linking to
// a page that is not there, or the page pointing at an MP4 that was never
// uploaded. The newest year is the one most likely to be half-added, and the
// one a visitor is most likely to open.
//
// Tagged @smoke: after every deploy this runs again against production.
test("follows the timeline from the home page to this year's video @smoke", async ({
  page,
}) => {
  await page.goto("/");

  // click() scrolls the row into view the way a thumb would; the timeline sits
  // below the fold on a phone.
  await page
    .locator("#timeline")
    .getByRole("link", { name: String(latest) })
    .click();

  await expect(page).toHaveURL(new RegExp(`/videos/${latest}$`));
  const video = page.locator("#video-page video");
  await expect(video).toHaveAttribute("src", new RegExp(`/Haijie-${latest}\\.mp4$`));

  // Whether the file the page points at exists is asked of the CDN directly.
  // Watching the browser fetch it is not a stable signal: that is each
  // engine's media pipeline, and they disagree. Linux WebKit opened and
  // aborted the URL twice (status 0) around the request that returned 200,
  // and Chromium reported a missing MP4 as a request with no response at all,
  // so a wait on the response only ended at the test timeout. Whether frames
  // decode is left to the smoke test, which reads the level off the file.
  const src = await video.getAttribute("src");
  const res = await page.request.get(src!, { headers: { Range: "bytes=0-1" } });
  expect([200, 206], `${src} answered ${res.status()}`).toContain(res.status());
});

// Protects: the menu — the only way to reach anything but the home page —
// failing to open on a phone.
test("reaches every year from the menu's Videos page", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("link", { name: "Menu" }).click();
  // Asserted before the click so a menu that never opens fails here, in
  // seconds and by name, rather than as a click timing out at the test limit.
  const videosLink = page.locator("#menu").getByRole("link", { name: "Videos" });
  await expect(videosLink).toBeVisible();
  await videosLink.click();

  await expect(page).toHaveURL(/\/videos$/);
  const years = page.locator("#timeline .timeline-link");
  await expect(years).toHaveCount(videos.length);
  for (const { year } of videos) {
    await expect(
      page.locator("#timeline").getByRole("link", { name: String(year) }),
    ).toHaveAttribute("href", `/videos/${year}`);
  }
});
