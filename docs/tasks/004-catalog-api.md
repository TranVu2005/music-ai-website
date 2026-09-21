# Task 004: Catalog REST API Handlers

## 1. Objectives
- Implement Next.js Route Handlers for the public music track catalog under `src/app/api/`.
- Provide `GET /api/tracks`: retrieve paginated published tracks, supporting keyword search across `title` and `description`, and filtering by `genre` and `mood`.
- Provide `GET /api/tracks/[slug]`: retrieve full details for a single published track identified by its unique slug.
- Provide `GET /api/filters`: retrieve distinct genres and moods currently used by published tracks to dynamically populate UI filter selectors.
- Ensure `bpm` is returned as informational metadata in track responses, but is NEVER filterable or queryable via request parameters.
- Enforce strict security: `original_file_key` must NEVER be exposed in any API response or serialization payload.

## 2. Prerequisites (link docs)
- [Requirements](../requirements/requirements.md)
- [Architecture Overview](../architecture/overview.md)
- [Database Schema](../architecture/database-schema.md)
- [File Protection](../architecture/file-protection.md)
- [CLAUDE.md](../../CLAUDE.md)
- [Task 002: Prisma Schema and Seed](./002-prisma-schema-seed.md)

## 3. Scope
- Components, directories, and files within task scope:
  - `src/app/api/tracks/route.ts`: List published tracks with pagination (`page`, `limit`), keyword search query (`q`), and categorical filters (`genre`, `mood`).
  - `src/app/api/tracks/[slug]/route.ts`: Single track retrieval endpoint returning HTTP 200 with track payload or HTTP 404 if not found or unpublished.
  - `src/app/api/filters/route.ts`: Distinct query endpoint returning `{ genres: string[], moods: string[] }` from published tracks.
  - `src/lib/api/serialization.ts`: Response sanitization ensuring `original_file_key` is completely omitted.
  - `test/api/catalog.test.ts`: Automated unit and integration tests covering catalog endpoints.
- Explicitly Out of Scope:
  - Do NOT allow filtering by BPM in query parameters (BPM is display-only).
  - Do NOT implement administrative track creation, update, or deletion endpoints (deferred to Phase 2 Admin Panel).
  - Do NOT include licensing, pricing calculations, or checkout endpoints (deferred to Phase 2).
  - Do NOT reference `reserved_by_order_id` in queries or responses.

## 4. Definition of Done
- [ ] `GET /api/tracks` returns HTTP 200 with paginated published tracks (`items`, `total`, `page`, `totalPages`).
- [ ] Non-published tracks (`draft`, `archived`) are excluded from all catalog queries.
- [ ] Keyword search evaluates both `title` and `description` case-insensitively.
- [ ] Genre and mood filter query parameters correctly narrow the result set.
- [ ] `GET /api/tracks/[slug]` returns the matching published track or HTTP 404.
- [ ] `GET /api/filters` returns sorted, deduplicated lists of active genres and moods.
- [ ] `bpm` is returned in track objects, but passing `bpm` as a filter parameter has no filtering effect.
- [ ] `original_file_key` is never present in any JSON response.
- [ ] Linter and type-checker pass without errors.

## 5. Required Tests
- [ ] Unit tests for query parsing, pagination defaults, and response serialization logic.
- [ ] Integration test on a test database:
  - Verify `GET /api/tracks` excludes tracks with status other than `'published'`.
  - Verify keyword search filters correctly across `title` and `description`.
  - Verify filtering by `genre` and `mood`.
  - Verify `GET /api/tracks/[slug]` returns 200 for published tracks and 404 for missing or draft tracks.
  - Verify `GET /api/filters` returns unique genres and moods.
- [ ] Security test: Assert that `original_file_key` is not present in the output of `GET /api/tracks` or `GET /api/tracks/[slug]`.
