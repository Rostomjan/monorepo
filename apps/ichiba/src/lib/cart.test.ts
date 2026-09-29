import { describe, expect, test } from "bun:test";
import { addLine, cartCount, parseCart } from "@/lib/cart";

describe("cart", () => {
  test("adds and merges lines", () => {
    expect(addLine([], "a")).toEqual([{ productId: "a", qty: 1 }]);
    expect(addLine([{ productId: "a", qty: 1 }], "a", 2)).toEqual([{ productId: "a", qty: 3 }]);
  });

  test("counts quantities", () => {
    expect(cartCount([{ productId: "a", qty: 2 }, { productId: "b", qty: 3 }])).toBe(5);
  });

  test("parseCart accepts a well-formed cart", () => {
    expect(parseCart([{ productId: "shop-1-p1", qty: 2 }])).toEqual([{ productId: "shop-1-p1", qty: 2 }]);
  });

  test("parseCart rejects malformed entries without throwing", () => {
    expect(parseCart(null)).toEqual([]);
    expect(parseCart("nope")).toEqual([]);
    expect(
      parseCart([
        { productId: "a", qty: 1 },
        { productId: "", qty: 1 },
        { productId: "b", qty: 0 },
        { productId: "c", qty: 100 },
        { productId: "d", qty: 1.5 },
        { productId: "a", qty: 2 },
        "junk",
        null,
      ]),
    ).toEqual([{ productId: "a", qty: 1 }]);
  });
});
