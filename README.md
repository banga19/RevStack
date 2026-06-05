# Mapato / RevStack — AI-Powered Revenue Operations for B2B Trading

**Mapato** (also referred to as **RevStack**) delivers an AI-powered revenue operations platform for B2B trading companies — inspired by [Polsia.com](https://polsia.com)'s autonomous business model at a fraction of the cost.

Mapato is co-built by [Sokogate.com](https://sokogate.com) and [UltimoTradingLtd.co.ke](https://ultimotradingltd.co.ke) — combining Sokogate's B2B wholesale sourcing marketplace with Ultimo Trading's operational expertise.

Like Polsia, Mapato runs on a low monthly subscription + success fee model — but at **half the revenue share** (10% vs Polsia's 20%). While Polsia automates e-commerce businesses, Mapato is purpose-built for WhatsApp-driven B2B trade operations across Africa and emerging markets.

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** v20+ (recommended: v22)
- **npm** v10+ or **pnpm** v9+

### 1. Clone and install

```bash
git clone <repo-url> revstack
cd revstack

# Using npm:
npm install

# Or using pnpm (recommended for workspace support):
pnpm install
```

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
