// Sentry edge init (middleware, edge routes). Same env DSN as server config.
// Free-tier tuned: low trace sampling in prod.
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1,
  // No logs integration is configured, so nothing log-like is sent.
  // (Sentry v11 removed the enableLogs option; removal is valid on v10 too.)
});
