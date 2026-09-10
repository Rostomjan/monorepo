import { describe, expect, test } from "bun:test";
import { parsePastedText } from "./parse-paste";
import { enrichSurface } from "./enrich";
import { nextReview } from "./srs";
import { templateExamples } from "./examples";

describe("parse-paste", () => {
  test("bare JP lines", () => {
    expect(parsePastedText("たべる\n猫")).toEqual([{ surface: "たべる" }, { surface: "猫" }]);
  });
  test("csv + bracket + dash", () => {
    const r = parsePastedText("食べる,たべる,to eat\n猫 [ねこ] - cat\n犬 - dog");
    expect(r[0]).toMatchObject({ surface: "食べる", reading: "たべる", meaning: "to eat" });
    expect(r[1]).toMatchObject({ surface: "猫", reading: "ねこ", meaning: "cat" });
    expect(r[2]).toMatchObject({ surface: "犬", meaning: "dog" });
  });
});

describe("enrich", () => {
  test("dict hit", () => {
    const e = enrichSurface("猫");
    expect(e.reading).toBe("ねこ");
    expect(e.meaning).toBe("cat");
    expect(e.jlpt).toBe("N5");
  });
  test("no-hit saved as unknown", () => {
    const e = enrichSurface("zzz不存在");
    expect(e.noHit).toBe(true);
    expect(e.jlpt).toBe("unknown");
  });
});

describe("srs", () => {
  test("again resets", () => {
    const nx = nextReview({ mastery: "known", intervalDays: 30 } as never, "again");
    expect(nx.mastery).toBe("unknown");
    expect(nx.intervalDays).toBe(1);
  });
});

describe("examples", () => {
  test("template offline", () => {
    const ex = templateExamples({ surface: "猫", meaning: "cat", kind: "word" } as never);
    expect(ex.length).toBeGreaterThan(0);
    expect(ex[0].jp).toContain("猫");
  });
});
