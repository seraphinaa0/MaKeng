import { expect, test } from "@playwright/test";

test("preview-width sidebar keeps navigation first and skill selection compact", async ({
  page,
}, testInfo) => {
  test.skip(page.viewportSize()!.width <= 760, "Desktop rail only");
  for (const width of [900, 1100, 1280]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/practice");
    const home = page.locator('.lumen-sidebar a[href="/"]');
    const settings = page.locator(".lumen-settings-link");
    await expect(home).toBeVisible();
    const homeBox = await home.boundingBox();
    const settingsBox = await settings.boundingBox();
    expect(homeBox!.y).toBeLessThan(settingsBox!.y);
    await expect(page.locator(".lumen-header .lumen-sidebar")).toHaveCount(0);
    for (const tile of await page
      .locator(".practice-skills .hub-skill")
      .all()) {
      const box = await tile.boundingBox();
      expect(box!.height).toBeLessThan(125);
    }
    for (const mode of ["Sáng", "Tối"]) {
      await page
        .getByRole("group", { name: "Giao diện nhanh" })
        .getByRole("button", { name: mode, exact: true })
        .click();
      await page.evaluate(async () => {
        await document.fonts.ready;
      });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: testInfo.outputPath(
          `preview-${width}-${mode === "Sáng" ? "light" : "dark"}.png`,
        ),
        fullPage: true,
        animations: "disabled",
      });
    }
  }
});

test("skill-led Practice uses the local font and real library links", async ({
  page,
}, testInfo) => {
  const remote: string[] = [];
  page.on("request", (request) => {
    if (!request.url().startsWith("http://127.0.0.1:"))
      remote.push(request.url());
  });
  await page.goto("/practice");
  await expect(page.locator(".brand")).toContainText("MaKeng");
  await expect(page.locator(".brand")).not.toContainText("lumen");
  await expect(page).toHaveTitle("MaKeng · Luyện IELTS");
  await expect(
    page.getByRole("heading", { name: "Choose a skill", exact: true }),
  ).toBeVisible();
  const fontLoaded = await page.evaluate(async () => {
    await document.fonts.load('400 16px "Manrope"');
    return document.fonts.check('400 16px "Manrope"');
  });
  expect(fontLoaded).toBe(true);
  expect(
    await page.evaluate(() => getComputedStyle(document.body).fontFamily),
  ).toContain("Manrope");
  for (const skill of ["reading", "listening", "speaking", "writing"]) {
    await expect(
      page.locator(`.practice-skills a[href="/${skill}"]`),
    ).toBeVisible();
  }
  await expect(page.locator(".lumen-mock")).toContainText("Chưa khả dụng");
  await expect(page.locator(".lumen-mock a, .lumen-mock button")).toHaveCount(
    0,
  );
  expect(remote).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath("practice-refined.png"),
    fullPage: true,
  });
  await page.locator(".profile-button").click();
  await page
    .getByRole("combobox", { name: "Giao diện", exact: true })
    .selectOption("dark");
  await page.getByRole("button", { name: "Close profile" }).click();
  expect(
    await page
      .locator(".lumen-mock")
      .evaluate((element) => getComputedStyle(element).color),
  ).toBe(
    await page
      .locator("body")
      .evaluate((element) => getComputedStyle(element).color),
  );
  await page.screenshot({
    path: testInfo.outputPath("practice-refined-dark.png"),
    fullPage: true,
  });
  await page.locator('.practice-skills a[href="/reading"]').click();
  await expect(page).toHaveURL(/\/reading$/);
});

test("active practice workspaces keep controls usable without horizontal overflow", async ({
  page,
}, testInfo) => {
  async function capture(name: string) {
    await page.evaluate(() => window.scrollTo(0, 0));
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath(`${name}.png`),
      fullPage: true,
    });
  }
  await page.goto("/");
  await page
    .getByRole("button", { name: "Luyện bài được gợi ý", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Nộp bài", exact: true }),
  ).toBeVisible();
  await capture("active-reading");
  await page.goto("/writing?practice=1");
  await page
    .getByLabel("Bài viết bằng tiếng Anh")
    .fill("Daily practice helps students learn at their own pace.");
  await capture("active-writing");
  await page.goto("/listening");
  await page
    .getByRole("button", { name: "Dùng bài nghe mẫu", exact: true })
    .click();
  await expect(page.getByLabel("Câu 1: điền từ Listening")).toBeVisible();
  await page.getByRole("button", { name: "Play audio", exact: true }).click();
  await expect(page.locator(".listening-player audio")).toHaveJSProperty(
    "paused",
    false,
  );
  await page.getByRole("button", { name: "Pause audio", exact: true }).click();
  await expect(page.locator(".listening-player audio")).toHaveJSProperty(
    "paused",
    true,
  );
  await page.getByRole("button", { name: "1.25×", exact: true }).click();
  await expect(page.locator(".listening-player audio")).toHaveJSProperty(
    "playbackRate",
    1.25,
  );
  await capture("active-listening");
  await page.goto("/speaking");
  await page
    .getByRole("button", { name: "Chọn bộ đề này →", exact: true })
    .first()
    .click();
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Bắt đầu Speaking", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Ghi âm", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".record-orb svg")).toBeVisible();
  await capture("active-speaking");
  await expect(page.locator(".lumen-header")).toBeHidden();
  await expect(page.locator(".practice-bar")).toBeVisible();
});

test("reference writing toolbar changes appearance without changing the saved plain-text draft", async ({
  page,
}) => {
  await page.goto("/writing?practice=1");
  const essay = page.getByLabel("Bài viết bằng tiếng Anh");
  await essay.fill(
    "Practice builds confidence through small, consistent improvements.",
  );
  await page.getByRole("button", { name: "Bold whole draft" }).click();
  await expect(essay).toHaveCSS("font-weight", "700");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await page.reload();
  await expect(essay).toHaveValue(
    "Practice builds confidence through small, consistent improvements.",
  );
});

test("Reading next/previous and local notes survive reload", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Luyện bài được gợi ý", exact: true })
    .click();
  await page.getByRole("button", { name: "Next →", exact: true }).click();
  await expect(page.locator(".questions-pane > h3")).toHaveText(
    /Question 2 of/,
  );
  await page.getByRole("button", { name: "← Previous", exact: true }).click();
  if (page.viewportSize()!.width <= 760)
    await page.getByRole("button", { name: "Bài đọc", exact: true }).click();
  await page.getByRole("button", { name: "▣ Add note", exact: true }).click();
  await page
    .getByLabel("Notes", { exact: true })
    .fill("Find the evidence before choosing an answer.");
  await page.getByRole("button", { name: "Save note", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "▣ Add note", exact: true }).click();
  await expect(page.getByLabel("Notes", { exact: true })).toHaveValue(
    "Find the evidence before choosing an answer.",
  );
});

test("focus mode preserves the writing draft and keeps navigation usable", async ({
  page,
}) => {
  await page.goto("/?practice=1");
  const essay = page.getByLabel("Bài viết bằng tiếng Anh");
  await essay.fill(
    "A small daily practice session helps me develop a clearer argument.",
  );
  await page.getByRole("button", { name: "Practice settings" }).click();
  await page.getByRole("button", { name: "Tập trung", exact: true }).click();
  await expect(page.locator(".lumen-header")).toBeHidden();
  await expect(essay).toHaveValue(
    "A small daily practice session helps me develop a clearer argument.",
  );
  await expect(
    page
      .getByRole("navigation")
      .getByRole("link", { name: "Reading", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Thoát tập trung" }).click();
  await expect(page.getByRole("progressbar")).toHaveAttribute("value", "11");
  await expect(
    page.getByRole("link", { name: "Cấu hình, quyền & sao lưu" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("dialog", { name: "Profile", exact: true }),
  ).toBeHidden();
});

test("all learning screens fit the viewport with readable navigation", async ({
  page,
}, testInfo) => {
  for (const path of [
    "/",
    "/practice",
    "/sources",
    "/writing",
    "/reading",
    "/listening",
    "/speaking",
    "/create",
    "/progress",
    "/backup",
  ]) {
    await page.goto(path);
    await expect(page.locator("main h1").first()).toBeVisible();
    const mainBounds = await page.locator("main#main").boundingBox();
    expect(mainBounds).not.toBeNull();
    if (page.viewportSize()!.width > 900) {
      expect(mainBounds!.x).toBeGreaterThanOrEqual(220);
    }
    await expect(page.locator('nav [aria-current="page"]:visible')).toHaveCount(
      1,
    );
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      )
      .toBe(true);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: testInfo.outputPath(`${path.slice(1) || "writing"}.png`),
      fullPage: true,
    });
  }
});
