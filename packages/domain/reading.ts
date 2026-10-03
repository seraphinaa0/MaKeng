import type {
  ReadingSet,
  PublicReadingSet,
  Question,
  ReadingResult,
} from "../schemas/reading";

export const typeLabels: Record<Question["type"], string> = {
  mcq: "Trắc nghiệm",
  tfng: "True / False / Not Given",
  completion: "Điền từ",
};
export function normalizeAnswer(value: string) {
  return value
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[‐‑–]/g, "-")
    .replace(/\s+/g, " ");
}
export function publicReadingSet(set: ReadingSet): PublicReadingSet {
  return {
    id: set.id,
    version: set.version,
    title: set.title,
    minutes: set.minutes,
    publication: set.publication,
    provenance: set.provenance,
    paragraphs: set.paragraphs,
    questions: set.questions,
  };
}
export function scoreReading(
  set: ReadingSet,
  answers: Record<string, string>,
): ReadingResult {
  const questions = set.questions.map((q) => {
    const answer = answers[q.id] || "";
    const normalized = normalizeAnswer(answer);
    const withinLimit =
      q.type !== "completion" || normalized.split(" ").length <= q.maxWords;
    const solution = set.solutions[q.id];
    return {
      questionId: q.id,
      answer,
      solution,
      correct:
        !!normalized &&
        withinLimit &&
        solution.answers.some((a) => normalizeAnswer(a) === normalized),
    };
  });
  return {
    score: questions.filter((q) => q.correct).length,
    total: questions.length,
    questions,
    byType: (["mcq", "tfng", "completion"] as const)
      .map((type) => {
        const ids = set.questions
          .filter((q) => q.type === type)
          .map((q) => q.id);
        return {
          type,
          total: ids.length,
          correct: questions.filter(
            (q) => ids.includes(q.questionId) && q.correct,
          ).length,
        };
      })
      .filter((x) => x.total > 0),
  };
}
