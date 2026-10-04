import { z } from "zod";
import { readingSetSchema } from "./reading";

export const sourceInput = z
  .object({
    title: z.string().trim().min(3).max(160),
    author: z.string().trim().min(2).max(100),
    text: z.string().trim().min(100).max(15000),
    rightsConfirmed: z.literal(true),
  })
  .strict();
export type SourceInput = z.infer<typeof sourceInput>;
export const draftSchema = z
  .object({
    id: z.uuid(),
    revision: z.number().int().nonnegative(),
    source: sourceInput,
    set: readingSetSchema,
    status: z.enum(["needs_review", "approved", "rejected", "published"]),
    generations: z.number().int().min(1).max(3),
    reviewer: z.string().nullable(),
    audit: z.array(
      z
        .object({
          action: z.enum([
            "generated",
            "saved",
            "regenerated",
            "approved",
            "rejected",
            "published",
            "revised",
          ]),
          at: z.iso.datetime(),
          note: z.string(),
        })
        .strict(),
    ),
  })
  .strict();
export type ReadingDraft = z.infer<typeof draftSchema>;
