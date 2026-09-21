# System Architecture Overview

> **Source of Truth**: Aligned strictly with the [Implementation Plan](../project-plan.md).  
> **The project scope is strictly frozen at exactly 13 features allocated across 3 phases in a 5 / 4 / 4 ratio.**

---

## 1. Functional Module Breakdown by Phase

The system is organized into a modular monolith deployed progressively across 3 phases:

### Phase 1 (Trial Release) [5 features]
- **Presentation & Static Pages Module [Phase 1]**: Serves the Homepage, Artist About page, Contact channels, and public Pricing Tables (catalog tracks by license type & custom packages).
- **Track Catalog & Audio Streaming Module [Phase 1]**:
  - Manages the public track catalog.
  - Full-text search across titles and descriptions.
  - Catalog filtering by Genre and Mood.
  - Stores and displays BPM as informational reference metadata (not used as a search filter).
  - Audio streaming player for compressed MP3 (128kbps) previews with periodic voice watermarks. In Phase 1, preview files are served from `public/audio/previews/`.
  - Master audio management: `tracks.original_file_key` is Nullable in Phase 1 (as demo tracks are served locally before object storage setup). In Phase 2+, every track must have a valid `original_file_key` before transitioning to `published`.
- **Custom Request Form Module [Phase 1]**: Collects custom composition inquiry briefs; the system **persists the record into `custom_requests` AND simultaneously dispatches an email alert** to the store owner's inbox via `EmailProvider` (backed by Resend). This dual persistence guarantees inquiries are preserved even if email transmission fails (no admin dashboard exists in Phase 1).

### Phase 2 (Sellable Release) [4 features]
- **Cart & Orders Module [Phase 2]**:
  - Multi-item cart (`orders` and `order_items`). Each item links a track to a specific license type (`standard` or `exclusive`).
  - Order status lifecycle: `pending`, `paid`, `expired`, `cancelled`, `refunded`.
  - Temporary reservation of exclusive tracks: Automatically sets `tracks.status = 'reserved'`, links `tracks.reserved_by_order_id = orders.id`, and applies a default hold duration of 60 minutes (`settings.hold_minutes = 60`).
  - Customer claim action `"Tôi đã chuyển tiền"` (I have transferred): Updates `orders.paid_claimed_at = now()`, extends reservation hold to `settings.claimed_hold_hours` (default 24 hours), and emails the owner for priority verification.
  - **Abuse Controls on Claim Action**:
    - Callable only once per order.
    - Rejected if the order is `EXPIRED` or `CANCELLED`, returning the notice `"Vui lòng liên hệ trực tiếp chủ website"` (Please contact the website owner directly).
    - Rate-limited endpoint (`POST /api/orders/:id/claim-paid`).
    - Enforces `settings.max_pending_exclusive_orders` (default 2) per customer email and per client IP.
  - Selective release of exclusive tracks: Expiry/cancellation queries strictly target `WHERE reserved_by_order_id = :order_id AND status = 'reserved'`, clearing `reserved_by_order_id = NULL` and `reserved_until = NULL`.
- **Payment & Confirmation Module [Phase 2]**:
  - VietQR integration: Generates standardized EMVCo payload strings locally in-house (no third-party API dependencies), encoding the transfer memo as `order_code`.
  - Manual payment confirmation: Owner verifies bank statement and clicks `"Xác nhận đã nhận tiền"` (Confirm payment received) on the admin dashboard.
  - Deadlock Avoidance Pattern: All reservation, release, and confirmation operations execute within a single database transaction locking the `orders` row first, followed by `tracks` rows ordered by ascending ID (`ORDER BY id ASC FOR UPDATE`).
  - Handling `EXPIRED` orders on confirmation: Re-checks exclusive track availability via `reserved_by_order_id`. If an exclusive track was taken by another order, the system rejects the order (stays `EXPIRED`), records an audit payment with `payments.status = 'paid'`, and flags `orders.needs_refund = true` (100% refund).
  - Manual Refund Completion: Owner issues bank refund and clicks `"Đánh dấu đã hoàn tiền"` (Mark as refunded), setting `orders.needs_refund = false`, `orders.payment_status = 'refunded'`, `payments.status = 'refunded'`, and saving the bank reference in `payments.notes`.
  - Abstraction: Isolated behind the `PaymentProvider` interface, allowing pluggable webhook adapters in the future without modifying core business logic.
- **File Protection & Delivery Module [Phase 2]**:
  - Secure master file storage (WAV 24-bit / FLAC) in Private Object Storage (Cloudflare R2 or AWS S3). Zero master files committed to Git or stored in `public/`.
  - Timed download token: When order becomes `PAID`, sets `orders.download_expires_at = confirmed_at + settings.download_valid_days` (default 30 days) and generates a 128+ bit cryptographically secure token stored as SHA-256 in `orders.download_token_hash`. Plaintext token exists only in the customer's email link.
  - Download verification: Endpoint requires `orders.payment_status === 'paid'` (strictly rejects unpaid orders) and issues short-lived Pre-signed URLs (15-30 minute TTL) with `Content-Disposition: attachment`.
  - Download auditing: Logs each download event per `order_item_id` in `download_logs`.
- **Admin Dashboard Module [Phase 2]**: Private portal for the owner to upload tracks, edit prices and license tiers, manage orders (with `needs_refund` filtering), confirm payments, record refunds, and adjust operational settings (`hold_minutes`, `claimed_hold_hours`, `download_valid_days`, `max_pending_exclusive_orders`).

### Phase 3 (Complete Release) [4 features]
- **Custom Request Workflow Module [Phase 3]**: Full end-to-end custom composition management: Brief submission -> Quote (snapshots `deposit_percent` and `revision_limit` from `settings` into `custom_requests`) -> Deposit payment -> Demo audio upload -> Revision feedback loop (tracked in `custom_request_revisions`, bounded by `revision_limit`) -> Final payment -> Handover of master files and license.
- **Customer Accounts Module [Phase 3]**: Secure authentication, order history lookup, active download access, and custom composition project tracking.
- **Reviews Module [Phase 3]**: Verified buyer rating system (1 to 5 stars and comments) tied to unique `order_item_id` records.
- **License PDF Generator Module [Phase 3]**: Automated generation of personalized copyright license PDFs per purchased `order_item`, stored in Object Storage.

---

## 2. Core Tech Stack

The platform is structured as a unified TypeScript monorepo with minimal operational overhead:

- **Fullstack Web Framework**: Next.js (TypeScript, App Router) with Tailwind CSS for frontend styling and Next.js Route Handlers (`src/app/api/...`) for RESTful API endpoints.
- **Database & ORM**: PostgreSQL managed via Prisma ORM for schema definitions, migrations, and transactional type-safety. Because Prisma has no native support for `FOR UPDATE`, all pessimistic row-locking queries run inside `prisma.$transaction` using `prisma.$queryRaw`.
- **Object Storage**: S3-compatible Cloudflare R2 (or AWS S3):
  - **Public Bucket / CDN**: Cover art images and compressed watermarked preview MP3s.
  - **Private Bucket**: Master audio files (WAV/FLAC) and generated license PDFs.
- **Audio Processing**: Internal standalone script / background worker running **FFmpeg** in the repository to compress audio and mix voice tags into preview files on upload.
- **Email Delivery**: **Resend** abstracted behind an `EmailProvider` interface for order notifications, payment confirmations, and custom inquiry alerts.
- **Testing Framework**: **Vitest** for unit, integration, concurrency, and authorization test suites.
- **Containerization & DevOps**: Docker, Docker Compose for local development; GitHub Actions for automated CI; Git pre-commit hooks and CI checks configured in Phase 1 Week 1 to prevent audio files outside `public/audio/previews/**` from entering the repository.

---

## 3. Primary Data Flows

### 3.1. Track Catalog Browsing and Audio Preview [Phase 1]
```
Client (Browser/Mobile)
  │
  ├── 1. GET /api/tracks?genre=...&mood=...&q=... ──> Next.js Route Handler ──> PostgreSQL
  │                                                                                  │
  │   <── Returns track metadata (Title, Price, BPM info, Cover URL) <───────────────┘
  │
  └── 2. Audio Player Playback ──> CDN / Cloudflare R2 Public or /public/audio/previews/ (MP3 Watermark)
```

### 3.2. Purchasing, Manual Verification, and File Delivery [Phase 2]
```
[1. Order Creation]
Customer ──> POST /api/orders (select tracks + licenses)
             │
             └──> Next.js Route Handler:
                     - Checks pending order cap (max_pending_exclusive_orders)
                     - Creates Order & OrderItems
                     - Locks exclusive tracks: status = 'reserved', reserved_by_order_id = order.id,
                       reserved_until = now() + (hold_minutes * interval '1 minute') (default 60 min)
                     - Returns VietQR (EMVCo payload generated locally) with order_code

[1b. Customer Optional Claim: "Tôi đã chuyển tiền"]
Customer ──> POST /api/orders/:id/claim-paid
             │
             └──> Checks: Not already claimed? Order not EXPIRED or CANCELLED? Rate limit OK?
                  - Updates orders.paid_claimed_at = now()
                  - Extends reserved_until = now() + (claimed_hold_hours * interval '1 hour') (default 24h)
                  - Sends email alert to store owner via Resend

[2. Payment & Confirmation]
Customer ──> Scans VietQR and executes bank transfer
Owner    ──> Verifies bank statement balance and order_code memo
             │
             └──> Clicks "Xác nhận đã nhận tiền" on Admin Dashboard
                     │
                     └──> POST /api/admin/orders/:id/confirm-payment
                             - Database Transaction with strict Row-level locking:
                               1. Lock order: orders WHERE id = $1 FOR UPDATE
                               2. Lock tracks: tracks WHERE id IN (...) ORDER BY id ASC FOR UPDATE
                             - Check: If order is EXPIRED -> Re-check exclusive tracks via reserved_by_order_id
                               + If exclusive track conflict: Reject order (stays EXPIRED),
                                 insert payments row with status = 'paid', set orders.needs_refund = true
                               + If exclusive tracks available: Activate order to PAID
                             - Update Order: status = 'paid', download_expires_at = now() + download_valid_days,
                               generate 128-bit download_token_hash (SHA-256)
                             - Update Exclusive Tracks: status = 'sold_exclusive', reserved_by_order_id = order.id
                             - Insert Payments record: status = 'paid', confirmed_by, confirmed_at
                             - Send success email with download link containing plaintext token (via Resend)

[2b. Manual Refund Flow (if conflict occurred on EXPIRED order)]
Owner    ──> Issues manual bank transfer refund to customer
             Clicks "Đánh dấu đã hoàn tiền" on Admin Dashboard
             │
             └──> POST /api/admin/orders/:id/mark-refunded
                     - Updates orders: needs_refund = false, payment_status = 'refunded'
                     - Updates payments: status = 'refunded', notes = refund bank reference

[3. Customer Download Handover]
Customer ──> Clicks download link in email: GET /api/downloads/:token
             │
             └──> Next.js Route Handler:
                     - Hashes incoming token with SHA-256 and verifies against orders.download_token_hash (constant-time)
                     - Validates order: MUST be payment_status === 'paid' (rejects otherwise)
                     - Validates expiration: now() <= orders.download_expires_at
                     - Logs download event in download_logs per order_item_id & increments download_count
                     - Generates Pre-signed URL from R2/S3 (TTL 15 - 30 min, Content-Disposition: attachment)
                     - 302 Redirects browser to download master file directly from Private Object Storage
```

### 3.3. Custom Request Workflow [Phase 1 & Phase 3]
- **Phase 1**: Customer submits brief -> Next.js Route Handler **persists record into `custom_requests` AND simultaneously emails** inquiry to owner via `EmailProvider` (Resend) -> Owner liaises directly with customer via email.
- **Phase 3 (Integrated Workflow)**:
```
Customer (Account) ──> Submits custom request (Brief, style, duration) ──> custom_requests
                                                                               │
Owner / Composer   ──> Enters quote (quoted_price); system snapshots <─────────┘
                       `deposit_percent` & `revision_limit` from settings
                       │
Customer           ──> Accepts quote, pays deposit (deposit_amount) via VietQR
                       │
Owner              ──> Confirms deposit -> Composes music -> Uploads watermarked demo
                       │
Customer           ──> Listens to demo, submits feedback (custom_request_revisions)
                       │  (Repeats within snapshotted revision_limit)
Customer           ──> Approves final demo -> Pays remaining balance (remaining_amount)
                       │
Owner              ──> Confirms final balance -> System delivers master files + License PDF
```

---

## 4. Portability and Hosting Guardrails

To prevent vendor lock-in and guarantee zero-downtime migration between environments (local development, Phase 1 Render/Neon demo, and Phase 2 production VPS):

1. **Hard Rule: No Real Customer Orders on Any Free Tier**:
   - Free tiers (Render web service, Neon serverless Postgres, Cloudflare quick tunnels) are strictly dedicated to Phase 1 preview demonstration and stakeholder review.
   - Real customer orders, VietQR payment verifications, and digital master downloads must NEVER run on any free tier. Phase 2 commercial transactions require the dedicated paid VPS.
2. **Vendor-Agnostic Application Code**:
   - Application code must never import hosting-vendor-specific SDKs or runtime APIs (e.g., no `@vercel/kv`, `@vercel/blob`, Vercel Edge runtime, or vendor-proprietary cron configuration files).
   - Any platform-specific capability must sit strictly behind an abstract TypeScript interface:
     - Email dispatch: `EmailProvider` (`ResendEmailProvider` in production, `ConsoleEmailProvider` in development/testing).
     - Payment processing: `PaymentProvider` (`VietQRPaymentProvider` generating EMVCo strings locally).
     - Rate limiting: `RateLimiter` (`MemoryRateLimiter` for single-instance demo/VPS; expandable to shared store if multi-instance scaling is required).
3. **Container Image Portability**:
   - The primary container deployment artifact is `build/deploy/Dockerfile`.
   - The multi-stage build creates a standalone Next.js server with bundled OpenSSL (for Prisma engine) and FFmpeg/ffprobe.
   - The container must remain 100% portable and runnable across local Docker Compose, the Render Docker web service, and the Phase 2 paid VPS.
4. **Migration Path to Production VPS**:
   - **Database Dump & Restore**: Database migrations run directly against `DIRECT_URL`. When migrating from Neon free to the VPS PostgreSQL container:
     ```bash
     pg_dump -Fc --no-acl --no-owner -d "$DIRECT_URL" -f neon_backup.dump
     pg_restore --clean --if-exists -d "$DATABASE_URL" neon_backup.dump
     ```
   - **DNS Pre-Cutover**: Lower DNS record TTL to 300 seconds at least 48 hours prior to VPS cutover.
   - **Configuration Parity**: Provision production environment variables directly from `.env.example`.
