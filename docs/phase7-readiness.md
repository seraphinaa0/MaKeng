# Sau Phase 6: ưu tiên web local

Theo yêu cầu hiện tại, MaKeng tiếp tục là web chạy trên máy cá nhân, chưa public.
Phase 7 mobile/Expo và nền tảng cloud được hoãn. Đánh giá trước đó đề xuất cloud
auth, lịch sử giữa thiết bị và usage/retention cho native app; những điều này
không phải điều kiện để tiếp tục phát triển web local.
Xem [ADR 0007](decisions/0007-local-only-development.md).

## Hiện có

`pnpm dev` và `pnpm start` chỉ bind `127.0.0.1`. Chế độ mặc định có Writing,
Reading, Listening, Speaking, Tạo đề và Tiến độ, lưu trong localStorage/IndexedDB.
Không cần tài khoản, Docker, dịch vụ database hay AI API key. SQLite/worker là
chế độ tùy chọn cho Writing/Reading cũ, chưa thay thế được browser storage cho
các tính năng còn lại. Đây chưa phải app khởi động hoàn toàn offline.

Writing dùng feedback mock; Listening/Speaking dùng transcript manual và Speaking
chỉ hỗ trợ tự review. Không suy ra chất lượng chấm AI hay band thực tế từ các
test workflow. Review Chromium trong workspace không thay thế kiểm tra microphone
và trình duyệt trên máy Windows của người dùng.

## Ưu tiên phát triển tiếp

| Hạng mục       | Hiện tại                                                                                                     | Công việc đề xuất                                                                                   |
| -------------- | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| Chạy và review | Loopback, không cần deploy                                                                                   | Kiểm tra khởi động, lưu/mở lại bài và ghi âm trên máy sử dụng thực tế                               |
| Sao lưu        | Trang `/backup` có export/restore Writing/Reading/Tạo đề/Tiến độ, Speaking gồm audio và Listening JSON/audio | Kiểm tra bản sao định kỳ; nháp chưa lưu và SQLite vẫn ngoài phạm vi                                 |
| Dữ liệu bền    | Theo browser/origin; SQLite chỉ Writing/Reading                                                              | Nếu cần, mở rộng backend local để lưu đủ lịch sử/audio trên máy trước khi đổi chế độ mặc định       |
| UI học tập     | Bốn kỹ năng với giới hạn mock/manual                                                                         | Hoàn thiện luồng luyện, báo trạng thái lưu, tiếp tục bài và xử lý lỗi                               |
| AI thật        | Chưa có live provider                                                                                        | Bước riêng khi cần: adapter server/worker local, schema/evaluation và consent trước khi gửi dữ liệu |

Checkpoint sao lưu/khôi phục đã được triển khai theo [ADR 0008](decisions/0008-local-backup-and-restore.md), từng nhóm độc lập. Backend local đủ bốn kỹ năng
và AI/STT thật chưa được triển khai. AI chạy qua dịch vụ bên ngoài vẫn gửi dữ liệu ra ngoài máy dù
web chạy local; mô hình AI trên máy là một lựa chọn khác cần đánh giá riêng.

## Khi quay lại mobile hoặc public

Chỉ mở lại Expo khi có nhu cầu cụ thể mà web không đáp ứng. Shared contracts và
offline policy cần phù hợp cách native app đọc/ghi dữ liệu; login và cloud sync
chỉ cần khi chọn tài khoản hoặc lịch sử giữa thiết bị. Usage/retention là bằng
chứng sản phẩm cho hướng nhiều người dùng, không cần thu analytics công khai cho
một công cụ local cá nhân.

Nếu sau này public, vẫn cần authorization/ownership, persistence phù hợp triển
khai, quyền truy cập audio riêng tư và benchmark trước tuyên bố chấm điểm. Không
public adapter SQLite hiện tại. Không tự push/deploy trong giai đoạn local-only;
quyết định này không tự thay đổi các deployment Vercel đã tồn tại.
