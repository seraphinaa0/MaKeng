import { z } from "zod";

const common = { id: z.string().min(1), prompt: z.string().min(1) };
export const questionSchema = z.discriminatedUnion("type", [
  z
    .object({
      ...common,
      type: z.literal("mcq"),
      options: z
        .array(
          z.object({ id: z.string().min(1), text: z.string().min(1) }).strict(),
        )
        .length(4),
    })
    .strict(),
  z.object({ ...common, type: z.literal("tfng") }).strict(),
  z
    .object({
      ...common,
      type: z.literal("completion"),
      maxWords: z.number().int().min(1).max(3),
    })
    .strict(),
]);
export const solutionSchema = z
  .object({
    answers: z.array(z.string().min(1)).min(1),
    explanation: z.string().min(1),
    evidence: z
      .object({
        blockId: z.string(),
        start: z.number().int().nonnegative(),
        end: z.number().int().positive(),
        quote: z.string().min(1),
      })
      .strict(),
  })
  .strict();
export const readingSetSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    version: z.number().int().positive(),
    title: z.string().min(1),
    minutes: z.number().int().positive(),
    publication: z.enum(["preview", "published", "archived"]),
    provenance: z
      .object({
        author: z.string().min(1),
        source: z.literal("original-synthetic"),
        rights: z.literal("original-project-content"),
        humanReviewer: z.string().min(1).nullable(),
      })
      .strict(),
    paragraphs: z
      .array(z.object({ id: z.string(), text: z.string().min(1) }).strict())
      .min(1),
    questions: z.array(questionSchema).min(1),
    solutions: z.record(z.string(), solutionSchema),
  })
  .strict()
  .superRefine((set, ctx) => {
    const fail = (message: string) => ctx.addIssue({ code: "custom", message });
    if (set.publication === "published" && !set.provenance.humanReviewer)
      fail("Publication requires human review");
    if (new Set(set.paragraphs.map((p) => p.id)).size !== set.paragraphs.length)
      fail("Duplicate block id");
    if (new Set(set.questions.map((q) => q.id)).size !== set.questions.length)
      fail("Duplicate question id");
    if (Object.keys(set.solutions).length !== set.questions.length)
      fail("Answer key mismatch");
    for (const q of set.questions) {
      const s = set.solutions[q.id];
      if (!s) {
        fail("Missing answer");
        continue;
      }
      const block = set.paragraphs.find((p) => p.id === s.evidence.blockId);
      if (
        !block ||
        s.evidence.end <= s.evidence.start ||
        block.text.slice(s.evidence.start, s.evidence.end) !== s.evidence.quote
      )
        fail("Invalid evidence");
      if (
        q.type === "mcq" &&
        (new Set(q.options.map((o) => o.id)).size !== 4 ||
          s.answers.length !== 1 ||
          !q.options.some((o) => o.id === s.answers[0]))
      )
        fail("Invalid options or MCQ answer");
      if (
        q.type === "tfng" &&
        (s.answers.length !== 1 ||
          !["TRUE", "FALSE", "NOT GIVEN"].includes(s.answers[0]))
      )
        fail("Invalid TFNG answer");
      if (
        q.type === "completion" &&
        s.answers.some((a) => a.trim().split(/\s+/).length > q.maxWords)
      )
        fail("Answer exceeds word limit");
    }
  });
export type ReadingSet = z.infer<typeof readingSetSchema>;
export type Question = z.infer<typeof questionSchema>;
export type Solution = z.infer<typeof solutionSchema>;
export type PublicReadingSet = Omit<ReadingSet, "solutions">;
export const answerMapSchema = z.record(
  z.string().max(50),
  z.string().max(200),
);
export const saveAttemptSchema = z
  .object({
    revision: z.number().int().nonnegative(),
    answers: answerMapSchema,
    flagged: z.array(z.string().max(50)).max(100),
  })
  .strict();
export type AttemptInput = z.infer<typeof saveAttemptSchema>;
export interface ReadingResult {
  score: number;
  total: number;
  questions: Array<{
    questionId: string;
    correct: boolean;
    answer: string;
    solution: Solution;
  }>;
  byType: Array<{ type: Question["type"]; correct: number; total: number }>;
}
export interface ReadingAttempt {
  id: string;
  revision: number;
  status: "in_progress" | "submitted";
  createdAt: string;
  submittedAt: string | null;
  content: PublicReadingSet;
  answers: Record<string, string>;
  flagged: string[];
  result: ReadingResult | null;
}
export interface ReadingSummary {
  id: string;
  title: string;
  version: number;
  status: ReadingAttempt["status"];
  score: number | null;
  total: number;
  createdAt: string;
}
