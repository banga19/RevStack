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
FROM node:20-alpine AS base

# Enable pnpm via corepack (bundled with Node.js 20+)
RUN corepack enable && corepack prepare pnpm@latest --activate

# Install necessary system dependencies
RUN apk add --no-cache wget curl

# ── Dependencies stage ──────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app

# Copy package manifests first for better layer caching
COPY package.json pnpm-workspace.yaml ./
COPY lib/db/package.json ./lib/db/
COPY lib/api-spec/package.json ./lib/api-spec/

# Install dependencies
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install

# ── Build stage ─────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

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

# Grant permissions to the nextjs user
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["pnpm", "start"]
