# Audio Asset Protection & Delivery Specification (File Protection)

> **Source of Truth**: Aligned strictly with the [Implementation Plan](../project-plan.md).  
> **Storage Infrastructure**: S3-compatible Object Storage (Cloudflare R2 or AWS S3); public access to master audio files is strictly forbidden.

---

## 1. Watermarked Audio Previews [Phase 1]

- **Automated Audio Processing via FFmpeg**:
  - When an artist or administrator uploads master audio tracks, an internal background script/worker running **FFmpeg** executes within the repository environment (no external SaaS dependency).
  - FFmpeg converts uncompressed master files into an optimized web/mobile streaming format: **MP3 128kbps, 44.1kHz stereo**.
- **Voice Watermark Injection (Audio Watermark / Voice Tag)**:
  - FFmpeg mixes a concise voice tag ("Music Preview" or brand name) repeated periodically every **20 to 30 seconds** across the entire duration of the preview track.
  - The voice tag volume is calibrated so listeners clearly perceive melody, harmony, and arrangement, while rendering the sample unusable for commercial re-recording or audio ripping.
- **Storage and Distribution of Previews**:
  - **Phase 1**: Watermarked MP3 previews are served directly from `public/audio/previews/` for rapid development and testing.
  - **Phase 2+**: Stored in a **Public Bucket** on Cloudflare R2 (or AWS S3) accelerated by a CDN supporting HTTP Range Requests (for seekable streaming) and edge caching.

---

## 2. Secure Master Audio Storage (Lossless Masters) [Phase 2]

- **Master File Format**:
  - Full commercial deliveries consist of uncompressed or lossless audio (**WAV 24-bit / 44.1kHz, 48kHz, or 96kHz, FLAC**, or unwatermarked 320kbps MP3).
- **Strict Zero-Leak Policy**:
  - **Master audio files must NEVER be committed into the Git repository or placed within `public/` directories**.
  - The project `.gitignore` enforces strict exclusions with an allowlist limited to preview samples and repository watermark tag assets:
    ```gitignore
    # Temporary media & uploaded files
    tmp/
    temp/
    uploads/
    *.wav
    *.flac
    *.mp3
    !assets/watermark/
    !assets/watermark/**
    !public/audio/previews/
    !public/audio/previews/**
    public/masters/
    ```
    *Note: The watermark voice tag sample in `assets/watermark/` is explicitly exempted from the `*.wav` rule so that development environments can generate watermarked previews locally.*
- **DevOps Controls (Phase 1 Week 1 Implementation)**:
  - **Pre-Commit Hook**: A local Git hook inspects staged files and aborts any commit containing audio file extensions outside `public/audio/previews/**` or `assets/watermark/**`, or any file exceeding 15MB.
  - **CI Pipeline Check**: GitHub Actions automated workflow validates every pull request and push, failing the build if unapproved audio assets are detected in the tree.
- **Private Object Storage Configuration**:
  - Master audio assets reside exclusively in a **Private Bucket** on Cloudflare R2 or AWS S3.
  - Public read/write permissions are 100% blocked at the bucket level.
  - Only authenticated backend Route Handlers with secure S3 credentials can interact with the Private Bucket.
- **Randomized Storage Keys**:
  - Stored files use UUID-based object keys (e.g., `masters/e7b32c81-42a9-45d2-b6cf-20d0e5138139.wav`) to prevent path enumeration or predictability.

---

## 3. Two-Tier Delivery via Download Token & Signed URLs [Phase 2]

To protect master storage from hotlinking and link leakage, the platform implements two-tier access gating:

```
[1. Email Delivery] ──> Link containing Download Token:
                        https://musicshop.vn/downloads?token=<plaintext_token>
                               │
                               ▼
[2. Customer Click]  ─> Next.js Route Handler: GET /api/downloads/:token
                               │
                               ├──> Hash token with SHA-256 & verify against orders.download_token_hash
                               ├──> Verify: orders.payment_status === 'paid'?
                               ├──> Verify: now() <= orders.download_expires_at (30 days)?
                               ├──> Log access in download_logs per order_item_id
                               ├──> Increment order_items.download_count += 1
                               │
                               ▼
[3. Pre-signed URL]  <── 302 Redirect to short-lived Pre-signed URL (Cloudflare R2 / AWS S3)
                         - Strict TTL: 15 to 30 minutes
                         - Header: Content-Disposition: attachment; filename="Track_Title.wav"
                               │
                               ▼
[4. Direct Download] <── Browser downloads master file directly from Private Storage
```

### 3.1. Order Download Token (`download_token_hash`)
- Generated only upon transitioning to `PAID` (initially `NULL` in `orders`).
- High-entropy cryptographic token (at least 128 bits of randomness).
- Stored exclusively as a SHA-256 hash in `orders.download_token_hash` and evaluated via constant-time comparison to prevent timing attacks.
- Plaintext token is never stored in the database and exists solely in the email link sent to the customer.
- Access remains valid for `settings.download_valid_days` (default **30 days**) from payment confirmation (`orders.download_expires_at`).

### 3.2. Short-Lived Pre-signed URLs (TTL 15 - 30 Minutes)
- When the customer clicks download on the web delivery page, the backend invokes the AWS S3 SDK to generate an S3 Pre-signed URL for the corresponding track in `order_items`.
- Time-to-Live is constrained to **15 - 30 minutes** (sufficient for download completion while preventing link redistribution).
- Headers attached:
  ```http
  Content-Disposition: attachment; filename="Track_Title_Master.wav"
  Content-Type: audio/wav
  ```
  ensuring standard, human-readable file naming upon download.

---

## 4. Download Authentication & Audit Logs [Phase 2]

Every master file download request is gated through the application endpoint:

1. **Order Verification**:
   - Matches incoming token hash against `orders.download_token_hash`.
   - Requires `orders.payment_status === 'paid'`. Any order in `pending`, `expired`, or `cancelled` returns HTTP 403 Forbidden.
2. **Expiration Enforcement**:
   - Verifies `now() <= orders.download_expires_at`. Expired tokens return HTTP 410 Gone.
3. **Item-Level Tracking (`order_items`)**:
   - Master files and license PDFs [Phase 3] are controlled per `order_item`.
   - Each successful download increment increments `order_items.download_count`.
4. **Audit Logging (`download_logs`)**:
   - Every download event creates a record in `download_logs`:
     - `order_item_id`: Specific track downloaded.
     - `ip_address`: Client IP address.
     - `user_agent`: Browser and operating system signature.
     - `downloaded_at`: Exact timestamp.
   - Enables anomaly detection, link-sharing discovery, and fraud mitigation.
