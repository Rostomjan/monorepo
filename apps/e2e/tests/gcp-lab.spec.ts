import { test, expect } from "@playwright/test";

// interview-lab runs on :3003 (see apps/interview-lab package.json dev script).
// Covers the /gcp Lab hub + Demo routes render; live GCP actions are NOT
// exercised here (they need ADC + bucket and would create billable objects).
test.use({ baseURL: "http://localhost:3003" });

test("gcp hub lists all demos", async ({ page }) => {
  await page.goto("/gcp");
  await expect(page.getByRole("heading", { name: /GCP for Full-Stack/i })).toBeVisible();
  for (const name of ["Cloud Run", "Cloud Storage", "Secret Manager", "Cloud SQL vs Firestore", "Firebase vs GCP"]) {
    await expect(page.getByRole("link", { name: new RegExp(name) }).first()).toBeVisible();
  }
});

for (const route of ["/gcp/run", "/gcp/storage", "/gcp/secrets", "/gcp/databases", "/gcp/firebase-vs-gcp"]) {
  test(`gcp demo renders: ${route}`, async ({ page }) => {
    await page.goto(route);
    await expect(page.getByRole("heading").first()).toBeVisible();
  });
}

test("dashboard shows gcp section", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /GCP — local-first/i })).toBeVisible();
});
