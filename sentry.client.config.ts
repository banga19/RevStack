/**
 * Sentry Client Configuration
 *
 * Replace SENTRY_DSN with your actual DSN from https://sentry.io
 * Set SENTRY_DSN in your .env file:
 *   SENTRY_DSN=https://your-dsn@sentry.io/your-project
 *   NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/your-project
 *
 * Environment (production/staging): set SENTRY_ENVIRONMENT
 */

import * as Sentry from "@sentry/nextjs"

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN || ""
const environment = process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || "development"

Sentry.init({
  dsn,
  environment,
  tracesSampleRate: environment === "production" ? 0.1 : 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  enabled: !!dsn,  // Only enable if DSN is configured
  integrations: [
    // Add browser integrations as needed
    Sentry.replayIntegration(),
  ],
})
