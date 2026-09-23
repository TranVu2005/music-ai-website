# music-shop

Specialized e-commerce website for selling pre-composed music tracks (supporting watermarked audio streaming previews, VietQR payment with manual owner confirmation, and secure timed master file delivery) and managing commissioned custom composition requests.

## Directory Structure

```text
music-shop/
├── .env.example                        # Environment variable configuration template
├── .github/
│   └── workflows/
│       └── ci.yml                      # Automated CI workflow for testing and build verification
├── assets/                             # Static project assets and development audio
│   └── watermark/                      # Voice-tag audio watermark samples for previews
├── design/                             # Static HTML and Tailwind CSS UI/UX prototypes
├── docs/                               # Project documentation following docs-first methodology
│   ├── requirements/                   # Functional and non-functional requirements
│   │   └── requirements.md             # Detailed requirements specification
│   ├── architecture/                   # Technical architecture specifications
│   │   ├── overview.md                 # System architecture overview & modules
│   │   ├── database-schema.md          # Database tables and column definitions
│   │   ├── payment-flow.md             # VietQR payment, deadlock avoidance & manual confirmation flow
│   │   └── file-protection.md          # Master audio protection & watermarked preview delivery
│   ├── decisions/                      # Architectural decision records (ADRs)
│   │   └── hosting.md                  # Hosting strategy for Phase 1 demo and Phase 2 production
│   └── tasks/                          # Task-based implementation work packages
│       ├── _template.md                # Standardized task documentation template
│       └── 001-project-setup.md        # Monorepo setup task with Next.js & Vitest
├── public/                             # Public static web assets
│   └── audio/
│       └── previews/                   # Low-bitrate watermarked MP3 previews for web streaming
├── src/                                # Application source code (Next.js Monolith)
│   ├── app/                            # Next.js App Router pages and components
│   │   └── api/                        # Route Handlers for RESTful API endpoints
│   └── db/                             # Database access layer (Prisma ORM)
│       └── migrations/                 # PostgreSQL database migration scripts
├── test/                               # Automated test suites (Unit, Integration, E2E via Vitest)
├── build/deploy/                       # Container packaging and local service configuration
│   ├── Dockerfile                      # Multi-stage container build definition
│   └── docker-compose.yml              # Local development container orchestration (PostgreSQL)
└── tools/                              # Development scripts and CLI utility tools
```

## Development Principles (Docs-First)

The project strictly follows a **Docs-First** methodology:
1. Before writing code, developers and AI assistants must review specifications in `docs/architecture/` and the assigned task in `docs/tasks/`.
2. Detailed guidelines and testing requirements are defined in [AGENTS.md](./AGENTS.md).

## Quick Start

1. Install project dependencies:
   ```bash
   npm ci
   ```
2. Copy the environment configuration template:
   ```bash
   cp .env.example .env
   ```
3. Start the local PostgreSQL database service:
   ```bash
   docker compose -f build/deploy/docker-compose.yml up -d postgres
   ```
4. Deploy migrations / initialize database tracking:
   ```bash
   npm run db:migrate:deploy
   ```
5. Seed sample catalog tracks:
   ```bash
   npm run db:seed
   ```
6. Start local development server:
   ```bash
   npm run dev
   ```

## Database

### Prisma ORM Configuration

The project manages database schemas and migrations via Prisma ORM:
- **Schema Location**: Located at `src/db/schema.prisma` to keep database configuration and migrations (`src/db/migrations/`) cleanly encapsulated under `src/db/`.
- **Wiring**: Configured via `package.json`:
  ```json
  "prisma": {
    "schema": "src/db/schema.prisma",
    "seed": "tsx src/db/seed.ts"
  }
  ```
- **Connection Separation**:
  - `DATABASE_URL`: Connection string used by the application runtime and Next.js Route Handlers (points to Neon pooled connection pooler in Phase 1 demo or local database).
  - `DIRECT_URL`: Unpooled direct connection string used by Prisma migration engine (`prisma migrate deploy` / `npm run db:migrate:deploy`) to execute schema DDL statements directly without pooler restrictions.
- **Migration & Seeding Workflow**:
  - Deploy pending migrations: `npm run db:migrate:deploy`
  - Generate a new migration in development: `npx prisma migrate dev --name <migration_name>`
  - Seed database: `npm run db:seed` (executes idempotent upsert in `src/db/seed.ts` populating 5 sample tracks with Vietnamese metadata and preview paths; safe to run multiple times without duplicating rows).
- **Audio Preview Placeholders**:
  - Watermarked preview MP3 placeholders reside in `public/audio/previews/<slug>.mp3`.
  - Regenerate sample silent preview MP3 files (<100 KB) using FFmpeg:
    ```bash
    ffmpeg -f lavfi -i anullsrc=r=44100:cl=stereo -t 5 -b:a 64k public/audio/previews/<slug>.mp3
    ```
- **Prisma 6 Deprecation & Prisma 7 Migration Path**:
  In Prisma 6.x, specifying schema and seed location via `package.json#prisma` emits a deprecation warning advising migration to `prisma.config.ts`. In accordance with Lead Decision 1 & 8, `package.json#prisma` is retained for 6.x stability, and can cleanly migrate to `prisma.config.ts` when upgrading to Prisma 7:
  ```typescript
  // prisma.config.ts (Prisma 7 migration path)
  import { defineConfig } from "prisma/config";
  export default defineConfig({
    schema: "src/db/schema.prisma",
  });
  ```
- **Container Parity**:
  The production Dockerfile (`build/deploy/Dockerfile`) mirrors this layout by copying `src/db` before running `npm ci` and copying generated engines from `node_modules/.prisma` and schema definitions from `src/db` into the final standalone runner stage.

## Audio Processing & Preview Generator

### CLI Preview Generation Utility

Uncompressed master audio files are converted into watermarked MP3 streaming previews via the CLI utility script:

```bash
# Ensure MASTERS_DIR points to an external directory outside the repository
export MASTERS_DIR=/var/data/music-shop/masters

# Generate watermarked preview MP3 at public/audio/previews/<slug>.mp3
npm run tools:preview-gen -- <master-file> <slug> [--force]
```

- **Output Encoding**: CBR 128 kbps, 44.1 kHz stereo (`libmp3lame`). Mono masters are automatically upmixed to stereo.
- **Audio Watermarking**: Mixes `assets/watermark/tag.wav` repeatedly every 25 seconds throughout the track, starting at 10 seconds. Tracks shorter than 25 seconds receive at least one centered watermark tag.
- **Volume & Limiting**: The music level is fully preserved (`normalize=0`), the watermark is attenuated by -12 dB, and an audio peak limiter (`alimiter=limit=0.891:level=disabled`) limits pre-encode peaks to -1 dBFS (decoded MP3 may overshoot slightly), preventing digital clipping.
- **Metadata Scrubbing**: Master file metadata tags are scrubbed via `-map_metadata -1`.
- **Atomic File Writing**: Previews are written to temporary files and atomically renamed, ensuring partial MP3s are never committed or left behind.

### Generating Watermark Asset (`assets/watermark/tag.wav`)

The Phase 1 placeholder watermark tone (2.0 seconds, WAV PCM 16-bit, 44.1 kHz stereo) is synthesized with FFmpeg:

```bash
ffmpeg -y -f lavfi -i "sine=frequency=880:sample_rate=44100:duration=2" -af "volume=8,afade=t=in:st=0:d=0.05,afade=t=out:st=1.5:d=0.5" -c:a pcm_s16le -ar 44100 -ac 2 assets/watermark/tag.wav
```

The website owner's recorded spoken brand voice tag replaces this file directly with zero application code changes.

## Live demo fallback

If the primary cloud demo service (Render) is spinning up or unavailable during a review meeting, run the local fallback from the developer machine:

```bash
docker compose -f build/deploy/docker-compose.yml up -d
npm run dev
cloudflared tunnel --url http://localhost:3000
```

**Limitations**:
- Random URL per run
- No uptime guarantee
- Stops when the machine sleeps
