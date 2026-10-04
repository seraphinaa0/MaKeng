import { expect, test, type Page } from "@playwright/test";
async function questions(page: Page) {
  await expect(page.locator(".question-nav")).toBeVisible();
  const tab = page.getByRole("button", { name: "Câu hỏi", exact: true });
  if (await tab.isVisible()) await tab.click();
}
async function makeMistake(page: Page) {
  await page.goto("/reading");
  await page
    .getByRole("button", { name: "Làm bài", exact: true })
    .first()
    .click();
  await questions(page);
  await page.locator("#question-q1").getByRole("radio").first().check();
  await page
    .locator("#question-q2")
    .getByRole("radio", { name: "TRUE", exact: true })
    .check();
  await page
    .locator("#question-q3")
    .getByRole("radio", { name: "FALSE", exact: true })
    .check();
  await page
    .locator("#question-q4")
    .getByRole("radio", { name: "NOT GIVEN", exact: true })
    .check();
  await page.getByLabel("Câu 5: điền từ").fill("address");
  await page.getByRole("button", { name: "Nộp bài", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "4/5 câu đúng" }),
  ).toBeVisible();
}
test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", (route) => {
    throw new Error(`Unexpected backend request: ${route.request().url()}`);
  });
});
test("failed preference save restores the checkbox and reports the storage error", async ({
  page,
}) => {
  await page.goto("/progress");
  await expect(page.getByLabel("Bật gợi ý luyện tập")).toBeChecked();
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Full", "QuotaExceededError");
    };
  });
  // Click rather than uncheck: a failed write intentionally restores the previous state.
  await page.getByLabel("Bật gợi ý luyện tập").click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Không lưu được",
  );
  await expect(page.getByLabel("Bật gợi ý luyện tập")).toBeChecked();
});
test("empty progress supports persistent opt-out, dismiss/restore and practice navigation", async ({
  page,
}) => {
  await page.goto("/progress");
  await expect(
    page.getByText("Chưa có bài Reading đã nộp trong khoảng này.", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(page.locator(".progress-stats")).not.toContainText("NaN");
  const suggestion = await page
    .locator(".recommendation h3")
    .first()
    .textContent();
  await page.getByRole("button", { name: "Bỏ qua", exact: true }).click();
  await page.reload();
  await expect(page.locator(".recommendation h3")).not.toHaveText(suggestion!);
  await page.getByLabel("Bật gợi ý luyện tập").uncheck();
  await expect(page.getByText("Gợi ý đã tắt.", { exact: false })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Bật gợi ý luyện tập")).not.toBeChecked();
  await page.getByLabel("Bật gợi ý luyện tập").check();
  await page.getByRole("button", { name: "Khôi phục gợi ý đã bỏ qua" }).click();
  await expect(page.locator(".recommendation h3")).toHaveText(suggestion!);
  await page.getByRole("button", { name: "Luyện bài này" }).click();
  await expect(page).toHaveURL(/reading\?attempt=/);
  await questions(page);
});
test("completed Reading feeds progress and mistake retries preserve original score", async ({
  page,
}, info) => {
  await makeMistake(page);
  await page.getByRole("link", { name: "Xem tiến độ và ôn câu sai" }).click();
  await expect(page.locator(".progress-stats")).toContainText("4/5");
  await expect(
    page.locator(".recommendation").filter({ hasText: "Ôn lỗi" }),
  ).toContainText("1 câu Trắc nghiệm");
  await page.getByLabel("Khoảng thời gian").selectOption("7");
  await expect(page.locator(".progress-stats")).toContainText("4/5");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: `/tmp/makeng-phase4-${info.project.name}.png`,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Ôn các câu này" }).click();
  await page.getByRole("button", { name: "Ôn câu này", exact: true }).click();
  const practice = page.getByRole("region", {
    name: "Ôn câu sai",
    exact: true,
  });
  await practice.getByRole("radio").nth(2).check();
  await practice.getByRole("button", { name: "Kiểm tra câu trả lời" }).click();
  await expect(practice.getByRole("status")).toContainText("Chưa đúng");
  await practice.getByRole("radio").nth(1).check();
  await practice.getByRole("button", { name: "Kiểm tra câu trả lời" }).click();
  await expect(practice.getByRole("status")).toContainText("Đúng — đã chuyển");
  await page.reload();
  await page
    .getByRole("button", { name: "Ôn câu sai (0)", exact: true })
    .click();
  await page.getByLabel("Trạng thái ôn").selectOption("reviewed");
  await page.getByRole("button", { name: "Xem câu đã ôn" }).click();
  await expect(practice).toContainText("Đã thử lại 2 lần");
  await practice.getByRole("button", { name: "Đưa lại vào hàng đợi" }).click();
  await expect(
    page.getByRole("button", { name: "Ôn câu sai (1)", exact: true }),
  ).toBeVisible();
  await practice
    .getByRole("link", { name: "Xem bài gốc và dẫn chứng" })
    .click();
  await expect(
    page.getByRole("heading", { name: "4/5 câu đúng" }),
  ).toBeVisible();
});
test("old browser state migrates, unavailable storage does not invent statistics", async ({
  page,
}) => {
  await makeMistake(page);
  await page.evaluate(() => {
    const key = "makeng-browser-demo-v1";
    const value = JSON.parse(localStorage.getItem(key)!);
    delete value.learning;
    value.version = 1;
    localStorage.setItem(key, JSON.stringify(value));
  });
  await page.goto("/progress");
  await expect(page.locator(".progress-stats")).toContainText("4/5");
  await page.getByLabel("Bật gợi ý luyện tập").uncheck();
  await expect(page.getByText("Gợi ý đã tắt.", { exact: false })).toBeVisible();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("makeng-browser-demo-v1")!).version,
    ),
  ).toBe(2);
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new DOMException("Blocked", "SecurityError");
    };
  });
  await page.reload();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "chặn lưu dữ liệu",
  );
  await expect(page.locator(".progress-stats")).toHaveCount(0);
  await expect(
    page.getByText("Đang cập nhật tiến độ…", { exact: true }),
  ).toHaveCount(0);
});
