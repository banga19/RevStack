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

## 📖 Architecture

```
RevStack/
├── prisma/                  # Database schema & seeds
│   ├── schema.prisma        # All models (User, Client, Product, Compliance, etc.)
│   ├── seed.ts              # Main seed (demo clients, products, compliance, finance)
│   └── seed-korea.ts        # Korea corridor pilot cohort seed (20 companies)
├── src/
│   ├── app/                 # Next.js App Router pages & API routes
│   │   ├── api/             # REST API endpoints (36 routes, all ABAC-protected)
│   │   ├── admin/           # Admin panel (7 tabs: Users, Audit, Payments, Trials, Retention, Follow-ups, God Mode)
│   │   ├── korea/           # Korea Corridor dashboard
│   │   ├── trade/           # Trade & Export Readiness
│   │   ├── dashboard/       # Main analytics dashboard
│   │   └── ...              # Pipeline, Plan, Outreach, Content, Financial, etc.
│   ├── components/          # Reusable UI components
│   │   ├── ui/              # shadcn/ui primitives
│   │   ├── retention-dashboard.tsx  # Retention analytics (admin)
│   │   ├── analytics-tracker.tsx    # Page view tracking
│   │   └── ...              # AuthenticatedShell, SubscriptionGate, PaymentCheckout, etc.
│   ├── lib/                 # Shared libraries & utilities
│   │   ├── abac.ts          # ABAC policy engine (18 resources, 5 actions)
│   │   ├── abac-middleware.ts  # withAuth() / withAbac() route wrappers
│   │   ├── use-abac.ts      # Client-side useAbac() hook
│   │   ├── analytics.ts     # Generic analytics service (Plausible/GA4/PostHog)
│   │   ├── auth.ts          # NextAuth configuration + login retention tracking
│   │   ├── agent-orchestrator.ts  # God Mode autonomous agent system
│   │   ├── agent-service-bridge.ts  # Integration bridge (WATI, Zoho, Voiceflow, etc.)
│   │   └── ...              # ERS scoring, supplier matching, email, etc.
│   └── middleware.ts        # Route protection (auth redirect)
├── sentry.client.config.ts  # Sentry client config (disabled without DSN)
├── sentry.server.config.ts  # Sentry server config (disabled without DSN)
├── EMAIL-DELIVERABILITY-GUIDE.md  # SPF/DKIM/DMARC setup guide
├── .env.example             # Environment template with all documented env vars
├── vitest.config.ts         # Test configuration
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
- **Route protection**: Middleware redirects unauthenticated users to `/login`
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
| `/docs` | Platform documentation | ✅ | docs:read |

---

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router)
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

## 📝 License

Private — Mapato
# RevStack
