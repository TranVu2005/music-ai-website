# Task 002: Prisma Schema and Database Seed

## 1. Objectives
- Define the Phase 1 relational database schema using Prisma ORM in `src/db/schema.prisma`.
- Generate the initial database migration (Migration 1) targeting PostgreSQL, placing migration scripts in `src/db/migrations/`.
- Restrict Phase 1 schema strictly to three tables: `users`, `tracks`, and `custom_requests`.
- Ensure `tracks` in Phase 1 contains NO `reserved_by_order_id` column (as `orders` arrives in Phase 2, where the column and foreign key relationship will be introduced).
- Implement an idempotent database seed script (`src/db/seed.ts`) populating at least 5 realistic sample music tracks pointing to placeholder preview files in `public/audio/previews/`.

## 2. Prerequisites (link docs)
- [Requirements](../requirements/requirements.md)
- [Architecture Overview](../architecture/overview.md)
- [Database Schema](../architecture/database-schema.md)
- [Project Plan](../project-plan.md)
- [AGENTS.md](../../AGENTS.md)
- [Task 001: Project Setup](./001-project-setup.md)

## 3. Scope
- Components, directories, and files within task scope:
  - `src/db/schema.prisma`: Define Prisma models for `User`, `Track`, and `CustomRequest`, along with their required ENUM types (`Role`, `TrackStatus`, `CustomRequestStatus`).
  - `src/db/migrations/`: Generate initial SQL migration directory (Migration 1) with clean table and index definitions.
  - `src/db/seed.ts`: Seed script to populate 5 diverse sample tracks with title, slug, description, genre, mood, bpm, duration, status set to `'published'`, and `preview_file_url` pointing to `public/audio/previews/<slug>.mp3`.
  - `public/audio/previews/`: Placeholder audio preview files for the 5 sample tracks.
  - `package.json`: Configure prisma seed command pointing to `ts-node` or `tsx` execution of `src/db/seed.ts`.
- Explicitly Out of Scope:
  - Do NOT include `reserved_by_order_id` in the `tracks` table (deferred to Phase 2).
  - Do NOT create Phase 2 or Phase 3 tables: `licenses`, `orders`, `order_items`, `payments`, `download_logs`, `settings`, `custom_request_revisions`, or `reviews`.
  - Do NOT implement REST API Route Handlers or frontend components in this task.

## 4. Definition of Done
- [ ] `schema.prisma` is created in `src/db/` and configured to output migrations into `src/db/migrations/`.
- [ ] Initial migration applies successfully against a clean PostgreSQL database without manual SQL intervention.
- [ ] Schema contains exactly the Phase 1 entities (`users`, `tracks`, `custom_requests`) with matching types and lowercase snake_case enum definitions.
- [ ] The `tracks` model explicitly omits `reserved_by_order_id`.
- [ ] Seed script executes without errors and inserts 5 valid sample tracks with `status = 'published'`.
- [ ] Running the seed script multiple times is completely idempotent (no duplicate records, unique constraint violations, or state corruption).
- [ ] Linter and type-checker pass without errors.

## 5. Required Tests
- [ ] Integration test: Apply Migration 1 on an empty test database and verify table creation and column constraints.
- [ ] Integration test: Execute `src/db/seed.ts` twice consecutively; verify that exactly 5 sample tracks exist in the database and data remains consistent.
