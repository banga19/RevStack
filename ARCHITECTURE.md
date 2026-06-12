# Architecture — RevStack / Mapato Platform

## Directory Structure

```
/home/apop/DEV/RevStack/
├── src/
│   ├── app/
│   │   ├── api/                  # 52+ REST endpoints (App Router)
│   │   ├── partners/             # Partner portal pages
│   │   ├── corridors/            # Trade corridor UI
│   │   └── (auth, dashboard, ...) # App routes
│   ├── components/
│   │   ├── ui/                   # shadcn/ui primitives
│   │   ├── sidebar.tsx           # Global nav
│   │   ├── subscription-gate.tsx # Paid feature gate
│   │   └── payment-checkout.tsx  # Flutterwave/Stripe UI
│   ├── lib/
│   │   ├── auth.ts               # NextAuth v5 config
│   │   ├── abac.ts               # Attribute-based access control
│   │   ├── abac-middleware.ts    # withAuth / withAbac helpers
│   │   ├── rate-limiter.ts       # Sliding-window limiter
│   │   ├── csrf.ts               # Stateless CSRF
│   │   ├── db/                   # Drizzle ORM schema
│   │   ├── hermes-agent.ts       # Supervisory agent
│   │   ├── agent-orchestrator.ts # God Mode
│   │   ├── rag-pipeline.ts       # RAG/vector store
│   │   ├── wati-integration.ts   # WhatsApp
│   │   ├── instantly-integration.ts # Cold email
│   │   ├── voiceflow-integration.ts # Chatbot
│   │   └── flutterwave.ts        # Payments
│   ├── proxy.ts                  # Stubbed (gating in lib/subscription-gate)
│   └── middleware.ts             # Re-exports proxy (Next config matcher)
├── prisma/
│   ├── schema.prisma             # Canonical schema
│   ├── schema.sqlite.prisma      # Dev adapter override
│   ├── schema.postgres.prisma    # Prod adapter override
│   └── seed*.ts                  # Seeds
├── workers/
│   └── hermes-worker.ts          # Fly.io worker (BullMQ consumer)
├── scripts/                      # Corrections/verification scripts
├── e2e/                          # Playwright E2E tests
├── __tests__/                    # Vitest unit tests
├── fly.toml                      # Fly deploy (worker)
├── Dockerfile                    # App image
├── Dockerfile.worker             # Worker image
├── docker-compose*.yml           # Local stacks
├── next.config.js                # Webpack polyfills + image domains
├── tsconfig.json                 # Strict TS config
└── redoxux.config.ts             # (Tailwind)
```

## Auth & Security Architecture

```
┌─────────────┐     ┌─────────────┐     ┌──────────────┐
│  Browser     │────▶│  Next.js    │────▶│  NextAuth    │
│  (client)    │     │  App Router │     │  v5 (JWT)   │
└─────────────┘     └─────┬───────┘     └──────────────┘
                          │
                    withAuth/withAbac
                          │
                    ┌─────▼───────┐
                    │  ABAC       │
                    │  Policy     │
                    │  Engine     │
                    └────────────┘
```

- **Authentication**: NextAuth v5 with JWT, Credentials, Google OAuth
- **Authorization**: ABAC (attribute-based) with 18 protected resources
- **CSRF**: Stateless token endpoint (`/api/csrf`)
- **Security headers**: Configured in next.config.js images fallbacks + proxy path rules

## Data Flow

```
Client ──▶ API Route ──▶ lib service ──▶ DB (Prisma) or Redis (cache) or BullMQ (queue)
                │
                ├─ withAbac (pre-check)
                ├─ rate-limiter.ts
                └─ Sentry (capture errors)
```

## Background Processing

- **BullMQ** queue over Upstash Redis for cron jobs, sequences, followups
- **Hermes agent** as supervisory worker process (Fly.io)
- **Health endpoint** reserved for worker if needed

## Observability

| Tool | Purpose |
|------|---------|
| Sentry | Browser + Node error capture |
| Fly metrics | Worker health (port 9091) |
| Playwright | E2E regression |
| Vitest | Unit tests |

## Scaling Strategy

1. **Read scale**: Next.js cache + Redis dedup
2. **Queue scale**: BullMQ concurrency + worker instances (Fly scale)
3. **DB scale**: PG read replicas + connection pool
4. **White-label**: Schema-per-tenant for premium partners
5. **Geographic**: CDN + fly regions
