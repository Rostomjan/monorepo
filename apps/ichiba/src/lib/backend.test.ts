import { describe, expect, test } from "bun:test";
import { backendBaseUrl, resolveCatalogBackend, type RemoteBackendGate } from "./backend";

const gate = (id: RemoteBackendGate["id"], flagEnabled: boolean, baseUrl?: string): RemoteBackendGate => ({
  id,
  flagEnabled,
  baseUrl,
});

describe("resolveCatalogBackend", () => {
  test("flag alone is not enough: no service URL keeps the canonical backend", () => {
    expect(resolveCatalogBackend([gate("python", true, undefined)])).toBe("ts");
  });

  test("service URL alone is not enough: flag off keeps the canonical backend", () => {
    expect(resolveCatalogBackend([gate("python", false, "http://localhost:3021")])).toBe("ts");
  });

  test("both gates on selects that backend", () => {
    expect(resolveCatalogBackend([gate("python", true, "http://localhost:3021")])).toBe("python");
    expect(resolveCatalogBackend([gate("go", true, "http://localhost:3022")])).toBe("go");
  });

  test("the first fully-enabled registry entry wins (priority order is the declaration order)", () => {
    expect(
      resolveCatalogBackend([
        gate("python", true, "http://localhost:3021"),
        gate("go", true, "http://localhost:3022"),
      ]),
    ).toBe("python");
  });

  test("a disabled backend does not mask a later enabled one", () => {
    expect(
      resolveCatalogBackend([
        gate("python", true, undefined),
        gate("go", true, "http://localhost:3022"),
      ]),
    ).toBe("go");
    expect(
      resolveCatalogBackend([
        gate("python", false, "http://localhost:3021"),
        gate("go", true, "http://localhost:3022"),
      ]),
    ).toBe("go");
  });
});

describe("backendBaseUrl", () => {
  const cases: { backend: Parameters<typeof backendBaseUrl>[0]; env: string }[] = [
    { backend: "python", env: "ICHIBA_API_URL" },
    { backend: "go", env: "ICHIBA_GO_API_URL" },
  ];

  const withEnv = (env: string, value: string | undefined, fn: () => void) => {
    const orig = process.env[env];
    try {
      if (value === undefined) delete process.env[env];
      else process.env[env] = value;
      fn();
    } finally {
      if (orig === undefined) delete process.env[env];
      else process.env[env] = orig;
    }
  };

  for (const { backend, env } of cases) {
    test(`${backend}: unset or empty ${env} leaves the backend unusable`, () => {
      withEnv(env, undefined, () => expect(backendBaseUrl(backend)).toBeUndefined());
      withEnv(env, "   ", () => expect(backendBaseUrl(backend)).toBeUndefined());
    });

    test(`${backend}: ${env} is trimmed and trailing slashes are stripped`, () => {
      withEnv(env, "  http://localhost:3021/  ", () => expect(backendBaseUrl(backend)).toBe("http://localhost:3021"));
      withEnv(env, "http://twin.internal:3021///", () =>
        expect(backendBaseUrl(backend)).toBe("http://twin.internal:3021"),
      );
    });
  }

  test("unknown backend ids are a programmer error, not a silent ts", () => {
    expect(() => backendBaseUrl("java" as never)).toThrow("unknown remote backend");
  });
});
