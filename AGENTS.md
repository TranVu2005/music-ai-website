# Agent Guidelines (AGENTS.md)
> Canonical rules for all AI agents and developers. `CLAUDE.md` and `GEMINI.md` only point here; edit this file only.

This document outlines mandatory engineering principles for developers and AI coding assistants working on the **music-shop** project.

## 1. Docs-First Rule
- **Read before writing code**: Always thoroughly read all specifications in `docs/architecture/` and the specific task file in `docs/tasks/` before making any source code modifications.
- Architecture documents and requirements specifications are the supreme source of truth for determining feature correctness.

## 2. Branching Strategy
- **One branch per task**: Never commit feature code directly to the `main` branch.
- Branch naming format: `feat/task-<task_number>-<short_description>` or `fix/task-<task_number>-<short_description>` (e.g., `feat/task-001-project-setup`).
- After completing work and passing all tests, submit a Pull Request accompanied by the acceptance checklist from the task file.

## 3. Mandatory Testing Requirements
- **Critical Flow Test Coverage (Vitest)**:
  - **Manual Payment Confirmation Idempotency**: Verify that duplicate or concurrent clicks on `"Xác nhận đã nhận tiền"` ("Confirm payment received") transition the order, grant download access, and dispatch email only once.
  - **Lock Ordering & Hold Isolation**: Verify strict locking order and hold isolation tests defined in `payment-flow.md` section 6, including the concurrent opposite-order deadlock avoidance test.
  - **Download Authorization**: Verify token hash matching via constant-time comparison, requirement for `paid` order status, rejection of expired `download_expires_at`, and delivery of short-lived signed URLs (15-30m TTL).
  - **Claim-Paid Abuse Controls**: Verify `"Tôi đã chuyển tiền"` ("I have transferred") claim controls (allowed only once per order, rejected on `EXPIRED` or `CANCELLED` orders, capped by `max_pending_exclusive_orders`, and endpoint rate-limiting).
  - **Refund Completion Transition**: Verify that manual refund completion transitions `orders.needs_refund` to `false`, sets `orders.payment_status` and `payments.status` to `'refunded'`, and logs the bank reference in `payments.notes`.
- Pull Requests lacking automated test coverage for critical business flows will not be approved.

## 4. Strict Scope Boundary
- **Do not modify beyond task scope**: Only modify files and implement behaviors explicitly defined in the **Scope** section of the active task document.
- If technical debt or refactoring opportunities are discovered outside the task scope, record them as a new task in `docs/tasks/` rather than expanding the current task.

## 5. Portability and Hosting Guardrails
- **Hard Rule**: "No real customer orders on any free tier." Free tiers (Render web service, Neon Postgres, Cloudflare quick tunnels) are strictly restricted to Phase 1 preview demonstration and stakeholder review. Real customer orders must NEVER run on any free tier; Phase 2 commercial sales require the paid VPS.
- **No Hosting-Vendor-Specific APIs**: Do not use hosting-vendor-specific APIs in application code (no `@vercel/kv`, `@vercel/blob`, Edge runtime, or vendor proprietary cron configurations). Anything platform-specific must sit behind a TypeScript interface (e.g., `EmailProvider`, `PaymentProvider`, `RateLimiter`).
- **Container Parity**: The Docker image path (`build/deploy/Dockerfile`) must keep working for the later VPS as well as local development and the Render free demo.
- **VPS Migration Path**: Maintain an explicit migration path to the VPS: `pg_dump`/`restore` from Neon, DNS TTL lowered beforehand, and environment variables cataloged in `.env.example`.

## 6. Workflow
- Plan first, then wait for explicit approval from the product owner before changing any file. Do not write code before approval.
- After approval, implement on the task branch, run the required verification, and open a Pull Request. Only Vu merges.

## 7. Commands
- On a fresh clone, run in this required order: `npm ci` → `npm run prisma:generate` → `npm run lint` → `npm run typecheck` → `npm test` → `npm run build`.
- `npm run typecheck` fails before Prisma Client is generated because its generated client types are unavailable.
- Additional verification: `npm run check:audio`.
- Prisma and database: `npm run prisma:generate`, `npm run db:migrate:deploy`, `npm run db:seed`.
- Database commands and integration tests require a running local PostgreSQL database with `DATABASE_URL` and `DIRECT_URL` set as in `.env.example` (local default: `127.0.0.1:5432/music_shop_db`).

## 8. PR Evidence
- The PR body must include the raw output of the required verification commands, the acceptance checklist from the task file, and the output of `git diff --stat main`.
- If a required command fails, include its raw failing output and identify the missing prerequisite. Do not skip or modify tests.

## 9. Roles
- **Product owner — Vu**: Makes final product decisions, approves plans, and is the only person who merges PRs.
- **Lead — Claude in the claude.ai Project**: Defines tasks and reviews the work against the repository docs.
- **Implementer — OpenAI Codex**: Plans, implements approved tasks on branches, verifies, and opens PRs.
- **PR reviewer — Claude Code**: Reviews PRs against the task and architecture docs; does not merge.
