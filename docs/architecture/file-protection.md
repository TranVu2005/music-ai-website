# Bảo vệ File & Bản quyền Âm thanh (File Protection)

> **Tài liệu nguồn chuẩn**: Đối chiếu và tuân thủ tuyệt đối [Kế hoạch triển khai](../project-plan.md).  
> **Hạ tầng lưu trữ**: S3-compatible Object Storage (Cloudflare R2 hoặc AWS S3), tuyệt đối không lưu file gốc công khai.

---

## 1. Bản Preview Nghe thử có Watermark [Phase 1]

- **Xử lý âm thanh tự động bằng FFmpeg**:
  - Khi nhạc sĩ/chủ shop tải file nhạc gốc lên qua script hoặc trang quản trị, hệ thống kích hoạt worker/script nội bộ sử dụng **FFmpeg** (chạy ngay trong repository, không dùng dịch vụ ngoài phức tạp).
  - FFmpeg tự động chuyển đổi file master chất lượng cao sang định dạng nén tối ưu cho web/mobile: **MP3 128kbps, 44.1kHz stereo**.
- **Chèn âm thanh bảo vệ bản quyền (Audio Watermark / Voice Tag)**:
  - FFmpeg tự động trộn (mix) một đoạn voice tag ngắn ("Music Preview" hoặc tên thương hiệu nghệ sĩ) lặp lại định kỳ mỗi **20 đến 30 giây** xuyên suốt bài hát.
  - Âm lượng voice tag được cân chỉnh vừa đủ để người nghe vẫn cảm nhận được giai điệu và nhạc cụ, nhưng hoàn toàn vô dụng nếu kẻ xấu có ý định thu âm lại hoặc tách nhạc sử dụng thương mại.
- **Lưu trữ và phân phối bản Preview**:
  - **Giai đoạn 1 (Phase 1)**: Bản preview MP3 có thể lưu trữ tạm thời trong thư mục `public/audio` của dự án để phục vụ bản chạy thử nhanh chóng.
  - **Giai đoạn 2 trở đi (Phase 2+)**: Lưu trữ trên **Public Bucket** của Cloudflare R2 (hoặc AWS S3) kết hợp với CDN có hỗ trợ HTTP Range Requests và cache hiệu năng cao, đảm bảo người dùng nghe thử trên điện thoại hoặc máy tính mượt mà.

---

## 2. Lưu trữ An toàn File Gốc (Master Files) [Phase 2]

- **Định dạng file master chất lượng cao**:
  - File bàn giao cho khách hàng là file âm thanh nguyên bản không nén hoặc nén không suy giảm chất lượng (Lossless: **WAV 24-bit / 48kHz hoặc 96kHz, FLAC** hoặc MP3 320kbps nguyên gốc không watermark).
- **Quy tắc an toàn bất khả xâm phạm (Zero-Leak Policy)**:
  - **File master tuyệt đối KHÔNG BAO GIỜ được commit vào Git repository hoặc đặt trong thư mục `public/`**.
  - File `.gitignore` của dự án bắt buộc phải có các quy tắc chặn nghiêm ngặt:
    ```gitignore
    # Chặn toàn bộ file master gốc và thư mục nháp
    *.wav
    *.flac
    /public/masters/
    /uploads/
    ```
- **Cấu hình bảo mật Private Object Storage**:
  - File gốc được lưu trữ hoàn toàn trong **Private Bucket** trên Cloudflare R2 (hoặc AWS S3).
  - Nghiêm cấm mọi quyền đọc/ghi công khai (Block Public Access: bật 100%).
  - Chỉ có Next.js backend server sở hữu IAM / S3 API Access Credentials nội bộ mới có quyền thao tác với Private Bucket.
- **Quy tắc đặt tên file ngẫu nhiên**:
  - Tên file lưu trên storage sử dụng định danh UUID ngẫu nhiên (ví dụ: `masters/e7b32c81-42a9-45d2-b6cf-20d0e5138139.wav`) nhằm triệt tiêu hoàn toàn khả năng người dùng đoán được đường dẫn lưu trữ.

---

## 3. Cơ chế Phân phối File qua Download Token & Signed URL [Phase 2]

Thay vì nhúng link trực tiếp vào email, hệ thống áp dụng cơ chế 2 lớp an toàn:

```
[1. Email thông báo] ──> Link chứa Download Token (cấp độ đơn hàng):
                         https://musicshop.vn/downloads?token=sec_abc123...
                                │
                                ▼
[2. Khách click link] ─> Endpoint Next.js: GET /api/downloads/:token
                                │
                                ├──> Xác thực: orders.payment_status = 'paid'?
                                ├──> Xác thực: now() <= orders.download_expires_at (30 ngày)?
                                ├──> Ghi nhật ký vào download_logs theo order_item_id
                                ├──> Tăng order_items.download_count += 1
                                │
                                ▼
[3. Cấp Signed URL]  <── 302 Redirect Pre-signed URL (Cloudflare R2 / AWS S3)
                         - Thời hạn sống cực ngắn: 15 - 30 phút
                         - Header: Content-Disposition: attachment; filename="Ten-Bai.wav"
                                │
                                ▼
[4. Trình duyệt tải] <── Trình duyệt tải trực tiếp file master từ Private Storage
```

### 3.1. Mã bảo mật đơn hàng (`download_token`)
- Mỗi đơn hàng thành công được cấp một mã định danh ngẫu nhiên bảo mật cao (`download_token` nằm trên bảng `orders`).
- Token có thời hạn hiệu lực được cấu hình linh hoạt trong hệ thống (`settings.download_valid_days`, mặc định **30 ngày** kể từ ngày đơn hàng chuyển sang `PAID`).
- Khách hàng có thể truy cập link tải trong email bất kỳ lúc nào trong khoảng thời gian 30 ngày này.

### 3.2. Pre-signed URL thời hạn ngắn (TTL 15 - 30 phút)
- Khi khách hàng nhấn vào nút tải bài hát trên giao diện tải đơn hàng, Next.js Route Handler gọi S3 SDK để sinh Pre-signed URL trực tiếp từ Cloudflare R2/S3 cho bài hát tương ứng trong `order_items`.
- Thời gian sống của Signed URL chỉ kéo dài **từ 15 đến 30 phút** (đủ để trình duyệt hoàn tất tải xuống).
- URL tự động hết hiệu lực sau thời gian trên, khiến liên kết không thể tái sử dụng hoặc chia sẻ công khai trên mạng xã hội.
- Cấu hình header tải xuống:
  ```http
  Content-Disposition: attachment; filename="Ten_Bai_Hat_Master.wav"
  Content-Type: audio/wav
  ```
  giúp người dùng tải về file với tên bài hát chuẩn xác, không bị hiển thị chuỗi UUID mã hóa.

---

## 4. Xác thực Quyền Tải & Ghi Nhật ký Bảo mật (Audit Logs) [Phase 2]

Mọi yêu cầu sinh link tải file gốc đều phải vượt qua quy trình kiểm tra nghiêm ngặt tại Route Handler:

1. **Kiểm tra trạng thái đơn hàng**:
   - Truy vấn `orders` thông qua `download_token`.
   - Bắt buộc `orders.payment_status === 'paid'`. Nếu đơn hàng ở trạng thái `pending`, `expired`, hoặc `cancelled`, trả về lỗi HTTP 403 Forbidden.
2. **Kiểm tra thời hạn tải**:
   - So sánh thời điểm hiện tại `now()` với `orders.download_expires_at`.
   - Nếu đã quá hạn 30 ngày, trả về thông báo liên kết đã hết hiệu lực.
3. **Theo dõi theo từng mục sản phẩm (`order_items`)**:
   - Quyền tải file và file giấy phép PDF [Phase 3] được quản lý theo từng `order_item`.
   - Mỗi lần sinh URL tải thành công, trường `order_items.download_count` được tăng thêm 1 đơn vị.
4. **Ghi nhật ký tải chi tiết (`download_logs`)**:
   - Hệ thống lưu lại vết truy cập vào bảng `download_logs`:
     - `order_item_id`: Xác định chính xác bài hát được tải.
     - `ip_address`: Địa chỉ IP của người tải.
     - `user_agent`: Thông tin trình duyệt / thiết bị tải.
     - `downloaded_at`: Mốc thời gian chính xác.
   - Dữ liệu này phục vụ đối soát, phát hiện hành vi chia sẻ token bất thường hoặc cố tình spam link.
