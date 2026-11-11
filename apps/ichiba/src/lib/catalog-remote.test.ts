import { describe, expect, test } from "bun:test";
import { catalogQueryUrl, normalizeSort, remoteListShops, remoteQueryProducts } from "./catalog-remote";
import { generateCatalog, type ProductQueryResult, type Shop } from "./catalog";

describe("normalizeSort", () => {
  test("passes the python API's vocabulary through", () => {
    for (const sort of ["featured", "price-asc", "price-desc"]) {
      expect(normalizeSort(sort)).toBe(sort);
    }
  });

  test("drops everything outside it — same observable semantics as the TS path", () => {
    // The TS sortOrder() treats any other sort as the default ordering
    // (q → similarity, else id asc); the python query_products() applies
    // exactly those semantics when sort is omitted. Undefined means "omit
    // the param" for the remote request.
    expect(normalizeSort(undefined)).toBeUndefined();
    expect(normalizeSort("banana")).toBeUndefined();
    expect(normalizeSort("PRICE-ASC")).toBeUndefined();
  });
});

describe("catalogQueryUrl", () => {
  test("builds /api/products with the API vocabulary only", () => {
    expect(catalogQueryUrl("http://py:3021", {})).toBe("http://py:3021/api/products");
    expect(
      catalogQueryUrl("http://py:3021", { q: " matcha ", shopId: "shop-1", sort: "banana", page: 2, perPage: 12 }),
    ).toBe("http://py:3021/api/products?q=matcha&shopId=shop-1&page=2&perPage=12");
    expect(catalogQueryUrl("http://py:3021/", { sort: "price-asc" })).toBe(
      "http://py:3021/api/products?sort=price-asc",
    );
  });
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const fetchOk = (body: unknown) => (async () => json(body)) as unknown as typeof fetch;
const fetchStatus = (status: number) => (async () => json({}, status)) as unknown as typeof fetch;

// Contract-real fixtures: same generator the parity tests lock across both
// backends.
const catalog = generateCatalog(2, 5);
const queryResult: ProductQueryResult = {
  items: catalog.products.slice(0, 2),
  total: 10,
  totalPages: 5,
  page: 1,
  shopCounts: { ...Object.fromEntries(catalog.shops.map((s) => [s.id, 5])) },
};

describe("remoteQueryProducts", () => {
  test("returns the payload after shape validation", async () => {
    const result = await remoteQueryProducts({ q: "tea" }, "http://py:3021", fetchOk(queryResult));
    expect(result).toEqual(queryResult);
  });

  test("non-2xx surfaces as an error the dispatch turns into the drizzle fallback", async () => {
    const fetcher = fetchStatus(503);
    await expect(remoteQueryProducts({}, "http://py:3021", fetcher)).rejects.toThrow("503");
  });

  test("rejects a payload that does not match the contract shape", async () => {
    const fetcher = fetchOk({ items: "nope" });
    await expect(remoteQueryProducts({}, "http://py:3021", fetcher)).rejects.toThrow("unexpected shape");
  });

  test("rejects items whose fields drift from the Product contract", async () => {
    const fetcher = fetchOk({ ...queryResult, items: [{ id: 1, name: "x" }] });
    await expect(remoteQueryProducts({}, "http://py:3021", fetcher)).rejects.toThrow("unexpected shape");
  });

  test("without a base URL the remote backend is unreachable", async () => {
    await expect(remoteQueryProducts({}, undefined, fetchOk(queryResult))).rejects.toThrow("base URL");
  });
});

describe("remoteListShops", () => {
  const shops: Shop[] = catalog.shops;

  test("unwraps {shops} after shape validation", async () => {
    const result = await remoteListShops("http://py:3021", fetchOk({ shops }));
    expect(result).toEqual(shops);
  });

  test("rejects a missing/endpoint-contract-breaking body", async () => {
    const fetcher = fetchOk({ items: shops });
    await expect(remoteListShops("http://py:3021", fetcher)).rejects.toThrow("unexpected shape");
  });

  test("rejects a non-JSON content type", async () => {
    const fetcher = (async () =>
      new Response("<html>nope</html>", { status: 200, headers: { "content-type": "text/html" } })) as unknown as typeof fetch;
    await expect(remoteListShops("http://py:3021", fetcher)).rejects.toThrow("non-JSON");
  });
});
