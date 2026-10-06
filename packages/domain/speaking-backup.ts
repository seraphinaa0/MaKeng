import { z } from "zod";
import {
  speakingSessionSchema,
  SPEAKING_AUDIO_LIMIT,
  type SpeakingSession,
} from "../schemas/speaking";

export const SPEAKING_BACKUP_LIMIT = 140 * 1024 * 1024;
const audioSchema = z
  .object({
    type: z.string(),
    size: z.number().int().positive().max(SPEAKING_AUDIO_LIMIT),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    base64: z
      .string()
      .max(Math.ceil(SPEAKING_AUDIO_LIMIT / 3) * 4)
      .regex(/^[A-Za-z0-9+/]*={0,2}$/),
  })
  .strict();
const backupSchema = z
  .object({
    kind: z.literal("makeng-speaking-backup"),
    schemaVersion: z.literal(1),
    exportedAt: z.iso.datetime(),
    session: speakingSessionSchema,
    audio: z.record(z.string(), audioSchema),
  })
  .strict()
  .superRefine((backup, ctx) => {
    const recordings = Object.entries(backup.session.responses).filter(
      ([, r]) => r.recording !== null,
    );
    if (
      recordings.length !== Object.keys(backup.audio).length ||
      recordings.some(
        ([id, r]) =>
          !backup.audio[id] ||
          backup.audio[id].size !== r.recording?.size ||
          backup.audio[id].type !== r.recording?.type,
      ) ||
      Object.values(backup.audio).reduce((n, a) => n + a.size, 0) >
        100 * 1024 * 1024
    )
      ctx.addIssue({
        code: "custom",
        message: "Audio không khớp các câu trả lời Speaking.",
      });
  });
export type SpeakingBackup = z.infer<typeof backupSchema>;
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value !== null && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, canonical(item)]),
    );
  return value;
}
export async function hashBytes(
  bytes: Uint8Array<ArrayBuffer>,
): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), (n) =>
    n.toString(16).padStart(2, "0"),
  ).join("");
}
export function parseSpeakingBackup(text: string): SpeakingBackup {
  if (new TextEncoder().encode(text).byteLength > SPEAKING_BACKUP_LIMIT)
    throw new Error("Bản sao lưu Speaking tối đa 140 MiB.");
  return backupSchema.parse(JSON.parse(text));
}
export async function exportSpeakingBackup(
  session: SpeakingSession,
  blobs: Record<string, Blob>,
): Promise<string> {
  const metadata = speakingSessionSchema.strip().parse(session);
  const audio: SpeakingBackup["audio"] = {};
  for (const [id, blob] of Object.entries(blobs)) {
    if (
      !metadata.responses[id]?.recording ||
      blob.size !== metadata.responses[id].recording?.size ||
      blob.type !== metadata.responses[id].recording?.type
    )
      throw new Error("Audio Speaking không khớp dữ liệu đã lưu.");
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = "";
    for (let start = 0; start < bytes.length; start += 32768)
      binary += String.fromCharCode(...bytes.subarray(start, start + 32768));
    audio[id] = {
      type: blob.type,
      size: blob.size,
      sha256: await hashBytes(bytes),
      base64: btoa(binary),
    };
  }
  const text = JSON.stringify(
    backupSchema.parse({
      kind: "makeng-speaking-backup",
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      session: metadata,
      audio,
    }),
  );
  if (new TextEncoder().encode(text).byteLength > SPEAKING_BACKUP_LIMIT)
    throw new Error("Bản sao lưu Speaking vượt 140 MiB.");
  return text;
}
export async function prepareSpeakingRestore(
  text: string,
  days: 1 | 7 | 30,
  consent: boolean,
  now = new Date(),
) {
  if (!consent || ![1, 7, 30].includes(days))
    throw new Error("Chọn hạn lưu và đồng ý khôi phục Speaking.");
  const backup = parseSpeakingBackup(text);
  if (Date.parse(backup.session.createdAt) > now.getTime())
    throw new Error("Ngày luyện trong bản sao lưu nằm trong tương lai.");
  const blobs: Record<string, Blob> = {};
  for (const [id, audio] of Object.entries(backup.audio)) {
    if (audio.base64.length !== Math.ceil(audio.size / 3) * 4)
      throw new Error("Kích thước audio Speaking không khớp.");
    const binary = atob(audio.base64);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    if (
      bytes.length !== audio.size ||
      (await hashBytes(bytes)) !== audio.sha256
    )
      throw new Error("Checksum audio Speaking không khớp; chưa khôi phục.");
    blobs[id] = new Blob([bytes], { type: audio.type });
  }
  const session = speakingSessionSchema.parse({
    ...backup.session,
    id: crypto.randomUUID(),
    revision: 0,
    retentionDays: days,
    expiresAt: new Date(now.getTime() + days * 86400000).toISOString(),
  });
  const fingerprint = JSON.stringify(
    canonical({
      session: backup.session,
      hashes: Object.entries(backup.audio)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([id, audio]) => [id, audio.sha256]),
    }),
  );
  const backupKey = await hashBytes(new TextEncoder().encode(fingerprint));
  return { ...session, blobs, backupKey };
}
