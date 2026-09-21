# Project Requirements: Music Store Website (Music Shop)

> **Source of Truth**: Aligned strictly with the [Implementation Plan](../project-plan.md).  
> **The project scope is strictly frozen at exactly 13 features allocated across 3 phases in a 5 / 4 / 4 ratio.**  
> **Language Policy**: The customer-facing website UI is Vietnamese-only; all internal project documentation and technical specifications are written in English. Where UI labels or user-facing messages are quoted, the Vietnamese text is provided in quotes followed by its English explanation in parentheses.

---

## 1. Project Objectives
- Build a specialized online store for selling ready-made instrumental and vocal music tracks (supporting watermarked audio streaming previews, bank transfer via VietQR, manual owner payment confirmation, and automated delivery of timed high-quality master audio download links).
- Provide an end-to-end workflow for receiving, quoting, managing progress, taking deposits, and delivering custom music composition projects requested by clients.

---

## 2. Frozen Scope of 13 Features by Phase

- **Phase 1 (Trial Release) [5 features]**:
  1. Homepage, About, Contact
  2. Track Catalog (search, filter by genre and mood; BPM displayed as reference metadata)
  3. Audio Preview (streaming low-bitrate compressed demo with periodic voice watermark; preview files stored in `public/audio/previews/`)
  4. Pricing Table (catalog tracks by license type and custom composition packages)
  5. Custom Music Request Form (persisted to `custom_requests` AND simultaneously emailed to the store owner via `EmailProvider` backed by Resend; no admin panel in Phase 1)
- **Phase 2 (Sellable Release) [4 features]**:
  6. Cart and Checkout (multi-item cart, bank transfer VietQR with local EMVCo payload generation, manual owner payment verification)
  7. Automated File Delivery (email contains secure download link with `download_token_hash`, generating 15-30 minute Pre-signed URLs on demand)
  8. Two License Types ("Dùng chung" Standard and "Độc quyền" Exclusive - removed from catalog once sold)
  9. Admin Dashboard (upload tracks, configure prices and licenses, manage orders with `needs_refund` filter, manual payment confirmation, and refund tracking)
- **Phase 3 (Complete Release) [4 features]**:
  10. End-to-end Custom Composition Workflow (quote snapshot of `deposit_percent` & `revision_limit`, deposit, demo review, revisions, final payment, master delivery)
  11. Customer Accounts (registration, authentication, purchase order history)
  12. Reviews (verified buyers only can submit ratings and comments)
  13. License PDF Generation (automatically generate copyright license PDF for each purchased track in an order)

---

## 3. Information Pages & Track Catalog (Phase 1)
- **Homepage, About, Contact [Phase 1]**: Introduce the artist/brand, creative philosophy, and official contact channels.
- **Track Catalog [Phase 1]**:
  - Browse available catalog tracks.
  - Full-text search by track title and description.
  - Filter criteria: Filter by Genre and Mood.
  - BPM (beats per minute) is stored and displayed as informational metadata for listeners; it is **not** used as a search filter.
  - Master file key management: In Phase 1, `tracks.original_file_key` is Nullable (`NULL`) because tracks are served from local preview assets before object storage integration. In Phase 2+, every track must have a valid `original_file_key` before transitioning to `published`.
- **Audio Preview [Phase 1]**:
  - Smooth audio player responsive across desktop and mobile browsers.
  - Playback files are compressed low-bitrate MP3s (128kbps) mixed with a periodic voice watermark (voice tag) repeated every 20-30 seconds to safeguard copyright.
  - In Phase 1, preview files are served from `public/audio/previews/`. High-resolution master audio files must **never** be committed to the repository or placed in `public/`.
- **Pricing Table [Phase 1]**: Public pricing table displaying standard rates per license type for ready-made tracks and baseline pricing for custom composition packages.
- **Custom Music Request Form [Phase 1]**:
  - Customers submit requirements specifying musical style, target duration, intended use case, and reference links.
  - In Phase 1, the submission is **persisted into the `custom_requests` table AND simultaneously emailed** to the owner's inbox via Resend (`EmailProvider`). This dual persistence ensures client inquiries are preserved even during email delivery hiccups. The system does not have an admin dashboard in Phase 1.

---

## 4. Cart, Checkout & File Delivery (Phase 2)
- **Multi-Item Cart (`Cart = Multiple Items`) [Phase 2]**:
  - Customers can add multiple tracks to a single order (`orders`).
  - Each item in the order (`order_items`) records the selected track (`track_id`), license tier (`license_id`), and unit price (`unit_price`) at the time of purchase. A track can only have one license type per order.
- **Two License Types [Phase 2]**:
  - **"Dùng chung" (Standard / Non-exclusive)**: Accessible pricing, non-exclusive rights, multiple customers can buy and use under standard licensing terms.
  - **"Độc quyền" (Exclusive)**: Premium pricing, single-buyer exclusive rights.
- **Temporary Reservation & Abuse Control for Exclusive Tracks [Phase 2]**:
  - When an order with exclusive tracks is created, all exclusive tracks are locked: `tracks.status = 'reserved'`, linked with `tracks.reserved_by_order_id = orders.id`, and `reserved_until` set based on `settings.hold_minutes` (default **60 minutes**, reflecting manual bank verification).
  - **Action "Tôi đã chuyển tiền" (I have transferred)**:
    - Customer can click this optional action after executing the bank transfer.
    - System records `orders.paid_claimed_at = now()`, extends exclusive holds to `settings.claimed_hold_hours` (default **24 hours**), and sends an email alert to the store owner.
    - **Abuse Controls**:
      1. Allowed strictly **once** per order; repeat invocations are rejected.
      2. Rejected if the order is already in `EXPIRED` or `CANCELLED` status, returning the user notice: `"Vui lòng liên hệ trực tiếp chủ website"` (Please contact the website owner directly).
      3. The endpoint `POST /api/orders/:id/claim-paid` is rate-limited.
      4. System enforces `settings.max_pending_exclusive_orders` (default **2**), capping the maximum number of concurrent pending orders containing exclusive tracks per customer email and per client IP.
  - Release / expiry / cancellation queries must strictly isolate the order's hold: `WHERE reserved_by_order_id = :order_id AND status = 'reserved'`, clearing `reserved_by_order_id = NULL` and `reserved_until = NULL`. This prevents accidental release of tracks held by another order.
- **VietQR Bank Transfer & Manual Verification [Phase 2]**:
  - Customers pay via bank transfer QR code. The VietQR EMVCo payload is generated entirely in-house without external API dependencies, formatting `order_code` as the transfer memo.
  - The store owner manually checks the bank account balance and clicks `"Xác nhận đã nhận tiền"` (Confirm payment received) in the admin panel.
- **Concurrency & Deadlock Avoidance [Phase 2]**:
  - Reservation, release, and payment confirmation transactions must execute in a single database transaction with strict row-locking order: lock `orders` first, then lock track rows in ascending track ID order (`ORDER BY id ASC FOR UPDATE`).
  - If the order is already `PAID`, subsequent confirmation attempts are safely skipped (idempotency).
- **Rule for Confirming Expired Orders (`EXPIRED`) & Refund Flow [Phase 2]**:
  - When the owner confirms an `EXPIRED` order:
    1. System re-checks availability of all exclusive tracks in the order using `reserved_by_order_id`.
    2. If all exclusive tracks remain available: Order activates to `PAID`, tracks transition to `sold_exclusive` with `reserved_by_order_id = :order_id`, and download access is granted.
    3. If any exclusive track has been sold or reserved by another order:
       - The entire order is **rejected**, remaining in `EXPIRED` status.
       - A `payments` row is inserted with `status = 'paid'` (confirming the money was received in the bank, recording `confirmed_by`, `confirmed_at`), NOT `'refunded'` or `'failed'`.
       - The order is flagged with `orders.needs_refund = true` for 100% of the order total.
  - **Manual Refund Completion**:
    - When the owner completes the manual refund transfer, they click the admin action `"Đánh dấu đã hoàn tiền"` (Mark as refunded).
    - Updates: `orders.needs_refund = false`, `orders.payment_status = 'refunded'`, `payments.status = 'refunded'`, and the bank refund transaction reference is saved in `payments.notes`.
  - The admin order table must support filtering by `needs_refund`.
- **Automated Delivery via Download Token & Signed URLs [Phase 2]**:
  - Upon transitioning to `PAID`, the system generates `orders.download_token_hash` and sets `orders.download_expires_at = confirmed_at + settings.download_valid_days` (default 30 days). Prior to payment, `download_token_hash` and `download_expires_at` are `NULL`.
  - The token must have at least 128 bits of cryptographically secure entropy, stored solely as a SHA-256 hash in `orders.download_token_hash`. Token validation uses constant-time comparison. Plaintext tokens appear exclusively in the download link sent via email (`https://musicshop.vn/downloads?token=<plaintext_token>`).
  - The download endpoint (`/api/downloads/:token`) strictly rejects any request whose order is not `paid` (HTTP 403 Forbidden).
  - Once validated, the system issues a temporary Pre-signed URL (15-30 minute TTL) directly from private object storage. Each download is audited per `order_item_id` in `download_logs`.
- **Admin Dashboard [Phase 2]**:
  - Upload new tracks and manage audio files.
  - Configure pricing tiers and license terms.
  - Manage order list with filters for `payment_status` and `needs_refund`, trigger manual confirmation, and perform `"Đánh dấu đã hoàn tiền"` (Mark as refunded).
  - Configure system operational settings (`hold_minutes`, `claimed_hold_hours`, `download_valid_days`, `max_pending_exclusive_orders`).

---

## 5. Custom Requests, Customer Accounts, Reviews & PDF License (Phase 3)
- **End-to-End Custom Request Workflow [Phase 3]**:
  - Client submits project requirements via customer account.
  - **Snapshot on Quote**: When the composer submits a formal quote (`quoted_price`), the system snapshots operational settings into `custom_requests`: `deposit_percent = settings.deposit_percent` and `revision_limit = settings.free_revisions`. Subsequent system settings changes do not alter already quoted projects.
  - Client confirms and pays deposit (`deposit_amount = quoted_price * deposit_percent / 100`).
  - Composer uploads watermarked demo files.
  - Client reviews demo and submits revision feedback (tracked in `custom_request_revisions`, capped by `revision_limit`).
  - Client approves final demo and pays remaining balance (`remaining_amount`).
  - System delivers complete master package and copyright license.
- **Customer Accounts [Phase 3]**:
  - Registration, authentication, and profile management.
  - View purchase history and active download links.
  - Track custom composition project milestones.
- **Product Reviews [Phase 3]**:
  - Restricted to verified purchasers (`order_items`). Each purchased item may receive at most one review (1-5 star rating and comment).
- **PDF License Generation [Phase 3]**:
  - Automatically generate a personalized copyright license PDF per purchased `order_item`, containing transaction ID, licensee/licensor details, and scope of authorized use.

---

## 6. Non-Functional Requirements
- **Master Audio Asset Protection**: Master files (WAV/FLAC) must never have public URLs, must never be committed to Git or stored in `public/`, and are accessible solely through short-lived Pre-signed URLs (15-30 minutes TTL).
- **Audio Streaming Performance**: Fast, responsive streaming playback across mobile and desktop devices.
- **Transactional Integrity & Concurrency**: Strict row-level locking in ascending key order (`orders` first, then `tracks` ordered by `id ASC FOR UPDATE`) to prevent race conditions, double sales, and database deadlocks.
- **User Interface & Localization**: Fully responsive mobile-first interface. Website UI is Vietnamese-only; SEO-friendly semantic markup.
- **DevOps Controls (Phase 1 Week 1)**: Implement a Git pre-commit hook and CI pipeline check that rejects commits containing audio files outside `public/audio/previews/**` or files exceeding designated size limits (preventing accidental master audio commits).

---

## 7. Out of Scope
- Multilingual website interface (Vietnamese only for end users).
- International credit card gateways (Stripe, PayPal, etc.).
- Subscription or recurring membership models.
- Native mobile applications (iOS / Android).
- Automatic bank-transfer detection via webhooks.
- In-depth revenue analytics reporting.
- Financial invoice generation.
