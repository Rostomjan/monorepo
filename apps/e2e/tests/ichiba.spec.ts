import { test, expect } from "@playwright/test";

/**
 * Ichiba critical flow (guest): search → PDP → add two single-shop items →
 * header badge → checkout splits into one order per shop → orders list.
 *
 * Requirements (else this file skips cleanly, including in CI):
 * - DATABASE_URL pointing at a migrated + seeded database. The active
 *   Playwright config boots `apps/ichiba` dev with it; CI additionally
 *   migrates + seeds a postgres service before running.
 *
 * Isolation: orders accumulate per database, so every assertion diffs
 * before/after counts within the test instead of assuming absolutes.
 * shop-1-p1 is the load-test anchor product (effectively infinite stock);
 * shop-2-p1 is bought at qty 1, safe on a fresh seed.
 */
test.skip(!process.env.DATABASE_URL, "needs DATABASE_URL pointing at a migrated + seeded database");

test("guest search, add, checkout splits orders per shop", async ({ page }) => {
  // Search runs against the trigram index.
  await page.goto("/?q=Matcha");
  await expect(page.getByRole("heading", { name: /Results for.*Matcha/ })).toBeVisible();
  await expect(page.getByText(/authentic regional items found/)).toBeVisible();
  expect(await page.locator("main ul li").count()).toBeGreaterThan(0);

  const ordersBefore = await (async () => {
    await page.goto("/orders");
    return page.getByTestId("order-row").count();
  })();

  // One unit each from two different shops (PDP form → cart).
  await page.goto("/products/shop-1-p1");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.getByLabel("Quantity").fill("1");
  await page.getByRole("button", { name: "Add to Cart" }).click();
  await page.waitForURL("**/cart");

  await page.goto("/products/shop-2-p1");
  await page.getByLabel("Quantity").fill("1");
  await page.getByRole("button", { name: "Add to Cart" }).click();
  await page.waitForURL("**/cart");

  // Server-rendered badge tracks the merged cart with no reload.
  await expect(page.locator('header a[aria-label^="Cart"] span.bg-brand')).toHaveText("2");
  expect(await page.getByTestId("cart-line").count()).toBe(2);

  // Checkout settles atomically and lands on orders: +2 rows (one per shop).
  await page.getByRole("button", { name: /^Checkout/ }).click();
  await page.waitForURL("**/orders");
  const rows = page.getByTestId("order-row");
  await expect.poll(() => rows.count()).toBe(ordersBefore + 2);
  await expect(rows.first()).toContainText(/Shop/);
});
