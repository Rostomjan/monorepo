// Sentry client init. Runs in the browser on page load.
// Free-tier tuned: no session replay (quota), error replay only.
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://0fcb2b5fac5c1d3273ae621e46112336@o4512061585752064.ingest.us.sentry.io/4512061615374336",
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
  integrations: [Sentry.replayIntegration()],
  // Free tier: 100% traces in dev, 10% in prod.
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1,
  // Session replay is the fastest way to burn free quota — off.
  replaysSessionSampleRate: 0,
  // Keep error replay: only sends when an error happens.
  replaysOnErrorSampleRate: 1.0,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
