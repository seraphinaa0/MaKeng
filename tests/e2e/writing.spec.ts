import { expect, test } from "@playwright/test";

const essay =
  "I believe that cities should invest in public parks. Green spaces give residents somewhere to exercise and spend time together. For example, a neighbourhood garden can bring people of different ages together. Although shops create jobs, access to outdoor space supports the whole community. Therefore, public parks should be a priority.";

test("autosaves, submits, survives refresh, displays feedback, exports and deletes", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Bài viết của bạn", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Bài viết bằng tiếng Anh").fill(essay);
  await expect(
    page.getByText("Đã lưu nháp trên thiết bị", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Bài viết bằng tiếng Anh")).toHaveValue(essay);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Lưu & xem phản hồi mẫu" }).click();
  await expect(page.getByRole("heading", { name: "Bản đã nộp" })).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Hiểu bài viết, tiến thêm một bước." }),
  ).toBeVisible({ timeout: 20000 });
  await expect(page.getByText("Band minh họa")).toBeVisible();
  await expect(page.locator("blockquote")).toHaveCount(4);
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Tải bản lưu" }).click();
  expect((await downloadEvent).suggestedFilename()).toMatch(
    /^makeng-.*\.json$/,
  );
  await page.getByRole("button", { name: "Lịch sử bài viết" }).click();
  await expect(page.locator(".history-item")).toHaveCount(1);
  await page.getByRole("button", { name: "Xem bài" }).click();
  await expect(page.locator(".essay-copy")).toHaveText(essay);
  await page.getByRole("button", { name: "Xóa bài", exact: true }).click();
  await page.getByRole("button", { name: "Xác nhận xóa" }).click();
  await page.getByRole("button", { name: "Lịch sử bài viết" }).click();
  await expect(page.getByText("Trang đầu tiên đang chờ bạn.")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("enforces API ownership, consent, origin and idempotency", async ({
  page,
  browser,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Bài viết của bạn", exact: true }),
  ).toBeVisible();
  const origin = "http://127.0.0.1:3100";
  const key = crypto.randomUUID();
  const data = {
    prompt: "Should cities invest more in parks than shopping centres?",
    essay,
    consent: true,
  };
  const headers = { Origin: origin, "Idempotency-Key": key };
  const created = await page.request.post("/api/v1/writing/submissions", {
    data,
    headers,
  });
  expect(created.status()).toBe(202);
  const item = await created.json();
  const replay = await page.request.post("/api/v1/writing/submissions", {
    data,
    headers,
  });
  expect((await replay.json()).id).toBe(item.id);
  expect(
    (
      await page.request.post("/api/v1/writing/submissions", {
        data: { ...data, consent: false },
        headers,
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await page.request.delete(`/api/v1/writing/submissions/${item.id}`, {
        headers: { Origin: "https://evil.example" },
      })
    ).status(),
  ).toBe(403);
  const other = await browser.newContext({ baseURL: origin });
  await other.request.get("/api/v1/session");
  expect(
    (
      await other.request.get(`/api/v1/writing/submissions/${item.id}`)
    ).status(),
  ).toBe(404);
  expect(
    (
      await other.request.delete(`/api/v1/writing/submissions/${item.id}`, {
        headers: { Origin: origin },
      })
    ).status(),
  ).toBe(404);
  await other.close();
});
