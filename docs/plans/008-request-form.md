# Task 008 — Custom Music Request Form implementation plan

**Base:** `origin/main` at `b6abd14`; branch `feat/task-008-request-form` in a separate worktree.

**Goal:** Accept Vietnamese custom music inquiries, persist each valid request before notifying the owner, and keep inquiries safe when email fails.

## Scope and files

| File | Responsibility |
|---|---|
| `src/app/custom-request/page.tsx` | Responsive page with instructions and service tiers; neutral Tailwind only. |
| `src/components/forms/CustomRequestForm.tsx` | Accessible form, client validation, budget normalization, submit state, honeypot. Keep form logic separate from presentation functions. |
| `src/lib/i18n/vi.ts` | Typed `customRequest` dictionary only; no Vietnamese literals in JSX. |
| `src/lib/validation/custom-request.ts` | Shared Zod schema, field error keys, and inferred payload type. |
| `src/app/api/custom-requests/route.ts` | Node.js route wrapper and injectable handler; stream body limit; ordered checks; DB then email. |
| `src/lib/email/EmailProvider.ts` | `CustomRequestData` and `EmailProvider` interface. |
| `src/lib/email/ResendEmailProvider.ts` | Plain-text Resend delivery with `replyTo`. |
| `src/lib/email/ConsoleEmailProvider.ts` | Local/test delivery; redact PII in production fallback logs. |
| `src/lib/email/index.ts` | Environment-based provider factory. |
| `src/lib/security/rate-limit.ts` | `RateLimiter`, bounded `MemoryRateLimiter`, factory, trusted-proxy IP extraction. |
| `test/api/custom-requests.test.ts` | Zod, handler, limiter, provider, and database tests. |
| `package.json`, `package-lock.json` | Exact runtime dependencies `zod@4.6.5` and `resend@6.28.1`; no others. |
| `.env.example` | Document `TRUSTED_PROXY_HOPS=1`. |
| `docs/architecture/overview.md` | Rate-limiting note: Render header behavior **verify before use**. |
| `docs/status.md`, `CHANGELOG.md` | 004 and 004b Done (PR #12/#13), 008 In review, date and change entry. |

No other source files, layout, header/footer, brand assets, CI workflow, or database schema changes.

## Contracts and behavior

- Schema: trim all strings; required `customerName` 1–100, valid `customerEmail` at most 254, `briefDescription` 20–5000. Optional `customerPhone` at most 20, `genrePreference` at most 100, `targetDuration` at most 50, `referenceLinks` at most 2000; blank optional strings become `null`. Reject control characters/newlines in name, phone, genre, and duration. `budgetEstimate` is a JSON integer VND in `[0, 10000000000]`, or `null`, and becomes `bigint` for Prisma. The client converts Vietnamese-formatted budget text such as `10.000.000` to an integer before POST; the server never accepts formatted strings.
- Handler signature: `handleCustomRequest(request: Request, deps: { prisma: Pick<PrismaClient, "customRequest">; emailProvider: EmailProvider; rateLimiter: RateLimiter; now: () => number; emailTimeoutMs?: number }): Promise<Response>`. Default timeout is 10000 ms. The route binds production dependencies once and exports `runtime = "nodejs"`.
- Order: consume rate limit; read the request body stream while counting bytes, rejecting over 16 KiB with 413 regardless of `Content-Length`; parse JSON; check honeypot; validate Zod; insert row with `submitted`; notify owner. A filled honeypot returns the same `201 { ok: true }` as a real submission without DB/email. Invalid JSON and validation return 400, with validation `{ ok: false, errors: { field: messageKey } }`. Responses never echo PII or `bigint`.
- Limiter: 5 requests per 10 minutes per IP, 429 on attempt 6, expired-entry cleanup and 10,000-key cap. Extract the forwarded address at `entries.length - TRUSTED_PROXY_HOPS` (default 1), then `x-real-ip`, then a constant key with a warning. Trust forwarded headers only behind the configured Render/VPS proxy; verify Render's actual header behavior before deployment. Keep a shared-store extension point in the factory; no Redis implementation or dependency.
- Email: plain-text details and request ID, to `OWNER_NOTIFICATION_EMAIL`, from `EMAIL_FROM`, `replyTo` customer email. Production uses Resend only with a real `RESEND_API_KEY`; development/test and absent or placeholder keys use Console. Missing production config logs an error and falls back to Console without logging customer PII. Email failure or timeout logs request ID and a sanitized error only, then returns 201 because the DB row already exists.

## Implementation sequence (test first)

- [ ] Install the two pinned dependencies and generate Prisma Client in the isolated worktree.
- [ ] Write failing Zod tests for limits, trimming/nulls, malformed email, budget range/integer, and control characters; implement schema and dictionary.
- [ ] Write failing limiter tests for same/different IP, window expiry, bounded eviction, trusted-hop selection, fallbacks and warning; implement limiter and factory.
- [ ] Write failing handler tests for stream size without `Content-Length`, invalid JSON, honeypot, 400 error keys, 429, DB-first ordering, email throw, and a short injected timeout; implement handler and thin route.
- [ ] Write database integration tests against local PostgreSQL for one persisted `submitted` row, correct fields including BigInt, and email-failure persistence; use isolated fixtures and cleanup.
- [ ] Write failing budget-normalization and dictionary-key tests; implement form and page with accessible labels, guidance, and responsive neutral styling.
- [ ] Update `.env.example`, architecture note, status and changelog; review scope diff.
- [ ] Run in exact order and capture raw output: `npm ci`, `npm run prisma:generate`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run check:audio`. Run database migration prerequisite only if the local database needs it. Include raw failures if any.
- [ ] Review task §4–5 checklist, run `git diff --stat main`, commit implementation, open PR with checklist and raw verification output. Vu alone merges.

## Spec reconciliation

Task §3 mentions a future Redis implementation; the approved Task 008 decision limits this work to the interface, memory implementation, and extension point. Task §4 allows 200/201; this plan uses 201. The Console provider prints message details only in development/test; production fallback logging is redacted to prevent PII exposure. The approved client-IP correction and stream size limit supersede the original prompt. `AGENTS.md` and the approved task request restrict all implementation to this scope.
