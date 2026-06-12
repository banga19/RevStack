#!/usr/bin/env bash
# =============================================================================
# Run E2E Tests via Docker
#
# Usage:
#   ./scripts/run-e2e.sh                          # Run all E2E tests
#   ./scripts/run-e2e.sh e2e/checkout-flow.spec.ts # Run a specific test file
#   ./scripts/run-e2e.sh --dev                     # Run with dev-mode setup
#   ./scripts/run-e2e.sh --help                    # Show help
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$SCRIPT_DIR"

COMPOSE_FILES="-f docker-compose.yml -f docker-compose.e2e.yml"
TEST_SPEC=""

show_help() {
  echo "Usage: $0 [options] [test-spec]"
  echo ""
  echo "Options:"
  echo "  --dev     Use dev-mode compose (SQLite, hot reload)"
  echo "  --help    Show this help message"
  echo ""
  echo "Examples:"
  echo "  $0                              # Run all E2E tests"
  echo "  $0 e2e/checkout-flow.spec.ts    # Run a specific test"
  echo "  $0 --dev e2e/dev-mode-checkout.spec.ts  # Run dev-mode test"
  echo ""
  echo "Requirements:"
  echo "  - Docker daemon running and accessible"
  echo "  - .env file with NEXTAUTH_SECRET set"
  echo "  - Port 3000 free on the host"
}

# Parse arguments
USE_DEV=false
for arg in "$@"; do
  case "$arg" in
    --help)
      show_help
      exit 0
      ;;
    --dev)
      USE_DEV=true
      ;;
    *)
      TEST_SPEC="$arg"
      ;;
  esac
done

# Check for .env file
if [ ! -f .env ]; then
  echo "ERROR: .env file not found. Required vars: NEXTAUTH_SECRET"
  echo "Copy .env.example to .env and fill in the required values."
  exit 1
fi

# Build the test command
if [ "$USE_DEV" = true ]; then
  echo "🔧 Using dev-mode setup (SQLite + hot reload)"
  COMPOSE_FILES="-f docker-compose.yml -f docker-compose.dev.yml -f docker-compose.e2e.yml"

  echo "🚀 Starting app in dev mode..."
  docker compose $COMPOSE_FILES up -d app

  echo "⏳ Waiting for app to become healthy (Next.js compilation + health check may take 60-90s)..."

  # Use NODE_ENV=development for dev-mode auto-verification
  # Override DATABASE_URL to point to the shared SQLite volume (dev.db in sqlite-data volume)
  RUN_CMD="NODE_ENV=development DATABASE_URL=file:/app/data/dev.db npx playwright test ${TEST_SPEC:-}"
else
  echo "🏗️  Building production app..."
  # Start PostgreSQL + app for production-mode tests
  docker compose $COMPOSE_FILES up -d postgres app

  echo "⏳ Waiting for app to become healthy (Docker healthcheck running)..."

  RUN_CMD="npx playwright test ${TEST_SPEC:-}"
fi

echo "🚀 Launching E2E test runner (Docker will wait for app healthcheck)..."
echo "   Command: $RUN_CMD"
echo ""

# Run the E2E tests
# Docker Compose automatically waits for the app service to be healthy
# (depends_on: condition: service_healthy) before starting this container
docker compose $COMPOSE_FILES run --rm e2e sh -c "$RUN_CMD"

# Capture the exit code
EXIT_CODE=$?

# Cleanup (optional — uncomment to auto-stop)
# echo "🛑 Stopping services..."
# docker compose $COMPOSE_FILES down

echo ""
if [ $EXIT_CODE -eq 0 ]; then
  echo "✅ All E2E tests passed!"
else
  echo "❌ E2E tests failed (exit code: $EXIT_CODE)"
fi

exit $EXIT_CODE
