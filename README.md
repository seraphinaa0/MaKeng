# MaKeng

Không gian luyện IELTS độc lập. Bản đầu tiên triển khai luồng Writing Task 2 chạy local: chọn đề, viết và lưu nháp, nộp bài, xử lý qua worker, xem feedback, xem lịch sử, export và xóa bài.

Giao diện hiện dùng hai mục **Writing** và **Reading**. Writing được rút gọn thành một cột. Reading tại `/reading` có 5 bài mẫu gốc, mỗi bài 5 câu: trắc nghiệm, True/False/Not Given và điền từ. Đây là các bài luyện ngắn có tình huống hư cấu, chưa được giáo viên duyệt hoặc hiệu chuẩn độ khó IELTS.

## Reading — Phase 2 local

1. Chọn Reading → Làm bài. Nếu đã có bài chưa nộp, hệ thống tiếp tục bài đó.
2. Trả lời câu hỏi, đánh dấu câu cần xem lại. Trên điện thoại dùng nút Bài đọc/Câu hỏi.
3. Câu trả lời lưu tự động; nút “Lưu câu trả lời” đồng bộ ngay. “Đã lưu nháp trên thiết bị” khác với “Đã lưu trên máy chủ”. Khi mất kết nối, kết nối lại rồi mở lại bài để khôi phục phần chưa đồng bộ. Trang web chưa hỗ trợ khởi động hoàn toàn offline.
4. Chọn Nộp bài. Nếu còn câu trống, xác nhận trước khi nộp; câu trống tính là sai. Bài đã nộp không sửa được.
5. Xem điểm trên tổng số câu, lỗi theo dạng, đáp án, giải thích tiếng Việt và dẫn chứng được highlight trong bài. Không chuyển điểm 5 câu sang band IELTS.
6. Mở Lịch sử Reading để tiếp tục hoặc xem lại kết quả. Chức năng xóa toàn bộ phiên trong Writing cũng xóa các bài Reading.

Mỗi attempt lưu snapshot của content version. Answer key nằm phía server và chỉ được gửi sau khi nộp. API lưu đáp án có revision để từ chối ghi đè từ tab cũ; giao diện cho phép tải bản mới. Nội dung mẫu có trạng thái `preview`; `publishedSets()` loại toàn bộ nội dung chưa có human review. API local hiển thị preview có chủ đích theo [ADR 0002](docs/decisions/0002-reading-preview.md), không phải pipeline phát hành nội dung public.

Migration `002-reading.sql` thêm bảng attempts và tự nâng database cũ; không xóa dữ liệu Writing. Endpoint Reading: `GET /api/v1/reading/sets`, `GET/POST /api/v1/reading/attempts`, `GET /api/v1/reading/attempts/:id`, `POST .../:id/answers`, `POST .../:id/submit`. Lịch sử dùng offset, 20 bài/trang. POST answers nhận `{revision, answers, flagged}`; POST submit nhận `{revision}`.

**Hiện chỉ dùng mock evaluator. Điểm 6.0 và nhận xét mẫu không phản ánh chất lượng bài viết.** Không cần API key và không có dữ liệu gửi đến AI provider. Đây chưa phải bản beta public có đăng nhập tài khoản.

## Chạy local

Yêu cầu Node.js 24.x và pnpm 11.19.0. Node 24 cung cấp SQLite tích hợp; không cần cài Docker hoặc dịch vụ database để thử luồng này.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Lệnh `dev` chạy Next.js trên loopback port 3000 và worker trong cùng terminal. Dừng bằng Ctrl+C. Không mở port ra Internet: đây là adapter dành cho một máy phát triển.

```sh
pnpm build
pnpm start
```

`start` cũng chạy cả web và worker. Nếu chỉ chạy web, bài vẫn được lưu và nằm ở trạng thái chờ cho tới khi `pnpm worker` hoạt động.

Database mặc định nằm ở `.data/makeng.sqlite` tại root repo, ngoài Git. Migration `packages/db/migrations/001-writing.sql` chạy tự động khi mở database mới. Web và worker phải cùng truy cập một database. Nếu cần đường dẫn khác, đặt biến môi trường được export cho cả hai process:

```sh
export MAKENG_DB_PATH=/absolute/path/to/makeng.sqlite
pnpm dev
```

`.env.example` chỉ mô tả biến tùy chọn; worker không tự đọc file `.env`.

Trong cloud workspace có home directory chỉ đọc, dùng store tạm:

```sh
export pnpm_config_store_dir=/tmp/makeng-pnpm-store
pnpm install --frozen-lockfile
pnpm dev
```

## Cách thử

1. Chọn một trong ba đề gốc hoặc nhập đề của bạn.
2. Viết bài bằng tiếng Anh. Nháp tự lưu vào localStorage của trình duyệt; chờ nhãn “Đã lưu nháp” trước khi tải lại trang.
3. Xác nhận lưu dữ liệu local và chọn “Lưu & xem phản hồi mẫu”.
4. API lưu bài và job trong một transaction rồi trả `202`. Worker xử lý và UI cập nhật bằng polling.
5. Xem bốn tiêu chí, trích dẫn nguyên văn, gợi ý luyện tập; mở lại bài từ lịch sử.
6. Tải JSON của từng bài, xóa một bài hoặc xóa toàn bộ phiên từ lịch sử.

Độ dài gợi ý Task 2 là 250 từ. Demo cho phép nộp bài ngắn (tối thiểu 30 ký tự) để thử luồng. Điểm mock không được dùng để tính tiến bộ năng lực.

## Kiểm thử

```sh
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```

E2E khởi chạy web và worker riêng trên port 3100, dùng database tạm độc lập. Nếu Chromium đã có sẵn trên máy và download bị hạn chế:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium pnpm test:e2e
```

Các test kiểm tra consent/schema, evidence, tính band, ownership, idempotency, rate limit, persistence qua connection mới, worker lease/retry/timeout, xóa bài đang xử lý, và luồng browser desktop/mobile. CI không gọi AI thật.

## API hiện có

| Method | Endpoint | Hành vi |
| --- | --- | --- |
| GET | `/api/v1/session` | Tạo/khôi phục phiên local và trả thư viện đề |
| DELETE | `/api/v1/session` | Xóa phiên, bài, kết quả và model runs liên quan |
| POST | `/api/v1/writing/submissions` | Lưu bài + enqueue job, trả `202` và `jobId` |
| GET | `/api/v1/writing/submissions?offset=0` | Lịch sử phân trang, tối đa 20 bài/trang |
| GET/DELETE | `/api/v1/writing/submissions/:id` | Xem hoặc xóa bài của phiên hiện tại |
| POST | `/api/v1/writing/submissions/:id/retry` | Thử lại bài lỗi khi chưa quá 3 attempts |
| GET | `/api/v1/jobs/:id` | Trạng thái job và kết quả, không chạy job trong GET |

Mutation cần cùng origin với web; POST submission cần header `Idempotency-Key` dạng UUID và JSON `{ prompt, essay, consent: true }`. Giới hạn payload 64 KB, đề 3.000 ký tự, bài 20.000 ký tự, 10 yêu cầu tạo/thử lại mỗi giờ mỗi phiên. Retry transient dùng backoff + jitter; validation failure không tự retry. Worker timeout 30 giây, lease 60 giây, tối đa 3 attempts. `model_runs` ghi hash input, phiên bản, token usage, latency và cost (mock bằng 0).

## Dữ liệu và giới hạn hiện tại

- Phiên dùng cookie ngẫu nhiên HttpOnly, SameSite Strict; server lưu hash và kiểm tra ownership cho từng request. Đây không phải tài khoản Supabase. Phiên có hiệu lực 30 ngày tính từ lúc tạo; xóa cookie hoặc đổi trình duyệt sẽ không truy cập lại lịch sử cũ.
- Bản nháp ở localStorage; bài đã nộp, consent version và kết quả ở SQLite. Không có encryption at rest hoặc cơ chế recovery tài khoản trong slice này.
- Xóa bài loại bỏ record và model runs liên quan; xóa phiên còn xóa quota events. Đây là xóa logic khỏi database, không phải cam kết xóa vật lý khỏi mọi backup/WAL hoặc ổ đĩa. Chưa có automatic retention cleanup.
- Nội dung đề là synthetic do MaKeng tạo, có nhãn provenance; chưa được giáo viên kiểm định. Không chứa đề Cambridge hoặc tài liệu tham khảo bên thứ ba.
- Không chạy adapter SQLite trên Vercel/serverless hoặc nhiều máy. Chuyển sang PostgreSQL/RLS và Supabase Auth trước khi triển khai public.
- Chưa có live AI adapter, prompt đã hiệu chuẩn, benchmark giáo viên, Reading được duyệt để phát hành public hoặc theo dõi band thực tế. Không có biến API key nào được sử dụng ở phiên bản này.
- Accessibility đã có labels, focus, skip link và layout responsive; chưa tuyên bố đạt đầy đủ WCAG AA qua audit.

## Tài liệu

- [Product](PRODUCT.md), [Architecture](ARCHITECTURE.md), [Design system](DESIGN_SYSTEM.md)
- [AI rules](AI_RULES.md), [Roadmap](ROADMAP.md), [Agent instructions](AGENTS.md)
- [ADR: local Writing slice](docs/decisions/0001-local-writing-slice.md)

Thứ tự tiếp theo: Supabase Auth/PostgreSQL và RLS → adapter AI thật + disclosure riêng → benchmark có người chấm → beta nhiều người dùng.
