import {
  listeningContentSchema,
  listeningAttemptSchema,
  listeningDraftSchema,
  transcriptSchema,
  type ListeningContent,
  type ListeningAttempt,
  type Transcript,
} from "../schemas/listening";
import { scoreReading, normalizeAnswer } from "./reading";

export function validateTranscript(
  value: unknown,
  duration: number,
): Transcript {
  const transcript = transcriptSchema.parse(value);
  if (transcript.cues.some((c) => c.end > duration))
    throw new Error("Timestamp vượt quá độ dài audio.");
  return transcript;
}
function timestamp(text: string): number {
  if (!/^(?:\d{2}:)?[0-5]\d:[0-5]\d\.\d{3}$/.test(text))
    throw new Error("Timestamp cần định dạng MM:SS.mmm hoặc HH:MM:SS.mmm.");
  const parts = text.split(":").map(Number);
  return parts.reduce((seconds, part) => seconds * 60 + part, 0);
}
export function parseVtt(text: string, duration: number): Transcript {
  if (text.length > 100_000)
    throw new Error("Transcript quá dài (tối đa 100.000 ký tự).");
  const blocks = text
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n")
    .trim()
    .split(/\n\s*\n/);
  if (blocks.shift() !== "WEBVTT")
    throw new Error("Transcript phải bắt đầu bằng WEBVTT và một dòng trống.");
  const cues = blocks.map((block, index) => {
    const lines = block.split("\n");
    const id = lines[0].includes(" --> ") ? `cue-${index + 1}` : lines.shift()!;
    const range = lines.shift()?.split(" --> ");
    if (!range || range.length !== 2)
      throw new Error("Cue cần timestamp bắt đầu --> kết thúc.");
    return {
      id,
      start: timestamp(range[0]),
      end: timestamp(range[1]),
      text: lines.join(" "),
    };
  });
  return validateTranscript(
    { schemaVersion: 1, mode: "manual", cues },
    duration,
  );
}
export function buildListening(
  audio: ListeningContent["audio"],
  transcript: Transcript,
  input: unknown,
): ListeningContent {
  const draft = listeningDraftSchema.parse(input);
  const questions = draft.questions.map((q, i) => ({
    id: `q${i + 1}`,
    type: "completion" as const,
    prompt: q.prompt,
    maxWords: q.maxWords,
  }));
  const solutions = Object.fromEntries(
    draft.questions.map((q, i) => {
      const cue = transcript.cues.find((c) => c.id === q.cueId);
      const start =
        cue?.text.toLowerCase().indexOf(q.answer.toLowerCase()) ?? -1;
      if (
        !cue ||
        start < 0 ||
        normalizeAnswer(q.answer).split(" ").length > q.maxWords
      )
        throw new Error(
          `Đáp án câu ${i + 1} phải có nguyên văn trong cue và đúng giới hạn từ.`,
        );
      return [
        `q${i + 1}`,
        {
          answers: [q.answer],
          explanation: `Đáp án xuất hiện trong đoạn audio ${cue.start.toFixed(1)}–${cue.end.toFixed(1)} giây.`,
          evidence: {
            blockId: cue.id,
            start,
            end: start + q.answer.length,
            quote: cue.text.slice(start, start + q.answer.length),
          },
        },
      ];
    }),
  );
  return listeningContentSchema.parse({
    schemaVersion: 1,
    audio,
    transcript,
    set: {
      id: `listening-${crypto.randomUUID()}`,
      version: 1,
      title: draft.title,
      minutes: Math.max(1, Math.ceil(audio.duration / 60)),
      publication: "published",
      provenance: {
        author: draft.author,
        source: "user-authored",
        rights: "user-owned-content",
        humanReviewer: draft.reviewer,
      },
      paragraphs: transcript.cues.map((c) => ({ id: c.id, text: c.text })),
      questions,
      solutions,
    },
  });
}
export function changeListeningAttempt(
  content: ListeningContent,
  attempt: ListeningAttempt,
  revision: number,
  answers: unknown,
  submit: boolean,
  now = new Date(),
): ListeningAttempt {
  if (attempt.status === "submitted") {
    if (submit) return attempt;
    throw new Error("Bài đã nộp không thể sửa.");
  }
  if (attempt.revision !== revision)
    throw new Error("Bài đã thay đổi ở tab khác. Tải lại trước khi tiếp tục.");
  const parsed = listeningAttemptAnswers(content, answers);
  return {
    ...attempt,
    answers: parsed,
    revision: revision + 1,
    status: submit ? "submitted" : "in_progress",
    submittedAt: submit ? now.toISOString() : null,
  };
}
function listeningAttemptAnswers(content: ListeningContent, input: unknown) {
  // Reuse the bounded answer schema through the attempt parser.
  const { answers } = listeningAttemptSchema.parse({
    id: "00000000-0000-4000-8000-000000000000",
    revision: 0,
    status: "in_progress",
    createdAt: "2026-01-01T00:00:00.000Z",
    submittedAt: null,
    answers: input,
  });
  if (
    Object.keys(answers).some(
      (id) => !content.set.questions.some((q) => q.id === id),
    )
  )
    throw new Error("Câu hỏi không thuộc bài này.");
  return answers;
}
export function listeningResult(
  content: ListeningContent,
  attempt: ListeningAttempt,
) {
  if (attempt.status !== "submitted") throw new Error("Nộp bài để xem đáp án.");
  return scoreReading(content.set, attempt.answers);
}
