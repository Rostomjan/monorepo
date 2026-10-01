import { withSentryConfig } from "@sentry/nextjs/config";

/** @type {import('next').NextConfig} */
const nextConfig = {};

export default withSentryConfig(nextConfig, {
  org: "tokyo-hm",
  project: "ichiba",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // Sourcemap upload is opt-in: the plugin fails the build when
  // SENTRY_AUTH_TOKEN is set but the `ichiba` Sentry project (or token)
  // is wrong/missing. Keep off until the project exists, then set
  // SENTRY_SOURCEMAP_UPLOAD=1 in Vercel env (and CI, if wanted).
  sourcemaps: {
    disable: process.env.SENTRY_SOURCEMAP_UPLOAD !== "1",
  },

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // Passes through Clerk middleware (public route) — no matcher change needed.
  tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    automaticVercelMonitors: true,

    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});
