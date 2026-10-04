import { describe, expect, it } from "vitest";
import {
  blankResponse,
  changeSpeaking,
  newSpeaking,
  removeSpeakingAudio,
} from "../packages/domain/speaking";
import {
  recordingSchema,
  speakingSessionSchema,
} from "../packages/schemas/speaking";

const id = "5e8db079-fef0-4a43-8ee6-90b7f6016984";
const now = "2026-10-04T12:00:00.000Z";
const session = () => newSpeaking(id, now, 7, true);
const answer = () => ({
  ...blankResponse(),
  transcript: "I learned to repair a bicycle with a friend.",
  notes: "Use a more precise verb next time.",
});

describe("Speaking privacy and session transitions", () => {
  it("requires explicit consent and snapshots original Part 1/2/3 questions", () => {
    expect(() => newSpeaking(id, now, 7, false)).toThrow(/đồng ý/);
    const value = session();
    expect(value.set.questions.map((q) => q.part)).toEqual([1, 1, 2, 3, 3]);
    expect(value.set.provenance).toBe("original-project-preview");
    expect(value.expiresAt).toBe("2026-10-11T12:00:00.000Z");
    expect(value.responses).toEqual({});
  });
  it("retains prior answers and refuses a competing stale write", () => {
    const first = changeSpeaking(
      session(),
      0,
      "p1-place",
      answer(),
      false,
      now,
    );
    const second = changeSpeaking(first, 1, "p2-skill", answer(), false, now);
    expect(second.responses["p1-place"].transcript).toContain("bicycle");
    expect(second.revision).toBe(2);
    expect(() =>
      changeSpeaking(second, 1, "p1-place", blankResponse(), false, now),
    ).toThrow(/tab khác/);
  });
  it("does not accept questions from another set or writes at expiry", () => {
    expect(() =>
      changeSpeaking(session(), 0, "foreign", answer(), false, now),
    ).toThrow(/không thuộc/);
    expect(() =>
      changeSpeaking(
        session(),
        0,
        "p1-place",
        answer(),
        false,
        session().expiresAt,
      ),
    ).toThrow(/hết hạn/);
  });
  it("freezes completed transcript/review but allows audio removal without changing evidence", () => {
    const response = {
      ...answer(),
      recording: {
        type: "audio/webm;codecs=opus",
        size: 1000,
        durationSeconds: 12,
      },
    };
    const completed = changeSpeaking(
      session(),
      0,
      "p1-place",
      response,
      true,
      now,
    );
    expect(() =>
      changeSpeaking(completed, 1, "p1-place", blankResponse(), false, now),
    ).toThrow(/hoàn tất/);
    const deleted = removeSpeakingAudio(completed, 1, "p1-place");
    expect(deleted.responses["p1-place"].recording).toBeNull();
    expect(deleted.responses["p1-place"].transcript).toBe(response.transcript);
    expect(deleted.completedAt).toBe(now);
    expect(() => removeSpeakingAudio(deleted, 1, "p1-place")).toThrow(
      /tab khác/,
    );
  });
  it("rejects excessive Part 2 recordings and bounded audio/transcript metadata", () => {
    expect(() =>
      changeSpeaking(
        session(),
        0,
        "p2-skill",
        {
          ...answer(),
          recording: { type: "audio/webm", size: 1000, durationSeconds: 121 },
        },
        false,
        now,
      ),
    ).toThrow();
    expect(
      recordingSchema.safeParse({
        type: "video/webm",
        size: 1000,
        durationSeconds: 2,
      }).success,
    ).toBe(false);
    expect(
      recordingSchema.safeParse({
        type: "audio/webm",
        size: 21 * 1024 * 1024,
        durationSeconds: 2,
      }).success,
    ).toBe(false);
    expect(() =>
      changeSpeaking(
        session(),
        0,
        "p1-place",
        { ...answer(), transcript: "x".repeat(12001) },
        false,
        now,
      ),
    ).toThrow();
  });
  it("does not accept invented scores, broken completion dates or unknown response keys", () => {
    const value = session();
    expect(speakingSessionSchema.safeParse({ ...value, band: 7 }).success).toBe(
      false,
    );
    expect(
      speakingSessionSchema.safeParse({
        ...value,
        status: "completed",
        completedAt: null,
      }).success,
    ).toBe(false);
    expect(
      speakingSessionSchema.safeParse({
        ...value,
        responses: { foreign: answer() },
      }).success,
    ).toBe(false);
  });
});
