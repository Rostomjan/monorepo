import { describe, expect, test } from "bun:test";
import { parsePastedText } from "./parse-paste";
import { enrichSurface } from "./enrich";
import { nextReview } from "./srs";
import { countUnknown, rankByKnown, templateExamples } from "./examples";

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
    expect(e.meaning).toContain("cat");
    expect(e.noHit).toBe(false);
  });
  test("no-hit saved as unknown", () => {
    const e = enrichSurface("￾￾￾xyzqqq");
    expect(e.noHit).toBe(true);
    expect(e.jlpt).toBe("unknown");
  });
  test("partial enrichment via token split", () => {
    const e = enrichSurface("zzz不存在");
    // 不存在 is a real word: reading assembled, needs human review
    expect(e.reading).toContain("ふそんざい");
    expect(e.needsReview).toBe(true);
  });
});

describe("srs", () => {
  test("again resets", () => {
    const nx = nextReview({ mastery: "known", intervalDays: 30 } as never, "again");
    expect(nx.mastery).toBe("unknown");
    expect(nx.intervalDays).toBe(1);
  });
  test("hard grows slowly, stays learning", () => {
    const nx = nextReview({ mastery: "learning", intervalDays: 5 } as never, "hard");
    expect(nx.mastery).toBe("learning");
    expect(nx.intervalDays).toBeGreaterThan(5);
    expect(nx.dueAt).toBeGreaterThan(Date.now());
  });
  test("known promotes to known with longer interval", () => {
    const nx = nextReview({ mastery: "learning", intervalDays: 3 } as never, "known");
    expect(nx.mastery).toBe("known");
    expect(nx.intervalDays).toBe(7);
  });
  test("known on known doubles, capped at 180", () => {
    const nx = nextReview({ mastery: "known", intervalDays: 100 } as never, "known");
    expect(nx.intervalDays).toBe(180);
  });
});

describe("examples", () => {
  test("template offline", () => {
    const ex = templateExamples({ surface: "猫", meaning: "cat", kind: "word" } as never);
    expect(ex.length).toBeGreaterThan(0);
    expect(ex[0].jp).toContain("猫");
  });
  test("i+1 lite prefers mostly-known sentences", () => {
    const known = new Set(["猫", "好き", "です", "これは"]);
    expect(countUnknown("これは猫です。", known, "猫")).toBe(0);
    const ranked = rankByKnown(
      [{ jp: "これは猫です。" }, { jp: "猫は量子力学を勉強します。" }],
      known,
      "猫",
    );
    expect(ranked[0].jp).toBe("これは猫です。");
    expect(ranked[0].unknownCount).toBeLessThan(ranked[1].unknownCount);
  });
});
