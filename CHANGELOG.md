# Documentation Changelog (CHANGELOG)

> **Date**: 2026-09-21  
> **Source of Truth**: `docs/project-plan.md` (directly extracted and systematized from the client implementation plan *"Kế hoạch triển khai website bán nhạc: bản gửi khách hàng"* ("Music website implementation plan: client version") - 2026-09-20).  
> **Project Scope**: Strictly frozen at exactly 13 features allocated across 3 phases in a 5 / 4 / 4 ratio (Phase 1: 5 features, Phase 2: 4 features, Phase 3: 4 features).

## 2026-09-23 — Task 010: Agent Runtime Handover

- Moved the canonical repository skills into `.agents/skills/` for Codex discovery; `CLAUDE.md` points Claude Code to the same skills on demand.
- Added plan approval, verification evidence, command, and role rules to `AGENTS.md`; updated the task template and recorded the handover in `docs/status.md`.
- Updated `eslint.config.mjs` and `vitest.config.ts` to ignore the relocated `.agents/` skills directory.
- Marked `GEMINI.md` deprecated while retaining the Gemini settings for rollback.

## 2026-09-23 — Task 004: Catalog REST API Handlers

1. **Next.js 16 Route Handlers**:
   - Implemented `GET /api/tracks` with pagination (`page`, `limit` clamped to 50), keyword search `q` across `title` and `description`, and categorical filters (`genre`, `mood`).
   - Implemented `GET /api/tracks/[slug]` for single track retrieval using Next.js 16 dynamic parameter resolution (`await context.params`), returning HTTP 200 or HTTP 404 for missing/non-published tracks.
   - Implemented `GET /api/filters` querying distinct published genres and moods, returning alphabetically sorted and deduplicated lists.
   - Enforced runtime-only dynamic isolation via `export const dynamic = "force-dynamic"` across all route handlers to prevent database queries during `next build`.

2. **Data Protection & Serialization**:
   - Created `src/lib/api/serialization.ts` defining `TRACK_PUBLIC_SELECT` allowlist restricting database queries to 12 public fields.
   - Guaranteed zero exposure of sensitive fields (`original_file_key`, `status`, `reserved_until`) with both query allowlisting and serialization sanitization.
   - Implemented consistent error envelope `{ error: { code, message } }` for 400, 404, and 500 without leaking stack traces or database internals.
   - Ignored `bpm` in query parameters (metadata display only).
   - Escaped SQL wildcards (`%`, `_`) in `q` searches to ensure literal search matching.

3. **Comprehensive Automated Testing Suite**:
   - Implemented `test/api/catalog.test.ts` covering query parsing, pagination clamping, error responses, search case-insensitivity, wildcard handling, and filter deduplication.
   - Enforced test isolation using `test-004-` slug prefixes for temporary fixtures with cleanup in `beforeAll`, `afterEach`, and `afterAll`, ensuring zero interference with `test/db/seed.test.ts`.
   - Added recursive security assertion validating complete absence of forbidden keys across all API responses.

---

## 2026-09-23 — Task 003: Audio Preview Generator Utility (PR #9)

1. **CLI Preview Generator Utility (`tools/generate-preview.ts`)**:
   - Implemented automated CLI utility `npm run tools:preview-gen -- <master-file> <slug> [--force]` converting lossless master audio files into watermarked MP3 streaming previews at `public/audio/previews/<slug>.mp3`.
   - Built with strict containment and path traversal protections: validates `MASTERS_DIR` (must exist and cannot resolve inside repository) and verifies master file cannot traverse or escape `MASTERS_DIR` via realpath and junction checks.
   - Enforced slug format regex `^[a-z0-9]+(-[a-z0-9]+)*$` and overwrite protection requiring `--force`.
   - Implemented atomic file writing via temporary files (`public/audio/previews/.tmp-*`) with `SIGINT`, `SIGTERM`, and `finally` cleanup handlers so corrupt or partial files are never left behind.
   - Outputs strictly one JSON line on success: `{"slug","output","durationSeconds","bitrate","sampleRate","channels"}` extracted via `ffprobe`.

2. **Watermark Schedule, Limiting & Quality Preservation**:
   - Mixed periodic audio watermark (`assets/watermark/tag.wav`) repeating every 25 seconds throughout the track starting at 10 seconds.
   - Tracks shorter than 25 seconds are guaranteed at least one watermark tag.
   - Preserved 100% of music volume and dynamic range using `amix=...:normalize=0` with watermark attenuated to -12 dB.
   - Prevented digital clipping on loud audio peaks by appending an audio peak limiter (`alimiter=limit=0.891:level=disabled`), capping mixed peaks at -1.0 dBFS with zero full-scale clipped samples.
   - Scrubbed all master metadata tags via `-map_metadata -1`.
   - Encoded with `libmp3lame` CBR 128 kbps, 44.1 kHz stereo, automatically upmixing mono inputs.

3. **Placeholder Watermark Asset**:
   - Synthesized `assets/watermark/tag.wav` (2.0 seconds, WAV PCM 16-bit, 44.1 kHz stereo, ~353 KB) using FFmpeg tone generation with fades. Passes `tools/check-audio.sh` allowlist.

4. **Integration Testing & CI**:
   - Implemented automated Vitest suite `test/tools/preview-generator.test.ts` testing 65 s sine conversion, watermark positioning on 65 s silent master via `silencedetect`, short master coverage, peak limiter verification, security rejections, and test isolation.
   - Added `Ensure FFmpeg` step in `.github/workflows/ci.yml` `checks` job.

---

## 2026-09-23 — Task 002: Prisma Schema and Database Seed (PR #8)

1. **Relational Database Schema (Phase 1)**:
   - Defined Phase 1 PostgreSQL schema in `src/db/schema.prisma` with 3 core models: `User` (`users`), `Track` (`tracks`), and `CustomRequest` (`custom_requests`).
   - Mapped models and columns to `snake_case` in PostgreSQL while exposing camelCase fields in Prisma Client.
   - Standardized all primary keys to UUID using PostgreSQL native `gen_random_uuid()` default.
   - Standardized all timestamp columns to `@db.Timestamptz(6)` with `DEFAULT now() / CURRENT_TIMESTAMP` on `created_at` and `@default(now()) @updatedAt` on `updated_at`.
   - Defined 3 lowercase snake_case enum types: `role` (`admin`, `customer`), `track_status` (`draft`, `published`, `reserved`, `sold_exclusive`, `archived`), and `custom_request_status` (`submitted`, `quoted`, `deposit_pending`, `in_progress`, `demo_sent`, `revising`, `approved`, `completed`, `cancelled`).
   - Explicitly omitted `reserved_by_order_id` from `tracks` (deferred to Phase 2 with `orders`), while preserving nullable `reserved_until` and all 5 track statuses for seamless forward compatibility.
   - Created 7 secondary indexes (`tracks_status_idx`, `tracks_genre_idx`, `tracks_mood_idx`, `tracks_created_at_idx`, `custom_requests_status_idx`, `custom_requests_created_at_idx`, `custom_requests_user_id_idx`) plus unique indexes on `users.email` and `tracks.slug`.

2. **Database Migration & Client Generation**:
   - Generated initial PostgreSQL migration `src/db/migrations/20260922190651_init_phase1_schema/migration.sql` via `prisma migrate dev`.
   - Generated typed Prisma Client (`@prisma/client` 6.19.3).

3. **Idempotent Seed Script & Audio Preview Placeholders**:
   - Created `src/db/seed.ts` populating 5 diverse sample tracks (`Đêm Đông Hà Nội`, `Nắng Sài Gòn`, `Khoảng Lặng Tây Nguyên`, `Nhịp Sống Phố Thị`, `Hoàng Hôn Sông Hương`) with realistic Vietnamese metadata and `status = 'published'`.
   - Enforced non-destructive idempotency via `prisma.track.upsert({ where: { slug }, ... })` without truncating or deleting data.
   - Added `"tsx": "4.19.3"` to `devDependencies` and configured `"prisma": { "seed": "tsx src/db/seed.ts" }` and `"db:seed": "prisma db seed"`.
   - Committed 5 silent 64 kbps stereo MP3 preview files (~40 KB each) in `public/audio/previews/<slug>.mp3` passing the audio guard.

4. **Integration Testing & CI Pipeline Updates**:
   - Implemented `test/db/migration.test.ts` asserting table schemas, absence of `reserved_by_order_id`, enum values, timestamp types, and index existence via `information_schema` and `pg_indexes`.
   - Implemented `test/db/seed.test.ts` asserting seed idempotency, track metadata, and file existence in `public/audio/previews/`.
   - Added environment guards so database tests skip cleanly when `DATABASE_URL` is unset locally but hard-fail if missing when `CI=true`.
   - Updated `.github/workflows/ci.yml` `checks` job to run `npm run db:seed` after `npm run db:migrate:deploy` and before `npm run test`.

---

## 2026-09-22 — Task 001: Project Setup, CI Pipeline, Audio Guard (PR #7)

1. **Next.js Fullstack Monolith Initialization**:
   - Initialized base project with Next.js 16.3.6 (`output: 'standalone'`), React 19.3.0, TypeScript 5.9.3 (strict), Tailwind CSS 4.3.3, and Vitest 4.1.11.
   - Pinned exact dependency versions without carets/tildes, verified for Node 20 runtime compatibility with zero peer-dependency warnings.
   - Created minimal root layout (`src/app/layout.tsx`) and placeholder home page (`src/app/page.tsx`).
   - Implemented unauthenticated, zero-external-dependency health Route Handler (`GET /api/health` with `export const dynamic = "force-dynamic"`) returning `{ status: "ok" }`.

2. **Prisma ORM Configuration**:
   - Configured Prisma 6.19.3 schema at `src/db/schema.prisma` via `package.json#prisma`.
   - Included both runtime pooled connection (`DATABASE_URL`) and direct migration connection (`DIRECT_URL`).
   - Documented schema location, connection separation, deprecation note, and Prisma 7 migration path (`prisma.config.ts`) in `README.md`.

3. **Audio Asset Guard & DevOps Controls**:
   - Created `tools/check-audio.sh` POSIX shell script with `--staged` and default `git ls-files` modes to block unapproved audio formats outside `public/audio/previews/**` and `assets/watermark/**` or files >15 MB.
   - Installed pre-commit hook in `.githooks/pre-commit` via `"prepare": "git config core.hooksPath .githooks || true"`.
   - Added `.gitattributes` enforcing LF line endings and marked shell scripts executable (`100755`).
   - Configured `.dockerignore` excluding sensitive, cache, and documentation directories while retaining `.env.example`.

4. **Automated CI Workflow (`.github/workflows/ci.yml`)**:
   - Configured `checks` job with `postgres:16-alpine` service, `actions/setup-node@v4` with `cache: 'npm'`, running audio guard, linter, typecheck, prisma generate, vitest suite, direct migration check, and Next.js standalone build.
   - Configured `docker` job building `build/deploy/Dockerfile` and polling `GET /api/health` on port 3000.

---

## 2026-09-22 — Agent Rules Moved to AGENTS.md & Project Status Document

1. **Agent Rules Canonicalized in `AGENTS.md`**:
   - Moved development guidelines and agent rules from `CLAUDE.md` to vendor-neutral `AGENTS.md` with full git history preservation (`git mv`).
   - Updated H1 to `# Agent Guidelines (AGENTS.md)` and added header notice: `> Canonical rules for all AI agents and developers. \`CLAUDE.md\` and \`GEMINI.md\` only point here; edit this file only.`
   - Created thin pointer `CLAUDE.md` importing `@AGENTS.md`.
   - Created thin pointer `GEMINI.md` importing `@./AGENTS.md`.
   - Added `.gemini/settings.json` specifying `AGENTS.md` and `GEMINI.md` as context files for Gemini-based agents.
   - Updated active documentation links from `CLAUDE.md` to `AGENTS.md` across `README.md`, `docs/decisions/hosting.md`, `docs/status.md`, `docs/tasks/_template.md`, and `docs/tasks/001` through `009`.

2. **Project Status Handoff Document (`docs/status.md`)** (added 2026-09-22 in commit `8bc0851`):
   - Added single handoff document (`docs/status.md`) for new chats, reviewers, and agents.
   - Formalized roles (Product Owner, Lead/Reviewer Claude, Executing Agents Gemini), source of truth inventory, finalized architectural decisions table, Phase 1 implementation task status (001-009), next actions, client/owner open items, and known follow-up items.

3. **Workspace Skills Setup for Antigravity (former location)**:
   - Moved all 14 workspace skills from the former Claude Code location to the Antigravity location with full git history preservation; Task 010 later moved them to `.agents/skills/`.
   - Enables native skill discovery for Google Antigravity in the project workspace across all procedure runbooks (`brainstorming`, `dispatching-parallel-agents`, `executing-plans`, `finishing-a-development-branch`, `receiving-code-review`, `requesting-code-review`, `subagent-driven-development`, `systematic-debugging`, `test-driven-development`, `using-git-worktrees`, `using-superpowers`, `verification-before-completion`, `writing-plans`, `writing-skills`).

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

---

## 7. Final Documentation Cleanup & Architecture Alignment

1. **Repository Root Translation**:
   - Translated `CLAUDE.md` and `README.md` to English, preserving identifiers, paths, commands, and enum values, with Vietnamese UI copy quoted and glossed.

2. **Testing Specification Alignment (`CLAUDE.md`)**:
   - Replaced legacy webhook testing rules with tests for:
     - Manual payment confirmation idempotency (double-clicking "Xác nhận đã nhận tiền" grants access and sends email only once).
     - Strict lock ordering and hold isolation from `payment-flow.md` section 6, including the concurrent opposite-order deadlock test.
     - Download authorization (token hash matching via constant-time comparison, requirement for `paid` status, rejection of expired tokens, and short-lived signed URLs).
     - Claim-paid abuse controls (once per order, rejected when EXPIRED/CANCELLED, pending-order cap, rate limit).
     - Manual refund completion transition.

3. **Monolithic Architecture Alignment (`README.md`)**:
   - Replaced legacy frontend/backend directory structures and placeholders with the Next.js monolithic layout (`src/app`, `src/app/api` Route Handlers, `src/db/migrations`, `test/`, `tools/`).
   - Standardized payment wording to "VietQR payment with manual owner confirmation".

4. **CI Workflow Location Standardization**:
   - Moved CI workflow specification to `.github/workflows/ci.yml` at the repository root, retaining only `Dockerfile` and `docker-compose.yml` in `build/deploy/`. Updated `README.md` and `docs/tasks/001-project-setup.md`.

5. **Decision Records (Vitest & Prisma Row Locking)**:
   - Formally recorded **Vitest** as the unified test runner across `docs/tasks/001-project-setup.md` and `docs/architecture/overview.md`.
   - Documented that because Prisma lacks native `FOR UPDATE` support, all pessimistic locking queries in `payment-flow.md` section 3 execute inside `prisma.$transaction` using `prisma.$queryRaw` (recorded in `overview.md` and `payment-flow.md`).

6. **English Gloss on Client Plan Title**:
   - Added English gloss to the source document title across `docs/project-plan.md` and `CHANGELOG.md`: *"Kế hoạch triển khai website bán nhạc: bản gửi khách hàng"* ("Music website implementation plan: client version").

---

## 8. Phase 1 Task Specifications & Documentation Fixes

1. **Task Documentation Fixes**:
   - `docs/tasks/001-project-setup.md`: Removed `"via Vitest"` from the lint/type-check/build Definition of Done criterion. Added explicit specification that `schema.prisma` lives in `src/db/` so migrations land in `src/db/migrations/` (configured via `prisma.config.ts` or the `--schema` flag). Added explicit Out of Scope subsection.
   - `README.md`: Updated directory tree diagram to include `.env.example`, `assets/watermark/`, and `public/audio/previews/`.

2. **Creation of Phase 1 Task Files (`docs/tasks/002` through `009`)**:
   - `docs/tasks/002-prisma-schema-seed.md`: Initial Prisma schema and Migration 1 restricted strictly to `users`, `tracks`, and `custom_requests`. Explicitly excluded `tracks.reserved_by_order_id` (deferred to Phase 2). Idempotent seed script inserting 5 sample tracks pointing to preview placeholders in `public/audio/previews/`.
   - `docs/tasks/003-preview-generator.md`: CLI preview generation utility converting master audio to 128 kbps 44.1 kHz stereo MP3 in `public/audio/previews/<slug>.mp3` with periodic voice tag mixed in every 20-30 seconds. Reading from external `MASTERS_DIR` outside repository. FFmpeg container setup.
   - `docs/tasks/004-catalog-api.md`: Next.js Route Handlers for `GET /api/tracks` (published tracks, keyword search, genre/mood filters, pagination), `GET /api/tracks/[slug]`, and `GET /api/filters`. Enforced BPM as non-filterable reference metadata and zero exposure of `original_file_key`.
   - `docs/tasks/005-ui-design.md`: Static HTML/Tailwind prototypes of Home and Catalog pages (desktop and mobile) in `design/` with Vietnamese copy placeholders. Established as mandatory client approval gate for Tasks 006 and 007.
   - `docs/tasks/006-static-pages.md`: Foundational layout and static pages (Home, About, Contact, Pricing from configuration). Responsive design, SEO metadata, and centralized Vietnamese dictionary file (`src/lib/i18n/vi.ts`).
   - `docs/tasks/007-catalog-ui-player.md`: Public catalog browsing page, track detail page, and persistent responsive audio preview player with single-stream playback concurrency and BPM display metadata.
   - `docs/tasks/008-request-form.md`: Custom music request page and `POST /api/custom-requests` handler with Zod validation, dual-persistence (database insert before email dispatch), resilient email failure handling, `EmailProvider` interface (`ResendEmailProvider` and `ConsoleEmailProvider`), honeypot spam protection, and rate limiting.
   - `docs/tasks/009-deploy-acceptance.md`: Two-step deployment process: authoring `docs/decisions/hosting.md` (Vercel vs Docker VPS) with deployment hold pending owner approval, followed by test domain deployment and execution of the Milestone 1 client plan acceptance checklist (`docs/acceptance/milestone-1.md`).

---

## 9. Task Specification Amendments and Scaffold Cleanup

1. **Task 001 Scaffold Cleanup & Configuration**:
   - Cleaned up legacy directories `src/backend/` and `src/frontend/`, and removed duplicate CI workflow `build/deploy/.github/`.
   - Rewrote `build/deploy/Dockerfile` for a unified Next.js monorepo on port 3000 with a non-root system user (`nextjs:nodejs`), keeping FFmpeg/ffprobe and removing `[STACK]` and `dist/backend/server.js`.
   - Rewrote `build/deploy/docker-compose.yml` for PostgreSQL and a single unified `app` service on port 3000 using environment variables for credentials.
   - Rewrote `.env.example` targeting the production stack: `DATABASE_URL`, `S3_*` (Cloudflare R2 / AWS S3 only), `RESEND_API_KEY`, `EMAIL_FROM`, `OWNER_NOTIFICATION_EMAIL`, `MASTERS_DIR`, `APP_BASE_URL`. Removed legacy variables (`PAYMENT_WEBHOOK_SECRET`, `JWT_SECRET`, `SMTP_*`, `PORT`/`BACKEND_URL`).
   - Translated all Vietnamese comments in `ci.yml`, `Dockerfile`, `docker-compose.yml`, and `.env.example` into technical English.
   - Updated `.github/workflows/ci.yml` to keep CI green on PRs prior to `package-lock.json` availability, and added CI green status to Task 001 Definition of Done.
   - Added minimal `src/app/layout.tsx` skeleton scope to Task 001.

2. **Cross-Task Architectural Adjustments**:
   - `docs/tasks/007-catalog-ui-player.md`: Added mounting of `AudioPlayerProvider` and `AudioPlayerBar` inside `src/app/layout.tsx` to Scope. Documented landing order: Task 007 lands before Task 006.
   - `docs/tasks/006-static-pages.md`: Clarified that Header and Footer wrap the existing layout from Task 007, with Task 006 rebasing on Task 007.
   - `docs/tasks/003-preview-generator.md`: Documented `assets/watermark/tag.wav` file name and required format (uncompressed WAV, 2-3s) as a synthesized placeholder tone in Phase 1, replaced by the owner's spoken brand tag later with zero code change.
   - `docs/tasks/008-request-form.md`: Documented that the in-memory rate limiter is per-instance, requiring a shared store (e.g. Upstash Redis) if serverless hosting is approved in Task 009.
   - `docs/tasks/009-deploy-acceptance.md`: Added requirement that `docs/decisions/hosting.md` evaluate production PostgreSQL hosting (managed vs container) and total monthly cost. Marked real-device mobile checks (iOS Safari, Android Chrome) as human-verified by the owner via checklist rather than agent-executed.
   - `README.md`: Added `design/` to the project directory structure tree.

---

## 10. Standalone Output, Docker Hardening, and Gitkeep Localization

1. **Next.js Standalone Build & Docker Container Hardening**:
   - `docs/tasks/001-project-setup.md`: Added Next.js `output: 'standalone'` configuration to Scope. Added OpenSSL installation (`apk add --no-cache openssl`) and Prisma schema generation/engine copying notes to Scope.
   - `build/deploy/Dockerfile`: Added OpenSSL package, copied `src/db/` before `npm ci`, executed `npx prisma generate` in builder stage, and ensured the Prisma query engine and schema files are copied into the standalone runner stage.
   - `docs/tasks/001-project-setup.md`: Ticked pre-completed Definition of Done items (legacy dirs removed, Dockerfile/compose/.env.example rewritten) and added new DoD: "Docker build succeeds and the container serves GET /api/health with HTTP 200".
   - `build/deploy/docker-compose.yml`: Removed obsolete Compose `version:` key, bound PostgreSQL strictly to loopback (`127.0.0.1:5432:5432`), and added dev-only header comment.
   - `docs/tasks/009-deploy-acceptance.md`: Added requirement in Scope to create `build/deploy/docker-compose.prod.yml` with strict password validation (`${POSTGRES_PASSWORD:?required}`) and no published database port if Docker VPS hosting is approved.

2. **Localization Cleanup**:
   - Translated Vietnamese comments in `test/.gitkeep`, `tools/.gitkeep`, and `src/db/migrations/.gitkeep` into English.

---

## 11. Phase 1 Free-Demo Hosting Strategy and Portability Architecture

1. **Architectural Decision Record (`docs/decisions/hosting.md`)**:
   - Recorded the finalized hosting strategy approved by the product owner:
     - **Phase 1 Trial Demo (Milestone 1 Review)**: Render Free Web Service + Neon Free PostgreSQL as primary; Cloudflare Quick Tunnel from the developer workstation as emergency live fallback.
     - **Phase 2 Production**: Dedicated/small paid VPS (e.g. Hetzner Cloud / DigitalOcean / Linode) with containerized PostgreSQL, finalized and provisioned before Week 6.
   - Evaluated 5 options across monthly cost, key limits, Milestone 1 fit, and Phase 2 fit with official citations:
     - (A) Cloudflare Quick Tunnel (TryCloudflare)
     - (B) Render Free + Neon Free
     - (C) Oracle Cloud Always Free VM
     - (D) Small Paid VPS (Hetzner, DigitalOcean, Linode)
     - (E) Vercel Hobby (strictly excluded due to non-commercial terms of service clause)
   - Detailed Render free web service idle spin-down (15 minutes of inactivity, ~1 minute wake-up delay), 750 free instance hours/month cap, and Render's official stance that free instances are not for production.
   - Detailed Neon free storage (0.5 GiB), 100 CU-hours/month compute cap, and scale-to-zero after 5 minutes of inactivity.
   - Added pre-deployment checklist for the store owner to review commercial-use terms before deploying.

2. **Hard Rule & Phase 2 Hosting Gate**:
   - Added the hard rule: **"No real customer orders on any free tier"** across `docs/project-plan.md`, `docs/decisions/hosting.md`, `docs/tasks/009-deploy-acceptance.md`, `docs/architecture/overview.md`, and `CLAUDE.md`.
   - Added Phase 2 Hosting Gate in `docs/project-plan.md`: hosting decision is final (paid VPS) before week 6 because admin track uploads require a persistent FFmpeg background worker and exclusive reservation hold-expiry sweeps require a deterministic scheduler.

3. **Task 009 Deployment Specifications (`docs/tasks/009-deploy-acceptance.md`)**:
   - Formalized Step 1 as the ADR in `docs/decisions/hosting.md` with pre-deploy sign-off.
   - Formalized Step 2 as Render Free deployment using Docker runtime (`build/deploy/Dockerfile`) with justification (parity, OpenSSL, FFmpeg bundling, and standalone memory optimization).
   - Documented exact Render settings: Dockerfile path, context, health check path `/api/health`, and environment variables.
   - Analyzed Render pre-deploy command availability: official Render docs confirm pre-deploy commands are only available on paid instances. Documented that Prisma migrations must run against `DIRECT_URL` from the developer machine or CI before deploy.
   - Added reminder to Milestone 1 checklist: *"Open the demo URL 1-2 minutes before the review meeting (free web service spins down after idle)."*

4. **Environment Variables & Task 001 Alignment (`.env.example` & `docs/tasks/001-project-setup.md`)**:
   - `.env.example`: Configured Neon pooled `DATABASE_URL` for app runtime and unpooled direct `DIRECT_URL` for Prisma migrations. Configured `EMAIL_FROM=onboarding@resend.dev` with note that `OWNER_NOTIFICATION_EMAIL` must equal the Resend account owner's email address on the free tier. Set `APP_BASE_URL` to Render free URL with localhost comments.
   - `docs/tasks/001-project-setup.md`: Added verification requirement that task executor checks `.env.example` entries and ensures `prisma:generate` and migration scripts work with `DIRECT_URL`.

5. **Rate Limiter Portability (`docs/tasks/008-request-form.md`)**:
   - Clarified that in-memory rate limiting is acceptable for the single-instance Render free demo, while keeping the `RateLimiter` interface with pluggable implementations (`MemoryRateLimiter` and shared store e.g. `RedisRateLimiter`) for future multi-instance VPS scaling.

6. **Portability and Hosting Guardrails (`docs/architecture/overview.md` & `CLAUDE.md`)**:
   - Enforced vendor-agnostic application code (no `@vercel/kv`, `@vercel/blob`, Edge runtime, or vendor cron configs; all platform-specific integrations isolated behind interfaces).
   - Enforced Docker image portability (`build/deploy/Dockerfile`) across local development, Render demo, and paid VPS.
   - Documented production VPS migration path via `pg_dump`/`restore`, DNS TTL reduction, and `.env.example` configuration.

7. **Live Demo Fallback in `README.md`**:
   - Added "Live demo fallback" section with exact commands (`docker compose up`, `npm run dev`, `cloudflared tunnel --url http://localhost:3000`) and operational limitations (random URL, no SLA, stops on machine sleep). Added `docs/decisions/` to the directory structure tree.

---

## 12. Hosting Decision Revisions, Baseline VPS Specifications, and PR #3 Review Fixes

1. **Option D VPS Baseline & Verified Pricing (`docs/decisions/hosting.md`)**:
   - Replaced stale 1 GB VPS pricing with the required technical baseline of **2 vCPU / 4 GB RAM** necessary to run Next.js server rendering, PostgreSQL container, and Phase 2 FFmpeg background worker.
   - Sourced and cited DigitalOcean Basic Droplet ($24.00/mo, `digitalocean.com/pricing/droplets`).
   - Sourced Hetzner Cloud price adjustments of 15 June 2026 (`docs.hetzner.com`), noting that 2 vCPU / 4 GB plans (CX23/CPX21) start around €5.99–€7.72/mo (excl. VAT) with CX/CAX stock availability marked "verify before use".
   - Added domestic Vietnamese providers (FPT Cloud, Viettel IDC, Vietnix) as an Option D variant with VND billing, official VAT invoice (hóa đơn GTGT) support, and low domestic latency; noted caveats regarding promotional pricing (often requiring 12-36 months prepayment and excluding VAT).
   - Provided overall monthly cost range ($7 to $24 / month, ~180,000 to 600,000 VND / month) based on exchange rate assumptions ($1 ≈ 25,000 VND, €1 ≈ 27,500 VND; verify before use).

2. **Oracle Always Free Specifications (`docs/decisions/hosting.md`)**:
   - Documented the reported Always Free Ampere A1 adjustment around 15 June 2026 from 4 OCPU / 24 GB to 2 OCPU / 12 GB (1,500 OCPU hours, 9,000 GB hours/mo; marked "verify before use" on active tenancy).
   - Sourced the 7-day 20% idle compute reclamation policy directly to `docs.oracle.com Always Free Resources` documentation.
   - Removed unverified credit-card identity check claims.

3. **Quote Verification & Wording Paraphrases (`docs/decisions/hosting.md` & `docs/tasks/009-deploy-acceptance.md`)**:
   - Replaced Render quotes with verified paraphrases citing official documentation (`render.com/docs/free`).
   - Highlighted Render's explicit documentation notice that free instances must not be used for production applications.
   - Clarified that pre-deploy commands are only supported on paid instances, confirming Prisma migrations must execute against `DIRECT_URL` prior to deployment.

4. **Vercel Hobby Plan Refinements (`docs/decisions/hosting.md`)**:
   - Removed unverified "10-15 seconds" function duration limit while retaining the core non-commercial fair-use clause from `vercel.com/docs/limits/fair-use-guidelines`.

5. **Evaluation Matrix & Link Corrections (`docs/decisions/hosting.md`)**:
   - Removed all subjective "x/10" rating scores across all options and the comparison table in favor of concise factual fit/does not fit statements.
   - Fixed broken markdown link for Neon in the pre-deploy checklist and updated Neon documentation URLs to `neon.com`.

6. **Active Local Defaults in Environment Template (`.env.example`)**:
   - Preserved active local development defaults (`127.0.0.1` PostgreSQL and `http://localhost:3000`) so `cp .env.example .env` functions immediately out of the box with Docker Compose.
   - Moved Render and Neon pooled/direct connection strings into commented Phase 1 demo lines.

7. **Prisma Configuration Portability (`docs/tasks/001-project-setup.md`)**:
   - Updated Prisma migration instructions to configure the direct URL according to the Prisma version in use (`schema.prisma` `directUrl` where supported, `prisma.config.ts` otherwise) and record the choice in `README.md`.
   - Removed duplicate Prisma validation entry from Definition of Done.

---

## 13. Hosting Figures Verification, Provider Pricing Corrections, and Hetzner Status Alignment

1. **Option D Baseline Figures and Price Recomputation (`docs/decisions/hosting.md`)**:
   - Recomputed the Phase 2 baseline monthly cost range and comparison matrix using verified figures only, anchoring the monthly cost at **$24.00 / month** (~600,000 VND / month) based on the single verified 2 vCPU / 4 GB RAM plan (DigitalOcean Basic Droplet at `digitalocean.com/pricing/droplets`).
   - Sourced market exchange-rate assumptions: 1 USD ≈ 25,000 VND, 1 EUR ≈ 27,500 VND (market assumptions as of 2026; verify before use).
   - Removed Hetzner from anchoring the lower bound of the cost range. Noted the 15 June 2026 price adjustment (`docs.hetzner.com`), reported unorderability of shared CX and CAX lines, sharp CPX price increases, and datacenter location differences on `hetzner.com/cloud` (Singapore location carries a regional price premium and reduced 0.5 TB traffic vs 20 TB in EU); marked Hetzner pricing and availability as "verify before use".
   - Documented domestic Vietnamese VPS providers (Vietnix, FPT Cloud, Viettel IDC) citing their exact pricing-page URLs (`vietnix.vn/vps/`, `fptcloud.com/bang-gia-thue-vps/`, `viettelidc.com.vn/cloud-server`). Dropped stale figures, removed specific package names, and marked pricing as "verify before use". Added an English gloss for Vietnamese product-line names ("Giá Rẻ" ("Budget")).
   - Reclassified the 2 vCPU / 4 GB baseline justification (assuming 1 GB or 2 GB plans cannot reliably handle concurrent Next.js, PostgreSQL, and FFmpeg) as an engineering estimate to be formally validated via load testing in Phase 2. Removed unverified latency claims.

2. **Option B Free Tier Specification Verification (`docs/decisions/hosting.md`)**:
   - Verified Render free instance resources directly against `render.com/docs/free`: confirmed 0.1 CPU / 512 MB RAM.
   - Verified Neon free plan network egress directly against `neon.com/pricing`: confirmed 5 GB public network transfer per project per month.
   - Updated Neon scale-to-zero documentation (`neon.com/docs/introduction/plans#free-plan`): confirmed 5-minute inactivity suspension, and marked resume latency as "verify before use" since specific resume latency durations are not published on the plans page.




