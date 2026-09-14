import { describe, expect, test } from "bun:test";
import { isConstraintError, mergeEntries, splitDuplicates } from "./dedupe";
import type { Entry } from "./types";

const base = {
  key: "k",
  surface: "猫",
  reading: "ねこ",
  meaning: "",
  kind: "word",
  jlpt: "unknown",
  mastery: "unknown",
  isFavorite: false,
  source: "paste",
  createdAt: 1,
  dueAt: 1,
  intervalDays: 1,
} as Entry;

describe("dedupe", () => {
  test("mergeEntries takes best mastery, either favorite, missing meaning", () => {
    const survivor = { ...base, id: 1, mastery: "learning" as const };
    const dup = { ...base, id: 2, mastery: "known" as const, isFavorite: true, meaning: "cat" };
    const m = mergeEntries(survivor, dup);
    expect(m.id).toBe(1);
    expect(m.mastery).toBe("known");
    expect(m.isFavorite).toBe(true);
    expect(m.meaning).toBe("cat");
    expect(m.needsReview).toBe(false);
    // survivor schedule untouched
    expect(m.dueAt).toBe(1);
    expect(m.intervalDays).toBe(1);
  });
  test("mergeEntries keeps survivor meaning and unions altMeanings", () => {
    const m = mergeEntries(
      { ...base, meaning: "cat", altMeanings: ["feline"] },
      { ...base, meaning: "kitty", altMeanings: ["feline", "puss"] },
    );
    expect(m.meaning).toBe("cat");
    expect(m.altMeanings).toEqual(["feline", "puss"]);
  });
  test("splitDuplicates catches db hits and in-batch dupes", () => {
    const rows = [{ key: "a" }, { key: "b" }, { key: "b" }, { key: "c" }, { key: "a" }];
    const { unique, dupCount } = splitDuplicates(rows, new Set(["c"]));
    expect(unique).toEqual([{ key: "a" }, { key: "b" }]);
    expect(dupCount).toBe(3);
  });
  test("isConstraintError", () => {
    expect(isConstraintError(new DOMException("x", "ConstraintError"))).toBe(true);
    expect(isConstraintError(new Error("nope"))).toBe(false);
    expect(isConstraintError(null)).toBe(false);
  });
});
