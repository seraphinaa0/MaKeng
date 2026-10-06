import { describe, expect, it } from "vitest";
import { DemoStore, DEMO_KEY, parseDemoBackup } from "../packages/demo/store";
import {
  exportSpeakingBackup,
  parseSpeakingBackup,
  prepareSpeakingRestore,
} from "../packages/domain/speaking-backup";
import {
  blankResponse,
  changeSpeaking,
  newSpeaking,
} from "../packages/domain/speaking";
import { newDraft, reviewDraft } from "../packages/domain/authoring";

class MemoryStorage {
  values = new Map<string, string>();
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
  removeItem(key: string) {
    this.values.delete(key);
  }
}
const post = (body: unknown): RequestInit => ({
  method: "POST",
  body: JSON.stringify(body),
});
async function fixture() {
  const storage = new MemoryStorage();
  const store = new DemoStore(storage);
  await store.request("writing/submissions", {
    ...post({
      prompt: "Should cities invest in more community gardens?",
      essay:
        "Community gardens provide a space where neighbours can share ideas and grow vegetables. I believe cities should invest in them because they support healthier communities.",
      consent: true,
    }),
    headers: { "Idempotency-Key": crypto.randomUUID() },
  });
  const attempt = (await store.request(
    "reading/attempts",
    post({ setId: "tool-library" }),
  )) as { id: string };
  return { store, storage, attempt };
}
async function snapshot(store: DemoStore) {
  return JSON.stringify(await store.request("demo/export"));
}
const restore = (store: DemoStore, text: string, consent = true) =>
  store.request("demo/restore", post({ text, consent }));

describe("browser-state backup restore", () => {
  it("retains published content, reviewed mistakes and learning settings", async () => {
    const { store, attempt } = await fixture();
    await store.request(
      `reading/attempts/${attempt.id}/submit`,
      post({ revision: 0 }),
    );
    await store.request(
      "learning/actions",
      post({
        action: "answer",
        revision: 0,
        key: `${attempt.id}:q1`,
        answer: "B",
      }),
    );
    const state = parseDemoBackup(await snapshot(store));
    const draft = newDraft({
      title: "Community workshops",
      author: "Local Author",
      rightsConfirmed: true,
      text: "Residents organize repair workshops every Saturday at the library. Visitors bring broken tools and learn to repair them with volunteers. The workshops help neighbours share practical knowledge and reduce household waste.",
    });
    const approved = reviewDraft(draft, {
      action: "approve",
      revision: draft.revision,
      reviewer: "Local reviewer",
      confirmed: true,
    });
    const published = reviewDraft(approved, {
      action: "publish",
      revision: approved.revision,
    });
    state.drafts = [published];
    state.published = [published.set];
    state.learning.recommendationsEnabled = false;
    const target = new DemoStore(new MemoryStorage());
    await restore(target, JSON.stringify(state));
    const recovered = parseDemoBackup(await snapshot(target));
    expect(recovered.learning.reviews).toEqual(state.learning.reviews);
    expect(recovered.learning.recommendationsEnabled).toBe(false);
    expect(recovered.published).toEqual(state.published);
    expect(recovered.attempts[0].status).toBe("submitted");
  });
  it("round-trips Writing and unfinished Reading and skips repeated imports", async () => {
    const original = await fixture();
    const text = await snapshot(original.store);
    const target = new DemoStore(new MemoryStorage());
    expect(await restore(target, text)).toMatchObject({
      writing: 1,
      reading: 1,
      skipped: 0,
    });
    expect(parseDemoBackup(await snapshot(target)).writing).toEqual(
      parseDemoBackup(text).writing,
    );
    expect(await restore(target, text)).toMatchObject({
      writing: 0,
      reading: 0,
      skipped: 2,
    });
  });
  it("does not overwrite an attempt updated after the backup", async () => {
    const { store, attempt } = await fixture();
    const text = await snapshot(store);
    await store.request(
      `reading/attempts/${attempt.id}/answers`,
      post({ revision: 0, answers: { q5: "address" }, flagged: ["q5"] }),
    );
    await restore(store, text);
    expect(parseDemoBackup(await snapshot(store)).attempts[0].answers.q5).toBe(
      "address",
    );
  });
  it("rejects damaged evidence, invalid references and duplicate identities without writing", async () => {
    const { store } = await fixture();
    const targetStorage = new MemoryStorage();
    const target = new DemoStore(targetStorage);
    for (const corrupt of [
      (data: ReturnType<typeof parseDemoBackup>) => {
        data.writing[0].evaluation!.criteria.grammar.evidence.quote =
          "not in essay";
      },
      (data: ReturnType<typeof parseDemoBackup>) => {
        data.attempts[0].answers.foreign = "answer";
      },
      (data: ReturnType<typeof parseDemoBackup>) => {
        data.writing.push(data.writing[0]);
      },
      (data: ReturnType<typeof parseDemoBackup>) => {
        data.learning.reviews.foreign = {
          reviewed: true,
          tries: 1,
          updatedAt: new Date().toISOString(),
        };
      },
    ]) {
      const data = parseDemoBackup(await snapshot(store));
      corrupt(data);
      await expect(restore(target, JSON.stringify(data))).rejects.toThrow();
      expect(targetStorage.getItem(DEMO_KEY)).toBeNull();
    }
  });
  it("requires consent and preserves original state when storage is full", async () => {
    const { store } = await fixture();
    const text = await snapshot(store);
    await expect(restore(store, text, false)).rejects.toThrow();
    const storage = new MemoryStorage();
    storage.setItem = () => {
      throw new Error("full");
    };
    await expect(restore(new DemoStore(storage), text)).rejects.toThrow(
      /bộ nhớ/,
    );
    expect(storage.getItem(DEMO_KEY)).toBeNull();
  });
  it("migrates v1 exports and keeps existing local preferences", async () => {
    const { store } = await fixture();
    const original = parseDemoBackup(await snapshot(store));
    const { learning, ...legacy } = original;
    expect(
      parseDemoBackup(JSON.stringify({ ...legacy, version: 1 })).learning
        .reviews,
    ).toEqual({});
    const target = new DemoStore(new MemoryStorage());
    await target.request(
      "learning/actions",
      post({ action: "preferences", revision: 0, enabled: false }),
    );
    await restore(target, JSON.stringify({ ...original, learning }));
    expect(
      parseDemoBackup(await snapshot(target)).learning.recommendationsEnabled,
    ).toBe(false);
  });
});

describe("portable Speaking backups", () => {
  const created = "2026-10-01T12:00:00.000Z";
  function session() {
    return newSpeaking(crypto.randomUUID(), created, 1, true);
  }
  it("restores expired completed practice with new identity, audio and retention", async () => {
    const blob = new Blob([new Uint8Array([1, 2, 3, 4])], {
      type: "audio/webm",
    });
    const original = changeSpeaking(
      session(),
      0,
      "p1-place",
      {
        ...blankResponse(),
        transcript: "I enjoy learning at the library.",
        recording: { type: blob.type, size: blob.size, durationSeconds: 12 },
      },
      true,
      created,
    );
    const text = await exportSpeakingBackup(original, { "p1-place": blob });
    const now = new Date("2026-10-04T12:00:00.000Z");
    const restored = await prepareSpeakingRestore(text, 7, true, now);
    expect(restored.id).not.toBe(original.id);
    expect(restored.completedAt).toBe(original.completedAt);
    expect(restored.expiresAt).toBe("2026-10-11T12:00:00.000Z");
    expect(await restored.blobs["p1-place"].arrayBuffer()).toEqual(
      await blob.arrayBuffer(),
    );
    expect(restored.backupKey).toBe(
      (await prepareSpeakingRestore(text, 30, true, now)).backupKey,
    );
  });
  it("rejects missing audio, corrupt bytes and unsupported version", async () => {
    const blob = new Blob([new Uint8Array([1, 2, 3])], { type: "audio/ogg" });
    const original = changeSpeaking(
      session(),
      0,
      "p1-place",
      {
        ...blankResponse(),
        recording: { type: blob.type, size: 3, durationSeconds: 3 },
      },
      false,
      created,
    );
    const text = await exportSpeakingBackup(original, { "p1-place": blob });
    const damaged = parseSpeakingBackup(text);
    damaged.audio["p1-place"].base64 = "BAUG";
    await expect(
      prepareSpeakingRestore(JSON.stringify(damaged), 7, true),
    ).rejects.toThrow(/Checksum/);
    expect(() =>
      parseSpeakingBackup(JSON.stringify({ ...damaged, audio: {} })),
    ).toThrow();
    expect(() =>
      parseSpeakingBackup(JSON.stringify({ ...damaged, schemaVersion: 99 })),
    ).toThrow();
  });
  it("supports text-only practice and requires fresh consent", async () => {
    const text = await exportSpeakingBackup(session(), {});
    await expect(prepareSpeakingRestore(text, 7, false)).rejects.toThrow(
      /đồng ý/,
    );
    expect((await prepareSpeakingRestore(text, 7, true)).blobs).toEqual({});
  });
});
