import { z } from "zod";
import { localPreviewSets } from "../content/reading";
import { MockWritingEvaluator } from "../ai/writing";
import { prompts, aggregateBand } from "../domain/writing";
import { isTaskOne } from "../content/writing-task-one";
import { newDraft, reviewDraft } from "../domain/authoring";
import { ApiError } from "../domain/errors";
import { publicReadingSet, scoreReading } from "../domain/reading";
import { draftSchema } from "../schemas/authoring";
import { buildProgress, type ReviewFeedback } from "../domain/learning";
import {
  learningStateSchema,
  newLearningState,
  learningActionSchema,
  periodSchema,
} from "../schemas/learning";
import {
  readingSetSchema,
  saveAttemptSchema,
  type ReadingAttempt,
} from "../schemas/reading";
import {
  evaluationSchema,
  submissionInput,
  validateEvaluation,
} from "../schemas/writing";

export const DEMO_KEY = "makeng-browser-demo-v1";
const storedAttempt = saveAttemptSchema.extend({
  id: z.uuid(),
  content: readingSetSchema,
  createdAt: z.iso.datetime(),
  submittedAt: z.iso.datetime().nullable(),
  status: z.enum(["in_progress", "submitted"]),
});
const storedSubmission = z.object({
  id: z.uuid(),
  prompt: z.string(),
  essay: z.string(),
  createdAt: z.iso.datetime(),
  status: z.literal("completed"),
  attempts: z.literal(1),
  errorCode: z.null(),
  evaluation: evaluationSchema.nullable(),
  overall: z.number().nullable(),
  key: z.uuid(),
});
const legacyStateSchema = z
  .object({
    version: z.literal(1),
    sessionId: z.uuid(),
    writing: z.array(storedSubmission),
    attempts: z.array(storedAttempt),
    drafts: z.array(draftSchema),
    published: z.array(readingSetSchema),
  })
  .strict();
const stateSchema = legacyStateSchema.extend({
  version: z.literal(2),
  learning: learningStateSchema,
});
type State = z.infer<typeof stateSchema>;
type StoredAttempt = z.infer<typeof storedAttempt>;
export const DEMO_BACKUP_LIMIT = 10 * 1024 * 1024;
export function parseDemoBackup(text: string): State {
  if (new TextEncoder().encode(text).byteLength > DEMO_BACKUP_LIMIT)
    throw new Error("Bản sao lưu Writing/Reading tối đa 10 MiB.");
  const raw: unknown = JSON.parse(text);
  const legacy = legacyStateSchema.safeParse(raw);
  const state = legacy.success
    ? { ...legacy.data, version: 2 as const, learning: newLearningState() }
    : stateSchema.parse(raw);
  const unique = (ids: string[]) => {
    if (new Set(ids).size !== ids.length)
      throw new Error("Bản sao lưu có mã dữ liệu trùng.");
  };
  unique(state.writing.map((w) => w.id));
  unique(state.writing.map((w) => w.key));
  unique(state.attempts.map((a) => a.id));
  unique(state.drafts.map((d) => d.id));
  unique(state.published.map((s) => `${s.id}:${s.version}`));
  if (state.drafts.length > 50) throw new Error("Tối đa 50 bản nháp tạo đề.");
  for (const w of state.writing) {
    submissionInput.parse({ prompt: w.prompt, essay: w.essay, consent: true });
    if (isTaskOne(w.prompt)) {
      if (w.evaluation !== null || w.overall !== null)
        throw new Error("Task 1 chưa có chấm điểm.");
      continue;
    }
    const evaluation = validateEvaluation(w.evaluation, w.essay);
    if (w.overall !== aggregateBand(evaluation))
      throw new Error("Điểm Writing không khớp phản hồi.");
  }
  for (const a of state.attempts) {
    const ids = a.content.questions.map((q) => q.id);
    if (
      (a.status === "submitted") !== (a.submittedAt !== null) ||
      (a.submittedAt && Date.parse(a.submittedAt) < Date.parse(a.createdAt)) ||
      [...Object.keys(a.answers), ...a.flagged].some((id) => !ids.includes(id))
    )
      throw new Error("Lịch sử Reading không hợp lệ.");
    for (const q of a.content.questions) {
      const answer = a.answers[q.id];
      if (
        answer &&
        ((q.type === "mcq" && !q.options.some((o) => o.id === answer)) ||
          (q.type === "tfng" &&
            !["TRUE", "FALSE", "NOT GIVEN"].includes(answer)))
      )
        throw new Error("Lựa chọn Reading không hợp lệ.");
    }
  }
  if (
    state.published.some((s) => s.publication !== "published") ||
    state.drafts.some(
      (d) => (d.status === "published") !== (d.set.publication === "published"),
    )
  )
    throw new Error("Trạng thái phát hành không hợp lệ.");
  for (const key of Object.keys(state.learning.reviews)) {
    const attempt = state.attempts.find(
      (a) =>
        a.status === "submitted" &&
        a.content.questions.some((q) => key === `${a.id}:${q.id}`),
    );
    if (
      !attempt ||
      !scoreReading(attempt.content, attempt.answers).questions.some(
        (q) => key === `${attempt.id}:${q.questionId}` && !q.correct,
      )
    )
      throw new Error("Trạng thái ôn lỗi không khớp lịch sử Reading.");
  }
  return state;
}
function fresh(): State {
  return {
    version: 2,
    sessionId: crypto.randomUUID(),
    writing: [],
    attempts: [],
    drafts: [],
    published: [],
    learning: newLearningState(),
  };
}
function visibleAttempt(item: StoredAttempt): ReadingAttempt {
  return {
    ...item,
    content: publicReadingSet(item.content),
    result:
      item.status === "submitted"
        ? scoreReading(item.content, item.answers)
        : null,
  };
}
function required<T>(item: T | undefined): T {
  if (!item)
    throw new ApiError(
      "Không tìm thấy dữ liệu trong trình duyệt này.",
      "NOT_FOUND",
    );
  return item;
}
function conflict() {
  throw new ApiError(
    "Bài đã thay đổi ở tab khác. Hãy tải bản đã lưu.",
    "REVISION_CONFLICT",
  );
}
function catalog(state: State) {
  const latest = new Map<string, z.infer<typeof readingSetSchema>>();
  for (const set of state.published.filter(
    (s) => s.publication === "published",
  )) {
    if ((latest.get(set.id)?.version ?? 0) < set.version)
      latest.set(set.id, set);
  }
  return [...latest.values(), ...localPreviewSets];
}

/** Browser-only demo persistence. Callers serialize requests with a Web Lock. */
export class DemoStore {
  constructor(
    private storage: Pick<Storage, "getItem" | "setItem" | "removeItem">,
  ) {}
  private read(): State {
    let raw: string | null;
    try {
      raw = this.storage.getItem(DEMO_KEY);
    } catch {
      throw new ApiError(
        "Trình duyệt chặn lưu dữ liệu. Hãy cho phép bộ nhớ trang web.",
        "STORAGE_UNAVAILABLE",
      );
    }
    if (!raw) return fresh();
    try {
      const parsed: unknown = JSON.parse(raw);
      const legacy = legacyStateSchema.safeParse(parsed);
      if (legacy.success)
        return { ...legacy.data, version: 2, learning: newLearningState() };
      return stateSchema.parse(parsed);
    } catch {
      throw new ApiError(
        "Dữ liệu demo không đọc được. Không ghi đè dữ liệu; hãy sao lưu trước khi xóa dữ liệu trang web.",
        "STORAGE_INVALID",
      );
    }
  }
  private write(state: State) {
    try {
      this.storage.setItem(DEMO_KEY, JSON.stringify(stateSchema.parse(state)));
    } catch {
      throw new ApiError(
        "Không lưu được: bộ nhớ trình duyệt bị chặn hoặc đã đầy. Giữ trang mở và sao chép nội dung trước khi rời trang.",
        "STORAGE_UNAVAILABLE",
      );
    }
  }
  async request(path: string, init?: RequestInit): Promise<unknown> {
    const method = init?.method ?? "GET";
    const url = new URL(path, "https://demo.invalid/");
    const parts = url.pathname.slice(1).split("/");
    const route = parts.join("/");
    if (route === "session" && method === "DELETE") {
      try {
        this.storage.removeItem(DEMO_KEY);
      } catch {
        throw new ApiError(
          "Không xóa được dữ liệu trình duyệt.",
          "STORAGE_UNAVAILABLE",
        );
      }
      return { deleted: true };
    }
    const state = this.read();
    const body = (): unknown => {
      try {
        return JSON.parse(typeof init?.body === "string" ? init.body : "{}");
      } catch {
        throw new ApiError("Dữ liệu nhập không hợp lệ.", "INVALID_INPUT");
      }
    };
    const save = (value: unknown) => {
      this.write(state);
      return value;
    };
    const page = <T>(items: T[]) => {
      const offset = z.coerce
        .number()
        .int()
        .min(0)
        .max(100000)
        .parse(url.searchParams.get("offset") || 0);
      return {
        items: items.slice(offset, offset + 20),
        nextOffset: items.length > offset + 20 ? offset + 20 : null,
      };
    };
    if (route === "session" && method === "GET")
      return save({ mode: "mock", sessionId: state.sessionId, prompts });
    if (route === "demo/export" && method === "GET") return state;
    if (route === "demo/restore" && method === "POST") {
      const input = z
        .object({ text: z.string(), consent: z.literal(true) })
        .strict()
        .parse(body());
      const backup = parseDemoBackup(input.text);
      const newWriting = backup.writing.filter(
        (w) =>
          !state.writing.some(
            (current) => current.id === w.id || current.key === w.key,
          ),
      );
      const newAttempts = backup.attempts.filter(
        (a) => !state.attempts.some((current) => current.id === a.id),
      );
      const newDrafts = backup.drafts.filter(
        (d) => !state.drafts.some((current) => current.id === d.id),
      );
      const newPublished = backup.published.filter(
        (s) =>
          !state.published.some(
            (current) => current.id === s.id && current.version === s.version,
          ),
      );
      if (state.drafts.length + newDrafts.length > 50)
        throw new Error(
          "Khôi phục vượt giới hạn 50 bản nháp; dữ liệu chưa thay đổi.",
        );
      const empty =
        !state.writing.length &&
        !state.attempts.length &&
        !state.drafts.length &&
        !state.published.length;
      state.writing.push(...newWriting);
      state.attempts.push(...newAttempts);
      state.drafts.push(...newDrafts);
      state.published.push(...newPublished);
      state.writing.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      state.attempts.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      if (empty && state.learning.revision === 0)
        state.learning = {
          ...backup.learning,
          revision: state.learning.revision + 1,
        };
      else {
        for (const [key, review] of Object.entries(backup.learning.reviews))
          if (newAttempts.some((a) => key.startsWith(`${a.id}:`)))
            state.learning.reviews[key] = review;
        state.learning.revision++;
      }
      return save({
        writing: newWriting.length,
        reading: newAttempts.length,
        drafts: newDrafts.length,
        published: newPublished.length,
        skipped:
          backup.writing.length +
          backup.attempts.length +
          backup.drafts.length +
          backup.published.length -
          newWriting.length -
          newAttempts.length -
          newDrafts.length -
          newPublished.length,
      });
    }
    if (route === "learning/progress" && method === "GET")
      return buildProgress(
        state.attempts,
        state.writing,
        catalog(state),
        state.learning,
        periodSchema.parse(url.searchParams.get("period") ?? "all"),
        Date.now(),
      );
    if (route === "learning/actions" && method === "POST") {
      const input = learningActionSchema.parse(body());
      const learning = state.learning;
      if (input.revision !== learning.revision) conflict();
      let feedback: ReviewFeedback | null = null;
      if (input.action === "preferences")
        learning.recommendationsEnabled = input.enabled;
      if (input.action === "restore") learning.dismissed = [];
      if (input.action === "dismiss") {
        const progress = buildProgress(
          state.attempts,
          state.writing,
          catalog(state),
          learning,
          periodSchema.parse(url.searchParams.get("period") ?? "all"),
          Date.now(),
        );
        required(progress.recommendations.find((r) => r.id === input.id));
        learning.dismissed = [...learning.dismissed, input.id].slice(-500);
      }
      if (input.action === "answer" || input.action === "reopen") {
        const progress = buildProgress(
          state.attempts,
          state.writing,
          catalog(state),
          learning,
          "all",
          Date.now(),
        );
        const mistake = required(
          progress.mistakes.find((m) => m.key === input.key),
        );
        const previous = learning.reviews[input.key];
        if (input.action === "answer") {
          const attempt = required(
            state.attempts.find((a) => a.id === mistake.attemptId),
          );
          const result = required(
            scoreReading(attempt.content, {
              [mistake.question.id]: input.answer,
            }).questions.find((q) => q.questionId === mistake.question.id),
          );
          learning.reviews[input.key] = {
            reviewed: result.correct,
            tries: (previous?.tries ?? 0) + 1,
            updatedAt: new Date().toISOString(),
          };
          feedback = {
            correct: result.correct,
            answer: input.answer,
            solution: result.solution,
            reviewed: result.correct,
          };
        } else
          learning.reviews[input.key] = {
            reviewed: false,
            tries: previous?.tries ?? 0,
            updatedAt: new Date().toISOString(),
          };
      }
      learning.revision++;
      return save({ feedback });
    }
    if (route === "authoring/drafts" && method === "GET") return state.drafts;
    if (route === "authoring/drafts" && method === "POST") {
      if (state.drafts.length >= 50)
        throw new ApiError(
          "Demo giới hạn 50 nguồn. Xuất bản sao và xóa dữ liệu để bắt đầu lại.",
          "DEMO_LIMIT",
        );
      const draft = newDraft(body());
      state.drafts.unshift(draft);
      return save(draft);
    }
    if (
      parts[0] === "authoring" &&
      parts[1] === "drafts" &&
      parts.length === 3 &&
      method === "POST"
    ) {
      const index = state.drafts.findIndex((d) => d.id === parts[2]);
      const draft = reviewDraft(required(state.drafts[index]), body());
      state.drafts[index] = draft;
      if (draft.status === "published")
        state.published.push(structuredClone(draft.set));
      return save(draft);
    }
    if (route === "reading/sets" && method === "GET")
      return catalog(state).map(publicReadingSet);
    if (route === "reading/attempts" && method === "GET")
      return page(
        state.attempts.map((item) => ({
          id: item.id,
          title: item.content.title,
          version: item.content.version,
          status: item.status,
          score:
            item.status === "submitted"
              ? scoreReading(item.content, item.answers).score
              : null,
          total: item.content.questions.length,
          createdAt: item.createdAt,
        })),
      );
    if (route === "reading/attempts" && method === "POST") {
      const { setId } = z.object({ setId: z.string() }).strict().parse(body());
      const content = required(catalog(state).find((s) => s.id === setId));
      const active = state.attempts.find(
        (a) =>
          a.content.id === setId &&
          a.content.version === content.version &&
          a.status === "in_progress",
      );
      if (active) return visibleAttempt(active);
      const item: StoredAttempt = {
        id: crypto.randomUUID(),
        content: structuredClone(content),
        revision: 0,
        createdAt: new Date().toISOString(),
        submittedAt: null,
        status: "in_progress",
        answers: {},
        flagged: [],
      };
      state.attempts.unshift(item);
      return save(visibleAttempt(item));
    }
    if (
      parts[0] === "reading" &&
      parts[1] === "attempts" &&
      parts.length >= 3
    ) {
      const item = required(state.attempts.find((a) => a.id === parts[2]));
      if (method === "GET" && parts.length === 3) return visibleAttempt(item);
      if (method === "POST" && parts[3] === "answers") {
        const input = saveAttemptSchema.parse(body());
        if (item.status === "submitted")
          throw new ApiError("Bài đã nộp, không thể sửa.", "ALREADY_SUBMITTED");
        if (input.revision !== item.revision) conflict();
        const ids = item.content.questions.map((q) => q.id);
        if (
          [...Object.keys(input.answers), ...input.flagged].some(
            (id) => !ids.includes(id),
          )
        )
          throw new ApiError("Câu hỏi không hợp lệ.", "INVALID_INPUT");
        for (const q of item.content.questions) {
          const answer = input.answers[q.id];
          if (!answer) continue;
          if (
            (q.type === "mcq" && !q.options.some((o) => o.id === answer)) ||
            (q.type === "tfng" &&
              !["TRUE", "FALSE", "NOT GIVEN"].includes(answer))
          )
            throw new ApiError("Đáp án không hợp lệ.", "INVALID_INPUT");
        }
        item.answers = input.answers;
        item.flagged = [...new Set(input.flagged)];
        item.revision++;
        return save(visibleAttempt(item));
      }
      if (method === "POST" && parts[3] === "submit") {
        const { revision } = z
          .object({ revision: z.number().int().nonnegative() })
          .strict()
          .parse(body());
        if (item.status === "submitted") return visibleAttempt(item);
        if (revision !== item.revision) conflict();
        item.status = "submitted";
        item.submittedAt = new Date().toISOString();
        item.revision++;
        return save(visibleAttempt(item));
      }
    }
    if (route === "writing/submissions" && method === "GET")
      return page(state.writing);
    if (route === "writing/submissions" && method === "POST") {
      const input = submissionInput.parse(body());
      const key = z
        .uuid()
        .parse(new Headers(init?.headers).get("Idempotency-Key"));
      const existing = state.writing.find((w) => w.key === key);
      if (existing) {
        if (existing.essay !== input.essay || existing.prompt !== input.prompt)
          throw new ApiError(
            "Mã nộp bài đã dùng cho nội dung khác.",
            "IDEMPOTENCY_CONFLICT",
          );
        return existing;
      }
      const evaluation = isTaskOne(input.prompt)
        ? null
        : validateEvaluation(
            (
              await new MockWritingEvaluator().evaluate(
                input,
                new AbortController().signal,
              )
            ).output,
            input.essay,
          );
      const item: z.infer<typeof storedSubmission> = {
        id: crypto.randomUUID(),
        key,
        prompt: input.prompt,
        essay: input.essay,
        createdAt: new Date().toISOString(),
        status: "completed",
        attempts: 1,
        errorCode: null,
        evaluation,
        overall: evaluation ? aggregateBand(evaluation) : null,
      };
      state.writing.unshift(item);
      return save(item);
    }
    if (
      (parts[0] === "jobs" && parts.length === 2) ||
      (parts[0] === "writing" &&
        parts[1] === "submissions" &&
        parts.length === 3)
    ) {
      const id = parts[0] === "jobs" ? parts[1] : parts[2];
      const item = required(state.writing.find((w) => w.id === id));
      if (method === "GET") return item;
      if (method === "DELETE" && parts[0] === "writing") {
        state.writing = state.writing.filter((w) => w.id !== id);
        return save({ deleted: true });
      }
    }
    throw new ApiError("Thao tác không có trong demo.", "NOT_FOUND");
  }
}

export async function demoRequest(path: string, init?: RequestInit) {
  if (!navigator.locks)
    throw new ApiError(
      "Demo cần HTTPS và trình duyệt hỗ trợ Web Locks (Chrome, Edge, Firefox hoặc Safari mới).",
      "STORAGE_UNAVAILABLE",
    );
  return navigator.locks.request(DEMO_KEY, async () => {
    try {
      if (path === "session" && init?.method === "DELETE") {
        const { clearListening } = await import("./listening-store");
        await clearListening();
        const { clearSpeaking } = await import("./speaking-store");
        await clearSpeaking();
      }
      return await new DemoStore(localStorage).request(path, init);
    } catch (error) {
      if (error instanceof z.ZodError)
        throw new ApiError(
          "Kiểm tra nội dung nhập: " +
            error.issues.map((i) => i.message).join("; "),
          "INVALID_INPUT",
        );
      throw error;
    }
  });
}
