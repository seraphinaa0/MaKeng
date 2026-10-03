import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { aggregateBand, wordCount, prompts } from "../packages/domain/writing";
import {
  criteria,
  submissionInput,
  validateEvaluation,
} from "../packages/schemas/writing";
import { Repository } from "../packages/db/repository";
import {
  MockWritingEvaluator,
  TransientProviderError,
  type WritingEvaluator,
} from "../packages/ai/writing";
import { processOne } from "../apps/worker/process";

const input = {
  prompt: prompts[0].text,
  essay:
    "I believe public parks are essential because they give everyone a place to exercise, meet neighbours and enjoy nature.",
  consent: true as const,
};
const databases: Repository[] = [];
function fixture(path = ":memory:") {
  const repo = new Repository(path);
  databases.push(repo);
  const token = repo.createSession();
  const owner = repo.owner(token)!;
  return { repo, token, owner };
}
afterEach(() => {
  for (const repo of databases.splice(0)) repo.close();
});

describe("Writing contracts", () => {
  it("requires consent, bounded content and no unexpected input fields", () => {
    expect(
      submissionInput.safeParse({ ...input, consent: false }).success,
    ).toBe(false);
    expect(
      submissionInput.safeParse({ ...input, essay: "a".repeat(20001) }).success,
    ).toBe(false);
    expect(
      submissionInput.safeParse({ ...input, owner: "attacker" }).success,
    ).toBe(false);
    expect(submissionInput.parse(input)).toEqual(input);
  });
  it("counts whitespace-separated words including newlines", () => {
    expect(wordCount("   ")).toBe(0);
    expect(wordCount(" People\nneed  green spaces. ")).toBe(4);
  });
  it("computes an equally weighted practice band, rounded to half-band", async () => {
    const result = await new MockWritingEvaluator().evaluate(
      input,
      new AbortController().signal,
    );
    const evaluation = validateEvaluation(result.output, input.essay);
    [6, 6.5, 7, 7.5].forEach((value, i) => {
      evaluation.criteria[criteria[i]].band = value;
    });
    expect(aggregateBand(evaluation)).toBe(7);
    evaluation.criteria.grammar.band = 6;
    expect(aggregateBand(evaluation)).toBe(6.5);
  });
  it("rejects fabricated evidence, fractional invalid scores and extra model properties", async () => {
    const result = await new MockWritingEvaluator().evaluate(
      input,
      new AbortController().signal,
    );
    const valid = validateEvaluation(result.output, input.essay);
    const invalid = structuredClone(valid);
    invalid.criteria.grammar.evidence.quote = "A fabricated quote";
    expect(() => validateEvaluation(invalid, input.essay)).toThrow(
      "INVALID_EVIDENCE",
    );
    const badBand = structuredClone(valid);
    badBand.criteria.grammar.band = 6.3;
    expect(() => validateEvaluation(badBand, input.essay)).toThrow();
    expect(() =>
      validateEvaluation({ ...valid, overall: 9 }, input.essay),
    ).toThrow();
  });
});

describe("Persistent repository and ownership", () => {
  it("isolates owners for reads, lists, deletion and retries", () => {
    const { repo, owner } = fixture();
    const other = repo.owner(repo.createSession())!;
    const item = repo.create(owner, "key", input);
    expect(repo.list(other)).toEqual([]);
    expect(() => repo.get(other, item.id)).toThrow("NOT_FOUND");
    expect(() => repo.delete(other, item.id)).toThrow("NOT_FOUND");
    expect(() => repo.retry(other, item.id)).toThrow("NOT_FOUND");
    expect(repo.get(owner, item.id).essay).toBe(input.essay);
  });
  it("stores before processing and survives a fresh connection", () => {
    const path = join(
      mkdtempSync(join(tmpdir(), "makeng-test-")),
      "test.sqlite",
    );
    const { repo, owner, token } = fixture(path);
    const item = repo.create(owner, "key", input);
    const reopened = new Repository(path);
    databases.push(reopened);
    expect(reopened.owner(token)).toBe(owner);
    expect(reopened.get(owner, item.id)).toMatchObject({
      status: "queued",
      essay: input.essay,
    });
  });
  it("deduplicates identical submissions but detects key reuse with different content", () => {
    const { repo, owner } = fixture();
    const item = repo.create(owner, "key", input);
    expect(repo.create(owner, "key", input).id).toBe(item.id);
    expect(repo.list(owner)).toHaveLength(1);
    expect(() =>
      repo.create(owner, "key", { ...input, essay: `${input.essay} More.` }),
    ).toThrow("IDEMPOTENCY_CONFLICT");
  });
  it("limits requests independently of deletion, allowing idempotent replay", () => {
    const { repo, owner } = fixture();
    for (let i = 0; i < 10; i++) repo.create(owner, `key-${i}`, input);
    expect(repo.create(owner, "key-0", input)).toBeTruthy();
    for (const item of repo.list(owner)) repo.delete(owner, item.id);
    expect(() => repo.create(owner, "key-11", input)).toThrow("RATE_LIMIT");
  });
  it("only one worker claims a job; an expired lease can be reclaimed", () => {
    const { repo, owner } = fixture();
    repo.create(owner, "key", input);
    const first = repo.claim(1000)!;
    expect(repo.claim(1001)).toBeNull();
    const second = repo.claim(62000)!;
    expect(second.id).toBe(first.id);
    expect(second.leaseToken).not.toBe(first.leaseToken);
    expect(
      repo.finish(
        first,
        null,
        {
          model: "mock",
          latencyMs: 0,
          inputTokens: 0,
          outputTokens: 0,
          estimatedCost: 0,
          status: "failed",
        },
        "STALE",
      ),
    ).toBe(false);
  });
});

describe("Worker", () => {
  it("validates, aggregates and records a completed run with zero mock cost", async () => {
    const { repo, owner } = fixture();
    const item = repo.create(owner, "key", input);
    expect(await processOne(repo, new MockWritingEvaluator())).toBe(true);
    expect(repo.get(owner, item.id)).toMatchObject({
      status: "completed",
      overall: 6,
      attempts: 1,
    });
    expect(
      repo.db
        .prepare("SELECT estimated_cost, schema_version FROM model_runs")
        .get(),
    ).toMatchObject({ estimated_cost: 0, schema_version: "1" });
    expect(await processOne(repo, new MockWritingEvaluator())).toBe(false);
  });
  it("keeps the essay and caps transient failures at three attempts", async () => {
    const { repo, owner } = fixture();
    const item = repo.create(owner, "key", input);
    const provider: WritingEvaluator = {
      model: "offline",
      evaluate: async () => {
        throw new TransientProviderError("offline");
      },
    };
    for (let i = 0; i < 3; i++) {
      await processOne(repo, provider);
      repo.db.prepare("UPDATE submissions SET available_at=0").run();
    }
    expect(repo.get(owner, item.id)).toMatchObject({
      status: "failed",
      attempts: 3,
      essay: input.essay,
    });
    expect(await processOne(repo, provider)).toBe(false);
  });
  it("times out a hanging provider and schedules retry", async () => {
    const { repo, owner } = fixture();
    const item = repo.create(owner, "key", input);
    const provider: WritingEvaluator = {
      model: "hanging",
      evaluate: () => new Promise(() => {}),
    };
    await processOne(repo, provider, 10);
    expect(repo.get(owner, item.id)).toMatchObject({
      status: "retrying",
      errorCode: "PROVIDER_UNAVAILABLE",
      essay: input.essay,
    });
  });
  it("does not automatically retry invalid schema or persist an unverified evaluation", async () => {
    const { repo, owner } = fixture();
    const item = repo.create(owner, "key", input);
    await processOne(repo, {
      model: "bad",
      evaluate: async () => ({
        output: { overall: 9 },
        inputTokens: 1,
        outputTokens: 1,
        estimatedCost: 0,
      }),
    });
    expect(repo.get(owner, item.id)).toMatchObject({
      status: "failed",
      evaluation: null,
      essay: input.essay,
      attempts: 1,
    });
    repo.retry(owner, item.id);
    await processOne(repo, new MockWritingEvaluator());
    expect(repo.get(owner, item.id).status).toBe("completed");
  });
  it("does not resurrect a deleted submission during evaluation", async () => {
    const { repo, owner } = fixture();
    const item = repo.create(owner, "key", input);
    const mock = new MockWritingEvaluator();
    await processOne(repo, {
      model: mock.model,
      evaluate: async (value, signal) => {
        repo.delete(owner, item.id);
        return mock.evaluate(value, signal);
      },
    });
    expect(repo.list(owner)).toEqual([]);
    expect(
      repo.db.prepare("SELECT count(*) AS n FROM model_runs").get()?.n,
    ).toBe(0);
  });
  it("deletes all submissions, runs, quota events and the session together", async () => {
    const { repo, owner, token } = fixture();
    repo.create(owner, "key", input);
    await processOne(repo, new MockWritingEvaluator());
    repo.deleteAll(owner);
    expect(repo.owner(token)).toBeNull();
    expect(repo.list(owner)).toEqual([]);
    expect(
      repo.db.prepare("SELECT count(*) AS n FROM model_runs").get()?.n,
    ).toBe(0);
    expect(
      repo.db.prepare("SELECT count(*) AS n FROM request_events").get()?.n,
    ).toBe(0);
  });
});
