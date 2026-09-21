# Task 009: Deployment Decision and Milestone 1 Acceptance

## 1. Objectives
- Execute Step 1: Research, draft, and document an architectural decision record in `docs/decisions/hosting.md` comparing hosting options (Vercel vs a Docker VPS) across monthly cost, setup effort, ongoing maintenance, and suitability for serving static preview audio from `public/audio/previews/`. The document must also evaluate production PostgreSQL database hosting options (managed database such as Neon/Supabase/Render vs containerized PostgreSQL on VPS) and calculate total combined monthly costs.
- Maintain a strict deployment hold: do NOT deploy the application to any public environment until the store owner reviews and formally approves `docs/decisions/hosting.md`.
- Execute Step 2 (post-approval): Deploy the Phase 1 application to the designated test domain configured with SSL/TLS.
- Execute Step 3: Run the comprehensive Milestone 1 acceptance verification checklist directly from the client plan (*"Kế hoạch triển khai website bán nhạc: bản gửi khách hàng"*). Note: Real-device mobile checks (iOS Safari, Android Chrome) are marked as "human-verified by the owner" with a dedicated verification checklist, rather than agent-executed.
- Produce the final acceptance report with test evidence in `docs/acceptance/milestone-1.md`.

## 2. Prerequisites (link docs)
- [Requirements](../requirements/requirements.md)
- [Architecture Overview](../architecture/overview.md)
- [Project Plan](../project-plan.md)
- [CLAUDE.md](../../CLAUDE.md)
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
  - `docs/decisions/hosting.md`: Comparative evaluation of application hosting (Vercel Hobby/Pro tiers vs Docker VPS e.g. Hetzner/DigitalOcean/Linode) and production PostgreSQL database hosting (managed PostgreSQL vs containerized PostgreSQL in Docker), detailing total estimated monthly cost, setup complexity, backup strategy, and public audio serving.
  - Deployment configuration and CI/CD scripts appropriate for the approved hosting strategy (`build/deploy/` configurations, environment variable provisioning).
  - `docs/acceptance/milestone-1.md`: Structured acceptance test report recording pass/fail status and operational notes for each Milestone 1 criterion. Real-device tests (iOS Safari, Android Chrome) are formatted as a checklist for human verification by the website owner.
- Explicitly Out of Scope:
  - Do NOT deploy prior to receiving explicit owner approval on `docs/decisions/hosting.md`.
  - Do NOT configure Phase 2 payment webhooks, bank transfer credentials, or private S3 buckets.
  - Do NOT run automated commerce transactions or order fulfillment checks (Phase 2).
  - Agent must not claim simulated browser testing on physical mobile hardware; real-device testing is reserved for human verification by the owner.

## 4. Definition of Done
- [ ] `docs/decisions/hosting.md` is authored covering application hosting, database hosting (managed vs container), and total combined monthly cost, and is approved in writing by the website owner before deployment.
- [ ] Application is deployed and live on the designated test domain accessible via HTTPS.
- [ ] Health check endpoint `GET /api/health` returns HTTP 200 OK on the deployed instance.
- [ ] Milestone 1 acceptance checklist executed and verified:
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
- [ ] Production smoke tests on the live test domain:
  - Verify homepage and static routes load within performance thresholds.
  - Verify `GET /api/tracks` returns HTTP 200 with populated sample tracks.
  - Verify preview audio streaming returns HTTP 200 / HTTP 206 Partial Content.
- [ ] Acceptance verification run:
  - Desktop browser automated/manual checks confirming catalog filtering, audio player, and request form submission.
  - Real-device verification: Owner completes and signs off the human-verified mobile device checklist (iOS Safari, Android Chrome).
- [ ] Email delivery verification: Confirm real notification receipt in the owner's designated mailbox.
