import { describe, expect, test } from "bun:test";
import { isAllowedConnectionType, shouldAttemptOnlineUpgrade } from "./network";

describe("network wifi-only gate", () => {
  test("allows wifi + ethernet", () => {
    expect(isAllowedConnectionType("wifi")).toBe(true);
    expect(isAllowedConnectionType("ethernet")).toBe(true);
  });
  test("allows unknown/other/missing (unsupported API assumes online)", () => {
    expect(isAllowedConnectionType(undefined)).toBe(true);
    expect(isAllowedConnectionType("unknown")).toBe(true);
    expect(isAllowedConnectionType("other")).toBe(true);
    expect(shouldAttemptOnlineUpgrade({ onLine: true, connectionType: undefined })).toBe(true);
  });
  test("blocks cellular, wimax, bluetooth, none", () => {
    expect(isAllowedConnectionType("cellular")).toBe(false);
    expect(isAllowedConnectionType("wimax")).toBe(false);
    expect(isAllowedConnectionType("bluetooth")).toBe(false);
    expect(shouldAttemptOnlineUpgrade({ onLine: true, connectionType: "cellular" })).toBe(false);
    expect(shouldAttemptOnlineUpgrade({ onLine: true, connectionType: "none" })).toBe(false);
  });
  test("blocks when offline", () => {
    expect(shouldAttemptOnlineUpgrade({ onLine: false, connectionType: "wifi" })).toBe(false);
  });
});
