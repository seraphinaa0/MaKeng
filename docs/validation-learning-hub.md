# Learning Hub — kiểm chứng local MVP

Ngày: 2026-10-04. Phạm vi: ADR 0010, không push/deploy.

## Phạm vi đã làm

- Home `/`: ưu tiên bài đang học, mở gợi ý Reading trực tiếp, hiển thị số hoạt động thật. Đọc lại draft Writing và ID bài Reading/Listening/Speaking, không tạo phiên mới khi mở Home.
- `/practice`: thư viện bốn kỹ năng; `/writing`: thư viện và workspace Writing. Query Writing cũ ở root tiếp tục hoạt động.
- Shell desktop sidebar, mobile menu/bottom navigation; theme sáng/tối/theo hệ thống, lưu riêng trên trình duyệt.
- Writing chia đề và editor trên desktop; Reading giữ split pane và logic đáp án. Không thay đổi schema bài học.
- Lỗi đọc storage được báo theo nguồn, không chuyển thành số hoạt động 0. Không thêm band, tài khoản hay streak giả.

## Kiểm chứng

- TypeScript, ESLint và production build: đạt.
- Vitest: 84/84 tests đạt.
- Playwright production build cuối: toàn bộ 94 cases chạy, 93 đạt và 1 lỗi test do đọc IndexedDB trong lúc hard navigation sau xóa. Đã thêm chờ URL `/writing` và thư viện render xong; chạy lại test đó trên cả desktop/mobile: 2/2 đạt. Đây là kết quả toàn suite cộng targeted rerun, không phải một lượt full suite 94/94.
- Đã xem ảnh Home light/dark desktop/mobile, Writing Task 1 split pane và trang tạo đề; kiểm thử layout đo vị trí main để phát hiện sidebar che nội dung, ngoài kiểm tra không tràn ngang.
- Một lượt kiểm thử trước bị dừng sau khi phát hiện margin của trang Create/Listening ghi đè shell. Đã tăng specificity layout và chạy lại toàn bộ; không tính lượt bị dừng là đạt.

## Chưa thuộc MVP này

Vocabulary/spaced repetition, Mock Test đủ điều kiện thi, AI/STT thật, band đã hiệu chuẩn và inline Writing feedback chưa được triển khai. Speaking vẫn tự đánh giá, Task 2 vẫn điểm minh họa. Theme preference không thuộc file backup học tập.

Các file thay đổi được kiểm tra formatter riêng; không tuyên bố toàn repo đạt formatter, vì hai tài liệu cũ `validation-reading.md`/`validation-writing.md` có khác biệt định dạng chưa thuộc phạm vi sửa.
