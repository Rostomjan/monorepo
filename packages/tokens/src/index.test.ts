import { describe, expect, test } from "bun:test";
import { colors, fonts, radius, spacing } from "./index";

describe("tokens", () => {
  test("exposes Figma brand colors", () => {
    expect(colors.primary).toBe("#d92d20");
    expect(colors.brandDeep).toBe("#b50c08");
    expect(colors.ink).toBe("#0d1c2e");
    expect(colors.muted).toBe("#565e74");
    expect(colors.success).toBe("#006646");
    expect(colors.white).toBe("#ffffff");
  });

  test("exposes spacing scale", () => {
    expect(spacing.md).toBe("1rem");
  });

  test("exposes radius + fonts", () => {
    expect(radius.card).toBe("0.75rem");
    expect(radius.pill).toBe("9999px");
    expect(fonts.sans).toContain("Plus Jakarta Sans");
  });
});
