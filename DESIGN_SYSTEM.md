# MaKeng — Design System

## 1. Mục tiêu trải nghiệm

MaKeng cần tạo cảm giác tập trung, đáng tin và ít gây áp lực. Giao diện phải giống một không gian học tập chuyên nghiệp, không giống casino hóa bằng streak, badge và animation quá mức.

Ba thuộc tính chính:

- Calm: bố cục thoáng, ít màu cạnh tranh.
- Evidence-led: feedback luôn gắn với đoạn văn hoặc câu trả lời.
- Progress-oriented: nhấn mạnh bước cải thiện tiếp theo, không chỉ điểm số.

## 2. Nguyên tắc UI

Theo phản hồi sử dụng đầu tiên, giao diện ưu tiên tối giản: thanh điều hướng ngang chỉ có Writing và Reading; bỏ sidebar, slogan và các khối trang trí. Writing dùng một cột theo thứ tự chọn đề → viết → nộp. Reading có thư viện bài ngắn; trên điện thoại chuyển giữa Bài đọc và Câu hỏi bằng hai nút rõ ràng. Lịch sử đặt cạnh thao tác luyện tập, trạng thái lưu được hiển thị ngay gần câu trả lời.

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
