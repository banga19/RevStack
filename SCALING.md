# Scaling — RevStack / Mapato Platform

## Current Baseline
- Next.js 16 on Docker/Fly.io
- SQLite dev / PostgreSQL planned prod
- BullMQ + Redis for queues
- Sentinl + health endpoint for observability

## Scaling Layers

### 1. App (Next.js)
- Run multiple instances behind Fly.io or a load balancer
- Use `fly scale count <n>` or Kubernetes pod autoscaling
- Stateless requests (JWT + Prisma) make horizontal scaling trivial

### 2. Database (PostgreSQL)
- Enable PgBouncer for connection pooling
- Add read replicas for analytics-heavy endpoints
- Add indexes on high-cardinality columns (userId, organizationId, createdAt)
- Partition large tables (activity, messages) by month

### 3. Cache (Redis / Upstash)
- Increase BullMQ concurrency via `concurrency` option
- Use Redis for rate limiting counters (already done)
- Add Redis-backed session cache for ABAC checks

### 4. Queue (BullMQ / Hermes Workers)
- Scale workers independently of web dynos
- Fly.io: `fly scale count hermes-worker` to add capacity
- Set queue prefetch and worker concurrency limits

### 5. CDN / Assets
- CDN for static assets: Cloudflare R2 + Cloudflare Images (already in next.config.js)
- Cache-Control via `src/lib/cache.ts` helpers
- Revalidation via Next.js fetch cache tags

## Fly.io Scaling Example
```bash
fly scale count 3          # 3 web dynos
fly scale count 2 -r iad   # 2 workers in same region
```

## Kubernetes (future)
- HPA on CPU/memory for web + worker pods
- Separate node pools for CPU-bound AI jobs

## Benchmarks / Targets
- App latency p95 < 200ms under 1000 RPM
- DB CPU < 70% sustained
- Queue lag < 5 minutes
