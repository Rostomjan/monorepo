import { describe, expect, test } from "bun:test";
import { pythonApiBaseUrl, resolveCatalogBackend } from "./backend";

describe("resolveCatalogBackend", () => {
  test("flag alone is not enough: no service URL keeps the canonical backend", () => {
    expect(resolveCatalogBackend(true, undefined)).toBe("ts");
  });

  test("service URL alone is not enough: flag off keeps the canonical backend", () => {
    expect(resolveCatalogBackend(false, "http://localhost:3021")).toBe("ts");
  });

  test("both gates on selects the python backend", () => {
    expect(resolveCatalogBackend(true, "http://localhost:3021")).toBe("python");
  });
});

describe("pythonApiBaseUrl", () => {
  const restore = (orig: string | undefined) => {
    if (orig === undefined) delete process.env.ICHIBA_API_URL;
    else process.env.ICHIBA_API_URL = orig;
  };

  const withEnv = (value: string | undefined, fn: () => void) => {
    const orig = process.env.ICHIBA_API_URL;
    try {
      if (value === undefined) delete process.env.ICHIBA_API_URL;
      else process.env.ICHIBA_API_URL = value;
      fn();
    } finally {
      restore(orig);
    }
  };

  test("unset or empty env leaves the python backend unusable", () => {
    withEnv(undefined, () => expect(pythonApiBaseUrl()).toBeUndefined());
    withEnv("   ", () => expect(pythonApiBaseUrl()).toBeUndefined());
  });

  test("env is trimmed and trailing slashes are stripped", () => {
    withEnv("  http://localhost:3021/  ", () => expect(pythonApiBaseUrl()).toBe("http://localhost:3021"));
    withEnv("http://ichiba-py.internal:3021///", () =>
      expect(pythonApiBaseUrl()).toBe("http://ichiba-py.internal:3021"),
    );
  });
});
