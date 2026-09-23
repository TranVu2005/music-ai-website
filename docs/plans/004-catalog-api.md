# Task 004: Catalog REST API Handlers Implementation Plan

> Status: Approved with changes on 2026-09-23 by Lead review.

## 1. Files

### Files to Create
- `docs/plans/004-catalog-api.md` — Implementation plan document committed first before code changes.
- `src/app/api/tracks/route.ts` — Route Handler for `GET /api/tracks` (paginated published track catalog with `q`, `genre`, `mood` filters, stable ordering, and `bpm` parameter ignored).
- `src/app/api/tracks/[slug]/route.ts` — Route Handler for `GET /api/tracks/[slug]` (single published track detail; Next.js 16 dynamic route handling where `params` is a `Promise<{ slug: string }>`).
- `src/app/api/filters/route.ts` — Route Handler for `GET /api/filters` (returns sorted, deduplicated active genres and moods from published tracks).
- `src/lib/api/serialization.ts` — Prisma client singleton, public track field allowlist (`TRACK_PUBLIC_SELECT`), response sanitization helpers (asserting zero exposure of `original_file_key`, `status`, `reserved_until`), and standardized error response constructor.
- `test/api/catalog.test.ts` — Comprehensive Vitest test suite executing Route Handlers directly via `new Request(url)`, with strict DB test guards, fixture cleanup (`test-004-*` slug prefix), recursive security assertions, wildcard search tests, pagination tests, and filter tests.

### Files to Modify
- `docs/status.md` — Update Task 004 status row to "In review (PR #11)", update header, and add §7 follow-up: `"Catalog search is accent-sensitive; candidate task: Postgres unaccent."`.
- `CHANGELOG.md` — Add dated changelog entry for Task 004.

### Files to Delete
- None.

---

## 2. API Design & Specification

### 2.1. `GET /api/tracks`

#### Purpose
Retrieve a paginated list of published music tracks, supporting keyword search across title and description, categorical filtering by genre and mood, and informational BPM metadata.

#### Dynamic Handler Isolation
```typescript
export const dynamic = "force-dynamic";
```
Enforces runtime-only execution so `next build` does not attempt static prerendering or trigger database queries during compilation.

#### Query Parameters & Validation Behavior

| Parameter | Type | Default | Constraints | Behavior on Invalid Input |
|---|---|---|---|---|
| `page` | integer | `1` | `1 <= page <= 10000` | Non-integer (e.g. `page=abc`, `page=1.5`), `<= 0` (e.g. `page=0`, `page=-5`), or `> MAX_PAGE` (`10000`, e.g. `page=10001`, `page=99999999999`) returns **HTTP 400 Bad Request** (`{"error":{"code":"BAD_REQUEST","message":"Invalid 'page' parameter: must be <= 10000"}}`). Prevents Int32 overflow on Prisma `skip`.<br>If `page > totalPages` (valid integer `<= 10000` but beyond item count), returns **HTTP 200 OK** with `items: []`, `total: N`, `page: P`, `limit: L`, `totalPages: T`. |
| `limit` | integer | `10` | `1 <= limit <= 50` | Non-integer (e.g. `limit=abc`) or `<= 0` (e.g. `limit=0`, `limit=-10`) returns **HTTP 400 Bad Request** (`{"error":{"code":"BAD_REQUEST","message":"Invalid 'limit' parameter: must be a positive integer"}}`).<br>`limit > 50` (e.g. `limit=1000`) is **clamped to 50** (`limit = Math.min(parsedLimit, 50)`), returning **HTTP 200 OK** with at most 50 items and `limit: 50` in the pagination envelope. |
| `q` | string | `""` | trimmed string | Trimmed string (`q.trim()`). If empty after trimming or omitted, **no keyword filter** is applied.<br>If non-empty, searches case-insensitively across both `title` and `description` via `contains` with `mode: 'insensitive'`.<br>SQL wildcards (`%`, `_`) and escape characters (`\`) are escaped (`replace(/([%_\\])/g, "\\$1")`) before passing to Prisma so `q=%` or `q=_` searches literally and does not match all records.<br>Per Constraint 8, Vietnamese search is accent-sensitive (`"ha noi"` does not match `"Hà Nội"`). |
| `genre` | string | `""` | trimmed string | Exact string match against `tracks.genre`. If empty or omitted, ignored.<br>If an unknown genre is supplied (e.g. `genre=NonExistentGenre`), returns **HTTP 200 OK** with empty result (`items: []`, `total: 0`, `page: 1`, `totalPages: 0`), NOT 400. |
| `mood` | string | `""` | trimmed string | Exact string match against `tracks.mood`. If empty or omitted, ignored.<br>If an unknown mood is supplied (e.g. `mood=NonExistentMood`), returns **HTTP 200 OK** with empty result (`items: []`, `total: 0`, `page: 1`, `totalPages: 0`), NOT 400. |
| `bpm` | any | N/A | informational only | **Completely ignored** in the query string (Constraint 3). No BPM filter code path exists; passing `?bpm=78` produces no filtering effect and does not return 400. |

#### Ordering Strategy
Pagination order is strictly deterministic:
```typescript
orderBy: [
  { createdAt: "desc" },
  { id: "asc" }
]
```
`createdAt` descending orders tracks newest first. `id` ascending acts as the deterministic tiebreaker, preventing items from shifting between pages when multiple tracks share identical timestamps (e.g. during initial batch seeding).

#### Visibility Constraint
Queries strictly include:
```typescript
where: {
  status: "published",
  // additional filters for q, genre, mood
}
```
Any track with status `draft`, `archived`, `reserved`, or `sold_exclusive` is 100% excluded.

#### Response Envelope Shape (HTTP 200)
```json
{
  "items": [
    {
      "id": "c7a840e6-5c56-42b7-9ce4-e0ebae1f4e12",
      "title": "Nắng Sài Gòn",
      "slug": "nang-sai-gon",
      "description": "Tiết tấu tươi vui, tràn đầy năng lượng tích cực kết hợp giữa piano và guitar rộn rã.",
      "genre": "Pop Acoustic",
      "mood": "Uplifting",
      "bpm": 112,
      "durationSeconds": 184,
      "previewFileUrl": "/audio/previews/nang-sai-gon.mp3",
      "coverImageUrl": null,
      "createdAt": "2026-09-23T07:00:00.000Z",
      "updatedAt": "2026-09-23T07:00:00.000Z"
    }
  ],
  "total": 5,
  "page": 1,
  "limit": 10,
  "totalPages": 1
}
```
Formula for `totalPages`: `total === 0 ? 0 : Math.ceil(total / limit)`.

---

### 2.2. `GET /api/tracks/[slug]`

#### Purpose
Retrieve complete public metadata for a single published track identified by its unique slug.

#### Dynamic Handler Isolation & Next.js 16 Parameter Handling
```typescript
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  const { slug } = await context.params;
  ...
}
```
Next.js 16 defines `params` as a `Promise` in Route Handlers; awaiting `context.params` ensures full forward-compatibility and prevents runtime type errors.

#### Visibility & 404 Conditions
The query strictly looks up:
```typescript
where: {
  slug: slug,
  status: "published"
}
```
If no track matches `slug`, OR if the track exists with any non-published status (`draft`, `archived`, `reserved`, `sold_exclusive`), the endpoint returns **HTTP 404 Not Found**:
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Track not found"
  }
}
```

#### Successful Response Shape (HTTP 200)
Returns the track object directly matching the public allowlist:
```json
{
  "id": "c7a840e6-5c56-42b7-9ce4-e0ebae1f4e12",
  "title": "Nắng Sài Gòn",
  "slug": "nang-sai-gon",
  "description": "Tiết tấu tươi vui, tràn đầy năng lượng tích cực kết hợp giữa piano và guitar rộn rã.",
  "genre": "Pop Acoustic",
  "mood": "Uplifting",
  "bpm": 112,
  "durationSeconds": 184,
  "previewFileUrl": "/audio/previews/nang-sai-gon.mp3",
  "coverImageUrl": null,
  "createdAt": "2026-09-23T07:00:00.000Z",
  "updatedAt": "2026-09-23T07:00:00.000Z"
}
```

---

### 2.3. `GET /api/filters`

#### Purpose
Provide distinct, alphabetically sorted lists of genres and moods currently used by published tracks to dynamically populate UI filter dropdowns and chips.

#### Dynamic Handler Isolation
```typescript
export const dynamic = "force-dynamic";
```

#### Query & Deduplication Logic
Queries the database for distinct published tracks:
```typescript
const [genresResult, moodsResult] = await Promise.all([
  prisma.track.findMany({
    where: { status: "published" },
    select: { genre: true },
    distinct: ["genre"],
    orderBy: { genre: "asc" },
  }),
  prisma.track.findMany({
    where: { status: "published" },
    select: { mood: true },
    distinct: ["mood"],
    orderBy: { mood: "asc" },
  }),
]);
```
Results are mapped to flat string arrays and sorted:
- `genres`: `string[]`
- `moods`: `string[]`

#### Response Shape (HTTP 200)
```json
{
  "genres": [
    "Cinematic Ambient",
    "Electronic Future Bass",
    "Lo-fi Chill",
    "Pop Acoustic",
    "Traditional Fusion"
  ],
  "moods": [
    "Energetic",
    "Melancholic",
    "Peaceful",
    "Relaxing",
    "Uplifting"
  ]
}
```

---

### 2.4. Standardized Error Response Format

All error responses across all catalog endpoints return a consistent JSON schema:
```json
{
  "error": {
    "code": "BAD_REQUEST" | "NOT_FOUND" | "INTERNAL_SERVER_ERROR",
    "message": "Human-readable English description"
  }
}
```

#### Security & Information Leak Prevention
- Handlers wrap database operations in `try ... catch`.
- In case of unexpected server or database errors, the server logs details to `console.error("[API Error]", error)`.
- Client response strictly returns HTTP 500:
  ```json
  {
    "error": {
      "code": "INTERNAL_SERVER_ERROR",
      "message": "An unexpected error occurred"
    }
  }
  ```
- **Zero leakage**: Prisma error codes (e.g. `P2002`, `P2025`), database column names, raw SQL fragments, and stack traces are never emitted to the client.

---

## 3. Data Protection & Serialization Allowlist

### 3.1. Explicit Field Allowlist (`TRACK_PUBLIC_SELECT`)

To ensure sensitive operational columns are never retrieved from the database, all Prisma track queries apply an explicit field selection allowlist defined in `src/lib/api/serialization.ts`:

```typescript
export const TRACK_PUBLIC_SELECT = {
  id: true,
  title: true,
  slug: true,
  description: true,
  genre: true,
  mood: true,
  bpm: true,
  durationSeconds: true,
  previewFileUrl: true,
  coverImageUrl: true,
  createdAt: true,
  updatedAt: true,
} as const;
```

#### Fields Permitted (12 fields)
1. `id` (String UUID)
2. `title` (String)
3. `slug` (String)
4. `description` (String | null)
5. `genre` (String)
6. `mood` (String)
7. `bpm` (Int | null) — informational display metadata
8. `durationSeconds` (Int)
9. `previewFileUrl` (String) — watermarked preview audio path
10. `coverImageUrl` (String | null)
11. `createdAt` (DateTime / ISO string)
12. `updatedAt` (DateTime / ISO string)

#### Fields Strictly Prohibited (Never Selected)
- `originalFileKey` (`original_file_key`) — Lossless master audio location.
- `status` — Internal lifecycle status (`draft`, `published`, `reserved`, etc.).
- `reservedUntil` (`reserved_until`) — Hold timestamp for exclusive transactions.
- `reserved_by_order_id` — Reserved order reference (omitted from Phase 1 schema).

### 3.2. Secondary Serialization & Sanitization Guard

In `src/lib/api/serialization.ts`, a defense-in-depth sanitization helper `sanitizeTrack(track: unknown)` validates and strips any forbidden keys before constructing `NextResponse.json(...)`:
```typescript
const FORBIDDEN_KEYS = new Set([
  "originalFileKey",
  "original_file_key",
  "status",
  "reservedUntil",
  "reserved_until",
  "reservedByOrderId",
  "reserved_by_order_id",
]);
```
If any forbidden key is detected during response serialization, the helper strips it and issues a development warning, guaranteeing two layers of protection (query-level allowlist + serialization-level sanitization).

---

## 4. Architecture & Scope Boundary

### 4.1. Prisma Client Singleton Location
To adhere strictly to Task 004 Scope (`src/lib/api/serialization.ts` is in scope; no extra `src/lib/prisma.ts` file is added outside scope), the global Prisma Client singleton is exported directly from `src/lib/api/serialization.ts`:
```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```
This avoids creating an unapproved out-of-scope file while guaranteeing connection reuse in development.

---

## 5. Test Isolation & Coverage Strategy

### 5.1. Database Guard Pattern
Tests in `test/api/catalog.test.ts` implement the identical environment guard established in `test/db/seed.test.ts`:
```typescript
if (!process.env.DATABASE_URL) {
  if (process.env.CI === "true") {
    throw new Error(
      "DATABASE_URL is missing in CI environment. Database tests must not be skipped in CI."
    );
  }
}

const describeDb = process.env.DATABASE_URL ? describe : describe.skip;
```

### 5.2. Test Fixture Isolation & Non-Interference
- `test/db/seed.test.ts` asserts that exactly 5 tracks exist in the database.
- Any temporary fixture inserted in `test/api/catalog.test.ts` (e.g. unpublished draft track, archived track, special character track) MUST prefix its slug with:
  `test-004-` (e.g. `test-004-draft-track`, `test-004-archived-track`, `test-004-percent-%`).
- `beforeAll`, `afterEach`, and `afterAll` hooks in `test/api/catalog.test.ts` execute:
  ```typescript
  await prisma.track.deleteMany({
    where: { slug: { startsWith: "test-004-" } },
  });
  ```
- The 5 baseline seeded tracks (`dem-dong-ha-noi`, `nang-sai-gon`, `khoang-lang-tay-nguyen`, `nhip-song-pho-thi`, `hoang-hon-song-huong`) are never modified or deleted.
- Result: `test/db/seed.test.ts` and `test/api/catalog.test.ts` pass reliably in any execution order.

### 5.3. Handler Invocation Method
Route Handlers are tested by directly calling the exported `GET` functions:
```typescript
import { GET as getTracks } from "../../src/app/api/tracks/route";
import { GET as getTrackBySlug } from "../../src/app/api/tracks/[slug]/route";
import { GET as getFilters } from "../../src/app/api/filters/route";

const req = new Request("http://localhost:3000/api/tracks?page=1&limit=10");
const res = await getTracks(req);
```
No background server (`next dev` or `next start`) is required during test runs.

### 5.4. Required Test Cases

1. **`GET /api/tracks` Pagination & Sorting**:
   - Default pagination (`page=1&limit=10`): returns 5 seeded tracks, `total: 5`, `totalPages: 1`.
   - Custom pagination (`page=2&limit=2`): returns 2 items with proper offset.
   - Ordering check: returns items ordered by `createdAt desc, id asc`.
   - Clamping `limit > 50` (`limit=1000`): returns HTTP 200 with at most 50 items and `limit: 50`.
   - Invalid `page` (`page=abc`, `page=0`, `page=-1`): returns HTTP 400 Bad Request.
   - Page overflow beyond `MAX_PAGE` (`page=10001`, `page=99999999999`): returns HTTP 400 Bad Request (prevents Prisma Int32 skip overflow).
   - Invalid `limit` (`limit=abc`, `limit=0`, `limit=-5`): returns HTTP 400 Bad Request.
   - Page out of bounds (`page=999`): returns HTTP 200 with `items: []`, `total: 5`, `totalPages: 1`.

2. **`GET /api/tracks` Search & Filtering**:
   - Status filtering: creates temporary `test-004-draft` track; verifies it is NOT returned in `/api/tracks`.
   - Keyword search `q`: `q=sai gon` matches `"Nắng Sài Gòn"`.
   - Case-insensitivity: `q=SAI GON` matches `"Nắng Sài Gòn"`.
   - Description search: searches keyword present only in description.
   - Empty `q`: `q=""` or `q="   "` returns all published tracks.
   - Wildcard literal matching: `q=%` and `q=_` do NOT match everything (verifies SQL wildcards are escaped).
   - Genre filter: `genre=Lo-fi Chill` returns matching tracks.
   - Mood filter: `mood=Melancholic` returns matching tracks.
   - Unknown genre/mood: returns HTTP 200 with `items: []`.
   - BPM parameter ignored: `?bpm=78` returns all published tracks (identical count to no-filter request).

3. **`GET /api/tracks/[slug]` Retrieval**:
   - Published track: `GET /api/tracks/nang-sai-gon` returns HTTP 200 with matching track object.
   - Non-existent slug: `GET /api/tracks/does-not-exist` returns HTTP 404 Not Found with error envelope.
   - Unpublished track: creates temporary `test-004-draft` track; `GET /api/tracks/test-004-draft` returns HTTP 404 Not Found.

4. **`GET /api/filters` Query**:
   - Returns HTTP 200 with `{ genres: string[], moods: string[] }`.
   - Verifies genres and moods are deduplicated and alphabetically sorted.
   - Verifies only published tracks contribute to filters (unpublished fixture genres/moods do not appear).

5. **Security Test (Forbidden Keys)**:
   - Recursive inspection helper traverses all response JSON objects/arrays.
   - Asserts that none of `originalFileKey`, `original_file_key`, `status`, `reservedUntil`, `reserved_until`, `reservedByOrderId`, `reserved_by_order_id` exist anywhere in `/api/tracks`, `/api/tracks/[slug]`, or `/api/filters`.

---

## 6. Deviations & Out of Scope

- **Vietnamese Accent-Insensitive Search**: Per Constraint 8, accent-insensitive search (`"ha noi"` vs `"Hà Nội"`) is NOT implemented in Task 004. Added to `docs/status.md` §7 as a candidate task (`"Catalog search is accent-sensitive; candidate task: Postgres unaccent."`).
- **BPM Filtering**: Per Constraint 3 and architecture specs, BPM is display-only reference metadata and is never filterable.
- **Admin / Modification Endpoints**: Creating, editing, or deleting tracks is deferred to Phase 2 Admin Panel.
- **Checkout & Licensing**: Cart and orders endpoints are deferred to Phase 2.

---

## 7. Risks & Open Questions

1. **Prisma ILIKE Wildcard Escaping**:
   In PostgreSQL, Prisma's `contains: query, mode: 'insensitive'` translates to `ILIKE '%query%'`. If `query` contains `%` or `_`, PostgreSQL interprets them as pattern wildcards unless escaped with backslash `\`. Escaping `%` as `\%` and `_` as `\_` ensures literal character matching without full-table wildcard expansion.
2. **Next.js 16 Dynamic Route Context**:
   Next.js 16 treats `params` as a `Promise`. The handler implementation must `await context.params` to prevent type check failures and runtime issues.
3. **Limit Clamping Strategy**:
   The plan proposes clamping `limit > 50` to `50` (returning HTTP 200 with `limit: 50`) rather than returning HTTP 400. This is client-friendly and protects the server against large result sets. Invalid types (`limit=abc`, `limit=-1`) return HTTP 400.
