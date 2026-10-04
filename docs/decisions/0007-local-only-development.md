# ADR 0007 — Local-only web development

## Quyết định

Người dùng muốn app web chỉ chạy local, chưa public. Ưu tiên này thay thế hướng
triển khai Vercel trước đây trong ADR 0003 và đề xuất cloud foundation sau Phase 6.
Tiếp tục phát triển/review web; hoãn public deployment, Supabase và Expo. Không
tự push hoặc deploy; không tự xóa/tắt deployment đã tồn tại.

## Cách áp dụng hiện tại

Giữ scripts `dev`/`start` bind `127.0.0.1` và browser demo mặc định. Chế độ này
đã hỗ trợ toàn bộ màn hình; không cần AI key hay tài khoản. SQLite/worker tùy
chọn vẫn chỉ hỗ trợ Writing/Reading. Không đổi mode hoặc di chuyển/xóa dữ liệu
của người dùng trong quyết định này.

Browser storage phụ thuộc origin và chưa thay cho backup trên đĩa. Ưu tiên tiếp
theo là workflow và backup/restore; backend local cho toàn bộ kỹ năng là công
việc riêng chưa triển khai. Chạy local không tự đồng nghĩa offline hoàn toàn.

## Điều kiện cho các hướng tương lai

Cloud auth, sync và usage nhiều người dùng không phải điều kiện cho web local.
AI thật có thể được tích hợp riêng; key nằm ở server/worker, không ở browser.
Gọi provider ngoài máy vẫn cần disclosure/consent và evaluation. Các yêu cầu
provenance, bản quyền, privacy, validation và chất lượng chấm vẫn áp dụng khi
chạy local. Nếu mở lại public/native app, đánh giá lại deployment, ownership,
persistence và nhu cầu thiết bị trước khi thay đổi kiến trúc.
