import { z } from "zod";

export const criteria = [
  "taskResponse",
  "coherenceCohesion",
  "lexicalResource",
  "grammar",
] as const;
export const criterionLabels: Record<(typeof criteria)[number], string> = {
  taskResponse: "Task Response",
  coherenceCohesion: "Coherence & Cohesion",
  lexicalResource: "Lexical Resource",
  grammar: "Grammar Range & Accuracy",
};
export const submissionInput = z
  .object({
    prompt: z.string().trim().min(20).max(3000),
    essay: z.string().trim().min(30).max(20000),
    consent: z.literal(true),
  })
  .strict();
const band = z.number().min(0).max(9).multipleOf(0.5);
const criterion = z
  .object({
    band,
    evidence: z
      .object({
        start: z.number().int().nonnegative(),
        end: z.number().int().positive(),
        quote: z.string().min(1).max(2000),
      })
      .strict(),
    observation: z.string().min(1).max(2000),
    suggestion: z.string().min(1).max(2000),
  })
  .strict();
export const evaluationSchema = z
  .object({
    schemaVersion: z.literal("1"),
    mode: z.literal("mock"),
    criteria: z
      .object({
        taskResponse: criterion,
        coherenceCohesion: criterion,
        lexicalResource: criterion,
        grammar: criterion,
      })
      .strict(),
    nextSteps: z.array(z.string().min(1).max(1000)).min(1).max(5),
  })
  .strict();
export type Evaluation = z.infer<typeof evaluationSchema>;
export type WritingInput = z.infer<typeof submissionInput>;
export const statusSchema = z.enum([
  "queued",
  "processing",
  "retrying",
  "completed",
  "failed",
]);
export type JobStatus = z.infer<typeof statusSchema>;
export interface Submission {
  id: string;
  prompt: string;
  essay: string;
  createdAt: string;
  status: JobStatus;
  attempts: number;
  errorCode: string | null;
  evaluation: Evaluation | null;
  overall: number | null;
}

export function validateEvaluation(output: unknown, essay: string): Evaluation {
  const parsed = evaluationSchema.parse(output);
  for (const name of criteria) {
    const { start, end, quote } = parsed.criteria[name].evidence;
    if (
      end <= start ||
      end > essay.length ||
      essay.slice(start, end) !== quote
    ) {
      throw new Error("INVALID_EVIDENCE");
    }
  }
  return parsed;
}
