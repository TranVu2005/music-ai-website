# Luồng Thanh toán & Đối soát Đơn hàng (Payment Flow)

> **Tài liệu nguồn chuẩn**: Đối chiếu và tuân thủ tuyệt đối [Kế hoạch triển khai](../project-plan.md).  
> **Phương thức thanh toán**: Chuyển khoản ngân hàng trực tiếp qua mã VietQR, đối soát và xác nhận thủ công bởi chủ website trên Trang quản trị (Admin Panel).  
> **Khả năng mở rộng**: Tách bạch tầng nghiệp vụ qua `PaymentProvider` interface để sẵn sàng cắm adapter webhook tự động trong tương lai.

---

## 1. Phương thức Thanh toán & Mã VietQR Nội bộ [Phase 2]

- **Phương thức áp dụng**: Chuyển khoản liên ngân hàng 24/7 quét mã VietQR chuẩn Napas.
- **Tạo mã QR chuẩn hóa độc lập (EMVCo Payload)**:
  - Chuỗi mã hóa VietQR được tạo trực tiếp tại mã nguồn ứng dụng (theo chuẩn EMVCo QR Code Specifications) mà **không phụ thuộc vào bất kỳ dịch vụ hay API bên thứ ba nào**.
  - Chuỗi QR chứa: Số tài khoản ngân hàng của chủ website, Mã định danh ngân hàng (BIN), Tên chủ tài khoản, Số tiền chính xác (`total_amount`) và Nội dung chuyển khoản chuẩn hóa bắt buộc là mã đơn hàng `order_code`.
- **Cơ chế xác nhận thanh toán thủ công**:
  - Không sử dụng webhook tự động từ các cổng thanh toán bên thứ ba ở giai đoạn này.
  - Chủ website kiểm tra thông báo biến động số dư trên ứng dụng ngân hàng và đối chiếu `order_code`.
  - Chủ website truy cập Trang quản trị (Admin Panel) và thực hiện hành động **"Xác nhận đã nhận tiền" (Confirm payment received)** để kích hoạt đơn hàng.

---

## 2. Kiến trúc Mở rộng: `PaymentProvider` & `EmailProvider` Interface

Hệ thống được thiết kế theo nguyên lý Clean Architecture, tách biệt logic nghiệp vụ với cổng thanh toán và dịch vụ gửi mail:

```typescript
// src/lib/payment/types.ts

export interface PaymentQrResult {
  qrImageUrl: string;
  qrPayload: string; // Chuỗi EMVCo sinh nội bộ
  accountNumber: string;
  accountName: string;
  bankCode: string;
  amount: number;
  transferContent: string; // = order_code
}

export interface PaymentProvider {
  readonly name: string;
  
  /**
   * Tạo thông tin mã QR chuyển khoản chuẩn EMVCo cho đơn hàng
   */
  generatePaymentQr(params: {
    orderCode: string;
    amount: number;
    description: string;
  }): Promise<PaymentQrResult>;

  /**
   * Hook mở rộng sẵn sàng cho tương lai khi bổ sung Webhook Adapter tự động
   */
  verifyWebhookSignature?(payload: unknown, headers: Record<string, string>): boolean;
  parseWebhookPayload?(payload: unknown): {
    orderCode: string;
    amount: number;
    transactionCode: string;
  };
}
```

```typescript
// src/lib/email/types.ts

export interface EmailProvider {
  sendEmail(params: {
    to: string;
    subject: string;
    html: string;
  }): Promise<{ success: boolean; messageId?: string }>;
}
```
*Dịch vụ email giao dịch sử dụng **Resend** được bọc sau `EmailProvider` để phục vụ gửi email thông báo đơn hàng và link tải.*

---

## 3. Vòng đời Đơn hàng & Cơ chế Khóa dòng Chống Deadlock (Concurrency & Deadlock Avoidance)

Đơn hàng hỗ trợ giỏ hàng nhiều sản phẩm (`Cart = Multiple Items`), trong đó `orders` lưu tổng giá trị và trạng thái thanh toán, còn `order_items` lưu chi tiết từng bài hát và giấy phép.

```
                  [Khách tạo giỏ hàng]
                            │
                            ▼
                        ┌─────────┐
      ┌─────────────────│ PENDING │──────────────────┐
      │                 └─────────┘                  │
(Hết hạn                     │                  (Admin bấm Hủy
hold_minutes /               │                   hoặc Khách hủy)
claimed_hold_hours)          │                       │
      │             [Khách bấm tùy chọn:             │
      │              "Tôi đã chuyển tiền"            │
      │           -> Gia hạn sang 24 giờ]            │
      │                      │                       │
      ▼                      ▼                       ▼
┌─────────┐          [Admin đối soát           ┌───────────┐
│ EXPIRED │          bấm "Xác nhận"]           │ CANCELLED │
└─────────┘                  │                 └───────────┘
      │                      │
(Admin xác nhận              ▼
 re-check OK)            ┌───────┐
      └─────────────────>│ PAID  │
                         └───────┘
```

### 3.1. Trạng thái `PENDING` [Phase 2]
- Được tạo ngay khi khách hàng xác nhận giỏ hàng và tiến hành thanh toán.
- **Thời hạn giữ chỗ mặc định**: `settings.hold_minutes` mặc định là **60 phút** (thay vì 15 phút, vì chủ website xác nhận thủ công nên 15 phút sẽ thường xuyên làm hết hạn nhầm các đơn khách vừa chuyển tiền).
- **Hành động "Tôi đã chuyển tiền" (I have transferred) [Phase 2]**:
  - Sau khi chuyển khoản, khách hàng có thể bấm nút "Tôi đã chuyển tiền" trên giao diện đơn hàng.
  - Hệ thống ghi nhận mốc thời gian `orders.paid_claimed_at = now()`.
  - Tự động kéo dài thời hạn giữ chỗ của các bài độc quyền trong đơn lên `settings.claimed_hold_hours` (mặc định **24 giờ**): `tracks.reserved_until = now() + interval '24 hours'`.
  - Gửi email thông báo cho chủ website để ưu tiên kiểm tra và đối soát đơn hàng.
- **Khóa tạm thời bài độc quyền**:
  - Mọi bài hát có giấy phép độc quyền (`exclusive`) nằm trong đơn hàng đều đồng thời được chuyển `tracks.status = 'reserved'`.

### 3.2. Cơ chế Phòng tránh Deadlock (Deadlock Avoidance Pattern) [Phase 2]
Đối với các đơn hàng chứa nhiều bài hát độc quyền, thao tác **giữ chỗ (reserve)**, **giải phóng (release)**, hoặc **xác nhận (confirm)** bắt buộc phải thực thi trong cùng một Database Transaction và tuân thủ nghiêm ngặt quy tắc khóa:
1. **Khóa bản ghi đơn hàng trước**:
   ```sql
   SELECT * FROM orders WHERE id = $1 FOR UPDATE;
   ```
2. **Khóa các bản ghi bài hát theo thứ tự tăng dần của `track.id` (`ORDER BY id ASC`)**:
   ```sql
   SELECT * FROM tracks 
   WHERE id IN (SELECT track_id FROM order_items WHERE order_id = $1)
   ORDER BY id ASC 
   FOR UPDATE;
   ```
   *Quy tắc sắp xếp thứ tự cố định loại bỏ hoàn toàn khả năng 2 giao dịch khóa chéo lẫn nhau (deadlock) khi có nhiều đơn hàng chứa các bài hát độc quyền trùng lặp được xử lý đồng thời.*

### 3.3. Trạng thái `PAID` [Phase 2]
- Được kích hoạt khi chủ website nhấn nút **"Xác nhận đã nhận tiền"** trên trang quản trị.
- Kiểm tra tính nguyên tử (Idempotency): Nếu `orders.payment_status === 'paid'`, bỏ qua giao dịch.
- Nếu hợp lệ, transaction thực hiện:
  1. Cập nhật `orders.payment_status = 'paid'`, `orders.updated_at = now()`.
  2. Tạo bản ghi `payments`: `status = 'paid'`, `confirmed_by = admin_user_id`, `confirmed_at = now()`.
  3. Cập nhật toàn bộ các bài hát độc quyền trong `order_items`: chuyển `tracks.status = 'sold_exclusive'`, xóa `tracks.reserved_until`, gỡ bài khỏi kho nhạc công khai.
  4. Tạo mã `download_token` cho đơn hàng trên bảng `orders` với thời hạn hiệu lực `download_expires_at = now() + (settings.download_valid_days * interval '1 day')`.
  5. [Phase 3] Kích hoạt tiến trình tự động sinh file giấy phép bản quyền PDF cho từng `order_item` và lưu đường dẫn vào `order_items.license_pdf_url`.
  6. Gửi email xác nhận thanh toán thành công cho khách hàng (`customer_email`) qua `EmailProvider` (Resend) kèm link tải an toàn chứa `download_token`.

### 3.4. Trạng thái `EXPIRED` & `CANCELLED` [Phase 2]
- Nếu quá hạn giữ chỗ (`hold_minutes` hoặc `claimed_hold_hours` nếu có `paid_claimed_at`), đơn hàng chuyển sang `EXPIRED`.
- Toàn bộ các bài độc quyền trong đơn được giải phóng đồng thời: `tracks.status = 'published'`, xóa `tracks.reserved_until`.
- Khi đơn bị hủy (`CANCELLED`), bài độc quyền cũng được giải phóng tương tự.

---

## 4. Quy tắc Xử lý Đơn hàng Hết hạn (`EXPIRED`) khi Admin Xác nhận [Phase 2]

Khi khách chuyển khoản chậm và đơn hàng đã bị chuyển sang `EXPIRED`, chủ website bấm **"Xác nhận đã nhận tiền"**:

```
Admin bấm "Xác nhận đã nhận tiền" trên đơn EXPIRED
                      │
                      ▼
        [Transaction có Row-level lock:
     orders FOR UPDATE -> tracks ORDER BY id ASC FOR UPDATE]
                      │
                      ▼
[Kiểm tra tính khả dụng (Re-check availability)
 của toàn bộ bài hát độc quyền trong đơn]
                      │
        ┌─────────────┴─────────────┐
        ▼                           ▼
[TẤT CẢ bài độc quyền       [Có ít nhất 1 bài độc quyền
 VẪN CÒN TRỐNG]              ĐÃ BỊ MUA HOẶC ĐANG GIỮ CHỖ]
        │                           │
        ▼                           ▼
- Cho phép kích hoạt đơn     - TỪ CHỐI TOÀN BỘ ĐƠN HÀNG
- Order -> PAID             - Giữ Order -> EXPIRED
- Tracks -> sold_exclusive   - Thiết lập orders.needs_refund = true (100% tiền)
- Cấp quyền tải & gửi email  - Tạo bản ghi payments: status = 'refunded' / 'failed'
                             - Hiển thị trên bộ lọc "Cần hoàn tiền" để Admin chuyển khoản lại
```

1. **Kiểm tra tính khả dụng**:
   - Hệ thống khóa đơn hàng và khóa các bài hát độc quyền trong đơn theo `id ASC FOR UPDATE`.
   - Kiểm tra xem có bài nào đã chuyển sang `sold_exclusive` hoặc đang bị đơn hàng khác giữ (`status = 'reserved'`).
2. **Quyết định xử lý**:
   - **Nếu tất cả bài độc quyền còn trống**: Kích hoạt đơn hàng bình thường sang `PAID`, gỡ bài khỏi kho nhạc và gửi link tải.
   - **Nếu có ít nhất một bài độc quyền đã mất**:
     - **Từ chối toàn bộ đơn hàng**, giữ nguyên trạng thái `orders.payment_status = 'expired'`.
     - Thiết lập cột boolean **`orders.needs_refund = true`** cho 100% số tiền đơn hàng.
     > *Lý do thiết kế: `needs_refund` được định nghĩa rõ ràng là một cột kiểu BOOLEAN trực tiếp trên bảng `orders` (không phải là một giá trị của `payment_status`), giúp trang danh sách đơn hàng của Admin có thể lọc nhanh và trực tiếp các đơn cần hoàn tiền mà không cần phải JOIN bảng `payments`.*
     - Lưu thông tin đối soát vào `payments.notes` và hiển thị cảnh báo đỏ trên trang quản trị cùng số tài khoản khách hàng để chủ website hoàn trả 100% tiền.

---

## 5. Quy trình Tải File An toàn qua Download Token & Signed URL [Phase 2]

1. **Email xác nhận**: Sau khi đơn được xác nhận `PAID`, email gửi đến khách chứa đường dẫn dạng:
   `https://musicshop.vn/downloads?token=sec_abc123...` (token nằm trên bảng `orders`).
2. **Xác thực tại App Endpoint**:
   - Khi khách hàng truy cập liên kết, hệ thống gọi endpoint Route Handler: `GET /api/downloads/:token`.
   - Kiểm tra mã `token` tồn tại trong bảng `orders` và `orders.payment_status === 'paid'`.
   - Kiểm tra thời hạn: `now() <= orders.download_expires_at` (30 ngày mặc định theo `settings.download_valid_days`).
3. **Sinh Pre-signed URL ngắn hạn**:
   - Sau khi xác thực hợp lệ, ứng dụng sinh Pre-signed URL trực tiếp từ Private Bucket (Cloudflare R2 / AWS S3) cho từng file master của `order_items`.
   - Pre-signed URL được giới hạn thời gian sống cực ngắn (**TTL từ 15 đến 30 phút**).
   - Thiết lập header HTTP: `Content-Disposition: attachment; filename="Ten-Bai-Hat.wav"`.
4. **Lưu vết & Kiểm soát**:
   - Mỗi lần phát sinh lượt tải, hệ thống ghi nhận vào bảng `download_logs` theo từng `order_item_id` cụ thể (IP, User-Agent, thời gian tải).
   - Tăng chỉ số `order_items.download_count` phục vụ theo dõi và chống lạm dụng.
