package main

// Orders/checkout — Go port of apps/ichiba/src/lib/orders.ts (and
// ichibaapi.orders). Contract rules mirrored exactly:
//   - a mixed-shop cart splits into one Order per Shop, in first-seen
//     shop order (TS Map / python dict insertion order — replicated with
//     an ordered key slice, Go maps would shuffle it);
//   - OrderItems snapshot name+price at purchase time;
//   - checkout validates, locks rows (SELECT … FOR UPDATE), decrements
//     stock, and persists — all inside ONE transaction, so concurrent
//     checkouts for the same product serialize on the row lock instead
//     of overselling;
//   - error strings are identical to the TS ones because the live
//     contract checker (scripts/contract.py) asserts them verbatim.

import (
	"context"
	"fmt"
	"math"
	"math/rand/v2"
	"time"

	"github.com/jackc/pgx/v5"
)

// OrderItem snapshots the product line at purchase time.
type OrderItem struct {
	ProductID string `json:"productId"`
	Name      string `json:"name"`
	PriceYen  int    `json:"priceYen"`
	Qty       int    `json:"qty"`
}

// Order is the wire shape (camelCase, byte-identical across twins).
type Order struct {
	ID        string      `json:"id"`
	UserID    string      `json:"userId"`
	ShopID    string      `json:"shopId"`
	ShopName  string      `json:"shopName"`
	Items     []OrderItem `json:"items"`
	TotalYen  int         `json:"totalYen"`
	CreatedAt string      `json:"createdAt"`
}

// CheckoutLine is the raw request line: productId + any JSON number (the
// TS route accepts any number here and lets checkout reject non-integers
// with "bad qty" — float64 keeps that quirk, exactly like python's
// float-then-400 comment).
type CheckoutLine struct {
	ProductID string
	Qty       float64
}

// ProductSnapshot is the CatalogLookup product shape
// ({id, shopId, name, priceYen}) for runtime parity with TS/python.
type ProductSnapshot struct {
	ID       string
	ShopID   string
	Name     string
	PriceYen int
}

// orderError carries the contract's error string + expected HTTP status.
type orderError struct {
	status  int
	message string
}

func (e *orderError) Error() string { return e.message }

func orderErr(status int, format string, args ...any) *orderError {
	return &orderError{status: status, message: fmt.Sprintf(format, args...)}
}

// CatalogLookup is the injected lookup seam (same as the TS interface /
// python Protocol) so pure tests run on fixtures without a database.
type CatalogLookup interface {
	product(id string) (ProductSnapshot, bool)
	shopName(shopID string) (string, bool)
}

// isoNow mirrors TS `new Date().toISOString()`: millisecond precision,
// trailing Z (Go's RFC3339 with .000 + UTC offset formats exactly that).
func isoNow() string {
	return time.Now().UTC().Format("2006-01-02T15:04:05.000Z07:00")
}

// newOrderID mirrors TS: `order-{epochMs}-{i}-{floor(random()*1e6)}`.
func newOrderID(i int) string {
	return fmt.Sprintf("order-%d-%d-%d", time.Now().UnixMilli(), i, rand.Int64N(1_000_000))
}

// splitCartToOrders — pure apart from the injected lookup: split a
// mixed-shop cart into one Order per Shop (Ichiba rule), first-seen shop
// order, per-shop items in line order.
func splitCartToOrders(lines []CheckoutLine, userID string, lookup CatalogLookup) ([]Order, error) {
	// Ordered shop set: a slice for first-seen order, a map for grouping.
	shopOrder := []string{}
	byShop := map[string][]OrderItem{}
	for _, line := range lines {
		product, ok := lookup.product(line.ProductID)
		if !ok {
			return nil, orderErr(400, "unknown product: %s", line.ProductID)
		}
		// TS splitCartToOrders checks qty AFTER the lookup (unknown wins);
		// checkoutCart pre-validates qty before any lookup, so in the
		// checkout flow the bad-qty error comes first — both orders are
		// mirrored faithfully by validating here and pre-validating there.
		if line.Qty <= 0 || line.Qty > 99 {
			return nil, orderErr(400, "bad qty for %s", line.ProductID)
		}
		qty := int(line.Qty)
		byShop[product.ShopID] = append(byShop[product.ShopID], OrderItem{
			ProductID: product.ID,
			Name:      product.Name,
			PriceYen:  product.PriceYen,
			Qty:       qty,
		})
		if _, seen := shopSeen(shopOrder, product.ShopID); !seen {
			shopOrder = append(shopOrder, product.ShopID)
		}
	}
	now := isoNow()
	orders := make([]Order, 0, len(shopOrder))
	for i, shopID := range shopOrder {
		items := byShop[shopID]
		total := 0
		for _, it := range items {
			total += it.PriceYen * it.Qty
		}
		shopName, ok := lookup.shopName(shopID)
		if !ok {
			shopName = shopID // TS: `?? shopId`
		}
		orders = append(orders, Order{
			ID:        newOrderID(i),
			UserID:    userID,
			ShopID:    shopID,
			ShopName:  shopName,
			Items:     items,
			TotalYen:  total,
			CreatedAt: now,
		})
	}
	return orders, nil
}

func shopSeen(shopOrder []string, shopID string) (int, bool) {
	for i, id := range shopOrder {
		if id == shopID {
			return i, true
		}
	}
	return -1, false
}

// checkoutCart — atomic checkout: validate + lock rows + decrement stock
// + split into per-shop orders + persist, one transaction. Concurrent
// checkouts for the same product serialize on the row lock instead of
// overselling (drizzle `.for("update")` / django select_for_update).
func checkoutCart(ctx context.Context, pool dbPool, lines []CheckoutLine, userID string) ([]Order, error) {
	if len(lines) == 0 || len(lines) > 50 {
		return nil, orderErr(400, "items must be a non-empty array (max 50)")
	}
	tx, err := pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx) //nolint:errcheck // commits below; rollback is the error path

	seen := map[string]ProductSnapshot{}
	for _, line := range lines {
		// TS checkoutCart validates qty FIRST (integer 1..99), before the
		// row lock — a bad qty never touches the database.
		if !isContractInteger(line.Qty) || line.Qty < 1 || line.Qty > 99 {
			return nil, orderErr(400, "bad qty for %s", line.ProductID)
		}
		var p ProductSnapshot
		var stock int
		err := tx.QueryRow(ctx,
			"SELECT id, shop_id, name, price_yen, stock FROM products WHERE id = $1 FOR UPDATE",
			line.ProductID).Scan(&p.ID, &p.ShopID, &p.Name, &p.PriceYen, &stock)
		if err == pgx.ErrNoRows {
			return nil, orderErr(400, "unknown product: %s", line.ProductID)
		}
		if err != nil {
			return nil, err
		}
		if int(line.Qty) > stock {
			return nil, orderErr(409, "insufficient stock for %s", line.ProductID)
		}
		if _, err := tx.Exec(ctx,
			"UPDATE products SET stock = stock - $1 WHERE id = $2", int(line.Qty), line.ProductID); err != nil {
			return nil, err
		}
		// Snapshot from the locked pre-decrement row (TS/python do the
		// same: items store the row's price, not post-write data).
		seen[p.ID] = p
	}

	split, err := splitCartToOrders(lines, userID, txLookup{ctx: ctx, tx: tx, seen: seen})
	if err != nil {
		return nil, err
	}
	for _, o := range split {
		if _, err := tx.Exec(ctx,
			"INSERT INTO orders (id, user_id, shop_id, shop_name, total_yen, created_at) "+
				"VALUES ($1, $2, $3, $4, $5, $6)",
			o.ID, o.UserID, o.ShopID, o.ShopName, o.TotalYen, o.CreatedAt); err != nil {
			return nil, err
		}
		for _, it := range o.Items {
			if _, err := tx.Exec(ctx,
				"INSERT INTO order_items (order_id, product_id, name, price_yen, qty) "+
					"VALUES ($1, $2, $3, $4, $5)",
				o.ID, it.ProductID, it.Name, it.PriceYen, it.Qty); err != nil {
				return nil, err
			}
		}
	}
	return split, tx.Commit(ctx)
}

// isContractInteger ports TS Number.isInteger for JSON numbers: every
// finite float64 that equals its own truncation. (JSON cannot encode
// NaN/Infinity, so those guards are moot here but harmless.)
func isContractInteger(qty float64) bool {
	return !math.IsInf(qty, 0) && qty == math.Trunc(qty)
}

// txLookup adapts an open transaction to the CatalogLookup seam: products
// resolve from the already-locked snapshots, shops query the tx.
type txLookup struct {
	ctx  context.Context
	tx   dbPool
	seen map[string]ProductSnapshot
}

func (l txLookup) product(id string) (ProductSnapshot, bool) {
	p, ok := l.seen[id]
	return p, ok
}

func (l txLookup) shopName(shopID string) (string, bool) {
	var name string
	err := l.tx.QueryRow(l.ctx, "SELECT name FROM shops WHERE id = $1", shopID).Scan(&name)
	if err != nil {
		return "", false
	}
	return name, true
}

// Compile-time check: *pgx.Tx satisfies the same query surface as the
// pool (QueryRow/Query/Begin), so txLookup can hold a tx in its dbPool
// field — its Begin is simply never called.
var _ dbPool = pgx.Tx(nil)

// listOrders reassembles orders + items for a user (guest until Clerk
// lands here). Reads only — writes go through checkoutCart.
func listOrders(ctx context.Context, pool dbPool, userID string) ([]Order, error) {
	rows, err := pool.Query(ctx,
		"SELECT id, user_id, shop_id, shop_name, total_yen, created_at FROM orders "+
			"WHERE user_id = $1 ORDER BY created_at DESC", userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	type orderHead struct {
		id, userID, shopID, shopName string
		totalYen                     int
		createdAt                    string
	}
	heads := []orderHead{}
	for rows.Next() {
		var h orderHead
		if err := rows.Scan(&h.id, &h.userID, &h.shopID, &h.shopName, &h.totalYen, &h.createdAt); err != nil {
			return nil, err
		}
		heads = append(heads, h)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if len(heads) == 0 {
		return []Order{}, nil
	}

	ids := make([]string, len(heads))
	for i, h := range heads {
		ids[i] = h.id
	}
	itemRows, err := pool.Query(ctx,
		"SELECT order_id, product_id, name, price_yen, qty FROM order_items "+
			"WHERE order_id = ANY($1) ORDER BY product_id", ids)
	if err != nil {
		return nil, err
	}
	defer itemRows.Close()
	byOrder := map[string][]OrderItem{}
	for itemRows.Next() {
		var orderID string
		var it OrderItem
		if err := itemRows.Scan(&orderID, &it.ProductID, &it.Name, &it.PriceYen, &it.Qty); err != nil {
			return nil, err
		}
		byOrder[orderID] = append(byOrder[orderID], it)
	}
	if err := itemRows.Err(); err != nil {
		return nil, err
	}

	orders := make([]Order, 0, len(heads))
	for _, h := range heads {
		orders = append(orders, Order{
			ID:        h.id,
			UserID:    h.userID,
			ShopID:    h.shopID,
			ShopName:  h.shopName,
			Items:     byOrder[h.id],
			TotalYen:  h.totalYen,
			CreatedAt: h.createdAt,
		})
	}
	return orders, nil
}
