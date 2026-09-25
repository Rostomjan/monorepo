import { describe, expect, test } from "bun:test";
import { PRODUCTS } from "./catalog";
import { listOrders, placeOrders, splitCartToOrders } from "./orders";

describe("orders", () => {
  test("splits a mixed-shop cart into one order per shop", () => {
    const a = PRODUCTS[0];
    const b = PRODUCTS.find((p) => p.shopId !== a.shopId)!;
    const orders = splitCartToOrders([
      { productId: a.id, qty: 2 },
      { productId: b.id, qty: 1 },
    ]);
    expect(orders).toHaveLength(2);
    expect(orders[0].totalYen).toBeGreaterThan(0);
  });

  test("rejects unknown products", () => {
    expect(() => splitCartToOrders([{ productId: "nope", qty: 1 }])).toThrow();
  });

  test("stores orders in-memory", () => {
    const before = listOrders().length;
    const [order] = splitCartToOrders([{ productId: PRODUCTS[0].id, qty: 1 }]);
    placeOrders([order]);
    expect(listOrders().length).toBe(before + 1);
  });
});
