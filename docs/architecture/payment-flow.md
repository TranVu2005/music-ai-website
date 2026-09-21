# Payment Flow & Order Verification Specification

> **Source of Truth**: Aligned strictly with the [Implementation Plan](../project-plan.md).  
> **Payment Method**: Direct interbank transfer via Napas VietQR, verified and confirmed manually by the store owner in the Admin Dashboard.  
> **Extensibility**: Clean architecture separation via `PaymentProvider` interface to accommodate automated webhook adapters in future iterations.

---

## 1. Payment Method & In-House VietQR Generation [Phase 2]

- **Applied Method**: 24/7 interbank transfer scanning standard Napas VietQR codes.
- **In-House Standardized QR Generation (EMVCo Payload)**:
  - VietQR strings are generated directly in the application source code (conforming to EMVCo QR Code specifications) **without depending on any third-party gateway APIs or services**.
  - Payload encodes: Owner bank account number, Bank Identifier Code (BIN), Account holder name, Exact order amount (`total_amount`), and Transfer memo standardized to `order_code`.
- **Manual Verification Mechanism**:
  - Automated webhooks from payment aggregators are excluded at this stage.
  - The store owner monitors balance notifications on their mobile banking app and matches the `order_code` memo.
  - The store owner logs into the Admin Dashboard and clicks **"Xác nhận đã nhận tiền" (Confirm payment received)** to activate the order.

---

## 2. Extensible Interfaces: `PaymentProvider` & `EmailProvider`

The system maintains strict architectural boundaries separating domain logic from external payment formatting and email transport:

```typescript
// src/lib/payment/types.ts

export interface PaymentQrResult {
  qrImageUrl: string;
  qrPayload: string; // In-house generated EMVCo payload string
  accountNumber: string;
  accountName: string;
  bankCode: string;
  amount: number;
  transferContent: string; // = order_code
}

export interface PaymentProvider {
  readonly name: string;
  
  /**
   * Generates EMVCo standard VietQR payment information for an order
   */
  generatePaymentQr(params: {
    orderCode: string;
    amount: number;
    description: string;
  }): Promise<PaymentQrResult>;

  /**
   * Extensibility hooks for future automated webhook adapters
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
*Transactional emails are sent via **Resend** abstracted behind `EmailProvider`.*

---

## 3. Order Lifecycle & Concurrency Control (Deadlock Avoidance)

The checkout architecture supports multi-item carts (`Cart = Multiple Items`), where `orders` stores total payment state and `order_items` stores individual track and license details.

```
                  [Customer creates order]
                             │
                             ▼
                        ┌─────────┐
       ┌────────────────│ PENDING │──────────────────┐
       │                └─────────┘                  │
 (Exceeds                    │                  (Admin cancels
 hold_minutes /              │                   or Customer cancels)
 claimed_hold_hours)         │                       │
       │             [Customer optional action:      │
       │              "Tôi đã chuyển tiền"           │
       │           -> Extends hold to 24h]           │
       │                      │                       │
       ▼                      ▼                       ▼
 ┌─────────┐          [Admin checks bank       ┌───────────┐
 │ EXPIRED │        clicks "Xác nhận đã nhận tiền"] │ CANCELLED │
 └─────────┘                  │                └───────────┘
       │                      │
 (Admin confirms              ▼
  re-check OK)            ┌───────┐
       └─────────────────>│ PAID  │
                          └───────┘
```

### 3.1. Status `PENDING` [Phase 2]
- Created immediately when a customer submits the checkout form.
- **Default Hold Duration**: `settings.hold_minutes` defaults to **60 minutes** (allowing ample time for manual owner verification without premature expiration).
- **Customer Action "Tôi đã chuyển tiền" (I have transferred) [Phase 2]**:
  - After completing bank transfer, customer can click "Tôi đã chuyển tiền" on the order page.
  - Sets `orders.paid_claimed_at = now()`.
  - Extends reservation hold for exclusive tracks: `tracks.reserved_until = now() + (settings.claimed_hold_hours * interval '1 hour')` (default 24 hours).
  - Emails store owner to prioritize verification.
  - **Abuse Controls**:
    1. Permitted strictly **once** per order (subsequent invocations rejected).
    2. Rejected if order is already `EXPIRED` or `CANCELLED`, returning: `"Vui lòng liên hệ trực tiếp chủ website"` (Please contact the website owner directly).
    3. The endpoint `POST /api/orders/:id/claim-paid` is rate-limited.
    4. Capped by `settings.max_pending_exclusive_orders` (default **2**) concurrent pending exclusive orders per email and per client IP.
- **Exclusive Track Reservation via `reserved_by_order_id`**:
  - All exclusive tracks in the order are set to `tracks.status = 'reserved'`, `tracks.reserved_by_order_id = orders.id`, and `tracks.reserved_until` recorded.

### 3.2. Deadlock Avoidance Pattern [Phase 2]
For orders containing multiple exclusive tracks, **reservation (reserve)**, **release (release)**, **sweep**, and **confirmation (confirm)** operations must execute within a single Database Transaction following strict lock ordering.

> **Prisma Implementation Note**: Since Prisma ORM has no native syntax for `SELECT ... FOR UPDATE`, all locking queries in this section run inside an interactive transaction (`prisma.$transaction(async (tx) => { ... })`) using raw SQL via `tx.$queryRaw`.

1. **Lock the Order row first**:
   ```sql
   SELECT * FROM orders WHERE id = $1 FOR UPDATE;
   ```
2. **Lock exclusive Track rows in ascending Track ID order (`ORDER BY id ASC`)**:
   ```sql
   SELECT * FROM tracks 
   WHERE id IN (SELECT track_id FROM order_items WHERE order_id = $1)
   ORDER BY id ASC 
   FOR UPDATE;
   ```
   *Strict ascending ID locking completely eliminates cross-transaction deadlocks when concurrent orders contain overlapping exclusive tracks.*

### 3.3. Status `PAID` [Phase 2]
- Activated when the store owner clicks **"Xác nhận đã nhận tiền" (Confirm payment received)** in the admin dashboard.
- Idempotency Check: If `orders.payment_status === 'paid'`, the transaction is skipped harmlessly.
- Transaction operations:
  1. Update order: `orders.payment_status = 'paid'`, `orders.download_expires_at = now() + (settings.download_valid_days * interval '1 day')`, `orders.updated_at = now()`.
  2. Generate a secure random token (at least 128 bits entropy), compute its SHA-256 hash, and store in `orders.download_token_hash`.
  3. Insert `payments` row: `status = 'paid'`, `amount = orders.total_amount`, `confirmed_by = admin_user_id`, `confirmed_at = now()`.
  4. Update exclusive tracks in `order_items`: `tracks.status = 'sold_exclusive'`, `tracks.reserved_by_order_id = orders.id`, `tracks.reserved_until = NULL`, permanently delisted from the public catalog.
  5. [Phase 3] Trigger PDF license generator for each `order_item` and store link in `order_items.license_pdf_url`.
  6. Dispatch confirmation email to `customer_email` via `EmailProvider` (Resend) containing download link with the plaintext token (`https://musicshop.vn/downloads?token=<plaintext_token>`).

### 3.4. Status `EXPIRED` & `CANCELLED` [Phase 2]
- If reservation expires without claim or confirmation, the order transitions to `EXPIRED`.
- **Selective Release via `reserved_by_order_id`**:
  ```sql
  UPDATE tracks 
  SET status = 'published', reserved_by_order_id = NULL, reserved_until = NULL
  WHERE reserved_by_order_id = :order_id AND status = 'reserved';
  ```
  *Never releases tracks that have already been reserved or purchased by another order.*
- Order cancellation (`CANCELLED`) executes the identical selective release query.

---

## 4. Rule for Confirming Expired Orders (`EXPIRED`) & Manual Refund Flow [Phase 2]

When a customer pays late and the order has transitioned to `EXPIRED`, the owner clicks **"Xác nhận đã nhận tiền"**:

```
Admin clicks "Xác nhận đã nhận tiền" on EXPIRED order
                      │
                      ▼
        [Transaction with Row-level locks:
     orders FOR UPDATE -> tracks ORDER BY id ASC FOR UPDATE]
                      │
                      ▼
[Re-check track availability for all exclusive tracks in order
  via reserved_by_order_id]
                      │
        ┌─────────────┴─────────────┐
        ▼                           ▼
[ALL exclusive tracks       [At least 1 exclusive track
 REMAIN AVAILABLE]           WAS SOLD OR HELD BY ANOTHER ORDER]
        │                           │
        ▼                           ▼
- Activate order to PAID     - REJECT ENTIRE ORDER
- Tracks -> sold_exclusive   - Keep order in EXPIRED status
  (reserved_by_order_id)     - Insert payments row with status = 'paid'
- Generate download token      (money received; confirmed_by, confirmed_at)
  and email download link    - Set orders.needs_refund = true (100% total)
                             - Display under "Needs Refund" filter for Admin
                                    │
                             [Admin transfers manual refund]
                                    │
                             Admin clicks "Đánh dấu đã hoàn tiền"
                                    │
                             - orders.needs_refund = false
                             - orders.payment_status = 'refunded'
                             - payments.status = 'refunded'
                             - Bank reference stored in payments.notes
```

1. **Re-check Availability via `reserved_by_order_id`**:
   - Locks order and exclusive tracks with `ORDER BY id ASC FOR UPDATE`.
   - An exclusive track is **unavailable** if:
     1. It has been sold: `tracks.status = 'sold_exclusive'`.
     2. It is currently held by another valid order: `tracks.status = 'reserved' AND (tracks.reserved_by_order_id IS DISTINCT FROM :order_id OR tracks.reserved_until > now())`.
2. **Resolution Rules**:
   - **If all exclusive tracks remain available**: Transition order to `PAID`, set tracks to `sold_exclusive` with `reserved_by_order_id = :order_id`, generate `download_token_hash`, set `download_expires_at`, and send download email.
   - **If at least one exclusive track has been lost**:
     - **Reject the entire order**, leaving `orders.payment_status = 'expired'`.
     - Insert a `payments` audit record with **`status = 'paid'`** (confirming bank funds were indeed received, recording `confirmed_by = admin_user_id` and `confirmed_at = now()`), NOT `'refunded'` or `'failed'`.
     - Set boolean **`orders.needs_refund = true`** for 100% of the order amount.
     - Display high-visibility refund alert in the admin order list with customer bank details.
3. **Manual Refund Completion Step**:
   - Once the owner manually transfers the full refund to the customer's bank account, the owner clicks the admin action **"Đánh dấu đã hoàn tiền" (Mark as refunded)**.
   - The system executes:
     ```sql
     UPDATE orders 
     SET needs_refund = false, payment_status = 'refunded', updated_at = now()
     WHERE id = :order_id;

     UPDATE payments 
     SET status = 'refunded', notes = :refund_reference, updated_at = now()
     WHERE order_id = :order_id AND status = 'paid';
     ```

---

## 5. Secure File Handover via Download Token & Signed URLs [Phase 2]

1. **Confirmation Email**: Upon order `PAID`, email sent contains:
   `https://musicshop.vn/downloads?token=<plaintext_token>`
2. **App Endpoint Validation**:
   - Customer accesses endpoint Route Handler: `GET /api/downloads/:token`.
   - The system hashes the incoming token with SHA-256 and finds matching `orders` row using constant-time comparison.
   - **Mandatory Order Check**: If `orders.payment_status !== 'paid'`, return HTTP 403 Forbidden.
   - **Expiration Check**: Validates `orders.download_expires_at IS NOT NULL` and `now() <= orders.download_expires_at` (default 30 days). If expired, return HTTP 410 Gone.
3. **Short-Lived Pre-signed URL Generation**:
   - For each track in `order_items`, the application generates an S3 Pre-signed URL from the Private Bucket (R2/S3).
   - Time-to-Live is strictly limited (**TTL: 15 to 30 minutes**).
   - Header configured: `Content-Disposition: attachment; filename="Track_Title.wav"`.
4. **Audit Logging (`download_logs`)**:
   - Records `order_item_id`, `ip_address`, `user_agent`, and `downloaded_at`.
   - Increments `order_items.download_count`.

---

## 6. QA Plan & Verification Scenarios

1. **Hold Isolation on Release / Sweep Test**:
   - *Step 1*: Order A is created with exclusive track T -> `status = 'reserved'`, `reserved_by_order_id = A.id`, `reserved_until = now() + 60m`.
   - *Step 2*: Order A expires -> Sweep releases track T: `status = 'published'`, `reserved_by_order_id = NULL`.
   - *Step 3*: Order B is created with exclusive track T -> `status = 'reserved'`, `reserved_by_order_id = B.id`, `reserved_until = now() + 60m`.
   - *Step 4*: Order A is cancelled or re-swept by cron.
   - *Assertion*: Order A's sweep query targets only `WHERE reserved_by_order_id = A.id`. Track T remains `reserved` with `reserved_by_order_id = B.id`. Order B's hold is fully preserved.

2. **Concurrency & Deadlock Avoidance Test**:
   - *Scenario*: Two concurrent client transactions (Order 1 and Order 2) request overlapping exclusive tracks in opposite order (Order 1 requests tracks [T1, T2]; Order 2 requests tracks [T2, T1]).
   - *Execution*: Both transactions lock their respective `orders` row first, then lock track rows sorted ascending by ID (`SELECT ... FROM tracks WHERE id IN (...) ORDER BY id ASC FOR UPDATE`).
   - *Assertion*:
     - Neither transaction deadlocks.
     - One transaction acquires locks first, successfully reserving its tracks.
     - The second transaction detects that the contested track is already `reserved`, cleanly rejecting or omitting that track without database crash or lock timeout.
     - Each exclusive track is held by at most one order.

3. **Background Expiry / Sweep Job Lock Order**:
   - The automated cron sweep job for expiring pending reservations must adhere strictly to the identical locking order: lock candidate `orders` row first, then lock exclusive tracks by `ORDER BY id ASC FOR UPDATE` before updating statuses.
