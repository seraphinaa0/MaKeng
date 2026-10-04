import { z } from "zod";
import { generateMockReading } from "../ai/reading";
import { sourceInput, type ReadingDraft } from "../schemas/authoring";
import { readingSetSchema, type ReadingSet } from "../schemas/reading";
import { normalizeAnswer } from "./reading";
import { ApiError } from "./errors";

export function qualityIssues(set: ReadingSet): string[] {
  const parsed = readingSetSchema.safeParse(set);
  if (!parsed.success) return parsed.error.issues.map((issue) => issue.message);
  const issues: string[] = [];
  const prompts = set.questions.map((q) => normalizeAnswer(q.prompt));
  if (new Set(prompts).size !== prompts.length)
    issues.push("Câu hỏi bị trùng.");
  for (const q of set.questions) {
    const s = set.solutions[q.id];
    if (!q.prompt.trim() || !s.explanation.trim())
      issues.push(`${q.id}: thiếu câu hỏi hoặc giải thích.`);
    if (
      new Set(s.answers.map(normalizeAnswer)).size !== s.answers.length ||
      s.answers.some((a) => !a.trim())
    )
      issues.push(`${q.id}: đáp án trống hoặc bị trùng.`);
    if (
      q.type === "mcq" &&
      new Set(q.options.map((o) => normalizeAnswer(o.text))).size !== 4
    )
      issues.push(`${q.id}: bốn lựa chọn phải khác nhau.`);
    if (
      q.type === "completion" &&
      s.answers.some(
        (a) => !normalizeAnswer(s.evidence.quote).includes(normalizeAnswer(a)),
      )
    )
      issues.push(`${q.id}: đáp án điền từ không nằm trong dẫn chứng.`);
  }
  return issues;
}
export function newDraft(raw: unknown): ReadingDraft {
  const source = sourceInput.parse(raw);
  const id = crypto.randomUUID();
  return {
    id,
    revision: 0,
    source,
    set: generateMockReading(source, `generated-${id}`),
    status: "needs_review",
    generations: 1,
    reviewer: null,
    audit: [
      {
        action: "generated",
        at: new Date().toISOString(),
        note: "makeng-reading-mock-v1; structural checks only; no AI call",
      },
    ],
  };
}
export const reviewActionSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("save"),
      revision: z.number().int(),
      set: readingSetSchema,
    })
    .strict(),
  z
    .object({ action: z.literal("regenerate"), revision: z.number().int() })
    .strict(),
  z
    .object({
      action: z.literal("approve"),
      revision: z.number().int(),
      reviewer: z.string().trim().min(2).max(100),
      confirmed: z.literal(true),
    })
    .strict(),
  z
    .object({
      action: z.literal("reject"),
      revision: z.number().int(),
      reason: z.string().trim().min(5).max(1000),
    })
    .strict(),
  z
    .object({ action: z.literal("publish"), revision: z.number().int() })
    .strict(),
  z
    .object({ action: z.literal("revise"), revision: z.number().int() })
    .strict(),
]);
export function reviewDraft(current: ReadingDraft, raw: unknown): ReadingDraft {
  const input = reviewActionSchema.parse(raw);
  if (input.revision !== current.revision)
    throw new ApiError(
      "Bản nháp đã thay đổi ở tab khác. Hãy tải lại.",
      "REVISION_CONFLICT",
    );
  const draft = structuredClone(current);
  const fail = (message: string): never => {
    throw new ApiError(message, "REVIEW_INVALID");
  };
  let note = "";
  let action: ReadingDraft["audit"][number]["action"];
  if (draft.status === "published" && input.action !== "revise")
    fail("Bản đã phát hành không thể sửa; hãy tạo phiên bản mới.");
  switch (input.action) {
    case "save": {
      // Identity, source and provenance are not editable via review payload.
      const set = input.set;
      if (
        set.id !== draft.set.id ||
        set.version !== draft.set.version ||
        JSON.stringify(set.paragraphs) !==
          JSON.stringify(draft.set.paragraphs) ||
        JSON.stringify(set.provenance) !==
          JSON.stringify(draft.set.provenance) ||
        set.publication !== "preview"
      )
        fail("Không được thay nguồn hoặc danh tính phiên bản khi duyệt.");
      const issues = qualityIssues(set);
      if (issues.length) fail(issues.join(" "));
      draft.set = set;
      draft.status = "needs_review";
      draft.reviewer = null;
      action = "saved";
      break;
    }
    case "regenerate":
      if (draft.generations >= 3)
        fail("Đã đạt giới hạn 3 lần tạo. Hãy sửa thủ công.");
      draft.generations++;
      draft.set = generateMockReading(
        draft.source,
        draft.set.id,
        draft.set.version,
        draft.generations,
      );
      draft.status = "needs_review";
      draft.reviewer = null;
      action = "regenerated";
      break;
    case "approve": {
      if (draft.status !== "needs_review")
        fail("Chỉ duyệt bản đang chờ kiểm tra.");
      const issues = qualityIssues(draft.set);
      if (issues.length) fail(issues.join(" "));
      draft.status = "approved";
      draft.reviewer = input.reviewer;
      note = input.reviewer;
      action = "approved";
      break;
    }
    case "reject":
      if (draft.status !== "needs_review")
        fail("Chỉ từ chối bản đang chờ kiểm tra.");
      draft.status = "rejected";
      draft.reviewer = null;
      note = input.reason;
      action = "rejected";
      break;
    case "publish": {
      if (draft.status !== "approved" || !draft.reviewer)
        fail("Cần duyệt trước khi phát hành.");
      const issues = qualityIssues(draft.set);
      if (issues.length) fail(issues.join(" "));
      draft.set = readingSetSchema.parse({
        ...draft.set,
        publication: "published",
        provenance: { ...draft.set.provenance, humanReviewer: draft.reviewer },
      });
      draft.status = "published";
      action = "published";
      note = `v${draft.set.version}`;
      break;
    }
    case "revise":
      if (draft.status !== "published")
        fail("Chỉ tạo phiên bản mới từ bản đã phát hành.");
      draft.set.version++;
      draft.set.publication = "preview";
      draft.set.provenance.humanReviewer = null;
      draft.status = "needs_review";
      draft.reviewer = null;
      draft.generations = 1;
      action = "revised";
      break;
  }
  draft.revision++;
  draft.audit.push({ action, at: new Date().toISOString(), note });
  return draft;
}
