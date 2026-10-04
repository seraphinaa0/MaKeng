# MaKeng

Không gian luyện IELTS độc lập. Mặc định là demo Writing, Reading và Tạo đề lưu trong trình duyệt, không cần API AI hoặc database. Chế độ API SQLite + worker cũ vẫn dùng được khi đặt `NEXT_PUBLIC_MAKENG_DEMO=false` trước khi chạy/build.

Giao diện gồm **Writing**, **Reading**, **Tạo đề** và **Tiến độ**. Writing có một cột. Reading tại `/reading` có 5 bài mẫu gốc, mỗi bài 5 câu: trắc nghiệm, True/False/Not Given và điền từ. Bài mẫu có tình huống hư cấu, chưa được giáo viên duyệt hoặc hiệu chuẩn độ khó IELTS.

## Phase 4 — Tiến độ và ôn lỗi

Mở **Tiến độ** (`/progress`) hoặc liên kết ở cuối phần kết quả Reading. Chỉ có trong demo trình duyệt, không đọc database SQLite cũ.

- Lọc toàn bộ/7 ngày/30 ngày gần nhất, tính theo thời điểm nộp bài Reading. Đây là khoảng liên tục tính lùi từ lúc mở/cập nhật trang, không phải tuần/tháng lịch. Thống kê dùng toàn bộ lịch sử đã lưu, không chỉ trang đầu 20 bài.
- Hiển thị số bài, tổng câu đúng/tổng câu, số lỗi chưa ôn và tỷ lệ đúng theo ba dạng. Bài chưa nộp không tham gia chấm điểm. Mỗi lượt làm lại đều được tính, nên tỷ lệ đúng không thể coi là phép đo năng lực đã hiệu chuẩn.
- Khi đủ 6 bài có cùng dạng câu hỏi trong khoảng đã chọn, so sánh số đúng/tổng câu của 3 lượt gần nhất với 3 lượt trước. Hiển thị chênh lệch điểm phần trăm, không quy đổi sang band IELTS.
- Writing chỉ thống kê số bài và số từ. Không vẽ xu hướng band/tiêu chí từ điểm mock 6.0.
- Phân loại lỗi quan sát được: bỏ trống, vượt giới hạn từ, lựa chọn/TFNG/từ điền không khớp. Không tự kết luận nguyên nhân ngữ pháp hay từ vựng.
- Gợi ý có lý do: tiếp tục bài chưa nộp, ôn lỗi, hoặc luyện bài có dạng cần xem lại. Ưu tiên phiên bản ít luyện; phân biệt bài mẫu preview. Có tắt/bật, bỏ qua và khôi phục gợi ý; lựa chọn lưu qua reload.
- Mục **Ôn câu sai** cho lọc dạng, đọc lại nguồn và thử trả lời. Đúng thì chuyển sang **Đã ôn**; có thể đưa lại vào hàng đợi. Mỗi câu gắn với attempt/version gốc; ôn lại không đổi điểm bài đã nộp. Hai lần làm cùng câu là hai mục riêng.
- Progress tự cập nhật khi quay lại cửa sổ hoặc dữ liệu thay đổi ở tab khác; có nút Cập nhật. Thao tác đồng thời kiểm tra revision trước khi lưu.

Lưu trữ demo được nâng từ schema v1 lên v2, giữ nguyên khóa và bài cũ. Đọc không ghi đè dữ liệu; mutation thành công mới lưu phiên bản mới. Nếu đang mở tab từ bản deploy cũ, tải lại tab trước khi tiếp tục. Xóa dữ liệu phiên cũng xóa tiến độ, trạng thái ôn và thiết lập gợi ý; JSON export gồm các trường này. Không di chuyển SQLite hoặc đồng bộ thiết bị. Xem [ADR 0004](docs/decisions/0004-learning-loop.md).

## Demo Vercel và Phase 3

- Web mặc định không gọi `/api/v1`; API trả `503 DEMO_ONLY` trước khi mở database. Không chạy worker trên Vercel.
- Dữ liệu trong localStorage riêng theo browser/origin. Đổi domain, trình duyệt hoặc xóa dữ liệu website sẽ không thấy lịch sử cũ. Không tự di chuyển dữ liệu SQLite sang demo. Không gửi essay/source tới AI hay API.
- Cần HTTPS (hoặc localhost) và trình duyệt hiện đại hỗ trợ Web Locks. Ghi dữ liệu được khóa giữa các tab, kiểm tra revision, và báo lỗi khi storage bị chặn/đầy. Dữ liệu hỏng không bị ghi đè tự động.
- Answer key nằm trong browser bundle/storage: chỉ phù hợp luyện thử, không dùng làm hệ thống thi bảo mật. Không có tài khoản, phân quyền reviewer hay đồng bộ cloud.
- Trong Vercel chọn framework Next.js, root `apps/web`, dùng lockfile/workspace ở repo root. Giữ mặc định demo hoặc đặt `NEXT_PUBLIC_MAKENG_DEMO=true` và **rebuild**. Node.js 24.x; không nhập AI key.
- Không đưa `.data`, `.env` hay dữ liệu local lên deployment. Chưa xác nhận deployment public sau thay đổi này.

Tại `/create`:

1. Nhập tiêu đề, tác giả, văn bản tiếng Anh gốc (100–15.000 ký tự) và xác nhận sở hữu. Hiện chỉ hỗ trợ nguồn do chính người dùng sở hữu, không import PDF/URL hoặc nội dung có bản quyền bên thứ ba.
2. Tạo 3 câu mẫu bằng quy tắc (MCQ, TFNG, completion). Đây **không phải AI generation**; cần sửa distractors/độ khó. Nguồn được chuẩn hóa thành đoạn và evidence offsets.
3. Sửa câu hỏi, lựa chọn, đáp án, giới hạn từ, giải thích và trích dẫn. Lưu sửa đổi; kiểm tra cấu trúc không thay thế kiểm tra ý nghĩa. Trước khi lưu, bản sửa chỉ nằm trong bộ nhớ trang; có thể tải JSON để sao lưu.
4. Có thể từ chối kèm lý do, sửa lại, hoặc tạo lại tối đa 3 lần tổng cộng trên mỗi revision nội dung. Tạo lại thay thế câu hỏi và cần xác nhận.
5. Nhập tên người tự duyệt, xác nhận kiểm tra, bấm **Duyệt bản nháp** rồi **Phát hành trên thiết bị**. Chỉ lúc này bài xuất hiện trong thư viện Reading; draft chưa duyệt không xuất hiện. Đây là self-review demo, không phải quyền reviewer được xác thực.
6. Bản đã phát hành bị khóa; tạo phiên bản mới để sửa. Thư viện dùng bản published mới nhất; attempt đang làm giữ snapshot cũ. Nhật ký lưu thao tác, thời gian, tên reviewer/lý do.
7. **Xuất dữ liệu demo** tải JSON để sao lưu (chưa có UI import/restore); **Xóa dữ liệu demo** xóa bộ nhớ demo và bản nháp luyện tập sau xác nhận. Writing cũng có xóa toàn bộ dữ liệu phiên.

AI quality evaluator, durable generation jobs, Supabase/RLS, benchmark giáo viên và shared publish chưa triển khai. Xem [ADR 0003](docs/decisions/0003-browser-demo-and-review.md).

## Reading — Phase 2 local

Mục này mô tả chế độ API local. Demo giữ cùng giao diện practice nhưng báo “Đã lưu trong trình duyệt” và chấm trực tiếp trên thiết bị; đáp án không được bảo mật phía server.

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

Lệnh `dev` chạy Next.js demo trên loopback port 3000, không chạy worker. Dừng bằng Ctrl+C.

```sh
pnpm build
pnpm start
```

`start` chạy web demo từ build trước đó. Để dùng API SQLite + worker cũ (không triển khai lên Vercel):

```sh
export NEXT_PUBLIC_MAKENG_DEMO=false
pnpm dev:local
# Hoặc production local:
pnpm build
pnpm start:local
```

Các lệnh `export` là cú pháp bash; PowerShell dùng `$env:NEXT_PUBLIC_MAKENG_DEMO="false"`. API và worker bên dưới chỉ áp dụng chế độ local. Không mở adapter SQLite ra Internet.

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

## Cách thử Writing

1. Chọn một trong ba đề gốc hoặc nhập đề của bạn.
2. Viết bài bằng tiếng Anh. Nháp tự lưu vào localStorage của trình duyệt; chờ nhãn “Đã lưu nháp” trước khi tải lại trang.
3. Xác nhận lưu dữ liệu local và chọn “Lưu & xem phản hồi mẫu”.
4. Demo lưu bài và phản hồi mẫu trong trình duyệt. Chế độ local dùng API lưu bài và job trong transaction rồi trả `202`; worker xử lý và UI cập nhật bằng polling.
5. Xem bốn tiêu chí, trích dẫn nguyên văn, gợi ý luyện tập; mở lại bài từ lịch sử.
6. Tải JSON của từng bài, xóa một bài hoặc xóa toàn bộ phiên từ lịch sử.

Độ dài gợi ý Task 2 là 250 từ. Demo cho phép nộp bài ngắn (tối thiểu 30 ký tự) để thử luồng. Điểm mock không được dùng để tính tiến bộ năng lực.

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

E2E local khởi chạy web và worker riêng trên port 3100, dùng database tạm độc lập. E2E demo dùng production build trên port 3400, không worker, chặn mọi request `/api` để kiểm tra độc lập backend. Chạy tuần tự do dùng cùng thư mục build Next.js. Nếu Chromium đã có sẵn trên máy và download bị hạn chế:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium pnpm test:e2e
```

Các test kiểm tra consent/schema, evidence, tính band, ownership, idempotency, rate limit, persistence qua connection mới, worker lease/retry/timeout, xóa bài đang xử lý, và luồng browser desktop/mobile. CI không gọi AI thật.

## API hiện có (chỉ khi tắt demo)

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

## Dữ liệu và giới hạn chế độ API local

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
- [Phase 4 validation](docs/validation-learning.md)

Thứ tự tiếp theo: Supabase Auth/PostgreSQL và RLS → adapter AI thật + disclosure riêng → benchmark có người chấm → beta nhiều người dùng.
