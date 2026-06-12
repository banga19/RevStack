# System Design — RevStack / Mapato Platform

## Overview
RevStack (formerly Mapato) is an AI-powered B2B trade automation platform for East Africa, scaling from agency service to SaaS platform with ecosystem partners.

## Design Principles
- **Multi-tenant SaaS**: Isolated data per client, custom branding
- **Event-driven**: BullMQ workers + cron for background automation
- **AI-first**: LangChain/LangGraph for lead scoring, RAG, corridor matching
- **Pan-African**: Offline-first PWA, localized payments (M-Pesa, Flutterwave, Stripe)
- **Security by default**: ABAC, stateless CSRF, react-admin+NextAuth

---

## High-Level System View

| Layer | Technology | Role |
|-------|-----------|------|
| **Frontend** | Next.js 16 (App Router) + React 19 + Tailwind | SSR/ISR + client SPA |
| **API** | Next.js Route Handlers (52+ endpoints) | REST/JSON |
| **Auth** | NextAuth v5 + custom ABAC | JWT + session + policy engine |
| **DB** | Prisma ORM + Drizzle | SQLite (dev) / PostgreSQL (prod) |
| **Cache** | Upstash Redis + Next.js fetch cache | Rate limiting, session, API cache |
| **Queue** | BullMQ + ioredis | Cron + async jobs |
| **AI** | LangChain + OpenAI + RAG | LLMS, agents, vector store |
| **Payments** | Flutterwave + Stripe + M-Pesa | Subscriptions + invoices |
| **Messaging** | WATI.io (WhatsApp) + Instantly.ai (email) | Outreach automation |
| **Monitoring** | Sentry + Fly metrics + health checks | Error tracking + alerts |
| **Infra** | Fly.io (worker) + planned multi-region | Containerized deploy |

---

## Data Model (Core)

```
User ──< Account >───> Subscription
Organization ── Client ── Lead ── Activity
Partner ── Referral ── TradeFinanceApplication
Corridor ── ERSScore ── ComplianceDoc
```

- **User**: identity (NextAuth)
- **Organization**: account
- **Client**: CRM lead → conversion
- **Subscription**: tier + billing + status
- **TradeFinanceApplication**: clientId-based applications
- **Partner**: referral + commission tracking
- **Corridor**: trade routes (Kenya→Uganda, Korea→Africa)

---

## Request Lifecycle

1. Client request → Next.js middleware (proxy.ts)
2. ABAC check (withAuth/withAbac)
3. Route handler → lib/ service
4. Prisma query / Redis cache / BullMQ job
5. JSON response or redirect
6. Sentry capture on error

---

## Multi-tenant Strategy

- Phase 1: Shared schema + organizationId filter
- Phase 2: Row-level security in PostgreSQL
- Phase 3: Schema-per-tenant (white-label isolation)

---

## Phase Mapping to Build Tasks

| Phase | Days | Focus |
|-------|------|-------|
| Platform Build | 76-100 | Self-serve SaaS, billing, onboarding |
| East Africa | 101-150 | i18n, corridors, partner program |
| AI Deepening | 151-200 | LLMs, RAG, predictive analytics |
| Scale & Ecosystem | 201-365 | marketplace, trade finance, AfCFTA |

See NEXT-PHASES-76-365.md for milestones and revenue targets.
