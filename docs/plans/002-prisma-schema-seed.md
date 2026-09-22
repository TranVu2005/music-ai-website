# Task 002: Prisma Schema and Database Seed Implementation Plan

> Status: Approved with changes on 2026-09-23 by Lead review.

## 1. Files

### Files to Create
- `docs/plans/002-prisma-schema-seed.md` — Approved implementation plan committed first.
- `src/db/migrations/<timestamp>_init_phase1_schema/migration.sql` — Migration 1 generated via `prisma migrate dev --name init_phase1_schema` containing DDL for enums, 3 tables (`users`, `tracks`, `custom_requests`), and 7 secondary indexes plus unique constraints.
- `src/db/seed.ts` — Idempotent database seed script populating 5 sample tracks via `prisma.track.upsert`.
- `public/audio/previews/dem-dong-ha-noi.mp3` — Silent placeholder MP3 for sample track 1 (<100 KB).
- `public/audio/previews/nang-sai-gon.mp3` — Silent placeholder MP3 for sample track 2 (<100 KB).
- `public/audio/previews/khoang-lang-tay-nguyen.mp3` — Silent placeholder MP3 for sample track 3 (<100 KB).
- `public/audio/previews/nhip-song-pho-thi.mp3` — Silent placeholder MP3 for sample track 4 (<100 KB).
- `public/audio/previews/hoang-hon-song-huong.mp3` — Silent placeholder MP3 for sample track 5 (<100 KB).
- `test/db/migration.test.ts` — Vitest database integration test querying `information_schema` / `pg_indexes` for table existence, absence of `reserved_by_order_id`, enums, column defaults, and indexes.
- `test/db/seed.test.ts` — Vitest database integration test executing seed twice to verify idempotency, 5 tracks count, file existence in `public/`, and stable `id` / `created_at`.

### Files to Modify
- `src/db/schema.prisma` — Define `Role`, `TrackStatus`, `CustomRequestStatus` enums and `User`, `Track`, `CustomRequest` models with camelCase fields, `@map` / `@@map`, `@db.Uuid`, `@db.Timestamptz(6)`, and `@default(now()) @updatedAt`.
- `package.json` — Add `"tsx": "4.19.3"` to `devDependencies`; configure `"prisma": { "schema": "src/db/schema.prisma", "seed": "tsx src/db/seed.ts" }`; add script `"db:seed": "prisma db seed"`.
- `package-lock.json` — Pinned dependency lockfile updated by npm.
- `.github/workflows/ci.yml` — In `checks` job, run `npm run db:seed` after `npm run db:migrate:deploy`, and run `npm run test` with `DATABASE_URL` and `DIRECT_URL` active.
- `docs/status.md` — Update Task 002 to "In review (PR #N)", Task 001 to "Done (PR #7)", update header date/PR, and record follow-ups.
- `README.md` — Add database instructions for `npm run db:seed` and document the FFmpeg command used to generate placeholder previews.
- `CHANGELOG.md` — Add dated release entry for Task 002.

### Files to Delete
- None.

---

## 2. Schema

### Enums

- **`Role`** (`@@map("role")`):
  - Values: `admin`, `customer`
- **`TrackStatus`** (`@@map("track_status")`):
  - Values: `draft`, `published`, `reserved`, `sold_exclusive`, `archived`
- **`CustomRequestStatus`** (`@@map("custom_request_status")`):
  - Values: `submitted`, `quoted`, `deposit_pending`, `in_progress`, `demo_sent`, `revising`, `approved`, `completed`, `cancelled`

### Models

1. **`User`** (`@@map("users")`):
   - `id`: `String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid`
   - `email`: `String @unique @db.VarChar`
   - `passwordHash`: `String @map("password_hash") @db.VarChar`
   - `fullName`: `String @map("full_name") @db.VarChar`
   - `phoneNumber`: `String? @map("phone_number") @db.VarChar`
   - `role`: `Role @default(customer)`
   - `createdAt`: `DateTime @default(now()) @map("created_at") @db.Timestamptz(6)`
   - `updatedAt`: `DateTime @default(now()) @updatedAt @map("updated_at") @db.Timestamptz(6)`
   - Relations: `customRequests CustomRequest[]`

2. **`Track`** (`@@map("tracks")`):
   - `id`: `String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid`
   - `title`: `String @db.VarChar`
   - `slug`: `String @unique @db.VarChar`
   - `description`: `String? @db.Text`
   - `genre`: `String @db.VarChar`
   - `mood`: `String @db.VarChar`
   - `bpm`: `Int?`
   - `durationSeconds`: `Int @map("duration_seconds")`
   - `previewFileUrl`: `String @map("preview_file_url") @db.VarChar`
   - `originalFileKey`: `String? @map("original_file_key") @db.VarChar`
   - `coverImageUrl`: `String? @map("cover_image_url") @db.VarChar`
   - `status`: `TrackStatus @default(draft)`
   - `reservedUntil`: `DateTime? @map("reserved_until") @db.Timestamptz(6)`
   - `createdAt`: `DateTime @default(now()) @map("created_at") @db.Timestamptz(6)`
   - `updatedAt`: `DateTime @default(now()) @updatedAt @map("updated_at") @db.Timestamptz(6)`
   - *Explicitly omitted per Lead Decision 2*: `reserved_by_order_id`
   - Indexes (4):
     - `@@index([status])`
     - `@@index([genre])`
     - `@@index([mood])`
     - `@@index([createdAt])`

3. **`CustomRequest`** (`@@map("custom_requests")`):
   - `id`: `String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid`
   - `userId`: `String? @map("user_id") @db.Uuid`
   - `user`: `User? @relation(fields: [userId], references: [id])`
   - `customerName`: `String @map("customer_name") @db.VarChar`
   - `customerEmail`: `String @map("customer_email") @db.VarChar`
   - `customerPhone`: `String? @map("customer_phone") @db.VarChar`
   - `briefDescription`: `String @map("brief_description") @db.Text`
   - `referenceLinks`: `String? @map("reference_links") @db.Text`
   - `genrePreference`: `String? @map("genre_preference") @db.VarChar`
   - `targetDuration`: `String? @map("target_duration") @db.VarChar`
   - `budgetEstimate`: `BigInt? @map("budget_estimate")`
   - `quotedPrice`: `BigInt? @map("quoted_price")`
   - `depositPercent`: `Int? @map("deposit_percent")`
   - `depositAmount`: `BigInt? @map("deposit_amount")`
   - `remainingAmount`: `BigInt? @map("remaining_amount")`
   - `status`: `CustomRequestStatus @default(submitted)`
   - `finalFileKey`: `String? @map("final_file_key") @db.VarChar`
   - `revisionLimit`: `Int @default(2) @map("revision_limit")`
   - `revisionUsed`: `Int @default(0) @map("revision_used")`
   - `notes`: `String? @db.Text`
   - `createdAt`: `DateTime @default(now()) @map("created_at") @db.Timestamptz(6)`
   - `updatedAt`: `DateTime @default(now()) @updatedAt @map("updated_at") @db.Timestamptz(6)`
   - Indexes (3):
     - `@@index([status])`
     - `@@index([createdAt])`
     - `@@index([userId])`

Total secondary index count across the migration: 7 (4 on `tracks` + 3 on `custom_requests`), plus 2 unique constraints/indexes (`users.email`, `tracks.slug`).

---

## 3. Phase 2 Compatibility

- `orders`: A new Phase 2 migration will create the `orders` table independently (with its primary key `id`, `order_code`, VND amounts, and token hashes) without altering Task 002 tables.
- `reserved_by_order_id`: A Phase 2 migration will execute `ALTER TABLE tracks ADD COLUMN reserved_by_order_id UUID REFERENCES orders(id) ON DELETE SET NULL;` to attach the exclusive hold relation cleanly.
- `licenses`: A Phase 2 migration will create the `licenses` table with `track_id UUID NOT NULL REFERENCES tracks(id) ON DELETE RESTRICT;` linking standard and exclusive pricing tiers to Task 002's `tracks`.
- `order_items`: A Phase 2 migration will create `order_items` with foreign keys referencing `orders(id)` (`ON DELETE CASCADE`), `tracks(id)` (`ON DELETE RESTRICT`), and `licenses(id)` (`ON DELETE RESTRICT`).

---

## 4. Seed

### 5 Sample Tracks (`src/db/seed.ts`)
1. `dem-dong-ha-noi`
   - Title: `Đêm Đông Hà Nội`
   - Genre: `Lo-fi Chill` | Mood: `Melancholic` | BPM: 78 | Duration: 145s
   - Description: `Giai điệu guitar mộc mạc và tiếng mưa nhẹ nhàng mang không khí mùa đông Hà Nội hoài niệm.`
2. `nang-sai-gon`
   - Title: `Nắng Sài Gòn`
   - Genre: `Pop Acoustic` | Mood: `Uplifting` | BPM: 112 | Duration: 184s
   - Description: `Tiết tấu tươi vui, tràn đầy năng lượng tích cực kết hợp giữa piano và guitar rộn rã.`
3. `khoang-lang-tay-nguyen`
   - Title: `Khoảng Lặng Tây Nguyên`
   - Genre: `Cinematic Ambient` | Mood: `Peaceful` | BPM: 65 | Duration: 210s
   - Description: `Không gian âm thanh mênh mang, kết hợp tiếng sáo trầm ấm và dàn dây điện ảnh sâu lắng.`
4. `nhip-song-pho-thi`
   - Title: `Nhịp Sống Phố Thị`
   - Genre: `Electronic Future Bass` | Mood: `Energetic` | BPM: 128 | Duration: 160s
   - Description: `Âm bass hiện đại, nhịp điệu dồn dập phù hợp cho video quảng cáo, sự kiện và sáng tạo nội dung.`
5. `hoang-hon-song-huong`
   - Title: `Hoàng Hôn Sông Hương`
   - Genre: `Traditional Fusion` | Mood: `Relaxing` | BPM: 85 | Duration: 195s
   - Description: `Sự kết hợp tinh tế giữa đàn tranh truyền thống và nền nhạc lofi hiện đại êm dịu.`

All 5 tracks set `status: 'published'`, `preview_file_url: "/audio/previews/<slug>.mp3"`, and `original_file_key: null`.

### FFmpeg Placeholder Generation
Generated via the command:
```bash
ffmpeg -f lavfi -i anullsrc=r=44100:cl=stereo -t 5 -b:a 64k public/audio/previews/<slug>.mp3
```
Produces 5-second 64 kbps stereo silent MP3s (<100 KB each). If FFmpeg CLI is unavailable on the host, generation executes inside the project Docker container (`build/deploy/Dockerfile`). Documented in `README.md`.

---

## 5. Tests

### Vitest CI and Skip Logic
```typescript
if (!process.env.DATABASE_URL) {
  if (process.env.CI === "true") {
    throw new Error("DATABASE_URL is missing in CI environment. Database tests must not be skipped in CI.");
  }
}
const describeDb = process.env.DATABASE_URL ? describe : describe.skip;
```

### Test Assertions
- `test/db/migration.test.ts`:
  - Asserts via `information_schema.tables` that exactly `users`, `tracks`, and `custom_requests` tables exist in `public` schema.
  - Asserts via `information_schema.columns` that `tracks` contains NO `reserved_by_order_id` column.
  - Asserts that all timestamp columns are of data type `timestamp with time zone`.
  - Asserts that `updated_at` on all three tables has a default of `CURRENT_TIMESTAMP` / `now()` via `information_schema.columns.column_default`.
  - Asserts via `pg_indexes` that `users.email` and `tracks.slug` have unique constraints/indexes.
  - Asserts via `pg_type` and `pg_enum` that `role`, `track_status`, and `custom_request_status` exist with their exact lowercase enum values.
  - Asserts via `pg_indexes` that exactly the 7 secondary indexes and 2 unique indexes exist.
- `test/db/seed.test.ts`:
  - Runs the seed script twice sequentially.
  - Asserts exactly 5 tracks exist, all with `status = 'published'`, matching preview URLs, and `original_file_key = null`.
  - Asserts that each seeded `preview_file_url` resolves to an existing file in `public/audio/previews/` via `fs.existsSync`.
  - Asserts each track's `id` and `created_at` are strictly unchanged after the second run (proving non-destructive upsert).
- Existing Task 001 Tests:
  - `health.test.ts`, `config.test.ts`, and `check-audio.test.ts` remain untouched and green.

---

## 6. Deviations

**None.** All 10 Lead decisions, schema rules, and review changes are followed exactly.

---

## 7. Risks / Open Questions

1. **Local Docker daemon requirement**: Generating the migration (`prisma migrate dev`) requires PostgreSQL running via `docker compose -f build/deploy/docker-compose.yml up -d postgres`.
2. **FFmpeg execution environment**: If FFmpeg is unavailable on Windows host PATH, placeholder MP3s are generated inside the Docker container.
3. **CI pipeline execution order**: In `.github/workflows/ci.yml`, `npm run test` executes after `npm run db:migrate:deploy` and `npm run db:seed`.
4. **Prisma 6 seed deprecation notice**: `prisma db seed` using `package.json#prisma.seed` emits a deprecation warning advising migration to `prisma.config.ts` in Prisma 7; this is documented in `README.md` and accepted.
5. **No `pgcrypto` needed**: Postgres 16 includes `gen_random_uuid()` natively.
