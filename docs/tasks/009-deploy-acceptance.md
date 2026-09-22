# Task 009: Deployment Decision and Milestone 1 Acceptance

## 1. Objectives
- Execute Step 1: Record and maintain the architectural decision in [`docs/decisions/hosting.md`](../decisions/hosting.md) detailing the hosting strategy: Phase 1 demo hosted on Render Free Web Service + Neon Free PostgreSQL (with Cloudflare Quick Tunnel as local fallback) and Phase 2 commercial production on a dedicated paid VPS. Maintain the hard rule: **"No real customer orders on any free tier."**
- Maintain a strict deployment hold: do NOT deploy the application to any public environment until the store owner reviews and formally approves `docs/decisions/hosting.md` and completes the pre-deploy checklist.
- Execute Step 2 (post-approval): Deploy the Phase 1 application to Render free using the container build at `build/deploy/Dockerfile` connected to Neon free PostgreSQL.
- Execute Step 3: Run the comprehensive Milestone 1 acceptance verification checklist directly from the client plan (*"Kế hoạch triển khai website bán nhạc: bản gửi khách hàng"*). Ensure the demo URL is opened 1-2 minutes prior to review meetings to wake the spun-down free instance. Note: Real-device mobile checks (iOS Safari, Android Chrome) are marked as "human-verified by the owner" with a dedicated verification checklist, rather than agent-executed.
- Produce the final acceptance report with test evidence in `docs/acceptance/milestone-1.md`.

## 2. Prerequisites (link docs)
- [Requirements](../requirements/requirements.md)
- [Architecture Overview](../architecture/overview.md)
- [Project Plan](../project-plan.md)
- [Hosting Decisions](../decisions/hosting.md)
- [AGENTS.md](../../AGENTS.md)
- [Task 001: Project Setup](./001-project-setup.md)
- [Task 002: Prisma Schema and Seed](./002-prisma-schema-seed.md)
- [Task 003: Preview Generator](./003-preview-generator.md)
- [Task 004: Catalog API](./004-catalog-api.md)
- [Task 005: UI Design Mockups](./005-ui-design.md)
- [Task 006: Static Pages](./006-static-pages.md)
- [Task 007: Catalog UI and Player](./007-catalog-ui-player.md)
- [Task 008: Custom Request Form](./008-request-form.md)

## 3. Scope
- Components, directories, and files within task scope:
  - `docs/decisions/hosting.md`: Formal architectural decision record detailing options considered, Render + Neon selection for Phase 1 demo, Cloudflare Quick Tunnel fallback, and paid VPS commitment for Phase 2.
  - Render Free Deployment Configuration:
    - **Runtime Selection**: Docker using `build/deploy/Dockerfile`.  
      *Justification*: Docker provides strict environment parity between local development, Render free tier, and the future Phase 2 VPS; packages OpenSSL required by the Prisma engine on Alpine; packages FFmpeg and ffprobe for preview generation without host OS dependency; and executes Next.js standalone output (`output: 'standalone'`) to minimize memory usage within Render's 512 MB free tier constraint.
    - **Render Service Settings**:
      - Service Type: Web Service
      - Environment: Docker
      - Dockerfile Path: `build/deploy/Dockerfile`
      - Context: `.` (repository root)
      - Health Check Path: `/api/health`
      - Auto-Deploy: Yes (on push to main) or Manual deploy
    - **Environment Variables**:
      - `NODE_ENV=production`
      - `PORT=3000`
      - `DATABASE_URL`: Pooled connection string from Neon (e.g., `postgresql://user:pass@ep-xyz-pooler.region.neon.tech/neondb?sslmode=require&pgbouncer=true`) used by the Next.js runtime.
      - `DIRECT_URL`: Unpooled direct connection string from Neon (e.g., `postgresql://user:pass@ep-xyz.region.neon.tech/neondb?sslmode=require`) used by Prisma migrations.
      - `APP_BASE_URL`: Free Render service domain (e.g., `https://music-shop-demo.onrender.com`).
      - `EMAIL_FROM=onboarding@resend.dev`: Default sender on Resend free tier.
      - `OWNER_NOTIFICATION_EMAIL`: Must strictly match the verified Resend account owner email address.
      - `RESEND_API_KEY`: API key for Resend email delivery.
    - **Prisma Migrations against `DIRECT_URL`**:
      - *Render Pre-Deploy Command Analysis*: Render's official documentation indicates that pre-deploy commands are only available for paid service instances (web services, private services, background workers) and cannot be used on free plans ([render.com/docs/free](https://render.com/docs/free)). In addition, Render's free-tier documentation explicitly states that free instances must not be used for production applications.
      - *Migration Execution*: Because pre-deploy commands cannot run on the free plan, Prisma migrations must NOT be configured as a Render pre-deploy hook. Instead, migrations must be executed against `DIRECT_URL` (bypassing PgBouncer) from the developer workstation (`npx prisma migrate deploy --schema=src/db/schema.prisma`) or via GitHub Actions CI prior to triggering or activating the Render deployment.
  - `docs/acceptance/milestone-1.md`: Structured acceptance test report recording pass/fail status and operational notes for each Milestone 1 criterion. Real-device tests (iOS Safari, Android Chrome) are formatted as a checklist for human verification by the website owner.
- Explicitly Out of Scope:
  - **No real customer orders on any free tier.** Free hosting is strictly limited to Phase 1 preview demonstration.
  - Do NOT deploy prior to receiving explicit owner approval on `docs/decisions/hosting.md` and completion of the pre-deploy checklist.
  - Do NOT configure Phase 2 payment webhooks, bank transfer credentials, or private S3 buckets.
  - Do NOT run automated commerce transactions or order fulfillment checks (Phase 2).
  - Agent must not claim simulated browser testing on physical mobile hardware; real-device testing is reserved for human verification by the owner.

## 4. Definition of Done
- [ ] `docs/decisions/hosting.md` is authored, approved in writing by the website owner, and the pre-deploy checklist is completed before deployment.
- [ ] Hard rule enforced: **"No real customer orders on any free tier."**
- [ ] Prisma database schema migrations are executed against Neon `DIRECT_URL` prior to container deployment.
- [ ] Application is deployed and live on Render free web service (`*.onrender.com`) accessible via HTTPS.
- [ ] Health check endpoint `GET /api/health` returns HTTP 200 OK on the deployed instance.
- [ ] Milestone 1 acceptance checklist executed and verified:
  - **Open the demo URL 1-2 minutes before the review meeting (free web service spins down after idle).**
  - Website loads properly on desktop browsers (Chrome, Safari, Firefox).
  - Real-device mobile checklist (iOS Safari, Android Chrome) provided to and human-verified by the owner.
  - At least 5 sample tracks are visible in the catalog with complete metadata.
  - Tracks can be filtered by genre and mood.
  - Audio previews play, seek, and pause smoothly across desktop and mobile.
  - Custom music request form submits cleanly with client validation.
  - Submitted request is persisted in the PostgreSQL database table `custom_requests`.
  - Email notification successfully reaches the website owner's actual email inbox.
- [ ] Full acceptance report published in `docs/acceptance/milestone-1.md` with owner sign-off.
- [ ] Linter and type-checker pass without errors.

## 5. Required Tests
- [ ] Production smoke tests on the live Render test domain:
  - Verify homepage and static routes load within performance thresholds (accounting for initial spin-up).
  - Verify `GET /api/health` returns HTTP 200 OK.
  - Verify `GET /api/tracks` returns HTTP 200 with populated sample tracks.
  - Verify preview audio streaming returns HTTP 200 / HTTP 206 Partial Content.
- [ ] Acceptance verification run:
  - Desktop browser automated/manual checks confirming catalog filtering, audio player, and request form submission.
  - Real-device verification: Owner completes and signs off the human-verified mobile device checklist (iOS Safari, Android Chrome).
- [ ] Email delivery verification: Confirm real notification receipt in the owner's designated mailbox via Resend.
