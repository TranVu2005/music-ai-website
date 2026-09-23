# Task 004b: Accent-Insensitive Catalog Search

## 1. Objectives
- Make the `q` keyword search on `GET /api/tracks` match regardless of Vietnamese diacritics and case, so a plain-ASCII query like `dem dong` matches a title like `"Đêm Đông Hà Nội"`.
- Normalize `đ`/`Đ` to `d` in addition to standard diacritic stripping (Vietnamese `đ` is not a combining-mark variant of `d` in Unicode and needs an explicit mapping).
- Preserve every existing Task 004 behavior: pagination, `genre`/`mood` exact-match filtering, `bpm` non-filterability, wildcard escaping, visibility rules (`published` only), and the response/error envelope shapes.

## 2. Prerequisites (link docs)
- [Requirements](../requirements/requirements.md)
- [Architecture Overview](../architecture/overview.md)
- [Database Schema](../architecture/database-schema.md)
- [Task 004: Catalog REST API Handlers](./004-catalog-api.md)
- [Task 004 Implementation Plan](../plans/004-catalog-api.md)
- [AGENTS.md](../../AGENTS.md)

## 3. Scope
- Components, directories, and files within task scope:
  - Allowed modifications: `src/db/schema.prisma` (add a `searchText` column on `Track`), a new Prisma migration under `src/db/migrations/`, `src/db/seed.ts` (populate `searchText` on seed), `src/app/api/tracks/route.ts` (normalize `q` and query against `searchText`), `src/lib/api/serialization.ts` (exclude `searchText` from `TRACK_PUBLIC_SELECT`/`FORBIDDEN_KEYS` as an internal-only column), `test/api/catalog.test.ts` (remove `.fails`, extend search test cases).
- Explicitly Out of Scope:
  - Do not modify `/api/tracks/[slug]` or `/api/filters` behavior beyond what's needed to keep `searchText` out of their responses.
  - Do not touch cart, orders, admin, or any Phase 2/3 feature.
  - Do not change `genre`/`mood` matching to be accent-insensitive (out of scope; exact match only, per Task 004).

## 4. Approach
- Add a normalized `searchText` column to `Track` (`schema.prisma`), computed in the application layer from `title` + `description`:
  1. Unicode NFD normalize the concatenated string.
  2. Map `đ`/`Đ` → `d` (must happen before or independently of combining-mark stripping, since `đ` decomposes differently from accented Latin vowels).
  3. Strip combining diacritical marks (`\p{Mn}` range) left by NFD decomposition.
  4. Lowercase the result.
- Backfill `searchText` for existing rows via the migration (a `UPDATE` statement or a follow-up data-migration script), and keep it in sync on every track write path and in `src/db/seed.ts`.
- Add a `pg_trgm` GIN index on `searchText` (`CREATE EXTENSION IF NOT EXISTS pg_trgm;` + `CREATE INDEX ... USING gin (search_text gin_trgm_ops);`) to keep substring search performant at catalog scale.
- In `GET /api/tracks`, apply the same normalization function to the incoming `q` parameter before matching it against `searchText` with `contains`.
- `searchText` is an internal-only column: never add it to `TRACK_PUBLIC_SELECT`, and add it to `FORBIDDEN_KEYS` in `src/lib/api/serialization.ts` as defense-in-depth.

## 5. Definition of Done
- [ ] `searchText` column exists on `Track`, computed and kept in sync on write and in the seed script.
- [ ] `pg_trgm` GIN index created on `searchText`.
- [ ] `q` normalization applied identically to stored `searchText` and incoming query input.
- [ ] `searchText` never appears in any API response (list, detail, or error).
- [ ] The `it.fails` test in `test/api/catalog.test.ts` (added in Task 004 as a tracked known gap) is converted back to a passing `it`.
- [ ] Linter and type-checker pass without errors.

## 6. Required Tests
- Unit tests: the normalization function — diacritic stripping, `đ/Đ → d` mapping, lowercasing, idempotency on already-normalized input.
- Integration tests (`test/api/catalog.test.ts`), replacing the current `it.fails`:
  - [ ] `q=dem dong` matches `"Đêm Đông Hà Nội"`.
  - [ ] `q=DEM DONG` matches the same track (case-insensitive).
  - [ ] `q=Đêm` (partial, with diacritics) matches the same track.
  - [ ] `q=dem` (partial, no diacritics) matches the same track.
  - [ ] A clearly non-matching query (e.g. `q=xyz-no-match`) returns `items: []`.
  - [ ] `searchText` is absent from every response payload (extend the existing forbidden-keys security assertion).
  - [ ] Existing Task 004 pagination, filter, wildcard-escaping, and visibility tests still pass unmodified.
