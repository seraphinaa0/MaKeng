# ADR 0010 — Learning Hub local MVP

Theo concept người dùng, thay trang chủ Writing bằng Home định hướng bước học tiếp; Writing chuyển `/writing`, `/practice` tập hợp bốn kỹ năng. Root query cũ `/?practice=1` và `/?submission=…` tiếp tục mở Writing để không mất bookmark/bài cũ. Không đổi storage bài luyện.

Home dùng progress domain hiện có, lịch sử Reading, phiên Speaking và metadata Listening trên thiết bị. Thông báo lỗi từng nguồn riêng, không biến lỗi lưu trữ thành số 0. Các thẻ tiếp tục dùng ID đã lưu; không tạo attempt mới khi mở Home. Không suy ra IELTS band, streak hoặc năng lực từ mock/checklist. Reading vẫn có opt-out gợi ý theo preferences hiện có. Vocabulary/STT/AI thật/Mock Test để checkpoint tiếp theo, không vẽ tính năng chưa chạy.

Desktop có sidebar, mobile có thanh Home/Practice/Speaking/Progress và menu công cụ. Theme light/dark/system được lưu riêng dưới `makeng-ui-theme`, không thuộc backup học tập; fallback system nếu storage bị chặn. Không thêm dữ liệu tài khoản, tên hay profile giả. Font system stack Geist/Inter với fallback native, không gọi Google Fonts.

Writing chia prompt/dữ liệu và editor trên desktop, một cột trên mobile. Reading split pane giữ logic cũ. Tất cả tiếp tục local, không provider mới, không push/deploy.
