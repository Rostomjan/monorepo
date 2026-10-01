// Sentry client init. Runs in the browser on page load.
// Free-tier tuned: no session replay (quota), error replay only.
//
// DSN comes from env (NEXT_PUBLIC_SENTRY_DSN) rather than hardcoded like
// kotoba: the ichiba Sentry project doesn't exist yet, and init with an
// undefined DSN disables itself gracefully — so this merges and deploys
// green before the project is created. Set the env in Vercel + .env.local.
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
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
