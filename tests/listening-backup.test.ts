import { describe, expect, it } from "vitest";
import { sampleListening } from "../packages/content/listening";
import sample from "../packages/content/listening-sample.json";
import {
  exportListeningBackup,
  parseListeningBackup,
  prepareListeningRestore,
  listeningSnapshotKey,
  BACKUP_LIMIT,
} from "../packages/domain/listening-backup";
import {
  listeningLessonSchema,
  type ListeningLesson,
} from "../packages/schemas/listening";
import { listeningResult } from "../packages/domain/listening";

const audio = {
  name: "garden-tour.wav",
  type: "audio/wav" as const,
  size: 653164,
  duration: sample.duration,
  sha256: sample.sha256,
};
async function lesson(): Promise<ListeningLesson> {
  return listeningLessonSchema.parse({
    id: crypto.randomUUID(),
    createdAt: "2026-01-01T00:00:00.000Z",
    expiresAt: "2026-01-08T00:00:00.000Z",
    retentionDays: 7,
    consent: "local-only-owned-audio",
    content: await sampleListening(audio),
    attempts: [
      {
        id: crypto.randomUUID(),
        revision: 2,
        status: "submitted",
        createdAt: "2026-01-02T00:00:00.000Z",
        submittedAt: "2026-01-02T00:05:00.000Z",
        answers: { q1: "Tuesday", q2: "library", q3: "notebook" },
      },
      {
        id: crypto.randomUUID(),
        revision: 1,
        status: "in_progress",
        createdAt: "2026-01-03T00:00:00.000Z",
        submittedAt: null,
        answers: { q1: "Monday" },
      },
    ],
  });
}
describe("Listening backup boundaries", () => {
  it("exports versioned metadata without audio and accepts old bare lesson JSON", async () => {
    const original = await lesson();
    const stored = { ...original, blob: new Blob(["must not export"]) };
    const json = exportListeningBackup(
      stored,
      new Date("2026-01-04T00:00:00.000Z"),
    );
    expect(JSON.parse(json)).toMatchObject({
      kind: "makeng-listening-backup",
      schemaVersion: 1,
      exportedAt: "2026-01-04T00:00:00.000Z",
    });
    expect(json).not.toContain("blob");
    expect(parseListeningBackup(json)).toEqual(original);
    expect(parseListeningBackup(JSON.stringify(original))).toEqual(original);
  });
  it("restores expired backup as a separate copy, preserving scores and resumable answers", async () => {
    const original = await lesson();
    const restored = prepareListeningRestore(
      original,
      audio,
      { consent: true, retentionDays: 30 },
      new Date("2026-10-04T00:00:00.000Z"),
    );
    expect(restored.id).not.toBe(original.id);
    expect(restored.expiresAt).toBe("2026-11-03T00:00:00.000Z");
    expect(restored.content).toEqual(original.content);
    expect(restored.attempts.map((a) => a.id)).not.toEqual(
      original.attempts.map((a) => a.id),
    );
    expect(restored.attempts[1]).toMatchObject({
      status: "in_progress",
      revision: 1,
      answers: { q1: "Monday" },
      createdAt: original.attempts[1].createdAt,
    });
    expect(listeningResult(restored.content, restored.attempts[0]).score).toBe(
      3,
    );
    expect(original.expiresAt).toBe("2026-01-08T00:00:00.000Z");
  });
  it("rejects missing consent, wrong audio identity and inconsistent decoded timestamps", async () => {
    const original = await lesson();
    expect(() =>
      prepareListeningRestore(original, audio, {
        consent: false,
        retentionDays: 7,
      }),
    ).toThrow();
    expect(() =>
      prepareListeningRestore(original, audio, {
        consent: true,
        retentionDays: 365,
      }),
    ).toThrow();
    expect(() =>
      prepareListeningRestore(
        original,
        { ...audio, sha256: "0".repeat(64) },
        { consent: true, retentionDays: 7 },
      ),
    ).toThrow("không khớp");
    expect(() =>
      prepareListeningRestore(
        original,
        { ...audio, size: audio.size - 1 },
        { consent: true, retentionDays: 7 },
      ),
    ).toThrow("không khớp");
    expect(() =>
      prepareListeningRestore(
        original,
        { ...audio, duration: audio.duration - 0.1 },
        { consent: true, retentionDays: 7 },
      ),
    ).toThrow("transcript");
    expect(() =>
      prepareListeningRestore(
        original,
        { ...audio, duration: audio.duration + 1 },
        { consent: true, retentionDays: 7 },
      ),
    ).toThrow("transcript");
  });
  it("rejects unknown versions/fields, malformed JSON and oversized backups", async () => {
    const original = await lesson();
    const envelope: Record<string, unknown> = JSON.parse(
      exportListeningBackup(original),
    );
    expect(() => parseListeningBackup("{broken")).toThrow(
      "Không đọc được JSON",
    );
    expect(() =>
      parseListeningBackup(JSON.stringify({ ...envelope, schemaVersion: 2 })),
    ).toThrow("không hợp lệ");
    expect(() =>
      parseListeningBackup(JSON.stringify({ ...envelope, extra: "untrusted" })),
    ).toThrow("không hợp lệ");
    expect(() => parseListeningBackup(" ".repeat(BACKUP_LIMIT + 1))).toThrow(
      "10 MiB",
    );
  });
  it("does not admit archived/unreviewed or inconsistent attempt history", async () => {
    const original = await lesson();
    const stringify = (item: unknown) => JSON.stringify(item);
    expect(() =>
      parseListeningBackup(
        stringify({
          ...original,
          content: {
            ...original.content,
            set: { ...original.content.set, publication: "archived" },
          },
        }),
      ),
    ).toThrow("kiểm duyệt");
    expect(() =>
      parseListeningBackup(
        stringify({
          ...original,
          attempts: [
            { ...original.attempts[0], answers: { notInLesson: "test" } },
          ],
        }),
      ),
    ).toThrow("không hợp lệ");
    expect(() =>
      parseListeningBackup(
        stringify({
          ...original,
          attempts: [
            {
              ...original.attempts[0],
              submittedAt: "2025-01-01T00:00:00.000Z",
            },
          ],
        }),
      ),
    ).toThrow("Ngày nộp");
    expect(() =>
      parseListeningBackup(
        stringify({
          ...original,
          attempts: [
            original.attempts[1],
            { ...original.attempts[1], id: crypto.randomUUID() },
          ],
        }),
      ),
    ).toThrow("nhiều lượt");
    expect(() =>
      parseListeningBackup(
        stringify({
          ...original,
          content: {
            ...original.content,
            set: {
              ...original.content.set,
              provenance: {
                author: "Test",
                source: "user-authored",
                rights: "user-owned-content",
                humanReviewer: null,
              },
            },
          },
        }),
      ),
    ).toThrow("kiểm duyệt");
  });
  it("duplicate detection ignores volatile IDs/retention/key order but distinguishes changes", async () => {
    const original = await lesson();
    const restored = prepareListeningRestore(original, audio, {
      consent: true,
      retentionDays: 1,
    });
    expect(listeningSnapshotKey(restored)).toBe(listeningSnapshotKey(original));
    const reordered = {
      ...restored,
      attempts: restored.attempts.map((a) => ({
        ...a,
        answers: Object.fromEntries(Object.entries(a.answers).reverse()),
      })),
    };
    expect(listeningSnapshotKey(reordered)).toBe(
      listeningSnapshotKey(original),
    );
    expect(listeningSnapshotKey({ ...restored, attempts: [] })).not.toBe(
      listeningSnapshotKey(original),
    );
  });
});
