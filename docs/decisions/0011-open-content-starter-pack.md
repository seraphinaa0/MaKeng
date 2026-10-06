# ADR 0011 — Gói nguồn mở nhỏ, tách khỏi đề đã duyệt

Ngày 2026-10-05. Người dùng yêu cầu sao chép tài liệu từ VOA, public-domain works, Wikimedia, Common Voice và LibriVox; bổ sung đề Speaking/Writing gốc.

Triển khai một gói mẫu có manifest versioned và thư viện `/sources`: trích đoạn Reading VOA/Wikipedia/Aesop, hội thoại và audio VOA tải local. Không scrape hàng loạt, không sao chép ảnh/logo/video hay quiz của nguồn. Văn bản không có câu hỏi/đáp án IELTS nên không đưa vào Reading runtime, không tự publish và không giả là nội dung tự sáng tác. Có tải gói JSON chứa credit, điều kiện và ngày kiểm tra; audio tải riêng. Speaking/Task 2/Task 1 bổ sung nội dung gốc dạng preview trong catalog hiện có.

VOA chỉ public domain với phần do VOA sản xuất; loại AP/Reuters và phần do bên thứ ba giữ quyền. Wikipedia excerpt ghi article/revision/history, CC BY-SA 4.0 và thay đổi (bỏ reference markers, chuẩn hóa khoảng trắng); license áp dụng cho excerpt, không đổi giấy phép toàn app. Aesop bản dịch George Fyler Townsend (mất 1900) giữ credit và cảnh báo Gutenberg chỉ xác nhận PD tại Hoa Kỳ; cần kiểm tra quốc gia phát hành. Không dùng branding/illustrations/Gutenberg wrapper.

Common Voice: chưa tải, cần người dùng tải bản cụ thể từ Mozilla Data Collective và xem cả license lẫn download terms. Không tạo account/accept terms hay mirror từ nguồn khác. LibriVox: đã tìm catalog Aesop, chưa lấy audio vì chưa xác minh quyền bản ghi/narrator/điều kiện ngoài Hoa Kỳ. Hai nguồn này được ghi rõ là chưa nhập, không phải thẻ audio giả.

Không đổi schema/backup bài học. Asset nguồn công khai chỉ được phục vụ local trong gói này; không liên quan audio riêng của người dùng. Không thêm AI, STT, login, provider hay deploy.
