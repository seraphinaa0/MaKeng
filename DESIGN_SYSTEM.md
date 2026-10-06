# MaKeng — Design System

## 1. Mục tiêu trải nghiệm

### Concept hiện hành — Reference-first lumen rebuild

Yêu cầu expressive motion thay thế pass hiệu ứng nhẹ trước đó: launcher Home
có flash/dải sáng conic chạy quanh viền khi hover/focus và gợi ý trượt-fade mỗi
2 giây khi trống. Icon SVG lật trang sách, nhịp tai nghe, microphone và bút viết.
Sidebar có pill đo vị trí thật; skill/navigation chuyển cảnh slide/blur/stretch.
Theme Ambient là màu lavender tĩnh, không phát âm thanh. Settings `/settings`
tách cấu hình/quyền/audio/sao lưu; avatar là cá nhân hóa, Pomodoro và tùy chỉnh
motion. Logo SVG sách/M/đường tiến lên. Reduced motion và lựa chọn tắt motion
được ưu tiên. Đây là yêu cầu cụ thể của user, thay thế nguyên tắc không animation
lặp ở mục 9 cho beam/icon chỉ khi hover và gợi ý ô trống. Xem ADR 0016.

Sửa theo screenshot preview: sidebar nằm ngoài header, cố định 170px trên
desktop để không bị `order` của navigation cũ đẩy xuống dưới Settings/Pro.
Practice dùng tile ngang gọn (icon, tên, metadata), Learning mode riêng bên
dưới; bỏ mô tả/translation/footer lặp. Có nút Sáng/Tối ngay header, giữ lựa chọn
theme đã lưu. Dark không còn radial wash xám sáng. Xem ADR 0015.

Pass thiết kế bằng skill GitHub `frontend-design`: dùng Manrope variable tự
host (OFL), nhịp chữ rõ hơn, Practice grid 2×2 với action mở thư viện và metadata
thật. Mock Test không có arrow giả. Xem ADR 0014; ảnh lumen vẫn là brief ưu tiên.

Yêu cầu mới nhất thay thế toàn bộ cấu trúc dashboard, không chỉ đổi skin.
Layout chỉ import `globals.css` cho các luồng nghiệp vụ cũ và `lumen.css` cho
presentation mới; không import hai skin Learning Hub / Quiet Workspace.
Home dùng cấu trúc trong ảnh: lời chào, launcher, bốn skill pill, một continuation
card và ba focus row. Không còn breadcrumb, analytics/band card hay banner ở đầu.
Mobile có lời chào riêng, continuation gọn và bottom navigation năm mục.
Settings giữ theme, disclosures, bốn thư viện, công cụ nguồn/tạo đề/sao lưu.
Brand hiển thị MaKeng theo yêu cầu khôi phục tên mới nhất; lumen chỉ là tên
ảnh tham chiếu và class CSS nội bộ. Dữ liệu và storage keys MaKeng giữ nguyên.

Khi có bài đang luyện, shell Home được thay bằng thanh Back / skill Practice /
Learning mode / Settings. Reading chia passage/questions, có Previous/Next và
Highlight/Notes; note local không nằm trong backup, dùng key phiên để được xóa
cùng dữ liệu phiên. Writing có toolbar thay đổi kiểu hiển thị toàn bản nháp,
không phải rich-text theo vùng chọn; nội dung lưu vẫn plain text. Listening dùng
custom controls thao tác audio thật. Speaking tách interview và self-review,
ẩn voice settings trong disclosure. Progress vẽ accuracy từ attempt thực tế,
không tạo band curve. Xem ADR 0013.

Hai ảnh trang trí được tạo bằng imagegen, lưu local trong `public/images`.
Các mục Vocabulary, AI Tutor, Mock Test, Pro chưa có logic được ghi unavailable
thay vì giả lập. Không tuyên bố đã đạt pixel-equivalence 100% từ ảnh tổng hợp.

### Concept trước — Quiet IELTS workspace (2026-10-05)

Ảnh tham chiếu mới nhất thay thế skin indigo dashboard bên dưới: khung bo góc
trên nền lavender, surface trắng/off-white, primary violet `#6146ee`, chữ
`#19192f` và viền `#e7e6f1`. Dark theme giữ surface tối và primary sáng.
Home có silhouette núi SVG nhẹ, launcher mở thư viện theo tên kỹ năng, bốn
shortcut nhỏ và bố cục Tiếp tục học / Hôm nay tập trung. Sidebar dùng icon nét
mảnh, chia điều hướng chính, kỹ năng và công cụ; mobile giữ bottom navigation.
Speaking dùng nút microphone tròn đồng tâm; thao tác ghi âm và consent giữ
nguyên. Reading và Writing vẫn chia hai vùng trên desktop. Không thêm AI tutor,
Pro, band hoặc streak giả theo ảnh mẫu. Xem ADR 0012.

### Concept trước — IELTS Learning Hub

Concept mới của người dùng thay thế skin xanh lá và điều hướng ngang trước đó: nền light `#f7f8fc`, indigo `#414bb2`, accent violet, thẻ trắng; dark palette dùng nền `#101421`, surface `#191f30`, chữ sáng và primary `#a5adff`. Semantic token dùng xuyên suốt màn hình cũ và mới. Font stack Geist/Inter/Segoe UI/system, không tải font bên ngoài.

Home tập trung vào bước tiếp theo và bài đang làm, không đổ analytics vào đầu trang. Desktop sidebar phân nhóm luyện tập và công cụ; mobile thanh Home/Practice/Speaking/Tiến độ và Menu truy cập các mục còn lại. Không profile giả, streak giả, điểm band suy ra từ mock. Theme Sáng/Tối/Hệ thống có lưu lựa chọn và fallback khi storage chặn. Writing desktop chia đề/editor, mobile một cột; Reading split pane giữ nguyên. Mock Test và Vocabulary chưa được làm trong checkpoint MVP này.

### Cập nhật giao diện local — 2026-10-04

Theo yêu cầu thiết kế lại, dùng nền sáng ấm và xanh lá làm primary. Điều hướng ngang có icon và nhãn, một khối hướng dẫn ba bước theo kỹ năng, và nút Tập trung thu gọn khối hướng dẫn, giảm độ nổi bật của các mục điều hướng khác. Thông tin lưu trữ được đặt trong disclosure có thể mở bằng bàn phím; consent và cảnh báo liên quan vẫn ở luồng thao tác.

Thiết kế hướng tới giảm tải nhận thức bằng phân nhóm, tạo điểm bắt đầu nhỏ bằng lời dẫn và phản hồi tiến độ bằng dữ liệu thật. Writing có thanh số từ so với mục tiêu gợi ý 250; đây không phải điểm chất lượng hoặc điều kiện nộp mới. Không có streak, thưởng giả hay đếm ngược gây áp lực. Đây là giả thuyết thiết kế cần kiểm chứng khi sử dụng thực tế, không phải cam kết cải thiện tập trung.

Token giao diện: nền `#f6f7f2`, chữ `#21382f`, primary `#226448`, muted `#596b61`, accent `#b65e2c`. CSS chung áp dụng cho cả sáu màn hình; domain, API và storage contracts giữ nguyên. Nội dung tiếng Anh dài dùng serif, UI dùng system sans; không tải font bên ngoài. Tôn trọng reduced motion và giữ focus ring.

MaKeng cần tạo cảm giác tập trung, đáng tin và ít gây áp lực. Giao diện phải giống một không gian học tập chuyên nghiệp, không giống casino hóa bằng streak, badge và animation quá mức.

Ba thuộc tính chính:

- Calm: bố cục thoáng, ít màu cạnh tranh.
- Evidence-led: feedback luôn gắn với đoạn văn hoặc câu trả lời.
- Progress-oriented: nhấn mạnh bước cải thiện tiếp theo, không chỉ điểm số.

## 2. Nguyên tắc UI

Phản hồi tiếp theo (2026-10-04) thay thế luồng Writing một cột chọn đề + viết trên cùng màn hình: dùng thư viện thẻ đề → màn hình làm bài riêng → xem lại. Thư viện có hero định hướng, thẻ đánh số, metadata loại bài/chủ đề, bộ lọc và tìm kiếm khi hữu ích, chọn ngẫu nhiên và lối quay lại bản nháp. Speaking tách thư viện, thiết lập lượt luyện và lịch sử; nút che câu hỏi giữ chế độ khi chuyển câu. Điều hướng thêm nhãn tiếng Việt dưới tên kỹ năng, phân cách bốn kỹ năng với nhóm công cụ. Bố cục thẻ ba/hai/một cột; dữ liệu Task 1 có bảng semantic, không dùng hình ảnh làm nguồn số liệu duy nhất. Nhịp thị giác phong phú hơn nhưng không có thưởng giả hoặc animation gây phân tâm.

Theo phản hồi sử dụng đầu tiên, giao diện ưu tiên tối giản: thanh điều hướng ngang có Writing, Reading, Tạo đề và Tiến độ; bỏ sidebar, slogan và các khối trang trí. Writing dùng một cột theo thứ tự chọn đề → viết → nộp. Reading có thư viện bài ngắn; trên điện thoại chuyển giữa Bài đọc và Câu hỏi bằng hai nút rõ ràng. Lịch sử đặt cạnh thao tác luyện tập, trạng thái lưu được hiển thị ngay gần câu trả lời.

- Một màn hình có một primary action rõ ràng.
- Reading và Writing ưu tiên độ dễ đọc hơn mật độ tính năng.
- Không dùng màu là tín hiệu duy nhất cho đúng/sai.
- Loading dài phải hiển thị trạng thái job và cho phép rời trang.
- AI feedback phải phân biệt dữ kiện, nhận xét và gợi ý.
- Mọi band estimate phải đi kèm nhãn “AI estimate”.

## 3. Design tokens ban đầu

Token là semantic; component không hard-code màu tùy ý.

```text
color.background
color.surface
color.surfaceMuted
color.text
color.textMuted
color.border
color.primary
color.primaryContrast
color.success
color.warning
color.danger
color.info
color.evidence
```

Hướng màu đề xuất:

- Neutral ấm hoặc slate cho nền và chữ.
- Indigo/blue làm primary.
- Green chỉ dùng cho success.
- Amber cho warning/review.
- Red cho destructive/error, không dùng chỉ để trang trí.

## 4. Typography

- Font sans-serif có khả năng hiển thị tiếng Việt và tiếng Anh tốt.
- Body mặc định tối thiểu 16px.
- Reading passage dùng line-height khoảng 1.7–1.8.
- Độ dài dòng Reading khoảng 65–80 ký tự.
- Band score lớn nhưng không lấn át evidence và next steps.

Các cấp semantic:

```text
display
heading-1
heading-2
heading-3
body
body-small
label
caption
mono
```

## 5. Spacing và layout

- Dùng thang spacing nhất quán dựa trên 4px.
- Mobile-first cho layout, nhưng Reading desktop dùng split pane khi đủ rộng.
- Content page có max-width; dashboard có grid responsive.
- Không tạo nested scroll trừ Reading passage/question panes có chủ đích.

## 6. Component inventory beta

### Foundation

- Button, IconButton, Link.
- Input, Textarea, Select, Checkbox, Radio.
- Card, Alert, Badge, Tooltip, Dialog.
- Tabs, Accordion, Progress, Skeleton.
- Toast chỉ dùng cho sự kiện ngắn, không dùng cho lỗi cần xử lý.

### Domain components

- `BandEstimate`.
- `CriterionScoreCard`.
- `EvidenceQuote`.
- `FeedbackItem`.
- `JobStatus`.
- `QuestionRenderer` theo question type.
- `AnswerReview`.
- `PracticeNavigator`.
- `ContentReviewPanel`.
- `ProvenanceSummary`.

## 7. Writing experience

Phase 3 bổ sung mục điều hướng **Tạo đề** (`/create`), form nhập nguồn và màn hình duyệt hai cột trên desktop/một cột trên mobile. Trạng thái chưa lưu, chờ duyệt, bị từ chối, đã duyệt và đã phát hành tách biệt bằng chữ; duyệt không tự phát hành. Banner toàn app giải thích giới hạn demo trình duyệt.

- Prompt luôn còn nhìn thấy hoặc mở lại nhanh được.
- Word count cập nhật trực tiếp nhưng không gây cảnh báo liên tục.
- Autosave có trạng thái rõ ràng.
- Feedback nhóm theo bốn tiêu chí.
- Mỗi vấn đề có quote, explanation và suggested revision.
- Không tự thay toàn bộ bài viết rồi gọi đó là “sửa bài”.

## 8. Reading experience

- Desktop: passage và questions ở hai pane độc lập.
- Mobile: chuyển qua lại passage/questions mà không mất vị trí.
- Question palette thể hiện answered, current và flagged bằng cả màu lẫn icon/text.
- Review mode mới hiển thị đáp án và evidence.
- Hỗ trợ keyboard navigation cho câu hỏi.

## 9. Accessibility baseline

Interaction pass: `interactions.css` giữ palette/font/layout hiện tại; hover chỉ
cho phần tử bấm được (nâng tile 2px, arrow dịch 3px, navigation đổi nền), press
thu nhẹ nút/thẻ, focus có ring và radio đã chọn có viền rõ. Settings/Notes/voice
settings mở trong 150–180ms. Không animation lặp, parallax, âm thanh hoặc trì
hoãn hành động. Hover chuyển động chỉ áp dụng pointer fine; reduced motion bỏ
transition/animation/transform nhưng giữ feedback bằng màu/viền. Disabled không
tham gia. Skill frontend-design hướng hiệu ứng vào thao tác, không trang trí mọi
card; không đổi consent, autosave, audio hoặc điểm.

Phase 4 thêm **Tiến độ** với thẻ số liệu, meter có nhãn và số đúng/tổng câu, bộ lọc thời gian, gợi ý giải thích bằng văn bản và form ôn từng câu sai. Trạng thái Chưa ôn/Đã ôn phân biệt bằng chữ; không dùng màu hoặc band mock làm bằng chứng tiến bộ. Giữ một cột trên mobile, không thêm sidebar. Toggle gợi ý phản hồi ngay và hoàn nguyên nếu lưu thất bại.

- Đạt WCAG 2.2 AA cho beta.
- Focus ring luôn nhìn thấy.
- Contrast đạt chuẩn.
- Form control có label thật.
- Dialog quản lý focus và đóng bằng Escape.
- Error được liên kết với input bằng ARIA phù hợp.
- `prefers-reduced-motion` được tôn trọng.
- Audio/video sau này phải có transcript hoặc alternative tương ứng.

## 10. Responsive breakpoints

Breakpoint phục vụ layout, không phục vụ thiết bị cụ thể:

```text
compact: một cột
medium: navigation mở rộng, form rộng hơn
wide: Reading split pane, dashboard grid
```

## 11. Quy tắc cho coding agent

- Tái sử dụng component và token trước khi tạo biến thể mới.
- Không thêm màu, shadow hoặc spacing mới nếu chưa có lý do domain.
- Mỗi component mới phải có empty, loading, error và disabled state khi phù hợp.
- Kiểm tra giao diện ở compact và wide viewport.
- Không dùng placeholder text thay cho label.
