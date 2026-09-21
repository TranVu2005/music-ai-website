# Bảo vệ File & Bản quyền Âm thanh (File Protection)

## 1. Bản preview có watermark
- TODO: Kỹ thuật xử lý file demo: Tự động chuyển đổi bản nhạc sang định dạng nén chất lượng thấp (ví dụ: MP3 128kbps) bằng FFmpeg.
- TODO: Chèn đoạn âm thanh watermark (voice tag / audio watermark ngắn "Music Preview" hoặc tên thương hiệu) lặp lại mỗi 20-30 giây trong suốt bài hát.
- TODO: Lưu trữ bản preview trong bucket công khai (Public Read Bucket) hoặc phân phối qua CDN với bộ nhớ đệm (caching).

## 2. Lưu file gốc
- TODO: File master chất lượng cao (WAV 24-bit, FLAC hoặc MP3 320kbps không có watermark) được lưu trữ trong Private Bucket (AWS S3 / Cloudflare R2 / MinIO).
- TODO: Chặn toàn bộ quyền truy cập công khai trực tiếp (Private Read/Write Only), chỉ backend service mới có IAM credentials để đọc/ghi.
- TODO: Đặt tên file ngẫu nhiên (UUID hoặc hash ngẫu nhiên) để tránh việc đoán trước URL file gốc.

## 3. Signed URL có hạn
- TODO: Khi khách hàng yêu cầu tải file đã mua, hệ thống tạo Pre-signed URL (Signed URL) tải trực tiếp từ Private Object Storage.
- TODO: Cấu hình thời gian sống (TTL - Time To Live) ngắn cho URL (ví dụ: 15 đến 30 phút).
- TODO: Thiết lập header `Content-Disposition: attachment; filename="..."` để trình duyệt tự động kích hoạt tải xuống với tên bài hát đẹp mắt.

## 4. Kiểm tra quyền tải
- TODO: Xác thực phiên đăng nhập hoặc mã token truy cập đơn hàng (secure download token).
- TODO: Kiểm tra điều kiện đơn hàng trong cơ sở dữ liệu:
  - Đơn hàng phải ở trạng thái `PAID`.
  - Kiểm tra thời hạn hiệu lực tải file (ví dụ: cho phép tải trong vòng 30 ngày kể từ ngày mua).
  - Kiểm tra số lần tải tối đa cho phép (nếu có giới hạn rate limit).
- TODO: Ghi nhận lịch sử mỗi lượt tải (Download Log: thời gian tải, địa chỉ IP, User-Agent) để phát hiện và ngăn chặn hành vi chia sẻ link trái phép.
