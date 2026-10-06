# MaKeng — Roadmap

Roadmap này mô tả thứ tự học và giảm rủi ro, không phải cam kết ngày phát hành. Mỗi phase chỉ bắt đầu đầy đủ khi exit criteria của phase trước đã đạt.

## Trạng thái triển khai hiện tại

**Ưu tiên hiện tại: web local, chưa public**, theo [ADR 0007](docs/decisions/0007-local-only-development.md). Sau review Phase 6, tiếp tục cải thiện UI/workflow và độ bền dữ liệu trên máy; chưa bắt đầu Expo hoặc nền tảng cloud. Các exit criteria về tài khoản, usage/retention và phát hành beta bên dưới thuộc hướng nhiều người dùng trong tương lai, không chặn phát triển web local.

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

Đã triển khai workflow demo trình duyệt cùng UI `/create`: nhập nguồn gốc, normalize, tạo mẫu ba dạng câu hỏi, sửa/kiểm tra cấu trúc, từ chối kèm lý do, duyệt và phát hành riêng, giới hạn tạo lại, phiên bản bất biến, nhật ký và nối thư viện Reading. Phase 2 có adapter browser để không phụ thuộc SQLite trên Vercel; API local vẫn có chế độ riêng.

Đây chưa phải Phase 3 beta đầy đủ: chưa có AI generator/quality evaluator thật, durable cloud jobs, auth/reviewer roles, RLS hoặc benchmark giáo viên. Self-review trên thiết bị không thay thế kiểm duyệt chuyên môn. Xem [ADR 0003](docs/decisions/0003-browser-demo-and-review.md).

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

Đã triển khai trong demo trình duyệt: dashboard `/progress`, lọc thời gian, Reading theo dạng và so sánh hai nhóm 3 lượt khi đủ dữ liệu, taxonomy lỗi quan sát được, gợi ý có lý do/tắt/bỏ qua/khôi phục và hàng đợi thử lại câu sai. Ôn không sửa điểm gốc. Migration browser v1→v2 giữ nguyên dữ liệu. Writing chỉ đếm bài/từ vì chưa có feedback thật; xu hướng criterion/band Writing và thống kê cloud chưa triển khai. Xem [ADR 0004](docs/decisions/0004-learning-loop.md).

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

Đã triển khai slice demo `/listening`: audio riêng lưu IndexedDB, audio mẫu gốc, adapter fixture/manual WebVTT có schema và timestamp checks, player/chọn đoạn/tốc độ, câu điền từ với cue dẫn chứng, tự lưu/revision/submit bất biến, lịch sử, JSON/audio export, hạn lưu 1/7/30 ngày và xóa theo bài/toàn bộ demo. UI desktop/mobile được kiểm tra trên build production trong cloud trước push/deploy. Xem [ADR 0005](docs/decisions/0005-listening-demo.md).

Bổ sung khôi phục từ JSON + audio: envelope versioned và tương thích JSON cũ, kiểm tra checksum/timestamp/lịch sử, tạo bản riêng với ID mới và hạn lưu mới, không ghi đè/nhập trùng. Xóa toàn bộ được tuần tự hóa với khôi phục đang chạy; không đưa audio đã xóa trở lại sau khi thao tác xóa kết thúc. Không có đồng bộ cloud hoặc restore Writing/Reading.

Chưa hoàn tất Phase 5 production: không có STT thật, private cloud upload/signed URL, auth/RLS, transcript quality benchmark hoặc kiểm duyệt giáo viên. Audio riêng không gửi provider; fixture không nhận dạng arbitrary audio. Cleanup chạy khi truy cập Listening, không chạy khi trình duyệt đóng. Bài nghe ngắn không phải đề IELTS hoàn chỉnh; điểm Listening chưa tham gia dashboard Reading. Bản này giữ local theo yêu cầu review trước triển khai.

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

### Trạng thái implementation

Slice browser demo `/speaking`: đề gốc versioned với Part 1/2/3, timer chuẩn bị
Part 2, microphone theo consent/action, record/stop/playback, transcript nhập tay,
checklist tự review và mục tiêu lần sau. Lưu explicit vào IndexedDB riêng,
history/resume, revision giữa tab, hoàn tất khóa text/checklist, xóa audio/phiên,
retention 1/7/30 ngày và export metadata/audio riêng. Xóa toàn bộ demo có cả
Speaking; không gửi audio/transcript tới backend hay AI.

Đây là experiment bổ sung theo yêu cầu, chưa phải complete IELTS examiner hoặc
exit của production Phase 6. STT thật, feedback AI, xác thực/cloud privacy và
human-reviewed benchmark chưa triển khai. Không gọi checklist là feedback từ
giáo viên. Xem [ADR 0006](docs/decisions/0006-speaking-demo.md) và
[evaluation protocol](docs/speaking-evaluation.md).

Kiểm tra local cloud sau review: lint/format/typecheck/build pass, 72 unit/integration tests
và 66 demo E2E desktop/mobile pass (22 ca Speaking, bao gồm các ca sửa lỗi). Đã review screenshot hai
kích thước; chưa push/deploy. Xem [validation](docs/validation-speaking.md).

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

### Trạng thái sau review Phase 6

Chưa bắt đầu Expo. Review đã sửa thời lượng ghi âm khi encoder đóng chậm,
retention 30 ngày mở tab liên tục (cả Listening/Speaking), đóng capture khi hết
hạn dù storage lỗi và giữ player/bản nháp khi phiên khác thay đổi.
Theo lựa chọn web local, hoãn Phase 7 mobile; không cần cloud auth hoặc usage
công khai để tiếp tục cải thiện app trên máy. Hướng tiếp theo trong
[readiness assessment](docs/phase7-readiness.md): hoàn thiện workflow, backup/restore
và xem xét backend local cho toàn bộ tính năng. Các deliverables/điều kiện mobile
bên dưới chỉ áp dụng khi quay lại nhu cầu native app.

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

Checkpoint nguồn mở (2026-10-05): gói mẫu source-only đã thêm VOA/Wikipedia/Aesop và audio VOA local, với license/attribution/download riêng; thêm preview Speaking/Writing gốc. Bước sau: chọn thêm tài liệu, xác minh license mỗi asset, thiết kế câu hỏi/timestamp và reviewer duyệt trước khi publish. Common Voice cần release/download terms từ MDC; LibriVox cần clip/narrator và kiểm tra quyền theo lãnh thổ. Xem ADR 0011.

Concept Learning Hub được triển khai theo MVP trước: Home hướng bước tiếp theo, Practice, sidebar/mobile navigation, Light/Dark/System và Writing split view. Các checkpoint tiếp theo: Vocabulary có nguồn và ôn cách quãng; Mock Test có contract thời gian/attempt riêng; AI Writing/Speaking thật với consent và benchmark. Không đưa điểm minh họa lên Home như band năng lực.

Checkpoint phản hồi UI lần 2: thư viện Writing/Speaking riêng với màn hình làm bài, đề ngẫu nhiên bốn kỹ năng (Listening trong bài đã lưu), Writing Academic Task 1 dạng bảng gốc không chấm band và Speaking đọc/che câu hỏi bằng giọng local. Chart schema production, Task 1 evaluator và TTS đa speaker vẫn thuộc backlog; xem ADR 0009.

1. Giữ workflow chạy local đơn giản, build/review trước mọi triển khai. Windows có launcher `scripts/start-local.ps1` kiểm tra Node 24 và giữ URL loopback cố định; format hỗ trợ EOL của checkout Windows.
2. Hoàn thiện luyện tập, trạng thái lưu/lỗi và khả năng tiếp tục bài giữa các phiên.
3. Checkpoint backup/restore đã triển khai: trang Sao lưu, import Writing/Reading/Tạo đề/Tiến độ, Speaking portable JSON gồm audio và Listening JSON/audio. Từng nhóm độc lập, không ghi đè dữ liệu hiện có; xem [ADR 0008](docs/decisions/0008-local-backup-and-restore.md).
4. Khi cần lưu bền trên máy, thiết kế backend local cho cả bốn kỹ năng trước khi chuyển khỏi browser storage.
5. Xem xét AI thật và benchmark riêng khi có nhu cầu; hoãn cloud/public beta/Expo.

UI local và checkpoint sao lưu đã triển khai. Backend local thống nhất và AI thật là kế hoạch tiếp theo, chưa triển khai.
