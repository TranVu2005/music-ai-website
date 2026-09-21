# Quy tắc Phát triển Dự án (Development Guidelines)

Tài liệu này quy định các nguyên tắc bắt buộc dành cho lập trình viên và các AI coding assistant khi làm việc trên dự án **music-shop**.

## 1. Quy tắc "Docs-First"
- **Bắt buộc đọc trước khi viết code**: Luôn đọc kỹ toàn bộ tài liệu trong thư mục `docs/architecture/` và nội dung file task tương ứng trong `docs/tasks/` trước khi thực hiện bất kỳ thay đổi nào về mã nguồn.
- Tài liệu kiến trúc và đặc tả yêu cầu là chuẩn mực cao nhất để xác định tính đúng đắn của tính năng.

## 2. Quy trình Làm việc theo Nhánh (Branching Strategy)
- **Mỗi task một branch riêng biệt**: Tuyệt đối không commit trực tiếp mã tính năng vào nhánh `main`.
- Đặt tên branch theo định dạng: `feat/task-<số_task>-<mô_tả_ngắn>` hoặc `fix/task-<số_task>-<mô_tả_ngắn>` (Ví dụ: `feat/task-001-project-setup`).
- Sau khi hoàn thành và vượt qua tất cả kiểm thử, tạo Pull Request kèm theo checklist nghiệm thu từ task tương ứng.

## 3. Yêu cầu Kiểm thử Bắt buộc (Testing Requirements)
- **Kiểm thử tính năng quan trọng**:
  - **Thanh toán**: Bắt buộc phải có unit test và integration test cho toàn bộ luồng thanh toán, đặc biệt là tính năng xác thực chữ ký webhook và cơ chế idempotency (tránh xử lý trùng giao dịch).
  - **Quyền tải file**: Bắt buộc phải có test kiểm tra xác thực quyền sở hữu đơn hàng và thời hạn hợp lệ của Signed URL trước khi sinh link tải, ngăn chặn tuyệt đối truy cập trái phép vào file nhạc gốc.
- Mọi Pull Request không có test bổ sung cho các luồng xử lý quan trọng sẽ không được phê duyệt.

## 4. Giữ vững Phạm vi Task (Strict Scope Boundary)
- **Không sửa ngoài phạm vi task**: Chỉ chỉnh sửa các file và thực hiện các chức năng đã được định nghĩa trong mục **Phạm vi** của file task đang làm việc.
- Nếu phát hiện vấn đề kỹ thuật hoặc cơ hội tái cấu trúc nằm ngoài task hiện tại, hãy ghi nhận lại và tạo một task mới trong `docs/tasks/`, không tự ý mở rộng phạm vi công việc.
