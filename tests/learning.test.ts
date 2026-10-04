import { describe, it, expect } from "vitest";
import { localPreviewSets } from "../packages/content/reading";
import {
  buildProgress,
  errorKind,
  type LearningAttempt,
  type Progress,
  type ReviewFeedback,
} from "../packages/domain/learning";
import { newLearningState } from "../packages/schemas/learning";
import { DemoStore, DEMO_KEY } from "../packages/demo/store";
import type { ReadingAttempt } from "../packages/schemas/reading";

const now = Date.parse("2026-10-04T12:00:00.000Z");
const correct = {
  q1: "B",
  q2: "TRUE",
  q3: "FALSE",
  q4: "NOT GIVEN",
  q5: "address",
};
function attempt(
  answers: Record<string, string> = {},
  ago = 0,
): LearningAttempt {
  const at = new Date(now - ago * 86400000).toISOString();
  return {
    id: crypto.randomUUID(),
    content: structuredClone(localPreviewSets[0]),
    answers,
    status: "submitted",
    createdAt: at,
    submittedAt: at,
  };
}
function progress(
  items: LearningAttempt[],
  period: "all" | "7" | "30" = "all",
) {
  return buildProgress(
    items,
    [],
    localPreviewSets,
    newLearningState(),
    period,
    now,
  );
}
describe("Phase 4 progress and deterministic suggestions", () => {
  it("uses submitted snapshots only, handles empty history, and does not use mock Writing bands", () => {
    const draft = {
      ...attempt(),
      status: "in_progress" as const,
      submittedAt: null,
    };
    expect(progress([draft]).total).toBe(0);
    expect(progress([]).byType.every((row) => row.trend === null)).toBe(true);
    const writing = {
      id: "mock",
      essay: "Five words in this essay",
      createdAt: new Date(now).toISOString(),
      overall: 9,
    };
    const result = buildProgress(
      [attempt(correct), draft],
      [writing],
      localPreviewSets,
      newLearningState(),
      "all",
      now,
    );
    expect(result.readingCount).toBe(1);
    expect(result.correct).toBe(5);
    expect(result.total).toBe(5);
    expect(result.writingCount).toBe(1);
    expect(result.wordsWritten).toBe(5);
    expect(result).not.toHaveProperty("band");
    expect(result).not.toHaveProperty("writingTrend");
    expect(result.recommendations[0].kind).toBe("resume");
  });
  it("classifies only observable errors, including word limits before text mismatch", () => {
    const [mcq, tfng, , , completion] = localPreviewSets[0].questions;
    expect(errorKind(mcq, " \n ")).toBe("blank");
    expect(errorKind(mcq, "A")).toBe("mcq_mismatch");
    expect(errorKind(tfng, "NOT GIVEN")).toBe("tfng_mismatch");
    expect(errorKind(completion, "my home address")).toBe("word_limit");
    expect(errorKind(completion, "name")).toBe("completion_mismatch");
    const result = progress([
      attempt({
        q1: "A",
        q2: "FALSE",
        q3: "FALSE",
        q4: "NOT GIVEN",
        q5: "my home address",
      }),
    ]);
    expect(result.mistakes.map((m) => m.kind)).toEqual([
      "mcq_mismatch",
      "tfng_mismatch",
      "word_limit",
    ]);
    expect(result.pendingCount).toBe(3);
  });
  it("filters by submission time with inclusive boundaries and excludes future records", () => {
    const oldCreated = attempt(correct, 1);
    oldCreated.createdAt = new Date(now - 100 * 86400000).toISOString();
    const rows = [
      oldCreated,
      attempt(correct, 7),
      attempt(correct, 7.01),
      attempt(correct, 30),
      attempt(correct, 31),
      attempt(correct, -1),
    ];
    expect(progress(rows, "7").readingCount).toBe(2);
    expect(progress(rows, "30").readingCount).toBe(4);
    expect(progress(rows).readingCount).toBe(5);
  });
  it("requires six attempts of each type and compares weighted counts in consecutive groups of three", () => {
    const items = [
      attempt(correct, 0),
      attempt(correct, 1),
      attempt(correct, 2),
      attempt({}, 3),
      attempt({}, 4),
      attempt({}, 5),
    ];
    expect(progress(items.slice(0, 5)).byType[0].trend).toBeNull();
    const result = progress(items);
    expect(result.byType.find((g) => g.type === "tfng")?.trend).toEqual({
      recent: { correct: 9, total: 9, attempts: 3 },
      previous: { correct: 0, total: 9, attempts: 3 },
      delta: 100,
    });
    expect(result.correct).toBe(15);
    expect(result.total).toBe(30);
    expect(
      progress(Array.from({ length: 25 }, () => attempt(correct))).readingCount,
    ).toBe(25);
  });
  it("suggests a weak type with exact reasons, supports dismissal/disable and avoids active or archived sets", () => {
    const failed = attempt({ ...correct, q1: "A" });
    const state = newLearningState();
    const result = buildProgress(
      [failed],
      [],
      localPreviewSets,
      state,
      "all",
      now,
    );
    const practice = result.recommendations.find((r) => r.kind === "practice")!;
    expect(practice.reason).toContain("1/1 câu Trắc nghiệm");
    expect(practice.setId).not.toBe(failed.content.id);
    expect(result.recommendations.find((r) => r.kind === "review")?.type).toBe(
      "mcq",
    );
    state.dismissed = [practice.id];
    expect(
      buildProgress(
        [failed],
        [],
        localPreviewSets,
        state,
        "all",
        now,
      ).recommendations.some((r) => r.id === practice.id),
    ).toBe(false);
    state.recommendationsEnabled = false;
    expect(
      buildProgress([failed], [], localPreviewSets, state, "all", now)
        .recommendations,
    ).toEqual([]);
    const archived = {
      ...localPreviewSets[1],
      publication: "archived" as const,
    };
    expect(
      buildProgress([], [], [archived], newLearningState(), "all", now)
        .recommendations,
    ).toEqual([]);
  });
  it("keeps repeated mistakes separate and leaves old scores untouched after review", () => {
    const first = attempt({ ...correct, q1: "A" });
    const second = attempt({ ...correct, q1: "A" }, 1);
    const state = newLearningState();
    state.reviews[`${first.id}:q1`] = {
      reviewed: true,
      tries: 1,
      updatedAt: new Date(now).toISOString(),
    };
    const result = buildProgress(
      [first, second],
      [],
      localPreviewSets,
      state,
      "all",
      now,
    );
    expect(result.mistakes).toHaveLength(2);
    expect(result.pendingCount).toBe(1);
    expect(result.correct).toBe(8);
    expect(result.total).toBe(10);
    expect(
      result.recommendations.find((r) => r.kind === "review")?.reason,
    ).toContain("1 câu");
  });
});

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
const post = (body: unknown) => ({
  method: "POST",
  body: JSON.stringify(body),
});
async function submitted(repo: DemoStore) {
  const item = (await repo.request(
    "reading/attempts",
    post({ setId: "tool-library" }),
  )) as ReadingAttempt;
  await repo.request(
    `reading/attempts/${item.id}/answers`,
    post({ revision: 0, answers: { ...correct, q1: "A" }, flagged: [] }),
  );
  return (await repo.request(
    `reading/attempts/${item.id}/submit`,
    post({ revision: 1 }),
  )) as ReadingAttempt;
}
describe("learning persistence and v1 compatibility", () => {
  it("upgrades populated v1 data without losing essays, drafts, attempts or identity", async () => {
    const storage = new MemoryStorage();
    const repo = new DemoStore(storage);
    await repo.request("session");
    await submitted(repo);
    await repo.request("writing/submissions", {
      ...post({
        prompt: "Should cities improve their public transport?",
        essay:
          "I believe public transport improves the quality of life in crowded cities and reduces traffic.",
        consent: true,
      }),
      headers: { "Idempotency-Key": crypto.randomUUID() },
    });
    await repo.request(
      "authoring/drafts",
      post({
        title: "Garden demo",
        author: "Author",
        text: "Residents built a community garden beside the local library. Volunteers water the plants every morning and share vegetables with their neighbours.",
        rightsConfirmed: true,
      }),
    );
    const legacy = { ...JSON.parse(storage.getItem(DEMO_KEY)!), version: 1 };
    delete legacy.learning;
    storage.setItem(DEMO_KEY, JSON.stringify(legacy));
    const reopened = new DemoStore(storage);
    const result = (await reopened.request("learning/progress")) as Progress;
    expect(result.readingCount).toBe(1);
    expect(result.writingCount).toBe(1);
    expect(result.learning.revision).toBe(0);
    expect(JSON.parse(storage.getItem(DEMO_KEY)!).version).toBe(1); // Read is non-destructive.
    await reopened.request(
      "learning/actions",
      post({ action: "preferences", revision: 0, enabled: false }),
    );
    const migrated = JSON.parse(storage.getItem(DEMO_KEY)!);
    expect(migrated.version).toBe(2);
    expect(migrated.sessionId).toBe(legacy.sessionId);
    expect(migrated.attempts).toEqual(legacy.attempts);
    expect(migrated.writing).toEqual(legacy.writing);
    expect(migrated.drafts).toEqual(legacy.drafts);
    expect(migrated.learning.recommendationsEnabled).toBe(false);
  });
  it("retries against the attempt snapshot, persists reviewed state and rejects stale or invalid actions", async () => {
    const storage = new MemoryStorage();
    const repo = new DemoStore(storage);
    const original = await submitted(repo);
    const progress = (await repo.request("learning/progress")) as Progress;
    const key = progress.mistakes[0].key;
    const wrong = (await repo.request(
      "learning/actions",
      post({ action: "answer", revision: 0, key, answer: "C" }),
    )) as { feedback: ReviewFeedback };
    expect(wrong.feedback.correct).toBe(false);
    await expect(
      repo.request(
        "learning/actions",
        post({ action: "answer", revision: 0, key, answer: "B" }),
      ),
    ).rejects.toThrow(/tab khác/);
    await expect(
      repo.request(
        "learning/actions",
        post({
          action: "answer",
          revision: 1,
          key: `${original.id}:q2`,
          answer: "TRUE",
        }),
      ),
    ).rejects.toThrow(/Không tìm thấy/);
    await repo.request(
      "learning/actions",
      post({ action: "answer", revision: 1, key, answer: "B" }),
    );
    const restored = (await new DemoStore(storage).request(
      "learning/progress",
    )) as Progress;
    expect(restored.pendingCount).toBe(0);
    expect(restored.mistakes[0].tries).toBe(2);
    expect(await repo.request(`reading/attempts/${original.id}`)).toEqual(
      original,
    );
    await repo.request(
      "learning/actions",
      post({ action: "reopen", revision: 2, key }),
    );
    expect(
      ((await repo.request("learning/progress")) as Progress).pendingCount,
    ).toBe(1);
  });
  it("persists opt-out and dismissal, exports settings, and removes them on session deletion", async () => {
    const storage = new MemoryStorage();
    const repo = new DemoStore(storage);
    const first = (await repo.request("learning/progress")) as Progress;
    const id = first.recommendations[0].id;
    await repo.request(
      "learning/actions",
      post({ action: "dismiss", revision: 0, id }),
    );
    const hidden = (await new DemoStore(storage).request(
      "learning/progress",
    )) as Progress;
    expect(hidden.recommendations.some((r) => r.id === id)).toBe(false);
    await repo.request(
      "learning/actions",
      post({ action: "restore", revision: 1 }),
    );
    expect(
      (
        (await repo.request("learning/progress")) as Progress
      ).recommendations.some((r) => r.id === id),
    ).toBe(true);
    await repo.request(
      "learning/actions",
      post({ action: "preferences", revision: 2, enabled: false }),
    );
    expect(
      ((await repo.request("learning/progress")) as Progress).recommendations,
    ).toEqual([]);
    expect(await repo.request("demo/export")).toHaveProperty(
      "learning.recommendationsEnabled",
      false,
    );
    await repo.request("session", { method: "DELETE" });
    const fresh = (await repo.request("learning/progress")) as Progress;
    expect(fresh.learning).toEqual(newLearningState());
    expect(fresh.total).toBe(0);
  });
  it("does not overwrite v1 data when migration persistence fails", async () => {
    const storage = new MemoryStorage();
    const repo = new DemoStore(storage);
    await submitted(repo);
    const legacy = { ...JSON.parse(storage.getItem(DEMO_KEY)!), version: 1 };
    delete legacy.learning;
    const raw = JSON.stringify(legacy);
    storage.setItem(DEMO_KEY, raw);
    storage.setItem = () => {
      throw new Error("quota");
    };
    await expect(
      repo.request(
        "learning/actions",
        post({ action: "preferences", revision: 0, enabled: false }),
      ),
    ).rejects.toThrow(/Không lưu được/);
    expect(storage.getItem(DEMO_KEY)).toBe(raw);
  });
});
