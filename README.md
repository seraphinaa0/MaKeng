# MaKeng

> **Trạng thái: Beta đang phát triển**
>
> MaKeng là nền tảng luyện IELTS độc lập, web-first, tập trung vào Writing Task 2, Reading practice và lộ trình ôn lỗi dựa trên bằng chứng.
>
> MaKeng **không phải sản phẩm IELTS chính thức** và không liên kết với British Council, IDP hoặc Cambridge University Press & Assessment. Mọi band estimate trong ứng dụng chỉ phục vụ luyện tập, không phải điểm thi chính thức.

## Beta hiện có

MaKeng hiện cung cấp hai vertical slice chính:

- **Writing Task 2**
  - Chọn hoặc nhập đề.
  - Soạn bài với word count và autosave.
  - Nhận feedback theo bốn tiêu chí IELTS.
  - Xem evidence, gợi ý cải thiện và lịch sử bài viết.
  - Bản demo hiện dùng mock evaluator; điểm và nhận xét mẫu không phản ánh năng lực chấm AI thật.

- **Reading practice**
  - Luyện Multiple Choice, True/False/Not Given và Sentence Completion.
  - Lưu nháp, tiếp tục attempt và xem lại kết quả.
  - Xem đáp án, giải thích và evidence được highlight.
  - Hỗ trợ lịch sử, thống kê lỗi và ôn lại câu sai.

- **Tạo đề và review nội dung**
  - Nhập văn bản do người dùng sở hữu hoặc có quyền sử dụng.
  - Chuẩn hóa nguồn, tạo câu hỏi mẫu và chỉnh sửa trước khi phát hành.
  - Có provenance, answer key, explanation và evidence.
  - Nội dung chưa được review không được coi là nội dung beta đã publish.

- **Tiến độ**
  - Theo dõi các attempt Reading và Writing.
  - Phân loại lỗi quan sát được.
  - Đề xuất bước luyện tiếp theo theo dữ liệu thực tế.
  - Không suy diễn band chính thức từ dữ liệu hạn chế.

## Lưu ý quan trọng về bản beta

- Chế độ mặc định lưu dữ liệu demo trong trình duyệt và không yêu cầu API key AI hoặc database.
- Dữ liệu localStorage phụ thuộc vào browser và origin; đổi trình duyệt, domain hoặc xóa dữ liệu website có thể làm mất lịch sử demo.
- Answer key trong chế độ browser demo có thể nằm trong bundle/storage, vì vậy chế độ này chỉ phù hợp để thử nghiệm, không phải hệ thống thi bảo mật.
- Chế độ API SQLite + worker chỉ dành cho local development, không dành cho triển khai nhiều máy hoặc serverless production.
- Chưa có Supabase Auth/PostgreSQL/RLS, reviewer roles cloud, AI provider thật, benchmark giáo viên hoặc đồng bộ dữ liệu giữa thiết bị.
- AI-generated content không được tự động publish.
- Không sử dụng đề IELTS/Cambridge chính thức hoặc nội dung bên thứ ba khi chưa có quyền sử dụng phù hợp.

## Chạy local

### Yêu cầu

- Node.js 24.x
- pnpm 11.19.0

### Cài đặt và chạy demo

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Mở `http://localhost:3000`. Lệnh này chạy Next.js demo trên loopback, không chạy worker và không cần API key AI.

### Build và chạy production local

```sh
pnpm build
pnpm start
```

### Chạy chế độ API SQLite + worker local

```sh
export NEXT_PUBLIC_MAKENG_DEMO=false
pnpm dev:local
```

Hoặc chạy từ production build:

```sh
export NEXT_PUBLIC_MAKENG_DEMO=false
pnpm build
pnpm start:local
```

Database mặc định nằm tại `.data/makeng.sqlite` và không được commit vào Git. Có thể chỉ định đường dẫn khác:

```sh
export MAKENG_DB_PATH=/absolute/path/to/makeng.sqlite
```

PowerShell:

```powershell
$env:NEXT_PUBLIC_MAKENG_DEMO="false"
pnpm dev:local
```

## Kiểm thử

```sh
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
pnpm exec playwright install chromium
pnpm test:e2e
NEXT_PUBLIC_MAKENG_DEMO=true pnpm build
pnpm test:e2e:demo
```

Test suite mặc định sử dụng mock provider; không cần API key AI thật.

## Kiến trúc

MaKeng được tổ chức theo hướng **modular monolith** trong beta:

```text
Browser
  ↓
Next.js Web + API
  ├── Writing
  ├── Reading Practice
  ├── Content Review
  ├── Attempts / Progress
  └── Job API
          ↓
      Background Worker
          ├── AI provider adapter
          ├── Prompt execution
          ├── Schema validation
          └── Quality checks
```

Các nguyên tắc chính:

- UI không gọi trực tiếp AI provider.
- Provider SDK chỉ nằm trong adapter AI hoặc worker.
- External input được parse từ `unknown` và validate bằng schema.
- AI output phải qua versioned schema validation trước khi lưu hoặc render.
- Runtime Reading chỉ sử dụng content đã publish.
- Job phải có timeout, retry có giới hạn và xử l�� idempotent.
- Dữ liệu cá nhân và secret không được ghi vào log hoặc commit.

## Phạm vi chưa triển khai trong beta

- Speaking examiner hoàn chỉnh.
- Listening generation và TTS tự động.
- Native mobile app.
- Fine-tuning model.
- Marketplace, thanh toán hoặc tổ chức lớp học.
- Tự động scrape và phát hành nội dung bên thứ ba.
- Band score chính thức hoặc khả năng dự đoán điểm thi.

## Tài liệu

- [Product definition](PRODUCT.md)
- [Architecture](ARCHITECTURE.md)
- [Design system](DESIGN_SYSTEM.md)
- [AI engineering rules](AI_RULES.md)
- [Roadmap](ROADMAP.md)
- [Agent instructions](AGENTS.md)
- [ADR: Browser demo và review workflow](docs/decisions/0003-browser-demo-and-review.md)
- [Validation cho learning loop](docs/validation-learning.md)

## Đóng góp

MaKeng đang ở giai đoạn beta nên API, schema và giao diện có thể thay đổi. Trước khi thay đổi kiến trúc hoặc hành vi sản phẩm, hãy đọc các tài liệu nguồn sự thật ở trên và giữ thay đổi trong vertical slice nhỏ nhất có thể kiểm chứng.

Khi mở pull request, vui lòng kiểm tra:

- Acceptance criteria và test liên quan.
- Lint, typecheck, test và build phù hợp.
- Authorization, loading, empty, error và responsive states.
- Migration/RLS nếu có thay đổi database.
- Provenance, quyền sử dụng nội dung và disclosure dữ liệu gửi tới AI.
- Không có secret hoặc dữ liệu cá nhân trong code, fixture, log hay commit.
