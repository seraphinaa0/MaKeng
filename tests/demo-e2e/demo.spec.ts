import { expect, test, type Page } from "@playwright/test";

async function questions(page: Page) {
  await expect(page.locator(".question-nav")).toBeVisible();
  const tab = page.getByRole("button", { name: "Câu hỏi", exact: true });
  if (await tab.isVisible()) await tab.click();
}
test.beforeEach(async ({ page }) => {
  // Demo must work without calling any application backend, including session.
  await page.route("**/api/**", (route) => {
    throw new Error(`Unexpected API request: ${route.request().url()}`);
  });
});
test("Phase 2 demo works without API: reload, score, evidence, history", async ({
  page,
}) => {
  await page.goto("/reading");
  await expect(page.locator(".library-card")).toHaveCount(5);
  await page
    .getByRole("button", { name: "Làm bài", exact: true })
    .first()
    .click();
  await questions(page);
  await page.locator("#question-q1").getByRole("radio").nth(1).check();
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
  await expect(
    page.getByText("Đã lưu trong trình duyệt", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await questions(page);
  await expect(page.getByLabel("Câu 5: điền từ")).toHaveValue("address");
  await page.getByRole("button", { name: "Nộp bài", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "5/5 câu đúng" }),
  ).toBeVisible();
  await questions(page);
  await page
    .getByRole("button", { name: "Dẫn chứng câu 1", exact: true })
    .click();
  await expect(page.locator("mark")).toContainText("The project aimed");
  await page
    .getByRole("button", { name: "Lịch sử Reading", exact: true })
    .click();
  await expect(
    page.getByText("Kết quả: 5/5 câu đúng", { exact: false }),
  ).toBeVisible();
});
test("Writing demo returns mock feedback, persists and deletes", async ({
  page,
}) => {
  await page.goto("/?practice=1");
  await page
    .getByLabel("Bài viết bằng tiếng Anh")
    .fill(
      "Public gardens give residents a space to exercise and meet neighbours. I believe cities should invest in them for a healthier community.",
    );
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Lưu & xem phản hồi mẫu" }).click();
  await expect(page.getByText("Band minh họa")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Band minh họa")).toBeVisible();
  await page.getByRole("button", { name: "Xóa bài", exact: true }).click();
  await page.getByRole("button", { name: "Xác nhận xóa" }).click();
  await page.getByRole("button", { name: "Lịch sử bài viết" }).click();
  await expect(page.getByText("Trang đầu tiên đang chờ bạn.")).toBeVisible();
});
test("Phase 3 generates, validates, edits, approves, publishes and practices", async ({
  page,
}, testInfo) => {
  await page.goto("/create");
  await page
    .getByLabel("Tiêu đề", { exact: true })
    .fill("Community garden demo");
  await page.getByLabel("Tác giả nguồn").fill("Demo Author");
  await page
    .getByLabel("Văn bản tiếng Anh")
    .fill(
      "Residents built a community garden beside the local library. Volunteers water the plants every morning.\n\nThe garden provides vegetables for the community kitchen. Visitors can learn about growing food at weekly workshops.",
    );
  await page.getByRole("checkbox", { name: /Tôi là tác giả/ }).check();
  await page.getByRole("button", { name: "Tạo 3 câu hỏi mẫu" }).click();
  await expect(
    page.getByRole("heading", { name: "2. Kiểm tra câu hỏi" }),
  ).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: `/tmp/makeng-phase3-${testInfo.project.name}.png`,
  });
  await expect(
    page.getByRole("button", { name: "Phát hành trên thiết bị", exact: true }),
  ).toBeDisabled();
  const original = await page
    .getByRole("textbox", { name: "Trích dẫn chính xác 1", exact: true })
    .inputValue();
  await page
    .getByRole("textbox", { name: "Trích dẫn chính xác 1", exact: true })
    .fill("Not in source");
  await expect(
    page.getByRole("button", { name: "Lưu sửa đổi" }),
  ).toBeDisabled();
  await page
    .getByRole("textbox", { name: "Trích dẫn chính xác 1", exact: true })
    .fill(original);
  await page
    .getByRole("textbox", { name: "Giải thích 1", exact: true })
    .fill("The first option is explicitly supported by the opening sentence.");
  await page.getByRole("button", { name: "Lưu sửa đổi" }).click();
  await expect(
    page.getByText("Đã lưu thay đổi trong trình duyệt."),
  ).toBeVisible();
  await page.getByLabel("Tên người tự duyệt").fill("Local Reviewer");
  await page.getByRole("checkbox", { name: /Tôi đã kiểm tra/ }).check();
  await page
    .getByRole("button", { name: "Duyệt bản nháp", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Phát hành trên thiết bị", exact: true })
    .click();
  await expect(
    page.getByText("Đã thêm vào thư viện Reading trên thiết bị này."),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Xuất dữ liệu demo" }).click();
  expect((await download).suggestedFilename()).toBe("makeng-demo-backup.json");
  await page.getByRole("link", { name: "Luyện bài vừa tạo" }).click();
  const card = page
    .locator(".library-card")
    .filter({ hasText: "Community garden demo" });
  await card.getByRole("button", { name: "Làm bài" }).click();
  await questions(page);
  await page.locator("#question-q1").getByRole("radio").first().check();
  await page
    .locator("#question-q2")
    .getByRole("radio", { name: "TRUE", exact: true })
    .check();
  await page.getByLabel("Câu 3: điền từ").fill("Residents");
  await page.getByRole("button", { name: "Nộp bài", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "3/3 câu đúng" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "3/3 câu đúng" }),
  ).toBeVisible();
});
test("storage failure shows actionable error instead of endless loading", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Full", "QuotaExceededError");
    };
  });
  await page.goto("/reading");
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Không lưu được",
  );
  await expect(page.getByText("Đang tải…", { exact: true })).toHaveCount(0);
});

test("Reading demo detects stale answers between tabs", async ({
  page,
  context,
}) => {
  await page.goto("/reading");
  await page
    .getByRole("button", { name: "Làm bài", exact: true })
    .first()
    .click();
  await questions(page);
  const other = await context.newPage();
  await other.goto(page.url());
  await questions(other);
  await page.getByLabel("Câu 5: điền từ").fill("address");
  await expect(
    page.getByText("Đã lưu trong trình duyệt", { exact: true }),
  ).toBeVisible();
  await other.getByLabel("Câu 5: điền từ").fill("stale answer");
  await expect(other.getByRole("main").getByRole("alert")).toContainText(
    "tab khác",
  );
  await expect(
    other.getByRole("button", { name: "Tải bản đã lưu", exact: true }),
  ).toBeVisible();
  await other.close();
});
