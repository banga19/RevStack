# =============================================================================
# Mapato / RevStack — Multi-Stage Dockerfile
#
# Build:
#   docker build -t mapato .
#
# Run with docker-compose (recommended):
#   docker compose up -d
# =============================================================================

# ── Base stage ──────────────────────────────────────────────────────────────
FROM node:22.13-alpine AS base

# Install necessary system dependencies (including build tools for native modules)
RUN apk add --no-cache wget curl make g++ python3 sqlite-dev build-base

# Install pnpm via npm (avoids corepack signature issues)
RUN npm install -g pnpm@9.15.0

# ── Dependencies stage ──────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app

# Copy package manifests first for better layer caching
COPY package.json pnpm-workspace.yaml ./
COPY lib/db/package.json ./lib/db/
COPY lib/api-spec/package.json ./lib/api-spec/
COPY scripts/package.json ./scripts/

# Install dependencies
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install

# ── Build stage ─────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Use PostgreSQL schema for Docker/production builds
# (The default schema.prisma uses SQLite for local dev without Docker)
RUN cp prisma/schema.postgres.prisma prisma/schema.prisma

# Generate Prisma client (binary must match the container environment)
RUN npx prisma generate

# Build Next.js application
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    NODE_OPTIONS="--max-old-space-size=4096" pnpm build

# ── Production runner stage ────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy all node_modules and built artifacts
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.js ./next.config.js
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/.env.example ./.env.example
COPY --from=builder /app/workers ./workers
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/src ./src
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/middleware.ts ./middleware.ts
COPY --from=builder /app/proxy.ts ./proxy.ts
COPY --from=builder /app/tailwind.config.ts ./tailwind.config.ts
COPY --from=builder /app/postcss.config.js ./postcss.config.js
COPY --from=builder /app/sentry.client.config.ts ./sentry.client.config.ts
COPY --from=builder /app/sentry.server.config.ts ./sentry.server.config.ts

# Grant permissions to the nextjs user
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["pnpm", "start"]
