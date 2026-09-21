# Task 008: Custom Music Request Form and Dual-Persistence Delivery

## 1. Objectives
- Build the customer-facing Custom Music Request page (`/custom-request`) containing an intuitive brief intake form.
- Implement the `POST /api/custom-requests` Route Handler with robust client and server validation using Zod.
- Implement the dual-persistence pattern: persist the submitted brief directly into the `custom_requests` database table FIRST with `status = 'submitted'`, and then dispatch an email notification to the site owner.
- Implement resilient error handling: if the email delivery provider encounters an error or timeout, the failure must be logged, but the API must still return HTTP success (the customer's request is safely preserved in the database and never lost).
- Define a decoupled `EmailProvider` TypeScript interface with two implementations: `ResendEmailProvider` for production delivery and `ConsoleEmailProvider` for local development and testing.
- Implement anti-abuse defenses: a hidden honeypot field to trap spambots and IP-based rate limiting on the submission endpoint.

## 2. Prerequisites (link docs)
- [Requirements](../requirements/requirements.md)
- [Architecture Overview](../architecture/overview.md)
- [Database Schema](../architecture/database-schema.md)
- [Project Plan](../project-plan.md)
- [CLAUDE.md](../../CLAUDE.md)
- [Task 002: Prisma Schema and Seed](./002-prisma-schema-seed.md)
- [Task 009: Deployment Decision](./009-deploy-acceptance.md) (Hosting decision dictates rate-limiter backing store)

## 3. Scope
- Components, directories, and files within task scope:
  - `src/app/custom-request/page.tsx`: Custom composition inquiry page with instructions, service tier overview, and intake form.
  - `src/components/forms/CustomRequestForm.tsx`: Form component collecting customer name, email, phone, brief description, genre preference, target duration, budget estimate, and reference links, including a hidden honeypot input field.
  - `src/app/api/custom-requests/route.ts`: API Route Handler accepting form submission, validating data, performing database insert, and triggering email dispatch.
  - `src/lib/validation/custom-request.ts`: Zod schema definitions for request payload validation.
  - `src/lib/email/`:
    - `EmailProvider.ts`: Interface declaring `sendCustomRequestNotification(data: CustomRequestData): Promise<void>`.
    - `ResendEmailProvider.ts`: Implementation integrating the Resend SDK.
    - `ConsoleEmailProvider.ts`: Mock implementation printing email contents to stdout/logger.
    - `index.ts`: Provider factory selecting implementation based on environment configuration (`NODE_ENV` / `RESEND_API_KEY`).
  - `src/lib/security/rate-limit.ts`: IP rate-limiting utility for submission endpoints. The in-memory rate limiter is per-instance; if the approved hosting architecture (tied to the decision in Task 009) is serverless (e.g., Vercel), a shared store (such as Upstash / Redis) must be used. If deployed to a persistent Docker VPS, in-memory rate limiting is sufficient.
  - `test/api/custom-requests.test.ts`: Automated tests covering endpoint logic, validation, and resilience.
- Explicitly Out of Scope:
  - Do NOT build an administrative management dashboard for custom requests (deferred to Phase 3; Phase 1 relies on DB persistence and email alerts).
  - Do NOT implement formal quotes, advance deposit payments, or demo audio revision loops (deferred to Phase 3).
  - Do NOT require customer authentication or login to submit a request.

## 4. Definition of Done
- [ ] Custom Request page renders with responsive styling and clear field guidance in Vietnamese.
- [ ] Zod schema validates all inputs: required customer name, valid email address, detailed brief description; optional phone, genre, duration, budget, links.
- [ ] Submissions are saved to `custom_requests` table before email dispatch is triggered.
- [ ] Email notification reaches the owner containing all submitted details via `EmailProvider`.
- [ ] If email dispatch throws an exception or network failure occurs, the error is logged and the API returns HTTP 200/201 with success status so user sees positive confirmation.
- [ ] Submissions with filled honeypot fields are silently rejected or discarded without triggering database persistence or email dispatch.
- [ ] Endpoint enforces rate limiting per client IP to prevent submission spam.
- [ ] All UI strings originate from the centralized Vietnamese dictionary file.
- [ ] Linter and type-checker pass without errors.

## 5. Required Tests
- [ ] Unit tests for Zod validation schema (rejecting empty descriptions, malformed emails, and overly long inputs; accepting valid payloads).
- [ ] Integration test: Verify successful submission creates a record in `custom_requests` table with `status = 'submitted'`.
- [ ] Resilience test: Mock `EmailProvider.sendCustomRequestNotification` to throw an Error; verify that the database row is still created and the Route Handler returns HTTP 200/201 success.
- [ ] Security test: Verify that sending a payload with the honeypot field populated is blocked and no database record or email is sent.
- [ ] Security test: Verify that exceeding the submission rate limit returns HTTP 429 Too Many Requests.
