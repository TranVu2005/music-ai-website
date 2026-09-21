# Task 001: Project Initialization with Next.js Monorepo

## 1. Objectives
- Set up and initialize the base project structure for `music-shop` following the unified fullstack architecture (Frontend & API: Next.js/React + TypeScript + Tailwind CSS with Route Handlers, Database: PostgreSQL + Prisma ORM, Storage: S3-compatible Cloudflare R2 / AWS S3, Container: Docker, Test Runner: Vitest).
- Ensure code quality tooling (Linter, Formatter, TypeScript compiler) and operational startup scripts are fully functional.

## 2. Prerequisites (link docs)
- [Requirements](../requirements/requirements.md)
- [Architecture Overview](../architecture/overview.md)
- [Database Schema](../architecture/database-schema.md)
- [CLAUDE.md](../../CLAUDE.md)

## 3. Scope
- Initialize project directory structure:
  - `src/`: Next.js project configuration (TypeScript, Tailwind CSS, App Router & API Route Handlers).
  - `src/db/`: Prisma ORM configuration (`schema.prisma` lives in `src/db/` so migrations land in `src/db/migrations/`, configured via `prisma.config.ts` or the `--schema` flag).
  - `src/db/migrations/`: Prisma ORM migration history directory.
  - `test/`: Test runner configuration with Vitest.
  - `.github/workflows/ci.yml`: GitHub Actions automated CI workflow.
  - `build/deploy/`: `Dockerfile` and `docker-compose.yml`.
  - `tools/`: Development helper scripts.
- Configure environment variables template `.env.example` and `.gitignore`.
- Set up DevOps controls (Phase 1 Week 1): Pre-commit hook and CI checks preventing unapproved audio file commits outside `public/audio/previews/**` and `assets/watermark/**`.
- Explicitly Out of Scope:
  - Absolutely DO NOT write business logic or detailed application features in this task.

## 4. Definition of Done
- [ ] Directory structure initialized cleanly according to architecture design.
- [ ] Base dependencies installed for Next.js application.
- [ ] `docker compose up` starts local PostgreSQL database successfully.
- [ ] Linting, type-checking, and build validation scripts pass without errors.
- [ ] No compilation errors or configuration conflicts.

## 5. Required Tests
- [ ] Test directory structure and presence of required configuration files.
- [ ] Basic health check smoke test (`GET /api/health` returns HTTP 200 OK).
