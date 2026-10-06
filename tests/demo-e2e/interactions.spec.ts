import { expect, test } from "@playwright/test";

test("hover and press give feedback without changing tile layout", async ({
  page,
}, info) => {
  test.skip(page.viewportSize()!.width <= 760, "Fine-pointer desktop hover");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/practice");
  const tile = page.locator('.practice-skills a[href="/reading"]');
  await tile.hover();
  await expect
    .poll(() => tile.evaluate((element) => getComputedStyle(element).transform))
    .toBe("matrix(1, 0, 0, 1, 0, -2)");
  await page.screenshot({ path: info.outputPath("hover.png"), fullPage: true });
  const button = page.locator(".profile-button");
  await button.hover();
  await page.mouse.down();
  try {
    await expect
      .poll(() =>
        button.evaluate((element) => getComputedStyle(element).transform),
      )
      .toContain("0.97");
  } finally {
    await page.mouse.up();
  }
  await expect(
    page.getByRole("dialog", { name: "Profile", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".lumen-settings-panel")).toHaveCSS(
    "animation-name",
    "interaction-reveal",
  );
  await page.keyboard.press("Escape");
  await page.locator(".lumen-sidebar button[disabled]").first().hover();
  await expect(
    page.locator(".lumen-sidebar button[disabled]").first(),
  ).toHaveCSS("transform", "none");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("keyboard focus and reduced motion retain functional feedback", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/practice");
  const tile = page.locator('.practice-skills a[href="/reading"]');
  await tile.focus();
  await page.keyboard.press("Tab");
  await tile.focus();
  await expect(tile).toHaveCSS("outline-style", "solid");
  await expect(tile).toHaveCSS("transition-duration", "0s");
  await tile.hover();
  await expect(tile).toHaveCSS("transform", "none");
  await page.locator(".profile-button").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".lumen-settings-panel")).toHaveCSS(
    "animation-name",
    "none",
  );
  await page.keyboard.press("Escape");
  await expect(page.locator(".lumen-settings-panel")).toBeHidden();
  await tile.click();
  await expect(page).toHaveURL(/\/reading$/);
});
