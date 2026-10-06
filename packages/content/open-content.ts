import { z } from "zod";
import raw from "./open-starter.json";

const httpsUrl = z.url().refine((value) => value.startsWith("https://"));
const itemSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    skill: z.enum(["reading", "listening"]),
    title: z.string().min(1),
    provider: z.string().min(1),
    author: z.string().min(1),
    sourceUrl: httpsUrl,
    historyUrl: httpsUrl.optional(),
    license: z.enum(["VOA-public-domain", "CC-BY-SA-4.0", "public-domain-US"]),
    licenseUrl: httpsUrl,
    attribution: z.string().min(1),
    changes: z.string().min(1),
    conditions: z.string().min(1),
    text: z.string().min(30),
    audio: z
      .object({
        path: z.string().regex(/^\/audio\/[a-z0-9-]+\.mp3$/),
        sourceUrl: httpsUrl,
        mime: z.literal("audio/mpeg"),
        bytes: z.number().int().positive().max(1_000_000),
        sha256: z.string().regex(/^[a-f0-9]{64}$/),
      })
      .strict()
      .optional(),
  })
  .strict()
  .superRefine((item, ctx) => {
    if ((item.skill === "listening") !== Boolean(item.audio))
      ctx.addIssue({
        code: "custom",
        message: "Listening requires a local audio asset",
      });
    if (item.license === "CC-BY-SA-4.0" && !item.historyUrl)
      ctx.addIssue({
        code: "custom",
        message: "Wikipedia attribution requires history",
      });
  });

export const openContentPackSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z.literal("open-content-starter-v1"),
    checkedAt: z.iso.date(),
    status: z.literal("source-only"),
    notice: z.string().min(1),
    items: z.array(itemSchema).min(1),
    pending: z.array(
      z
        .object({
          provider: z.string().min(1),
          sourceUrl: httpsUrl,
          status: z.literal("not-imported"),
          reason: z.string().min(1),
        })
        .strict(),
    ),
  })
  .strict()
  .superRefine((pack, ctx) => {
    if (new Set(pack.items.map((item) => item.id)).size !== pack.items.length)
      ctx.addIssue({ code: "custom", message: "Duplicate source id" });
  });

export const openContentPack = openContentPackSchema.parse(raw);
