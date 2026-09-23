# Project Status

> Last updated: 2026-09-23 (PR #9 merged)
> Purpose: single handoff document for any new chat, reviewer or agent. Read this file and `CHANGELOG.md` first.
> Update rule: every PR that changes a decision, a task status or an open item updates this file in the same PR.

## 1. Roles

| Role | Who | Responsibility |
|---|---|---|
| Product owner | Vu | Final decisions, merges PRs, relays client input |
| Lead / reviewer | Claude (claude.ai Project "Website bán âm nhạc") | Breaks down work, writes English agent prompts, reviews every PR against the docs by pulling the repo |
| Executing agents | Gemini 3.8 (Architect, Backend, Frontend, DevOps, QA roles) | Write docs and code on branches, open PRs, paste raw VERIFY output |

Working rules: one task = one branch = one PR. Agents never merge. Reviews are based on the repo contents, not on agent reports. Every number, price or limit in the docs cites an official source or is marked "verify before use".

## 2. Source of truth

| File | Content |
|---|---|
| `docs/project-plan.md` | Scope (13 features, split 5/4/4 across 3 phases), milestones, out-of-scope list |
| `docs/requirements/requirements.md` | Functional and non-functional requirements per phase |
| `docs/architecture/overview.md` | Modules, stack, portability rules |
| `docs/architecture/database-schema.md` | 11 tables, phase-tagged |
| `docs/architecture/payment-flow.md` | Manual payment confirmation, locking, expiry, refunds, QA scenarios |
| `docs/architecture/file-protection.md` | Previews, masters, signed URLs, repo audio rules |
| `docs/decisions/hosting.md` | Hosting decision record (options A-E) |
| `docs/tasks/*.md` | Phase 1 task specs 001-009 |
| `AGENTS.md` | Agent rules (docs-first, testing requirements); CLAUDE.md and GEMINI.md point here |

Client-facing plan (Vietnamese, not in repo docs): "Kế hoạch triển khai website bán nhạc: bản gửi khách hàng" (Music website implementation plan: client version).

## 3. Final decisions

| Area | Decision |
|---|---|
| Stack | Next.js (TypeScript, App Router) monolith with Route Handlers; PostgreSQL + Prisma; Tailwind; Vitest; Docker (standalone output) |
| Agent runtime | Executing agents run in Google Antigravity (Gemini). Rules: AGENTS.md (CLAUDE.md, GEMINI.md point to it). Skills: .agent/skills/ |
| Locking queries | Run inside `prisma.$transaction` with `prisma.$queryRaw` (`SELECT ... FOR UPDATE`); lock order: order row, then tracks by ascending id, on every path including the expiry sweep |
| Payment | VietQR (EMVCo payload generated locally, transfer content = `order_code`) + manual confirmation by the owner in admin. No webhooks in scope; `PaymentProvider` interface kept for a future adapter |
| Cart | Multiple items per order (`orders` + `order_items`); one license per track per order |
| Exclusive tracks | Reserved at order creation via `tracks.reserved_by_order_id`; released only by the holding order; `hold_minutes` default 60 |
| "Tôi đã chuyển tiền" (I have transferred) | Once per order; extends hold to `claimed_hold_hours` (default 24); capped by `max_pending_exclusive_orders` (default 2) per email and IP; rate-limited |
| Expired order confirmed late | Re-check availability; if any exclusive track is gone, reject the whole order and set `needs_refund` (100% refund, manual) |
| Downloads | Email link carries a per-order token (>=128-bit, stored as SHA-256 `download_token_hash`, valid `download_valid_days`, default 30); each click issues a 15-30 min signed URL; logged per `order_item_id` |
| Custom orders | Free revisions and deposit % copied from `settings` into the request at quote time |
| BPM | Stored and displayed only; filters are genre, mood and keyword search |
| Email | Resend behind an `EmailProvider` interface |
| Phase 1 request form | Saved to `custom_requests` first, then emailed to the owner; email failure never loses the request |
| Previews / masters | Previews in `public/audio/previews/` in Phase 1; masters never in the repo (`MASTERS_DIR` outside the repo); R2/S3 from Phase 2 |
| Language | Website UI Vietnamese-only (i18n-ready string dictionary); all project docs in English |
| Hosting, Phase 1 | Demo on Render free web service + Neon free Postgres; Cloudflare quick tunnel from the developer machine as fallback |
| Hosting, Phase 2 | Paid VPS (baseline estimate 2 vCPU / 4 GB, to validate by load test) decided before week 6. Hard rule: no real customer orders on any free tier. Vercel Hobby excluded (non-commercial only) |

## 4. Progress

| Item | Status |
|---|---|
| Planning docs, schema, payment and file-protection specs | Done (PR #1-#4 merged) |
| Docs translated to English | Done |
| Legacy scaffold cleanup (Express/MinIO/PayOS remnants), Dockerfile, compose, `.env.example` | Done in docs PRs; verified by Task 001 |
| Phase 1 task specs 001-009 | Done |
| Phase 1 implementation | Not started |

### Phase 1 tasks (weeks 1-3)

| Task | Owner | Week | Depends on | Status |
|---|---|---|---|---|
| 001 Project setup, CI, audio guard | DevOps | 1 | - | Done (PR #7) |
| 002 Prisma schema (users, tracks, custom_requests) + seed | Backend | 1 | 001 | Done (PR #8) |
| 005 UI design prototypes (Home, Catalog) | Frontend | 1 | brand name + style | Blocked on owner input |
| 003 Preview generator (FFmpeg + watermark) | Backend | 2 | 001 | Done (PR #9) |
| 004 Catalog API | Backend | 2 | 002 | Waiting |
| 007 Catalog UI + audio player | Frontend | 2 | 004, approved 005 | Waiting |
| 006 Static pages (Home, About, Contact, Pricing) | Frontend | 3 | approved 005, rebases on 007 | Waiting |
| 008 Request form (DB + email) | Backend + Frontend | 3 | 002 | Waiting |
| 009 Deploy demo + Milestone 1 acceptance | DevOps/QA | 3 | 001-008, owner approval | Waiting |

## 5. Next actions

1. Assign Task 005 once the brand name and style direction are provided (or with placeholders).

## 6. Open items

### Owner (Vu)
- [ ] Brand name and style direction (colors, feel) for Task 005.
- [ ] Make the GitHub repository private (currently public, includes the client plan PDF).
- [ ] Before Task 009: create Neon, Render and Resend accounts (Resend with the owner's mailbox); read the Render and Neon free-tier terms.
- [ ] Before week 6: choose the paid VPS; request monthly quotes from 2-3 providers (DigitalOcean verified at $24/month; domestic providers "verify before use").

### Client (due dates from the client plan)
- [ ] At least 5 sample tracks with metadata, About/Contact content: start of week 2.
- [ ] Pricing, brand name, logo, domain: start of week 3 (domain not required for the free demo).
- [ ] Payment receiving method (individual or business): start of week 4.
- [ ] License terms (standard and exclusive), exclusive hold time: start of week 6.
- [ ] Free revision count and deposit for custom orders: start of week 9.
- [ ] 20-30 tracks with full metadata: start of week 12.
- [ ] Spoken brand voice tag (WAV, 2-3 s) to replace the placeholder watermark.
- [ ] Tax and business registration advice from an accountant (client plan note).

## 7. Known follow-ups

- Raw SQL UPDATEs (`$queryRaw` locking paths, Phase 2) must set `updated_at = now()` explicitly; `@updatedAt` is client-side only.
- Seed must refuse to run when NODE_ENV=production (Phase 2 hardening).
- Placeholder previews are ~5 s silent clips; real durationSeconds come from Task 003.
- Preview generator runs via tsx (devDependency) and is not runnable in the runner image; Phase 2 upload processing needs a compiled tool or worker.
- CI actions versions: actions/checkout@v4 and actions/setup-node@v4 run on deprecated Node 20 runner; bump to v5 and pin runs-on: ubuntu-24.04 before ubuntu-latest moves to Ubuntu 26 on 2026-10-19.
- npm audit: 3 high advisories from deepmerge-ts via prisma -> @prisma/config (dev dependency only, not in the runtime image); re-check when upgrading to Prisma 7.
- Neon free-plan egress (5 GB) and resume latency: confirm on the official page during the pre-deploy checklist.
- Phase 2: validate the 2 vCPU / 4 GB estimate with a load test; add `tracks.reserved_by_order_id` FK in the Phase 2 migration.
- Stale remote branches (`docs/phase1-tasks`, `docs/task-amendments`, `docs/free-demo`, `docs/hosting-figures`) can be deleted.
