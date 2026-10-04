# MaKeng — Architecture

## 1. Mục tiêu kiến trúc

Kiến trúc bên dưới là đích beta. Demo hiện tại mặc định lưu trên trình duyệt, không gọi API/worker; API SQLite local là chế độ tùy chọn. Phase 3 mô phỏng workflow trên thiết bị, không cung cấp auth/shared publishing. Xem [ADR 0003](docs/decisions/0003-browser-demo-and-review.md).

Theo [ADR 0007](docs/decisions/0007-local-only-development.md), hướng phát triển hiện tại là web local, chưa public. Các lệnh web mặc định bind `127.0.0.1`; localStorage/IndexedDB là storage cho đầy đủ tính năng hiện tại, SQLite/worker chỉ phục vụ Writing/Reading cũ. Stack cloud và deployment bên dưới được hoãn, không phải điều kiện để tiếp tục phát triển local. Chưa có backend local thống nhất cho cả bốn kỹ năng hoặc đồng bộ thiết bị.

- Cho phép phát triển beta nhanh nhưng không khóa chặt vào một AI provider.
- Tách rõ runtime học tập, content pipeline và AI execution.
- Bảo vệ API key, dữ liệu cá nhân và nội dung chưa được duyệt.
- Giữ domain schema có thể tái sử dụng cho mobile về sau.

## 2. Kiến trúc tổng quan

```text
Browser
  │
  ▼
Next.js Web + Server API
  ├── Authentication / Authorization
  ├── Writing
  ├── Reading Practice
  ├── Content Review
  ├── Attempts / Progress
  └── Job API
          │
          ▼
      Background Worker
          ├── AI provider adapter
          ├── Prompt execution
          ├── Schema validation
          └── Quality checks
  │
  ├── PostgreSQL
  └── Private Object Storage
```

Beta sử dụng modular monolith. Web, API và worker có thể nằm trong cùng monorepo nhưng chạy thành process riêng khi cần.

## 3. Stack mặc định

| Thành phần | Lựa chọn |
|---|---|
| Web | Next.js, TypeScript |
| UI | Tailwind CSS, component primitives có accessibility |
| Validation | Zod |
| Database | PostgreSQL qua Supabase |
| Auth | Supabase Auth |
| Storage | Supabase Storage, private bucket |
| Jobs ban đầu | `generation_jobs` trong PostgreSQL + worker |
| AI | Provider adapter tương thích structured output |
| Tests | Vitest, Testing Library, Playwright |
| Package manager | pnpm |

Redis/BullMQ chỉ được thêm khi PostgreSQL job queue không đáp ứng tải hoặc yêu cầu scheduling/retry.

## 4. Cấu trúc monorepo dự kiến

```text
apps/
  web/                 # UI và HTTP endpoints
  worker/              # AI và tác vụ dài
packages/
  domain/              # Entity, state machine, scoring rules
  schemas/             # Zod schemas và API contracts
  ai/                  # Provider interfaces, prompts, validators
  content/             # Reading content pipeline
  db/                  # Queries và repository implementations
  ui/                  # Shared web components và design tokens
  test-utils/          # Fixtures và fakes
supabase/
  migrations/
docs/
```

Không tạo package chỉ để “trông giống monorepo”. Một package chỉ tồn tại khi có boundary và consumer rõ ràng.

## 5. Boundary quan trọng

### Browser

- Không giữ AI provider key.
- Không gọi trực tiếp AI provider.
- Không quyết định authorization chỉ bằng trạng thái client.
- Chỉ truy cập private asset bằng signed URL ngắn hạn.

### API

- Xác thực user và kiểm tra ownership cho mọi resource.
- Validate request/response bằng shared schemas.
- Tạo job cho tác vụ AI dài; không giữ HTTP request mở không cần thiết.
- Dùng idempotency key cho submit/generate endpoints.

### Worker

- Nhận job, lock job và cập nhật progress.
- Áp dụng timeout, retry có backoff và giới hạn số lần.
- Validate model output trước khi lưu kết quả chuẩn hóa.
- Ghi model, prompt version, token usage, latency và estimated cost.

### Content runtime

- Chỉ đọc content version ở trạng thái `published`.
- Không parse PDF, scrape URL hoặc gọi AI trong màn hình practice.
- Không sửa trực tiếp artifact đã publish; tạo revision mới.

## 6. Content lifecycle

```text
source
  → extracted
  → generated
  → validating
  → needs_review
  → approved
  → published
  → archived
```

Mọi publish phải thỏa:

- schema hợp lệ;
- provenance hợp lệ;
- không có blocking quality issue;
- reviewer phê duyệt;
- answer key và evidence đầy đủ.

## 7. Job lifecycle

```text
queued → processing → validating → completed
                  └→ retrying → processing
                  └→ needs_review
                  └→ failed
```

Job phải có `attempt_count`, `max_attempts`, `locked_at`, `error_code` và timestamps. Worker phải xử lý idempotent để không tạo hai kết quả khi retry.

## 8. Data model tối thiểu

```text
profiles
writing_prompts
writing_submissions
writing_evaluations
practice_sets
practice_set_versions
questions
question_options
attempts
attempt_answers
generation_jobs
model_runs
prompt_versions
content_sources
content_provenance
content_reviews
quality_checks
audit_logs
user_consents
```

Evidence phải dùng định vị ổn định, ví dụ `block_id` và offsets, không chỉ dùng câu mô tả như “paragraph 3”.

## 9. API conventions

- Base path: `/api/v1`.
- JSON sử dụng `camelCase` ở boundary TypeScript.
- Error response có `code`, `message`, `requestId`; không trả stack trace.
- List endpoint có pagination.
- Mutation endpoint trả resource/version đã được persist.
- Endpoint AI dài trả `202 Accepted` cùng `jobId`.

Ví dụ:

```text
POST /api/v1/writing/submissions
POST /api/v1/writing/submissions/:id/evaluations
GET  /api/v1/jobs/:id
POST /api/v1/reading/generations
POST /api/v1/practice-sets/:id/reviews
POST /api/v1/practice-sets/:id/publish
POST /api/v1/attempts/:id/submit
```

## 10. Security và privacy

- RLS theo owner và role; API vẫn kiểm tra authorization ở server.
- Bucket chứa essay/audio/source là private.
- Không log essay, transcript, token hoặc secret ở mức application log.
- MIME type và kích thước upload phải được kiểm tra server-side.
- Chống SSRF nếu sau này hỗ trợ import URL.
- Có retention policy và quy trình export/delete.
- AI provider chỉ nhận dữ liệu tối thiểu cần cho tác vụ.
- Không dùng submission để train nếu user chưa opt-in rõ ràng.

## 11. Deployment beta

- Web/API: Vercel hoặc container tương đương.
- Worker: container process độc lập.
- Database/Auth/Storage: Supabase.
- Preview environment dùng database riêng hoặc namespace riêng.
- Migration chạy có kiểm soát, không tự động destructive.

## 12. Quy tắc thay đổi kiến trúc

Phase 4 demo dùng domain analytics thuần tính từ snapshot bài đã nộp; chỉ preferences và trạng thái ôn được persist thêm trong browser state v2. Xem [ADR 0004](docs/decisions/0004-learning-loop.md). Không có dịch vụ analytics hoặc AI call mới.

Phase 5/6 demo có hai IndexedDB riêng cho Listening và Speaking, mỗi record
gồm metadata đã validate và Blob riêng tư trong cùng transaction. Speaking dùng
readwrite transaction để tuần tự hóa CAS/delete giữa tab; microphone chỉ mở
sau action/consent, transcript manual và self-review không gọi provider. Xóa
toàn bộ đi qua hai audio store rồi localStorage, không atomic giữa store. Chi
tiết phạm vi và version tại [ADR 0005](docs/decisions/0005-listening-demo.md) và
[ADR 0006](docs/decisions/0006-speaking-demo.md). Cloud buckets/RLS/worker trong
kiến trúc production ở trên chưa được thay thế hoặc triển khai bởi demo này.

Mọi thay đổi ảnh hưởng schema, security boundary, provider contract hoặc content lifecycle phải được ghi bằng Architecture Decision Record trong `docs/decisions/` trước khi implement.
