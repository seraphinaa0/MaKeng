import { z } from "zod";
import {
  audioSchema,
  listeningLessonSchema,
  type ListeningLesson,
  type ListeningContent,
} from "../schemas/listening";

export const BACKUP_LIMIT = 10 * 1024 * 1024;
const backupSchema = z
  .object({
    kind: z.literal("makeng-listening-backup"),
    schemaVersion: z.literal(1),
    exportedAt: z.iso.datetime(),
    lesson: listeningLessonSchema,
  })
  .strict();
const restoreOptionsSchema = z
  .object({
    consent: z.literal(true),
    retentionDays: z.union([z.literal(1), z.literal(7), z.literal(30)]),
  })
  .strict();
function validateHistory(lesson: ListeningLesson) {
  const { set } = lesson.content;
  if (
    set.publication === "archived" ||
    (set.publication === "preview" &&
      set.provenance.source !== "original-synthetic")
  )
    throw new Error(
      "Chỉ khôi phục bài đã tự kiểm duyệt hoặc bài mẫu gốc preview.",
    );
  if (lesson.attempts.filter((a) => a.status === "in_progress").length > 1)
    throw new Error("Bản sao lưu có nhiều lượt đang làm cho cùng bài.");
  if (
    lesson.attempts.some(
      (a) =>
        a.submittedAt && Date.parse(a.submittedAt) < Date.parse(a.createdAt),
    )
  )
    throw new Error("Ngày nộp bài phải sau ngày bắt đầu.");
  return lesson;
}
export function parseListeningBackup(text: string): ListeningLesson {
  if (new TextEncoder().encode(text).byteLength > BACKUP_LIMIT)
    throw new Error("JSON sao lưu tối đa 10 MiB.");
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error(
      "Không đọc được JSON sao lưu. Chọn file JSON đã xuất từ Listening.",
    );
  }
  try {
    const lesson =
      value !== null && typeof value === "object" && "kind" in value
        ? backupSchema.parse(value).lesson
        : listeningLessonSchema.parse(value);
    return validateHistory(lesson);
  } catch (error) {
    if (error instanceof z.ZodError)
      throw new Error(
        "Bản sao lưu không hợp lệ: " +
          error.issues.map((i) => i.message).join("; "),
      );
    throw error;
  }
}
export function exportListeningBackup(
  lesson: ListeningLesson,
  now = new Date(),
): string {
  const metadata = {
    id: lesson.id,
    createdAt: lesson.createdAt,
    expiresAt: lesson.expiresAt,
    retentionDays: lesson.retentionDays,
    consent: lesson.consent,
    content: lesson.content,
    attempts: lesson.attempts,
  };
  const json = JSON.stringify(
    backupSchema.parse({
      kind: "makeng-listening-backup",
      schemaVersion: 1,
      exportedAt: now.toISOString(),
      lesson: metadata,
    }),
    null,
    2,
  );
  if (new TextEncoder().encode(json).byteLength > BACKUP_LIMIT)
    throw new Error("JSON vượt giới hạn 10 MiB; chưa xuất bản sao lưu.");
  return json;
}
export function prepareListeningRestore(
  lesson: ListeningLesson,
  measured: ListeningContent["audio"],
  options: unknown,
  now = new Date(),
): ListeningLesson {
  const original = validateHistory(listeningLessonSchema.parse(lesson));
  const audio = audioSchema.parse(measured);
  const settings = restoreOptionsSchema.parse(options);
  if (
    audio.sha256 !== original.content.audio.sha256 ||
    audio.size !== original.content.audio.size
  )
    throw new Error(
      "Audio không khớp bản sao lưu. Chọn đúng file audio đã xuất cùng JSON.",
    );
  if (
    audio.type !== original.content.audio.type ||
    Math.abs(audio.duration - original.content.audio.duration) > 0.25 ||
    original.content.transcript.cues.some((c) => c.end > audio.duration)
  )
    throw new Error(
      "Định dạng hoặc thời gian audio không khớp transcript sao lưu.",
    );
  return listeningLessonSchema.parse({
    ...original,
    id: crypto.randomUUID(),
    createdAt: now.toISOString(),
    expiresAt: new Date(
      now.getTime() + settings.retentionDays * 86400000,
    ).toISOString(),
    retentionDays: settings.retentionDays,
    attempts: original.attempts.map((a) => ({ ...a, id: crypto.randomUUID() })),
  });
}
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
export function listeningSnapshotKey(lesson: ListeningLesson): string {
  return JSON.stringify(
    canonical({
      content: lesson.content,
      attempts: lesson.attempts.map((a) => ({
        revision: a.revision,
        status: a.status,
        createdAt: a.createdAt,
        submittedAt: a.submittedAt,
        answers: a.answers,
      })),
    }),
  );
}
