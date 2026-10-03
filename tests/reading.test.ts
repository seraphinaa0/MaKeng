import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { localPreviewSets, publishedSets } from "../packages/content/reading";
import {
  normalizeAnswer,
  publicReadingSet,
  scoreReading,
} from "../packages/domain/reading";
import { readingSetSchema } from "../packages/schemas/reading";
import { Repository, workspaceRoot, hash } from "../packages/db/repository";
import { ReadingRepository } from "../packages/db/reading";

const opened: Repository[] = [];
function fixture() {
  const repo = new Repository(":memory:");
  opened.push(repo);
  const owner = repo.owner(repo.createSession())!;
  return { repo, owner, reading: new ReadingRepository(repo) };
}
afterEach(() => {
  for (const repo of opened.splice(0)) repo.close();
});
const set = localPreviewSets[0];
const answers = {
  q1: "B",
  q2: "TRUE",
  q3: "FALSE",
  q4: "NOT GIVEN",
  q5: "address",
};

describe("Reading content and scoring", () => {
  it("has five original versioned sets, all three question types and validated exact evidence", () => {
    expect(localPreviewSets).toHaveLength(5);
    expect(new Set(localPreviewSets.map((s) => s.id)).size).toBe(5);
    for (const item of localPreviewSets) {
      expect(readingSetSchema.safeParse(item).success).toBe(true);
      expect(new Set(item.questions.map((q) => q.type)).size).toBe(3);
      expect(
        scoreReading(
          item,
          Object.fromEntries(
            Object.entries(item.solutions).map(([id, s]) => [id, s.answers[0]]),
          ),
        ).score,
      ).toBe(5);
    }
  });
  it("keeps preview content out of publication and rejects invented review approval", () => {
    expect(publishedSets(localPreviewSets)).toEqual([]);
    expect(
      readingSetSchema.safeParse({ ...set, publication: "published" }).success,
    ).toBe(false);
  });
  it("rejects missing answers, duplicated questions and invalid evidence", () => {
    const missing = structuredClone(set);
    delete missing.solutions.q1;
    expect(readingSetSchema.safeParse(missing).success).toBe(false);
    const duplicate = structuredClone(set);
    duplicate.questions[1].id = "q1";
    expect(readingSetSchema.safeParse(duplicate).success).toBe(false);
    const invalid = structuredClone(set);
    invalid.solutions.q1.evidence.start += 1;
    expect(readingSetSchema.safeParse(invalid).success).toBe(false);
  });
  it("normalizes case and whitespace without accepting a different meaning", () => {
    expect(normalizeAnswer("  Growing\n  NOTES ")).toBe("growing notes");
    expect(scoreReading(set, { ...answers, q5: "  ADDRESS  " }).score).toBe(5);
    expect(scoreReading(set, { ...answers, q5: "addresses" }).score).toBe(4);
    expect(scoreReading(set, { ...answers, q4: "FALSE" }).score).toBe(4);
  });
  it("enforces word limits and counts omissions as incorrect with per-type totals", () => {
    expect(
      scoreReading(set, { ...answers, q5: "my current home address" }).score,
    ).toBe(4);
    const result = scoreReading(set, { q1: "B" });
    expect(result.score).toBe(1);
    expect(result.total).toBe(5);
    expect(result.byType.find((item) => item.type === "tfng")).toMatchObject({
      correct: 0,
      total: 3,
    });
  });
  it("never includes the answer key in public content", () => {
    expect(publicReadingSet(set)).not.toHaveProperty("solutions");
    expect(JSON.stringify(publicReadingSet(set))).not.toContain("explanation");
  });
});

describe("Reading persistence and concurrency", () => {
  it("resumes one active attempt and retains the original content snapshot", () => {
    const { reading, owner } = fixture();
    const item = reading.start(owner, set);
    const changed = structuredClone(set);
    changed.title = "Changed";
    changed.version = 2;
    expect(reading.start(owner, changed).id).toBe(item.id);
    expect(reading.get(owner, item.id).content.title).toBe(set.title);
    expect(reading.get(owner, item.id).content.version).toBe(1);
  });
  it("saves answers and flags, prevents stale overwrites and isolates owners", () => {
    const { repo, reading, owner } = fixture();
    const item = reading.start(owner, set);
    const saved = reading.save(owner, item.id, {
      revision: 0,
      answers,
      flagged: ["q1"],
    });
    expect(saved.revision).toBe(1);
    expect(saved.flagged).toEqual(["q1"]);
    expect(() =>
      reading.save(owner, item.id, { revision: 0, answers: {}, flagged: [] }),
    ).toThrow("REVISION_CONFLICT");
    expect(reading.get(owner, item.id).answers).toEqual(answers);
    const other = repo.owner(repo.createSession())!;
    expect(() => reading.get(other, item.id)).toThrow("NOT_FOUND");
    expect(() =>
      reading.save(other, item.id, { revision: 1, answers: {}, flagged: [] }),
    ).toThrow("NOT_FOUND");
    expect(() => reading.submit(other, item.id, 1)).toThrow("NOT_FOUND");
    expect(reading.list(other)).toEqual([]);
  });
  it("rejects unknown question ids and invalid choices", () => {
    const { reading, owner } = fixture();
    const item = reading.start(owner, set);
    expect(() =>
      reading.save(owner, item.id, {
        revision: 0,
        answers: { q6: "a" },
        flagged: [],
      }),
    ).toThrow("INVALID_INPUT");
    expect(() =>
      reading.save(owner, item.id, {
        revision: 0,
        answers: { q1: "E" },
        flagged: [],
      }),
    ).toThrow("INVALID_INPUT");
    expect(() =>
      reading.save(owner, item.id, {
        revision: 0,
        answers: { q2: "MAYBE" },
        flagged: [],
      }),
    ).toThrow("INVALID_INPUT");
  });
  it("submits atomically and idempotently; freezes answers and permits a new attempt", () => {
    const { reading, owner } = fixture();
    const item = reading.start(owner, set);
    expect(item.result).toBeNull();
    reading.save(owner, item.id, { revision: 0, answers, flagged: [] });
    expect(() => reading.submit(owner, item.id, 0)).toThrow(
      "REVISION_CONFLICT",
    );
    const result = reading.submit(owner, item.id, 1);
    expect(result.result?.score).toBe(5);
    expect(reading.submit(owner, item.id, 1)).toEqual(result);
    expect(() =>
      reading.save(owner, item.id, { revision: 2, answers: {}, flagged: [] }),
    ).toThrow("ALREADY_SUBMITTED");
    expect(reading.start(owner, set).id).not.toBe(item.id);
  });
  it("cascades session deletion to attempts and review results", () => {
    const { repo, reading, owner } = fixture();
    const item = reading.start(owner, set);
    reading.submit(owner, item.id, 0);
    repo.deleteAll(owner);
    expect(reading.list(owner)).toEqual([]);
  });
  it("upgrades a phase-1 database and persists reading through reopening", () => {
    const path = join(
      mkdtempSync(join(tmpdir(), "makeng-migration-")),
      "test.sqlite",
    );
    const old = new DatabaseSync(path);
    old.exec(
      readFileSync(
        join(workspaceRoot(), "packages/db/migrations/001-writing.sql"),
        "utf8",
      ),
    );
    const token = "a".repeat(64);
    const owner = hash(token);
    old
      .prepare("INSERT INTO sessions VALUES (?,?)")
      .run(owner, Date.now() + 86400000);
    old
      .prepare(
        "INSERT INTO submissions(id,owner,idempotency_key,input_hash,prompt,essay,consent_version,created_at,status) VALUES (?,?,?,?,?,?,?,?,?)",
      )
      .run(
        "old-writing",
        owner,
        "original",
        "fixture-hash",
        "An original writing prompt about public parks.",
        "Public parks provide a place for exercise and community activities.",
        "local-mock-v1",
        new Date().toISOString(),
        "queued",
      );
    old.close();
    const repo = new Repository(path);
    opened.push(repo);
    expect(repo.owner(token)).toBe(owner);
    const reading = new ReadingRepository(repo);
    const item = reading.start(owner, set);
    reading.save(owner, item.id, { revision: 0, answers, flagged: ["q3"] });
    const next = new Repository(path);
    opened.push(next);
    expect(next.get(owner, "old-writing").essay).toContain("Public parks");
    expect(new ReadingRepository(next).get(owner, item.id)).toMatchObject({
      answers,
      flagged: ["q3"],
      revision: 1,
    });
    expect(next.db.prepare("PRAGMA user_version").get()?.user_version).toBe(2);
  });
});
