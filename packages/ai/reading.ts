import { readingSetSchema, type ReadingSet } from "../schemas/reading";
import { sourceInput, type SourceInput } from "../schemas/authoring";

export function normalizeSource(text: string) {
  return text
    .normalize("NFKC")
    .replace(/\r\n?/g, "\n")
    .trim()
    .split(/\n\s*\n/)
    .filter(Boolean)
    .map((text, index) => ({
      id: `p${index + 1}`,
      text: text.replace(/\s+/g, " ").trim(),
    }));
}

/** Deterministic UI fixture, NOT an AI generator or semantic quality evaluator. */
export function generateMockReading(
  raw: SourceInput,
  id: string,
  version = 1,
  generation = 1,
): ReadingSet {
  const input = sourceInput.parse(raw);
  const paragraphs = normalizeSource(input.text);
  const candidates = paragraphs.flatMap((block) => {
    const sentences = block.text.match(/[^.!?]+[.!?]?/g) || [];
    return sentences
      .map((text) => ({ block, quote: text.trim() }))
      .filter(
        ({ quote }) => quote.length >= 25 && /\b[A-Za-z]{4,}\b/.test(quote),
      );
  });
  if (!candidates.length)
    throw new Error(
      "Nguồn cần có ít nhất một câu tiếng Anh dài 25 ký tự để tạo mẫu.",
    );
  const { block, quote } = candidates[(generation - 1) % candidates.length];
  const word = quote.match(/\b[A-Za-z]{4,}\b/)![0];
  const start = block.text.indexOf(quote);
  const evidence = {
    blockId: block.id,
    start,
    end: start + quote.length,
    quote,
  };
  return readingSetSchema.parse({
    id,
    version,
    title: input.title,
    minutes: 5,
    publication: "preview",
    provenance: {
      author: input.author,
      source: "user-authored",
      rights: "user-owned-content",
      humanReviewer: null,
    },
    paragraphs,
    questions: [
      {
        id: "q1",
        type: "mcq",
        prompt: "Which statement appears in the passage?",
        options: [
          { id: "A", text: quote },
          {
            id: "B",
            text: "The passage consists entirely of mathematical equations.",
          },
          { id: "C", text: "No information is provided in the passage." },
          { id: "D", text: "The passage is a list of unrelated numbers." },
        ],
      },
      { id: "q2", type: "tfng", prompt: quote },
      {
        id: "q3",
        type: "completion",
        prompt: quote.replace(word, "________"),
        maxWords: 1,
      },
    ],
    solutions: {
      q1: {
        answers: ["A"],
        explanation:
          "Option A repeats the quoted sentence. Mock question: review and improve the distractors before use.",
        evidence,
      },
      q2: {
        answers: ["TRUE"],
        explanation:
          "The statement repeats the source. Mock question: review the meaning and difficulty.",
        evidence,
      },
      q3: {
        answers: [word],
        explanation: `The missing word in the quoted sentence is “${word}”.`,
        evidence,
      },
    },
  });
}
