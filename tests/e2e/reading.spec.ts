import { expect, test } from "@playwright/test";

async function start(page: import("@playwright/test").Page) {
  await page.goto("/reading");
  await page
    .getByRole("button", { name: "Làm bài", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/reading\?attempt=[a-f0-9-]+$/);
  await expect(
    page.getByRole("heading", { name: "A library of useful things" }),
  ).toBeVisible();
}
async function questions(page: import("@playwright/test").Page) {
  await expect(page.locator(".question-nav")).toBeVisible();
  const button = page.getByRole("button", { name: "Câu hỏi", exact: true });
  if (await button.isVisible()) await button.click();
}
test("reading saves, resumes, scores three types and reveals evidence only after submission", async ({
  page,
}) => {
  await start(page);
  await questions(page);
  const id = new URL(page.url()).searchParams.get("attempt");
  const before = await (
    await page.request.get(`/api/v1/reading/attempts/${id}`)
  ).json();
  expect(before.result).toBeNull();
  expect(before.content.solutions).toBeUndefined();
  await page
    .locator("#question-q1")
    .getByRole("radio", {
      name: "B. To make occasional repairs more affordable",
      exact: true,
    })
    .check();
  await page.locator("#question-q1").getByRole("checkbox").check();
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
  await page.getByLabel("Câu 5: điền từ").fill(" ADDRESS ");
  await page
    .getByRole("button", { name: "Lưu câu trả lời", exact: true })
    .click();
  await expect(
    page.getByText("Đã lưu trên máy chủ", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await questions(page);
  await expect(page.getByLabel("Câu 5: điền từ")).toHaveValue(" ADDRESS ");
  await expect(
    page.locator("#question-q1").getByRole("checkbox"),
  ).toBeChecked();
  await page.getByRole("button", { name: "Nộp bài", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "5/5 câu đúng" }),
  ).toBeVisible();
  await questions(page);
  await expect(page.locator(".answer-review")).toHaveCount(5);
  await page
    .getByRole("button", { name: "Dẫn chứng câu 1", exact: true })
    .click();
  await expect(page.locator("mark")).toContainText("The project aimed");
  await page
    .getByRole("button", { name: "Lịch sử Reading", exact: true })
    .click();
  await page.getByRole("button", { name: "Xem kết quả", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "5/5 câu đúng" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("offline edits survive reload and unanswered questions require explicit confirmation", async ({
  page,
  context,
}) => {
  await start(page);
  await questions(page);
  await context.setOffline(true);
  await page.getByLabel("Câu 5: điền từ").fill("address");
  await expect(
    page.getByText("Chưa lưu trên máy chủ", { exact: true }),
  ).toBeVisible();
  await context.setOffline(false);
  await page.reload();
  await questions(page);
  await expect(page.getByLabel("Câu 5: điền từ")).toHaveValue("address");
  await page.getByRole("button", { name: "Nộp bài", exact: true }).click();
  await expect(
    page.getByText("Còn 4 câu chưa trả lời.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Vẫn nộp bài", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "1/5 câu đúng" }),
  ).toBeVisible();
});

test("Reading API prevents cross-session access, stale writes and post-submit changes", async ({
  page,
  browser,
}) => {
  await start(page);
  const id = new URL(page.url()).searchParams.get("attempt");
  const origin = "http://127.0.0.1:3100";
  const headers = { Origin: origin };
  const data = { revision: 0, answers: { q1: "B" }, flagged: [] };
  expect(
    (
      await page.request.post(`/api/v1/reading/attempts/${id}/answers`, {
        data,
        headers,
      })
    ).status(),
  ).toBe(200);
  expect(
    (
      await page.request.post(`/api/v1/reading/attempts/${id}/answers`, {
        data,
        headers,
      })
    ).status(),
  ).toBe(409);
  const other = await browser.newContext({ baseURL: origin });
  await other.request.get("/api/v1/session");
  expect(
    (await other.request.get(`/api/v1/reading/attempts/${id}`)).status(),
  ).toBe(404);
  expect(
    (
      await other.request.post(`/api/v1/reading/attempts/${id}/submit`, {
        data: { revision: 1 },
        headers,
      })
    ).status(),
  ).toBe(404);
  await other.close();
  expect(
    (
      await page.request.post(`/api/v1/reading/attempts/${id}/submit`, {
        data: { revision: 1 },
        headers,
      })
    ).status(),
  ).toBe(200);
  expect(
    (
      await page.request.post(`/api/v1/reading/attempts/${id}/answers`, {
        data: { ...data, revision: 2 },
        headers,
      })
    ).status(),
  ).toBe(409);
});
