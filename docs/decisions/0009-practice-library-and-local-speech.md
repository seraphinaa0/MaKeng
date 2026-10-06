# ADR 0009 — Thư viện riêng, Task 1 và giọng đọc trên thiết bị

Theo yêu cầu người dùng, thư viện chọn đề và màn hình làm bài tách thành các trạng thái riêng. Đề ngẫu nhiên chỉ chọn trong bộ lọc hiện tại, không tự thay bản nháp có nội dung. Speaking thêm bộ đề gốc, giữ cấu trúc năm câu Part 1/2/3 và mở rộng ID schema không phá phiên cũ.

Academic Writing Task 1 bản local có bảng dữ liệu gốc, hướng dẫn 150 từ và tự kiểm tra, không chấm band. Prompt lưu toàn bộ số liệu với tiền tố `[Academic Task 1]` trong contract hiện có để export/restore vẫn giữ đề; đây chưa phải chart schema cho production. Browser submission cho Task 1 có evaluation/overall null. Backup vẫn đọc bài Task 2 cũ và kiểm tra cặp null chỉ cho Task 1. SQLite/worker Task 2 không đổi; thư viện Task 1 chỉ có trong browser demo.

Speaking dùng SpeechSynthesis, chỉ chọn giọng tiếng Anh có localService=true; không fallback sang dịch vụ từ xa. Không có giọng phù hợp thì giải thích và vẫn cho luyện bằng chữ. Chỉ đọc sau thao tác người dùng, hủy trước ghi âm, khi chuyển câu/rời trang/ẩn tab. Ẩn câu hỏi là bỏ chữ khỏi DOM, không chỉ blur. Không gọi AI/STT hoặc gửi transcript.
