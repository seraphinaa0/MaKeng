import { randomUUID } from "node:crypto";
import { type Repository, RepositoryError } from "./repository";
import {
  readingSetSchema,
  saveAttemptSchema,
  type ReadingSet,
  type ReadingAttempt,
  type ReadingResult,
  type ReadingSummary,
  type AttemptInput,
} from "../schemas/reading";
import { publicReadingSet, scoreReading } from "../domain/reading";

export class ReadingRepository {
  constructor(private repo: Repository) {}
  private atomic<T>(fn: () => T): T {
    this.repo.db.exec("BEGIN IMMEDIATE");
    try {
      const value = fn();
      this.repo.db.exec("COMMIT");
      return value;
    } catch (error) {
      this.repo.db.exec("ROLLBACK");
      throw error;
    }
  }
  private row(owner: string, id: string) {
    const row = this.repo.db
      .prepare("SELECT * FROM reading_attempts WHERE owner=? AND id=?")
      .get(owner, id);
    if (!row) throw new RepositoryError("NOT_FOUND", 404);
    return row;
  }
  get(owner: string, id: string): ReadingAttempt {
    const row = this.row(owner, id);
    return {
      id: String(row.id),
      revision: Number(row.revision),
      status: row.status === "submitted" ? "submitted" : "in_progress",
      createdAt: String(row.created_at),
      submittedAt: row.submitted_at ? String(row.submitted_at) : null,
      content: publicReadingSet(
        readingSetSchema.parse(JSON.parse(String(row.content))),
      ),
      answers: JSON.parse(String(row.answers)),
      flagged: JSON.parse(String(row.flagged)),
      result: row.result
        ? (JSON.parse(String(row.result)) as ReadingResult)
        : null,
    };
  }
  start(owner: string, set: ReadingSet): ReadingAttempt {
    const validated = readingSetSchema.parse(set);
    if (validated.publication === "archived")
      throw new RepositoryError("NOT_FOUND", 404);
    return this.atomic(() => {
      const active = this.repo.db
        .prepare(
          "SELECT id FROM reading_attempts WHERE owner=? AND set_id=? AND status='in_progress'",
        )
        .get(owner, set.id);
      if (active) return this.get(owner, String(active.id));
      const count = Number(
        this.repo.db
          .prepare(
            "SELECT count(*) AS n FROM reading_attempts WHERE owner=? AND created_at>?",
          )
          .get(owner, new Date(Date.now() - 3600000).toISOString())?.n,
      );
      if (count >= 30) throw new RepositoryError("READING_LIMIT", 429);
      const id = randomUUID();
      this.repo.db
        .prepare(
          "INSERT INTO reading_attempts(id,owner,set_id,content,created_at) VALUES (?,?,?,?,?)",
        )
        .run(
          id,
          owner,
          validated.id,
          JSON.stringify(validated),
          new Date().toISOString(),
        );
      return this.get(owner, id);
    });
  }
  save(owner: string, id: string, raw: AttemptInput): ReadingAttempt {
    const input = saveAttemptSchema.parse(raw);
    return this.atomic(() => {
      const item = this.get(owner, id);
      if (item.status === "submitted")
        throw new RepositoryError("ALREADY_SUBMITTED", 409);
      if (item.revision !== input.revision)
        throw new RepositoryError("REVISION_CONFLICT", 409);
      const ids = item.content.questions.map((q) => q.id);
      if (
        Object.keys(input.answers).some((key) => !ids.includes(key)) ||
        input.flagged.some((key) => !ids.includes(key))
      )
        throw new RepositoryError("INVALID_INPUT");
      for (const q of item.content.questions) {
        const answer = input.answers[q.id];
        if (!answer) continue;
        if (q.type === "mcq" && !q.options.some((o) => o.id === answer))
          throw new RepositoryError("INVALID_INPUT");
        if (
          q.type === "tfng" &&
          !["TRUE", "FALSE", "NOT GIVEN"].includes(answer)
        )
          throw new RepositoryError("INVALID_INPUT");
      }
      this.repo.db
        .prepare(
          "UPDATE reading_attempts SET answers=?,flagged=?,revision=revision+1 WHERE id=? AND owner=?",
        )
        .run(
          JSON.stringify(input.answers),
          JSON.stringify([...new Set(input.flagged)]),
          id,
          owner,
        );
      return this.get(owner, id);
    });
  }
  submit(owner: string, id: string, revision: number): ReadingAttempt {
    return this.atomic(() => {
      const row = this.row(owner, id);
      if (row.status === "submitted") return this.get(owner, id);
      if (Number(row.revision) !== revision)
        throw new RepositoryError("REVISION_CONFLICT", 409);
      const content = readingSetSchema.parse(JSON.parse(String(row.content)));
      const result = scoreReading(content, JSON.parse(String(row.answers)));
      this.repo.db
        .prepare(
          "UPDATE reading_attempts SET status='submitted',result=?,submitted_at=?,revision=revision+1 WHERE id=? AND owner=?",
        )
        .run(JSON.stringify(result), new Date().toISOString(), id, owner);
      return this.get(owner, id);
    });
  }
  list(owner: string, offset = 0): ReadingSummary[] {
    return this.repo.db
      .prepare(
        "SELECT * FROM reading_attempts WHERE owner=? ORDER BY created_at DESC,id DESC LIMIT 20 OFFSET ?",
      )
      .all(owner, offset)
      .map((row) => {
        const item = this.get(owner, String(row.id));
        return {
          id: item.id,
          title: item.content.title,
          version: item.content.version,
          status: item.status,
          score: item.result?.score ?? null,
          total: item.content.questions.length,
          createdAt: item.createdAt,
        };
      });
  }
}
