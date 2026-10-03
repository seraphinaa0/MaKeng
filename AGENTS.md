# AGENTS.md

Tài liệu này áp dụng cho toàn bộ repository MaKeng và dành cho mọi coding agent hoặc contributor.

## 1. Nguồn sự thật

Đọc các file sau trước khi thay đổi kiến trúc hoặc sản phẩm:

1. `PRODUCT.md`
2. `ARCHITECTURE.md`
3. `DESIGN_SYSTEM.md`
4. `AI_RULES.md`
5. `ROADMAP.md`

Nếu yêu cầu mâu thuẫn với tài liệu, nêu rõ mâu thuẫn và cập nhật quyết định trước hoặc cùng thay đổi code. Không âm thầm đổi phạm vi.

## 2. Nguyên tắc làm việc

- Implement vertical slice nhỏ nhất có thể kiểm chứng.
- Giữ modular monolith trong beta.
- Không tạo abstraction chưa có ít nhất một use case rõ ràng.
- Không thêm dependency nếu platform hoặc code hiện có giải quyết đủ tốt.
- Không sửa file không liên quan.
- Không đưa secret, token hoặc dữ liệu cá nhân vào code, log, fixture hay commit.
- Không copy code/content từ nguồn không có license tương thích.

## 3. Quy trình cho mỗi thay đổi

1. Xác định acceptance criteria.
2. Tìm schema, module và test liên quan.
3. Viết hoặc cập nhật test có khả năng thất bại.
4. Implement thay đổi nhỏ, typed và dễ rollback.
5. Chạy lint, typecheck, test liên quan và build khi phù hợp.
6. Kiểm tra authorization, empty/loading/error states và responsive UI.
7. Cập nhật tài liệu nếu contract hoặc hành vi thay đổi.

## 4. Architecture boundaries

- UI component không gọi AI provider.
- Route handler không chứa prompt dài hoặc business rules phức tạp.
- Provider SDK chỉ xuất hiện trong adapter thuộc `packages/ai` hoặc worker.
- Database access đi qua repository/query layer đã chọn.
- Shared schemas là contract; không duplicate type bằng tay giữa app và worker.
- Runtime practice chỉ dùng content đã publish.

## 5. TypeScript conventions

- Bật strict mode.
- Không dùng `any` trừ boundary được giải thích rõ.
- Parse external input thành `unknown`, sau đó validate.
- Dùng discriminated union cho job state và question type.
- Hàm domain quan trọng phải deterministic khi có thể.
- Không dùng type assertion để che lỗi schema.

## 6. Database rules

- Schema change phải có migration.
- Migration không được destructive nếu chưa có kế hoạch dữ liệu và review rõ ràng.
- Bảng user-owned phải có RLS và test authorization.
- Timestamps lưu UTC.
- Published content được version hóa; không mutate âm thầm.
- Job processing phải idempotent.

## 7. AI rules

- Dùng mock provider mặc định cho tests và local UI work.
- Không yêu cầu API key cho test suite thông thường.
- Mọi output model phải qua versioned schema validation.
- Prompt thay đổi phải tăng version và chạy evaluation set.
- Không render raw model HTML.
- Không tự động publish AI-generated content.

## 8. UI rules

- Dùng token và component trong `DESIGN_SYSTEM.md`.
- Mỗi async view phải xử lý loading, empty, error và retry khi phù hợp.
- Mọi form control có label và error accessible.
- Kiểm tra compact và wide layout.
- Không dùng màu là tín hiệu duy nhất.
- Không gọi band estimate là official score.

## 9. Testing baseline

- Unit tests: scoring, normalization, validators, state transitions.
- Integration tests: API + database + authorization.
- Contract tests: provider adapter và structured AI output.
- E2E tối thiểu: Writing submission và Reading attempt.
- Không dùng API AI thật trong CI mặc định.

## 10. Definition of Done cho pull request

- Acceptance criteria đạt.
- Typecheck và tests liên quan pass.
- Không có secret hoặc dữ liệu không có quyền sử dụng.
- Migration/RLS được kiểm tra nếu có thay đổi database.
- UI có accessibility và responsive states cơ bản.
- Tài liệu và changelog/decision record được cập nhật khi cần.

## 11. Khi chưa chắc chắn

Ưu tiên giải pháp:

1. ít quyền truy cập hơn;
2. ít dữ liệu được gửi/lưu hơn;
3. dễ rollback hơn;
4. có bằng chứng qua test hoặc benchmark;
5. không mở rộng scope beta.
