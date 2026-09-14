import { describe, expect, test } from "bun:test";
import { buildProgressIndex, toNewEntry } from "./jlpt-progress";
import type { DictRecord, Entry } from "./types";

const dict = [
  { k: "猫", r: "ねこ", g: ["cat"], j: "N5" },
  { k: "食べる", r: "たべる", g: ["to eat"], j: "N4" },
  { k: "たべる", r: "たべる", g: ["to eat"], j: "N4" },
  { k: "勉強", r: "べんきょう", g: ["study"], j: "N3" },
  { k: "挨拶", r: "あいさつ", g: ["greeting"], j: "N4" },
] as DictRecord[];

const entry = (surface: string, mastery: Entry["mastery"]): Entry =>
  ({
    key: surface,
    surface,
    reading: surface,
    meaning: "x",
    kind: "word",
    jlpt: "unknown",
    mastery,
    isFavorite: false,
    source: "paste",
    createdAt: 1,
    dueAt: 1,
    intervalDays: 1,
  }) as Entry;

describe("jlpt-progress", () => {
  test("N5 excluded, buckets assigned, kana alias does not double-count surface", () => {
    const idx = buildProgressIndex(dict, [entry("食べる", "known"), entry("勉強", "learning")]);
    // N4: 食べる(known) + たべる alias→same normalized? たべる is distinct surface → to-learn; 挨拶 to-learn
    expect(idx.N4.total).toBe(3);
    expect(idx.N4.known).toBe(1);
    expect(idx.N4.toLearn).toBe(2);
    expect(idx.N3.learning).toBe(1);
    expect(idx.N2.total).toBe(0);
    expect(idx.N1.total).toBe(0);
  });
  test("best mastery wins across duplicate entries", () => {
    const idx = buildProgressIndex(dict, [entry("挨拶", "unknown"), entry("挨拶", "known")]);
    expect(idx.N4.known).toBe(1);
    expect(idx.N4.toLearn).toBe(2);
  });
  test("toNewEntry shapes a seed entry", () => {
    const e = toNewEntry({ surface: "挨拶", reading: "あいさつ", meaning: "greeting", bucket: "to-learn" }, "N4", 7);
    expect(e.jlpt).toBe("N4");
    expect(e.mastery).toBe("unknown");
    expect(e.source).toBe("seed");
    expect(e.dueAt).toBe(7);
  });
});
