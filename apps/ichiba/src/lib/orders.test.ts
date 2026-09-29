import { describe, expect, test } from "bun:test";
import { generateCatalog } from "./catalog";
import { splitCartToOrders, type CatalogLookup } from "./orders";

// Fixture-backed lookup: exercises order logic without a database.
// Persistence (listOrders/getOrder/checkoutCart) is covered by e2e against
// a real Postgres, since CI has no database service for unit tests.
const { products, shops } = generateCatalog();
const productById = new Map(products.map((p) => [p.id, p]));
const shopNameById = new Map(shops.map((s) => [s.id, s.name]));
const lookup: CatalogLookup = {
  product: async (id) => productById.get(id),
  shopName: async (id) => shopNameById.get(id),
};

describe("orders", () => {
  test("splits a mixed-shop cart into one order per shop", async () => {
    const a = products[0];
    const b = products.find((p) => p.shopId !== a.shopId)!;
    const orders = await splitCartToOrders(
      [
        { productId: a.id, qty: 2 },
        { productId: b.id, qty: 1 },
      ],
      "guest",
      lookup,
    );
    expect(orders).toHaveLength(2);
    expect(orders[0].totalYen).toBeGreaterThan(0);
    expect(orders[0].items[0].name).toBe(a.name);
  });

  test("rejects unknown products", async () => {
    await expect(splitCartToOrders([{ productId: "nope", qty: 1 }], "guest", lookup)).rejects.toThrow();
  });

  test("attributes orders to users", async () => {
    const [mine] = await splitCartToOrders([{ productId: products[0].id, qty: 1 }], "user_123", lookup);
    expect(mine.userId).toBe("user_123");
  });
});
