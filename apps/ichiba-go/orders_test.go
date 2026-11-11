package main

import (
	"encoding/json"
	"errors"
	"regexp"
	"testing"
)

// fakeLookup — the CatalogLookup seam with fixture data, no database.
type fakeLookup struct {
	products map[string]ProductSnapshot
	shops    map[string]string
}

func (f fakeLookup) product(id string) (ProductSnapshot, bool) {
	p, ok := f.products[id]
	return p, ok
}

func (f fakeLookup) shopName(shopID string) (string, bool) {
	name, ok := f.shops[shopID]
	return name, ok
}

var testLookup = fakeLookup{
	products: map[string]ProductSnapshot{
		"shop-1-p1": {ID: "shop-1-p1", ShopID: "shop-1", Name: "Smart Backpack 1", PriceYen: 4690},
		"shop-1-p2": {ID: "shop-1-p2", ShopID: "shop-1", Name: "Classic Matcha Set 2", PriceYen: 1000},
		"shop-2-p1": {ID: "shop-2-p1", ShopID: "shop-2", Name: "Eco Tea Pot 1", PriceYen: 2500},
	},
	shops: map[string]string{"shop-1": "Shop 1 Deluxe", "shop-2": "Shop 2 Compact"},
}

func TestSplitMixedShopCartIntoOneOrderPerShop(t *testing.T) {
	orders, err := splitCartToOrders([]CheckoutLine{
		{ProductID: "shop-1-p1", Qty: 2},
		{ProductID: "shop-2-p1", Qty: 1},
		{ProductID: "shop-1-p2", Qty: 3},
	}, "guest", testLookup)
	if err != nil {
		t.Fatalf("split: %v", err)
	}
	if len(orders) != 2 {
		t.Fatalf("got %d orders, want 2 (one per shop)", len(orders))
	}
	// First-seen shop order (TS Map / python dict insertion semantics).
	if orders[0].ShopID != "shop-1" || orders[1].ShopID != "shop-2" {
		t.Fatalf("shop order = %s,%s, want shop-1,shop-2", orders[0].ShopID, orders[1].ShopID)
	}
	// Per-shop items keep line order; same-shop lines merge into one order.
	if len(orders[0].Items) != 2 || orders[0].Items[0].ProductID != "shop-1-p1" ||
		orders[0].Items[1].ProductID != "shop-1-p2" {
		t.Fatalf("shop-1 items wrong: %+v", orders[0].Items)
	}
	// Totals, shop name snapshots, user attribution, shared timestamp.
	if orders[0].TotalYen != 4690*2+1000*3 || orders[1].TotalYen != 2500 {
		t.Fatalf("totals wrong: %d / %d", orders[0].TotalYen, orders[1].TotalYen)
	}
	if orders[0].ShopName != "Shop 1 Deluxe" || orders[1].ShopName != "Shop 2 Compact" {
		t.Fatalf("shop names wrong: %q / %q", orders[0].ShopName, orders[1].ShopName)
	}
	if orders[0].UserID != "guest" || orders[1].UserID != "guest" {
		t.Fatalf("userId wrong")
	}
	if orders[0].CreatedAt != orders[1].CreatedAt {
		t.Fatalf("createdAt must be one shared timestamp (TS computes it once)")
	}
}

func TestSplitErrorStrings(t *testing.T) {
	cases := []struct {
		lines  []CheckoutLine
		status int
		want   string
	}{
		{[]CheckoutLine{{ProductID: "nope", Qty: 1}}, 400, "unknown product: nope"},
		{[]CheckoutLine{{ProductID: "shop-1-p1", Qty: 0}}, 400, "bad qty for shop-1-p1"},
		{[]CheckoutLine{{ProductID: "shop-1-p1", Qty: -1}}, 400, "bad qty for shop-1-p1"},
		{[]CheckoutLine{{ProductID: "shop-1-p1", Qty: 100}}, 400, "bad qty for shop-1-p1"},
		// NOTE: no 1.5 case — TS's pure split only checks <= 0 || > 99;
		// non-integer rejection is checkoutCart's Number.isInteger job
		// (covered by the DB error-contract test).
	}
	for _, c := range cases {
		_, err := splitCartToOrders(c.lines, "guest", testLookup)
		var oerr *orderError
		if !errors.As(err, &oerr) {
			t.Fatalf("qty %v: expected *orderError, got %v", c.lines[0].Qty, err)
		}
		if oerr.status != c.status || oerr.message != c.want {
			t.Fatalf("got %d %q, want %d %q", oerr.status, oerr.message, c.status, c.want)
		}
	}
}

func TestUnknownShopFallsBackToShopID(t *testing.T) {
	// TS: `?? shopId` when the shop lookup misses.
	orders, err := splitCartToOrders([]CheckoutLine{{ProductID: "shop-2-p1", Qty: 1}},
		"guest", fakeLookup{products: testLookup.products, shops: map[string]string{}})
	if err != nil || len(orders) != 1 || orders[0].ShopName != "shop-2" {
		t.Fatalf("fallback wrong: %v %v", err, orders)
	}
}

func TestNewOrderIDShape(t *testing.T) {
	// order-{epochMs}-{i}-{floor(random()*1e6)} — same as TS/python.
	re := regexp.MustCompile(`^order-\d{13}-\d-\d{1,6}$`)
	for i := range 3 {
		id := newOrderID(i)
		if !re.MatchString(id) {
			t.Fatalf("id %q does not match the TS shape", id)
		}
	}
}

func TestIsoNowMatchesTSISOString(t *testing.T) {
	// new Date().toISOString(): 2026-11-11T06:00:00.123Z
	re := regexp.MustCompile(`^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$`)
	if got := isoNow(); !re.MatchString(got) {
		t.Fatalf("isoNow = %q, want TS toISOString shape", got)
	}
}

func TestIsContractInteger(t *testing.T) {
	if !isContractInteger(2) || !isContractInteger(2.0) || !isContractInteger(-3) {
		t.Fatal("integers must pass")
	}
	if isContractInteger(1.5) || isContractInteger(0.0001) {
		t.Fatal("fractions must fail (TS Number.isInteger)")
	}
}

func TestParseCheckoutLines(t *testing.T) {
	mustParse := func(body string) []CheckoutLine {
		t.Helper()
		var parsed any
		if err := jsonUnmarshalForTest(body, &parsed); err != nil {
			t.Fatalf("test body does not parse: %v", err)
		}
		lines, apiErr := parseCheckoutLines(parsed)
		if apiErr != nil {
			t.Fatalf("unexpected error for %s: %v", body, apiErr)
		}
		return lines
	}

	lines := mustParse(`{"items":[{"productId":"a","qty":2}]}`)
	if len(lines) != 1 || lines[0].ProductID != "a" || lines[0].Qty != 2 {
		t.Fatalf("parsed wrong: %+v", lines)
	}
	// Any JSON number is accepted here (TS typeof number); checkoutCart
	// rejects non-integers later with "bad qty" — the python twin's
	// float-then-400 quirk, mirrored.
	lines = mustParse(`{"items":[{"productId":"a","qty":1.5}]}`)
	if lines[0].Qty != 1.5 {
		t.Fatalf("qty must pass through raw: %+v", lines)
	}

	// Contract errors: exact strings, exact statuses.
	expectLinesErr := func(body, message string) {
		t.Helper()
		var parsed any
		if err := jsonUnmarshalForTest(body, &parsed); err != nil {
			t.Fatalf("test body does not parse: %v", err)
		}
		_, apiErr := parseCheckoutLines(parsed)
		expectAPIError(t, apiErr, 400, message)
	}
	expectLinesErr(`{"items":[]}`, "items must be a non-empty array (max 50)")
	expectLinesErr(`{}`, "items must be a non-empty array (max 50)")
	expectLinesErr(`{"items":`+strconv51Items()+`}`, "items must be a non-empty array (max 50)")
	expectLinesErr(`{"items":[{"qty":2}]}`, "each item needs productId:string, qty:number")
	expectLinesErr(`{"items":[{"productId":2,"qty":2}]}`, "each item needs productId:string, qty:number")
	// JSON booleans are NOT numbers (python's isinstance(qty, bool) guard).
	expectLinesErr(`{"items":[{"productId":"a","qty":true}]}`, "each item needs productId:string, qty:number")
	expectLinesErr(`{"items":[2]}`, "each item needs productId:string, qty:number")
}

func TestClientIPHeaderChain(t *testing.T) {
	if got := clientIP(nil); got != "anon" {
		t.Fatalf("no headers = %q, want anon", got)
	}
	h := map[string][]string{"X-Forwarded-For": {"1.2.3.4, 5.6.7.8"}}
	if got := clientIP(h); got != "1.2.3.4" {
		t.Fatalf("x-forwarded-for first hop = %q, want 1.2.3.4", got)
	}
	h = map[string][]string{"X-Real-Ip": {"9.9.9.9"}}
	if got := clientIP(h); got != "9.9.9.9" {
		t.Fatalf("x-real-ip = %q", got)
	}
}

func jsonUnmarshalForTest(body string, v *any) error { return json.Unmarshal([]byte(body), v) }

// 51 items, one over the limit.
func strconv51Items() string {
	s := "["
	for i := 0; i < 51; i++ {
		if i > 0 {
			s += ","
		}
		s += `{"productId":"a","qty":1}`
	}
	return s + "]"
}
