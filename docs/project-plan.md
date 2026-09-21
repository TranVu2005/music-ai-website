# Music Store Website Implementation Plan (Project Plan)

> **Source of Truth**  
> This document is directly extracted and systematized from the client implementation plan (*"Kế hoạch triển khai website bán nhạc: bản gửi khách hàng"* ("Music website implementation plan: client version") - 2026-09-20).  
> **The project scope is strictly frozen at exactly 13 features, allocated across 3 phases in a 5 / 4 / 4 ratio (Phase 1: 5 features, Phase 2: 4 features, Phase 3: 4 features).**

---

## Glossary
- **"Dùng chung"**: Standard / non-exclusive license (lower price, multiple customers can purchase and use simultaneously).
- **"Độc quyền"**: Exclusive license (higher price, sold to only one customer, locked upon order creation and permanently removed from catalog upon payment).
- **"Xác nhận đã nhận tiền"**: "Confirm payment received" admin action to verify bank transfer and activate order.
- **"Tôi đã chuyển tiền"**: "I have transferred" customer action to claim bank transfer and extend exclusive reservation hold.
- **"Đánh dấu đã hoàn tiền"**: "Mark as refunded" admin action to record manual bank refund completion.
- **"Vui lòng liên hệ trực tiếp chủ website"**: "Please contact the website owner directly" customer notice when actions are blocked on expired or cancelled orders.

---

## 1. Objectives and Overall Roadmap

- **Objective**: Build an independent website for selling pre-composed music tracks and accepting custom composition requests, production-ready for business operations within 3 months (12 - 14 weeks), executed by 01 full-time developer.
- **Timeline by 3 Realistic Delivery Milestones (5 / 4 / 4 features)**:
  - **Phase 1 (Trial Release - Weeks 2-3) [5 features]**: Users view the website, listen to watermarked preview samples, and submit custom composition request forms. Online commerce is not yet enabled.
  - **Phase 2 (Sellable Release - Weeks 6-8) [4 features]**: Customers purchase catalog tracks, pay via bank transfer QR code, the owner manually confirms payment receipt on the admin dashboard, and the system automatically delivers timed master file download links.
  - **Phase 3 (Complete Release - Weeks 12-14) [4 features]**: Full end-to-end custom composition workflow (quote, deposit, demo preview, revision feedback, final delivery), customer accounts for managing purchase history, product review system, and automated PDF copyright license generation.
- **Phase 2 Hosting Gate**: Hosting decision is final (paid VPS) before week 6. Admin upload requires a persistent FFmpeg background worker for audio compression and voice-tag watermarking, and the exclusive reservation hold-expiry sweep requires a deterministic scheduler (systemd timer or host cron). Real customer orders never run on a free tier.

---

## 2. Frozen Scope of 13 Features

| No. | Feature | Detailed Description | Phase |
|:---:|:---|:---|:---:|
| 1 | **Homepage, About, Contact** | Brand and artist introduction, creative story, and official contact channels. | Phase 1 |
| 2 | **Track Catalog** | Public track listing; keyword search, filtering by genre and mood. BPM displayed as reference metadata. | Phase 1 |
| 3 | **Audio Preview** | Smooth web audio player across desktop and mobile. Previews are low-bitrate compressed files with periodic voice watermarks. | Phase 1 |
| 4 | **Pricing Table** | Clear price listing for catalog tracks (by license type) and custom composition service packages. | Phase 1 |
| 5 | **Custom Music Request Form** | Customer fills out composition requirements. In Phase 1, data is persisted to `custom_requests` and simultaneously emailed to the owner via `EmailProvider` (Resend), ensuring requests are never lost even if email fails (no admin panel in Phase 1). | Phase 1 |
| 6 | **Cart and Checkout** | Multi-item cart. Payment via bank transfer VietQR (EMVCo payload generated locally). Owner verifies bank statement and clicks "Xác nhận đã nhận tiền" (Confirm payment received) in the admin panel. | Phase 2 |
| 7 | **Automated File Delivery** | Upon payment confirmation, the system emails a secure link with a timed `download_token_hash`. Clicking requests a 15-30 minute Pre-signed URL to download original lossless master files. | Phase 2 |
| 8 | **Two License Types** | - **"Dùng chung" (Standard)**: Affordable, concurrent purchases allowed.<br>- **"Độc quyền" (Exclusive)**: Premium price, temporarily locked upon order creation, permanently removed from catalog upon completed payment. | Phase 2 |
| 9 | **Admin Dashboard** | For the store owner: Upload new tracks, update pricing and license tiers, manage orders with `needs_refund` filtering, and perform manual payment confirmation. | Phase 2 |
| 10 | **Custom Request Workflow** | Full workflow on the site: Request received -> Quote -> Deposit payment -> Demo audio sent -> Revision feedback -> Final balance payment -> Master files and license handover. | Phase 3 |
| 11 | **Customer Accounts** | Customer registration and login to view catalog order history and track custom composition project milestones. | Phase 3 |
| 12 | **Reviews** | Verified buyers who have purchased a track can leave star ratings (1-5 stars) and written reviews. | Phase 3 |
| 13 | **License PDF Generation** | Automatically generate a copyright license PDF for each purchased track in a completed order, embedding transaction code and authorized usage terms. | Phase 3 |

---

## 3. Out of Scope

The following features are **not** within the committed scope of these 3 phases:
1. **Multilingual / English website UI** (website UI is Vietnamese-only; project documentation is in English).
2. **International credit card payment gateways** (Stripe, PayPal, etc.).
3. **Subscription / recurring membership model**.
4. **Native mobile applications** (standalone iOS / Android apps).
5. **Automatic bank-transfer detection** (webhook-based automated bank notification).
6. **In-depth revenue statistics reporting**.
7. **Financial invoice generation**.

---

## 4. Critical Business Rules

1. **Temporary Hold and Release of Exclusive Tracks via `reserved_by_order_id`**:
   - When an order containing exclusive tracks is created, those tracks transition to `reserved`, setting `reserved_by_order_id = :order_id` and a hold duration configured by `settings.hold_minutes` (default **60 minutes**).
   - Customers have an optional action `"Tôi đã chuyển tiền"` (I have transferred), recording `orders.paid_claimed_at = now()`, extending the hold to `settings.claimed_hold_hours` (default **24 hours**), and alerting the owner via email.
   - **Abuse Controls for Claim Action**:
     - Allowed only **once** per order (subsequent attempts rejected).
     - Rejected if the order is already in `EXPIRED` or `CANCELLED` status, displaying the prompt: `"Vui lòng liên hệ trực tiếp chủ website"` (Please contact the website owner directly).
     - The endpoint `POST /api/orders/:id/claim-paid` is strictly rate-limited.
     - System enforces `settings.max_pending_exclusive_orders` (default **2**), capping maximum concurrent pending orders with exclusive tracks per customer email and per client IP.
   - Release / expiry / cancellation queries must strictly isolate the order's hold: `WHERE reserved_by_order_id = :order_id AND status = 'reserved'`, clearing `reserved_by_order_id = NULL` and `reserved_until = NULL`.

2. **Confirmation of Expired Orders (`EXPIRED`) & Refund Flow**:
   - When the owner clicks `"Xác nhận đã nhận tiền"` (Confirm payment received) for an `EXPIRED` order:
     - The system re-checks track availability using `reserved_by_order_id`.
     - **If all exclusive tracks are still available**: Order transitions to `PAID`, tracks transition to `sold_exclusive` with `reserved_by_order_id = :order_id`, and download access is issued.
     - **If at least one exclusive track has been lost or reserved by another order**:
       - The entire order is rejected and retained as `EXPIRED`.
       - A `payments` row is inserted with `status = 'paid'` (since money was actually received in the bank account; records `confirmed_by`, `confirmed_at`).
       - The order is flagged with `orders.needs_refund = true` (100% refund).
   - **Refund Completion Step**:
     - When the owner manually transfers the refund back to the customer:
       - The owner triggers the admin action `"Đánh dấu đã hoàn tiền"` (Mark as refunded).
       - Updates: `orders.needs_refund = false`, `orders.payment_status = 'refunded'`, `payments.status = 'refunded'`.
       - Bank transfer reference or note is stored in `payments.notes`.

3. **Secure Download Delivery (`download_token_hash`)**:
   - `orders.download_token_hash` is Nullable upon creation and only generated when the order transitions to `'paid'`.
   - Security standard: At least 128 bits of cryptographically secure entropy, hashed with SHA-256 before database storage. Plaintext token is never stored and appears solely in the customer's email link (`https://musicshop.vn/downloads?token=<plaintext_token>`).
   - Token comparison on verification is performed in constant time (timing-safe).
   - Valid for `settings.download_valid_days` (default 30 days) from `confirmed_at` (`orders.download_expires_at`).
   - Clicking download verifies `orders.payment_status === 'paid'` and generates a short-lived Pre-signed URL (15-30 minutes TTL). Downloads are audited per `order_item_id` in `download_logs`.

4. **QA and Concurrency Plan**:
   - **Hold Isolation Test**: Order A expires (`EXPIRED`), Order B reserves the same track (`reserved_by_order_id = B`), then Order A is cancelled or re-swept by cron; Order B's reservation must remain fully intact.
   - **Concurrency and Deadlock Avoidance Test**: Two concurrent orders requesting overlapping exclusive tracks in reverse order must never deadlock, and each track must be held by exactly one order.
   - **Sweep Job Lock Order**: Expiry and reservation sweep background tasks must follow the identical lock order: order row first (`SELECT ... FOR UPDATE`), then track rows ordered by ascending ID (`ORDER BY id ASC FOR UPDATE`).

5. **Hard Rule: No Real Customer Orders on Any Free Tier**:
   - All commercial e-commerce transactions, VietQR payment verifications, and digital master deliveries MUST execute exclusively on dedicated paid infrastructure (paid VPS).
   - Free tiers (Render web service, Neon Postgres, Cloudflare quick tunnels) are strictly restricted to Phase 1 preview demonstration and stakeholder review. Real customer orders must NEVER run on any free tier.
