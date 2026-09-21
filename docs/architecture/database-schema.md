# Database Schema Specification

> **Source of Truth**: Aligned strictly with the [Implementation Plan](../project-plan.md).  
> **All ENUM values are standardized in lowercase `lowercase_snake_case`.**  
> Each table is tagged with its development phase (Phase 1 / Phase 2 / Phase 3).

---

## 1. Table `users` [Phase 2: Admin / Phase 3: Customers]
Manages administrator accounts (Phase 2) and authenticated customer accounts (Phase 3).
- `id` (UUID, Primary Key, Default: `gen_random_uuid()`)
- `email` (VARCHAR, Unique, Not Null)
- `password_hash` (VARCHAR, Not Null)
- `full_name` (VARCHAR, Not Null)
- `phone_number` (VARCHAR, Nullable)
- `role` (ENUM: `'admin'`, `'customer'`, Not Null, Default: `'customer'`)
- `created_at` (TIMESTAMP, Not Null, Default: `now()`)
- `updated_at` (TIMESTAMP, Not Null, Default: `now()`)

---

## 2. Table `tracks` [Phase 1]
Manages the public track catalog, display metadata, audio paths, and inventory statuses.
- `id` (UUID, Primary Key, Default: `gen_random_uuid()`)
- `title` (VARCHAR, Not Null)
- `slug` (VARCHAR, Unique, Not Null)
- `description` (TEXT, Nullable)
- `genre` (VARCHAR, Not Null) - Musical genre (used as a catalog filter)
- `mood` (VARCHAR, Not Null) - Musical mood (used as a catalog filter)
- `bpm` (INTEGER, Nullable) - Tempo in beats per minute (stored and displayed as reference metadata, **not** used as a filter)
- `duration_seconds` (INTEGER, Not Null)
- `preview_file_url` (VARCHAR, Not Null) - URL for the compressed 128kbps watermarked MP3 (served from CDN/R2 Public or temporarily from `public/audio/previews/` in Phase 1)
- `original_file_key` (VARCHAR, Nullable in Phase 1, Not Null upon publishing in Phase 2+) - Path to the original lossless master audio file (WAV/FLAC) in Private Object Storage. In Phase 1, `NULL` is allowed while using local static previews; in Phase 2+, every track must have a valid `original_file_key` before transitioning to `'published'`. Must never be committed to Git or stored in `public/`.
- `cover_image_url` (VARCHAR, Nullable) - Track or album cover art URL
- `status` (ENUM: `'draft'`, `'published'`, `'reserved'`, `'sold_exclusive'`, `'archived'`, Not Null, Default: `'draft'`)
- `reserved_by_order_id` (UUID, Foreign Key -> `orders.id`, Nullable) - Identifier of the order currently holding or having purchased exclusive rights. Set during reservation hold (`reserved`) and exclusive purchase (`sold_exclusive`). Expiry, cancellation, or sweep operations must only affect tracks `WHERE reserved_by_order_id = :order_id AND status = 'reserved'`, clearing `reserved_by_order_id = NULL` and `reserved_until = NULL`.
- `reserved_until` (TIMESTAMP, Nullable) - Expiration timestamp of the exclusive temporary reservation hold
- `created_at` (TIMESTAMP, Not Null, Default: `now()`)
- `updated_at` (TIMESTAMP, Not Null, Default: `now()`)

---

## 3. Table `licenses` [Phase 2]
Defines licensing options and pricing available per track.
- `id` (UUID, Primary Key, Default: `gen_random_uuid()`)
- `track_id` (UUID, Foreign Key -> `tracks.id`, Not Null)
- `license_type` (ENUM: `'standard'`, `'exclusive'`, Not Null)
- `price` (BIGINT, Not Null) - Price in Vietnamese Dong (VND)
- `terms_summary` (TEXT, Nullable) - Summary of licensing rights and usage permissions
- `is_active` (BOOLEAN, Not Null, Default: `true`)
- `created_at` (TIMESTAMP, Not Null, Default: `now()`)
- `updated_at` (TIMESTAMP, Not Null, Default: `now()`)

---

## 4. Table `orders` [Phase 2]
Manages checkout orders, customer contact details, payment statuses, and secure download tokens for multi-item carts (`Cart = Multiple Items`).
> **Design Note**: Individual track columns (`track_id`, `license_id`, `amount`) have been removed from `orders`; multi-track purchases are tracked via `order_items`.
- `id` (UUID, Primary Key, Default: `gen_random_uuid()`)
- `order_code` (VARCHAR, Unique, Not Null) - Unique human-readable code (e.g., `ORD-20260921-ABCD`)
- `user_id` (UUID, Foreign Key -> `users.id`, Nullable) - Linked customer account (`NULL` for guest checkouts in Phase 2)
- `customer_email` (VARCHAR, Not Null) - Email recipient for payment confirmation and download links
- `customer_name` (VARCHAR, Not Null)
- `customer_phone` (VARCHAR, Nullable)
- `total_amount` (BIGINT, Not Null) - Total order amount in VND
- `payment_status` (ENUM: `'pending'`, `'paid'`, `'expired'`, `'cancelled'`, `'refunded'`, Not Null, Default: `'pending'`)
- `needs_refund` (BOOLEAN, Not Null, Default: `false`) - Boolean flag indicating that manual refund is required (stored on `orders` to allow quick admin filtering without joining `payments`)
- `paid_claimed_at` (TIMESTAMP, Nullable) - Timestamp when customer clicks "Tôi đã chuyển tiền" (I have transferred) to extend hold duration to `settings.claimed_hold_hours` (default 24 hours). Allowed strictly once per order.
- `payment_method` (VARCHAR, Not Null, Default: `'bank_transfer_qr'`)
- `download_token_hash` (VARCHAR, Unique, Nullable) - SHA-256 hash of the cryptographically random download token (at least 128 bits of entropy). Initially `NULL` upon order creation, generated only when order transitions to `'paid'`. Plaintext token appears exclusively in the customer email link.
- `download_expires_at` (TIMESTAMP, Nullable) - Expiry timestamp of download access. Initially `NULL`, set to `confirmed_at + (settings.download_valid_days * interval '1 day')` upon transitioning to `'paid'`.
- `created_at` (TIMESTAMP, Not Null, Default: `now()`)
- `updated_at` (TIMESTAMP, Not Null, Default: `now()`)

---

## 5. Table `order_items` [Phase 2]
Details each track and selected license tier inside a multi-product order.
- `id` (UUID, Primary Key, Default: `gen_random_uuid()`)
- `order_id` (UUID, Foreign Key -> `orders.id`, On Delete Cascade, Not Null)
- `track_id` (UUID, Foreign Key -> `tracks.id`, Not Null)
- `license_id` (UUID, Foreign Key -> `licenses.id`, Not Null)
- `unit_price` (BIGINT, Not Null) - Locked purchase price at checkout time (VND)
- `download_count` (INTEGER, Not Null, Default: 0) - Download count for this item
- `license_pdf_url` (VARCHAR, Nullable) - Path to the automatically generated copyright license PDF [Phase 3]
- `created_at` (TIMESTAMP, Not Null, Default: `now()`)

---

## 6. Table `payments` [Phase 2 & Phase 3]
Records all financial transactions (full cart payment in Phase 2; deposit and final balance payments for custom projects in Phase 3).
- `id` (UUID, Primary Key, Default: `gen_random_uuid()`)
- `order_id` (UUID, Foreign Key -> `orders.id`, Nullable) - Linked catalog track order
- `custom_request_id` (UUID, Foreign Key -> `custom_requests.id`, Nullable) - Linked custom composition project
- `payment_type` (ENUM: `'full'`, `'deposit'`, `'final'`, Not Null, Default: `'full'`)
- `amount` (BIGINT, Not Null) - Transaction amount in VND
- `payment_method` (VARCHAR, Not Null, Default: `'bank_transfer_qr'`)
- `status` (ENUM: `'pending'`, `'paid'`, `'failed'`, `'refunded'`, Not Null, Default: `'pending'`)
  - *Note on EXPIRED Confirmation Conflict*: If owner confirms an `EXPIRED` order whose exclusive track was taken, `payments.status` is set to `'paid'` (money was received), recording `confirmed_by` and `confirmed_at`. When owner later executes the manual refund via "Đánh dấu đã hoàn tiền" (Mark as refunded), `payments.status` is updated to `'refunded'`.
- `transaction_code` (VARCHAR, Nullable) - Bank transaction identifier or payment memo
- `confirmed_by` (UUID, Foreign Key -> `users.id`, Nullable) - Admin user ID confirming the transaction
- `confirmed_at` (TIMESTAMP, Nullable) - Timestamp of confirmation
- `notes` (TEXT, Nullable) - Audit notes, reconciliation details, or refund bank transfer references
- `created_at` (TIMESTAMP, Not Null, Default: `now()`)
- `updated_at` (TIMESTAMP, Not Null, Default: `now()`)

---

## 7. Table `download_logs` [Phase 2]
Audit log tracking every download click for security and abuse detection.
- `id` (UUID, Primary Key, Default: `gen_random_uuid()`)
- `order_item_id` (UUID, Foreign Key -> `order_items.id`, On Delete Cascade, Not Null)
- `ip_address` (VARCHAR, Not Null)
- `user_agent` (TEXT, Nullable)
- `downloaded_at` (TIMESTAMP, Not Null, Default: `now()`)

---

## 8. Table `settings` [Phase 2]
Dynamic business configuration parameters for platform operations.
- `id` (VARCHAR, Primary Key, Default: `'default'`)
- `hold_minutes` (INTEGER, Not Null, Default: 60) - Default minutes to hold exclusive tracks for `pending` orders (default 60 minutes for manual owner verification)
- `claimed_hold_hours` (INTEGER, Not Null, Default: 24) - Hours to extend exclusive track hold when customer clicks "Tôi đã chuyển tiền" (I have transferred)
- `max_pending_exclusive_orders` (INTEGER, Not Null, Default: 2) - Maximum concurrent pending orders with exclusive tracks allowed per customer email and per IP address
- `free_revisions` (INTEGER, Not Null, Default: 2) - Number of free demo revision rounds included in custom requests [Phase 3]
- `deposit_percent` (INTEGER, Not Null, Default: 50) - Required advance deposit percentage [Phase 3]
- `download_valid_days` (INTEGER, Not Null, Default: 30) - Number of days download tokens remain valid after payment confirmation
- `updated_at` (TIMESTAMP, Not Null, Default: `now()`)

---

## 9. Table `custom_requests` [Phase 1: Form Intake / Phase 3: Workflow Management]
Manages client inquiries and commissioned custom song projects.
> **Phase 1 Dual-Persistence Note**: Customer submissions are saved directly to `custom_requests` AND simultaneously dispatched via email to the owner, ensuring inquiries are preserved if email delivery encounters errors.
- `id` (UUID, Primary Key, Default: `gen_random_uuid()`)
- `user_id` (UUID, Foreign Key -> `users.id`, Nullable) - Linked customer account [Phase 3]
- `customer_name` (VARCHAR, Not Null)
- `customer_email` (VARCHAR, Not Null)
- `customer_phone` (VARCHAR, Nullable)
- `brief_description` (TEXT, Not Null) - Creative description, mood, intended usage
- `reference_links` (TEXT, Nullable) - Sample song URLs or reference materials
- `genre_preference` (VARCHAR, Nullable)
- `target_duration` (VARCHAR, Nullable)
- `budget_estimate` (BIGINT, Nullable)
- `quoted_price` (BIGINT, Nullable) - Formal price quote from composer [Phase 3]
- `deposit_percent` (INTEGER, Nullable) - Snapshot of `settings.deposit_percent` at quote time [Phase 3]
- `deposit_amount` (BIGINT, Nullable) - Calculated deposit (`quoted_price * deposit_percent / 100`) [Phase 3]
- `remaining_amount` (BIGINT, Nullable) - Final balance due [Phase 3]
- `status` (ENUM: `'submitted'`, `'quoted'`, `'deposit_pending'`, `'in_progress'`, `'demo_sent'`, `'revising'`, `'approved'`, `'completed'`, `'cancelled'`, Not Null, Default: `'submitted'`)
- `final_file_key` (VARCHAR, Nullable) - Path to final master audio delivery package in Private Storage [Phase 3]
- `revision_limit` (INTEGER, Not Null, Default: 2) - Snapshot of `settings.free_revisions` at quote time [Phase 3]
- `revision_used` (INTEGER, Not Null, Default: 0)
- `notes` (TEXT, Nullable)
- `created_at` (TIMESTAMP, Not Null, Default: `now()`)
- `updated_at` (TIMESTAMP, Not Null, Default: `now()`)

---

## 10. Table `custom_request_revisions` [Phase 3]
Audit log of demo audio versions and client revision feedback.
- `id` (UUID, Primary Key, Default: `gen_random_uuid()`)
- `custom_request_id` (UUID, Foreign Key -> `custom_requests.id`, On Delete Cascade, Not Null)
- `revision_number` (INTEGER, Not Null) - Sequential demo revision index (1, 2, ...)
- `demo_file_url` (VARCHAR, Not Null) - Watermarked demo audio file URL
- `customer_feedback` (TEXT, Nullable) - Client feedback and change requests
- `admin_notes` (TEXT, Nullable) - Internal composer/admin notes
- `status` (ENUM: `'pending_feedback'`, `'changes_requested'`, `'approved'`, Not Null, Default: `'pending_feedback'`)
- `created_at` (TIMESTAMP, Not Null, Default: `now()`)
- `updated_at` (TIMESTAMP, Not Null, Default: `now()`)

---

## 11. Table `reviews` [Phase 3]
Verified purchaser review system for catalog tracks.
- `id` (UUID, Primary Key, Default: `gen_random_uuid()`)
- `user_id` (UUID, Foreign Key -> `users.id`, Not Null) - Reviewing customer
- `track_id` (UUID, Foreign Key -> `tracks.id`, Not Null) - Reviewed track
- `order_item_id` (UUID, Foreign Key -> `order_items.id`, Unique, Not Null) - Proof of purchase; restricts each purchased track to a single review
- `rating` (INTEGER, Not Null) - Rating score from 1 to 5 stars
- `comment` (TEXT, Nullable) - Review text
- `created_at` (TIMESTAMP, Not Null, Default: `now()`)
- `updated_at` (TIMESTAMP, Not Null, Default: `now()`)
