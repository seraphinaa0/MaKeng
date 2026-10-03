# MaKeng — Roadmap

Roadmap này mô tả thứ tự học và giảm rủi ro, không phải cam kết ngày phát hành. Mỗi phase chỉ bắt đầu đầy đủ khi exit criteria của phase trước đã đạt.

## Trạng thái triển khai hiện tại

Đã bắt đầu Phase 1 cùng nền tảng tối thiểu từ Phase 0, theo yêu cầu xây dựng Writing trước. Bản local có editor/autosave, đề gốc, API lưu bài, worker bền vững, mock feedback bốn tiêu chí, lịch sử, export/delete và tests. Quyết định lưu trữ local được ghi tại [ADR 0001](docs/decisions/0001-local-writing-slice.md).

Phase 0 chưa hoàn tất: chưa có Supabase Auth/PostgreSQL/RLS. Phase 1 hiện kiểm chứng workflow với mock; chấm AI thật và benchmark giáo viên chưa được triển khai. Chưa đủ điều kiện phát hành beta public hoặc tuyên bố band đã được hiệu chuẩn.

## Phase 0 — Foundation

### Mục tiêu

Tạo development baseline và các contract quan trọng.

### Deliverables

- pnpm monorepo và Next.js web app.
- TypeScript strict, lint, format, tests và CI.
- Supabase local/development setup.
- Auth và profile tối thiểu.
- Shared Zod schemas.
- Mock AI provider.
- Logging có request/job ID.
- Environment variable validation.

### Exit criteria

- Contributor mới chạy được app và tests từ README.
- Login/logout hoạt động.
- CI chạy lint, typecheck, unit tests và build.
- Không cần API key AI để phát triển giao diện hoặc chạy tests.

## Phase 1 — Writing Task 2 vertical slice

### Deliverables

- Prompt library nhỏ có provenance rõ.
- Essay editor, word count và autosave.
- Submission API và persistence.
- Async evaluation job.
- Bốn criterion scores, evidence và next steps.
- History và detail page.
- AI disclosure và deletion flow cơ bản.

### Exit criteria

- Submission không mất nếu provider lỗi.
- Structured output luôn được validate.
- Aggregate band được tính deterministic.
- Có timeout, retry limit, rate limit và cost record.
- E2E test chạy bằng mock provider.

## Phase 2 — Reading runtime

Đã triển khai bản local: 5 bài preview có version/provenance, ba dạng câu hỏi, tiếp tục attempt, lưu nháp khi mất mạng, kiểm soát revision giữa các tab, submit bất biến, điểm thô, giải thích/dẫn chứng, lịch sử và thống kê lỗi theo dạng. Migration 002 giữ nguyên dữ liệu Writing.

Chưa đạt exit criterion về nội dung đã được người review phê duyệt: các bài có trạng thái `preview`, không được coi là `published`. Xem [ADR 0002](docs/decisions/0002-reading-preview.md). Chỉ dùng bộ chọn published và nội dung được giáo viên duyệt khi phát hành public.

### Deliverables

- Content schemas và versioning.
- 5–10 practice sets có quyền sử dụng rõ ràng.
- Multiple Choice, TFNG và Sentence Completion.
- Attempt state, answer persistence và submit.
- Review mode với answer, explanation và evidence.
- History và mistake summary.

### Exit criteria

- Runtime chỉ đọc content đã publish.
- Scoring và answer normalization có unit tests.
- Refresh/reconnect không làm mất attempt.
- Nội dung beta đã qua review và provenance check.

## Phase 3 — Reading generation và reviewer

### Deliverables

- Paste text/source ingestion.
- Normalize và block/offset mapping.
- Generation job theo từng question type.
- Deterministic validators và AI quality evaluator.
- Reviewer UI: edit, approve, reject, regenerate.
- Publish revision và audit log.

### Exit criteria

- Không thể publish khi thiếu answer/evidence/provenance.
- Regeneration có giới hạn.
- Quality set đo được first-pass approval và evidence accuracy.
- Không có auto-publish.

## Phase 4 — Learning loop

### Deliverables

- Progress dashboard.
- Error taxonomy.
- Skill trend theo question type/criterion.
- Recommendation engine deterministic trước.
- Mistake review queue.

### Exit criteria

- Recommendation giải thích được dựa trên dữ liệu nào.
- User có thể tắt hoặc bỏ qua recommendation.
- Analytics không suy diễn band chính thức từ dữ liệu quá ít.

## Phase 5 — Listening

### Deliverables

- Private audio upload.
- STT adapter và timestamped transcript.
- Audio player và section practice.
- Question/evidence mapping theo timestamp.
- Retention và deletion controls cho audio.

### Exit criteria

- Transcript/timestamp quality đạt benchmark nội bộ.
- Audio không public mặc định.
- User hiểu dữ liệu nào được gửi tới STT provider.

## Phase 6 — Speaking experiment

### Deliverables

- Recording, playback và transcript.
- Part 1/2/3 session state.
- Feedback tập trung vào fluency, vocabulary, grammar và intelligibility.
- Human-reviewed benchmark.

### Exit criteria

- Không chấm accent.
- Không gọi feedback là examiner score.
- Privacy, consent và audio deletion đã được kiểm thử.

## Phase 7 — Mobile readiness

### Deliverables

- Stable API contracts.
- Shared API client, schemas và domain logic.
- Expo proof of concept cho login, Reading và Writing history.
- Offline cache policy.

### Điều kiện bắt đầu

- Web có usage thực tế và retention đủ để chứng minh nhu cầu.
- API/session/content contracts ổn định.
- Mobile giải quyết nhu cầu cụ thể thay vì chỉ copy web.

## Backlog sau beta

- Writing Task 1 với chart schema.
- General Training.
- Teacher workspace.
- Collaborative content review.
- Payments/subscriptions.
- Provider failover.
- TTS đa speaker.
- Native notifications.
- Fine-tuning, chỉ khi dataset hợp pháp và benchmark chứng minh lợi ích.

## Thứ tự triển khai ngay

1. Foundation và mock provider.
2. Writing Task 2 end-to-end.
3. Reading runtime với nội dung thủ công.
4. Reading generation và reviewer.
5. Progress và mistake loop.

Không triển khai đồng thời Listening, Speaking và mobile trong beta đầu tiên.
