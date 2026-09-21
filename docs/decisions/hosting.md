# Architectural Decision Record: Hosting Strategy for Phase 1 Demo and Phase 2 Production

> **Decision Status**: Approved by Product Owner (2026-09-21)  
> **Source of Truth**: Aligned with [`docs/project-plan.md`](../project-plan.md) and [`CLAUDE.md`](../../CLAUDE.md)  
> **Hard Rule**: **"No real customer orders on any free tier."**

---

## 1. Executive Summary and Decision

The product owner has finalized the hosting strategy for the project across Phase 1 and Phase 2:

1. **Phase 1 Trial Demo (Milestone 1 Stakeholder Review)**:
   - **Primary**: **Render Free Web Service + Neon Free Serverless PostgreSQL**. Provides an accessible public HTTPS URL (`https://<app-name>.onrender.com`) at zero infrastructure cost for stakeholder testing of catalog browsing, audio previews, and request form submission.
   - **Fallback**: **Cloudflare Quick Tunnel** (`cloudflared tunnel --url http://localhost:3000`) hosted directly from the developer machine. Provides an instant, zero-setup live link if the primary cloud service experiences unexpected downtime or cold-start issues during review meetings.
2. **Phase 2 Production (Commercial Sales & Order Processing)**:
   - **Mandatory Paid VPS**: Real customer orders, bank transfer confirmations, exclusive license reservations, and automated master deliveries must never run on any free tier. Phase 2 requires a small paid VPS (e.g., Hetzner Cloud / DigitalOcean / Linode), finalized and provisioned before Week 6.
   - **Phase 2 Gate**: A paid VPS is required because admin track uploads require a persistent background worker with FFmpeg for audio transcoding and voice-tag watermarking, and exclusive license hold-expiry sweeps require a deterministic scheduler (systemd timer or cron).

---

## 2. Options Considered

### Option A: Cloudflare Quick Tunnel (Developer Machine)

- **Monthly Cost**: $0.00 / month.
- **Official Documentation**: [Cloudflare Quick Tunnels Documentation](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/do-more-with-tunnels/trycloudflare/)
- **Main Limits**:
  - **Ephemeral Domain**: Generates a random subdomain on `trycloudflare.com` on every execution; persistent URLs are not supported without a registered domain and named tunnel.
  - **Concurrency Cap**: Enforces a strict limit of 200 concurrent in-flight requests; requests exceeding this quota receive HTTP 429 Too Many Requests.
  - **Zero Availability Guarantee**: No Service Level Agreement (SLA); connection terminates immediately if the local workstation sleeps, reboots, or disconnects from the internet.
  - **Feature Restrictions**: Server-Sent Events (SSE) are unsupported on quick tunnels.
  - **Network Filtering**: Subdomains on `trycloudflare.com` may be flagged or blocked by corporate firewalls or antivirus software due to widespread abuse by third parties.
- **Fit for Milestone 1**: **Excellent as a Fallback (9/10)**. If Render is spinning up or unreachable during a live stakeholder presentation, the developer runs a single command to expose the local development environment over HTTPS.
- **Fit for Phase 2**: **Unacceptable (0/10)**. Cannot run commercial transactions or accept customer orders from a personal developer laptop.

---

### Option B: Render Free Web Service + Neon Free PostgreSQL (Selected Primary Demo)

- **Monthly Cost**: $0.00 / month.
- **Official Documentation**:
  - [Render Free Tier Documentation](https://render.com/docs/free)
  - [Render Web Services Documentation](https://render.com/docs/web-services)
  - [Neon Pricing Page](https://neon.tech/pricing)
  - [Neon Free Plan Documentation](https://neon.tech/docs/introduction/plans#free-plan)
- **Main Limits**:
  - **Render Free Web Service**:
    - **Inactivity Spin-Down**: Automatically spins down (sleeps) after **15 minutes of inactivity** (defined as receiving no incoming HTTP or WebSocket traffic).
    - **Cold Start Delay**: Waking from a spun-down state incurs a cold-start delay of approximately **50 seconds to 1 minute** before the first request is served.
    - **Free Instance Hours**: Limited to **750 free instance hours per calendar month** shared across all free services in the workspace. If exhausted, all free web services in the workspace are suspended until the next calendar month.
    - **Resource Allocations**: Provisioned with 512 MB RAM and 0.1 shared vCPU.
    - **Ephemeral Filesystem**: Disk storage is ephemeral; all locally written files are wiped when the service spins down or restarts.
    - **No Pre-Deploy Commands**: Render's official documentation explicitly confirms: *"The pre-deploy command is available for paid web services, private services, and background workers."* Pre-deploy commands are unavailable on free web services.
    - **Not Suitable for Production**: Render's official documentation states: *"Free web services are for personal and hobby projects. They are not suitable for production applications."*
  - **Neon Free PostgreSQL**:
    - **Storage Cap**: Restricted to **0.5 GiB (500 MB)** of data storage per project.
    - **Compute Quota**: Limited to **100 Compute Unit hours (CU-hours)** per project per month (1 CU = 1 vCPU and 4 GB RAM).
    - **Scale-to-Zero**: Computes automatically suspend after **5 minutes of inactivity**, conserving monthly CU-hours. Resuming from suspension introduces a brief database connection latency (typically 1-3 seconds).
    - **Egress Limit**: Includes **5 GB** of public network egress per month.
    - **Connection Modes**: Provides both a pooled connection URL (`DATABASE_URL`, utilizing PgBouncer) and a direct unpooled connection URL (`DIRECT_URL`).
- **Fit for Milestone 1**: **Ideal for Demo (10/10)**. Perfectly satisfies the Milestone 1 objective: a public, zero-cost, SSL-secured HTTPS URL where stakeholders can review UI layouts, play watermarked audio samples, and submit sample inquiries.
- **Fit for Phase 2**: **Unacceptable (0/10)**. Violates the hard rule ("No real customer orders on any free tier"). Spin-down latency disrupts checkout, 750 monthly instance hours do not guarantee 24/7 uptime, and lack of persistent background workers prevents automated FFmpeg processing and hold-expiry scheduling.

---

### Option C: Oracle Cloud Always Free VM

- **Monthly Cost**: $0.00 / month.
- **Official Documentation**: [Oracle Cloud Always Free Resources](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm)
- **Main Limits**:
  - **Compute Allocations**: Up to 2 AMD-based micro instances (VM.Standard.E2.1.Micro with 1/8 OCPU, 1 GB RAM each) or Ampere A1 ARM compute (up to 4 OCPUs, 24 GB RAM, subject to regional availability).
  - **Idle Instance Reclamation Policy**: Oracle automatically reclaims Always Free compute instances if resource utilization over a 7-day rolling window falls below 20% CPU, 20% network, and 20% memory.
  - **Registration & Capacity Friction**: Account creation frequently fails automated credit-card identity checks, and many data center regions suffer from persistent "Out of host capacity" errors for Always Free shapes.
  - **Operational Overhead**: Requires manual Linux server configuration, VCN firewall setup, and ongoing OS patch management.
- **Fit for Milestone 1**: **Poor (3/10)**. Unnecessary provisioning overhead, regional capacity risks, and registration hurdles make it unsuitable for a rapid Phase 1 milestone demonstration.
- **Fit for Phase 2**: **Unacceptable / Fragile (3/10)**. Risk of sudden instance reclamation due to idle heuristics introduces unacceptable business operational risk for an active e-commerce store.

---

### Option D: Small Paid VPS (Hetzner / DigitalOcean / Linode)

- **Monthly Cost**:
  - **Hetzner Cloud**: CX22 (x86, 2 vCPU, 4 GB RAM, 40 GB NVMe, 20 TB traffic) at approximately €3.79/month (~$4.15/mo) or CAX11 (ARM, 2 vCPU, 4 GB RAM, 40 GB NVMe) at approximately €3.29/month (~$3.60/mo), plus optional dedicated IPv4 (€0.60/mo). Cited from [Hetzner Cloud Pricing](https://www.hetzner.com/cloud).
  - **DigitalOcean**: Basic Droplet (1 vCPU, 1 GB RAM, 25 GB SSD, 1 TB transfer) at $6.00/month. Cited from [DigitalOcean Droplet Pricing](https://www.digitalocean.com/pricing/droplets).
  - **Linode (Akamai)**: Shared 1 GB Nanode (1 vCPU, 1 GB RAM, 25 GB SSD, 1 TB transfer) at $5.00/month. Cited from [Linode Pricing](https://www.linode.com/pricing/).
- **Main Limits**:
  - Requires self-managed server administration: configuring Docker, TLS certificates (via Caddy or Nginx with Let's Encrypt), automated backup cron jobs, and firewall rules.
  - Fixed hardware limits (can be scaled vertically on demand).
- **Fit for Milestone 1**: **Premature / Unnecessary (4/10)**. Incurs financial expense before client acceptance of the Phase 1 demonstration.
- **Fit for Phase 2**: **Mandatory Primary Choice (10/10)**. Selected as the production architecture for Phase 2. Provides persistent 24/7 uptime, zero spin-down latency, dedicated CPU capacity for FFmpeg audio transcoding, host-level scheduler support (systemd / cron) for exclusive hold-expiry sweeps, and containerized PostgreSQL storage.

---

### Option E: Vercel Hobby Plan (EXCLUDED)

- **Monthly Cost**: $0.00 / month.
- **Official Documentation**:
  - [Vercel Fair Use Guidelines](https://vercel.com/docs/limits/fair-use-guidelines)
  - [Vercel Pricing & Plans](https://vercel.com/docs/pricing)
- **Main Limits**:
  - **Strict Non-Commercial Clause**: Vercel's Fair Use Guidelines explicitly state that the Hobby plan is restricted strictly to non-commercial, personal projects. Commercial usage is defined as any deployment used for financial gain, including selling products or services, processing customer payments, paid client work, or promoting a business.
  - **Serverless Constraints**: Serverless functions have execution duration limits (10-15 seconds maximum) and lack long-running process capability, making them incompatible with background FFmpeg audio processing.
- **Fit for Milestone 1**: **Excluded (0/10)**. Although Milestone 1 does not enable active payments, this repository is a commercial client engagement. Deploying to Vercel Hobby violates Vercel's Terms of Service and introduces platform lock-in.
- **Fit for Phase 2**: **Strictly Prohibited (0/10)**. Direct violation of Vercel Hobby fair-use terms upon enabling e-commerce transactions; risking immediate suspension of the deployment.

---

## 3. Comparison Matrix

| Option | Monthly Cost | Spin-Down on Idle | FFmpeg Worker Support | Hold-Expiry Scheduler | Milestone 1 Fit | Phase 2 Fit | Official Citation |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---|
| **A: Cloudflare Quick Tunnel** | $0.00 | None (tied to dev laptop) | Manual on laptop | Manual on laptop | Fallback (9/10) | Prohibited (0/10) | [developers.cloudflare.com](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/do-more-with-tunnels/trycloudflare/) |
| **B: Render Free + Neon Free** | $0.00 | Yes (~1m cold start) | None (ephemeral) | None (external ping only) | Primary (10/10) | Prohibited (0/10) | [render.com/docs/free](https://render.com/docs/free), [neon.tech/pricing](https://neon.tech/pricing) |
| **C: Oracle Always Free VM** | $0.00 | None (if un-reclaimed) | Yes (container) | Yes (cron/systemd) | Poor (3/10) | Fragile (3/10) | [docs.oracle.com](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm) |
| **D: Small Paid VPS** | ~$3.60 - $6.00 | None (24/7 dedicated) | Yes (container worker) | Yes (cron/systemd) | Overkill (4/10) | Primary (10/10) | [hetzner.com/cloud](https://www.hetzner.com/cloud), [digitalocean.com](https://www.digitalocean.com/pricing/droplets) |
| **E: Vercel Hobby** | $0.00 | Serverless cold starts | Incompatible | Incompatible | Excluded (0/10) | Prohibited (0/10) | [vercel.com/docs/limits/fair-use-guidelines](https://vercel.com/docs/limits/fair-use-guidelines) |

*(Note: If any pricing or specification values change over time, verify before use on the provider's official pricing page).*

---

## 4. Portability and Migration Plan to Paid VPS

To prevent vendor lock-in and guarantee a seamless transition to the paid VPS before Phase 2:

1. **Vendor Agnostic Application Code**:
   - Application code must never import hosting-vendor-specific libraries (such as `@vercel/kv`, `@vercel/blob`, `@render/sdk`, or Edge runtime abstractions).
   - All external infrastructure interactions must reside behind TypeScript interfaces (`EmailProvider`, `PaymentProvider`, `RateLimiter`).
2. **Container Image Portability**:
   - The primary deployment artifact is the Dockerfile located at `build/deploy/Dockerfile`.
   - The container builds a self-contained Next.js standalone server with bundled OpenSSL and FFmpeg, ensuring identical execution across local Docker Compose, Render Docker service, and the production VPS.
3. **Database Migration Steps from Neon to VPS**:
   - **Step 1: Backup**: Export schema and data from Neon using `pg_dump`:
     ```bash
     pg_dump -Fc --no-acl --no-owner -d "$DIRECT_URL" -f neon_migration.dump
     ```
   - **Step 2: Restore**: Import the backup into containerized PostgreSQL on the VPS:
     ```bash
     pg_restore --clean --if-exists -d "$DATABASE_URL" neon_migration.dump
     ```
   - **Step 3: DNS Cutover**: Lower DNS record TTL to 300 seconds at least 48 hours prior to maintenance. Update DNS records to point to the VPS static IP.
   - **Step 4: Environment Provisioning**: Configure production environment variables on the VPS according to `.env.example`.

---

## 5. Pre-Deployment Checklist for Store Owner

Before approving any deployment to Render and Neon, the store owner must review and complete the following checklist:

- [ ] **Commercial-Use Terms**: Read and accept the commercial-use terms and free-tier limitations of Render ([render.com/docs/free](https://render.com/docs/free)) and Neon ([neon.tech/docs/introduction/plans#free-plan]).
- [ ] **Spin-Down Awareness**: Acknowledge that the Phase 1 demo instance spins down after 15 minutes of inactivity and requires 1-2 minutes to wake on initial load.
- [ ] **Hard Rule Confirmation**: Confirm and enforce the rule: **"No real customer orders on any free tier."**
- [ ] **Phase 2 Gate Schedule**: Approve budgeting and provisioning of the small paid VPS before Week 6 of implementation.
