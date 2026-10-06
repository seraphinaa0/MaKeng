# MaKeng

### Cập nhật trải nghiệm web local

**Tài liệu nguồn mở** tại `/sources`: 3 trích đoạn Reading (VOA/Wikipedia/Aesop), 1 hội thoại VOA với MP3 local và transcript, nút tải JSON gồm văn bản/credit/license và tải audio riêng. Manifest: `packages/content/open-starter.json`. Đây là tài liệu nguồn, chưa phải bài IELTS có đáp án được duyệt. Common Voice/LibriVox được ghi rõ chưa nhập; không đảm bảo mọi nguồn miễn phí đều được dùng thương mại. Xem [ADR 0011](docs/decisions/0011-open-content-starter-pack.md).

Concept **IELTS Learning Hub**: Home tại `/` ưu tiên bài đang học dở và bước luyện tiếp theo; `/practice` mở bốn kỹ năng; Writing chuyển sang `/writing`. Có sidebar desktop, điều hướng mobile, theme Sáng/Tối/Theo hệ thống và Writing split-screen. Home không hiển thị band/streak giả; Vocabulary tự động, AI thật và Mock Test đầy đủ chưa triển khai. Bookmark Writing cũ `/?practice=1` hoặc `/?submission=…` vẫn mở được. Xem [ADR 0010](docs/decisions/0010-learning-hub-shell.md).

Writing/Speaking mở thư viện chọn đề trước khi làm bài. Writing có tìm kiếm, 5 đề Task 2 và Academic Task 1 (4 bảng số liệu gốc, 150+ từ, chưa chấm điểm). Có đề ngẫu nhiên trong danh sách đang xem; Listening chọn từ bài đã lưu. Speaking có 5 chủ đề, đọc câu hỏi bằng giọng tiếng Anh local, tốc độ đọc và che/hiện chữ. Giọng đọc cần hệ điều hành/trình duyệt cung cấp English local; khi thiếu giọng, app vẫn hỗ trợ luyện bằng chữ. Không gửi audio hoặc văn bản đến dịch vụ TTS từ xa. Xem [ADR 0009](docs/decisions/0009-practice-library-and-local-speech.md) và ADR 0011 cho phần mở rộng catalog.

Không gian luyện IELTS độc lập. Mặc định là demo Writing, Reading, Listening, Speaking và Tạo đề lưu trong trình duyệt, không cần API AI hoặc database. Chế độ API SQLite + worker cũ vẫn dùng được khi đặt `NEXT_PUBLIC_MAKENG_DEMO=false` trước khi chạy/build.

**Hướng hiện tại: web chạy local, chưa public.** Không cần Vercel, Supabase hoặc Expo để tiếp tục phát triển. Chạy trên máy của bạn theo mục [Chạy local](#chạy-local); `dev` và `start` chỉ lắng nghe ở `127.0.0.1`. Không tự push hoặc deploy trong giai đoạn này. Quyết định tại [ADR 0007](docs/decisions/0007-local-only-development.md).

Giao diện gồm **Home**, **Practice**, **Writing**, **Reading**, **Listening**, **Speaking**, **Tạo đề**, **Tiến độ** và **Sao lưu**. Writing desktop chia đề/bài viết, mobile một cột. Reading tại `/reading` có 5 bài mẫu gốc, mỗi bài 5 câu: trắc nghiệm, True/False/Not Given và điền từ. Bài mẫu có tình huống hư cấu, chưa được giáo viên duyệt hoặc hiệu chuẩn độ khó IELTS.

## Sao lưu & khôi phục local

Mở **Sao lưu** (`/backup`) để quản lý ba nhóm độc lập:

- **Writing/Reading/Tạo đề/Tiến độ:** xuất JSON tối đa 10 MiB, chọn file, kiểm tra số bài và xác nhận khôi phục. Hỗ trợ export schema v1/v2 cũ. Thêm bài, lượt đang làm, nguồn tạo đề, phiên bản đã tự duyệt và trạng thái ôn lỗi; không ghi đè mục có cùng mã hoặc content version trên thiết bị. Giữ thiết lập gợi ý hiện có; trình duyệt mới dùng thiết lập của bản sao.
- **Speaking:** mỗi phiên xuất một JSON mới chứa cả audio, transcript, checklist và đề, tối đa 140 MiB. Kiểm tra schema, kích thước, MIME và checksum audio, chọn hạn lưu 1/7/30 ngày và đồng ý lưu. Tạo ID mới, giữ ngày luyện/hoàn tất, khóa text của phiên đã hoàn tất và chặn nhập trùng snapshot. Thời lượng ghi âm vẫn là metadata wall-time của recorder.
- **Listening:** tải cả JSON và audio riêng của từng bài, rồi dùng form khôi phục ngay trong trang Sao lưu. Audio phải khớp checksum và timestamp của JSON.

Chỉ sao lưu dữ liệu đã lưu thành công. Nháp Writing trên editor, audio mới trong RAM, SQLite và audio đã hết hạn không nằm trong các bản sao này. JSON Speaking cũ chỉ có metadata không nhập được ở form mới. File chứa nội dung riêng tư, chưa được mã hóa; file đã tải do bạn quản lý, không tự bị xóa theo hạn lưu trong app. Khôi phục từng nhóm độc lập, không có transaction chung giữa localStorage và hai IndexedDB. Xem [ADR 0008](docs/decisions/0008-local-backup-and-restore.md).

## Phase 6 — Speaking trên thiết bị

Mở **Speaking** (`/speaking`), chọn hạn lưu và xác nhận consent để tạo lượt luyện.
Đề gốc Everyday learning gồm 2 câu Part 1, cue card Part 2 và 2 câu Part 3;
đây là buổi luyện rút gọn, chưa phải mô phỏng bài thi đầy đủ. Part 2 có timer
chuẩn bị 60 giây và giới hạn ghi âm 120 giây; các câu khác giới hạn 180 giây.
Không tự bật microphone. Bấm **Ghi âm**, **Dừng ghi âm**, nghe lại, nhập transcript
và bấm **Lưu câu trả lời**. Không có STT hoặc API AI, không yêu cầu key.

Audio mới ở RAM cho đến khi lưu; transcript/checklist không tự lưu. Chuyển câu
hoặc trang cần xác nhận bỏ bản nháp. Rời tab sẽ dừng ghi âm; rời phiên sẽ bỏ
bản chưa lưu và dừng cả microphone nhận quyền muộn. Tự review có bốn hướng:
mạch nói, từ vựng, ngữ pháp và độ dễ hiểu, cùng ghi chú dẫn chứng/mục tiêu;
checklist chỉ xác nhận người học đã tự kiểm tra. Không chấm accent, không tính
band hoặc suy ra phát âm/WPM từ transcript nhập tay.

**Hoàn tất phiên** xác nhận số câu còn trống rồi khóa transcript/checklist.
Có tiếp tục phiên đang luyện, xem phiên hoàn tất, xóa audio từng câu (kể cả đã
hoàn tất), hoặc xóa phiên kèm toàn bộ nội dung. Speaking dùng IndexedDB riêng,
atomic theo phiên, revision kiểm tra giữa tab; lưu không tạo lại phiên đã xóa.
Hạn lưu 1/7/30 ngày, mặc định 7; tự dọn khi truy cập/lấy nét tab hoặc hết hạn
lúc phiên đang mở. Giới hạn 20 phiên, 100 MiB audio, 20 MiB mỗi câu. Không có
xóa nền khi trình duyệt đã đóng. Thời lượng thu là ước tính wall time, không
phải độ dài speech được xác minh qua giải mã.

**Xuất JSON đã lưu** giữ metadata/transcript/checklist; **Tải audio** tải từng
bản ghi riêng. JSON cũ này không có import/restore; mục Sao lưu xuất định dạng mới gồm audio có thể khôi phục. Writing/Tạo đề export không chứa
Speaking. File đã tải nằm ngoài quyền xóa của app. Xóa toàn bộ demo ở Writing
hoặc Tạo đề xóa cả Listening và Speaking trước localStorage; ba store không
có transaction chung, lỗi ở bước sau có thể khiến xóa một phần, hãy thử lại.
Không có cloud sync, mã hóa riêng, tài khoản hay gộp vào Tiến độ Reading.

Speaking chỉ chạy trong browser demo; API SQLite cũ chưa có Speaking. Human
benchmark và phản hồi AI vẫn là tiêu chí production còn mở: xem
[ADR 0006](docs/decisions/0006-speaking-demo.md) và
[quy trình đánh giá](docs/speaking-evaluation.md). Tiếp tục build/review web
local; public deployment được hoãn theo lựa chọn hiện tại của người dùng.
Kết quả kiểm thử và giới hạn review tại [validation Speaking](docs/validation-speaking.md).

Review tiếp theo sửa thời lượng dừng ghi âm, timer retention 30 ngày cho cả
Listening/Speaking và việc reset player khi phiên khác thay đổi. Hết hạn đóng
recorder/player ngay; nếu storage lỗi, báo lỗi để retry dọn dữ liệu. Đánh giá
điều kiện chuyển mobile tại [Phase 7 readiness](docs/phase7-readiness.md).

## Phase 5 — Listening trên thiết bị

Mở **Listening** (`/listening`) trong chế độ demo. Bấm **Dùng bài nghe mẫu** để thử audio gốc tổng hợp khoảng 20 giây, ba câu điền từ. Trình phát có tốc độ nghe và chọn đoạn; câu trả lời tự lưu, có tiếp tục bài và lịch sử. Khi nộp bài, câu trả lời được giữ nguyên, mở transcript theo thời gian và nút nghe đoạn dẫn chứng cho từng đáp án. Chỉ tính số câu đúng; không quy đổi band.

**Nhập audio của bạn** nhận WAV/MP3/Ogg/WebM/MP4 audio có MIME tương ứng, trình duyệt giải mã được, tối đa 20 MiB/30 phút. Dán WebVTT văn bản thuần, kiểm tra timestamp (tăng, không chồng lấn, không vượt audio), nghe kiểm tra, rồi tự soạn câu điền từ với chỗ trống `___`, đáp án nguyên văn và cue dẫn chứng. Cần xác nhận quyền sử dụng và người kiểm duyệt trước khi lưu. Không có tự nhận dạng giọng nói: adapter hiện có là transcript thủ công và fixture chỉ cho đúng SHA-256 audio mẫu. Không có API key AI được dùng.

Audio riêng được giữ dưới dạng Blob trong IndexedDB, cùng transcript và attempts, không upload lên server, không thêm vào public assets. Khác với localStorage Writing/Reading, giới hạn thư viện là 10 bài/100 MiB audio. Mặc định lưu 7 ngày, tùy chọn 1/7/30 ngày; đổi hạn tính lại từ thời điểm đổi. Bài hết hạn bị dọn khi vào/quay lại Listening; trình duyệt đóng không có tác vụ xóa nền. Xóa từng bài xóa cả audio/transcript/attempts trong một transaction; xóa toàn bộ demo ở Writing/Tạo đề cũng xóa Listening. Nếu IndexedDB bị chặn, xóa toàn bộ báo lỗi và giữ dữ liệu localStorage; hai loại bộ nhớ không thể có một transaction chung. Tải lại các tab của bản cũ trước khi xóa dữ liệu toàn bộ.

Mỗi bài có **Xuất bài & lịch sử JSON** và **Tải audio** riêng. Mở **Khôi phục bản sao lưu Listening**, chọn hai file và kiểm tra tiêu đề/lượt luyện trước khi xác nhận quyền sử dụng cùng hạn lưu mới. JSON mới có envelope version 1; JSON cũ từ Listening vẫn dùng được. Giới hạn JSON 10 MiB và audio 20 MiB; file audio phải khớp SHA-256, kích thước và timestamp, tên file có thể khác. Khôi phục tạo bản riêng với ID mới, giữ nội dung, điểm và câu trả lời dang dở; không gộp/ghi đè bài cũ. Bản trùng bị chặn, kể cả khi hai tab khôi phục đồng thời. Bản sao lưu hết hạn có thể khôi phục sau khi chọn hạn lưu mới. Xóa toàn bộ trong lúc khôi phục sẽ chờ kiểm tra/lưu xong rồi xóa cả bản vừa khôi phục.

JSON export ở Tạo đề không chứa Listening/audio; khôi phục Writing/Reading tại mục Sao lưu. Bản tải về do người dùng quản lý, không bị xóa từ app. Không có đồng bộ thiết bị, mã hóa riêng, tài khoản hoặc dịch vụ STT thật. Nội dung/người kiểm duyệt trong JSON là thông tin tự khai, không phải xác nhận giáo viên; file nhập phải có nguồn và dẫn chứng hợp lệ. Transcript/timestamp chưa đạt benchmark có người kiểm tra; bài riêng tự kiểm duyệt không thay thế giáo viên. Listening chưa gộp vào Tiến độ Reading. Xem [ADR 0005](docs/decisions/0005-listening-demo.md), [nguồn audio](docs/listening-audio-credits.md) và [kiểm thử](docs/validation-listening.md).

Work Phase 5 được build và review trong cloud bằng Chromium desktop/mobile trước triển khai. Không thể truy cập máy Windows của người dùng từ workspace này. Giữ branch local, không push/deploy cho đến khi người dùng duyệt.

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

## Demo trình duyệt và Phase 3

- Web mặc định không gọi `/api/v1`; API trả `503 DEMO_ONLY` trước khi mở database. Không chạy worker trên Vercel.
- Dữ liệu trong localStorage riêng theo browser/origin. Đổi domain, trình duyệt hoặc xóa dữ liệu website sẽ không thấy lịch sử cũ. Không tự di chuyển dữ liệu SQLite sang demo. Không gửi essay/source tới AI hay API.
- Cần HTTPS (hoặc localhost) và trình duyệt hiện đại hỗ trợ Web Locks. Ghi dữ liệu được khóa giữa các tab, kiểm tra revision, và báo lỗi khi storage bị chặn/đầy. Dữ liệu hỏng không bị ghi đè tự động.
- Answer key nằm trong browser bundle/storage: chỉ phù hợp luyện thử, không dùng làm hệ thống thi bảo mật. Không có tài khoản, phân quyền reviewer hay đồng bộ cloud.
- Vercel không thuộc workflow hiện tại. `apps/web/vercel.json` tắt deployment tự động từ Git cho project có root `apps/web`; deployment thủ công vẫn có thể được tạo. Quyết định chạy local không tự xóa hoặc tắt các deployment đã tạo trước đây.

Tại `/create`:

1. Nhập tiêu đề, tác giả, văn bản tiếng Anh gốc (100–15.000 ký tự) và xác nhận sở hữu. Hiện chỉ hỗ trợ nguồn do chính người dùng sở hữu, không import PDF/URL hoặc nội dung có bản quyền bên thứ ba.
2. Tạo 3 câu mẫu bằng quy tắc (MCQ, TFNG, completion). Đây **không phải AI generation**; cần sửa distractors/độ khó. Nguồn được chuẩn hóa thành đoạn và evidence offsets.
3. Sửa câu hỏi, lựa chọn, đáp án, giới hạn từ, giải thích và trích dẫn. Lưu sửa đổi; kiểm tra cấu trúc không thay thế kiểm tra ý nghĩa. Trước khi lưu, bản sửa chỉ nằm trong bộ nhớ trang; có thể tải JSON để sao lưu.
4. Có thể từ chối kèm lý do, sửa lại, hoặc tạo lại tối đa 3 lần tổng cộng trên mỗi revision nội dung. Tạo lại thay thế câu hỏi và cần xác nhận.
5. Nhập tên người tự duyệt, xác nhận kiểm tra, bấm **Duyệt bản nháp** rồi **Phát hành trên thiết bị**. Chỉ lúc này bài xuất hiện trong thư viện Reading; draft chưa duyệt không xuất hiện. Đây là self-review demo, không phải quyền reviewer được xác thực.
6. Bản đã phát hành bị khóa; tạo phiên bản mới để sửa. Thư viện dùng bản published mới nhất; attempt đang làm giữ snapshot cũ. Nhật ký lưu thao tác, thời gian, tên reviewer/lý do.
7. **Xuất dữ liệu demo** tải JSON để sao lưu (khôi phục ở mục Sao lưu); **Xóa dữ liệu demo** xóa bộ nhớ demo và bản nháp luyện tập sau xác nhận. Writing cũng có xóa toàn bộ dữ liệu phiên.

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

Lệnh `dev` chạy Next.js demo trên loopback port 3000, không chạy worker. Trên chính máy chạy lệnh, mở `http://127.0.0.1:3000`. Dừng bằng Ctrl+C. Dùng cùng trình duyệt, hostname và port để truy cập lại dữ liệu; `localhost:3000` và `127.0.0.1:3000` có bộ nhớ riêng.

Trên Windows, sau khi đã có dependency, có thể chạy launcher PowerShell từ root repo. Launcher kiểm tra Node 24, dùng trực tiếp Next.js đã cài, không phụ thuộc `pnpm` có trong PATH, và giữ cố định hostname/port:

```powershell
pwsh -File .\scripts\start-local.ps1 -Rebuild
# Các lần sau, dùng lại production build:
pwsh -File .\scripts\start-local.ps1
# Khi phát triển:
pwsh -File .\scripts\start-local.ps1 -Mode dev
```

Launcher không tự cài dependency hoặc mở trình duyệt. Giữ cửa sổ chạy lệnh mở trong lúc học.

Đây là chế độ có đầy đủ các màn hình hiện tại. Nếu đã bật `NEXT_PUBLIC_MAKENG_DEMO=false`, bỏ cấu hình đó trước khi chạy/build lại (PowerShell: `Remove-Item Env:NEXT_PUBLIC_MAKENG_DEMO -ErrorAction SilentlyContinue`; bash: `unset NEXT_PUBLIC_MAKENG_DEMO`). Chạy local không đồng nghĩa khởi động hoàn toàn offline; chưa có offline app cache. Dữ liệu trình duyệt không phải bản backup: export trước khi xóa dữ liệu website, đổi origin hoặc đổi trình duyệt.

```sh
pnpm build
pnpm start
```

`start` chạy web demo từ build trước đó. Chế độ API SQLite + worker cũ chỉ hỗ trợ Writing/Reading; Listening, Speaking, Tạo đề và Tiến độ hiện dùng chế độ demo trình duyệt. Để thử API cũ:

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
pnpm dev:local
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

| Method     | Endpoint                                | Hành vi                                             |
| ---------- | --------------------------------------- | --------------------------------------------------- |
| GET        | `/api/v1/session`                       | Tạo/khôi phục phiên local và trả thư viện đề        |
| DELETE     | `/api/v1/session`                       | Xóa phiên, bài, kết quả và model runs liên quan     |
| POST       | `/api/v1/writing/submissions`           | Lưu bài + enqueue job, trả `202` và `jobId`         |
| GET        | `/api/v1/writing/submissions?offset=0`  | Lịch sử phân trang, tối đa 20 bài/trang             |
| GET/DELETE | `/api/v1/writing/submissions/:id`       | Xem hoặc xóa bài của phiên hiện tại                 |
| POST       | `/api/v1/writing/submissions/:id/retry` | Thử lại bài lỗi khi chưa quá 3 attempts             |
| GET        | `/api/v1/jobs/:id`                      | Trạng thái job và kết quả, không chạy job trong GET |

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

Ưu tiên tiếp theo: hoàn thiện trải nghiệm web local, khả năng sao lưu/khôi phục và lưu trữ trên máy. Adapter AI thật là bước riêng khi cần; tài khoản cloud, beta public và native mobile được hoãn. Xem [hướng phát triển sau Phase 6](docs/phase7-readiness.md).
