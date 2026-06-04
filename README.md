# Mapato — AI-Powered Revenue Operations for B2B Trading Companies

**Mapato** delivers a seamless, everlasting, and euphoric AI-powered revenue operations experience for B2B trading companies — inspired by [Polsia.com](https://polsia.com)'s autonomous business model at a fraction of the cost.

Mapato is a collaborative automation platform co-built by [Sokogate.com](https://sokogate.com) and [UltimoTradingLtd.co.ke](https://ultimotradingltd.co.ke) — combining Sokogate's B2B wholesale sourcing marketplace with Ultimo Trading's operational expertise to create an AI-powered revenue operations system for B2B trading companies.

Like Polsia, Mapato runs on a low monthly subscription + success fee model — but at **half the revenue share** (10% vs Polsia's 20%). While Polsia automates e-commerce businesses, Mapato is purpose-built for WhatsApp-driven B2B trade operations across Africa and emerging markets.

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** v20+ (recommended: v22)
- **npm** v10+

### 1. Clone and install

```bash
git clone <repo-url> revstack
cd revstack
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local` and set at minimum:
- `NEXTAUTH_SECRET` — generate with `openssl rand -base64 32`
- `NEXTAUTH_URL` — `http://localhost:3000` for local dev
- `NEXT_PUBLIC_BASE_URL` — `http://localhost:3000` (required for OG images + sitemap)

For optional features (all come pre-configured with safe defaults):
- **Sentry error tracking**: Set `SENTRY_DSN` (leave blank to disable)
- **Bing Webmaster Tools**: Set `NEXT_PUBLIC_BING_VERIFICATION` (leave blank to skip)
- **Analytics**: Set `NEXT_PUBLIC_ANALYTICS_PROVIDER` to `"plausible"`, `"ga4"`, `"posthog"`, or `"custom"`
- **OG Images**: `NEXT_PUBLIC_BASE_URL` defaults to `http://localhost:3000`

### 3. Set up the database

```bash
npm run setup
```

This pushes the Prisma schema to a local SQLite database and seeds it with demo data (admin user, demo clients, products, compliance records, financial data, and Korea corridor pilot cohorts).

### 4. Start development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to login.

### 5. Log in with the demo account

| Email | Password | Role |
|-------|----------|------|
| `admin@aibusinessos.com` | `admin123` | Admin |

---

## 🧪 How to Test Everything Locally

### Run the test suite

```bash
# Run all 94 tests
npx vitest run

# Run a specific test file
npx vitest run src/lib/agent-service-bridge.test.ts
npx vitest run src/lib/ers-scoring.test.ts
npx vitest run src/app/api/documents/documents.test.ts

# Run in watch mode during development
npx vitest
```

### TypeScript check

```bash
npx tsc --noEmit --skipLibCheck
```

Expected result: **0 errors**.

---

### 🔐 Test ABAC (Attribute-Based Access Control)

ABAC is wired into **36 API route files** using `withAuth()` / `withAbac()` middleware.

**As admin user (`admin@aibusinessos.com`):**
1. Visit `/admin` — full access to Users, Audit Log, Payments, Trial Users, **Retention** (new!), Follow-ups, and God Mode tabs
2. Visit `/korea/inquiries` — view all Korean buyer inquiries
3. Visit `/operations` — full God Mode agent deployment access
4. Change another user's role in the admin Users tab
5. Try the **Retention tab** — shows sign-up trends, daily logins, activation rate, churn risk, and weekly retention cohorts

**As regular user (sign up a new account):**
1. Sign up at `/signup` → complete onboarding at `/onboarding`
2. Visit `/dashboard` — your personal dashboard scoped to your data
3. Visit `/admin` — should be blocked with "Access Denied" (redirects to `/dashboard`)
4. Visit `/api/admin/retention` — returns 403 (admin-only endpoint)

**Verify the ABAC middleware error handling:**
- Call an authenticated API route without a session → get `401 { error: "Authentication required" }`
- Call an admin-only route as a regular user → get `403 { error: "...", code: "access_denied" }`
- Trigger a DB error → get `500 { error: "..." }` (middleware catch block)

---

### 📊 Test Analytics Tracking

Analytics events are logged to the console in development mode:

```bash
# Start the server
npm run dev

# Watch for analytics log output
# These will appear in the terminal:
[Analytics] user_signed_up: { ... }
[Analytics] onboarding_completed: { ... }
```

**Test the tracking flow:**
1. Sign up a new user → check terminal for `[Analytics] user_signed_up`
2. Complete onboarding → check for `[Analytics] onboarding_completed`
3. Log in/log out → `lastLoginAt` is updated on the User model (check via admin panel or DB)

**Retention dashboard:**
1. Log in as admin → go to `/admin` → click **Retention** tab
2. You should see: total users, new users (7d/30d), login rate %, active users, at-risk/churned users
3. Daily login/signup bar charts for the last 14 days
4. Weekly retention cohorts table
5. Recent login activity list

---

### 🖼️ Test Open Graph & Social Sharing

**Verify OG tags in the page head:**
```bash
curl -s http://localhost:3000 | grep -E 'og:|twitter:' | head -20
```

Expected output includes: `og:title`, `og:description`, `og:image`, `og:url`, `og:type`, `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`

**Test the OG image endpoint:**
```bash
# Generate a dynamic OG image (1200×630 PNG)
curl -s -o /tmp/og-test.png http://localhost:3000/opengraph-image
file /tmp/og-test.png
# Expected: PNG image data, 1200 x 630
```

**Test with the [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)** (when deployed):
- Enter your deployed URL → scrape → verify the preview looks correct

---

### 🗺️ Test Sitemap

```bash
# Build and start production server (sitemap is only served in production)
npm run build && npm start
# In another terminal:
curl -s http://localhost:3000/sitemap.xml | head -40
```

Expected: XML sitemap with 17+ routes, each with `<loc>`, `<changefreq>`, `<priority>`, and `<lastmod>` tags.

> Note: The sitemap is only served in production mode (`npm run build && npm start`). In dev mode, verify the sitemap logic by checking `src/app/sitemap.ts`.

---

### 🔍 Test Bing Webmaster Tools Verification

```bash
# Check for the Bing verification meta tag
curl -s http://localhost:3000 | grep "msvalidate"
```

Expected: `<meta name="msvalidate.01" content="..." />` (content will be empty unless `NEXT_PUBLIC_BING_VERIFICATION` is set in `.env`).

---

### 🚨 Test Sentry Error Tracking

Sentry is configured with `@sentry/nextjs` but **auto-disabled until you set `SENTRY_DSN`**.

```bash
# Verify Sentry config files exist
ls sentry.client.config.ts sentry.server.config.ts
```

To enable Sentry:
1. Create a project at [sentry.io](https://sentry.io)
2. Copy your DSN
3. Add to `.env`: `SENTRY_DSN="https://..."`

Once enabled, errors in API routes and client components will automatically be captured.

---

### 📧 Test Email Deliverability

A comprehensive guide is at [`EMAIL-DELIVERABILITY-GUIDE.md`](./EMAIL-DELIVERABILITY-GUIDE.md).

**Locally**, email goes through Ethereal (dev fallback) by default:
```bash
# Emails appear in the terminal output
npm run dev
# Watch for: "Preview URL: https://ethereal.email/message/..."
```

**For production deliverability:**
1. Follow the SPF/DKIM/DMARC setup in `EMAIL-DELIVERABILITY-GUIDE.md`
2. Configure your SMTP credentials in `.env`
3. Test with [mail-tester.com](https://www.mail-tester.com) after deployment

---

### 👤 Test Support Email & Legal Pages

- **Contact info**: `src/lib/contact-info.ts` has `CONTACT_INFO.email = "bangali@ultimotradingltd.co.ke"`
- **Privacy policy**: Visit `/privacy` — references the support email
- **Terms of service**: Visit `/terms` — references the support email
- **Cookie consent**: Visit any page → the cookie consent banner appears at the bottom
  - Accept → preference saved to localStorage
  - Decline → tracking scripts are disabled

---

### 🔄 Test the God Mode Agent Orchestrator

1. Log in as admin → go to `/operations`
2. Click **Quick Deploy All** or **Custom Deploy**
3. Watch agent tasks execute in real-time with progress bars
4. Visit the admin panel's **God Mode** tab to pause/resume/stop sessions
5. View agent reports with insights and metrics

---

### 💳 Test Payment Flow (Flutterwave Sandbox)

The payment system is configured for Flutterwave sandbox by default:
1. Go to `/pricing` → select a plan → **Subscribe**
2. Choose **M-Pesa**, **Mobile Money**, or **Card**
3. For card testing in sandbox, use: `4242 4242 4242 4242`, any future expiry, any CVV
4. Payment status polling at `/api/payments/status?tx_ref=...`

Note: Actual charges only occur in production with live Flutterwave credentials.

---

## 📦 Environment Variables Reference

The application uses 20+ environment variables across several functional groups. Copy `.env.example` to `.env.local` and configure as needed.

### Required

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | Database connection string | `file:./dev.db` (SQLite) |
| `NEXTAUTH_SECRET` | JWT encryption secret (generate with `openssl rand -base64 32`) | — |
| `NEXTAUTH_URL` | Public deployment URL | `http://localhost:3000` |
| `NEXT_PUBLIC_BASE_URL` | Base URL for OG images and sitemap | `http://localhost:3000` |

### AI Features (for God Mode, RAG, agent memory)

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | OpenAI API key for LangChain-based agents and RAG pipeline |

> The app runs without this key — AI agent features (God Mode, RAG, agent memory) are gracefully disabled.

### Authentication & SSO

| Variable | Description |
|----------|-------------|
| `GOOGLE_CLIENT_ID` | Google OAuth client ID for Google Sign-In |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |

### Third-Party Integrations

| Variable | Service | Used By |
|----------|---------|---------|
| `WATI_API_TOKEN` | WATI.io (WhatsApp Business API) | Lead qualification, follow-ups |
| `WATI_WHATSAPP_NUMBER_ID` | WATI.io WhatsApp number ID | Lead qualification, follow-ups |
| `MAKE_*_WEBHOOK` (6 webhooks) | Make.com (workflow automation) | Lead capture, compliance alerts, reporting |
| `ZOHO_CLIENT_ID` / `ZOHO_CLIENT_SECRET` / `ZOHO_REFRESH_TOKEN` | Zoho CRM | Lead, Onboarding, Revenue agents |
| `VOICEFLOW_API_KEY` / `VOICEFLOW_PROJECT_ID` | Voiceflow (AI chatbot) | Lead qualification, onboarding |
| `SOKOGATE_API_KEY` / `SOKOGATE_API_SECRET` | Sokogate (B2B trade) | Trade Agent |
| `INSTANTLY_API_KEY` | Instantly.ai (cold email) | Outreach campaigns |
| `QME_API_KEY` | QMe (document processing) | Compliance document collection |

### Payments (Flutterwave)

| Variable | Description |
|----------|-------------|
| `FLW_PUBLIC_KEY` | Flutterwave public key (sandbox or live) |
| `FLW_SECRET_KEY` | Flutterwave secret key |
| `FLW_ENCRYPTION_KEY` | Flutterwave encryption key |
| `FLW_WEBHOOK_HASH` | Webhook signature hash from Flutterwave dashboard |

> **Note**: If no Flutterwave keys are set, payments auto-simulate (3-second delay, auto-activate subscription) for local development.

### Email (SMTP)

| Variable | Description | Default |
|----------|-------------|---------|
| `SMTP_HOST` | SMTP server hostname | `smtp.ethereal.email` |
| `SMTP_PORT` | SMTP port | `587` |
| `SMTP_USER` | SMTP username | — |
| `SMTP_PASS` | SMTP password | — |
| `SMTP_SECURE` | Use TLS (`true`/`false`) | `false` |

> **Dev default**: Ethereal email (messages logged to console with preview URL). No real emails sent.

### Observability

| Variable | Description |
|----------|-------------|
| `SENTRY_DSN` | Sentry DSN for server-side error tracking (leave blank to disable) |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry DSN for client-side error tracking |
| `SENTRY_ENVIRONMENT` | Environment tag for Sentry events |
| `NEXT_PUBLIC_ANALYTICS_PROVIDER` | Analytics provider: `plausible`, `ga`, `posthog`, or `custom` |
| `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` | Plausible analytics domain |
| `NEXT_PUBLIC_GA_ID` | Google Analytics 4 measurement ID |
| `NEXT_PUBLIC_POSTHOG_KEY` | PostHog project API key |

### Push Notifications (PWA)

| Variable | Description |
|----------|-------------|
| `VAPID_PUBLIC_KEY` | VAPID public key (generate with `npx web-push generate-vapid-keys`) |
| `VAPID_PRIVATE_KEY` | VAPID private key |
| `VAPID_SUBJECT` | Mailto link for push notification sender identity |

### SEO & Verification

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_GOOGLE_VERIFICATION` | Google Search Console verification code |
| `NEXT_PUBLIC_BING_VERIFICATION` | Bing Webmaster Tools verification code |
| `NEXT_PUBLIC_YANDEX_VERIFICATION` | Yandex Webmaster verification code |
| `NEXT_PUBLIC_FACEBOOK_VERIFICATION` | Facebook domain verification code |
| `NEXT_PUBLIC_BASE_URL` | Base URL for sitemap and OG images |

### Admin & Infrastructure

| Variable | Description |
|----------|-------------|
| `ADMIN_EMAIL` | Override default admin email for `npm run setup` |
| `ADMIN_PASSWORD` | Override default admin password for `npm run setup` |
| `CRON_SECRET` | Secret header for securing cron webhook endpoints |
| `GOOGLE_SHEET_ID` | Google Sheets workbook ID for admin review exports |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Service account email for Google Sheets API |
| `GOOGLE_PRIVATE_KEY` | Service account private key for Google Sheets API |

---

## 🚢 Deployment Guide

### Prerequisites

- **Node.js** v20+ (recommended: v22)
- **PostgreSQL** 14+ (production) or SQLite (dev)
- **npm** v10+

### Step 1: Configure production environment

```bash
cp .env.example .env
```

Set `DATABASE_URL` to your PostgreSQL connection string:
```
DATABASE_URL="postgresql://user:password@host:5432/mapato?schema=public"
```

### Step 2: Build and run

```bash
# Install dependencies
npm install

# Push schema to PostgreSQL
npx prisma db push

# Build the Next.js app
npm run build

# Start the production server
npm start
```

### Step 3: Set up Sentry (optional)

1. Create a project at [sentry.io](https://sentry.io)
2. Copy your DSN to `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN` in `.env`
3. Errors in API routes and client components are automatically captured

### Step 4: Set up analytics (optional)

Configure one analytics provider in `.env`:
```
NEXT_PUBLIC_ANALYTICS_PROVIDER=plausible
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=yourdomain.com
```

Supported providers: Plausible, Google Analytics 4, PostHog, or custom endpoint.

### Step 5: Configure cron jobs

The following cron endpoints are secured with `CRON_SECRET`:

| Endpoint | Schedule | Purpose |
|----------|----------|---------|
| `/api/cron/trial-expiry` | Daily | Check for expired trials and downgrade/notify |
| `/api/cron/subscription-followups` | Daily at 8 AM UTC | Send subscription renewal reminders |

A GitHub Actions workflow (`.github/workflows/cron-subscription-followups.yml`) calls the follow-ups endpoint daily. Set `CRON_SECRET` and `APP_URL` in your GitHub repository secrets.

### Process management (recommended)

For production, use a process manager like [PM2](https://pm2.keymetrics.io/):

```bash
npm install -g pm2
pm2 start npm --name "mapato" -- start
pm2 save
pm2 startup
```

### Docker (optional)

For containerized deployment, create a `Dockerfile` at the project root:

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate && npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

Build and run with:
```bash
docker build -t mapato .
docker run -p 3000:3000 --env-file .env mapato
```

---

## 🤖 CI/CD — GitHub Actions

The project includes a GitHub Actions workflow for automated subscription follow-ups.

### Workflow: Subscription Follow-ups

| Trigger | Schedule | File |
|---------|----------|------|
| Scheduled | Daily at 8:00 AM UTC | `.github/workflows/cron-subscription-followups.yml` |
| Manual | `workflow_dispatch` via GitHub UI | `.github/workflows/cron-subscription-followups.yml` |

This workflow calls the `/api/cron/subscription-followups` endpoint to send renewal reminders. It requires two GitHub repository secrets:

| Secret | Description |
|--------|-------------|
| `APP_URL` | Base URL of your deployed app (e.g., `https://mapato.app`) |
| `CRON_SECRET` | Must match `CRON_SECRET` in your app's `.env` |

### Adding new workflows

To add a new cron workflow:

```yaml
# .github/workflows/my-cron.yml
name: My Cron Job
on:
  schedule:
    - cron: '0 0 * * *'  # Every day at midnight UTC
  workflow_dispatch:

jobs:
  run:
    runs-on: ubuntu-latest
    steps:
      - name: Call endpoint
        run: |
          curl --fail -s -X GET "${{ secrets.APP_URL }}/api/cron/my-endpoint" \
            -H "x-cron-secret: ${{ secrets.CRON_SECRET }}"
```

### Security

All cron endpoints are authenticated via the `x-cron-secret` header, which must match the `CRON_SECRET` environment variable on the server. The `--fail` flag ensures the job fails on non-200 responses.

---

## 🗄️ Database & Migrations

### Schema overview

The Prisma schema (`prisma/schema.prisma`) defines the following models:

| Model | Purpose |
|-------|---------|
| `User` | Platform users with roles, subscription status, login tracking |
| `Client` | B2B client companies (suppliers) with contact details |
| `Product` | Products/commodities linked to clients |
| `ComplianceRecord` | Compliance certifications and gaps for each client |
| `TradeFinanceRecord` | Trade finance applications and status tracking |
| `ErsSnapshot` | Historical Export Readiness Score snapshots |
| `PipelineAction` | CRM pipeline stage actions and updates |
| `OutreachCampaign` | Campaign templates and run history |
| `ContentArticle` | SEO content calendar articles |
| `RevenueRecord` | Revenue projections and actuals |
| `Subscription` | User subscription tiers and status |
| `KoreaTarget` | Korean buyer procurement targets |
| `KoreaCohort` | Korea corridor pilot cohort groups |
| `KoreaParticipant` | Cohort participant companies |
| `KoreaInquiry` | Korean buyer inquiries |
| `AdminAuditLog` | Admin action audit trail |
| `Document` | Uploaded documents with filesystem storage |

### Common operations

```bash
# After modifying schema.prisma, push changes to the database
npm run db:push

# Regenerate Prisma client (auto-run after push)
npm run db:generate

# Re-seed with demo data (resets existing data)
npm run db:seed

# Full setup (push + seed all)
npm run setup
```

### SQLite vs PostgreSQL

| Feature | SQLite (dev) | PostgreSQL (production) |
|---------|-------------|------------------------|
| Setup | Zero config (file-based) | Requires running PostgreSQL instance |
| `DATABASE_URL` | `file:./dev.db` | `postgresql://user:pass@host/db` |
| Concurrent writes | Limited | Full support |
| Extensions | None | PostGIS, pgcrypto, etc. |

Export data from SQLite to PostgreSQL:
```bash
npx prisma db push --accept-data-loss  # Push schema
npx prisma db seed                      # Re-seed if needed
```

---

## 📖 Architecture

```
RevStack/
├── middleware.ts             # Root middleware (re-exports handler from proxy.ts, config inline)
├── proxy.ts                  # Edge-compatible middleware handler (auth redirect, rate limit, security headers)
├── prisma/                   # Database schema & seeds
│   ├── schema.prisma         # All models (User, Client, Organization, Product, Compliance, etc.)
│   ├── seed.ts               # Main seed (demo clients, products, compliance, finance)
│   └── seed-korea.ts         # Korea corridor pilot cohort seed (20 companies)
├── src/
│   ├── app/                  # Next.js App Router pages & API routes
│   │   ├── layout.tsx        # Root layout (server component — only imports <Providers> wrapper)
│   │   ├── globals.css       # Tailwind + CSS custom properties + dark/light themes
│   │   ├── api/              # REST API endpoints (40+ routes, all ABAC-protected)
│   │   ├── admin/            # Admin panel (7 tabs: Users, Audit, Payments, Trials, Retention, Follow-ups, God Mode)
│   │   ├── korea/            # Korea Corridor dashboard
│   │   ├── trade/            # Trade & Export Readiness
│   │   ├── dashboard/        # Main analytics dashboard
│   │   ├── templates/        # Automation template library + deploy
│   │   └── ...               # Pipeline, Plan, Outreach, Content, Financial, etc.
│   ├── components/           # Reusable UI components
│   │   ├── providers.tsx     # Single "use client" wrapper bundling ALL client providers
│   │   ├── ui/               # shadcn/ui primitives
│   │   └── ...               # AuthProvider (merged with OrgProvider), Sidebar, Dashboard, etc.
│   ├── lib/                  # Shared libraries & utilities
│   │   ├── abac.ts           # ABAC policy engine (18 resources, 5 actions)
│   │   ├── abac-middleware.ts  # withAuth() / withAbac() route wrappers
│   │   ├── csrf.ts           # Stateless CSRF protection (HMAC-signed tokens)
│   │   ├── rate-limiter.ts   # In-memory sliding-window rate limiter
│   │   ├── security-headers.ts  # CSP, HSTS, XFO, Referrer-Policy, Permissions-Policy
│   │   ├── auth.ts           # NextAuth v5 configuration + JWT callbacks
│   │   ├── agent-orchestrator.ts  # God Mode autonomous agent system
│   │   ├── agent-service-bridge.ts  # Integration bridge (WATI, Zoho, Voiceflow, etc.)
│   │   └── ...               # ERS scoring, supplier matching, email, pricing, templates, etc.
├── sentry.client.config.ts   # Sentry client config (disabled without DSN)
├── sentry.server.config.ts   # Sentry server config (disabled without DSN)
├── .env.example              # Environment template with all documented env vars
├── vitest.config.ts          # Test configuration
└── package.json
```

---

## 🧪 Test Files

| File | Tests | Description |
|------|-------|-------------|
| `src/lib/ers-scoring.test.ts` | 23 | ERS dimensions, edge cases, serialization |
| `src/lib/agent-service-bridge.test.ts` | 12 | All 5 agent plugins (Lead, Trade, Compliance, Onboarding, Revenue) |
| `src/app/api/documents/documents.test.ts` | 6 | Document CRUD + filesystem fallback + path traversal |
| `src/app/api/pipeline-actions/pipeline-actions.test.ts` | 7 | Pipeline action CRUD |
| `src/app/api/content/content.test.ts` | 5 | Content article CRUD |
| `src/lib/pricing.test.ts` | 37 | Pricing tiers, budget suggestions, onboarding-based suggestions |
| **Total** | **94** | All passing ✅ |

---

## 🔐 Security

- **ABAC (Attribute-Based Access Control)**: Centralized policy engine covering 18 resources with 5 actions (read/write/admin/deploy/manage)
- **Authentication**: NextAuth v5 with JWT strategy + credentials + Google SSO
- **API protection**: All route handlers use `withAuth()` or `withAbac()` middleware — no ad-hoc `auth()` calls
- **Route protection**: Edge-compatible middleware (`proxy.ts`) redirects unauthenticated users to `/login`, applies rate limiting, and injects security headers (CSP, HSTS, XFO, etc.)
- **CSRF protection**: Stateless HMAC-signed CSRF tokens via `src/lib/csrf.ts` — cookie-to-header validation on all mutating API requests
- **Rate limiting**: In-memory sliding-window rate limiter with path-prefix granularity (strictest on auth endpoints: 5 POST/min on signup)
- **Admin routes**: `/admin`, `/api/admin/*`, `/korea/inquiries` require admin role (enforced by ABAC)
- **Data isolation**: Row-level filtering by `userId` prevents data leakage
- **Error handling**: ABAC middleware catches all handler errors → returns JSON 500 with safe error messages
- **Password hashing**: bcryptjs with 12 salt rounds
- **Environment**: `.env` is gitignored; use `.env.example` as a template

---

## 📋 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Next.js dev server on port 3000 |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run setup` | Push DB schema + run all seeds |
| `npm run db:push` | Push Prisma schema to DB (creates tables) |
| `npm run db:seed` | Run main seed (demo data) |
| `npm run db:generate` | Regenerate Prisma client |
| `npm run lint` | Run ESLint |
| `npx tsc --noEmit --skipLibCheck` | TypeScript check (should be 0 errors) |
| `npx vitest run` | Run all 94 tests |
| `npx vitest` | Run tests in watch mode |
| `npx vitest run src/lib/pricing.test.ts` | Run a specific test file |

---

## 🌐 Key Pages

| Route | Description | Auth Required | ABAC Policy |
|-------|-------------|---------------|-------------|
| `/dashboard` | Main analytics dashboard | ✅ | dashboard:read |
| `/pipeline` | Pipeline CRM | ✅ | pipeline:read |
| `/trade` | Products, compliance, ERS, trade finance | ✅ | trade:read |
| `/korea` | Korea Corridor dashboard | ✅ | korea:read |
| `/admin` | Admin panel (7 tabs) | ✅ | admin:read |
| `/operations` | God Mode agent orchestrator | ✅ | operations:read |
| `/financial` | Revenue model & projections | ✅ | financial:read |
| `/outreach` | Campaign templates & management | ✅ | outreach:read |
| `/plan` | 75-Day implementation plan | ✅ | plan:read |
| `/content` | SEO content calendar | ✅ | content:read |
| `/pricing` | Subscription plans & checkout | ✅ | pricing:read |
| `/onboarding` | User onboarding flow | ✅ | onboarding:write |
| `/templates` | Automation template library | ✅ | — |
| `/docs` | Platform documentation | ✅ | docs:read |

---

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript (strict mode)
- **Database**: SQLite (dev) / PostgreSQL (prod) via Prisma
- **Auth**: NextAuth v5 (JWT + Credentials + Google SSO) + ABAC policy engine
- **UI**: Tailwind CSS + shadcn/ui + Framer Motion
- **Charts**: Recharts
- **Icons**: Lucide React
- **Email**: Nodemailer (Ethereal dev fallback)
- **Testing**: Vitest (94 tests, all passing)
- **Error Tracking**: Sentry (auto-disabled without DSN)
- **Analytics**: Generic service (Plausible / GA4 / PostHog / custom)
- **SEO**: Dynamic sitemap.xml + OG image generation + Bing Webmaster Tools
- **AI**: LangChain.js (optional, for RAG pipeline + agent orchestration)

---

## 🤝 Contributing

### Getting started

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Install dependencies: `npm install`
4. Set up your environment: `cp .env.example .env.local`
5. Run the setup: `npm run setup`
6. Make your changes
7. Ensure tests pass: `npx vitest run`
8. Ensure TypeScript is clean: `npx tsc --noEmit --skipLibCheck`
9. Commit and push, then open a pull request

### Code style

- **TypeScript**: Strict mode enabled. Avoid `any` types — prefer proper interfaces.
- **API routes**: Use `withAuth()` / `withAbac()` middleware wrappers — never use `auth()` directly.
- **Components**: Use the existing shadcn/ui primitives from `src/components/ui/`.
- **Imports**: Use `@/` path aliases (e.g., `import { db } from "@/lib/db"`).
- **Tests**: Place test files next to the code they test (e.g., `route.test.ts` next to `route.ts`).

### Commit messages

Follow [conventional commits](https://www.conventionalcommits.org/):

```
feat: add Korea corridor buyer inquiry endpoint
fix: correct ERS scoring zero-division edge case
chore: update env.example with Sentry DSN docs
docs: add deployment guide to README
test: add pricing tier boundary tests
```

### Before submitting

- [ ] Run `npx vitest run` — all tests pass
- [ ] Run `npx tsc --noEmit --skipLibCheck` — 0 errors
- [ ] Run `npm run lint` — no warnings
- [ ] New features include tests
- [ ] API changes include ABAC policy updates

---

## 📝 License

Private — Mapato
