import { defineConfig, devices } from "@playwright/test";

// Ichiba critical-flow suite (Stage 3+): search → PDP → cart → checkout →
// orders against a real Postgres. Needs DATABASE_URL pointing at a migrated
// + seeded database (CI provides a postgres service; locally use the `db`
// compose service + `bun run db:migrate && bun run db:seed` in apps/ichiba).
// Skips cleanly without it, mirroring the kanji Convex pattern.
const PORT = process.env.ICHIBA_PORT ?? "3003";
const BASE = process.env.ICHIBA_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests",
  testMatch: "ichiba.spec.ts",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "html",
  use: {
    baseURL: BASE,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "bun run --cwd ../ichiba dev",
    url: BASE,
    reuseExistingServer: !process.env.CI,
    timeout: 180 * 1000,
    env: {
      PORT,
      DATABASE_URL: process.env.DATABASE_URL ?? "",
    },
  },
});
