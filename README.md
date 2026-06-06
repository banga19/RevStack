# Mapato / RevStack — AI-Powered Revenue Operations for B2B Trading

**Mapato** (also referred to as **RevStack**) delivers an AI-powered revenue operations platform for B2B trading companies — inspired by [Polsia.com](https://polsia.com)'s autonomous business model at a fraction of the cost.

Mapato is co-built by [Sokogate.com](https://sokogate.com) and [UltimoTradingLtd.co.ke](https://ultimotradingltd.co.ke) — combining Sokogate's B2B wholesale sourcing marketplace with Ultimo Trading's operational expertise.

Like Polsia, Mapato runs on a low monthly subscription + success fee model — but at **half the revenue share** (10% vs Polsia's 20%). While Polsia automates e-commerce businesses, Mapato is purpose-built for WhatsApp-driven B2B trade operations across Africa and emerging markets.

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** v20+ (recommended: v22)
- **pnpm** v9+ (recommended) or **npm** v10+
- **Docker** v24+ & **Docker Compose** v2+ (optional — recommended for full stack)

### Option A: Local Development (Node + pnpm)

```bash
git clone <repo-url> revstack
cd revstack

# Install dependencies:
pnpm install

# Set up environment:
cp .env.example .env.local
# Edit .env.local with your keys (at minimum NEXTAUTH_SECRET)

# Set up database:
pnpm run setup

# Start dev server:
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Option B: Docker (Recommended for Full Stack)

```bash
git clone <repo-url> revstack
cd revstack

# Copy environment template:
cp .env.example .env
# Edit .env — set NEXTAUTH_SECRET at minimum

# Start the app (with Redis + Chroma + Hermes worker):
docker compose --profile all up -d

# Or just the app:
docker compose up -d app

# Run database setup:
docker compose run --rm app pnpm run setup

# Follow logs:
docker compose logs -f app
```

Open [http://localhost:3000](http://localhost:3000).

For development with hot reload:
```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d app
```

See [🐳 Docker](#-docker) section below for detailed Docker guidance.

### 2. Set up environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local` and set at minimum:
| Variable | Value | How to generate |
|----------|-------|-----------------|
| `NEXTAUTH_SECRET` | Random 32+ char base64 string | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `http://localhost:3000` | Local dev |
| `NEXT_PUBLIC_BASE_URL` | `http://localhost:3000` | Required for OG images + sitemap |

For AI features, set at least one LLM provider (see [Model Providers](#-model-providers) below).

### 3. Set up the database

```bash
# Full setup (push schema + seed all data):
npm run setup
# Which runs: prisma db push && tsx prisma/seed.ts && tsx prisma/seed-korea.ts

# Or step by step:
npm run db:push      # Push schema to SQLite
npm run db:seed      # Seed demo data
```

This seeds: admin user, demo clients, products, compliance records, financial data, Korea corridor pilot cohorts, and RevStack demo data.

### 4. Start development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Sign in

| Method | Details |
|--------|---------|
| **Email & Password** | Sign up at `/signup` or use seeded admin: `admin@aibusinessos.com` / `admin123` |
| **Google OAuth** | Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env.local`, then click "Sign in with Google" at `/login` |

---

## 🔐 Authentication

### Email & Password

1. Go to `/signup` — fill in name, email, password (min 8 chars)
2. Auto-login after signup, or sign in at `/login`
3. New users get a **14-day free trial**

### Google Sign-In

1. Create OAuth credentials at [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Add redirect URI: `http://localhost:3000/api/auth/callback/google`
3. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env.local`
4. Click "Sign in with Google" at `/login` — auto-creates account with trial

### Admin Access

Only users with `role: "admin"` can access `/admin`, `/api/admin/*`, and God Mode. Change roles in the admin panel's Users tab.

---

## 🤖 Autonomous Agents

Mapato features 5 autonomous agents coordinated by the **Hermes supervisory agent**. Each agent has a service bridge that calls real integrations.

### Agent Overview

| Agent | Icon | Services | Purpose |
|-------|------|----------|---------|
| **Lead** | 👥 | WATI, Zoho CRM, Instantly.ai, Voiceflow, Make.com | Qualify leads via WhatsApp, sync to CRM, launch outreach |
| **Trade** | 🌐 | Sokogate, Make.com | Supplier matching, corridor analysis |
| **Compliance** | 🛡️ | QMe, Make.com, Voiceflow | Certification tracking, document review |
| **Onboarding** | 🎯 | Email, QMe, Voiceflow, Zoho CRM, Make.com | Client onboarding, welcome emails |
| **Revenue** | 💰 | RAG, Make.com, Zoho CRM | Revenue reporting, financial analytics |

### Hermes — Supervisory Agent

The **Hermes agent** (`src/lib/hermes-agent.ts`) orchestrates multi-agent workflows:

- **Lead Sweep** — Queries the lead database, qualifies leads via WATI/Voiceflow, syncs to CRM, launches Instantly.ai campaigns
- **System Health Check** — Runs diagnostics across all agents
- **Custom Operations** — Accepts free-form objectives, plans actions using the LLM, delegates to agent service bridges
- **Agent Memory** — Stores insights from each run via `agentMemory` for future context
- **Autonomous Scheduling** — `src/lib/autonomous-scheduler.ts` runs Hermes in the background based on database triggers

**Access Hermes via:**
- Admin panel → **Hermes tab** at `/admin`
- Standalone page at `/hermes`
- API at `POST /api/hermes`
- Cron: `.github/workflows/cron-hermes-runs.yml`

### Credential Detection

Every agent action now starts with a **credential banner** showing which services are live vs simulation:

```
📋 Lead Agent Credential Status:
   ℹ️ 5 service(s) in simulation mode — set env vars above for live data
   ⚠️ wati              simulation — Set WATI_API_TOKEN and WATI_WHATSAPP_NUMBER_ID
   ⚠️ zoho-crm           simulation — Set ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN
   ⚠️ voiceflow          simulation — Set VOICEFLOW_API_KEY and VOICEFLOW_PROJECT_ID
   ⚠️ make.com           simulation — Set MAKE_LEAD_CAPTURE_WEBHOOK
```

All integration classes expose an `isConfigured()` method used by the credential checks:
- `watiIntegration.isConfigured()`
- `zohoCrmIntegration.isConfigured()`
- `voiceflowIntegration.isConfigured()`
- `instantlyIntegration.isConfigured()`
- `sokogateIntegration.isConfigured()`

### God Mode — Full Agent Orchestration

The **God Mode** orchestrator (`src/lib/agent-orchestrator.ts`) deploys all 5 agents simultaneously:

- Access at `/operations` page or `/admin` → **God Mode** tab
- Start, pause, resume, and stop agent sessions
- View real-time progress bars and task status
- Review agent reports with insights and metrics

---

## 🧠 Hermes Autonomous Brain – Complete Implementation Guide

Below is the **step‑by‑step integration** of the advanced Hermes system (LangGraph, BullMQ, RAG, tools) into the existing RevStack codebase, including Docker deployment. All code paths are relative to the RevStack root.

### Prerequisites

- Node.js 20+, pnpm
- Docker & Docker Compose (for full stack)
- API keys for at least one LLM provider (NVIDIA NIM, DeepSeek, OpenAI) and for WATI, Sokogate, etc.

---

### Phase 1: Install Dependencies

```bash
cd revstack
pnpm add @langchain/langgraph @langchain/core @langchain/openai @langchain/community
pnpm add bullmq ioredis chromadb playwright zod
pnpm add @resend/node
pnpm add -D @types/node
npx playwright install chromium
```

---

### Phase 2: Set Up Redis & Chroma (Docker)

Create a `docker-compose.yml` in the root (if not already present) with the services described earlier (redis, chromadb, postgres optional). Then start them:

```bash
docker-compose up -d redis chromadb
```

---

### Phase 3: Create RAG Knowledge Base

1. Create a folder `knowledge/` and place PDFs/txt files (e.g., `korean_import_rules.txt`, `halal_handbook.pdf`).
2. Create `scripts/seed-rag.ts` (as shown in previous answer).
3. Run the seeder:

```bash
pnpm tsx scripts/seed-rag.ts
```

---

### Phase 4: Implement LangGraph Tools

Create `src/lib/hermes/tools/` with files:

- `sokogate.ts` – wraps `sokogateIntegration.searchProducts`
- `exportReadiness.ts` – wraps `calculateERS`
- `wati.ts` – wraps `watiIntegration.sendTemplate`
- `email.ts` – wraps Resend / SMTP

Example (`src/lib/hermes/tools/wati.ts`):

```typescript
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { watiIntegration } from "@/lib/wati-integration";

export const watiSendTemplate = tool(
  async ({ phone, templateName, parameters }) => {
    const result = await watiIntegration.sendTemplate(phone, templateName, parameters);
    return JSON.stringify(result);
  },
  {
    name: "wati_send_template",
    description: "Send a WhatsApp template message via WATI.io",
    schema: z.object({
      phone: z.string(),
      templateName: z.string(),
      parameters: z.array(z.string()).optional(),
    }),
  }
);
```

---

### Phase 5: Build the LangGraph Sales Pipeline

Create `src/lib/hermes/sales-graph.ts` with the state graph (score → outreach → follow_up → close). Use the model with bound tools.

```typescript
import { StateGraph, Annotation } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { sokogateProductSearch, exportReadinessCalculator, watiSendTemplate, emailSendSequence } from "./tools";

const SalesState = Annotation.Root({
  lead: Annotation<{ id: string; phone: string; email: string; companyName: string; productInterest: string }>,
  stage: Annotation<string>,
  score: Annotation<number>,
  messages: Annotation<any[]>,
});

const model = new ChatOpenAI({ model: "gpt-4o", temperature: 0 }).bindTools([
  sokogateProductSearch,
  exportReadinessCalculator,
  watiSendTemplate,
  emailSendSequence,
]);

// ... nodes and conditional edges
export const salesGraph = workflow.compile();
```

---

### Phase 6: BullMQ Queue & Worker

Create `src/lib/hermes/queue.ts`:

```typescript
import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import { salesGraph } from "@/lib/hermes/sales-graph";
import { prisma } from "@/lib/db";

export const redis = new IORedis(process.env.REDIS_URL!);
export const hermesQueue = new Queue("hermes-tasks", { connection: redis });

if (process.env.NODE_ENV !== "production" || process.env.RUN_WORKER === "true") {
  new Worker("hermes-tasks", async (job) => {
    const { leadId } = job.data;
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) return;
    const result = await salesGraph.invoke({ lead, stage: "start", score: 0, messages: [] });
    await prisma.hermesRun.create({ data: { leadId, stage: result.stage, output: JSON.stringify(result) } });
  }, { connection: redis });
}
```

Create a dedicated worker entrypoint `workers/hermes-worker.ts` that only imports and starts the worker (for Docker).

---

### Phase 7: API Route for Manual Triggering

Create `app/api/hermes/run/route.ts`:

```typescript
import { hermesQueue } from "@/lib/hermes/queue";
import { getServerSession } from "next-auth";
import { defineRulesFor } from "@/lib/abac";

export async function POST(req: Request) {
  const session = await getServerSession();
  const ability = defineRulesFor(session?.user);
  if (!ability.can("trigger", "HermesRun")) {
    return new Response("Forbidden", { status: 403 });
  }
  const { leadId } = await req.json();
  await hermesQueue.add("process-lead", { leadId });
  return Response.json({ queued: true });
}
```

---

### Phase 8: Scheduled Runs (Cron)

Use BullMQ's repeatable jobs. Create a one‑time script `scripts/schedule-hermes-cron.ts`:

```typescript
import { hermesQueue } from "@/lib/hermes/queue";
await hermesQueue.add("sweep", { allLeads: true }, { repeat: { pattern: "0 */6 * * *" } });
```

Run it once (e.g., during deployment). For Vercel, use Vercel Cron Jobs to call an API endpoint that adds the job.

---

### Phase 9: Extend Admin Panel

In `app/admin/hermes/page.tsx`, add:

- Queue status (using `hermesQueue.getJobCounts()`)
- List of recent `HermesRun` records from database
- Manual trigger form (lead ID input or "Run for all leads")
- Button to retry failed jobs

---

### Phase 10: Update ABAC Policies

The ABAC system already supports the `"hermes-runs"` resource (see `src/lib/abac.ts`). Hook it up via:

```typescript
can("admin", "hermes-runs");
```

Protect the new API route with middleware – already handled by the `matcher` in `middleware.ts`.

---

### Phase 11: Unit Tests

Create `__tests__/hermes/sales-graph.test.ts` and `__tests__/hermes/tools.test.ts`. Use Vitest. Example:

```typescript
import { describe, it, expect, vi } from "vitest";
import { salesGraph } from "@/lib/hermes/sales-graph";

vi.mock("@/lib/hermes/tools/wati", () => ({ watiSendTemplate: vi.fn() }));

it("should transition to outreach when score > 60", async () => {
  const result = await salesGraph.invoke({ lead: { score: 70, ...mockLead } });
  expect(result.stage).toBe("outreach_sent");
});
```

---

### Phase 12: Docker Deployment (Full Stack)

See the [🐳 Docker](#-docker) section below for the complete Docker setup guide, including production Dockerfile, docker-compose.yml with Redis + Chroma, Hermes worker, and development overrides.

```bash
# Start everything (app + Redis + Chroma + Hermes worker):
docker compose --profile all up -d

# Run setup:
docker compose run --rm app pnpm run setup

# Seed RAG:
docker compose run --rm app pnpm tsx scripts/seed-rag.ts
```

Access the app at `http://localhost:3000`.

---

### ✅ Final Implementation Checklist

- [ ] PWA enabled (manifest, service worker, icons)
- [ ] Redis & Chroma running (Docker)
- [ ] RAG knowledge base seeded
- [ ] LangGraph tools implemented for WATI, Sokogate, ERS, Email
- [ ] Sales graph created with scoring, outreach, follow‑up, close nodes
- [ ] BullMQ queue and worker integrated
- [ ] API route `/api/hermes/run` protected by ABAC
- [ ] Scheduled runs every 6 hours
- [ ] Admin panel extended with Hermes controls
- [ ] Unit tests for Hermes (≥80% coverage)
- [ ] Docker‑compose stack working end‑to‑end
- [ ] PWA installable on all devices

Once all steps are completed, RevStack will operate as a **silent autonomous income engine**: sourcing products from Sokogate, scoring exporters with RAG‑augmented intelligence, executing WhatsApp/email sequences via LangGraph, and closing deals – all containerized and installable as a PWA.

---

## 🧠 Model Providers

The model provider system (`src/lib/model-provider.ts`) supports multiple LLM providers with automatic fallback:

| Priority | Provider | Env Var | Default Model | Cost |
|----------|----------|---------|---------------|------|
| 1️⃣ | **NVIDIA NIM** | `NVIDIA_NIM_API_KEY` | `nvidia/nemotron-3-super-120b-a12b` | Free |
| 2️⃣ | **Gemini** | `GEMINI_API_KEY` | `gemini-2.0-flash` | Free tier |
| 3️⃣ | **DeepSeek** | `DEEPSEEK_API_KEY` | `deepseek-chat` | $0.14/M tokens |
| 4️⃣ | **OpenAI** | `OPENAI_API_KEY` | `gpt-4o` | Paid |

**How it works:**
1. At startup, `getActiveProvider()` scans env vars in priority order
2. The first provider with a configured API key is activated
3. `createLlm()` returns a `ChatOpenAI` instance pointing to the active provider's base URL
4. `createEmbeddings()` uses OpenAI or Gemini embeddings
5. `createPlannerLlm()` / `createAnalystLlm()` for Hermes agent planning

**Set just one LLM key to get started:**
```bash
# Free option — no credit card needed:
export NVIDIA_NIM_API_KEY="nvapi-your-key-here"

# Or affordable alternative:
export DEEPSEEK_API_KEY="sk-your-key-here"
```

---

## 📊 Pages & Features

### New Pages (Recent)

| Route | Description | Auth |
|-------|-------------|------|
| `/hermes` | Hermes supervisory agent dashboard — run sweeps, view operations | ✅ |
| `/leads` | Lead management — view, filter, search, add, qualify leads | ✅ |
| `/messages` | Message center — WhatsApp & email conversation history | ✅ |
| `/retainers` | Retainer management — monthly retainer tracking | ✅ |
| `/followups` | Follow-up management — trial user nurture sequences | ✅ |
| `/revstack` | RevStack analytics dashboard — KPIs, revenue trends, pipeline | ✅ |

### Core Pages

| Route | Description | ABAC Policy |
|-------|-------------|-------------|
| `/dashboard` | Main analytics dashboard | dashboard:read |
| `/pipeline` | Pipeline CRM | pipeline:read |
| `/trade` | Products, compliance, ERS, trade finance | trade:read |
| `/korea` | Korea Corridor dashboard | korea:read |
| `/admin` | Admin panel (8 tabs) | admin:read |
| `/operations` | God Mode agent orchestrator | operations:read |
| `/financial` | Revenue model & projections | financial:read |
| `/outreach` | Campaign templates & management | outreach:read |
| `/plan` | 75-Day implementation plan | plan:read |
| `/content` | SEO content calendar | content:read |
| `/pricing` | Subscription plans & checkout | pricing:read |
| `/onboarding` | User onboarding flow | onboarding:write |
| `/templates` | Automation template library | — |
| `/docs` | Platform documentation | docs:read |

### Admin Panel (8 Tabs)

1. **Users** 👥 — User list with role management, subscription status, grant permanent access, extend trial
2. **Audit Log** 📋 — Full admin action audit trail (grant, extend, role changes)
3. **Payments** 💳 — Payment history via Flutterwave
4. **Trial Users** ⏰ — Trial/expired users with manual follow-up triggers (D10, D13, D14, D+3, D+7)
5. **Retention** 📊 — Analytics dashboard: signups, logins, activation rate, churn risk, retention cohorts
6. **Follow-ups** 🔔 — Follow-up message log with channel & stage tracking
7. **God Mode** ⚡ — Autonomous agent orchestrator: start/pause/resume/stop, progress bars, reports
8. **Hermes** ✨ — Supervisory agent: system health, lead sweep, custom runs, operation history

---

## 📡 API Routes

### New API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/hermes` | GET/POST | Hermes agent: run operations, get status/history |
| `/api/hermes/runs` | GET | List all Hermes operations |
| `/api/hermes/runs/[id]` | GET/DELETE | Single operation detail/delete |
| `/api/leads` | GET/POST | CRUD leads |
| `/api/leads/[id]` | GET/PUT/DELETE | Single lead CRUD |
| `/api/leads/[id]/qualify` | POST | Qualify a lead via WATI/Voiceflow |
| `/api/messages` | GET/POST | Message center CRUD |
| `/api/retainers` | GET/POST | Retainer management CRUD |
| `/api/retainers/[id]` | GET/PUT/DELETE | Single retainer CRUD |
| `/api/followups` | GET/POST | Follow-up sequence management |
| `/api/followups/[id]` | GET/PUT/DELETE | Single follow-up CRUD |
| `/api/followups/[id]/send` | POST | Send a follow-up message |
| `/api/revstack/analytics/dashboard` | GET | RevStack dashboard KPIs |
| `/api/revstack/analytics/revenue` | GET | Revenue trend data |
| `/api/revstack/analytics/activity` | GET | User activity data |
| `/api/revstack/analytics/pipeline` | GET | Pipeline analytics |
| `/api/cron/autonomous-sweep` | GET | Cron: run autonomous agent sweep |
| `/api/cron/hermes-runs` | GET/POST | Cron: scheduled Hermes runs |

### Core API Routes (Existing)

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/auth/signup` | POST | User registration |
| `/api/auth/[...nextauth]` | * | NextAuth handlers |
| `/api/admin/users` | GET/PUT | Admin user management |
| `/api/admin/data` | GET/POST | Admin dashboard data + follow-ups |
| `/api/admin/retention` | GET | Retention analytics |
| `/api/health` | GET | Health check |
| `/api/pricing` | GET | Pricing tiers |
| `/api/subscribe` | POST | Subscription creation |
| `/api/subscription` | GET/PUT | Subscription status |
| `/api/payments/*` | * | Flutterwave payment flow |
| `/api/cron/trial-expiry` | GET | Daily trial expiry check |
| `/api/cron/subscription-followups` | GET | Daily follow-up processing |
| `/api/god-mode` | GET/POST/PATCH | God Mode agent orchestrator |
| `/api/csrf` | GET | CSRF token |
| `/api/onboarding` | GET | Onboarding questions |
| `/api/push/*` | * | Push notification endpoints |
| `/api/dashboard` | GET | Dashboard data |
| `/api/clients/*` | * | Client CRUD |
| `/api/ers/*` | * | ERS scoring |
| `/api/content/*` | * | Content articles |
| `/api/outreach/*` | * | Outreach campaigns |
| `/api/revenue/*` | * | Revenue entries |
| `/api/korea/*` | * | Korea corridor |
| `/api/organizations` | * | Organization management |

---

## 🧪 Test Files

```bash
# Run all tests
npx vitest run

# Run a specific test file
npx vitest run src/lib/pricing.test.ts
npx vitest run src/lib/hermes-agent.test.ts
npx vitest run src/app/hermes/hermes.test.ts

# Run in watch mode
npx vitest
```

| File | Tests | Description |
|------|-------|-------------|
| `src/lib/pricing.test.ts` | 37 | Pricing tiers, budget suggestions |
| `src/lib/ers-scoring.test.ts` | 23 | ERS dimensions, edge cases |
| `src/lib/agent-service-bridge.test.ts` | 12 | All 5 agent plugins |
| `src/lib/hermes-agent.test.ts` | 8 | Hermes operations, memory, status |
| `src/app/hermes/hermes.test.ts` | 5 | Hermes task execution |
| `src/app/api/documents/documents.test.ts` | 6 | Document CRUD |
| `src/app/api/pipeline-actions/pipeline-actions.test.ts` | 7 | Pipeline action CRUD |
| `src/app/api/content/content.test.ts` | 5 | Content article CRUD |
| **Total** | **~107** | All passing ✅ |

### Simulation Scripts

```bash
# Run a full Hermes lead sweep (requires NVIDIA NIM or other LLM key):
NVIDIA_NIM_API_KEY="nvapi-..." npx tsx scripts/test-hermes-lead-sweep.ts

# Run the trade pipeline test:
NVIDIA_NIM_API_KEY="nvapi-..." npx tsx scripts/test-hermes-trade-pipeline.ts

# Test DeepSeek API connectivity:
DEEPSEEK_API_KEY="sk-..." npx tsx scripts/test-deepseek.ts
```

---

## 🌐 Environment Variables Reference

### Required

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | Database connection string | `file:./dev.db` (SQLite) |
| `NEXTAUTH_SECRET` | JWT encryption secret | — |
| `NEXTAUTH_URL` | Public deployment URL | `http://localhost:3000` |
| `NEXT_PUBLIC_BASE_URL` | Base URL for OG images/sitemap | `http://localhost:3000` |

### LLM Providers (set at least one for AI agents)

| Variable | Provider | Rate |
|----------|----------|------|
| `NVIDIA_NIM_API_KEY` | NVIDIA NIM — `nvidia/nemotron-3-super-120b-a12b` | Free |
| `GEMINI_API_KEY` | Google Gemini — `gemini-2.0-flash` | Free tier |
| `DEEPSEEK_API_KEY` | DeepSeek — `deepseek-chat` | ~$0.14/M tokens |
| `OPENAI_API_KEY` | OpenAI — `gpt-4o` | Paid |

### Authentication & SSO

| Variable | Description |
|----------|-------------|
| `GOOGLE_CLIENT_ID` | Google OAuth client ID for Google Sign-In |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |

### Lead Agent Integrations

| Variable | Service | Used By |
|----------|---------|---------|
| `WATI_API_TOKEN` | WATI.io WhatsApp Business API | Lead qualification, follow-ups |
| `WATI_WHATSAPP_NUMBER_ID` | WATI WhatsApp number ID | Lead qualification |
| `ZOHO_CLIENT_ID` / `SECRET` / `REFRESH_TOKEN` | Zoho CRM | Lead/Onboarding/Revenue agents |
| `INSTANTLY_API_KEY` | Instantly.ai cold email | Outreach campaigns |
| `VOICEFLOW_API_KEY` / `PROJECT_ID` | Voiceflow AI chatbot | Lead qualification, onboarding |

### Trade Agent Integrations

| Variable | Service | Used By |
|----------|---------|---------|
| `SOKOGATE_API_KEY` / `SECRET` | Sokogate B2B trade platform | Supplier discovery, matching |

### Make.com Workflow Webhooks

| Variable | Scenario | Used By |
|----------|----------|---------|
| `MAKE_LEAD_CAPTURE_WEBHOOK` | Lead capture | Lead Agent |
| `MAKE_FOLLOWUP_WEBHOOK` | Follow-up sequences | Onboarding Agent |
| `MAKE_REPORTING_WEBHOOK` | Daily reports | Trade & Revenue agents |
| `MAKE_COMPLIANCE_WEBHOOK` | Compliance alerts | Compliance Agent |
| `MAKE_BOOKING_WEBHOOK` | Booking notifications | All agents |
| `MAKE_NOSHOW_WEBHOOK` | No-show reschedule | All agents |

### Payments (Flutterwave)

| Variable | Description |
|----------|-------------|
| `FLW_PUBLIC_KEY` | Flutterwave public key (sandbox or live) |
| `FLW_SECRET_KEY` | Flutterwave secret key |
| `FLW_ENCRYPTION_KEY` | Flutterwave encryption key |
| `FLW_WEBHOOK_HASH` | Webhook signature hash |

### Email (SMTP)

| Variable | Description | Dev Default |
|----------|-------------|-------------|
| `SMTP_HOST` | SMTP server | `smtp.ethereal.email` |
| `SMTP_USER` | SMTP username | Ethereal auto |
| `SMTP_PASS` | SMTP password | Ethereal auto |

In dev mode, Ethereal captures all emails. View them at the preview URL logged to the console.

### Observability

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_ANALYTICS_PROVIDER` | `plausible`, `ga`, `posthog`, or `custom` |
| `NEXT_PUBLIC_POSTHOG_KEY` | PostHog project API key |
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | Sentry DSN for error tracking |

### Push Notifications & SEO

| Variable | Description |
|----------|-------------|
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Web push VAPID keys |
| `NEXT_PUBLIC_GOOGLE_VERIFICATION` | Google Search Console verification |
| `NEXT_PUBLIC_BING_VERIFICATION` | Bing Webmaster Tools verification |

### Admin & Infrastructure

| Variable | Description |
|----------|-------------|
| `ADMIN_EMAIL` | Override default admin email for seed |
| `ADMIN_PASSWORD` | Override default admin password |
| `CRON_SECRET` | Secret header for cron webhook endpoints |
| `GOOGLE_SHEET_ID` | Google Sheets workbook for admin exports |

---

## 🗄️ Database

### Schema Overview

The Prisma schema (`prisma/schema.prisma`) defines these models:

| Model | Purpose |
|-------|---------|
| `User` | Platform users (roles, subscription, login tracking) |
| `Client` | B2B client companies (suppliers with contact details) |
| `Product` | Products/commodities linked to clients |
| `ComplianceRecord` | Compliance certifications and gaps |
| `TradeFinanceRecord` | Trade finance applications |
| `ErsSnapshot` | Export Readiness Score snapshots |
| `PipelineAction` | CRM pipeline stage actions |
| `OutreachCampaign` | Campaign templates and run history |
| `ContentArticle` | SEO content calendar articles |
| `RevenueRecord` | Revenue projections and actuals |
| `Subscription` | User subscription tiers and status |
| `FollowUpLog` | Trial user follow-up tracking |
| `KoreaTarget` | Korean buyer procurement targets |
| `KoreaCohort` | Korea corridor pilot cohorts |
| `KoreaParticipant` | Cohort participant companies |
| `KoreaInquiry` | Korean buyer inquiries |
| `AdminAuditLog` | Admin action audit trail |
| `Document` | Uploaded documents |

### Common Database Operations

```bash
npm run db:push       # Push schema changes to DB
npm run db:seed       # Run main seed
npm run db:generate   # Regenerate Prisma client
npm run setup         # push + seed (all)
```

### Monorepo Workspace (`lib/`)

The project uses **pnpm workspaces** with a `lib/` directory for shared packages:

- `lib/db/` — Drizzle ORM schema definitions (users, clients, leads, activity, hermes, messages, retainers, followups)
- `lib/api-spec/` — OpenAPI specification

```bash
# Install all workspace dependencies
pnpm install

# Run commands in a specific workspace
pnpm --filter @revstack/db run build
```

---

## 🏗️ Architecture

```
RevStack/
├── middleware.ts          # Edge middleware (auth redirect, rate limit, security headers)
├── proxy.ts               # Middleware handler
├── pnpm-workspace.yaml    # Monorepo workspace config
├── prisma/                # Database
│   ├── schema.prisma      # All models
│   ├── seed.ts            # Main seed
│   ├── seed-korea.ts      # Korea corridor seed
│   └── seed-revstack.ts   # RevStack demo data
├── lib/                   # Shared workspace packages
│   ├── db/                # Drizzle ORM schemas
│   └── api-spec/          # OpenAPI spec
├── scripts/               # Utility & test scripts
│   ├── test-hermes-lead-sweep.ts
│   ├── test-hermes-trade-pipeline.ts
│   ├── test-deepseek.ts
│   └── generate-pwa-icons.js
├── src/
│   ├── app/               # Next.js App Router
│   │   ├── admin/         # Admin panel (8 tabs)
│   │   ├── hermes/        # Hermes supervisory agent
│   │   ├── leads/         # Lead management
│   │   ├── messages/      # Message center
│   │   ├── retainers/     # Retainer management
│   │   ├── followups/     # Follow-up management
│   │   ├── revstack/      # RevStack analytics dashboard
│   │   ├── api/           # 60+ REST API routes
│   │   └── ...            # Dashboard, pipeline, trade, korea, etc.
│   ├── lib/               # Shared libraries
│   │   ├── auth.ts        # NextAuth v5 + JWT
│   │   ├── abac.ts        # ABAC policy engine (18 resources)
│   │   ├── abac-middleware.ts  # withAuth() / withAbac()
│   │   ├── csrf.ts        # Stateless CSRF protection
│   │   ├── rate-limiter.ts     # Sliding-window rate limiter
│   │   ├── model-provider.ts   # Multi-LLM provider (NVIDIA/Gemini/DeepSeek/OpenAI)
│   │   ├── hermes-agent.ts     # Supervisory Hermes agent
│   │   ├── agent-orchestrator.ts    # God Mode orchestrator
│   │   ├── agent-service-bridge.ts  # Service bridge (5 agents + credential banners)
│   │   ├── autonomous-scheduler.ts  # Background scheduler
│   │   ├── agent-memory.ts     # Cross-session agent memory
│   │   ├── wati-integration.ts     # WATI.io WhatsApp API
│   │   ├── zoho-crm-integration.ts # Zoho CRM integration
│   │   ├── voiceflow-integration.ts # Voiceflow chatbot
│   │   ├── sokogate-integration.ts  # Sokogate trade platform
│   │   ├── instantly-integration.ts # Instantly.ai cold email
│   │   ├── make-integration.ts     # Make.com webhooks
│   │   ├── qme-integration.ts      # QMe document processing
│   │   ├── rag-pipeline.ts    # RAG knowledge base
│   │   ├── email.ts          # Nodemailer (Ethereal dev)
│   │   ├── flutterwave.ts   # Payment processing
│   │   ├── analytics.ts     # Event tracking
│   │   └── ...              # ERS scoring, supplier matching, pricing, etc.
│   ├── components/          # Reusable UI components
│   │   ├── ui/              # shadcn/ui primitives
│   │   ├── client-shell.tsx # Client-side shell component
│   │   ├── retention-dashboard.tsx  # Retention analytics
│   │   └── ...              # Sidebar, navbar, auth, payments
│   └── test/                # Test setup mocks
├── .env.example             # Environment template
├── vitest.config.ts         # Test config
├── sentry.client.config.ts  # Sentry client (disabled without DSN)
├── sentry.server.config.ts  # Sentry server (disabled without DSN)
└── package.json
```

---

## 🛠️ Tech Stack

| Category | Technology |
|----------|-----------|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript (strict mode) |
| **Database** | SQLite (dev) / PostgreSQL (prod) via Prisma + Drizzle ORM |
| **Auth** | NextAuth v5 (JWT + Credentials + Google SSO) + ABAC policy engine |
| **UI** | Tailwind CSS + shadcn/ui + Framer Motion |
| **Charts** | Recharts |
| **Icons** | Lucide React |
| **Email** | Nodemailer (Ethereal dev fallback) |
| **Payments** | Flutterwave (M-Pesa, Mobile Money, Card) |
| **Testing** | Vitest (~107 tests) |
| **Error Tracking** | Sentry (auto-disabled without DSN) |
| **Analytics** | Plausible / GA4 / PostHog / custom |
| **AI / LLM** | LangChain.js + NVIDIA NIM / Gemini / DeepSeek / OpenAI |
| **Workspace** | pnpm workspaces (monorepo) |
| **Push** | Web-Push (PWA notifications) |
| **SEO** | Dynamic sitemap.xml + OG image generation |

---

## 🔐 Security

- **ABAC (Attribute-Based Access Control)**: Centralized policy engine covering 18 resources with 5 actions (read/write/admin/deploy/manage)
- **Authentication**: NextAuth v5 with JWT strategy + credentials + Google SSO
- **API protection**: All 60+ route handlers use `withAuth()` or `withAbac()` middleware
- **Route protection**: Edge middleware redirects unauthenticated users, applies rate limiting, security headers (CSP, HSTS, XFO, etc.)
- **CSRF protection**: Stateless HMAC-signed tokens via `src/lib/csrf.ts`
- **Rate limiting**: In-memory sliding-window (strictest on auth: 5 POST/min on signup)
- **Data isolation**: Row-level filtering by `userId`
- **Password hashing**: bcryptjs with 12 salt rounds
- **Admin audit**: Every admin action logged to `AdminAuditLog`

---

## 📋 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Next.js dev server (port 3000) |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run setup` | Push DB schema + run all seeds |
| `npm run db:push` | Push Prisma schema to DB |
| `npm run db:seed` | Run main seed |
| `npm run db:generate` | Regenerate Prisma client |
| `npm run lint` | Run ESLint |
| `npx vitest run` | Run all ~107 tests |
| `npx tsc --noEmit --skipLibCheck` | TypeScript check |
| `npx tsx scripts/test-hermes-lead-sweep.ts` | Run Hermes lead sweep |
| `npx tsx scripts/test-deepseek.ts` | Test DeepSeek API |

---

## 📱 PWA – Install RevStack as a Desktop/Mobile App

RevStack can be installed as a **Progressive Web App (PWA)** on Android, iOS, and desktop. Once installed, it behaves like a native app: offline support, home screen icon, push notifications (optional), and full‑screen experience.

### How to Enable PWA in RevStack

We use `next-pwa` (built on Workbox) to generate the service worker and manifest.

#### 1. Install `next-pwa`

```bash
npm install next-pwa
```

#### 2. Configure `next.config.js`

```javascript
// next.config.js
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  buildExcludes: [/middleware-manifest\.json$/],
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
      handler: 'CacheFirst',
      options: { cacheName: 'google-fonts', expiration: { maxEntries: 4, maxAgeSeconds: 365 * 24 * 60 * 60 } }
    },
    {
      urlPattern: /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
      handler: 'StaleWhileRevalidate',
      options: { cacheName: 'static-font-assets' }
    },
    {
      urlPattern: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
      handler: 'CacheFirst',
      options: { cacheName: 'static-image-assets', expiration: { maxEntries: 64, maxAgeSeconds: 30 * 24 * 60 * 60 } }
    },
    // Add more rules for API calls if needed
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // ... other existing config
};

module.exports = withPWA(nextConfig);
```

#### 3. Create a Web App Manifest

The manifest is already at `public/manifest.json` — update the `name`, `short_name`, `description`, and `icons` paths to match your RevStack brand if needed.

#### 4. Link Manifest in `app/layout.tsx`

Already configured — the layout exports `manifest: "/manifest.json"` in its metadata.

#### 5. Add Service Worker Registration

`next-pwa` injects the registration script automatically in production builds.

#### 6. Test PWA

Build the app:

```bash
npm run build
npm start
```

Then open Chrome DevTools → Application → Manifest to verify. Click the install icon in the address bar.

### PWA Download Process – User Guide

```markdown
## 📲 Install RevStack as an App (PWA)

You can install RevStack on your device for one‑click access, offline support, and push notifications.

### On Android (Chrome / Edge / Samsung Internet)

1. Open RevStack in your browser (e.g., `https://yourdomain.com`).
2. Tap the **three dots** menu → **Install app** (or **Add to Home screen**).
3. Confirm the name "RevStack" and tap **Install**.
4. The app icon appears on your home screen – tap to open like a native app.

### On iPhone / iPad (Safari)

1. Open RevStack in Safari.
2. Tap the **Share** button (box with arrow up).
3. Scroll down and tap **Add to Home Screen**.
4. Edit the name if desired, then tap **Add**.
5. The icon will appear on your home screen.

### On Desktop (Chrome / Edge)

1. Visit RevStack.
2. Click the **install icon** (🔽) in the address bar, or go to the Chrome menu → **Install RevStack…**.
3. Click **Install** – a standalone window opens.

### Offline Mode

Once installed, the app will cache the core UI and static assets. API calls that require network will show a friendly message when offline.

### Push Notifications (optional)

If enabled by the admin, you will receive real‑time alerts for new leads, Hermes run completions, and follow‑up reminders. Grant notification permission when prompted.
```

---

## 🐳 Docker

Mapato is fully containerized for consistent development, testing, and production environments. The Docker setup includes:

- **Multi-stage Dockerfile** — pnpm-based, Prisma-aware, non-root user
- **docker-compose.yml** — app, Redis (BullMQ), Chroma (RAG), Hermes worker services
- **docker-compose.dev.yml** — hot-reload override for local development
- **Profiles** — opt-in services (`--profile all`, `--profile workers`, `--profile rag`)

### Prerequisites

- Docker v24+ and Docker Compose v2+

### Quick Start

```bash
# 1. Clone and enter the project
git clone <repo-url> revstack
cd revstack

# 2. Copy environment template and set required variables
cp .env.example .env
# Edit .env — at minimum, set:
#   NEXTAUTH_SECRET=$(openssl rand -base64 32)

# 3. Start all services (app + Redis + Chroma + Hermes worker)
docker compose --profile all up -d

# 4. Run database setup
docker compose run --rm app pnpm run setup

# 5. Open http://localhost:3000
```

### Available Profiles

| Profile  | Services                          | When to use                          |
|----------|-----------------------------------|--------------------------------------|
| _(none)_ | app only                          | Basic app testing                    |
| `all`    | app + redis + chroma + worker     | Full stack                           |
| `workers`| app + redis + worker              | Hermes background jobs               |
| `rag`    | app + chroma                      | RAG knowledge base pipeline          |

Use profiles with:
```bash
docker compose --profile all up -d
```

### Docker Development (Hot Reload)

For local development with live code reloading, use the dev override:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d app
```

This mounts your source code into the container so Next.js hot-reload works. Changes to `src/`, `public/`, `prisma/`, and config files are reflected immediately.

For full stack dev with all services:
```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml --profile all up -d
```

### Common Docker Commands

```bash
# Build images (no cache)
docker compose build --no-cache

# Start services
docker compose up -d

# View logs
docker compose logs -f app

# Run one-off commands (e.g., seed RAG)
docker compose run --rm app pnpm tsx scripts/seed-rag.ts

# Run tests
docker compose run --rm app npx vitest run

# Open a shell inside the container
docker compose exec app sh

# Stop all services
docker compose down

# Stop and remove volumes (WARNING: deletes data)
docker compose down -v
```

### Services Overview

#### 1. App (`app`)
The main Next.js application container. Built from the multi-stage Dockerfile with:
- pnpm for dependency management
- Prisma client generation at build time
- Non-root `nextjs` user for security
- Health check at `/api/health`
- SQLite database persisted via Docker volume

#### 2. Redis (`redis`)
In-memory data store for BullMQ job queue. Required when running Hermes background workers.
- Port: `6379`
- Persisted via `redis-data` volume
- Health-checked with `redis-cli ping`

#### 3. Chroma (`chroma`)
Vector database for the RAG (Retrieval-Augmented Generation) knowledge base.
- Port: `8000`
- Persisted via `chroma-data` volume
- Telemetry disabled by default

#### 4. Hermes Worker (`hermes-worker`)
Background job processor for the Hermes autonomous agent. Processes BullMQ jobs from Redis.
- Requires Redis (`depends_on`)
- Set `RUN_WORKER=true`
- Uses the same codebase and environment as the app

### Environment Variables for Docker

Create a `.env` file in the project root (copied from `.env.example`). The docker-compose file reads variables from this file automatically.

**Minimum required:**
```bash
NEXTAUTH_SECRET=your-random-secret-here
```

**Set at least one LLM provider** (for AI agent features):
```bash
NVIDIA_NIM_API_KEY=nvapi-your-key
# or
DEEPSEEK_API_KEY=sk-your-key
# or
OPENAI_API_KEY=sk-your-key
```

All other variables are optional. Services that are not configured run in simulation mode.

### Dockerfile Details

The `Dockerfile` uses a multi-stage build:

| Stage     | Description                                      |
|-----------|--------------------------------------------------|
| `base`    | Node.js 20 Alpine + pnpm via corepack            |
| `deps`    | Installs all dependencies (cached for speed)     |
| `builder` | Generates Prisma client + builds Next.js app     |
| `runner`  | Production image — minimal, non-root, ready to run |

Build just the runner stage:
```bash
docker compose build app
```

Or build manually:
```bash
docker build --target runner -t mapato .
docker run -p 3000:3000 --env-file .env mapato
```

### Production Deployment

For production deployment on a VPS or cloud server:

```bash
# Clone on server
git clone <repo-url> revstack
cd revstack

# Configure environment
cp .env.example .env
# Edit .env with production values (set DATABASE_URL for PostgreSQL, etc.)

# Start services
docker compose --profile all up -d

# Verify health
curl http://localhost:3000/api/health
```

#### Reverse Proxy (Nginx)

For production, place Nginx in front of the app:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 🌐 Key Integrations

## 🌐 Key Integrations

| Service | Type | Status | Agent |
|---------|------|--------|-------|
| **WATI.io** | WhatsApp Business API | ⚙️ Needs credentials | Lead |
| **Zoho CRM** | CRM sync | ⚙️ Needs credentials | Lead, Onboarding, Revenue |
| **Instantly.ai** | Cold email outreach | ⚙️ Needs credentials | Lead |
| **Voiceflow** | AI chatbot dialogs | ⚙️ Needs credentials | Lead, Compliance, Onboarding |
| **Sokogate** | B2B trade platform | ⚙️ Needs credentials | Trade |
| **Make.com** | Workflow automation | ⚙️ Needs webhooks | All agents |
| **NVIDIA NIM** | Free LLM | ✅ Configured | All agents |
| **QMe** | Document processing | ✅ Live (local) | Compliance, Onboarding |
| **RAG** | Knowledge base | ✅ Live (local) | Revenue |
| **Ethereal** | Dev email | ✅ Live (dev) | Onboarding |
| **Flutterwave** | Payments | ✅ Auto-simulates | Subscription |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Install dependencies: `pnpm install`
4. Set up environment: `cp .env.example .env.local`
5. Run setup: `npm run setup`
6. Make changes
7. Ensure tests pass: `npx vitest run`
8. Ensure TypeScript is clean: `npx tsc --noEmit --skipLibCheck`
9. Commit with [conventional commits](https://www.conventionalcommits.org/)
10. Open a pull request

### Before submitting

- [ ] `npx vitest run` — all tests pass
- [ ] `npx tsc --noEmit --skipLibCheck` — 0 errors
- [ ] `npm run lint` — no warnings
- [ ] New features include tests
- [ ] API changes include ABAC policy updates

---

## 📝 License

Private — Mapato / RevStack
