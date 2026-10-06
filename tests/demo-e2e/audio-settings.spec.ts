import { expect, test } from "@playwright/test";

test("cinematic navigation runs both exit and entrance scenes and honors motion off", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript(() => {
    const scenes: { filter: string; duration: number }[] = [];
    Object.assign(window, { settingsScenes: scenes });
    const original = Element.prototype.animate;
    Element.prototype.animate = function (keyframes, options) {
      if (this.tagName === "MAIN" && Array.isArray(keyframes)) {
        const frame = keyframes.find(
          (item) => item.filter && item.filter !== "none",
        );
        scenes.push({
          filter: String(frame?.filter ?? "none"),
          duration:
            typeof options === "number"
              ? options
              : Number(options?.duration ?? 0),
        });
      }
      return original.call(this, keyframes, options);
    };
  });
  await page.goto("/practice");
  await page.locator(".profile-button").click();
  await page.getByLabel("Tốc độ", { exact: true }).selectOption("650");
  await page.keyboard.press("Escape");
  await page.locator('.practice-skills a[href="/reading"]').click();
  await expect(page).toHaveURL(/\/reading$/);
  const scenes = () =>
    page.evaluate(
      () =>
        (
          window as unknown as {
            settingsScenes: { filter: string; duration: number }[];
          }
        ).settingsScenes,
    );
  await expect
    .poll(async () => (await scenes()).slice(-2))
    .toEqual([
      { filter: "blur(7px)", duration: 240 },
      { filter: "blur(9px)", duration: 650 },
    ]);
  await page.locator(".profile-button").click();
  await page.getByLabel("Chuyển trang", { exact: true }).selectOption("off");
  await page.keyboard.press("Escape");
  const previous = (await scenes()).length;
  if (page.viewportSize()!.width > 760)
    await page.locator('.motion-rail a[href="/practice"]').click();
  else await page.locator('.hub-mobile-nav a[href="/practice"]').click();
  await expect(page).toHaveURL(/\/practice$/);
  expect((await scenes()).length).toBe(previous);
});

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

test("selected Settings microphone is actually requested by Speaking and stops after capture", async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (!navigator.mediaDevices) return;
    const state: {
      constraints: MediaStreamConstraints[];
      streams: MediaStream[];
    } = { constraints: [], streams: [] };
    Object.assign(window, { settingsCapture: state });
    const original = navigator.mediaDevices.getUserMedia.bind(
      navigator.mediaDevices,
    );
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      state.constraints.push(constraints ?? {});
      const stream = await original(constraints);
      state.streams.push(stream);
      return stream;
    };
  });
  await page.goto("/settings");
  await page
    .getByRole("button", { name: "Cho phép & nhận diện thiết bị" })
    .click();
  await expect(page.getByRole("status")).toContainText("Microphone đã tắt");
  const input = page.getByLabel("Đầu vào · microphone", { exact: true });
  const selected = await input
    .locator("option")
    .evaluateAll((options) =>
      options
        .map((o) => (o as HTMLOptionElement).value)
        .find((value) => value && value !== "default"),
    );
  expect(selected).toBeTruthy();
  await input.selectOption(selected!);
  await page.locator(".profile-button").click();
  await page
    .getByRole("navigation", { name: "Kỹ năng", exact: true })
    .getByRole("link", { name: "Speaking", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Chọn bộ đề này →", exact: true })
    .first()
    .click();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Bắt đầu Speaking" }).click();
  await page.getByRole("button", { name: "Ghi âm", exact: true }).click();
  await expect(page.getByText(/Đang ghi âm · [1-9]/)).toBeVisible();
  const actual = await page.evaluate(() =>
    (
      window as unknown as {
        settingsCapture: { constraints: MediaStreamConstraints[] };
      }
    ).settingsCapture.constraints.at(-1),
  );
  expect(actual?.audio).toEqual({ deviceId: { exact: selected } });
  await page.getByRole("button", { name: "Dừng ghi âm", exact: true }).click();
  await expect(
    page.getByText("Bản ghi mới trong bộ nhớ", { exact: false }),
  ).toBeVisible();
  expect(
    await page.evaluate(() =>
      (
        window as unknown as { settingsCapture: { streams: MediaStream[] } }
      ).settingsCapture.streams.every((stream) =>
        stream.getTracks().every((track) => track.readyState === "ended"),
      ),
    ),
  ).toBe(true);
});

test("chosen output is passed to Listening's supported media sink", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const state: string[] = [];
    Object.assign(window, { settingsSinks: state });
    Object.defineProperty(HTMLMediaElement.prototype, "setSinkId", {
      configurable: true,
      value: async function (value: string) {
        state.push(value);
      },
    });
    localStorage.setItem("makeng-audio-output", "test-headphones");
  });
  await page.goto("/listening");
  await page.getByRole("button", { name: "Dùng bài nghe mẫu" }).click();
  await expect(page.getByLabel("Câu 1: điền từ Listening")).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { settingsSinks: string[] }).settingsSinks,
      ),
    )
    .toContain("test-headphones");
  await page.getByRole("button", { name: "Play audio", exact: true }).click();
  await expect
    .poll(() =>
      page
        .getByLabel("Audio bài nghe", { exact: true })
        .evaluate((el: HTMLAudioElement) => el.paused),
    )
    .toBe(false);
});

test("an expired microphone selection explains recovery instead of showing an empty error", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("makeng-audio-input", "missing-device-id"),
  );
  await page.goto("/speaking");
  await page
    .getByRole("button", { name: "Chọn bộ đề này →", exact: true })
    .first()
    .click();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Bắt đầu Speaking" }).click();
  await page.getByRole("button", { name: "Ghi âm", exact: true }).click();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Microphone đã chọn không còn khả dụng" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Dừng ghi âm", exact: true }),
  ).toHaveCount(0);
  await page.evaluate(() => localStorage.setItem("makeng-audio-input", ""));
  await page.getByRole("button", { name: "Ghi âm", exact: true }).click();
  await expect(page.getByText(/Đang ghi âm · [1-9]/)).toBeVisible();
  await page.getByRole("button", { name: "Dừng ghi âm", exact: true }).click();
  await expect(
    page.getByText("Bản ghi mới trong bộ nhớ", { exact: false }),
  ).toBeVisible();
});
