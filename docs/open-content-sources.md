# Gói tài liệu nguồn mở — 2026-10-05

Gói mẫu nhỏ theo yêu cầu người dùng, không phải sao chép toàn kho. Mở `/sources` hoặc **Practice → Mở tài liệu nguồn**. Có lọc Reading/Listening, tải JSON gồm text + credit + license; MP3 tải riêng. Không có tracking/provider bên thứ ba khi đọc/nghe trong app; link nguồn mở ngoài chỉ khi người dùng chọn.

## Đã nhập

| Tài liệu                                       | Loại                                 | Quyền ghi trong manifest               | Thay đổi                                                                        |
| ---------------------------------------------- | ------------------------------------ | -------------------------------------- | ------------------------------------------------------------------------------- |
| VOA — New English Tests Are Better, but Harder | Reading, 3 đoạn narration chọn lọc   | VOA-produced public domain, credit VOA | Không liên tiếp; không chép quote phỏng vấn, ảnh/video/quiz; thông tin năm 2014 |
| Wikipedia — Urban heat island                  | Reading, 2 đoạn mở đầu               | CC BY-SA 4.0                           | Bỏ reference markers/hyperlinks trong câu; giữ revision 1376668977 và history   |
| Aesop — The North Wind and the Sun             | Reading                              | PD-US, Townsend mất năm 1900           | Văn bản truyện/moral, không wrapper/illustrations                               |
| VOA — Lesson 1: Welcome!, Conversation         | Listening, MP3 ~29 giây + transcript | VOA-produced public domain, credit VOA | MP3 gốc; transcript conversation không có timestamp                             |

Manifest: `packages/content/open-starter.json`, schema: `packages/content/open-content.ts`. Audio: `apps/web/public/audio/voa-welcome.mp3`, 236,944 bytes, SHA-256 `f9bd90edddbb8736f64fb5cb3a34ab5a27aecd6e99510977e7b820caf47c5cf7`.

Audio/text nguồn chưa có câu hỏi, đáp án hay timestamp được reviewer duyệt. Không giả provenance `original-project-content`; không làm thay đổi Reading/Listening runtime, điểm, attempt, dữ liệu audio riêng hoặc backup. JSON tải ở `/sources` là gói nguồn, **không phải file restore trong Sao lưu**.

## Nội dung gốc bổ sung

- Speaking: Environment & small habits, Travel & connections. Mỗi bộ 2 câu Part 1, 1 cue card Part 2, 2 câu Part 3; giữ thứ tự ba bộ cũ.
- Task 2: Digital services for everyone; Repair or replace? Tổng catalog: 5.
- Task 1: Household energy (hai cột phần trăm, tổng mỗi cột 100%); Community course enrolments. Tổng catalog: 4 bảng. Số liệu giả lập, không gọi là khảo sát thật; không chấm band.

Các đề vẫn là preview gốc chưa hiệu chuẩn độ khó, không chép đề thi chính thức. Không gọi truyện ngụ ngôn hoặc hội thoại Level 1 là passage/section IELTS hoàn chỉnh.

## Chưa nhập và điều kiện tiếp theo

**Common Voice:** người dùng cần chọn/download release English cụ thể từ Mozilla Data Collective. Giữ dataset card, release ID, CC0/license thực tế và download terms trước khi chọn clip để phân phối. Không đăng ký hay accept terms thay người dùng; không lấy mirror để tránh governance terms. [MDC FAQ về phân phối](https://community.mozilladatacollective.com/faq-can-i-get-the-common-voice-or-other-mdc-datasets-from-other-platforms-like-github-or-hugging-face/).

**LibriVox:** đã tìm [catalog Three Hundred Aesop’s Fables](https://librivox.org/300-aesops-fables-by-george-fyler-townsend/), nhưng chưa tải audio: chưa chọn/xác minh clip/narrator cụ thể, truy cập catalog không ổn định. [LibriVox About](https://librivox.org/pages/about-librivox/) nói bản ghi dành tặng cho public domain; [About listening](https://librivox.org/pages/about-listening-to-librivox/) lưu ý public domain tại Hoa Kỳ không nhất thiết ở mọi quốc gia. Chưa tuyên bố quyền thương mại toàn cầu.

## Hồ sơ quyền sử dụng

- [VOA Copyright Statement](https://learningenglish.voanews.com/p/6021.html): chỉ material sản xuất độc quyền bởi VOA; loại material bên thứ ba. Không copy logo/ảnh AP hoặc ghi credit để thay permission.
- [Wikimedia Terms §7](https://foundation.wikimedia.org/wiki/Policy:Terms_of_Use#7._Licensing_of_Content): attribution, license và thông báo sửa đổi. Đoạn Wikipedia phân phối theo [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/); khi làm derivative, giữ ShareAlike ở nội dung đó. Không đổi license toàn repo.
- [Gutenberg #21](https://www.gutenberg.org/ebooks/21): credit bản dịch Townsend, xác nhận PD tại Mỹ. Kiểm tra luật tại lãnh thổ triển khai trước khi phát hành/thương mại; ngày mất tác giả không tự chứng minh mọi bản dịch/bản ghi đều PD.

## Validation

Unit suite: 88/88 đạt; gồm checksum/bytes asset, source-only manifest, license/credits, duplicate IDs, chặn remote audio trong manifest, kiểm tra tổng dữ liệu Task 1 và default catalog cũ.

TypeScript/ESLint/production build và formatter các file thay đổi đạt. Targeted E2E ban đầu 12/14 đạt; hai test TTS phát hiện thứ tự bộ cũ đổi, đã đưa đề mới xuống cuối catalog và build lại. Full suite trên production build cuối: **98/98 desktop/mobile đạt (5.5 phút)**, gồm TTS, dữ liệu học, audio riêng và backup/restore. App đã chạy lại ở `http://127.0.0.1:3000/sources`.

Đã xem screenshot desktop/mobile dark mode. E2E nguồn kiểm tra tải JSON, filter, link credit/license/history, duration/playback MP3 local, không gọi remote media, audio lỗi, navigation và catalog mới. Không có AI/STT thật hoặc publish/deploy trong checkpoint.
