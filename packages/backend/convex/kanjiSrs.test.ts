import { describe, expect, test } from "bun:test";
import { demoteStage, levelUpReached, nextAvailableAt, STAGE_INTERVAL_MS } from "./kanjiSrs";

describe("nextAvailableAt", () => {
  test("stage 1 waits 4h", () => {
    expect(nextAvailableAt(1, 0)).toBe(4 * 3_600_000);
  });

  test("day-plus waits run one hour short", () => {
    expect(STAGE_INTERVAL_MS[3]).toBe(23 * 3_600_000);
    expect(STAGE_INTERVAL_MS[5]).toBe(167 * 3_600_000);
  });

  test("burned stage has no interval", () => {
    expect(() => nextAvailableAt(9, 0)).toThrow(/No interval/);
  });
});

describe("demoteStage", () => {
  test("1-2 mistakes below guru cost one stage", () => {
    expect(demoteStage(4, 1)).toBe(3);
    expect(demoteStage(4, 2)).toBe(3);
  });

  test("guru+ mistakes cost double per pair", () => {
    expect(demoteStage(6, 1)).toBe(4);
    expect(demoteStage(6, 3)).toBe(2);
  });

  test("floors at stage 1", () => {
    expect(demoteStage(2, 9)).toBe(1);
  });
});

describe("levelUpReached", () => {
  test("90% guru passes, below fails, empty level never", () => {
    expect(levelUpReached(10, 9)).toBe(true);
    expect(levelUpReached(10, 8)).toBe(false);
    expect(levelUpReached(0, 0)).toBe(false);
  });
});
