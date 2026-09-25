import { describe, expect, test } from "bun:test";
import { addLine, cartCount, loadCart, saveCart } from "@/lib/cart";

describe("cart", () => {
  test("adds and merges lines", () => {
    expect(addLine([], "a")).toEqual([{ productId: "a", qty: 1 }]);
    expect(addLine([{ productId: "a", qty: 1 }], "a", 2)).toEqual([{ productId: "a", qty: 3 }]);
  });

  test("counts quantities", () => {
    expect(cartCount([{ productId: "a", qty: 2 }, { productId: "b", qty: 3 }])).toBe(5);
  });

  test("loadCart returns [] without window", () => {
    expect(loadCart()).toEqual([]);
  });

  test("saveCart is a no-op without window", () => {
    expect(() => saveCart([{ productId: "a", qty: 1 }])).not.toThrow();
  });
});
