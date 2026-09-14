import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Regression test for Sentry:
//   SchemaError "KeyPath createdAt on object store entries is not indexed"
//   (+ the DatabaseClosedError wrapper from the aborted upgrade).
// orderBy() needs a Dexie index; upgrade code runs against the *old*
// schema, so it must never orderBy a field that older versions lack.
describe("db schema", () => {
  const src = readFileSync(join(import.meta.dir, "db.ts"), "utf8");

  test("upgrade code never uses orderBy (old schemas may lack the index)", () => {
    expect(src).not.toContain('table.orderBy(');
  });

  test("latest entries schema indexes every orderBy field used at runtime", () => {
    const schemas = [...src.matchAll(/entries:\s*"([^"]+)"/g)].map((m) => m[1]);
    expect(schemas.length).toBeGreaterThan(0);
    const latest = schemas[schemas.length - 1].split(",").map((s) => s.trim());

    const orderBys = new Set(
      [...src.matchAll(/\.entries\.orderBy\("([^"]+)"\)/g)].map((m) => m[1]),
    );
    for (const field of orderBys) {
      expect(latest).toContain(field);
    }
    // Pin the field from the Sentry crash explicitly.
    expect(latest).toContain("createdAt");
  });
});
