import {
  speakingSessionSchema,
  responseSchema,
  type SpeakingSession,
  type SpeakingResponse,
} from "../schemas/speaking";
import { speakingPreview } from "../content/speaking";

export function blankResponse(): SpeakingResponse {
  return {
    transcript: "",
    notes: "",
    recording: null,
    review: {
      fluency: false,
      vocabulary: false,
      grammar: false,
      intelligibility: false,
    },
  };
}
export function newSpeaking(
  id: string,
  now: string,
  days: 1 | 7 | 30,
  consent: boolean,
): SpeakingSession {
  if (!consent) throw new Error("Cần đồng ý lưu dữ liệu trên thiết bị trước.");
  return speakingSessionSchema.parse({
    schemaVersion: 1,
    id,
    revision: 0,
    createdAt: now,
    expiresAt: new Date(Date.parse(now) + days * 86400000).toISOString(),
    retentionDays: days,
    consent: "local-only-speaking",
    status: "in_progress",
    completedAt: null,
    set: speakingPreview,
    responses: {},
  });
}
export function changeSpeaking(
  session: SpeakingSession,
  revision: number,
  questionId: string,
  response: SpeakingResponse,
  complete: boolean,
  now: string,
): SpeakingSession {
  if (Date.parse(session.expiresAt) <= Date.parse(now))
    throw new Error("Phiên đã hết hạn.");
  if (session.revision !== revision)
    throw new Error("Phiên đã thay đổi ở tab khác. Tải lại trước khi lưu.");
  if (session.status === "completed")
    throw new Error("Phiên đã hoàn tất; hãy tạo lượt luyện mới.");
  if (!session.set.questions.some((q) => q.id === questionId))
    throw new Error("Câu hỏi không thuộc phiên.");
  return speakingSessionSchema.parse({
    ...session,
    revision: revision + 1,
    responses: {
      ...session.responses,
      [questionId]: responseSchema.parse(response),
    },
    status: complete ? "completed" : "in_progress",
    completedAt: complete ? now : null,
  });
}
export function removeSpeakingAudio(
  session: SpeakingSession,
  revision: number,
  questionId: string,
): SpeakingSession {
  if (session.revision !== revision)
    throw new Error("Phiên đã thay đổi ở tab khác. Tải lại trước khi xóa.");
  const response = session.responses[questionId];
  if (!response) throw new Error("Không có bản ghi của câu này.");
  return speakingSessionSchema.parse({
    ...session,
    revision: revision + 1,
    responses: {
      ...session.responses,
      [questionId]: { ...response, recording: null },
    },
  });
}
