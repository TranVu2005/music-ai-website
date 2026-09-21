# Task 001: Project Initialization with Next.js Monorepo

## 1. Objectives
- Set up and initialize the base project structure for `music-shop` following the unified fullstack architecture (Frontend & API: Next.js/React + TypeScript + Tailwind CSS with Route Handlers, Database: PostgreSQL + Prisma ORM, Storage: S3-compatible Cloudflare R2 / AWS S3, Container: Docker, Test Runner: Vitest).
- Clean up legacy scaffold artifacts from the deprecated split-service architecture.
- Ensure code quality tooling (Linter, Formatter, TypeScript compiler) and operational startup scripts are fully functional.
- Establish baseline CI pipeline that runs green on pull requests.

## 2. Prerequisites (link docs)
- [Requirements](../requirements/requirements.md)
- [Architecture Overview](../architecture/overview.md)
- [Database Schema](../architecture/database-schema.md)
- [CLAUDE.md](../../CLAUDE.md)

## 3. Scope
- Components, directories, and files within task scope:
  - Cleanup of legacy scaffold:
    - Delete `src/backend/` and `src/frontend/` (legacy separate scaffold directories).
    - Delete `build/deploy/.github/` (duplicate CI workflow; only the repository root `.github/workflows/ci.yml` is active).
    - Rewrite `build/deploy/Dockerfile`: remove `[STACK]`, build a single unified Next.js application image on port 3000 with non-root user (`nextjs:nodejs`), retain FFmpeg/ffprobe, and remove legacy `dist/backend/server.js`.
    - Rewrite `build/deploy/docker-compose.yml`: orchestrate PostgreSQL database and ONE unified `app` service on port 3000 (no backend/frontend split, no port 5000); load database credentials dynamically from environment variables.
    - Rewrite `.env.example` for the actual project stack: `DATABASE_URL`, `S3_*` (Cloudflare R2 / AWS S3 only, no MinIO), `RESEND_API_KEY`, `EMAIL_FROM`, `OWNER_NOTIFICATION_EMAIL`, `MASTERS_DIR`, `APP_BASE_URL`. Remove PayOS/SePay/`PAYMENT_WEBHOOK_SECRET`, `JWT_SECRET` (deferred to Phase 3 auth), `SMTP_*`, and `PORT`/`BACKEND_URL`/`FRONTEND_URL`.
    - Translate all remaining Vietnamese comments in `ci.yml`, `Dockerfile`, `docker-compose.yml`, and `.env.example` into English.
  - Project directory structure & initial configuration:
    - `src/app/`: Next.js App Router root layout skeleton (`src/app/layout.tsx` with fonts and global styles) and API Route Handlers directory.
    - `src/db/`: Prisma ORM configuration (`schema.prisma` lives in `src/db/` so migrations land in `src/db/migrations/`, configured via `prisma.config.ts` or the `--schema` flag).
    - `src/db/migrations/`: Prisma ORM migration history directory.
    - `test/`: Test runner configuration with Vitest.
    - `.github/workflows/ci.yml`: Root automated CI workflow. Keep CI green by enabling dependency installation (`npm ci`), lint, test, and build steps once `package-lock.json` is committed in this task (noting `actions/setup-node` with `cache: 'npm'` requires a lockfile).
    - `tools/`: Development helper scripts.
  - Configure environment variables template `.env.example` and `.gitignore`.
  - Set up DevOps controls (Phase 1 Week 1): Pre-commit hook and CI checks preventing unapproved audio file commits outside `public/audio/previews/**` and `assets/watermark/**`.
- Explicitly Out of Scope:
  - Absolutely DO NOT write business logic, catalog endpoints, or audio player features in this task.

## 4. Definition of Done
- [ ] Directory structure initialized cleanly according to architecture design.
- [ ] Legacy scaffold directories (`src/backend/`, `src/frontend/`, `build/deploy/.github/`) removed.
- [ ] `build/deploy/Dockerfile` updated for single Next.js monorepo on port 3000 with non-root user and FFmpeg.
- [ ] `build/deploy/docker-compose.yml` updated with PostgreSQL and a single `app` service with env-driven credentials.
- [ ] `.env.example` updated with current stack variables (PostgreSQL, S3/R2, Resend, MASTERS_DIR, APP_BASE_URL).
- [ ] Minimal `src/app/layout.tsx` skeleton created (fonts, global styles).
- [ ] Base dependencies installed for Next.js application and `package-lock.json` committed.
- [ ] `docker compose up` starts local PostgreSQL database successfully.
- [ ] Linting, type-checking, and build validation scripts pass without errors.
- [ ] CI pipeline passes on the task PR (`.github/workflows/ci.yml` green).
- [ ] No compilation errors or configuration conflicts.

## 5. Required Tests
- [ ] Test directory structure and presence of required configuration files.
- [ ] Basic health check smoke test (`GET /api/health` returns HTTP 200 OK).
