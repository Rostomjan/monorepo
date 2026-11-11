package main

import (
	"context"
	"fmt"
	"math"
	"slices"
	"strings"
)

// Wire shapes are the contract (docs/BACKEND_TWINS.md): camelCase JSON,
// byte-identical to the TS route handlers' and the python views' output —
// the live contract checker asserts shapes and values, and the fixture
// parity test locks ids/names/prices across all three languages.

type Shop struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type Product struct {
	ID       string `json:"id"`
	ShopID   string `json:"shopId"`
	Name     string `json:"name"`
	PriceYen int    `json:"priceYen"`
	Stock    int    `json:"stock"`
}

type ProductQueryResult struct {
	Items      []Product      `json:"items"`
	Total      int            `json:"total"`
	TotalPages int            `json:"totalPages"`
	Page       int            `json:"page"`
	ShopCounts map[string]int `json:"shopCounts"`
}

// productQuery mirrors the parsed request. page/perPage stay *int because
// TS's contract distinguishes "absent" (default 12 / clamp from 1) from a
// present value: `opts.perPage ?? 12`, `Math.max(opts.page ?? 1, 1)`.
type productQuery struct {
	q       string
	shopID  string
	sort    string
	page    *int
	perPage *int
}

// Sorting vocabulary — every twin rejects unknown values with the same 400
// string (the HTTP layer; the TS RSC path treats unknown sorts as default).
var sortOptions = []string{"featured", "price-asc", "price-desc"}

const sortVocabulary = "sort must be one of: featured, price-asc, price-desc"

// queryProducts is the port of apps/ichiba/src/lib/catalog.ts queryProducts
// (and ichibaapi.catalog.query_products): filter + sort + paginate + per-shop
// counts, identical clamp and ordering semantics. The raw SQL mirrors what
// drizzle/Django generate so the planner sees the same BitmapOr-able shape:
// an ILIKE branch plus the trigram `%` operator, never a similarity() > const
// WHERE clause (which would poison the OR into a seqscan).
func queryProducts(ctx context.Context, pool dbPool, opts productQuery) (ProductQueryResult, error) {
	q := strings.TrimSpace(opts.q)
	per, page := clampDefaults(opts.perPage, opts.page)

	// The match predicate: exact substring (ILIKE, metacharacters escaped)
	// OR trigram similarity at the default 0.3 threshold. Match-only args
	// precede everything else; shop filter and ORDER BY params append after.
	matchArgs := []any{}
	matchWhere := "TRUE"
	if q != "" {
		matchWhere = "name ILIKE $1 OR name % $2"
		matchArgs = append(matchArgs, likePattern(q), q)
	}
	fullArgs := slices.Clone(matchArgs)
	fullWhere := matchWhere
	if opts.shopID != "" {
		fullWhere = fmt.Sprintf("(%s) AND shop_id = $%d", matchWhere, len(fullArgs)+1)
		fullArgs = append(fullArgs, opts.shopID)
	}

	// Count first so the page clamps to range (same contract as TS).
	var total int
	if err := pool.QueryRow(ctx, "SELECT count(*) FROM products WHERE "+fullWhere, fullArgs...).Scan(&total); err != nil {
		return ProductQueryResult{}, err
	}
	totalPages := max(1, int(math.Ceil(float64(total)/float64(per))))
	safePage := min(max(page, 1), totalPages)

	orderClause, orderArgs := orderClause(opts.sort, q, len(matchArgs))
	itemsArgs := slices.Concat(matchArgs, orderArgs, []any{per, (safePage - 1) * per})
	limit := len(itemsArgs) - 1
	offset := len(itemsArgs)

	items := make([]Product, 0, per)
	itemRows, err := pool.Query(ctx,
		fmt.Sprintf(
			"SELECT id, shop_id, name, price_yen, stock FROM products WHERE %s ORDER BY %s LIMIT $%d OFFSET $%d",
			fullWhere, orderClause, limit, offset,
		), itemsArgs...)
	if err != nil {
		return ProductQueryResult{}, err
	}
	defer itemRows.Close()
	for itemRows.Next() {
		var p Product
		if err := itemRows.Scan(&p.ID, &p.ShopID, &p.Name, &p.PriceYen, &p.Stock); err != nil {
			return ProductQueryResult{}, err
		}
		items = append(items, p)
	}
	if err := itemRows.Err(); err != nil {
		return ProductQueryResult{}, err
	}

	// Per-shop counts ignore the shop filter (match only) — same as TS:
	// "search X, see which shops sell it" even when shopId narrows the page.
	shopCounts := map[string]int{}
	countRows, err := pool.Query(ctx,
		"SELECT shop_id, count(*) FROM products WHERE "+matchWhere+" GROUP BY shop_id", matchArgs...)
	if err != nil {
		return ProductQueryResult{}, err
	}
	defer countRows.Close()
	for countRows.Next() {
		var shopID string
		var n int
		if err := countRows.Scan(&shopID, &n); err != nil {
			return ProductQueryResult{}, err
		}
		shopCounts[shopID] = n
	}
	if err := countRows.Err(); err != nil {
		return ProductQueryResult{}, err
	}

	return ProductQueryResult{
		Items:      items,
		Total:      total,
		TotalPages: totalPages,
		Page:       safePage,
		ShopCounts: shopCounts,
	}, nil
}

// clampDefaults ports the TS clamps exactly:
//
//	perPage → Math.min(Math.max(opts.perPage ?? 12, 1), 60)
//	page    → Math.max(opts.page ?? 1, 1)   (range clamp happens after count)
//
// Deliberately NOT python's `per_page or 12`, which folds 0 into the
// default: TS is the anchor and its clamp maps 0 to 1. (python now does the
// same; this comment documents the historical trap for the next twin.)
func clampDefaults(perPage, page *int) (int, int) {
	per := 12
	if perPage != nil {
		per = *perPage
	}
	per = min(max(per, 1), 60)
	pg := 1
	if page != nil {
		pg = *page
	}
	return per, max(pg, 1)
}

// orderClause ports sortOrder() from catalog.ts. sort wins over similarity;
// the similarity branch uses the TRIMMED query (same as TS/python) and
// becomes a parameter so user input never reaches SQL as a literal.
func orderClause(sort, q string, baseArgs int) (string, []any) {
	switch sort {
	case "price-asc":
		return "price_yen ASC, id ASC", nil
	case "price-desc":
		return "price_yen DESC, id ASC", nil
	}
	if q != "" {
		return fmt.Sprintf("similarity(name, $%d) DESC, id ASC", baseArgs+1), []any{q}
	}
	return "id ASC", nil
}

// listShops ports listShops(): every shop, ordered by id (the TS path adds
// the ordering at the SQL layer too — see cachedShops in catalog.ts).
func listShops(ctx context.Context, pool dbPool) ([]Shop, error) {
	shops := make([]Shop, 0, 40)
	rows, err := pool.Query(ctx, "SELECT id, name FROM shops ORDER BY id ASC")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var s Shop
		if err := rows.Scan(&s.ID, &s.Name); err != nil {
			return nil, err
		}
		shops = append(shops, s)
	}
	return shops, rows.Err()
}
