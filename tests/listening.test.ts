import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import sample from "../packages/content/listening-sample.json";
import { sampleListening } from "../packages/content/listening";
import {
  FixtureTranscriber,
  ManualTranscriptAdapter,
} from "../packages/ai/listening";
import {
  buildListening,
  changeListeningAttempt,
  listeningResult,
  parseVtt,
} from "../packages/domain/listening";
import {
  audioSchema,
  listeningContentSchema,
  type ListeningAttempt,
} from "../packages/schemas/listening";
import { expired } from "../packages/demo/listening-store";

const audio = {
  name: "garden-tour.wav",
  type: "audio/wav" as const,
  size: 653164,
  duration: sample.duration,
  sha256: sample.sha256,
};
const vtt = "WEBVTT\n\ncue-1\n00:00.500 --> 00:05.000\nThe tour is on Tuesday.";
const draft = {
  title: "Private tour",
  author: "Original Author",
  reviewer: "Reviewer",
  rightsConfirmed: true,
  reviewConfirmed: true,
  questions: [
    {
      cueId: "cue-1",
      prompt: "The tour is on ___.",
      answer: "Tuesday",
      maxWords: 1,
    },
  ],
};
function attempt(): ListeningAttempt {
  return {
    id: crypto.randomUUID(),
    revision: 0,
    status: "in_progress",
    createdAt: "2026-01-01T00:00:00.000Z",
    submittedAt: null,
    answers: {},
  };
}

describe("Listening contract and transitions", () => {
  it("ties the fixture to the exact original audio bytes and validates sample evidence", async () => {
    const bytes = readFileSync("apps/web/public/audio/garden-tour.wav");
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(
      sample.sha256,
    );
    expect(bytes.length).toBe(audio.size);
    const content = await sampleListening(audio);
    expect(content.set.publication).toBe("preview");
    expect(content.set.provenance.humanReviewer).toBeNull();
    expect(content.transcript.cues.at(-1)!.end).toBeLessThanOrEqual(
      audio.duration,
    );
    await expect(
      sampleListening({ ...audio, sha256: "0".repeat(64) }),
    ).rejects.toThrow("đúng audio");
  });
  it("manual VTT preserves exact plain evidence and does not become STT", async () => {
    const transcript = await new ManualTranscriptAdapter().transcribe(
      { ...audio, vtt },
      new AbortController().signal,
    );
    expect(transcript.mode).toBe("manual");
    const c = buildListening(audio, transcript, draft);
    expect(c.set.provenance.humanReviewer).toBe("Reviewer");
    expect(c.set.solutions.q1.evidence).toMatchObject({
      blockId: "cue-1",
      quote: "Tuesday",
      start: 15,
      end: 22,
    });
    expect(parseVtt(vtt.replaceAll("\n", "\r\n"), 5).cues[0].end).toBe(5);
  });
  it.each([
    ["outside audio", vtt, 4],
    ["zero range", vtt.replace("00:05.000", "00:00.500"), 10],
    ["HTML", vtt.replace("Tuesday", "<b>Tuesday</b>"), 10],
    ["bad minute", vtt.replace("00:05.000", "60:05.000"), 100],
    ["settings", vtt.replace("00:05.000", "00:05.000 align:start"), 10],
    ["overlap", vtt + "\n\ncue-2\n00:04.000 --> 00:06.000\nSecond cue.", 10],
    [
      "duplicate id",
      vtt + "\n\ncue-1\n00:05.000 --> 00:06.000\nSecond cue.",
      10,
    ],
  ])("rejects invalid transcript: %s", (_label, text, duration) => {
    expect(() => parseVtt(text as string, duration as number)).toThrow();
  });
  it("requires ownership, human review, complete words and valid evidence", () => {
    const transcript = parseVtt(vtt, 10);
    expect(() =>
      buildListening(audio, transcript, { ...draft, rightsConfirmed: false }),
    ).toThrow();
    expect(() =>
      buildListening(audio, transcript, { ...draft, reviewConfirmed: false }),
    ).toThrow();
    expect(() =>
      buildListening(audio, transcript, { ...draft, reviewer: "" }),
    ).toThrow();
    expect(() =>
      buildListening(audio, transcript, {
        ...draft,
        questions: [{ ...draft.questions[0], answer: "day" }],
      }),
    ).toThrow("trọn từ");
    const c = buildListening(audio, transcript, draft);
    expect(() =>
      listeningContentSchema.parse({
        ...c,
        transcript: {
          ...transcript,
          cues: [{ ...transcript.cues[0], text: "Modified" }],
        },
      }),
    ).toThrow();
  });
  it("rejects unsupported audio, oversized files and excessive durations", () => {
    expect(() =>
      audioSchema.parse({ ...audio, size: 21 * 1024 * 1024 }),
    ).toThrow();
    expect(() => audioSchema.parse({ ...audio, type: "text/plain" })).toThrow();
    expect(() => audioSchema.parse({ ...audio, duration: 1801 })).toThrow();
    expect(() => audioSchema.parse({ ...audio, duration: Infinity })).toThrow();
  });
  it("stale revisions cannot overwrite; submitting is immutable and idempotent", () => {
    const c = buildListening(audio, parseVtt(vtt, 10), draft);
    const initial = attempt();
    expect(() => listeningResult(c, initial)).toThrow("Nộp bài");
    const saved = changeListeningAttempt(
      c,
      initial,
      0,
      { q1: "Tuesday" },
      false,
    );
    expect(() =>
      changeListeningAttempt(c, saved, 0, { q1: "Monday" }, false),
    ).toThrow("tab khác");
    expect(() =>
      changeListeningAttempt(c, saved, 1, { unknown: "x" }, false),
    ).toThrow("không thuộc");
    const submitted = changeListeningAttempt(
      c,
      saved,
      1,
      { q1: "  TUESDAY  " },
      true,
    );
    expect(listeningResult(c, submitted).score).toBe(1);
    expect(
      changeListeningAttempt(c, submitted, 0, { q1: "Monday" }, true),
    ).toBe(submitted);
    expect(() =>
      changeListeningAttempt(
        c,
        submitted,
        submitted.revision,
        { q1: "Monday" },
        false,
      ),
    ).toThrow("không thể sửa");
    expect(
      listeningResult(
        c,
        changeListeningAttempt(c, initial, 0, { q1: "next Tuesday" }, true),
      ).score,
    ).toBe(0);
    expect(
      listeningResult(c, changeListeningAttempt(c, initial, 0, {}, true)).score,
    ).toBe(0);
  });
  it("adapters honor cancellation and fixture rejects arbitrary uploads", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      new ManualTranscriptAdapter().transcribe(
        { ...audio, vtt },
        controller.signal,
      ),
    ).rejects.toThrow();
    await expect(
      new ManualTranscriptAdapter().transcribe(
        audio,
        new AbortController().signal,
      ),
    ).rejects.toThrow("WebVTT");
    const fixture = new FixtureTranscriber(sample.sha256, {
      schemaVersion: 1,
      mode: "fixture",
      cues: sample.cues,
    });
    await expect(
      fixture.transcribe(
        { ...audio, duration: 1 },
        new AbortController().signal,
      ),
    ).rejects.toThrow("vượt quá");
  });
  it("expiration is inclusive at the boundary", () => {
    const date = "2026-01-01T00:00:00.000Z";
    expect(expired(date, Date.parse(date) - 1)).toBe(false);
    expect(expired(date, Date.parse(date))).toBe(true);
  });
});
