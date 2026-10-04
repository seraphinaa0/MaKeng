import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import type { StoredSpeaking } from "../../packages/demo/speaking-store";

declare global {
  interface Window {
    speakingStreams: MediaStream[];
    speakingMicCalls: number;
    releaseSpeakingPermission?: () => void;
    restoreSpeakingPut?: () => void;
    speakingCaptureElapsed?: number;
  }
}
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
test.beforeEach(async ({ context }) => {
  context.on("page", (page) =>
    page.on("pageerror", (error) => {
      throw error;
    }),
  );
  await context.route("**/api/**", (route) => {
    throw new Error(`Unexpected API: ${route.request().url()}`);
  });
  await context.addInitScript(() => {
    window.speakingStreams = [];
    window.speakingMicCalls = 0;
    if (!navigator.mediaDevices) return; // Initial about:blank is not a secure origin.
    const original = navigator.mediaDevices.getUserMedia.bind(
      navigator.mediaDevices,
    );
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      window.speakingMicCalls++;
      const stream = await original(constraints);
      window.speakingStreams.push(stream);
      return stream;
    };
  });
});
async function start(page: Page, days = "7") {
  await page.goto("/speaking");
  await expect(
    page.getByText("Chưa có lượt luyện.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Bắt đầu Speaking" }),
  ).toBeDisabled();
  expect(await page.evaluate(() => window.speakingMicCalls)).toBe(0);
  await page
    .getByRole("combobox", { name: "Hạn lưu", exact: true })
    .selectOption(days);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Bắt đầu Speaking" }).click();
  await expect(page.getByLabel("Transcript nhập tay")).toBeVisible();
  expect(await page.evaluate(() => window.speakingMicCalls)).toBe(0);
}
async function record(page: Page) {
  await page.getByRole("button", { name: "Ghi âm", exact: true }).click();
  await expect(page.getByText(/Đang ghi âm · [1-9]/)).toBeVisible();
  await page.getByRole("button", { name: "Dừng ghi âm", exact: true }).click();
  await expect(
    page.getByText("Bản ghi mới trong bộ nhớ", { exact: false }),
  ).toBeVisible();
  await expect(page.getByLabel("Nghe lại câu trả lời")).toHaveAttribute(
    "src",
    /^blob:/,
  );
}
async function records(page: Page) {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open("makeng-speaking-v1", 1);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    try {
      return await new Promise<
        Array<{
          id: string;
          revision: number;
          responses: StoredSpeaking["responses"];
          status: string;
          sizes: number[];
        }>
      >((resolve, reject) => {
        const tx = db.transaction("sessions", "readonly");
        const r = tx.objectStore("sessions").getAll();
        r.onsuccess = () =>
          resolve(
            (r.result as StoredSpeaking[]).map((s) => ({
              id: s.id,
              revision: s.revision,
              responses: s.responses,
              status: s.status,
              sizes: Object.values(s.blobs).map((b) => b.size),
            })),
          );
        r.onerror = () => reject(r.error);
      });
    } finally {
      db.close();
    }
  });
}
async function allTracksStopped(page: Page) {
  expect(
    await page.evaluate(() => window.speakingStreams.length),
  ).toBeGreaterThan(0);
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.speakingStreams.every((s) =>
          s.getTracks().every((t) => t.readyState === "ended"),
        ),
      ),
    )
    .toBe(true);
}

test("review regression: manual stop excludes delayed encoder completion from duration", async ({
  page,
}) => {
  await start(page);
  await page.evaluate(() => {
    let started = 0;
    const originalStart = MediaRecorder.prototype.start;
    const originalStop = MediaRecorder.prototype.stop;
    MediaRecorder.prototype.start = function (timeslice?: number) {
      started = performance.now();
      return originalStart.call(this, timeslice);
    };
    MediaRecorder.prototype.stop = function () {
      window.speakingCaptureElapsed = (performance.now() - started) / 1000;
      return originalStop.call(this);
    };
    const descriptor = Object.getOwnPropertyDescriptor(
      MediaRecorder.prototype,
      "onstop",
    );
    const set = descriptor?.set;
    if (!set) throw new Error("MediaRecorder onstop setter unavailable");
    Object.defineProperty(MediaRecorder.prototype, "onstop", {
      ...descriptor,
      set(callback: ((this: MediaRecorder, event: Event) => void) | null) {
        set.call(
          this,
          callback === null
            ? null
            : (event: Event) => {
                setTimeout(() => callback.call(this, event), 1500);
              },
        );
      },
    });
  });
  await record(page);
  await allTracksStopped(page);
  await page.getByRole("button", { name: "Lưu câu trả lời" }).click();
  await expect.poll(async () => (await records(page))[0].revision).toBe(1);
  const elapsed = await page.evaluate(() => window.speakingCaptureElapsed!);
  const duration = (await records(page))[0].responses["p1-place"].recording!
    .durationSeconds;
  expect(Math.abs(duration - elapsed)).toBeLessThan(0.25);
});

test("review regression: 30-day retention expires in a continuously open tab", async ({
  page,
}) => {
  await page.clock.install();
  await start(page, "30");
  for (let i = 0; i < 3; i++) await page.clock.fastForward(9 * 86400000);
  expect(await records(page)).toHaveLength(1);
  await page.clock.fastForward(4 * 86400000);
  await expect(page.getByLabel("Transcript nhập tay")).toHaveCount(0);
  expect(await records(page)).toHaveLength(0);
});

test("review regression: expiry releases microphone even when storage cleanup fails", async ({
  page,
}) => {
  await page.clock.install();
  await start(page);
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const request = indexedDB.open("makeng-speaking-v1", 1);
      request.onsuccess = () => resolve(request.result);
    });
    await new Promise<void>((resolve) => {
      const tx = db.transaction("sessions", "readwrite");
      const store = tx.objectStore("sessions");
      const request = store.getAll();
      request.onsuccess = () => {
        const session = request.result[0];
        session.expiresAt = new Date(Date.now() + 10000).toISOString();
        store.put(session);
      };
      tx.oncomplete = () => resolve();
    });
    db.close();
  });
  await page.reload();
  await page.getByRole("button", { name: "Tiếp tục luyện" }).click();
  await page.getByRole("button", { name: "Ghi âm", exact: true }).click();
  await expect(page.getByText(/Đang ghi âm · [1-9]/)).toBeVisible();
  await page.evaluate(() => {
    IDBFactory.prototype.open = () => {
      throw new DOMException("Blocked", "SecurityError");
    };
  });
  await page.clock.fastForward(11000);
  await expect(page.getByLabel("Transcript nhập tay")).toHaveCount(0);
  await allTracksStopped(page);
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "bộ nhớ Speaking",
  );
  await expect(
    page.getByRole("button", { name: "Tiếp tục luyện" }),
  ).toHaveCount(0);
});

test("review regression: another session changing preserves current playback URL and text draft", async ({
  page,
  context,
}) => {
  await start(page);
  await record(page);
  await page.getByRole("button", { name: "Lưu câu trả lời" }).click();
  await expect(
    page.getByText("Dữ liệu đã lưu trên thiết bị", { exact: false }),
  ).toBeVisible();
  await expect(page.getByLabel("Nghe lại câu trả lời")).toHaveAttribute(
    "src",
    /^blob:/,
  );
  const url = await page.getByLabel("Nghe lại câu trả lời").getAttribute("src");
  await page
    .getByLabel("Transcript nhập tay")
    .fill("Keep this local draft while another session is created.");
  await page
    .getByLabel("Nghe lại câu trả lời")
    .evaluate((audio: HTMLAudioElement) => audio.play());
  const other = await context.newPage();
  await other.goto("/speaking");
  await other.getByRole("checkbox").check();
  await other.getByRole("button", { name: "Bắt đầu Speaking" }).click();
  await expect(other.getByLabel("Transcript nhập tay")).toBeVisible();
  await expect(
    page.getByRole("status").filter({ hasText: "Đã kiểm tra thay đổi" }),
  ).toBeVisible();
  await expect(page.getByLabel("Nghe lại câu trả lời")).toHaveAttribute(
    "src",
    url!,
  );
  await expect(page.getByLabel("Transcript nhập tay")).toHaveValue(
    "Keep this local draft while another session is created.",
  );
  await other.close();
});

test("recording limit stops capture automatically, and cancelled draft navigation leaves capture active", async ({
  page,
}) => {
  await start(page);
  await page.clock.install();
  await page.getByRole("button", { name: "Ghi âm", exact: true }).click();
  await expect(page.getByText(/Đang ghi âm · [1-9]/)).toBeVisible();
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "Về lịch sử" }).click();
  await expect(page.getByLabel("Transcript nhập tay")).toBeVisible();
  expect(
    await page.evaluate(
      () => window.speakingStreams[0].getAudioTracks()[0].readyState,
    ),
  ).toBe("live");
  await page.clock.fastForward(181000);
  await expect(
    page.getByText("Bản ghi mới trong bộ nhớ", { exact: false }),
  ).toBeVisible();
  await allTracksStopped(page);
  await page.getByRole("button", { name: "Lưu câu trả lời" }).click();
  await expect
    .poll(
      async () =>
        (await records(page))[0].responses["p1-place"]?.recording
          ?.durationSeconds,
    )
    .toBe(180);
});

test("stale tab without notifications cannot overwrite a saved response; corrupt metadata is preserved", async ({
  page,
  context,
}) => {
  await start(page);
  const other = await context.newPage();
  await other.addInitScript(() =>
    Object.defineProperty(window, "BroadcastChannel", { value: undefined }),
  );
  await other.goto("/speaking");
  await other.getByRole("button", { name: "Tiếp tục luyện" }).click();
  await other
    .getByLabel("Transcript nhập tay")
    .fill("Stale draft should not overwrite.");
  await page.getByLabel("Transcript nhập tay").fill("The first saved answer.");
  await page.getByRole("button", { name: "Lưu câu trả lời" }).click();
  await expect.poll(async () => (await records(page))[0].revision).toBe(1);
  await other.getByRole("button", { name: "Lưu câu trả lời" }).click();
  await expect(other.getByRole("main").getByRole("alert")).toContainText(
    "tab khác",
  );
  await expect(other.getByLabel("Transcript nhập tay")).toHaveValue(
    "Stale draft should not overwrite.",
  );
  expect((await records(page))[0].responses["p1-place"].transcript).toBe(
    "The first saved answer.",
  );
  await other.close();
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const r = indexedDB.open("makeng-speaking-v1", 1);
      r.onsuccess = () => resolve(r.result);
    });
    await new Promise<void>((resolve) => {
      const tx = db.transaction("sessions", "readwrite");
      const store = tx.objectStore("sessions");
      const r = store.getAll();
      r.onsuccess = () => {
        const session = r.result[0];
        session.set.questions[0].part = 2;
        store.put(session);
      };
      tx.oncomplete = () => resolve();
    });
    db.close();
  });
  await page.reload();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "không hợp lệ",
  );
  expect(await records(page)).toHaveLength(1);
  await expect(
    page.getByText("Chưa có lượt luyện.", { exact: false }),
  ).toHaveCount(0);
});

test("Speaking: explicit capture, playback, save/reload, manual review, completion and private audio deletion", async ({
  page,
}, info) => {
  await start(page);
  await record(page);
  await allTracksStopped(page);
  expect((await records(page))[0].sizes).toEqual([]); // Recording remains RAM-only until Save.
  await page
    .getByLabel("Nghe lại câu trả lời")
    .evaluate((audio: HTMLAudioElement) => audio.play());
  await expect
    .poll(() =>
      page
        .getByLabel("Nghe lại câu trả lời")
        .evaluate((audio: HTMLAudioElement) => audio.currentTime),
    )
    .toBeGreaterThan(0);
  await page
    .getByLabel("Transcript nhập tay")
    .fill("I usually learn at the library because it is quiet.");
  await page.getByLabel("Mạch nói:", { exact: false }).check();
  await page
    .getByLabel("Dẫn chứng & mục tiêu lần sau")
    .fill("Replace usually with a more precise example next time.");
  await page.getByRole("button", { name: "Lưu câu trả lời" }).click();
  await expect(
    page.getByText("Dữ liệu đã lưu trên thiết bị", { exact: false }),
  ).toBeVisible();
  expect((await records(page))[0].sizes[0]).toBeGreaterThan(0);
  await page.screenshot({
    path: `/tmp/makeng-phase6-${info.project.name}.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.reload();
  await page.getByRole("button", { name: "Tiếp tục luyện" }).click();
  await expect(page.getByLabel("Transcript nhập tay")).toHaveValue(
    "I usually learn at the library because it is quiet.",
  );
  await expect(page.getByLabel("Mạch nói:", { exact: false })).toBeChecked();
  const exported = page.waitForEvent("download");
  await page.getByRole("button", { name: "Xuất JSON đã lưu" }).click();
  expect((await exported).suggestedFilename()).toMatch(/^speaking-.*\.json$/);
  const audioExport = page.waitForEvent("download");
  await page.getByRole("button", { name: "Tải audio" }).click();
  expect((await audioExport).suggestedFilename()).toBe("p1-place.webm");
  page.once("dialog", (d) => {
    expect(d.message()).toContain("4 câu chưa");
    void d.accept();
  });
  await page.getByRole("button", { name: "Hoàn tất phiên" }).click();
  await expect(page.getByLabel("Transcript nhập tay")).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Ghi âm", exact: true }),
  ).toHaveCount(0);
  expect((await records(page))[0].status).toBe("completed");
  const oldUrl = await page
    .getByLabel("Nghe lại câu trả lời")
    .getAttribute("src");
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Xóa audio đã lưu" }).click();
  await expect(page.getByLabel("Nghe lại câu trả lời")).toHaveCount(0);
  await expect(page.getByLabel("Transcript nhập tay")).toHaveValue(
    "I usually learn at the library because it is quiet.",
  );
  expect((await records(page))[0].sizes).toEqual([]);
  await expect
    .poll(() =>
      page.evaluate(async (url) => {
        try {
          await fetch(url!);
          return true;
        } catch {
          return false;
        }
      }, oldUrl),
    )
    .toBe(false);
});

test("permission refusal retries safely; Part 2 preparation and Part 3 preserve independent responses", async ({
  page,
}) => {
  await start(page);
  await page.evaluate(() => {
    const original = navigator.mediaDevices.getUserMedia;
    let first = true;
    navigator.mediaDevices.getUserMedia = (constraints) => {
      if (first) {
        first = false;
        return Promise.reject(new DOMException("Denied", "NotAllowedError"));
      }
      return original(constraints);
    };
  });
  await page.getByRole("button", { name: "Ghi âm", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "bị từ chối",
  );
  await record(page);
  await allTracksStopped(page);
  await page.getByRole("button", { name: "Lưu câu trả lời" }).click();
  await page.getByRole("button", { name: "Part 2 · Câu 3" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Describe a practical skill",
      exact: false,
    }),
  ).toBeVisible();
  await page.clock.install();
  await page.getByRole("button", { name: "Chuẩn bị 60 giây" }).click();
  await expect(
    page.getByRole("button", { name: "Ghi âm", exact: true }),
  ).toBeDisabled();
  await page.clock.fastForward(61000);
  await expect(page.getByRole("timer")).toContainText("Hết giờ");
  await expect(
    page.getByRole("button", { name: "Ghi âm", exact: true }),
  ).toBeEnabled();
  await page
    .getByLabel("Transcript nhập tay")
    .fill("A friend taught me to repair my bicycle.");
  await page.getByRole("button", { name: "Lưu câu trả lời" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Describe a practical skill",
      exact: false,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Part 3 · Câu 4" }).click();
  await page
    .getByLabel("Transcript nhập tay")
    .fill("Online videos help, but learners need hands-on practice.");
  await page.getByRole("button", { name: "Lưu câu trả lời" }).click();
  const data = (await records(page))[0];
  expect(data.responses["p1-place"].recording).not.toBeNull();
  expect(data.responses["p2-skill"].transcript).toContain("bicycle");
  expect(data.responses["p3-technology"].transcript).toContain("hands-on");
});

test("pending permission cannot leave a live microphone after navigation; quota failures preserve the draft", async ({
  page,
}) => {
  await start(page);
  await page.evaluate(() => {
    const original = navigator.mediaDevices.getUserMedia;
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      const stream = await original(constraints);
      return new Promise((resolve) => {
        window.releaseSpeakingPermission = () => resolve(stream);
      });
    };
  });
  await page.getByRole("button", { name: "Ghi âm", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => !!window.releaseSpeakingPermission))
    .toBe(true);
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Về lịch sử" }).click();
  await page.evaluate(() => window.releaseSpeakingPermission?.());
  await allTracksStopped(page);
  await page.getByRole("button", { name: "Tiếp tục luyện" }).click();
  await page.evaluate(() => {
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = () => {
      throw new DOMException("Full", "QuotaExceededError");
    };
    window.restoreSpeakingPut = () => {
      IDBObjectStore.prototype.put = put;
    };
  });
  await page
    .getByLabel("Transcript nhập tay")
    .fill("Keep this unsaved answer.");
  await page.getByRole("button", { name: "Lưu câu trả lời" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Bộ nhớ đầy",
  );
  await expect(page.getByLabel("Transcript nhập tay")).toHaveValue(
    "Keep this unsaved answer.",
  );
  expect((await records(page))[0].responses).toEqual({});
  await page.evaluate(() => window.restoreSpeakingPut?.());
  await page.getByRole("button", { name: "Lưu câu trả lời" }).click();
  expect((await records(page))[0].responses["p1-place"].transcript).toBe(
    "Keep this unsaved answer.",
  );
});

test("cross-tab deletion discards pending recording and revokes playback; global deletion clears Speaking", async ({
  page,
  context,
}) => {
  await start(page);
  await record(page);
  await page.getByRole("button", { name: "Lưu câu trả lời" }).click();
  const other = await context.newPage();
  await other.goto("/speaking");
  await other.getByRole("button", { name: "Tiếp tục luyện" }).click();
  await expect(other.getByLabel("Nghe lại câu trả lời")).toHaveAttribute(
    "src",
    /^blob:/,
  );
  const url = await other
    .getByLabel("Nghe lại câu trả lời")
    .getAttribute("src");
  await other.getByRole("button", { name: "Ghi âm", exact: true }).click();
  await expect(other.getByText(/Đang ghi âm/)).toBeVisible();
  await page.bringToFront();
  await page.getByRole("button", { name: "Về lịch sử" }).click();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Xóa phiên", exact: true }).click();
  await expect(other.getByLabel("Transcript nhập tay")).toHaveCount(0);
  await allTracksStopped(other);
  expect(await records(other)).toHaveLength(0);
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
  await page.getByRole("button", { name: "Bắt đầu Speaking" }).click();
  await expect(page.getByLabel("Transcript nhập tay")).toBeVisible();
  await page.goto("/");
  await page.getByRole("button", { name: "Lịch sử bài viết" }).click();
  await page.getByRole("button", { name: "Xóa dữ liệu phiên này" }).click();
  await page.getByRole("button", { name: "Xác nhận xóa" }).click();
  await expect.poll(async () => (await records(page)).length).toBe(0);
});

test("expiration purges private data; blocked storage reports an error without presenting an empty library", async ({
  page,
}) => {
  await start(page);
  await page.getByLabel("Transcript nhập tay").fill("Old private transcript.");
  await page.getByRole("button", { name: "Lưu câu trả lời" }).click();
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const r = indexedDB.open("makeng-speaking-v1", 1);
      r.onsuccess = () => resolve(r.result);
    });
    await new Promise<void>((resolve) => {
      const tx = db.transaction("sessions", "readwrite");
      const store = tx.objectStore("sessions");
      const r = store.getAll();
      r.onsuccess = () => {
        const session = r.result[0];
        session.createdAt = "2025-01-01T00:00:00.000Z";
        session.expiresAt = "2025-01-02T00:00:00.000Z";
        store.put(session);
      };
      tx.oncomplete = () => resolve();
    });
    db.close();
  });
  await page.reload();
  await expect(
    page.getByText("Chưa có lượt luyện.", { exact: false }),
  ).toBeVisible();
  expect(await records(page)).toHaveLength(0);
  await page.addInitScript(() => {
    IDBFactory.prototype.open = () => {
      throw new DOMException("Blocked", "SecurityError");
    };
  });
  await page.reload();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "bộ nhớ Speaking",
  );
  await expect(
    page.getByText("Chưa có lượt luyện.", { exact: false }),
  ).toHaveCount(0);
  await expect(page.getByText("Đang tải...", { exact: true })).toHaveCount(0);
});
