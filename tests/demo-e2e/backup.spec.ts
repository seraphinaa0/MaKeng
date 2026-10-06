import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { newSpeaking } from "../../packages/domain/speaking";
import { exportSpeakingBackup } from "../../packages/domain/speaking-backup";

test.use({
  permissions: ["microphone"],
  launchOptions: {
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    args: [
      "--use-fake-device-for-media-stream",
      "--use-fake-ui-for-media-stream",
    ],
  },
});
test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", (route) => {
    throw new Error(`Unexpected API request: ${route.request().url()}`);
  });
});
async function exported(page: Page, button: string) {
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: button, exact: true }).click();
  return readFile((await (await downloading).path())!, "utf8");
}
async function file(page: Page, label: string, text: string) {
  await page.getByLabel(label, { exact: true }).setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(text),
  });
}

async function readySpeakingImport(page: Page, text: string) {
  await page.goto("/backup");
  await file(page, "JSON Speaking gồm audio", text);
  await page
    .getByLabel(
      "Tôi đồng ý lưu transcript, tự review và audio trên thiết bị với hạn lưu mới.",
    )
    .check();
}

test("concurrent Speaking imports create a single restored session", async ({
  page,
  context,
}) => {
  const text = await exportSpeakingBackup(
    newSpeaking(crypto.randomUUID(), new Date().toISOString(), 7, true),
    {},
  );
  const other = await context.newPage();
  await readySpeakingImport(page, text);
  await readySpeakingImport(other, text);
  await Promise.all([
    page
      .getByRole("button", { name: "Khôi phục Speaking", exact: true })
      .click(),
    other
      .getByRole("button", { name: "Khôi phục Speaking", exact: true })
      .click(),
  ]);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Xuất phiên Speaking", exact: true }),
  ).toHaveCount(1);
  await other.close();
});

test("global deletion waits for Speaking restore and removes the recovered data", async ({
  page,
  context,
}) => {
  const text = await exportSpeakingBackup(
    newSpeaking(crypto.randomUUID(), new Date().toISOString(), 7, true),
    {},
  );
  await readySpeakingImport(page, text);
  await page.evaluate(() => {
    const original = SubtleCrypto.prototype.digest;
    SubtleCrypto.prototype.digest = async function (algorithm, data) {
      document.documentElement.dataset.pendingRestore = "true";
      await new Promise<void>((resolve) =>
        window.addEventListener("releaseBackupHash", () => resolve(), {
          once: true,
        }),
      );
      return original.call(this, algorithm, data);
    };
  });
  await page
    .getByRole("button", { name: "Khôi phục Speaking", exact: true })
    .click();
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.dataset.pendingRestore),
    )
    .toBe("true");
  const other = await context.newPage();
  await other.goto("/create");
  other.once("dialog", (dialog) => dialog.accept());
  const deleting = other
    .getByRole("button", { name: "Xóa dữ liệu demo", exact: true })
    .click();
  await expect(
    other.getByRole("button", { name: "Xóa dữ liệu demo", exact: true }),
  ).toBeDisabled();
  await page.evaluate(() =>
    window.dispatchEvent(new Event("releaseBackupHash")),
  );
  await deleting;
  await expect(
    other.getByRole("button", { name: "Xóa dữ liệu demo", exact: true }),
  ).toBeEnabled();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Xuất phiên Speaking", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Chưa có phiên Speaking đã lưu.", { exact: false }),
  ).toBeVisible();
  await other.close();
});

test("backup hub restores saved Writing and unfinished Reading without duplicating or replacing newer answers", async ({
  page,
}) => {
  await page.goto("/?practice=1");
  await page
    .getByLabel("Bài viết bằng tiếng Anh")
    .fill(
      "Community gardens give neighbours an opportunity to grow food and learn together. They also provide a peaceful space for everyone.",
    );
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Lưu & xem phản hồi mẫu" }).click();
  await expect(page.getByRole("heading", { name: "Bản đã nộp" })).toBeVisible();
  await page.goto("/reading");
  await page
    .getByRole("button", { name: "Làm bài", exact: true })
    .first()
    .click();
  const tab = page.getByRole("button", { name: "Câu hỏi", exact: true });
  if (page.viewportSize()!.width <= 760) await tab.click();
  await page.getByLabel("Câu 5: điền từ").fill("address");
  await expect(
    page.getByText("Đã lưu trong trình duyệt", { exact: true }),
  ).toBeVisible();
  await page.goto("/backup");
  const text = await exported(page, "Xuất bản sao Writing/Reading");
  await file(page, "JSON Writing/Reading", text);
  await page
    .getByLabel("Tôi đồng ý thêm dữ liệu sao lưu vào trình duyệt này.")
    .check();
  await page
    .getByRole("button", { name: "Khôi phục Writing/Reading", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Giữ nguyên 2 mục đã có",
  );
  await page.evaluate(() => localStorage.removeItem("makeng-browser-demo-v1"));
  await page.reload();
  await file(page, "JSON Writing/Reading", text);
  await page
    .getByLabel("Tôi đồng ý thêm dữ liệu sao lưu vào trình duyệt này.")
    .check();
  await page
    .getByRole("button", { name: "Khôi phục Writing/Reading", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "1 bài Writing, 1 lượt Reading",
  );
  await page.goto("/reading");
  await page
    .getByRole("button", { name: "Làm bài", exact: true })
    .first()
    .click();
  if (page.viewportSize()!.width <= 760) await tab.click();
  await expect(page.getByLabel("Câu 5: điền từ")).toHaveValue("address");
});

test("portable Speaking restores playable audio and supports subsequent edits", async ({
  page,
}) => {
  await page.goto("/speaking");
  await page
    .getByRole("button", { name: "Chọn bộ đề này →", exact: true })
    .first()
    .click();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Bắt đầu Speaking" }).click();
  await page.getByRole("button", { name: "Ghi âm", exact: true }).click();
  await expect(page.getByText(/Đang ghi âm · [1-9]/)).toBeVisible();
  await page.getByRole("button", { name: "Dừng ghi âm", exact: true }).click();
  await expect(page.getByLabel("Nghe lại câu trả lời")).toHaveAttribute(
    "src",
    /^blob:/,
  );
  await page
    .getByLabel("Transcript nhập tay")
    .fill("I like learning at the library because it is quiet.");
  await page
    .getByRole("button", { name: "Lưu câu trả lời", exact: true })
    .click();
  await expect(
    page.getByText("Dữ liệu đã lưu trên thiết bị", { exact: false }).first(),
  ).toBeVisible();
  await page.goto("/backup");
  const text = await exported(page, "Xuất phiên Speaking");
  await file(page, "JSON Speaking gồm audio", text);
  await page
    .getByLabel(
      "Tôi đồng ý lưu transcript, tự review và audio trên thiết bị với hạn lưu mới.",
    )
    .check();
  await page
    .getByRole("button", { name: "Khôi phục Speaking", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Đã khôi phục Speaking");
  await file(page, "JSON Speaking gồm audio", text);
  await page
    .getByLabel(
      "Tôi đồng ý lưu transcript, tự review và audio trên thiết bị với hạn lưu mới.",
    )
    .check();
  await page
    .getByRole("button", { name: "Khôi phục Speaking", exact: true })
    .click();
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "đã được khôi phục",
  );
  await page.goto("/speaking");
  await page
    .getByRole("button", { name: "Lịch sử Speaking", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Tiếp tục luyện", exact: true })
    .last()
    .click();
  await expect(page.getByLabel("Transcript nhập tay")).toHaveValue(
    "I like learning at the library because it is quiet.",
  );
  await page
    .getByLabel("Nghe lại câu trả lời")
    .evaluate(async (element: HTMLAudioElement) => {
      await element.play();
      element.pause();
    });
  await page
    .getByLabel("Transcript nhập tay")
    .fill("I can continue editing after restoring my practice.");
  await page
    .getByRole("button", { name: "Lưu câu trả lời", exact: true })
    .click();
  await expect(
    page.getByText("Dữ liệu đã lưu trên thiết bị", { exact: false }).first(),
  ).toBeVisible();
  await page.reload();
  await page
    .getByRole("button", { name: "Lịch sử Speaking", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Tiếp tục luyện", exact: true })
    .last()
    .click();
  await expect(page.getByLabel("Transcript nhập tay")).toHaveValue(
    "I can continue editing after restoring my practice.",
  );
});

test("invalid backup leaves stored Writing unchanged and the workspace fits the viewport", async ({
  page,
}) => {
  await page.goto("/?practice=1");
  await expect(page.getByLabel("Bài viết bằng tiếng Anh")).toBeVisible();
  const before = await page.evaluate(() =>
    localStorage.getItem("makeng-browser-demo-v1"),
  );
  await page.goto("/backup");
  await file(page, "JSON Writing/Reading", '{"version":99}');
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "không hợp lệ",
  );
  expect(
    await page.evaluate(() => localStorage.getItem("makeng-browser-demo-v1")),
  ).toBe(before);
  await expect(
    page.getByRole("button", {
      name: "Khôi phục Writing/Reading",
      exact: true,
    }),
  ).toBeDisabled();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
