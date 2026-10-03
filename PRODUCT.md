# MaKeng — Product Definition

## 1. Tầm nhìn

MaKeng là nền tảng luyện IELTS độc lập, ưu tiên web, giúp người học luyện tập có hệ thống bằng nội dung gốc, phản hồi AI có dẫn chứng và lộ trình dựa trên lỗi thực tế.

MaKeng không phải sản phẩm IELTS chính thức, không liên kết với British Council, IDP hoặc Cambridge University Press & Assessment. Mọi band score do AI tạo chỉ là ước lượng phục vụ luyện tập.

## 2. Giá trị cốt lõi

MaKeng phải làm tốt ba việc:

1. Biến nội dung hợp pháp thành bài luyện có cấu trúc, đáp án và evidence.
2. Đưa ra phản hồi Writing hữu ích, có dẫn chứng và có thể hành động.
3. Ghi nhận lỗi để đề xuất bài luyện tiếp theo phù hợp.

Giá trị khác biệt không phải là “gọi AI để sinh đề”, mà là pipeline có schema, kiểm định, review, provenance và theo dõi chất lượng.

## 3. Người dùng mục tiêu

### Primary persona

- Người tự học IELTS Academic ở band 5.0–7.5.
- Cần luyện thường xuyên nhưng không có giáo viên chấm mọi bài.
- Muốn hiểu vì sao sai và nên luyện gì tiếp theo.

### Secondary persona

- Giáo viên hoặc content reviewer muốn tạo, sửa và phát hành bài luyện.
- Nhóm vận hành muốn theo dõi chất lượng model, prompt và nội dung.

## 4. Phạm vi beta

Beta gồm hai vertical slice:

### Writing Task 2

- Chọn hoặc nhập đề.
- Viết và nộp bài.
- Nhận band estimate theo bốn tiêu chí.
- Nhận feedback có trích dẫn từ bài viết.
- Xem lịch sử và so sánh tiến bộ.
- Hiển thị cảnh báo điểm AI không phải kết quả IELTS chính thức.

### Reading practice và generation có review

- Làm bài từ bộ nội dung đã được duyệt.
- Hỗ trợ Multiple Choice, True/False/Not Given và Sentence Completion.
- Mỗi câu hỏi có đáp án, explanation và evidence.
- Người có quyền reviewer có thể duyệt, sửa, từ chối hoặc regenerate.
- Không có nội dung AI nào được tự động publish trong beta.

## 5. Ngoài phạm vi beta

- Speaking examiner hoàn chỉnh.
- Listening generation và TTS tự động.
- Native mobile app.
- Fine-tuning model.
- Marketplace, thanh toán hoặc tổ chức lớp học.
- Tự động scrape và phát hành nội dung bên thứ ba.
- Nội dung Cambridge/IELTS chính thức.

## 6. Nguyên tắc sản phẩm

- Web-first, API-ready, mobile-later.
- Modular monolith trước, tách service khi có bằng chứng về tải hoặc ownership.
- Human review bắt buộc với nội dung sinh tự động.
- Evidence trước lời giải thích chung chung.
- Privacy và quyền xóa dữ liệu là chức năng sản phẩm.
- Không đánh đổi tính đúng đắn để tạo cảm giác “AI thông minh”.
- Không chấm accent hoặc tuyên bố khả năng dự đoán điểm thi chính thức.

## 7. Chỉ số beta

### Activation

- Người dùng hoàn thành submission Writing đầu tiên.
- Người dùng hoàn thành một Reading practice set.

### Quality

- Tỷ lệ AI response qua schema validation.
- Tỷ lệ câu hỏi Reading được reviewer duyệt ngay lần đầu.
- Tỷ lệ evidence trỏ đúng nội dung.
- Độ lệch Writing score so với benchmark có người chấm.

### Engagement

- Số attempt hoàn thành mỗi tuần.
- Tỷ lệ quay lại sau 7 ngày.
- Tỷ lệ người dùng xem feedback và làm bài đề xuất tiếp theo.

### Guardrails

- Chi phí AI trung bình mỗi submission.
- Tỷ lệ job lỗi/retry.
- Sự cố lộ dữ liệu hoặc nội dung không có quyền sử dụng: mục tiêu bằng 0.

## 8. Definition of Done cho beta

- Auth và phân quyền user/reviewer hoạt động.
- Writing submission được lưu trước khi gọi AI.
- AI output được validate trước khi persist hoặc render.
- Có timeout, retry giới hạn, rate limit và cost logging.
- Reading runtime chỉ đọc nội dung đã publish.
- Mỗi câu hỏi Reading có answer key và evidence hợp lệ.
- Có benchmark Writing và quality set cho Reading.
- Có provenance cho mọi nội dung được phân phối.
- Có test cho schema, authorization, scoring và state transition.
- Người dùng có thể xem, export và yêu cầu xóa dữ liệu cá nhân.

## 9. Quyết định cần kiểm chứng

- Mức độ người học tin và sử dụng Writing feedback.
- Dạng Reading nào AI tạo đủ tốt sau review.
- Ngưỡng chi phí AI chấp nhận được cho mỗi người dùng.
- Có cần real-time generation hay job bất đồng bộ là đủ.
- Thời điểm thích hợp để thêm Listening và Speaking.
