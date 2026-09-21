# Luồng Thanh toán (Payment Flow)

## 1. Cổng thanh toán
- TODO: Tích hợp phương thức thanh toán chuyển khoản quét mã VietQR (thông qua PayOS / SePay / Casso hoặc chuyển khoản ngân hàng trực tiếp).
- TODO: Hỗ trợ tự động tạo mã QR động theo từng đơn hàng với nội dung chuyển khoản chuẩn hóa (chứa mã `order_code`).
- TODO: Khả năng mở rộng kết nối các cổng thanh toán bổ sung trong tương lai.

## 2. Vòng đời đơn hàng
- TODO: `PENDING`: Khách hàng chọn bài hát và license -> Đơn hàng được tạo kèm hạn thanh toán (ví dụ: 15 phút).
  - Đối với bài độc quyền: Chuyển trạng thái bài hát sang `reserved` và ghi nhận `reserved_until` để ngăn khách khác mua đồng thời.
- TODO: `PAID`: Khách hàng hoàn tất chuyển khoản -> Webhook gửi tín hiệu thành công -> Đơn hàng chuyển sang `PAID`.
  - Đối với bài độc quyền: Chuyển trạng thái bài hát sang `sold_exclusive` và ẩn khỏi danh sách công khai.
  - Hệ sinh link tải có thời hạn và tạo giấy phép bản quyền PDF.
- TODO: `EXPIRED`: Nếu hết thời gian mà chưa nhận được tiền -> Đơn chuyển sang `EXPIRED`.
  - Đối với bài độc quyền: Hủy trạng thái `reserved`, mở lại cho khách hàng khác mua.
- TODO: `CANCELLED`: Đơn bị hủy thủ công bởi admin hoặc người mua.

## 3. Xử lý webhook (idempotency)
- TODO: Xác thực tính hợp lệ của Webhook request (kiểm tra Webhook Secret / Signature từ cổng thanh toán).
- TODO: Triển khai Idempotency Key bằng cách sử dụng `order_code` hoặc `transaction_id`:
  - Kiểm tra xem giao dịch đã được xử lý thành công trước đó hay chưa.
  - Nếu đã xử lý (`order.payment_status == PAID`), bỏ qua và trả về HTTP 200 OK ngay lập tức để tránh cộng tiền hoặc kích hoạt quyền tải hai lần.
- TODO: Đảm bảo giao dịch cơ sở dữ liệu (Database Transaction) có cơ chế khóa dòng (Row-level lock / Atomic update) khi cập nhật trạng thái đơn hàng và bài hát.

## 4. Xử lý lỗi
- TODO: Xử lý trường hợp số tiền chuyển khoản không khớp với giá trị đơn hàng (báo động cho admin can thiệp thủ công).
- TODO: Xử lý trường hợp nhận tiền sau khi đơn hàng đã hết hạn (`EXPIRED`): Tạo ticket xử lý hoàn tiền hoặc gia hạn đơn hàng tự động cho khách.
- TODO: Xử lý lỗi kết nối khi nhận webhook: Cấu hình retry từ phía cổng thanh toán và dead-letter log để theo dõi.
