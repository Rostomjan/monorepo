import { describe, expect, test } from "bun:test";
import { colors, spacing } from "./index";

describe("tokens", () => {
  test("exposes brand colors", () => {
    expect(colors.primary).toBe("#007bff");
    expect(colors.white).toBe("#ffffff");
  });

  test("exposes spacing scale", () => {
    expect(spacing.md).toBe("1rem");
  });
});
