package main

// DB integration tests — the Go mirror of apps/ichiba-py/tests/test_db_api.py
// (products + health part). They need a real Postgres: docker compose up db.
// Without DATABASE_URL they skip, so `bun run check` stays green in CI
// without a DB service — same contract as the python suite.
//
// The tests never touch the configured database's data: they create a
// scratch database (ichiba_go_test), replay apps/ichiba's drizzle SQL
// migrations into it (the single source of schema truth), and seed it with
// generateCatalog — which is byte-identical across languages, so the data
// matches what `bun run db:seed` would produce.

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

const scratchDBName = "ichiba_go_test"

func testPool(t *testing.T) *pgxpool.Pool {
	t.Helper()
	base := databaseURL()
	if base == "" {
		t.Skip("DATABASE_URL not set — db tests require local Postgres (docker compose up db)")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	admin, err := pgxpool.New(ctx, base)
	if err != nil {
		t.Fatalf("connect to configured DB: %v", err)
	}
	defer admin.Close()

	// Recreate the scratch database from scratch every run: DROP … WITH
	// (FORCE) evicts stragglers from an earlier aborted run.
	if _, err := admin.Exec(ctx, "DROP DATABASE IF EXISTS "+scratchDBName+" WITH (FORCE)"); err != nil {
		t.Skipf("cannot drop scratch database (%v) — is the configured user a superuser?", err)
	}
	if _, err := admin.Exec(ctx, "CREATE DATABASE "+scratchDBName); err != nil {
		t.Skipf("cannot create scratch database (%v) — is the configured user a superuser?", err)
	}
	t.Cleanup(func() {
		cleanupCtx, cleanupCancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cleanupCancel()
		_, _ = admin.Exec(cleanupCtx, "DROP DATABASE IF EXISTS "+scratchDBName+" WITH (FORCE)")
	})

	scratchURL := swapDatabaseName(base, scratchDBName)
	pool, err := pgxpool.New(ctx, scratchURL)
	if err != nil {
		t.Fatalf("connect to scratch DB: %v", err)
	}
	t.Cleanup(pool.Close)

	replayMigrations(t, ctx, pool)
	seedCatalog(t, ctx, pool)
	return pool
}

// replayMigrations mirrors python conftest's _replay_migrations: the
// migration files are simple DDL (no string literals containing ';'), so
// comment-stripped splitting on ';' is faithful to psql -f. pg_trgm
// failures are tolerated (python does the same: privileges may lack it on
// managed instances; docker db installs it fine).
func replayMigrations(t *testing.T, ctx context.Context, pool *pgxpool.Pool) {
	t.Helper()
	matches, err := filepath.Glob(filepath.Join("..", "ichiba", "src", "lib", "db", "migrations", "*.sql"))
	if err != nil || len(matches) == 0 {
		t.Fatalf("no drizzle migrations found next to the twin: %v", err)
	}
	sort.Strings(matches)
	for _, path := range matches {
		raw, err := os.ReadFile(path)
		if err != nil {
			t.Fatalf("read migration %s: %v", path, err)
		}
		var code strings.Builder
		for _, line := range strings.Split(string(raw), "\n") {
			if strings.HasPrefix(strings.TrimSpace(line), "--") {
				continue
			}
			code.WriteString(line)
			code.WriteString("\n")
		}
		for _, statement := range strings.Split(code.String(), ";") {
			statement = strings.TrimSpace(statement)
			if statement == "" {
				continue
			}
			if _, err := pool.Exec(ctx, statement); err != nil {
				if strings.Contains(statement, "pg_trgm") {
					t.Logf("skipping %q: %v", statement, err)
					continue
				}
				t.Fatalf("migration %s failed: %v\n%s", filepath.Base(path), err, statement)
			}
		}
	}
}

func seedCatalog(t *testing.T, ctx context.Context, pool *pgxpool.Pool) {
	t.Helper()
	shops, products := generateCatalog(40, 30, 42)
	for _, shop := range shops {
		if _, err := pool.Exec(ctx, "INSERT INTO shops (id, name) VALUES ($1, $2)", shop.ID, shop.Name); err != nil {
			t.Fatalf("seed shop: %v", err)
		}
	}
	for _, p := range products {
		if _, err := pool.Exec(ctx,
			"INSERT INTO products (id, shop_id, name, price_yen, stock) VALUES ($1, $2, $3, $4, $5)",
			p.ID, p.ShopID, p.Name, p.PriceYen, p.Stock); err != nil {
			t.Fatalf("seed product: %v", err)
		}
	}
}

func swapDatabaseName(url, name string) string {
	if i := strings.LastIndex(url, "/"); i >= 0 {
		return url[:i+1] + name
	}
	return url
}

func newTestServer(pool *pgxpool.Pool) *httptest.Server {
	return httptest.NewServer((&server{pool: pool}).routes())
}

func getJSON(t *testing.T, base, path string) (int, map[string]any) {
	t.Helper()
	res, err := http.Get(base + path)
	if err != nil {
		t.Fatalf("GET %s: %v", path, err)
	}
	defer res.Body.Close()
	var body map[string]any
	if err := json.NewDecoder(res.Body).Decode(&body); err != nil {
		t.Fatalf("GET %s: body is not JSON: %v", path, err)
	}
	return res.StatusCode, body
}

func TestHealthReportsReady(t *testing.T) {
	srv := newTestServer(testPool(t))
	status, body := getJSON(t, srv.URL, "/api/health")
	if status != http.StatusOK {
		t.Fatalf("health status = %d, body = %v", status, body)
	}
	if body["ok"] != true || body["app"] != "ichiba" || body["stage"] != float64(3) {
		t.Fatalf("health header fields wrong: %v", body)
	}
	if body["database"] != "ready" {
		t.Fatalf("database = %v, want ready", body["database"])
	}
	relations, ok := body["relations"].(map[string]any)
	if !ok || len(relations) != 4 {
		t.Fatalf("relations = %v, want all four keys", body["relations"])
	}
	for _, name := range []string{"shops", "products", "orders", "order_items"} {
		if relations[name] != true {
			t.Fatalf("relation %s = %v, want true", name, relations[name])
		}
	}
}

func TestProductsQueryShapesMatchTS(t *testing.T) {
	srv := newTestServer(testPool(t))

	// Search shape: camelCase product fields, paging fields present.
	status, body := getJSON(t, srv.URL, "/api/products?q=backpack&perPage=5")
	if status != http.StatusOK {
		t.Fatalf("products status = %d", status)
	}
	items, ok := body["items"].([]any)
	if !ok || len(items) == 0 {
		t.Fatalf("items = %v, want non-empty (backpack matches seeded catalog)", body["items"])
	}
	first, ok := items[0].(map[string]any)
	if !ok {
		t.Fatalf("item shape = %T", items[0])
	}
	wantKeys := []string{"id", "shopId", "name", "priceYen", "stock"}
	if len(first) != len(wantKeys) {
		t.Fatalf("item keys = %v, want exactly %v", first, wantKeys)
	}
	for _, key := range wantKeys {
		if _, present := first[key]; !present {
			t.Fatalf("item missing %q: %v", key, first)
		}
	}
	for _, key := range []string{"total", "totalPages", "page", "shopCounts"} {
		if _, present := body[key]; !present {
			t.Fatalf("body missing %q: %v", key, body)
		}
	}

	// Page clamps to range.
	_, above := getJSON(t, srv.URL, "/api/products?page=9999&perPage=12")
	if above["page"] != above["totalPages"] {
		t.Fatalf("page = %v, totalPages = %v, want clamped", above["page"], above["totalPages"])
	}

	// sort=price-asc orders ascending (JPY integers).
	_, priced := getJSON(t, srv.URL, "/api/products?sort=price-asc")
	pricedItems := priced["items"].([]any)
	prices := make([]float64, 0, len(pricedItems))
	for _, item := range pricedItems {
		prices = append(prices, item.(map[string]any)["priceYen"].(float64))
	}
	for i := 1; i < len(prices); i++ {
		if prices[i] < prices[i-1] {
			t.Fatalf("price-asc not sorted: %v", prices)
		}
	}
}

func TestProductsQueryCombinesQAndShopID(t *testing.T) {
	// Regression (caught by scripts/diff-twins.py): combining q with the
	// shop filter used to misbind the shopId argument onto LIMIT/OFFSET
	// (500s) or onto the similarity arg (silently empty pages). The two
	// filters must compose: every returned item matches the query AND the
	// shop, and each sort variant behaves identically.
	srv := newTestServer(testPool(t))
	for _, sort := range []string{"featured", "price-asc", "price-desc"} {
		status, body := getJSON(t, srv.URL,
			fmt.Sprintf("/api/products?q=backpack&shopId=shop-1&sort=%s", sort))
		if status != http.StatusOK {
			t.Fatalf("sort=%s: status = %d (must be 200)", sort, status)
		}
		items, ok := body["items"].([]any)
		if !ok || len(items) == 0 {
			t.Fatalf("sort=%s: items = %v, want the shop-1 backpacks", sort, body["items"])
		}
		for _, item := range items {
			p := item.(map[string]any)
			if p["shopId"] != "shop-1" {
				t.Fatalf("sort=%s: shop filter leaked: %v", sort, p)
			}
			if name, _ := p["name"].(string); !strings.Contains(name, "Backpack") {
				t.Fatalf("sort=%s: q filter leaked: %v", sort, p)
			}
		}
	}
}

func TestProductsIlikeEscaping(t *testing.T) {
	srv := newTestServer(testPool(t))
	// Seeded names never contain %, _ or \ — the escaped pattern must match
	// nothing, proving the metacharacters stayed literals (a naive pattern
	// would have matched everything via the % wildcard). %25 is the
	// URL-encoded %.
	status, body := getJSON(t, srv.URL, "/api/products?q=50%25_a")
	if status != http.StatusOK {
		t.Fatalf("status = %d", status)
	}
	if body["total"] != float64(0) {
		t.Fatalf("total = %v, want 0 (escaped metacharacters match nothing)", body["total"])
	}
}

func TestShopsList(t *testing.T) {
	srv := newTestServer(testPool(t))
	status, body := getJSON(t, srv.URL, "/api/shops")
	if status != http.StatusOK {
		t.Fatalf("shops status = %d", status)
	}
	shops, ok := body["shops"].([]any)
	if !ok || len(shops) != 40 {
		t.Fatalf("shops = %d entries, want 40", len(shops))
	}
	first := shops[0].(map[string]any)
	if first["id"] != "shop-1" || first["name"] != "Shop 1 Deluxe" {
		t.Fatalf("first shop = %v, want shop-1 / Shop 1 Deluxe (fixture parity)", first)
	}
}
