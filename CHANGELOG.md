# Documentation Changelog (CHANGELOG)

> **Date**: 2026-09-21  
> **Source of Truth**: `docs/project-plan.md` (directly extracted and systematized from the client implementation plan *"Kế hoạch triển khai website bán nhạc: bản gửi khách hàng"* - 2026-09-20).  
> **Project Scope**: Strictly frozen at exactly 13 features allocated across 3 phases in a 5 / 4 / 4 ratio (Phase 1: 5 features, Phase 2: 4 features, Phase 3: 4 features).

---

## 1. Updated Document Inventory

1. [`docs/project-plan.md`](./docs/project-plan.md): Primary source of truth document defining 13 frozen features, 3 delivery milestones, operational rules, glossary, and out-of-scope boundaries.
2. [`docs/requirements/requirements.md`](./docs/requirements/requirements.md): Functional and non-functional requirements, Phase 1/2/3 tags, UI localization policy, and DevOps guardrails.
3. [`docs/architecture/overview.md`](./docs/architecture/overview.md): High-level system architecture, Next.js fullstack monolithic structure, background FFmpeg worker, Cloudflare R2 / AWS S3 storage, Resend `EmailProvider`, and end-to-end data flows.
4. [`docs/architecture/database-schema.md`](./docs/architecture/database-schema.md): Complete relational database schema with 11 tables, multi-item cart structures (`order_items`), `lowercase_snake_case` ENUM standard, and security fields.
5. [`docs/architecture/payment-flow.md`](./docs/architecture/payment-flow.md): VietQR manual verification workflow ("Xác nhận đã nhận tiền"), atomic row-locking concurrency, deadlock avoidance, `PaymentProvider` interface, EXPIRED confirmation rules, and manual refund flow.
6. [`docs/architecture/file-protection.md`](./docs/architecture/file-protection.md): Two-tier file delivery (`download_token_hash` and short-lived Pre-signed URLs), private S3 bucket configuration, `download_logs` audit trail, `.gitignore` exclusions, and DevOps verification checks.
7. [`docs/tasks/001-project-setup.md`](./docs/tasks/001-project-setup.md): Task specification for initial Next.js monorepo setup, database provisioning, and Phase 1 Week 1 DevOps hooks.
8. [`docs/tasks/_template.md`](./docs/tasks/_template.md): Standardized template for engineering task documentation.

---

## 2. Initial Architecture Revisions

### Revision 1: Payment Method & Manual Verification (Payment)
- **Eliminated automated webhook aggregators**: Removed third-party webhook gateways (such as payos, sepay, casso). Replaced with direct bank transfers using VietQR, verified manually by the owner via the admin action **"Xác nhận đã nhận tiền" (Confirm payment received)**.
- **Preserved Idempotency**: Atomic row-level database locking (`SELECT ... FOR UPDATE`) during order transition from `PENDING` to `PAID`. Subsequent confirmation attempts on already `PAID` orders are safely bypassed without duplicate delivery or emails.
- **`PaymentProvider` Interface**: Defined a TypeScript `PaymentProvider` interface that generates QR codes locally and provides extension hooks for future automated webhook adapters without modifying core domain logic.
- **Removed `'payos'` from `payment_method`**: Standardized payment method value to `'bank_transfer_qr'`.
- **Out of Scope**: Added automated bank-transfer detection via webhooks to the Out of Scope section in `requirements.md` and `project-plan.md`.

### Revision 2: Expired Order Handling (Expired Orders)
- **Configurable hold duration**: Added `settings.hold_minutes` to dynamic configuration.
- **Rule for Admin confirming `EXPIRED` orders**:
  1. System re-checks availability of all exclusive tracks in the order.
  2. If all exclusive tracks remain available: Activate order to `PAID`, transition tracks to `sold_exclusive`, and issue download access.
  3. If any exclusive track has been taken: Reject order activation, maintain `EXPIRED` status, and set a manual refund flag.

### Revision 3: Tech Stack Standardization (Stack)
- **Removed separate Express/Fastify backend**: Consolidated into a unified **Next.js (TypeScript, App Router)** monorepo utilizing Route Handlers (`src/app/api/...`).
- **Audio Processing (FFmpeg)**: Runs as an internal script / background worker within the repository rather than an external microservice.
- **Object Storage**: Selected **Cloudflare R2** (or **AWS S3**) compatible with the S3 API, eliminating minio.
- **Removed placeholders**: Removed all occurrences of `[STACK]` across documentation.

### Revision 4: Project Scope (Scope)
- **Removed features**:
  - Removed Revenue Statistics reporting.
  - Removed Financial Invoice generation.
- **Retained**: Retained automated PDF copyright license generation for **Phase 3**.
- **BPM Metric**: Classified strictly as display metadata for track listings; not used as a catalog search filter.

### Revision 5: Secure Download Delivery (Download Flow)
- **No direct S3 links in emails**: Emails deliver application endpoint URLs containing a secure token.
- **Configurable token lifespan**: Valid for `settings.download_valid_days` (default 30 days).
- **Short-lived Pre-signed URLs**: Clicking the email link validates order status and generates an S3 Pre-signed URL valid for 15 - 30 minutes with `Content-Disposition: attachment`.

### Revision 6: Database Schema Expansions (Schema)
- **Added 6 new tables**:
  1. `order_items` [Phase 2]: Multi-item cart support, tracks `download_count` and `license_pdf_url`.
  2. `payments` [Phase 2 & Phase 3]: Financial transaction logs, tracks `confirmed_by`, `confirmed_at`, and audit `notes`.
  3. `download_logs` [Phase 2]: Security audit logging (`order_item_id`, `ip_address`, `user_agent`, `downloaded_at`).
  4. `settings` [Phase 2]: Business parameters (`hold_minutes`, `free_revisions`, `deposit_percent`, `download_valid_days`).
  5. `custom_request_revisions` [Phase 3]: Demo version tracking and client revision requests.
  6. `reviews` [Phase 3]: Star ratings and comments constrained by unique `order_item_id`.
- **Added `payment_status` value `'expired'`** [Phase 2].
- **Standardized ENUM casing**: 100% of ENUM values standardized to `lowercase_snake_case`.

### Revision 7: Document Structure & Formatting (Structure)
- **Removed `TODO:` prefixes**: Removed all occurrences of `TODO:` across all documents.
- **Phase tags (Phase 1 / Phase 2 / Phase 3)**: Explicitly tagged every requirement, architectural module, and database entity with its respective phase.
- **Supplied missing requirements**: Documented Homepage/About/Contact [Phase 1], Pricing Table [Phase 1], Customer Accounts [Phase 3], Reviews [Phase 3], and clarified that Phase 1 does not have an Admin Panel.

### Revision 8: Core Design Decisions (Decisions)
- **Multi-Item Cart (`Cart = Multiple Items`)**: Split order entity into `orders` (order totals, customer details, payment status) and `order_items` (track reference, license, unit price, download count).
- **Simultaneous reservation and release**: Handled atomic locking and release for exclusive items.
- **Catalog filters**: Restricted filters to Genre and Mood; BPM is informational only.

---

## 3. Follow-up Architectural Fixes

1. **`settings.hold_minutes` default = 60 minutes & "Tôi đã chuyển tiền" Action [Phase 2]**:
   - Increased default hold duration from 15 minutes to **60 minutes** to accommodate manual bank reconciliation.
   - Added optional customer action **"Tôi đã chuyển tiền" (I have transferred)** (`orders.paid_claimed_at = now()`), extending exclusive reservation holds to `settings.claimed_hold_hours` (default **24 hours**) and notifying the owner.

2. **Explicit `needs_refund` Boolean Column on `orders` [Phase 2]**:
   - Defined `needs_refund` (BOOLEAN, Default: `false`) directly on `orders` to enable instant filtering in the admin order list without table joins.

3. **Deadlock Avoidance Concurrency Pattern [Phase 2]**:
   - Enforced single database transaction with fixed locking order: lock `orders` first, then lock `tracks` in ascending ID order (`ORDER BY id ASC FOR UPDATE`).

4. **Snapshot Settings for `custom_requests` on Quote [Phase 3]**:
   - Composer quotes snapshot `deposit_percent` and `revision_limit` from `settings` into `custom_requests` to insulate active projects from future settings adjustments.

5. **Clarified 5 / 4 / 4 Feature Allocation**:
   - Explicitly documented the 5 / 4 / 4 feature distribution across the 3 phases as specified in the client-facing plan.

6. **Audio Asset Storage & `.gitignore` Allowlist Policy**:
   - Previews in Phase 1 are located in `public/audio/previews/`.
   - Master audio files (`*.wav`, `*.flac`, `*.mp3`, `public/masters/`, `uploads/`) are strictly blocked by `.gitignore`. Explicit allowlist exceptions are reserved solely for watermarked preview samples (`!public/audio/previews/**`) and development voice tag assets (`!assets/watermark/**`).

7. **Download Token & Audit Logging Location**:
   - Token resides on `orders` as an order-level access credential; download tracking is recorded per `order_item_id` in `download_logs`.

---

## 4. Resolved Architectural Inquiries

All architectural decisions concerning in-house VietQR generation, EXPIRED order conflict handling, Resend email transport, and Phase 1 preview file locations were finalized and incorporated into the specifications.

---

## 5. Addendum to Step 1

1. **Reservation Isolation via `tracks.reserved_by_order_id` & QA Plan [Phase 2]**:
   - Added `reserved_by_order_id` (UUID, FK -> `orders.id`, Nullable) on `tracks`.
   - Set during reservation and exclusive sale (`sold_exclusive`).
   - Release queries strictly isolate the target order: `WHERE reserved_by_order_id = :order_id AND status = 'reserved'`, clearing `reserved_by_order_id = NULL` and `reserved_until = NULL`.
   - Re-check in EXPIRED order confirmation evaluates `reserved_by_order_id IS NOT NULL AND reserved_by_order_id <> :current_order_id`.
   - QA scenario: Order A expires, Order B reserves the same track, Order A is cancelled or re-swept; Order B's hold remains completely intact.

2. **Nullable `orders.download_expires_at` & Endpoint Authorization [Phase 2]**:
   - `orders.download_expires_at` is Nullable upon creation and calculated upon transitioning to `paid`.
   - Download endpoint strictly rejects requests whose order is not `paid`.

3. **Dynamic `settings.claimed_hold_hours` [Phase 2]**:
   - Replaced hardcoded intervals with dynamic setting `settings.claimed_hold_hours` (default 24h).

4. **Phase Rules for `tracks.original_file_key` [Phase 1 & Phase 2]**:
   - Nullable in Phase 1; required Not Null in Phase 2+ before publishing.

5. **Dual Persistence for Custom Request Form [Phase 1]**:
   - Form 5 persists records into `custom_requests` and simultaneously dispatches an email alert via Resend `EmailProvider`.

6. **Strict `.gitignore` & Defense-in-Depth DevOps Controls**:
   - Excludes unapproved audio and implements pre-commit hooks and CI checks.

---

## 6. Step 1 Remaining Corrections & Full English Translation

1. **Abuse Control for "Tôi đã chuyển tiền" (I have transferred) [Phase 2]**:
   - Allowed strictly once per order; subsequent attempts are rejected.
   - Rejected when order is `EXPIRED` or `CANCELLED`, returning the user notice: `"Vui lòng liên hệ trực tiếp chủ website"` (Please contact the website owner directly).
   - Enforced setting `settings.max_pending_exclusive_orders` (default 2), capping concurrent pending exclusive orders per customer email and per client IP.
   - Endpoint `POST /api/orders/:id/claim-paid` is rate-limited. Added `max_pending_exclusive_orders` to `settings` table.

2. **Rejected EXPIRED Confirmation & Manual Refund Flow [Phase 2]**:
   - When owner confirms an `EXPIRED` order whose exclusive track has been lost: inserts a `payments` row with `status = 'paid'` (since money was received in the bank, recording `confirmed_by`, `confirmed_at`), NOT `'refunded'` or `'failed'`.
   - Defined manual refund completion step: when owner refunds manually, they click the admin action **"Đánh dấu đã hoàn tiền" (Mark as refunded)**, setting `orders.needs_refund = false`, `orders.payment_status = 'refunded'`, `payments.status = 'refunded'`, and saving the bank reference in `payments.notes`.

3. **Cryptographic `download_token_hash` [Phase 2]**:
   - Column `orders.download_token` renamed to `orders.download_token_hash` (Nullable upon order creation, generated when order becomes `paid`).
   - Token generated with at least 128 bits of cryptographic entropy, stored as a SHA-256 hash in the database, and evaluated via constant-time comparison. Plaintext token appears exclusively in the customer email link.

4. **QA Concurrency & Deadlock Avoidance Test**:
   - Added concurrency test scenario: Two concurrent orders with overlapping exclusive tracks requested in opposite order must not deadlock, and each track is held by only one order.
   - Explicitly specified that the automated background expiry/sweep job follows the identical lock ordering: order row first, then tracks by ascending ID (`ORDER BY id ASC FOR UPDATE`).

5. **Repository Rules & Watermark Asset Exemption**:
   - Added explicit `.gitignore` exception for `!assets/watermark/` and `!assets/watermark/**` so watermark voice tag assets can be kept in the repository for preview generation.
   - Documented pre-commit hook and CI checks as Phase 1 Week 1 DevOps tasks.
   - Updated Section 3.6 description to eliminate contradictions with Section 5.6.

6. **Complete English Translation of Project Documentation**:
   - Translated all documentation under `docs/` (`project-plan.md`, `requirements.md`, `overview.md`, `database-schema.md`, `payment-flow.md`, `file-protection.md`, `001-project-setup.md`, `_template.md`) and `CHANGELOG.md` into natural technical English.
   - Added glossary to `docs/project-plan.md`.
   - Stated UI language policy in `requirements.md` (website UI is Vietnamese-only, project docs are English). Quoted Vietnamese UI labels and messages are accompanied by English explanations.
