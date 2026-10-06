import { expect, test } from "@playwright/test";

test("workspace launcher routes one skill and explains ambiguous requests", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByLabel("Kỹ năng muốn luyện", { exact: true })
    .fill("Reading và Writing");
  await page.getByRole("button", { name: "Mở thư viện kỹ năng" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Hãy nhập một kỹ năng" }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
  await page
    .getByLabel("Kỹ năng muốn luyện", { exact: true })
    .fill("Tôi muốn luyện nói hôm nay");
  await page.getByRole("button", { name: "Mở thư viện kỹ năng" }).click();
  await expect(page).toHaveURL(/\/speaking$/);
  await expect(page.locator("main h1")).toContainText("Speaking");
});

test("Home follows system theme and opens a suggested Reading exercise in one action", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page
    .getByRole("button", { name: "Luyện bài được gợi ý", exact: true })
    .click();
  await expect(page).toHaveURL(/\/reading\?attempt=/);
  await expect(
    page.getByRole("button", { name: "Nộp bài", exact: true }),
  ).toBeVisible();
  await page.goto("/");
  await expect(
    page.getByRole("link", { name: /Reading · ĐANG HỌC/ }),
  ).toBeVisible();
});

test("Home offers an honest next step and Practice exposes working skill libraries", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await expect(page.locator("main h1")).toBeVisible();
  await expect(page.locator("main h1")).toContainText(
    "What do you want to practise today?",
  );
  await expect(
    page.getByRole("heading", { name: "No unfinished sessions yet" }),
  ).toBeVisible();
  await expect(page.locator(".hub-counts")).toHaveCount(0);
  await expect(page.locator(".lumen-focus-row")).toHaveCount(3);
  for (const theme of ["light", "dark"]) {
    await page.locator(".profile-button").click();
    await page
      .getByRole("combobox", { name: "Giao diện", exact: true })
      .selectOption(theme);
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await page.getByRole("button", { name: "Close profile" }).click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath(`home-${theme}.png`),
      fullPage: true,
    });
  }
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page
    .getByRole("link", { name: "Thư viện luyện tập →", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Choose a skill" }),
  ).toBeVisible();
  await expect(page.locator(".hub-skill")).toHaveCount(4);
  await page.locator('.hub-skill[href="/writing"]').click();
  await expect(
    page.getByRole("heading", { name: "Hôm nay bạn muốn viết gì?" }),
  ).toBeVisible();
});

test("Home resumes saved Writing and Speaking without making new sessions", async ({
  page,
}) => {
  await page.goto("/writing?practice=1");
  await page
    .getByLabel("Bài viết bằng tiếng Anh")
    .fill(
      "This argument is saved as a draft and should be continued from the hub.",
    );
  await expect(
    page.getByRole("status").filter({ hasText: "Đã lưu nháp" }),
  ).toBeVisible();
  await page.goto("/");
  await page.getByRole("link", { name: /Writing · ĐANG HỌC/ }).click();
  await expect(page.getByLabel("Bài viết bằng tiếng Anh")).toHaveValue(
    /continued from the hub/,
  );
  await page.goto("/speaking");
  await page
    .getByRole("button", { name: "Chọn bộ đề này →", exact: true })
    .first()
    .click();
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Bắt đầu Speaking", exact: true })
    .click();
  await page
    .getByLabel("Transcript nhập tay")
    .fill("I prefer a quiet place to study.");
  await page
    .getByRole("button", { name: "Lưu câu trả lời", exact: true })
    .click();
  await expect(
    page.getByText("Dữ liệu đã lưu trên thiết bị", { exact: false }).first(),
  ).toBeVisible();
  await page.goto("/");
  await page.getByRole("link", { name: /Speaking · ĐANG HỌC/ }).click();
  await expect(page.getByLabel("Transcript nhập tay")).toHaveValue(
    "I prefer a quiet place to study.",
  );
  await page.getByRole("button", { name: "Về lịch sử", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Tiếp tục luyện", exact: true }),
  ).toHaveCount(1);
});

test("Home resumes Listening and reports blocked stores without inventing zero activity", async ({
  page,
}) => {
  await page.goto("/listening");
  await page
    .getByRole("button", { name: "Dùng bài nghe mẫu", exact: true })
    .click();
  await page.getByLabel("Câu 1: điền từ Listening").fill("Tuesday");
  await expect(page.getByRole("status")).toContainText(
    "Đã lưu trong trình duyệt",
  );
  await page.goto("/");
  await page.getByRole("link", { name: /Listening · ĐANG HỌC/ }).click();
  await expect(page.getByLabel("Câu 1: điền từ Listening")).toHaveValue(
    "Tuesday",
  );
  await page.addInitScript(() => {
    IDBFactory.prototype.open = () => {
      throw new DOMException("Blocked", "SecurityError");
    };
  });
  await page.goto("/");
  await expect(
    page.getByRole("alert").filter({ hasText: "Speaking" }),
  ).toBeVisible();
  await expect(
    page.getByRole("alert").filter({ hasText: "Listening" }),
  ).toBeVisible();
  await expect(page.locator(".hub-counts")).toHaveCount(0);
});
