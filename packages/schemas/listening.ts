import { z } from "zod";
import { readingSetSchema, answerMapSchema } from "./reading";

export const AUDIO_LIMIT = 20 * 1024 * 1024;
export const audioSchema = z
  .object({
    name: z.string().min(1).max(200),
    type: z.enum([
      "audio/wav",
      "audio/x-wav",
      "audio/mpeg",
      "audio/ogg",
      "audio/webm",
      "audio/mp4",
    ]),
    size: z.number().int().positive().max(AUDIO_LIMIT),
    duration: z.number().positive().max(1800),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();
export const transcriptSchema = z
  .object({
    schemaVersion: z.literal(1),
    mode: z.enum(["manual", "fixture"]),
    cues: z
      .array(
        z
          .object({
            id: z
              .string()
              .regex(/^[a-z0-9-]+$/)
              .max(50),
            start: z.number().nonnegative(),
            end: z.number().positive(),
            text: z
              .string()
              .trim()
              .min(1)
              .max(3000)
              .refine(
                (t) => !/[<>]/.test(t),
                "Chỉ nhận transcript văn bản thuần.",
              ),
          })
          .strict(),
      )
      .min(1)
      .max(200),
  })
  .strict()
  .superRefine((t, ctx) => {
    if (new Set(t.cues.map((c) => c.id)).size !== t.cues.length)
      ctx.addIssue({ code: "custom", message: "Cue trùng ID." });
    t.cues.forEach((c, i) => {
      if (c.end <= c.start || (i > 0 && c.start < t.cues[i - 1].end))
        ctx.addIssue({
          code: "custom",
          message: "Timestamp phải tăng, không chồng lấn và có độ dài dương.",
        });
    });
  });
export type Transcript = z.infer<typeof transcriptSchema>;
export const listeningContentSchema = z
  .object({
    schemaVersion: z.literal(1),
    audio: audioSchema,
    transcript: transcriptSchema,
    set: readingSetSchema,
  })
  .strict()
  .superRefine((c, ctx) => {
    const fail = (message: string) => ctx.addIssue({ code: "custom", message });
    if (c.transcript.cues.some((cue) => cue.end > c.audio.duration))
      fail("Timestamp vượt quá độ dài audio.");
    if (
      c.set.questions.length > 30 ||
      c.set.questions.some((q) => q.type !== "completion")
    )
      fail("Slice này hỗ trợ tối đa 30 câu điền từ.");
    for (const q of c.set.questions) {
      const solution = c.set.solutions[q.id];
      const text =
        c.set.paragraphs.find((p) => p.id === solution?.evidence.blockId)
          ?.text ?? "";
      if (
        !q.prompt.includes("___") ||
        !solution ||
        solution.answers.length !== 1 ||
        solution.answers[0].toLowerCase() !==
          solution.evidence.quote.toLowerCase()
      )
        fail("Câu điền từ cần một đáp án nguyên văn và chỗ trống ___.");
      if (
        solution &&
        (/[\p{L}\p{N}]/u.test(text[solution.evidence.start - 1] ?? "") ||
          /[\p{L}\p{N}]/u.test(text[solution.evidence.end] ?? ""))
      )
        fail("Dẫn chứng phải chứa trọn từ, không cắt giữa từ.");
    }
    if (
      c.set.paragraphs.length !== c.transcript.cues.length ||
      c.transcript.cues.some(
        (cue, i) =>
          c.set.paragraphs[i]?.id !== cue.id ||
          c.set.paragraphs[i]?.text !== cue.text,
      )
    )
      fail("Transcript và dẫn chứng không khớp.");
  });
export type ListeningContent = z.infer<typeof listeningContentSchema>;
export const listeningAttemptSchema = z
  .object({
    id: z.uuid(),
    revision: z.number().int().nonnegative(),
    status: z.enum(["in_progress", "submitted"]),
    createdAt: z.iso.datetime(),
    submittedAt: z.iso.datetime().nullable(),
    answers: answerMapSchema,
  })
  .strict()
  .superRefine((a, ctx) => {
    if ((a.status === "submitted") !== !!a.submittedAt)
      ctx.addIssue({ code: "custom", message: "Invalid submission state" });
  });
export type ListeningAttempt = z.infer<typeof listeningAttemptSchema>;
export const listeningLessonSchema = z
  .object({
    id: z.uuid(),
    createdAt: z.iso.datetime(),
    expiresAt: z.iso.datetime(),
    retentionDays: z.union([z.literal(1), z.literal(7), z.literal(30)]),
    consent: z.literal("local-only-owned-audio"),
    content: listeningContentSchema,
    attempts: z.array(listeningAttemptSchema).max(200),
  })
  .strict()
  .superRefine((l, ctx) => {
    if (
      new Set(l.attempts.map((a) => a.id)).size !== l.attempts.length ||
      l.attempts.some((a) =>
        Object.keys(a.answers).some(
          (id) => !l.content.set.questions.some((q) => q.id === id),
        ),
      )
    )
      ctx.addIssue({ code: "custom", message: "Invalid attempt reference" });
    if (Date.parse(l.expiresAt) <= Date.parse(l.createdAt))
      ctx.addIssue({ code: "custom", message: "Invalid retention" });
  });
export type ListeningLesson = z.infer<typeof listeningLessonSchema>;
export const questionDraftSchema = z
  .object({
    cueId: z.string(),
    prompt: z
      .string()
      .trim()
      .min(5)
      .max(500)
      .refine(
        (t) => t.includes("___"),
        "Câu hỏi cần chỗ trống ___ để điền từ.",
      ),
    answer: z.string().trim().min(1).max(100),
    maxWords: z.number().int().min(1).max(3),
  })
  .strict();
export const listeningDraftSchema = z
  .object({
    title: z.string().trim().min(1).max(150),
    author: z.string().trim().min(1).max(100),
    rightsConfirmed: z.literal(true),
    reviewer: z.string().trim().min(1).max(100),
    reviewConfirmed: z.literal(true),
    questions: z.array(questionDraftSchema).min(1).max(30),
  })
  .strict();
