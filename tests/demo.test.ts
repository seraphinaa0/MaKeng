import { describe, it, expect } from "vitest";
import {
  newDraft,
  reviewDraft,
  qualityIssues,
} from "../packages/domain/authoring";
import { normalizeSource } from "../packages/ai/reading";
import { DemoStore, DEMO_KEY } from "../packages/demo/store";
import type {
  ReadingAttempt,
  PublicReadingSet,
} from "../packages/schemas/reading";
import type { ReadingDraft } from "../packages/schemas/authoring";
import type { Submission } from "../packages/schemas/writing";

const source = {
  title: "The community garden",
  author: "Demo Author",
  rightsConfirmed: true,
  text: "Residents built a community garden beside the local library. Volunteers water the plants every morning.\n\nThe garden provides vegetables for the community kitchen. Visitors can learn about growing food at weekly workshops.",
};
const post = (body: unknown): RequestInit => ({
  method: "POST",
  body: JSON.stringify(body),
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
function publish(draft: ReadingDraft) {
  const approved = reviewDraft(draft, {
    action: "approve",
    revision: draft.revision,
    reviewer: "Local Reviewer",
    confirmed: true,
  });
  return reviewDraft(approved, {
    action: "publish",
    revision: approved.revision,
  });
}
describe("Phase 3 local review gates", () => {
  it("normalizes paragraphs and requires owned source consent", () => {
    expect(normalizeSource("  A  sentence.\r\n\r\n Another\nline. ")).toEqual([
      { id: "p1", text: "A sentence." },
      { id: "p2", text: "Another line." },
    ]);
    expect(() => newDraft({ ...source, rightsConfirmed: false })).toThrow();
    expect(() => newDraft({ ...source, text: "short" })).toThrow();
  });
  it("generates three types with exact evidence but never publishes automatically", () => {
    const draft = newDraft(source);
    expect(draft.status).toBe("needs_review");
    expect(draft.set.publication).toBe("preview");
    expect(draft.set.questions.map((q) => q.type)).toEqual([
      "mcq",
      "tfng",
      "completion",
    ]);
    expect(qualityIssues(draft.set)).toEqual([]);
    expect(() =>
      reviewDraft(draft, { action: "publish", revision: 0 }),
    ).toThrow(/duyệt/);
    expect(() =>
      reviewDraft(draft, {
        action: "approve",
        revision: 0,
        reviewer: "Reviewer",
        confirmed: false,
      }),
    ).toThrow();
  });
  it("blocks invalid evidence, duplicate options and missing cloze evidence", () => {
    const set = newDraft(source).set;
    set.solutions.q1.evidence.quote = "Not in source";
    expect(qualityIssues(set).length).toBeGreaterThan(0);
    const duplicate = newDraft(source).set;
    if (duplicate.questions[0].type === "mcq")
      duplicate.questions[0].options[1].text =
        duplicate.questions[0].options[0].text;
    expect(qualityIssues(duplicate).join(" ")).toMatch(/khác nhau/);
    const cloze = newDraft(source).set;
    cloze.solutions.q3.answers = ["impossible"];
    expect(qualityIssues(cloze).join(" ")).toMatch(/dẫn chứng/);
  });
  it("rejects stale changes, records rejection reason and resets approval on edits", () => {
    const draft = newDraft(source);
    expect(() =>
      reviewDraft(draft, { action: "regenerate", revision: 9 }),
    ).toThrow(/tab khác/);
    const rejected = reviewDraft(draft, {
      action: "reject",
      revision: 0,
      reason: "Needs stronger distractors",
    });
    expect(rejected.audit.at(-1)?.note).toBe("Needs stronger distractors");
    expect(() =>
      reviewDraft(rejected, {
        action: "approve",
        revision: rejected.revision,
        reviewer: "Reviewer",
        confirmed: true,
      }),
    ).toThrow();
    const fixed = reviewDraft(rejected, {
      action: "save",
      revision: rejected.revision,
      set: rejected.set,
    });
    const approved = reviewDraft(fixed, {
      action: "approve",
      revision: fixed.revision,
      reviewer: "Reviewer",
      confirmed: true,
    });
    const edited = reviewDraft(approved, {
      action: "save",
      revision: approved.revision,
      set: approved.set,
    });
    expect(edited.status).toBe("needs_review");
    expect(edited.reviewer).toBeNull();
  });
  it("limits regeneration and freezes published revisions", () => {
    let draft = newDraft(source);
    for (let n = 0; n < 2; n++)
      draft = reviewDraft(draft, {
        action: "regenerate",
        revision: draft.revision,
      });
    expect(() =>
      reviewDraft(draft, { action: "regenerate", revision: draft.revision }),
    ).toThrow(/3 lần/);
    const published = publish(draft);
    expect(() =>
      reviewDraft(published, {
        action: "save",
        revision: published.revision,
        set: published.set,
      }),
    ).toThrow();
    const revised = reviewDraft(published, {
      action: "revise",
      revision: published.revision,
    });
    expect(revised.set.version).toBe(2);
    expect(revised.status).toBe("needs_review");
    expect(published.set.version).toBe(1);
    expect(published.set.publication).toBe("published");
  });
});
describe("browser demo persistence", () => {
  it("resumes, checks revisions, scores and preserves submitted attempts across reloads", async () => {
    const storage = new MemoryStorage();
    const repo = new DemoStore(storage);
    await repo.request("session");
    const first = (await repo.request(
      "reading/attempts",
      post({ setId: "tool-library" }),
    )) as ReadingAttempt;
    expect(first.content).not.toHaveProperty("solutions");
    expect(first.result).toBeNull();
    const resumed = (await repo.request(
      "reading/attempts",
      post({ setId: "tool-library" }),
    )) as ReadingAttempt;
    expect(resumed.id).toBe(first.id);
    const input = {
      revision: 0,
      answers: {
        q1: "B",
        q2: "TRUE",
        q3: "FALSE",
        q4: "NOT GIVEN",
        q5: " ADDRESS ",
      },
      flagged: ["q1"],
    };
    await repo.request(`reading/attempts/${first.id}/answers`, post(input));
    await expect(
      repo.request(`reading/attempts/${first.id}/answers`, post(input)),
    ).rejects.toThrow(/tab khác/);
    const result = (await new DemoStore(storage).request(
      `reading/attempts/${first.id}/submit`,
      post({ revision: 1 }),
    )) as ReadingAttempt;
    expect(result.result?.score).toBe(5);
    await expect(
      repo.request(
        `reading/attempts/${first.id}/answers`,
        post({ ...input, revision: 2 }),
      ),
    ).rejects.toThrow(/đã nộp/);
    expect(
      await repo.request(
        `reading/attempts/${first.id}/submit`,
        post({ revision: 1 }),
      ),
    ).toEqual(result);
    await expect(
      new DemoStore(new MemoryStorage()).request(
        `reading/attempts/${first.id}`,
      ),
    ).rejects.toThrow(/Không tìm thấy/);
  });
  it("only adds explicitly published drafts to catalog and keeps old attempt snapshots", async () => {
    const repo = new DemoStore(new MemoryStorage());
    await repo.request("session");
    let draft = (await repo.request(
      "authoring/drafts",
      post(source),
    )) as ReadingDraft;
    expect(await repo.request("reading/sets")).toHaveLength(5);
    draft = (await repo.request(
      `authoring/drafts/${draft.id}`,
      post({
        action: "approve",
        revision: 0,
        reviewer: "Reviewer",
        confirmed: true,
      }),
    )) as ReadingDraft;
    expect(await repo.request("reading/sets")).toHaveLength(5);
    draft = (await repo.request(
      `authoring/drafts/${draft.id}`,
      post({ action: "publish", revision: draft.revision }),
    )) as ReadingDraft;
    const attempt = (await repo.request(
      "reading/attempts",
      post({ setId: draft.set.id }),
    )) as ReadingAttempt;
    draft = (await repo.request(
      `authoring/drafts/${draft.id}`,
      post({ action: "revise", revision: draft.revision }),
    )) as ReadingDraft;
    draft = (await repo.request(
      `authoring/drafts/${draft.id}`,
      post({
        action: "approve",
        revision: draft.revision,
        reviewer: "Reviewer",
        confirmed: true,
      }),
    )) as ReadingDraft;
    await repo.request(
      `authoring/drafts/${draft.id}`,
      post({ action: "publish", revision: draft.revision }),
    );
    const sets = (await repo.request("reading/sets")) as PublicReadingSet[];
    expect(sets).toHaveLength(6);
    expect(sets[0].version).toBe(2);
    const old = (await repo.request(
      `reading/attempts/${attempt.id}`,
    )) as ReadingAttempt;
    expect(old.content.version).toBe(1);
  });
  it("keeps Writing idempotent, validates consent and supports complete deletion", async () => {
    const storage = new MemoryStorage();
    const repo = new DemoStore(storage);
    await repo.request("session");
    const input = {
      prompt: "Should communities invest in public gardens?",
      essay:
        "I believe that public gardens benefit all residents and improve the quality of life in cities.",
      consent: true,
    };
    const init = {
      ...post(input),
      headers: { "Idempotency-Key": crypto.randomUUID() },
    };
    const item = (await repo.request(
      "writing/submissions",
      init,
    )) as Submission;
    expect(item.overall).toBe(6);
    expect(item.status).toBe("completed");
    expect(
      await new DemoStore(storage).request("writing/submissions", init),
    ).toEqual(item);
    await expect(
      repo.request("writing/submissions", {
        ...init,
        ...post({ ...input, consent: false }),
      }),
    ).rejects.toThrow();
    await expect(
      repo.request("writing/submissions", {
        ...init,
        ...post({ ...input, essay: input.essay + " More." }),
      }),
    ).rejects.toThrow(/nội dung khác/);
    await repo.request("authoring/drafts", post(source));
    await repo.request("session", { method: "DELETE" });
    expect(storage.getItem(DEMO_KEY)).toBeNull();
    expect(await repo.request("authoring/drafts")).toEqual([]);
  });
  it("never overwrites corrupt state or reports a successful save when storage is full", async () => {
    const storage = new MemoryStorage();
    storage.setItem(DEMO_KEY, "broken");
    await expect(new DemoStore(storage).request("session")).rejects.toThrow(
      /Không ghi đè/,
    );
    expect(storage.getItem(DEMO_KEY)).toBe("broken");
    storage.removeItem(DEMO_KEY);
    const repo = new DemoStore(storage);
    await repo.request("session");
    const before = storage.getItem(DEMO_KEY);
    storage.setItem = () => {
      throw new Error("QuotaExceededError");
    };
    await expect(
      repo.request("authoring/drafts", post(source)),
    ).rejects.toThrow(/Không lưu được/);
    expect(storage.getItem(DEMO_KEY)).toBe(before);
  });
});
