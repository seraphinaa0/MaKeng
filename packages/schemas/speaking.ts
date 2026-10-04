import { z } from "zod";

export const SPEAKING_AUDIO_LIMIT = 20 * 1024 * 1024;
export const speakingQuestionSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    part: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    prompt: z.string().min(1).max(2000),
    bullets: z.array(z.string().min(1).max(300)).max(5),
    limitSeconds: z.union([z.literal(120), z.literal(180)]),
  })
  .strict();
export const speakingSetSchema = z
  .object({
    id: z.literal("everyday-learning"),
    version: z.literal(1),
    title: z.string().min(1).max(200),
    provenance: z.literal("original-project-preview"),
    questions: z.array(speakingQuestionSchema).length(5),
  })
  .strict()
  .superRefine((set, ctx) => {
    if (
      new Set(set.questions.map((q) => q.id)).size !== 5 ||
      set.questions.map((q) => q.part).join() !== "1,1,2,3,3" ||
      set.questions.some((q) => q.limitSeconds !== (q.part === 2 ? 120 : 180))
    )
      ctx.addIssue({
        code: "custom",
        message: "Cấu trúc Speaking không hợp lệ.",
      });
  });
export const recordingSchema = z
  .object({
    type: z
      .string()
      .regex(/^audio\/(webm|ogg|mp4)(;codecs=[a-zA-Z0-9., -]+)?$/),
    size: z.number().int().positive().max(SPEAKING_AUDIO_LIMIT),
    durationSeconds: z.number().min(0.5).max(180),
  })
  .strict();
export const responseSchema = z
  .object({
    transcript: z.string().max(12000),
    review: z
      .object({
        fluency: z.boolean(),
        vocabulary: z.boolean(),
        grammar: z.boolean(),
        intelligibility: z.boolean(),
      })
      .strict(),
    notes: z.string().max(2000),
    recording: recordingSchema.nullable(),
  })
  .strict();
export const speakingSessionSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z.uuid(),
    revision: z.number().int().nonnegative(),
    createdAt: z.iso.datetime(),
    expiresAt: z.iso.datetime(),
    retentionDays: z.union([z.literal(1), z.literal(7), z.literal(30)]),
    consent: z.literal("local-only-speaking"),
    status: z.enum(["in_progress", "completed"]),
    completedAt: z.iso.datetime().nullable(),
    set: speakingSetSchema,
    responses: z.record(z.string(), responseSchema),
  })
  .strict()
  .superRefine((session, ctx) => {
    if (
      Date.parse(session.expiresAt) <= Date.parse(session.createdAt) ||
      (session.status === "completed") !== (session.completedAt !== null) ||
      (session.completedAt &&
        Date.parse(session.completedAt) < Date.parse(session.createdAt)) ||
      Object.keys(session.responses).some(
        (id) => !session.set.questions.some((q) => q.id === id),
      ) ||
      session.set.questions.some(
        (q) =>
          (session.responses[q.id]?.recording?.durationSeconds ?? 0) >
          q.limitSeconds,
      )
    )
      ctx.addIssue({ code: "custom", message: "Phiên Speaking không hợp lệ." });
  });
export type SpeakingSession = z.infer<typeof speakingSessionSchema>;
export type SpeakingResponse = z.infer<typeof responseSchema>;
export type SpeakingQuestion = z.infer<typeof speakingQuestionSchema>;
