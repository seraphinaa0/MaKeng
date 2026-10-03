# MaKeng — AI Engineering Rules

## 1. Phạm vi sử dụng AI trong beta

AI được dùng cho:

- Writing feedback và band estimate.
- Reading question generation.
- Reading question quality evaluation.
- Gợi ý bài luyện tiếp theo dựa trên dữ liệu có cấu trúc.

AI không được dùng để:

- Tự động publish nội dung.
- Tuyên bố điểm IELTS chính thức.
- Quyết định authorization hoặc quyền truy cập.
- Thay thế validation deterministic.
- Train trên dữ liệu người dùng khi chưa có opt-in consent.

## 2. Provider abstraction

Domain không import trực tiếp SDK của provider. Mọi model call đi qua interface trong `packages/ai`.

Ví dụ:

```ts
interface WritingEvaluator {
  evaluate(input: WritingEvaluationInput): Promise<WritingEvaluationResult>;
}
```

Mỗi interface phải có fake/mock implementation để UI, API và tests hoạt động không cần API key.

## 3. Secret handling

- API key chỉ tồn tại ở server/worker environment.
- Không dùng biến `NEXT_PUBLIC_*` cho secret.
- Không commit `.env` hoặc secret fixture.
- Không log headers, API key hoặc raw provider request chứa dữ liệu riêng tư.
- Key development và production phải tách riêng, có spending limit.

## 4. Structured output

- Mọi output đi vào database/UI phải có versioned Zod schema.
- Không tin JSON chỉ vì parse thành công.
- Unknown fields bị loại hoặc từ chối theo contract đã chọn.
- Validation failure tạo error code rõ và có thể retry nếu phù hợp.
- Raw output chỉ được lưu ở vùng hạn chế nếu thực sự cần debug/audit.

## 5. Prompt management

Prompt không được viết rải rác trong component hoặc route handler.

```text
packages/ai/prompts/
  writing/
    evaluate-task-2.v1.ts
  reading/
    generate-mcq.v1.ts
    generate-tfng.v1.ts
    validate-question.v1.ts
```

Mỗi model run ghi:

```text
promptName
promptVersion
schemaVersion
rubricVersion
provider
model
temperature
inputHash
tokenUsage
latencyMs
estimatedCost
status
```

## 6. Writing evaluation rules

- Đánh giá theo từng tiêu chí: Task Response, Coherence and Cohesion, Lexical Resource, Grammatical Range and Accuracy.
- Feedback phải trích dẫn đoạn cụ thể từ essay.
- Aggregate band sử dụng hàm deterministic, không lấy trực tiếp một số overall tùy ý từ model.
- Model không được khẳng định đây là official score.
- Nếu evidence không tồn tại trong essay, evaluation không đạt quality check.
- Confidence không được chỉ dựa trên con số model tự khai.

## 7. Reading generation rules

- Sinh từng loại câu hỏi theo contract riêng.
- Evidence dùng `blockId`, `startOffset`, `endOffset` và quote.
- Answer phải được kiểm tra lại với source đã normalize.
- Validator deterministic kiểm tra word limit, option count, duplicate answer, offset và required fields.
- AI quality evaluator là tín hiệu bổ sung, không thay human review.
- Regenerate tối đa theo cấu hình; vượt ngưỡng chuyển `needs_review` hoặc `failed`.

## 8. Reliability và cost

- Mọi call có timeout.
- Retry chỉ dành cho lỗi transient; không retry vô hạn với schema/prompt lỗi.
- Dùng exponential backoff và jitter.
- Job phải idempotent.
- Có budget token/cost theo operation và theo user.
- Cache chỉ dùng khi privacy và versioning cho phép.

## 9. Evaluation trước khi release

Mọi thay đổi model, prompt, schema hoặc rubric phải chạy evaluation set cố định.

### Writing benchmark

- Essay đa dạng band và topic.
- Có điểm/reference feedback từ người có chuyên môn.
- Theo dõi độ lệch từng tiêu chí và consistency qua nhiều lần chạy.

### Reading quality set

- Kiểm tra answerability, uniqueness, evidence correctness, question type và distractor quality.
- Reviewer ghi approve/reject reason để tạo dữ liệu đánh giá nội bộ.

Không promote phiên bản mới nếu chất lượng guardrail giảm đáng kể dù output trông tự nhiên hơn.

## 10. Data và copyright policy

### Được phép ưu tiên

- Nội dung do MaKeng tự tạo và sở hữu.
- Nội dung có permission bằng văn bản.
- Public domain.
- Nội dung có license tương thích, tuân thủ attribution và điều kiện đi kèm.
- Synthetic content tạo từ facts/topic phổ quát, sau khi review.
- User content có consent rõ cho mục đích cụ thể.

### Không được tự ý sử dụng

- Đề Cambridge hoặc IELTS chính thức.
- Nội dung scrape từ website khi không có quyền tái sử dụng.
- Repo, dataset hoặc asset không có license.
- Nội dung chỉ ghi credit nhưng không có permission/license.
- Submission của người dùng cho training/fine-tuning khi chưa opt-in.

Beta, private testing hoặc phi thương mại không tự động tạo quyền sử dụng. Fine-tuning chỉ được cân nhắc khi provenance và quyền sử dụng của toàn bộ dataset đã được xác minh.

## 11. User disclosure

Trước lần gửi dữ liệu đầu tiên tới AI provider, UI phải giải thích:

- dữ liệu nào được gửi;
- mục đích xử lý;
- provider có thể xử lý/lưu dữ liệu theo chính sách của họ;
- cách người dùng yêu cầu xóa dữ liệu;
- điểm số chỉ là ước lượng luyện tập.
