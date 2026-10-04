import { normalizeAnswer, scoreReading, typeLabels } from "./reading";
import { wordCount } from "./writing";
import type { Question, ReadingSet, Solution } from "../schemas/reading";
import type { LearningState, Period } from "../schemas/learning";

export interface LearningAttempt {
  id: string;
  content: ReadingSet;
  answers: Record<string, string>;
  status: "in_progress" | "submitted";
  createdAt: string;
  submittedAt: string | null;
}
export interface WritingActivity {
  id: string;
  essay: string;
  createdAt: string;
}
export const errorLabels = {
  blank: "Bỏ trống",
  word_limit: "Vượt giới hạn từ",
  mcq_mismatch: "Lựa chọn không khớp",
  tfng_mismatch: "TFNG không khớp",
  completion_mismatch: "Từ điền không khớp",
};
export type ErrorKind = keyof typeof errorLabels;
export function errorKind(question: Question, answer: string): ErrorKind {
  const text = normalizeAnswer(answer);
  if (!text) return "blank";
  if (
    question.type === "completion" &&
    text.split(" ").length > question.maxWords
  )
    return "word_limit";
  return question.type === "mcq"
    ? "mcq_mismatch"
    : question.type === "tfng"
      ? "tfng_mismatch"
      : "completion_mismatch";
}
export interface Mistake {
  key: string;
  attemptId: string;
  setId: string;
  version: number;
  title: string;
  at: string;
  question: Question;
  originalAnswer: string;
  kind: ErrorKind;
  solution: Solution;
  paragraphs: ReadingSet["paragraphs"];
  reviewed: boolean;
  tries: number;
}
export interface Recommendation {
  id: string;
  kind: "resume" | "review" | "practice";
  title: string;
  reason: string;
  attemptId?: string;
  setId?: string;
  type?: Question["type"];
  preview?: boolean;
}
const types = ["mcq", "tfng", "completion"] as const;
const stable = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
export function buildProgress(
  attempts: LearningAttempt[],
  writing: WritingActivity[],
  catalog: ReadingSet[],
  learning: LearningState,
  period: Period,
  now: number,
) {
  const since = period === "all" ? -Infinity : now - Number(period) * 86400000;
  const inRange = (at: string) => {
    const time = Date.parse(at);
    return time >= since && time <= now;
  };
  const submitted = attempts
    .filter(
      (a) =>
        a.status === "submitted" && a.submittedAt && inRange(a.submittedAt),
    )
    .sort(
      (a, b) => stable(b.submittedAt!, a.submittedAt!) || stable(a.id, b.id),
    )
    .map((a) => ({ ...a, score: scoreReading(a.content, a.answers) }));
  const mistakes: Mistake[] = submitted.flatMap((a) =>
    a.score.questions
      .filter((q) => !q.correct)
      .map((result) => {
        const question = a.content.questions.find(
          (q) => q.id === result.questionId,
        )!;
        const key = `${a.id}:${question.id}`;
        return {
          key,
          attemptId: a.id,
          setId: a.content.id,
          version: a.content.version,
          title: a.content.title,
          at: a.submittedAt!,
          question,
          originalAnswer: result.answer,
          kind: errorKind(question, result.answer),
          solution: result.solution,
          paragraphs: a.content.paragraphs,
          reviewed: learning.reviews[key]?.reviewed ?? false,
          tries: learning.reviews[key]?.tries ?? 0,
        };
      }),
  );
  const byType = types.map((type) => {
    const groups = submitted
      .map((a) => a.score.byType.find((g) => g.type === type))
      .filter((g) => g !== undefined);
    const sum = (rows: typeof groups) => ({
      correct: rows.reduce((n, g) => n + g.correct, 0),
      total: rows.reduce((n, g) => n + g.total, 0),
      attempts: rows.length,
    });
    const overall = sum(groups);
    const recent = sum(groups.slice(0, 3));
    const previous = sum(groups.slice(3, 6));
    return {
      type,
      ...overall,
      trend:
        groups.length >= 6
          ? {
              recent,
              previous,
              delta: Math.round(
                100 *
                  (recent.correct / recent.total -
                    previous.correct / previous.total),
              ),
            }
          : null,
    };
  });
  const writingInRange = writing.filter((w) => inRange(w.createdAt));
  const pending = mistakes.filter((m) => !m.reviewed);
  const weakest = byType
    .filter((g) => g.total > g.correct)
    .sort(
      (a, b) =>
        (b.total - b.correct) / b.total - (a.total - a.correct) / a.total ||
        b.total - a.total ||
        stable(a.type, b.type),
    )[0];
  const suggestions: Recommendation[] = [];
  const active = attempts
    .filter((a) => a.status === "in_progress")
    .sort((a, b) => stable(b.createdAt, a.createdAt) || stable(a.id, b.id));
  for (const item of active)
    suggestions.push({
      id: `resume:${item.id}`,
      kind: "resume",
      title: `Tiếp tục: ${item.content.title}`,
      reason:
        "Bạn đã bắt đầu bài này nhưng chưa nộp. Câu trả lời đã lưu sẽ được giữ.",
      attemptId: item.id,
    });
  const focusMistake =
    pending.find((m) => m.question.type === weakest?.type) ?? pending[0];
  if (focusMistake) {
    const type = focusMistake.question.type;
    const count = pending.filter((m) => m.question.type === type).length;
    suggestions.push({
      id: `review:${focusMistake.key}`,
      kind: "review",
      type,
      title: `Ôn lỗi ${typeLabels[type]}`,
      reason: `Có ${count} câu ${typeLabels[type]} chưa ôn trong khoảng thời gian đã chọn. Xem lại dẫn chứng và thử trả lời lần nữa.`,
    });
  }
  const played = new Map<string, number>();
  for (const item of attempts.filter((a) => a.status === "submitted")) {
    const key = `${item.content.id}:${item.content.version}`;
    played.set(key, (played.get(key) ?? 0) + 1);
  }
  const candidates = catalog
    .filter(
      (s) =>
        s.publication !== "archived" &&
        (!weakest || s.questions.some((q) => q.type === weakest.type)) &&
        !active.some(
          (a) => a.content.id === s.id && a.content.version === s.version,
        ),
    )
    .sort(
      (a, b) =>
        (played.get(`${a.id}:${a.version}`) ?? 0) -
          (played.get(`${b.id}:${b.version}`) ?? 0) ||
        Number(b.publication === "published") -
          Number(a.publication === "published") ||
        stable(a.id, b.id),
    );
  for (const set of candidates) {
    const count = played.get(`${set.id}:${set.version}`) ?? 0;
    suggestions.push({
      id: `practice:${set.id}:${set.version}`,
      kind: "practice",
      setId: set.id,
      preview: set.publication === "preview",
      title: `Luyện: ${set.title}`,
      reason: `${weakest ? `${weakest.total - weakest.correct}/${weakest.total} câu ${typeLabels[weakest.type]} chưa đúng trong khoảng đã chọn; bài này có dạng đó. ` : "Luyện thêm một bài để có dữ liệu đối chiếu. "}${count === 0 ? "Bạn chưa hoàn thành phiên bản này." : `Bạn đã làm phiên bản này ${count} lần; lần luyện lại cũng được tính vào thống kê.`}`,
    });
  }
  // Keep the next action concise: at most one recommendation of each kind.
  const recommendations: Recommendation[] = [];
  if (learning.recommendationsEnabled)
    for (const item of suggestions) {
      if (
        !learning.dismissed.includes(item.id) &&
        !recommendations.some((r) => r.kind === item.kind)
      )
        recommendations.push(item);
    }
  return {
    period,
    learning,
    readingCount: submitted.length,
    activeCount: active.length,
    correct: submitted.reduce((n, a) => n + a.score.score, 0),
    total: submitted.reduce((n, a) => n + a.score.total, 0),
    writingCount: writingInRange.length,
    wordsWritten: writingInRange.reduce((n, w) => n + wordCount(w.essay), 0),
    byType,
    mistakes,
    pendingCount: pending.length,
    errors: (Object.keys(errorLabels) as ErrorKind[]).map((kind) => ({
      kind,
      count: mistakes.filter((m) => m.kind === kind).length,
    })),
    recommendations,
    recent: submitted.slice(0, 10).map((a) => ({
      id: a.id,
      title: a.content.title,
      version: a.content.version,
      at: a.submittedAt!,
      score: a.score.score,
      total: a.score.total,
    })),
  };
}
export type Progress = ReturnType<typeof buildProgress>;
export interface ReviewFeedback {
  correct: boolean;
  answer: string;
  solution: Solution;
  reviewed: boolean;
}
