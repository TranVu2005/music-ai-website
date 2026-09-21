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
   - **Mandatory Paid VPS**: Real customer orders, bank transfer confirmations, exclusive license reservations, and automated master deliveries must never run on any free tier. Phase 2 requires a dedicated paid VPS with a minimum technical baseline of **2 vCPU / 4 GB RAM** (e.g., Hetzner Cloud, DigitalOcean, or Vietnamese domestic providers such as FPT Cloud / Viettel IDC / Vietnix), finalized and provisioned before Week 6.
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
- **Fit for Milestone 1**: **Fits as Fallback**. Provides an immediate, zero-setup live HTTPS link from the developer machine if the primary cloud demo is sleeping or unreachable during a review meeting.
- **Fit for Phase 2**: **Does not fit**. Violates the hard rule against running customer orders on a developer workstation; cannot provide 24/7 uptime or transactional durability.

---

### Option B: Render Free Web Service + Neon Free PostgreSQL (Selected Primary Demo)

- **Monthly Cost**: $0.00 / month.
- **Official Documentation**:
  - [Render Free Tier Documentation](https://render.com/docs/free)
  - [Render Web Services Documentation](https://render.com/docs/web-services)
  - [Neon Pricing Page](https://neon.com/pricing)
  - [Neon Free Plan Documentation](https://neon.com/docs/introduction/plans#free-plan)
- **Main Limits**:
  - **Render Free Web Service**:
    - **Inactivity Spin-Down**: Automatically spins down (sleeps) after **15 minutes of inactivity** (defined as receiving no incoming HTTP or WebSocket traffic).
    - **Cold Start Delay**: Waking from a spun-down state incurs a cold-start delay of approximately **50 seconds to 1 minute** before the first request is served.
    - **Free Instance Hours**: Limited to **750 free instance hours per calendar month** shared across all free services in the workspace. If exhausted, all free web services in the workspace are suspended until the next calendar month.
    - **Resource Allocations**: Provisioned with 512 MB RAM and 0.1 shared vCPU.
    - **Ephemeral Filesystem**: Disk storage is ephemeral; all locally written files are wiped when the service spins down or restarts.
    - **Pre-Deploy Commands Unavailable**: Render's official documentation indicates that pre-deploy commands are only available for paid service instances (web services, private services, background workers) and cannot be used on free plans ([render.com/docs/free](https://render.com/docs/free)).
    - **Not for Production**: Render's free tier documentation explicitly states that free instances must not be used for production applications ([render.com/docs/free](https://render.com/docs/free)).
  - **Neon Free PostgreSQL**:
    - **Storage Cap**: Restricted to **0.5 GiB (500 MB)** of data storage per project.
    - **Compute Quota**: Limited to **100 Compute Unit hours (CU-hours)** per project per month (1 CU = 1 vCPU and 4 GB RAM).
    - **Scale-to-Zero**: Computes automatically suspend after **5 minutes of inactivity**, conserving monthly CU-hours. Resuming from suspension introduces a brief connection latency (typically 1-3 seconds).
    - **Egress Limit**: Includes **5 GB** of public network egress per month.
    - **Connection Modes**: Provides both a pooled connection URL (`DATABASE_URL`, utilizing PgBouncer) and a direct unpooled connection URL (`DIRECT_URL`).
- **Fit for Milestone 1**: **Fits for Demo**. Perfectly satisfies the Milestone 1 objective: a public, zero-cost, SSL-secured HTTPS URL where stakeholders can review UI layouts, play watermarked audio samples, and submit sample inquiries.
- **Fit for Phase 2**: **Does not fit**. Violates the hard rule ("No real customer orders on any free tier"). Inactivity spin-downs delay customer checkout, monthly compute limits do not guarantee continuous uptime, and free instances cannot host persistent background workers for FFmpeg or hold-expiry schedulers.

---

### Option C: Oracle Cloud Always Free VM

- **Monthly Cost**: $0.00 / month.
- **Official Documentation**: [Oracle Cloud Always Free Resources](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm)
- **Main Limits**:
  - **Compute Allocations**: Up to 2 AMD-based micro instances (VM.Standard.E2.1.Micro with 1/8 OCPU, 1 GB RAM each) or Ampere A1 ARM compute. Around 15 June 2026, reports indicated that the Always Free Ampere A1 allocation was adjusted from the previous 4 OCPU / 24 GB allowance to 2 OCPU / 12 GB (1,500 OCPU hours and 9,000 GB hours per month; verify before use on active tenancy).
  - **Idle Instance Reclamation Policy**: Under official Oracle documentation ([docs.oracle.com Always Free Resources](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm)), OCI reserves the right to reclaim (stop) Always Free compute instances if 95th-percentile utilization over a 7-day period falls below 20% for CPU, 20% for network, and 20% for memory (for A1 shapes).
  - **Capacity and Administrative Overhead**: Always Free shapes frequently encounter "Out of host capacity" availability bottlenecks in high-demand regions, and self-managing Virtual Cloud Networks (VCNs), security lists, and operating system packages entails significant maintenance overhead.
- **Fit for Milestone 1**: **Does not fit**. Complex network configuration, provisioning overhead, and regional capacity constraints make it impractical for a rapid Phase 1 demonstration.
- **Fit for Phase 2**: **Does not fit / Fragile**. Automated 7-day idle reclamation heuristics and capacity risks introduce unacceptable operational vulnerability for active commercial e-commerce.

---

### Option D: Small Paid VPS (Baseline: 2 vCPU / 4 GB RAM)

- **Technical Baseline Justification**:
  - The Phase 2 application runs Next.js server rendering, local PostgreSQL database container, and an FFmpeg background worker for audio compression and periodic voice-tag mixing.
  - A minimum baseline of **2 vCPU / 4 GB RAM** is required for production stability. Entry-level 1 GB or 2 GB plans cannot reliably handle concurrent Next.js server rendering alongside containerized PostgreSQL and FFmpeg audio transcoding.
- **Exchange-Rate Assumptions**:
  - 1 USD ≈ 25,000 VND; 1 EUR ≈ 27,500 VND (market assumptions as of 2026; verify before use).
- **Monthly Cost Range**:
  - **$7.00 to $24.00 / month** (~180,000 to 600,000 VND / month) depending on international vs domestic vendor, IP addressing, and contract commitment.

#### Variant 1: International Cloud Providers
- **DigitalOcean**:
  - **Plan**: Basic Droplet (2 vCPU, 4 GB RAM, 80 GB SSD, 4 TB transfer).
  - **Price**: **$24.00 / month** (~$0.03571/hour).
  - **Official Citation**: [DigitalOcean Droplet Pricing](https://www.digitalocean.com/pricing/droplets)
- **Hetzner Cloud**:
  - **Pricing and Line Status**: Hetzner announced infrastructure price adjustments effective 15 June 2026 ([docs.hetzner.com Price Adjustment](https://docs.hetzner.com/general/infrastructure-and-availability/price-adjustment/)). On the cloud product page ([hetzner.com/cloud](https://www.hetzner.com/cloud)), 2 vCPU / 4 GB RAM shared configurations (such as CX23 or CPX21) start around **€5.99 to €7.72 / month** excluding VAT (~$6.60 to $8.50 / month; verify before use), plus €0.60/month for dedicated IPv4. *Availability notice*: CX and CAX lines have frequently been reported as not orderable / out of stock in various datacenter locations; verify stock and pricing before use.

#### Variant 2: Domestic Vietnamese Providers
Domestic hosting provides three key business advantages for Phase 2: billing directly in Vietnam Dong (VND), delivery of official VAT invoices (hóa đơn giá trị gia tăng) required for corporate tax accounting in Vietnam, and low round-trip latency (<10-20ms) for domestic buyers:
- **Vietnix**:
  - **Plan**: VPS packages with 2-4 vCPU / 4 GB RAM (VPS SSD / NVMe / Giá Rẻ / Pro lines).
  - **Price Range**: Approximately **186,000 to 350,000 VND / month** (~$7.50 to $14.00 / month).
  - **Official Citation**: [Vietnix VPS Pricing](https://vietnix.vn/vps/)
- **FPT Cloud**:
  - **Plan**: Cloud Server / VPS with 2 vCPU / 4 GB RAM.
  - **Price Range**: Flexible enterprise configurations typically range around **350,000 to 500,000 VND / month** (~$14.00 to $20.00 / month) depending on disk tier (SSD/NVMe) and service level (verify before use via sales quotation).
  - **Official Citation**: [FPT Cloud VPS Pricing](https://fptcloud.com/bang-gia-thue-vps/)
- **Viettel IDC**:
  - **Plan**: Cloud Server / VPS packages (e.g., BASE03 with 2 vCPU / 4 GB RAM).
  - **Price Range**: Standard packages list at approximately **399,000 VND / month** (~$16.00 / month) before discounts, with entry promotional packages starting around 235,000 VND / month.
  - **Official Citation**: [Viettel IDC Cloud Server](https://viettelidc.com.vn/)
- *Billing Caveat for Domestic Providers*: Promotional headline prices frequently require 12 to 36 months prepayment in advance and generally exclude 10% VAT. Month-to-month contracts without multi-year commitment may carry higher unit costs; verify before use.

- **Fit for Milestone 1**: **Premature**. Incurs unnecessary recurring infrastructure expense before client acceptance of Phase 1 deliverables.
- **Fit for Phase 2**: **Fits (Primary Production Choice)**. Provides persistent 24/7 uptime, zero spin-down latency, dedicated CPU/RAM for FFmpeg transcoding, host-level scheduler support (systemd / cron) for exclusive hold-expiry sweeps, and containerized PostgreSQL storage.

---

### Option E: Vercel Hobby Plan (EXCLUDED)

- **Monthly Cost**: $0.00 / month.
- **Official Documentation**:
  - [Vercel Fair Use Guidelines](https://vercel.com/docs/limits/fair-use-guidelines)
  - [Vercel Pricing & Plans](https://vercel.com/docs/pricing)
- **Main Limits**:
  - **Strict Non-Commercial Clause**: Vercel's Fair Use Guidelines explicitly state that the Hobby plan is restricted strictly to non-commercial, personal projects. Commercial usage is defined as any deployment used for financial gain, including selling products or services, processing customer payments, paid client work, or promoting a business.
  - **Serverless Constraints**: Serverless functions have execution duration limits and lack persistent background worker capabilities, making them incompatible with long-running FFmpeg audio transcoding tasks.
- **Fit for Milestone 1**: **Does not fit / Excluded**. Although Milestone 1 does not enable active payments, this repository is a commercial client engagement. Deploying to Vercel Hobby violates Vercel's Terms of Service and introduces platform lock-in.
- **Fit for Phase 2**: **Does not fit / Prohibited**. Direct violation of Vercel Hobby fair-use terms upon enabling e-commerce transactions, creating an immediate risk of deployment suspension.

---

## 3. Comparison Matrix (Baseline: 2 vCPU / 4 GB RAM)

| Option | Monthly Cost (2 vCPU / 4 GB) | Spin-Down on Idle | FFmpeg Worker Support | Hold-Expiry Scheduler | Milestone 1 Fit | Phase 2 Fit | Official Citation |
|:---|:---:|:---:|:---:|:---:|:---|:---|:---|
| **A: Cloudflare Quick Tunnel** | $0.00 | None (tied to dev laptop) | Manual on laptop | Manual on laptop | Fits as fallback | Does not fit | [developers.cloudflare.com](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/do-more-with-tunnels/trycloudflare/) |
| **B: Render Free + Neon Free** | $0.00 | Yes (~1m cold start) | None (ephemeral) | None (external ping only) | Fits for demo | Does not fit | [render.com/docs/free](https://render.com/docs/free), [neon.com/docs](https://neon.com/docs/introduction/plans#free-plan) |
| **C: Oracle Always Free VM** | $0.00 | None (if un-reclaimed) | Yes (container) | Yes (cron/systemd) | Does not fit | Does not fit / Fragile | [docs.oracle.com](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm) |
| **D: Small Paid VPS** | ~$7.00 - $24.00 (180k - 600k VND) | None (24/7 dedicated) | Yes (container worker) | Yes (cron/systemd) | Premature | Fits (Primary choice) | [digitalocean.com](https://www.digitalocean.com/pricing/droplets), [hetzner.com](https://www.hetzner.com/cloud), [vietnix.vn](https://vietnix.vn/vps/) |
| **E: Vercel Hobby** | $0.00 | Serverless cold starts | Incompatible | Incompatible | Does not fit / Excluded | Does not fit / Prohibited | [vercel.com/docs/limits/fair-use-guidelines](https://vercel.com/docs/limits/fair-use-guidelines) |

*(Note: Pricing across providers assumes 1 USD ≈ 25,000 VND and 1 EUR ≈ 27,500 VND. If any pricing or specification values change over time, verify before use on the provider's official pricing page).*

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

- [ ] **Commercial-Use Terms**: Read and accept the commercial-use terms and free-tier limitations of Render ([render.com/docs/free](https://render.com/docs/free)) and Neon ([neon.com/docs/introduction/plans#free-plan](https://neon.com/docs/introduction/plans#free-plan)).
- [ ] **Spin-Down Awareness**: Acknowledge that the Phase 1 demo instance spins down after 15 minutes of inactivity and requires 1-2 minutes to wake on initial load.
- [ ] **Hard Rule Confirmation**: Confirm and enforce the rule: **"No real customer orders on any free tier."**
- [ ] **Phase 2 Gate Schedule**: Approve budgeting and provisioning of the small paid VPS before Week 6 of implementation.
