import {
  criteria,
  type Evaluation,
  type WritingInput,
} from "../schemas/writing";

export interface ProviderResult {
  output: unknown;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
}
export interface WritingEvaluator {
  readonly model: string;
  evaluate(input: WritingInput, signal: AbortSignal): Promise<ProviderResult>;
}
export class TransientProviderError extends Error {}

/** Test fixture only. Fixed bands deliberately do not purport to measure ability. */
export class MockWritingEvaluator implements WritingEvaluator {
  readonly model = "makeng-mock-v1";
  async evaluate(
    input: WritingInput,
    signal: AbortSignal,
  ): Promise<ProviderResult> {
    signal.throwIfAborted();
    const quote = input.essay.slice(0, Math.min(180, input.essay.length));
    const suggestions = [
      "Kiểm tra xem quan điểm của bạn có trả lời trực tiếp câu hỏi trong đề không.",
      "Mỗi đoạn nên có một ý chính, phần giải thích và một ví dụ hỗ trợ.",
      "Tìm các từ bị lặp và thử diễn đạt lại mà vẫn giữ đúng nghĩa.",
      "Đọc lại từng câu để kiểm tra chia động từ và dấu câu.",
    ];
    const result: Evaluation = {
      schemaVersion: "1",
      mode: "mock",
      criteria: Object.fromEntries(
        criteria.map((name, index) => [
          name,
          {
            band: 6,
            evidence: { start: 0, end: quote.length, quote },
            observation:
              "Phản hồi minh họa. Đoạn trích này chỉ giúp bạn thử giao diện; hệ thống chưa phân tích chất lượng bài viết.",
            suggestion: suggestions[index],
          },
        ]),
      ) as Evaluation["criteria"],
      nextSteps: [
        "Đọc lại yêu cầu đề và gạch chân luận điểm chính.",
        "Thử viết lại một đoạn với ví dụ cụ thể hơn.",
      ],
    };
    return {
      output: result,
      inputTokens: 0,
      outputTokens: 0,
      estimatedCost: 0,
    };
  }
}
