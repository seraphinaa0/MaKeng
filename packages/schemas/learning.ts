import { z } from "zod";

export const periodSchema = z.enum(["7", "30", "all"]);
export type Period = z.infer<typeof periodSchema>;
export const learningStateSchema = z
  .object({
    revision: z.number().int().nonnegative(),
    recommendationsEnabled: z.boolean(),
    dismissed: z.array(z.string().max(300)).max(500),
    reviews: z.record(
      z.string().max(200),
      z
        .object({
          reviewed: z.boolean(),
          tries: z.number().int().nonnegative(),
          updatedAt: z.iso.datetime(),
        })
        .strict(),
    ),
  })
  .strict();
export type LearningState = z.infer<typeof learningStateSchema>;
export const newLearningState = (): LearningState => ({
  revision: 0,
  recommendationsEnabled: true,
  dismissed: [],
  reviews: {},
});
const revision = z.number().int().nonnegative();
export const learningActionSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("preferences"),
      revision,
      enabled: z.boolean(),
    })
    .strict(),
  z
    .object({
      action: z.literal("dismiss"),
      revision,
      id: z.string().min(1).max(300),
    })
    .strict(),
  z.object({ action: z.literal("restore"), revision }).strict(),
  z
    .object({
      action: z.literal("answer"),
      revision,
      key: z.string().min(1).max(200),
      answer: z.string().trim().min(1).max(200),
    })
    .strict(),
  z
    .object({
      action: z.literal("reopen"),
      revision,
      key: z.string().min(1).max(200),
    })
    .strict(),
]);
export type LearningAction = z.infer<typeof learningActionSchema>;
