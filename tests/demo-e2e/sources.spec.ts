import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("source library credits, filters and exports text without publishing or remote media", async ({
  page,
}, testInfo) => {
  const external: string[] = [];
  page.on("request", (request) => {
    if (
      !request.url().startsWith("http://127.0.0.1:") &&
      !request.url().startsWith("blob:")
    )
      external.push(request.url());
  });
  await page.goto("/practice");
  await page.getByRole("link", { name: "Open learning resources →" }).click();
  await expect(
    page.getByRole("heading", { name: "Tài liệu nguồn", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".source-item")).toHaveCount(4);
  const wiki = page
    .locator(".source-item")
    .filter({ hasText: "Urban heat island — opening excerpt" });
  await wiki.locator("summary").click();
  await expect(wiki.getByRole("link", { name: "Nguồn gốc ↗" })).toHaveAttribute(
    "href",
    /oldid=1376668977/,
  );
  await expect(
    wiki.getByRole("link", { name: "Giấy phép / điều khoản ↗" }),
  ).toHaveAttribute("href", "https://creativecommons.org/licenses/by-sa/4.0/");
  await expect(
    wiki.getByText("Contributors to English Wikipedia, Urban heat island"),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Nguồn chưa nhập" }),
  ).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Tải gói văn bản + giấy phép" }).click(),
  ]);
  expect(download.suggestedFilename()).toBe(
    "makeng-open-content-starter-v1.json",
  );
  const pack = JSON.parse(await readFile((await download.path())!, "utf8"));
  expect(pack.status).toBe("source-only");
  expect(pack.items).toHaveLength(4);
  expect(pack.items[1].license).toBe("CC-BY-SA-4.0");
  await page.getByLabel("Lọc kỹ năng").selectOption("reading");
  await expect(page.locator(".source-item")).toHaveCount(3);
  await expect(page.locator("audio")).toHaveCount(0);
  await page.getByLabel("Lọc kỹ năng").selectOption("listening");
  await expect(page.locator(".source-item")).toHaveCount(1);
  const audio = page.locator("audio");
  await expect(audio).toHaveAttribute("src", "/audio/voa-welcome.mp3");
  expect(
    await audio.evaluate((element: HTMLAudioElement) => element.paused),
  ).toBe(true);
  await audio.evaluate((element: HTMLAudioElement) => element.play());
  await expect
    .poll(() => audio.evaluate((element: HTMLAudioElement) => element.duration))
    .toBeGreaterThan(28);
  await expect
    .poll(() => audio.evaluate((element: HTMLAudioElement) => element.duration))
    .toBeLessThan(31);
  await audio.evaluate((element: HTMLAudioElement) => element.pause());
  expect(external).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.locator(".profile-button").click();
  await page
    .getByRole("combobox", { name: "Giao diện", exact: true })
    .selectOption("dark");
  await page.getByRole("button", { name: "Close profile" }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: testInfo.outputPath("sources-dark.png"),
    fullPage: true,
  });
});

test("source library reports failed audio and new original catalogs remain usable", async ({
  page,
}) => {
  await page.route("**/audio/voa-welcome.mp3", (route) =>
    route.fulfill({ status: 404 }),
  );
  await page.goto("/sources");
  const audio = page.locator("audio");
  await audio.evaluate((element: HTMLAudioElement) => element.load());
  await expect(
    page.getByRole("alert").filter({ hasText: "Không mở được audio local" }),
  ).toBeVisible();
  await page.goto("/speaking");
  await expect(page.locator(".catalog-card")).toHaveCount(5);
  await page
    .locator(".catalog-card")
    .filter({ hasText: "Environment & small habits" })
    .getByRole("button")
    .click();
  await expect(
    page.getByRole("button", { name: "Bắt đầu Speaking", exact: true }),
  ).toBeVisible();
  await page.goto("/writing");
  await page.getByRole("searchbox").fill("Repair or replace");
  await expect(page.locator(".catalog-card")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Mở đề & bắt đầu viết →", exact: true })
    .click();
  await expect(page.locator(".prompt-input")).toHaveValue(/repairing them/);
  await page
    .getByRole("button", { name: "← Đổi đề trong thư viện", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Task 1 · Mô tả dữ liệu", exact: true })
    .click();
  await page.getByRole("searchbox").fill("Năng lượng");
  await page
    .getByRole("button", { name: "Chọn đề ngẫu nhiên", exact: true })
    .click();
  await expect(page.getByRole("table")).toContainText("Heating");
  await expect(page.locator(".prompt-input")).toHaveValue(/fictional region/);
});
