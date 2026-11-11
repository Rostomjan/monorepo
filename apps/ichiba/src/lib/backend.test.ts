import { describe, expect, test } from "bun:test";
import {
  backendBaseUrl,
  currentCatalogBackend,
  forcedBackendOverride,
  resolveCatalogBackend,
  type RemoteBackendGate,
} from "./backend";

/** Temporarily set env vars, restoring the originals afterwards. */
async function withEnv(vars: Record<string, string | undefined>, fn: () => void | Promise<void>): Promise<void> {
  const orig: Record<string, string | undefined> = {};
  for (const name of Object.keys(vars)) orig[name] = process.env[name];
  try {
    for (const [name, value] of Object.entries(vars)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
    await fn();
  } finally {
    for (const [name, value] of Object.entries(orig)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
}

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

describe("forcedBackendOverride (dev-only escape hatch)", () => {
  test("unset or blank means no override", () => {
    withEnv({ ICHIBA_FORCE_BACKEND: undefined }, () => expect(forcedBackendOverride()).toBeUndefined());
    withEnv({ ICHIBA_FORCE_BACKEND: "   " }, () => expect(forcedBackendOverride()).toBeUndefined());
  });

  test("valid registry ids are honored, case-insensitive and trimmed", () => {
    withEnv({ ICHIBA_FORCE_BACKEND: "go" }, () => expect(forcedBackendOverride()).toBe("go"));
    withEnv({ ICHIBA_FORCE_BACKEND: "  Python  " }, () => expect(forcedBackendOverride()).toBe("python"));
    withEnv({ ICHIBA_FORCE_BACKEND: "GO" }, () => expect(forcedBackendOverride()).toBe("go"));
  });

  test("unknown values are ignored with a warning, never a crash", () => {
    withEnv({ ICHIBA_FORCE_BACKEND: "java" }, () => expect(forcedBackendOverride()).toBeUndefined());
    withEnv({ ICHIBA_FORCE_BACKEND: "ts" }, () => expect(forcedBackendOverride()).toBeUndefined());
  });

  test("production refuses the override even when it is set", () => {
    withEnv({ NODE_ENV: "production", ICHIBA_FORCE_BACKEND: "go" }, () =>
      expect(forcedBackendOverride()).toBeUndefined(),
    );
  });
});

describe("currentCatalogBackend", () => {
  // NODE_ENV is "test" under bun test, so the dev-only override is active
  // in these tests — exactly the environment it is meant for.

  test("a forced backend with a configured service is served — flag machinery never evaluated", async () => {
    await withEnv({ ICHIBA_FORCE_BACKEND: "go", ICHIBA_GO_API_URL: "http://localhost:3022" }, () =>
      expect(currentCatalogBackend()).resolves.toBe("go"),
    );
  });

  test("a forced backend without its base-url env falls back to the canonical path", async () => {
    await withEnv({ ICHIBA_FORCE_BACKEND: "go" }, () => expect(currentCatalogBackend()).resolves.toBe("ts"));
  });
});

describe("backendBaseUrl", () => {
  const cases: { backend: Parameters<typeof backendBaseUrl>[0]; env: string }[] = [
    { backend: "python", env: "ICHIBA_API_URL" },
    { backend: "go", env: "ICHIBA_GO_API_URL" },
  ];

  for (const { backend, env } of cases) {
    test(`${backend}: unset or empty ${env} leaves the backend unusable`, () => {
      withEnv({ [env]: undefined }, () => expect(backendBaseUrl(backend)).toBeUndefined());
      withEnv({ [env]: "   " }, () => expect(backendBaseUrl(backend)).toBeUndefined());
    });

    test(`${backend}: ${env} is trimmed and trailing slashes are stripped`, () => {
      withEnv({ [env]: "  http://localhost:3021/  " }, () =>
        expect(backendBaseUrl(backend)).toBe("http://localhost:3021"),
      );
      withEnv({ [env]: "http://twin.internal:3021///" }, () =>
        expect(backendBaseUrl(backend)).toBe("http://twin.internal:3021"),
      );
    });
  }

  test("unknown backend ids are a programmer error, not a silent ts", () => {
    expect(() => backendBaseUrl("java" as never)).toThrow("unknown remote backend");
  });
});
