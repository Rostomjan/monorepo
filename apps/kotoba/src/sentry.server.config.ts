// Sentry server init. DSN matches the monorepo-root wizard project (tokyo-hm/javascript-nextjs).
// https://docs.sentry.io/platforms/javascript/guides/nextjs/
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://0fcb2b5fac5c1d3273ae621e46112336@o4512061585752064.ingest.us.sentry.io/4512061615374336",
  tracesSampleRate: 1,
});
