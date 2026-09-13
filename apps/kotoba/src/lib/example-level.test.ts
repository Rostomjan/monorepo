import { describe, expect, test } from "bun:test";
import { parseExampleLevel, resolveExampleLevel } from "./example-level";

describe("example-level", () => {
  test("parseExampleLevel accepts N5-N1, defaults N5", () => {
    expect(parseExampleLevel("N3")).toBe("N3");
    expect(parseExampleLevel("unknown")).toBe("N5");
    expect(parseExampleLevel(undefined)).toBe("N5");
    expect(parseExampleLevel("N0")).toBe("N5");
  });
  test("explicit preference wins", () => {
    expect(resolveExampleLevel("N1", "N4")).toBe("N4");
    expect(resolveExampleLevel("unknown", "N2")).toBe("N2");
  });
  test("auto follows entry jlpt, N5 when unknown", () => {
    expect(resolveExampleLevel("N2", "auto")).toBe("N2");
    expect(resolveExampleLevel("unknown", "auto")).toBe("N5");
    expect(resolveExampleLevel(undefined, "auto")).toBe("N5");
  });
});
