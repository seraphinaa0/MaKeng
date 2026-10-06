import { expect, test } from "@playwright/test";

test("launcher has a travelling beam and two-second animated hints without overwriting typing", async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const launcher = page.locator(".lumen-launcher");
  await launcher.hover();
  await expect
    .poll(() =>
      launcher.evaluate((el) => getComputedStyle(el, "::before").animationName),
    )
    .toBe("perimeter-beam");
  const first = await page.locator(".hint-line").textContent();
  await expect(page.locator(".hint-line")).not.toHaveText(first!);
  await expect(page.locator(".hint-line")).toHaveCSS(
    "animation-name",
    "hint-rise",
  );
  const skill = page.locator('.compact a[href="/reading"]');
  await skill.hover();
  await expect(skill.locator(".book-page")).toHaveCSS(
    "animation-name",
    "page-turn",
  );
  await page.screenshot({
    path: info.outputPath("fancy-home.png"),
    fullPage: true,
  });
  await page
    .getByLabel("Kỹ năng muốn luyện", { exact: true })
    .fill("Reading today");
  await expect(page.locator(".launcher-hints")).toHaveCount(0);
  await page.getByRole("button", { name: "Mở thư viện kỹ năng" }).click();
  await expect(page).toHaveURL(/\/reading$/);
});

test("profile personalization persists, Pomodoro survives closing, and Settings is separate", async ({
  page,
}, info) => {
  await page.goto("/");
  await page.locator(".profile-button").click();
  const panel = page.getByRole("dialog", { name: "Profile", exact: true });
  await expect(panel).toBeVisible();
  await panel.getByLabel("Tên hiển thị", { exact: true }).fill("Tuấn");
  await panel.getByRole("button", { name: "Avatar 🦊", exact: true }).click();
  await panel.getByLabel("Giao diện", { exact: true }).selectOption("ambient");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "ambient");
  await panel.getByLabel("Chuyển trang", { exact: true }).selectOption("fade");
  await panel.getByRole("button", { name: "Bắt đầu", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  await expect(page.locator(".profile-button")).toBeFocused();
  await expect(page.locator(".lumen-greeting")).toContainText("Tuấn");
  await expect(page.locator(".profile-button")).toHaveText("🦊");
  await page.locator(".profile-button").click();
  await expect(
    panel.getByLabel("Thời gian Pomodoro", { exact: true }),
  ).not.toHaveText("25:00");
  await page.screenshot({
    path: info.outputPath("personal-panel.png"),
    fullPage: true,
  });
  await panel.getByRole("link", { name: "Cấu hình, quyền & sao lưu" }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(
    page.getByRole("heading", { name: "Settings", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Đầu vào · microphone", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Sao lưu & khôi phục" }),
  ).toBeVisible();
  await page.screenshot({
    path: info.outputPath("system-settings.png"),
    fullPage: true,
  });
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "ambient");
  await page.locator(".profile-button").click();
  await expect(panel.getByLabel("Tên hiển thị", { exact: true })).toHaveValue(
    "Tuấn",
  );
  await expect(panel.getByLabel("Chuyển trang", { exact: true })).toHaveValue(
    "fade",
  );
});

test("sidebar pill moves to real skills and reduced motion turns off expressive animation", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  if (page.viewportSize()!.width > 760) {
    const pill = page.locator(".rail-pill");
    const initial = await pill.evaluate((el) => getComputedStyle(el).transform);
    await page.locator('.motion-rail a[href="/reading"]').click();
    await expect(page).toHaveURL(/\/reading$/);
    await expect
      .poll(() => pill.evaluate((el) => getComputedStyle(el).transform))
      .not.toBe(initial);
    await expect(
      page.locator('.motion-rail a[href="/reading"]'),
    ).toHaveAttribute("aria-current", "page");
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.locator(".lumen-launcher").hover();
  await expect
    .poll(() =>
      page
        .locator(".lumen-launcher")
        .evaluate((el) => getComputedStyle(el, "::before").animationName),
    )
    .toBe("none");
  const hint = await page.locator(".hint-line").textContent();
  await page.waitForTimeout(2200); // Verify the two-second scheduler is disabled, not a UI readiness wait.
  await expect(page.locator(".hint-line")).toHaveText(hint!);
  await page.locator('.compact a[href="/reading"]').hover();
  await expect(page.locator(".compact .book-page")).toHaveCSS(
    "animation-name",
    "none",
  );
});

test("Settings never requests microphone on entry and stops discovery tracks", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const state = { calls: 0, stops: 0 };
    Object.assign(window, { settingsMediaState: state });
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: async () => {
          state.calls++;
          return {
            getTracks: () => [
              {
                stop: () => {
                  state.stops++;
                },
              },
            ],
          };
        },
        enumerateDevices: async () => [
          {
            kind: "audioinput",
            deviceId: "mic-test",
            label: "Test microphone",
          },
          {
            kind: "audiooutput",
            deviceId: "speaker-test",
            label: "Test speaker",
          },
        ],
        addEventListener: () => {},
        removeEventListener: () => {},
      },
    });
  });
  await page.goto("/settings");
  const mediaState = () =>
    page.evaluate(
      () =>
        (
          window as unknown as {
            settingsMediaState: { calls: number; stops: number };
          }
        ).settingsMediaState,
    );
  expect((await mediaState()).calls).toBe(0);
  await page
    .getByRole("button", { name: "Cho phép & nhận diện thiết bị" })
    .click();
  await expect(page.getByRole("status")).toContainText("Microphone đã tắt");
  expect((await mediaState()).stops).toBeGreaterThan(0);
  await page
    .getByLabel("Đầu vào · microphone", { exact: true })
    .selectOption("mic-test");
  expect(
    await page.evaluate(() => localStorage.getItem("makeng-audio-input")),
  ).toBe("mic-test");
});
