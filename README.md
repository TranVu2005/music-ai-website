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
5. Start local development server:
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
    "schema": "src/db/schema.prisma"
  }
  ```
- **Connection Separation**:
  - `DATABASE_URL`: Connection string used by the application runtime and Next.js Route Handlers (points to Neon pooled connection pooler in Phase 1 demo or local database).
  - `DIRECT_URL`: Unpooled direct connection string used by Prisma migration engine (`prisma migrate deploy` / `npm run db:migrate:deploy`) to execute schema DDL statements directly without pooler restrictions.
- **Prisma 6 Deprecation & Prisma 7 Migration Path**:
  In Prisma 6.x, specifying schema location via `package.json#prisma` emits a deprecation warning advising migration to `prisma.config.ts`. In accordance with Lead Decision 1, `package.json#prisma` is retained for 6.x stability, and can cleanly migrate to `prisma.config.ts` when upgrading to Prisma 7:
  ```typescript
  // prisma.config.ts (Prisma 7 migration path)
  import { defineConfig } from "prisma/config";
  export default defineConfig({
    schema: "src/db/schema.prisma",
  });
  ```
- **Container Parity**:
  The production Dockerfile (`build/deploy/Dockerfile`) mirrors this layout by copying `src/db` before running `npm ci` and copying generated engines from `node_modules/.prisma` and schema definitions from `src/db` into the final standalone runner stage.

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
