import { expect, test } from "@playwright/test";

test("Writing separates selection, filters random prompts and restores Task 1 drafts", async ({
  page,
}, testInfo) => {
  await page.goto("/writing");
  await expect(page.getByLabel("Bài viết bằng tiếng Anh")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Task 1 · Mô tả dữ liệu", exact: true })
    .click();
  await page.getByRole("searchbox").fill("Thư viện");
  await expect(page.locator(".catalog-card")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Chọn đề ngẫu nhiên", exact: true })
    .click();
  await expect(page.getByRole("table")).toContainText("Audiobooks");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("task-one.png"),
    fullPage: true,
  });
  await expect(page.locator(".catalog-card")).toHaveCount(0);
  await page
    .getByLabel("Bài viết bằng tiếng Anh")
    .fill(
      "Overall, electronic loans increased over time, while printed book loans fell significantly.",
    );
  await expect(
    page.getByRole("status").filter({ hasText: "Đã lưu nháp" }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByRole("table")).toContainText("Audiobooks");
  await expect(page.getByLabel("Bài viết bằng tiếng Anh")).toHaveValue(
    /electronic loans/,
  );
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Lưu bài Task 1 & tự kiểm tra" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Tự kiểm tra bài Task 1" }),
  ).toBeVisible();
  await expect(page.locator(".band")).toHaveCount(0);
});

test("Speaking has separate selection and hidden questions with local TTS cleanup", async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => {
    const listeners = new Map<string, EventListener>();
    const calls: string[] = [];
    Object.defineProperty(window, "SpeechSynthesisUtterance", {
      value: class {
        text: string;
        constructor(text: string) {
          this.text = text;
        }
      },
    });
    Object.defineProperty(window, "speechSynthesis", {
      value: {
        getVoices: () => [
          {
            voiceURI: "local-en",
            name: "Local English",
            lang: "en-US",
            localService: true,
          },
          {
            voiceURI: "remote-en",
            name: "Remote English",
            lang: "en-US",
            localService: false,
          },
        ],
        speak: (utterance: SpeechSynthesisUtterance) =>
          calls.push(utterance.text),
        cancel: () => calls.push("cancel"),
        addEventListener: (name: string, fn: EventListener) =>
          listeners.set(name, fn),
        removeEventListener: (name: string) => listeners.delete(name),
      },
    });
    Object.defineProperty(window, "ttsCalls", { value: calls });
  });
  await page.goto("/speaking");
  await expect(page.getByLabel("Transcript nhập tay")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Chọn bộ đề này →", exact: true })
    .nth(1)
    .click();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Bắt đầu Speaking" }).click();
  await expect(page.getByLabel("Giọng đọc tiếng Anh")).toContainText(
    "Local English",
  );
  await expect(page.getByLabel("Giọng đọc tiếng Anh")).not.toContainText(
    "Remote English",
  );
  await page.getByRole("button", { name: "Che câu hỏi", exact: true }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("speaking-hidden.png"),
    fullPage: true,
  });
  await expect(
    page.getByText("What do you enjoy about the area where you live?", {
      exact: true,
    }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Nghe câu hỏi", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Dừng đọc", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Part 1 · Câu 2", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Dừng đọc", exact: true }),
  ).toHaveCount(0);
  const calls = await page.evaluate(
    () => (window as unknown as { ttsCalls: string[] }).ttsCalls,
  );
  expect(calls).toContain("What do you enjoy about the area where you live?");
  expect(calls.at(-1)).toBe("cancel");
  await page.evaluate(() => {
    navigator.mediaDevices.getUserMedia = async () => {
      (window as unknown as { ttsCalls: string[] }).ttsCalls.push(
        "microphone-request",
      );
      throw new DOMException("Test permission refusal", "NotAllowedError");
    };
  });
  await page.getByRole("button", { name: "Nghe câu hỏi", exact: true }).click();
  await page.getByRole("button", { name: "Ghi âm", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as unknown as { ttsCalls: string[] }).ttsCalls.slice(-2),
      ),
    )
    .toEqual(["cancel", "microphone-request"]);
  await expect(
    page.getByRole("button", { name: "Dừng đọc", exact: true }),
  ).toHaveCount(0);
});

test("Speaking reports unavailable voices and never falls back to remote TTS", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "speechSynthesis", { value: undefined });
  });
  await page.goto("/speaking");
  await page
    .getByRole("button", { name: "Chọn đề ngẫu nhiên", exact: true })
    .click();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Bắt đầu Speaking" }).click();
  await expect(
    page.getByRole("button", { name: "Nghe câu hỏi", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByText(/Chưa tìm thấy giọng tiếng Anh local/),
  ).toBeVisible();
});
