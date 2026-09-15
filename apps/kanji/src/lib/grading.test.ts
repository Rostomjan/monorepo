import { describe, expect, test } from "bun:test";
import { checkMeaning, checkReading, halvesFor } from "./grading";

describe("halvesFor", () => {
  test("radicals are meaning-only", () => {
    expect(halvesFor("radical")).toEqual(["meaning"]);
    expect(halvesFor("kanji")).toEqual(["meaning", "reading"]);
    expect(halvesFor("vocabulary")).toEqual(["meaning", "reading"]);
  });
});

describe("checkMeaning", () => {
  test("case-insensitive exact match, trimmed", () => {
    expect(checkMeaning(["Person"], " person ")).toBe(true);
    expect(checkMeaning(["Person"], "personn")).toBe(false);
  });
});

describe("checkReading", () => {
  test("exact kana match, no forgiveness", () => {
    expect(checkReading(["やすみ"], "やすみ")).toBe(true);
    expect(checkReading(["やすみ"], "やすみ ")).toBe(true);
    expect(checkReading(["やすみ"], "yasumi")).toBe(false);
  });
});
