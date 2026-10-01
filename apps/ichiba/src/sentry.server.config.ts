// Sentry server init. Free-tier tuned: low trace sampling in prod.
// DSN from env (see instrumentation-client.ts for why not hardcoded).
// https://docs.sentry.io/platforms/javascript/guides/nextjs/
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  // Free tier: 100% in dev, 10% in prod. Bump only when debugging prod.
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1,
  // Keep logs off on free tier — they count toward quota.
  enableLogs: false,
});
