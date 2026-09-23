import { expect, test } from "@playwright/test";

// Protects: tapping a photo and getting the 480px grid thumbnail blown up, or
// a broken image, instead of the original. The grid and the viewer read from
// different directories on the CDN, and only the grid is exercised by simply
// loading the page.
test("opens a photo at full size and pages through the gallery", async ({ page }) => {
  await page.goto("/gallery");

  await page.locator("#gallery-main button.img").first().click();

  const viewer = page.getByRole("dialog", { name: "Photo viewer" });
  const photo = viewer.locator("img");
  await expect(photo).toHaveAttribute("src", /\/images\/gallery\//);
  await expect(photo).not.toHaveAttribute("src", /gallery-thumb/);
  // decode() settles when the image is ready to paint and rejects if it is
  // broken, so this waits on the load itself rather than on a timer.
  await photo.evaluate((img: HTMLImageElement) => img.decode());

  const first = await photo.getAttribute("src");
  await viewer.getByRole("button", { name: "Next photo" }).click();
  await expect(photo).not.toHaveAttribute("src", first!);

  await viewer.getByRole("button", { name: "Close" }).click();
  await expect(viewer).toBeHidden();
});
