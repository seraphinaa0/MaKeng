import { expect, test, type Page } from "@playwright/test";
import { resolve } from "node:path";
import { readFile } from "node:fs/promises";
import sample from "../../packages/content/listening-sample.json" with { type: "json" };

async function start(page: Page) {
  await page.goto("/listening");
  await page.getByRole("button", { name: "Dùng bài nghe mẫu" }).click();
  await expect(page.getByLabel("Câu 1: điền từ Listening")).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator(".listening-player audio")
        .evaluate((a: HTMLAudioElement) => a.duration),
    )
    .toBeGreaterThan(20);
}
async function records(page: Page) {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open("makeng-listening-v1", 1);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    try {
      return await new Promise<
        Array<{ id: string; blob: Blob; attempts: unknown[] }>
      >((resolve, reject) => {
        const tx = db.transaction("lessons", "readonly");
        const r = tx.objectStore("lessons").getAll();
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
    } finally {
      db.close();
    }
  });
}
test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", (route) => {
    throw new Error(`Unexpected API: ${route.request().url()}`);
  });
});
test("review regression: Listening 30-day retention expires without focus or navigation", async ({
  page,
}) => {
  await page.clock.install();
  await start(page);
  await page.getByRole("button", { name: "← Thư viện Listening" }).click();
  await page.getByLabel("Hạn lưu A community garden tour").selectOption("30");
  await expect(page.getByLabel("Hạn lưu A community garden tour")).toHaveValue(
    "30",
  );
  await page.getByRole("button", { name: "Tiếp tục bài nghe" }).click();
  await expect(page.locator(".listening-player audio")).toHaveAttribute(
    "src",
    /^blob:/,
  );
  for (let i = 0; i < 3; i++) await page.clock.fastForward(9 * 86400000);
  expect(await records(page)).toHaveLength(1);
  await page.clock.fastForward(4 * 86400000);
  await expect(page.locator(".listening-player")).toHaveCount(0);
  expect(await records(page)).toHaveLength(0);
});
test("Listening sample: persistence, immutable score, timed evidence, export and deletion", async ({
  page,
}, testInfo) => {
  await start(page);
  await expect(
    page.getByRole("heading", { name: "Transcript theo thời gian" }),
  ).toHaveCount(0);
  await page.getByLabel("Câu 1: điền từ Listening").fill("Tuesday");
  await expect(page.getByRole("status")).toContainText(
    "Đã lưu trong trình duyệt",
  );
  const audioUrl = await page
    .locator(".listening-player audio")
    .getAttribute("src");
  await page.getByLabel("Câu 2: điền từ Listening").fill("library");
  await page.getByLabel("Câu 3: điền từ Listening").fill("notebook");
  await page.getByRole("button", { name: "Nộp bài Listening" }).click();
  await expect(
    page.getByRole("heading", { name: "3/3 câu đúng" }),
  ).toBeVisible();
  await expect(page.locator(".listening-player audio")).toHaveAttribute(
    "src",
    audioUrl!,
  );
  await expect(page.getByLabel("Câu 1: điền từ Listening")).toBeDisabled();
  await page.getByLabel("Tốc độ nghe").selectOption("1.5");
  await page.getByRole("button", { name: "Nghe dẫn chứng câu 2" }).click();
  await expect
    .poll(() =>
      page
        .locator(".listening-player audio")
        .evaluate((a: HTMLAudioElement) => a.currentTime),
    )
    .toBeGreaterThanOrEqual(sample.cues[1].start);
  await expect(page.locator(".cue-active")).toContainText("library");
  await expect
    .poll(
      () =>
        page
          .locator(".listening-player audio")
          .evaluate((a: HTMLAudioElement) => a.paused),
      { timeout: 10000 },
    )
    .toBe(true);
  const time = await page
    .locator(".listening-player audio")
    .evaluate((a: HTMLAudioElement) => a.currentTime);
  expect(time).toBeLessThan(sample.cues[1].end + 0.7);
  await page.screenshot({
    path: `/tmp/makeng-phase5-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await page.reload();
  await page.getByText("1 lượt luyện", { exact: true }).click();
  await page.getByRole("button", { name: "Xem lại bài nghe" }).click();
  await expect(
    page.getByRole("heading", { name: "3/3 câu đúng" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "← Thư viện Listening" }).click();
  const exported = page.waitForEvent("download");
  await page.getByRole("button", { name: "Xuất bài & lịch sử JSON" }).click();
  expect((await exported).suggestedFilename()).toMatch(/^listening-.*\.json$/);
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Xóa bài nghe" }).click();
  await expect(page.locator(".listening-library-card")).toHaveCount(0);
  expect(await records(page)).toHaveLength(0);
});
test("private upload validates timestamp and review before local practice", async ({
  page,
}) => {
  const posts: string[] = [];
  page.on("request", (r) => {
    if (r.method() === "POST") posts.push(r.url());
  });
  await page.goto("/listening");
  await page.getByRole("button", { name: "Nhập audio của bạn" }).click();
  await page.getByLabel("File audio", { exact: true }).setInputFiles({
    name: "private-original.wav",
    mimeType: "audio/wav",
    buffer: await readFile(resolve("apps/web/public/audio/garden-tour.wav")),
  });
  const vtt =
    "WEBVTT\n\ncue-1\n00:00.500 --> 00:05.000\nThe tour is on Tuesday.";
  await page
    .getByRole("textbox", { name: "Transcript WebVTT" })
    .fill(vtt.replace("00:05.000", "00:59.000"));
  await page
    .getByRole("button", { name: "Kiểm tra audio & transcript" })
    .click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Timestamp vượt quá",
  );
  expect(await records(page)).toHaveLength(0);
  await page.getByRole("textbox", { name: "Transcript WebVTT" }).fill(vtt);
  await page
    .getByRole("button", { name: "Kiểm tra audio & transcript" })
    .click();
  await page.getByLabel("Tiêu đề bài nghe").fill("Private original tour");
  await page.getByLabel("Tác giả audio và transcript").fill("Test Author");
  await page.getByLabel("Câu hỏi có chỗ trống ___").fill("The tour is on ___.");
  await page.getByLabel("Đáp án nguyên văn trong cue").fill("Tuesday");
  await page.getByLabel("Người kiểm duyệt").fill("Local Reviewer");
  await page.getByRole("button", { name: "Lưu bài nghe riêng tư" }).click();
  expect(await records(page)).toHaveLength(0);
  await page.getByRole("checkbox").nth(0).check();
  await page.getByRole("checkbox").nth(1).check();
  await page.getByLabel("Hạn lưu audio").selectOption("1");
  await page.getByRole("button", { name: "Lưu bài nghe riêng tư" }).click();
  await expect(
    page.getByRole("heading", { name: "Private original tour" }),
  ).toBeVisible();
  await page.getByLabel("Câu 1: điền từ Listening").fill("Tuesday");
  await expect(page.getByRole("status")).toContainText(
    "Đã lưu trong trình duyệt",
  );
  await page.reload();
  await page.getByRole("button", { name: "Tiếp tục bài nghe" }).click();
  await expect(page.getByLabel("Câu 1: điền từ Listening")).toHaveValue(
    "Tuesday",
  );
  await page.getByRole("button", { name: "Nộp bài Listening" }).click();
  await expect(
    page.getByRole("heading", { name: "1/1 câu đúng" }),
  ).toBeVisible();
  expect(posts).toEqual([]);
});
test("cross-tab revision conflict preserves the first save; deletion revokes active audio", async ({
  page,
  context,
}) => {
  await start(page);
  const other = await context.newPage();
  await other.goto("/listening");
  await other.getByRole("button", { name: "Tiếp tục bài nghe" }).click();
  await expect(other.locator(".listening-player audio")).toHaveAttribute(
    "src",
    /^blob:/,
  );
  const url = await other
    .locator(".listening-player audio")
    .getAttribute("src");
  await page.getByLabel("Câu 1: điền từ Listening").fill("Tuesday");
  await expect(page.getByRole("status")).toContainText(
    "Đã lưu trong trình duyệt",
  );
  await other.getByLabel("Câu 1: điền từ Listening").fill("Monday");
  await expect(other.getByRole("main").getByRole("alert")).toContainText(
    "tab khác",
  );
  expect((await records(page))[0].attempts).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ answers: { q1: "Tuesday" } }),
    ]),
  );
  await page.getByRole("button", { name: "← Thư viện Listening" }).click();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Xóa bài nghe" }).click();
  await expect(other.locator(".listening-player")).toHaveCount(0);
  await expect(other.getByRole("main").getByRole("alert")).toContainText(
    "đã bị xóa",
  );
  await expect
    .poll(() =>
      other.evaluate(async (url) => {
        try {
          await fetch(url!);
          return true;
        } catch {
          return false;
        }
      }, url),
    )
    .toBe(false);
  await other.close();
});
test("expiration removes blob, transcript and attempts on next access", async ({
  page,
}) => {
  await start(page);
  await page.getByRole("button", { name: "← Thư viện Listening" }).click();
  await page.getByLabel("Hạn lưu A community garden tour").selectOption("30");
  await expect(page.getByLabel("Hạn lưu A community garden tour")).toHaveValue(
    "30",
  );
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const r = indexedDB.open("makeng-listening-v1", 1);
      r.onsuccess = () => resolve(r.result);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("lessons", "readwrite");
      const store = tx.objectStore("lessons");
      const r = store.getAll();
      r.onsuccess = () => {
        const lesson = r.result[0];
        lesson.createdAt = "2025-01-01T00:00:00.000Z";
        lesson.expiresAt = "2025-01-02T00:00:00.000Z";
        store.put(lesson);
      };
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error);
    });
    db.close();
  });
  await page.reload();
  await expect(page.locator(".listening-library-card")).toHaveCount(0);
  await expect(
    page.getByText("Chưa có bài nghe trên thiết bị.", { exact: false }),
  ).toBeVisible();
  expect(await records(page)).toHaveLength(0);
});
test("blocked storage and corrupt records show errors without fake success or erasure", async ({
  page,
}) => {
  await start(page);
  await page.getByRole("button", { name: "← Thư viện Listening" }).click();
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const r = indexedDB.open("makeng-listening-v1", 1);
      r.onsuccess = () => resolve(r.result);
    });
    await new Promise<void>((resolve) => {
      const tx = db.transaction("lessons", "readwrite");
      const s = tx.objectStore("lessons");
      const r = s.getAll();
      r.onsuccess = () => {
        const lesson = r.result[0];
        lesson.content.transcript.cues[0].end = 999;
        s.put(lesson);
      };
      tx.oncomplete = () => resolve();
    });
    db.close();
  });
  await page.reload();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Timestamp vượt quá",
  );
  expect(await records(page)).toHaveLength(1);
  await page.addInitScript(() => {
    IDBFactory.prototype.open = () => {
      throw new DOMException("Blocked", "SecurityError");
    };
  });
  await page.reload();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Không truy cập được bộ nhớ audio",
  );
  await expect(page.getByText("Đang đọc dữ liệu trên thiết bị…")).toHaveCount(
    0,
  );
  await expect(
    page.getByText("Chưa có bài nghe trên thiết bị.", { exact: false }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Dùng bài nghe mẫu" }),
  ).toBeDisabled();
});
test("failed IndexedDB write preserves the draft and never reports saved", async ({
  page,
}) => {
  await start(page);
  await page.evaluate(() => {
    IDBObjectStore.prototype.put = () => {
      throw new DOMException("Full", "QuotaExceededError");
    };
  });
  await page.getByLabel("Câu 1: điền từ Listening").fill("Tuesday");
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Bộ nhớ đầy",
  );
  await expect(page.getByLabel("Câu 1: điền từ Listening")).toHaveValue(
    "Tuesday",
  );
  await expect(page.getByRole("status")).toContainText("Chưa lưu");
  expect((await records(page))[0].attempts).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ answers: {}, revision: 0 }),
    ]),
  );
});
test("global delete fails explicitly when audio storage is blocked, preserving Writing data", async ({
  page,
}) => {
  await start(page);
  await page.goto("/?practice=1");
  await page
    .getByLabel("Bài viết bằng tiếng Anh")
    .fill(
      "Community gardens help residents learn new skills and meet their neighbours. Cities should support these spaces for everyone.",
    );
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Lưu & xem phản hồi mẫu" }).click();
  await expect(page.getByText("Band minh họa")).toBeVisible();
  const before = await page.evaluate(() =>
    localStorage.getItem("makeng-browser-demo-v1"),
  );
  await page.evaluate(() => {
    IDBFactory.prototype.open = () => {
      throw new DOMException("Blocked", "SecurityError");
    };
  });
  await page.getByRole("button", { name: "Lịch sử bài viết" }).click();
  await page.getByRole("button", { name: "Xóa dữ liệu phiên này" }).click();
  await page.getByRole("button", { name: "Xác nhận xóa" }).click();
  await expect(page.getByRole("main").getByRole("alert").first()).toContainText(
    "Không truy cập được bộ nhớ audio",
  );
  expect(
    await page.evaluate(() => localStorage.getItem("makeng-browser-demo-v1")),
  ).toBe(before);
});
test("global demo deletion also clears Listening and active audio in another tab", async ({
  page,
  context,
}) => {
  await start(page);
  const other = await context.newPage();
  await other.goto("/listening");
  await other.getByRole("button", { name: "Tiếp tục bài nghe" }).click();
  await page.goto("/?practice=1");
  await page.getByRole("button", { name: "Lịch sử bài viết" }).click();
  await page.getByRole("button", { name: "Xóa dữ liệu phiên này" }).click();
  await page.getByRole("button", { name: "Xác nhận xóa" }).click();
  await expect(other.locator(".listening-player")).toHaveCount(0);
  expect(await records(other)).toHaveLength(0);
  await other.close();
});
