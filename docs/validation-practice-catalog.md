# Kiểm chứng thư viện luyện tập — 2026-10-04

## Phạm vi

- Writing thư viện → viết → xem lại; tìm kiếm và Task 1/2, random theo bộ lọc, xác nhận bỏ nháp khi đổi đề.
- Academic Task 1: hai bảng số liệu gốc, 150 từ gợi ý, nháp/lịch sử/backup không có band/evaluation mock Task 2.
- Speaking: ba bộ đề, chọn đề/thiết lập/lịch sử riêng, local English TTS, chọn giọng/tốc độ, che chữ khỏi DOM, giữ che qua chuyển câu; hủy TTS trước capture, khi chuyển câu, ẩn tab và rời trang.
- Reading random từ thư viện; Listening random từ bài đã lưu. Không thêm AI/STT hoặc dịch vụ TTS từ xa.

## Kết quả

- TypeScript, ESLint, production build: pass.
- Vitest: 84 tests pass.
- Playwright toàn bộ: 86 desktop/mobile tests pass trên build production (4.8 phút). Bao gồm hồi quy backup, revision, microphone, retention, xóa dữ liệu, Reading và Writing.
- Chạy lại 6 ca catalog desktop/mobile sau bổ sung kiểm tra TTS hủy trước yêu cầu microphone và ảnh màn hình: pass. Task 1 và Speaking che câu hỏi không tràn ngang; đã xem ảnh Task 1 desktop và Speaking mobile.
- Format toàn bộ file thay đổi trong checkpoint: pass. Check toàn repo vẫn cảnh báo hai file không sửa trong checkpoint: `docs/validation-reading.md`, `docs/validation-writing.md`; giữ nguyên các file này.
- Đã xem ảnh thư viện Writing/Speaking desktop và Writing mobile. Không tràn ngang trong kiểm tra các route.

TTS có test fake SpeechSynthesis kiểm tra chỉ chọn local English, truyền đúng câu hỏi khi đang che chữ, hủy khi chuyển câu và fallback không có giọng. Đây không phải kiểm chứng chất lượng nghe thực tế của giọng cài trên máy người dùng. Chất lượng/khả dụng phụ thuộc trình duyệt và giọng hệ điều hành; app báo rõ khi thiếu.

Giữ dữ liệu phiên/bản nháp cũ. Không commit/push/deploy. App local được khởi động lại tại `http://127.0.0.1:3000`.
