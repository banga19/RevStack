# Mapato — AI-Powered Revenue Operations for B2B Trading Companies

**Mapato** delivers a seamless, everlasting, and euphoric AI-powered revenue operations experience for B2B trading companies — inspired by [Polsia.com](https://polsia.com)'s autonomous business model at a fraction of the cost.

Mapato is a collaborative automation platform co-built by [Sokogate.com](https://sokogate.com) and [UltimoTradingLtd.co.ke](https://ultimotradingltd.co.ke) — combining Sokogate's B2B wholesale sourcing marketplace with Ultimo Trading's operational expertise to create an AI-powered revenue operations system for B2B trading companies.

Like Polsia, Mapato runs on a low monthly subscription + success fee model — but at **half the revenue share** (10% vs Polsia's 20%). While Polsia automates e-commerce businesses, Mapato is purpose-built for WhatsApp-driven B2B trade operations across Africa and emerging markets.

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
cp .env.example .env
```

Edit `.env` and set at minimum:
- `NEXTAUTH_SECRET` — generate with `openssl rand -base64 32`
- `NEXTAUTH_URL` — `http://localhost:3000` for local dev

### 3. Set up the database

```bash
npm run setup
```

This pushes the Prisma schema to a local SQLite database and seeds it with demo data.

### 4. Start development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to login.

### 5. Log in with the demo account

| Email | Password | Role |
|-------|----------|------|
| `admin@aibusinessos.com` | `admin123` | Admin |

## 📖 Architecture

```
RevStack/
├── prisma/                  # Database schema & seeds
│   ├── schema.prisma        # All models (User, Client, Product, Compliance, etc.)
│   ├── seed.ts              # Main seed (demo clients, products, compliance, finance)
│   └── seed-korea.ts        # Korea corridor pilot cohort seed (20 companies)
├── src/
│   ├── app/                 # Next.js App Router pages & API routes
│   │   ├── api/             # REST API endpoints
│   │   │   ├── auth/        # Signup, login, NextAuth handlers
│   │   │   ├── clients/     # CRUD for clients, products, compliance, trade finance
│   │   │   ├── korea/       # Korean targets, cohorts, participants, inquiries
│   │   │   ├── ers/         # ERS snapshots history
│   │   │   └── health/      # Health check
│   │   ├── korea/           # Korea Corridor dashboard
│   │   │   ├── page.tsx     # Main dashboard (pipeline, pilot, analytics)
│   │   │   ├── buyers/      # Korean buyer-facing landing page
│   │   │   └── inquiries/   # Admin panel for buyer inquiries
│   │   ├── trade/           # Trade & Export Readiness (products, compliance, ERS, finance)
│   │   ├── pipeline/        # Pipeline CRM
│   │   ├── dashboard/       # Main dashboard
│   │   ├── plan/            # 75-Day Plan tracker
│   │   ├── outreach/        # Outreach campaigns
│   │   ├── content/         # Content calendar
│   │   ├── financial/       # Financial model
│   │   ├── onboarding/      # User onboarding flow
│   │   ├── signup/          # Registration
│   │   └── login/           # Authentication
│   ├── components/          # Reusable UI components
│   │   └── ui/              # shadcn/ui primitives (Button, Card, Dialog, etc.)
│   ├── lib/                 # Shared libraries & utilities
│   │   ├── auth.ts          # NextAuth configuration
│   │   ├── db.ts            # Prisma client singleton
│   │   ├── ers-scoring.ts   # Export Readiness Score engine
│   │   ├── ers-notifications.ts  # ERS change detection & alerts
│   │   ├── supplier-matching.ts   # Korean buyer ↔ African supplier matching
│   │   ├── email.ts         # Nodemailer email transport
│   │   ├── utils.ts         # Shared utilities (cn, formatCurrency, etc.)
│   │   ├── seed-data.ts     # Demo data definitions
│   │   └── i18n/            # Internationalization (EN + Swahili)
│   └── middleware.ts         # Route protection (auth redirect)
├── .env.example             # Environment template
├── vitest.config.ts         # Test configuration
└── package.json
```

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
| `npx vitest run` | Run all tests |
| `npx vitest run src/lib/ers-scoring.test.ts` | Run ERS engine tests |

## 🔐 Security

- **Authentication**: NextAuth v5 with JWT strategy + credentials provider
- **Password hashing**: bcryptjs with 12 salt rounds
- **API protection**: All mutation endpoints check `auth()` and verify resource ownership
- **Route protection**: Middleware redirects unauthenticated users to `/login`
- **Admin routes**: `/admin` and `/korea/inquiries` require admin role
- **Database**: SQLite (dev) — row-level filtering by `userId` prevents data leakage
- **Environment**: `.env` is gitignored; use `.env.example` as a template

## 🧪 Testing

```bash
# Run all tests
npx vitest run

# Run specific test file
npx vitest run src/lib/ers-scoring.test.ts

# Run in watch mode
npx vitest
```

### Test files

| File | Description |
|------|-------------|
| `src/lib/ers-scoring.test.ts` | 23 tests covering ERS dimensions, edge cases, serialization |
| `src/app/api/documents/documents.test.ts` | Document API tests |
| `src/app/api/pipeline-actions/pipeline-actions.test.ts` | Pipeline action API tests |
| `src/app/api/content/content.test.ts` | Content calendar API tests |

## 🌐 Key Features

### Export Readiness Score (ERS)
Auto-calculated 0–100 score across 4 dimensions (documentation, compliance, export history, capacity). Recalculates in real-time when compliance records or products are added/updated. History tracked via `ErsSnapshot` model.

### Korea-Africa Trade Corridor
- Corporate target pipeline (10 Korean procurement teams)
- Sokogate Platform Pilot (20 African exporters on free trials)
- Supplier matching engine (product fit + compliance + capacity scoring)
- Korean buyer inquiry registration & admin panel

### Supplier Matching
The `supplier-matching.ts` engine scores matches using:
- **Product Fit (40%)**: Commodity keyword matching
- **Compliance (35%)**: Certification gap analysis
- **Capacity (25%)**: ERS sub-scores + volume

### Pilot-to-Paid Conversion
Automated conversion sequence with trial expiry tracking, check-in scheduling, and re-engagement workflows.

## 🗺️ Key Pages

| Route | Description |
|-------|-------------|
| `/dashboard` | Main analytics dashboard |
| `/pipeline` | Pipeline CRM with drag-and-drop |
| `/trade` | Products, compliance, ERS, trade finance |
| `/korea` | Korea Corridor dashboard |
| `/korea/buyers` | Korean buyer landing page (bilingual) |
| `/korea/inquiries` | Buyer inquiry admin panel |
| `/financial` | Revenue model & projections |
| `/outreach` | Campaign templates & management |
| `/plan` | 75-Day implementation plan |
| `/content` | SEO content calendar |
| `/docs` | Platform documentation |
| `/api/health` | Health check endpoint |

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript (strict mode)
- **Database**: SQLite (dev) / PostgreSQL (prod) via Prisma
- **Auth**: NextAuth v5 (JWT + Credentials + optional Google SSO)
- **UI**: Tailwind CSS + shadcn/ui + Framer Motion
- **Charts**: Recharts
- **Icons**: Lucide React
- **Email**: Nodemailer (Ethereal dev fallback)
- **Testing**: Vitest + Testing Library
- **AI**: LangChain.js (optional, for RAG pipeline)

## 📝 License

Private — Mapato
