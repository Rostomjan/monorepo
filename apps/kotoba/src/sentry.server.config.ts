// Sentry server init. DSN matches the monorepo-root wizard project (tokyo-hm/javascript-nextjs).
// Free-tier tuned: low trace sampling in prod to stay inside quota.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://0fcb2b5fac5c1d3273ae621e46112336@o4512061585752064.ingest.us.sentry.io/4512061615374336",
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  // Free tier: 100% in dev, 10% in prod. Bump only when debugging prod.
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1,
  // No logs integration is configured, so nothing log-like is sent.
  // (Sentry v11 removed the enableLogs option; removal is valid on v10 too.)
});
