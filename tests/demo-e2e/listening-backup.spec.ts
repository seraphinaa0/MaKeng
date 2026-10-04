import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import type { ListeningLesson } from "../../packages/schemas/listening";
const audioPath = "apps/web/public/audio/garden-tour.wav";
async function sample(page: Page) {
  await page.goto("/listening");
  await page.getByRole("button", { name: "Dùng bài nghe mẫu" }).click();
  await expect(page.getByLabel("Câu 1: điền từ Listening")).toBeVisible();
}
async function exportJson(page: Page) {
  await page.getByRole("button", { name: "← Thư viện Listening" }).click();
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Xuất bài & lịch sử JSON" }).click();
  return readFile((await (await downloading).path())!, "utf8");
}
async function selectJson(page: Page, text: string) {
  const details = page.locator(".listening-restore");
  if ((await details.getAttribute("open")) === null)
    await details.locator("summary").click();
  await page.getByLabel("File JSON sao lưu").setInputFiles({
    name: "listening-backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(text),
  });
}
async function selectAudio(page: Page, buffer?: Buffer) {
  await page.getByLabel("File audio đi kèm").setInputFiles({
    name: "renamed-original.wav",
    mimeType: "",
    buffer: buffer ?? (await readFile(audioPath)),
  });
}
async function dbMetadata(page: Page) {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open("makeng-listening-v1", 1);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    try {
      return await new Promise<
        Array<
          Pick<ListeningLesson, "id" | "expiresAt" | "content" | "attempts">
        >
      >((resolve, reject) => {
        const r = db.transaction("lessons").objectStore("lessons").getAll();
        r.onsuccess = () =>
          resolve(
            (r.result as ListeningLesson[]).map((row) => ({
              id: row.id,
              expiresAt: row.expiresAt,
              content: row.content,
              attempts: row.attempts,
            })),
          );
        r.onerror = () => reject(r.error);
      });
    } finally {
      db.close();
    }
  });
}
test("global deletion waits for pending restore and leaves no restored audio", async ({
  page,
  context,
}) => {
  await sample(page);
  const json = await exportJson(page);
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Xóa bài nghe" }).click();
  await expect(page.locator(".listening-library-card")).toHaveCount(0);
  await selectJson(page, json);
  await selectAudio(page);
  await page.locator(".listening-restore").getByRole("checkbox").check();
  await page.evaluate(() => {
    const original = SubtleCrypto.prototype.digest;
    SubtleCrypto.prototype.digest = async function (algorithm, data) {
      document.documentElement.dataset.hashPending = "true";
      await new Promise<void>((resolve) =>
        window.addEventListener("releaseHash", () => resolve(), { once: true }),
      );
      return original.call(this, algorithm, data);
    };
  });
  await page
    .getByRole("button", { name: "Khôi phục bài nghe", exact: true })
    .click();
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.dataset.hashPending),
    )
    .toBe("true");
  const other = await context.newPage();
  await other.goto("/");
  await expect(other.getByLabel("Bài viết bằng tiếng Anh")).toBeVisible();
  await other.getByRole("button", { name: "Lịch sử bài viết" }).click();
  await other.getByRole("button", { name: "Xóa dữ liệu phiên này" }).click();
  await other.getByRole("button", { name: "Xác nhận xóa" }).click();
  await expect
    .poll(() =>
      other.evaluate(async () =>
        (await navigator.locks.query()).pending?.some(
          (lock) => lock.name === "makeng-listening",
        ),
      ),
    )
    .toBe(true);
  await page.evaluate(() => window.dispatchEvent(new Event("releaseHash")));
  await expect(other.getByLabel("Bài viết bằng tiếng Anh")).toBeVisible();
  expect(await dbMetadata(other)).toHaveLength(0);
  await expect(page.locator(".listening-library-card")).toHaveCount(0);
  await other.close();
});
test.beforeEach(async ({ context }) => {
  await context.route("**/api/**", (route) => {
    throw new Error(`Unexpected API: ${route.request().url()}`);
  });
});
test("export, delete and restore retains submitted scores and resumable answers", async ({
  page,
}, info) => {
  await sample(page);
  for (const [i, answer] of ["Tuesday", "library", "notebook"].entries())
    await page.getByLabel(`Câu ${i + 1}: điền từ Listening`).fill(answer);
  await page.getByRole("button", { name: "Nộp bài Listening" }).click();
  await expect(
    page.getByRole("heading", { name: "3/3 câu đúng" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "← Thư viện Listening" }).click();
  await page
    .getByRole("button", { name: "Luyện bài nghe", exact: true })
    .click();
  await page.getByLabel("Câu 1: điền từ Listening").fill("Monday");
  await expect(page.getByRole("status")).toContainText(
    "Đã lưu trong trình duyệt",
  );
  const json = await exportJson(page);
  const original = await dbMetadata(page);
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Xóa bài nghe" }).click();
  await expect(page.locator(".listening-library-card")).toHaveCount(0);
  await selectJson(page, json);
  await expect(page.getByLabel("Nội dung bản sao lưu")).toContainText(
    "1 lượt đã nộp · 1 lượt đang làm",
  );
  await selectAudio(page);
  await page.getByLabel("Hạn lưu sau khôi phục").selectOption("1");
  await page
    .getByRole("button", { name: "Khôi phục bài nghe", exact: true })
    .click();
  expect(await dbMetadata(page)).toHaveLength(0);
  await page.locator(".listening-restore").getByRole("checkbox").check();
  await page.screenshot({
    path: `/tmp/makeng-restore-${info.project.name}.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Khôi phục bài nghe", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Đã khôi phục");
  await expect(page.locator(".listening-library-card")).toHaveCount(1);
  const restored = await dbMetadata(page);
  expect(restored[0].id).not.toBe(original[0].id);
  expect(restored[0].attempts.map((a) => a.id)).not.toEqual(
    original[0].attempts.map((a) => a.id),
  );
  expect(Date.parse(restored[0].expiresAt) - Date.now()).toBeGreaterThan(
    23 * 60 * 60 * 1000,
  );
  await page.reload();
  await page.locator(".listening-library-card summary").click();
  await page.getByRole("button", { name: "Xem lại bài nghe" }).click();
  await expect(
    page.getByRole("heading", { name: "3/3 câu đúng" }),
  ).toBeVisible();
  await expect(page.getByLabel("Câu 1: điền từ Listening")).toBeDisabled();
  await page.getByRole("button", { name: "← Thư viện Listening" }).click();
  await page
    .getByRole("button", { name: "Tiếp tục bài nghe", exact: true })
    .click();
  await expect(page.getByLabel("Câu 1: điền từ Listening")).toHaveValue(
    "Monday",
  );
});
test("mismatched bytes preserve inputs; concurrent restores create only one copy", async ({
  page,
  context,
}) => {
  await sample(page);
  const json = await exportJson(page);
  const original = await dbMetadata(page);
  await selectJson(page, json);
  const bad = await readFile(audioPath);
  bad[1000] ^= 1;
  await selectAudio(page, bad);
  await page.locator(".listening-restore").getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Khôi phục bài nghe", exact: true })
    .click();
  await expect(
    page.locator(".listening-restore").getByRole("alert"),
  ).toContainText("Audio không khớp");
  await expect(page.getByLabel("File audio đi kèm")).not.toBeEmpty();
  expect(await dbMetadata(page)).toEqual(original);
  await selectAudio(page);
  await page
    .getByRole("button", { name: "Khôi phục bài nghe", exact: true })
    .click();
  await expect(
    page.locator(".listening-restore").getByRole("alert"),
  ).toContainText("đã có trong thư viện");
  expect(await dbMetadata(page)).toEqual(original);
  const other = await context.newPage();
  await other.goto("/listening");
  await selectJson(other, json);
  await selectAudio(other);
  await other.locator(".listening-restore").getByRole("checkbox").check();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Xóa bài nghe" }).click();
  await expect(page.locator(".listening-library-card")).toHaveCount(0);
  await Promise.all([
    page
      .getByRole("button", { name: "Khôi phục bài nghe", exact: true })
      .click(),
    other
      .getByRole("button", { name: "Khôi phục bài nghe", exact: true })
      .click(),
  ]);
  await expect
    .poll(async () => {
      const success = (await page.getByRole("status").allTextContents())
        .concat(await other.getByRole("status").allTextContents())
        .filter((t) => t.includes("Đã khôi phục"));
      const errors = (
        await page.locator(".listening-restore [role=alert]").allTextContents()
      )
        .concat(
          await other
            .locator(".listening-restore [role=alert]")
            .allTextContents(),
        )
        .filter((t) => t.includes("đã có trong thư viện"));
      return [success.length, errors.length];
    })
    .toEqual([1, 1]);
  expect(await dbMetadata(page)).toHaveLength(1);
  await other.close();
});
test("legacy JSON restores; malformed, oversized and unsupported backups do not write", async ({
  page,
}) => {
  await sample(page);
  const envelope = JSON.parse(await exportJson(page));
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Xóa bài nghe" }).click();
  await expect(page.locator(".listening-library-card")).toHaveCount(0);
  await selectJson(page, "{broken");
  await expect(
    page.locator(".listening-restore").getByRole("alert"),
  ).toContainText("Không đọc được JSON");
  await selectJson(page, JSON.stringify({ ...envelope, schemaVersion: 2 }));
  await expect(
    page.locator(".listening-restore").getByRole("alert"),
  ).toContainText("không hợp lệ");
  await selectJson(page, " ".repeat(10 * 1024 * 1024 + 1));
  await expect(
    page.locator(".listening-restore").getByRole("alert"),
  ).toContainText("10 MiB");
  expect(await dbMetadata(page)).toHaveLength(0);
  const legacy = {
    ...envelope.lesson,
    createdAt: "2025-01-01T00:00:00.000Z",
    expiresAt: "2025-01-08T00:00:00.000Z",
  };
  await selectJson(page, JSON.stringify(legacy));
  await selectAudio(page);
  await page.locator(".listening-restore").getByRole("checkbox").check();
  await page.evaluate(() => {
    IDBObjectStore.prototype.add = () => {
      throw new DOMException("Full", "QuotaExceededError");
    };
  });
  await page
    .getByRole("button", { name: "Khôi phục bài nghe", exact: true })
    .click();
  await expect(
    page.locator(".listening-restore").getByRole("alert"),
  ).toContainText("Bộ nhớ đầy");
  expect(await dbMetadata(page)).toHaveLength(0);
  await page.reload();
  await selectJson(page, JSON.stringify(legacy));
  await selectAudio(page);
  await page.locator(".listening-restore").getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Khôi phục bài nghe", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Đã khôi phục");
  expect(await dbMetadata(page)).toHaveLength(1);
});
