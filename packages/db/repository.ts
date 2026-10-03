import { DatabaseSync } from "node:sqlite";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  evaluationSchema,
  statusSchema,
  type Evaluation,
  type Submission,
  type WritingInput,
} from "../schemas/writing";

export const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export function workspaceRoot(): string {
  let dir = process.cwd();
  while (!existsSync(resolve(dir, "pnpm-workspace.yaml"))) {
    const parent = dirname(dir);
    if (parent === dir) throw new Error("WORKSPACE_NOT_FOUND");
    dir = parent;
  }
  return dir;
}
export class RepositoryError extends Error {
  constructor(
    public code: string,
    public status = 400,
  ) {
    super(code);
  }
}
type Row = Record<string, unknown>;
function mapRow(row: Row): Submission {
  return {
    id: String(row.id),
    prompt: String(row.prompt),
    essay: String(row.essay),
    createdAt: String(row.created_at),
    status: statusSchema.parse(row.status),
    attempts: Number(row.attempts),
    errorCode: row.error_code ? String(row.error_code) : null,
    evaluation: row.evaluation
      ? evaluationSchema.parse(JSON.parse(String(row.evaluation)))
      : null,
    overall: row.overall === null ? null : Number(row.overall),
  };
}
export interface ClaimedJob {
  id: string;
  leaseToken: string;
  inputHash: string;
  input: WritingInput;
  attempts: number;
}
export interface RunRecord {
  model: string;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  status: string;
}

export class Repository {
  readonly db: DatabaseSync;
  constructor(path: string) {
    if (path !== ":memory:")
      mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    this.db = new DatabaseSync(path);
    this.db.exec(
      "PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;",
    );
    const version = Number(
      this.db.prepare("PRAGMA user_version").get()?.user_version,
    );
    if (version < 1)
      this.db.exec(
        readFileSync(
          resolve(workspaceRoot(), "packages/db/migrations/001-writing.sql"),
          "utf8",
        ),
      );
    if (version < 2)
      this.db.exec(
        readFileSync(
          resolve(workspaceRoot(), "packages/db/migrations/002-reading.sql"),
          "utf8",
        ),
      );
  }
  close() {
    this.db.close();
  }
  private transaction<T>(fn: () => T): T {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const result = fn();
      this.db.exec("COMMIT");
      return result;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }
  createSession(): string {
    const token = randomBytes(32).toString("hex");
    this.db
      .prepare("INSERT INTO sessions VALUES (?, ?)")
      .run(hash(token), Date.now() + 30 * 86400000);
    return token;
  }
  owner(token: string | undefined): string | null {
    if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
    return this.db
      .prepare("SELECT 1 FROM sessions WHERE token_hash=? AND expires_at>?")
      .get(hash(token), Date.now())
      ? hash(token)
      : null;
  }
  private enforceRate(owner: string) {
    const count = Number(
      this.db
        .prepare(
          "SELECT count(*) AS n FROM request_events WHERE owner=? AND created_at>?",
        )
        .get(owner, Date.now() - 3600000)?.n,
    );
    if (count >= 10) throw new RepositoryError("RATE_LIMIT", 429);
    this.db
      .prepare("INSERT INTO request_events VALUES (?, ?)")
      .run(owner, Date.now());
  }
  create(owner: string, key: string, input: WritingInput): Submission {
    return this.transaction(() => {
      const inputHash = hash(JSON.stringify(input));
      const existing = this.db
        .prepare(
          "SELECT * FROM submissions WHERE owner=? AND idempotency_key=?",
        )
        .get(owner, key);
      if (existing) {
        if (existing.input_hash !== inputHash)
          throw new RepositoryError("IDEMPOTENCY_CONFLICT", 409);
        return mapRow(existing);
      }
      this.enforceRate(owner);
      const id = randomUUID();
      this.db
        .prepare(
          `INSERT INTO submissions
        (id,owner,idempotency_key,input_hash,prompt,essay,consent_version,created_at,status)
        VALUES (?,?,?,?,?,?,?,?,'queued')`,
        )
        .run(
          id,
          owner,
          key,
          inputHash,
          input.prompt,
          input.essay,
          "local-mock-v1",
          new Date().toISOString(),
        );
      return this.get(owner, id);
    });
  }
  get(owner: string, id: string): Submission {
    const row = this.db
      .prepare("SELECT * FROM submissions WHERE owner=? AND id=?")
      .get(owner, id);
    if (!row) throw new RepositoryError("NOT_FOUND", 404);
    return mapRow(row);
  }
  list(owner: string, offset = 0): Submission[] {
    return this.db
      .prepare(
        "SELECT * FROM submissions WHERE owner=? ORDER BY created_at DESC, id DESC LIMIT 20 OFFSET ?",
      )
      .all(owner, offset)
      .map(mapRow);
  }
  delete(owner: string, id: string) {
    this.get(owner, id);
    this.db
      .prepare("DELETE FROM submissions WHERE owner=? AND id=?")
      .run(owner, id);
  }
  deleteAll(owner: string) {
    this.db.prepare("DELETE FROM sessions WHERE token_hash=?").run(owner);
  }
  retry(owner: string, id: string): Submission {
    return this.transaction(() => {
      const item = this.get(owner, id);
      if (item.status !== "failed" || item.attempts >= 3)
        throw new RepositoryError("RETRY_UNAVAILABLE", 409);
      this.enforceRate(owner);
      this.db
        .prepare(
          "UPDATE submissions SET status='queued', error_code=NULL, available_at=0 WHERE id=? AND owner=?",
        )
        .run(id, owner);
      return this.get(owner, id);
    });
  }
  claim(now = Date.now()): ClaimedJob | null {
    return this.transaction(() => {
      this.db
        .prepare(
          "UPDATE submissions SET status='failed', error_code='ATTEMPTS_EXHAUSTED' WHERE status='processing' AND lease_until<? AND attempts>=3",
        )
        .run(now);
      const row = this.db
        .prepare(
          `SELECT * FROM submissions WHERE attempts<3 AND
        ((status IN ('queued','retrying') AND available_at<=?) OR (status='processing' AND lease_until<?))
        ORDER BY created_at LIMIT 1`,
        )
        .get(now, now);
      if (!row) return null;
      const leaseToken = randomUUID();
      this.db
        .prepare(
          "UPDATE submissions SET status='processing', attempts=attempts+1, lease_token=?, lease_until=? WHERE id=?",
        )
        .run(leaseToken, now + 60000, String(row.id));
      return {
        id: String(row.id),
        leaseToken,
        inputHash: String(row.input_hash),
        attempts: Number(row.attempts) + 1,
        input: {
          prompt: String(row.prompt),
          essay: String(row.essay),
          consent: true,
        },
      };
    });
  }
  finish(
    job: ClaimedJob,
    result: { evaluation: Evaluation; overall: number } | null,
    run: RunRecord,
    errorCode: string | null,
    retry = false,
  ): boolean {
    return this.transaction(() => {
      const active = this.db
        .prepare(
          "SELECT 1 FROM submissions WHERE id=? AND lease_token=? AND status='processing'",
        )
        .get(job.id, job.leaseToken);
      if (!active) return false; // Deleted or reclaimed jobs may never resurrect a submission.
      this.db
        .prepare("INSERT INTO model_runs VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)")
        .run(
          randomUUID(),
          job.id,
          run.model,
          "mock-v1",
          "practice-v1",
          "1",
          job.inputHash,
          run.latencyMs,
          run.inputTokens,
          run.outputTokens,
          run.estimatedCost,
          run.status,
          new Date().toISOString(),
        );
      const state = result
        ? "completed"
        : retry && job.attempts < 3
          ? "retrying"
          : "failed";
      this.db
        .prepare(
          `UPDATE submissions SET status=?, evaluation=?, overall=?, error_code=?, lease_token=NULL,
        lease_until=NULL, available_at=? WHERE id=?`,
        )
        .run(
          state,
          result ? JSON.stringify(result.evaluation) : null,
          result?.overall ?? null,
          errorCode,
          Date.now() +
            1000 * 2 ** job.attempts +
            Math.floor(Math.random() * 500),
          job.id,
        );
      return true;
    });
  }
}
let singleton: Repository | undefined;
export function repository() {
  const path =
    process.env.MAKENG_DB_PATH ||
    resolve(workspaceRoot(), ".data/makeng.sqlite");
  if (process.env.MAKENG_DB_PATH && !process.env.MAKENG_DB_PATH.startsWith("/"))
    throw new Error("MAKENG_DB_PATH_MUST_BE_ABSOLUTE");
  return (singleton ??= new Repository(path));
}
