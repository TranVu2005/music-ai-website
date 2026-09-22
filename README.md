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

1. Copy the environment configuration template:
   ```bash
   cp .env.example .env
   ```
2. Configure required environment variables in `.env`.
3. Follow project setup instructions in [Task 001](./docs/tasks/001-project-setup.md).

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
