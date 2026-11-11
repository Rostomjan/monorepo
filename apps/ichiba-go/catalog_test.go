package main

import (
	"net/url"
	"strings"
	"testing"
)

func TestParseProductQuery(t *testing.T) {
	mustParse := func(raw string) productQuery {
		t.Helper()
		opts, apiErr := parseProductQuery(mustQuery(t, raw))
		if apiErr != nil {
			t.Fatalf("parse %q: unexpected error %v", raw, apiErr)
		}
		return opts
	}

	opts := mustParse("")
	if opts.q != "" || opts.shopID != "" || opts.sort != "" || opts.page != nil || opts.perPage != nil {
		t.Fatalf("empty query parsed wrong: %+v", opts)
	}

	opts = mustParse("?q=matcha&shopId=shop-1&sort=price-asc&page=2&perPage=24")
	if opts.q != "matcha" || opts.shopID != "shop-1" || opts.sort != "price-asc" {
		t.Fatalf("fields parsed wrong: %+v", opts)
	}
	if opts.page == nil || *opts.page != 2 || opts.perPage == nil || *opts.perPage != 24 {
		t.Fatalf("page/perPage parsed wrong: %+v", opts)
	}

	// Absent values parse as nil (defaults applied later by clampDefaults);
	// sort="" is treated as absent, exactly like python's `get("sort") or None`.
	opts = mustParse("?sort=&page=0&perPage=0")
	if opts.sort != "" || opts.page == nil || *opts.page != 0 || opts.perPage == nil || *opts.perPage != 0 {
		t.Fatalf("zero/empty values parsed wrong: %+v", opts)
	}

	// Contract: non-integer page/perPage is ONE shared 400 message.
	_, apiErr := parseProductQuery(mustQuery(t, "?page=abc"))
	expectAPIError(t, apiErr, 400, "page and perPage must be integers")
	_, apiErr = parseProductQuery(mustQuery(t, "?perPage=1.5"))
	expectAPIError(t, apiErr, 400, "page and perPage must be integers")

	// Contract: unknown sorts are a hard 400 with the exact vocabulary string.
	for _, bad := range []string{"banana", "PRICE-ASC", "-1"} {
		_, apiErr := parseProductQuery(mustQuery(t, "?sort="+url.QueryEscape(bad)))
		expectAPIError(t, apiErr, 400, sortVocabulary)
	}
}

func TestClampDefaults(t *testing.T) {
	i := func(v int) *int { return &v }

	// TS: Math.min(Math.max(opts.perPage ?? 12, 1), 60)
	cases := []struct {
		perPage, page, wantPer, wantPage int
	}{
		{12, 1, 12, 1},       // explicit contract defaults
		{0, 0, 1, 1},         // 0 clamps to 1 — NOT the default 12 (TS `??` semantics)
		{-5, -5, 1, 1},       // negatives clamp up
		{61, 9999, 60, 9999}, // perPage capped; page range-clamped after count
	}
	for _, c := range cases {
		per, page := clampDefaults(i(c.perPage), i(c.page))
		if per != c.wantPer || page != c.wantPage {
			t.Fatalf("clampDefaults(%d, %d) = (%d, %d), want (%d, %d)",
				c.perPage, c.page, per, page, c.wantPer, c.wantPage)
		}
	}
	// Absent values take the TS defaults.
	per, page := clampDefaults(nil, nil)
	if per != 12 || page != 1 {
		t.Fatalf("absent values = (%d, %d), want (12, 1)", per, page)
	}
}

func TestOrderClause(t *testing.T) {
	if clause, args := orderClause("price-asc", "", 0); clause != "price_yen ASC, id ASC" || len(args) != 0 {
		t.Fatalf("price-asc wrong: %q %v", clause, args)
	}
	if clause, args := orderClause("price-desc", "", 0); clause != "price_yen DESC, id ASC" || len(args) != 0 {
		t.Fatalf("price-desc wrong: %q %v", clause, args)
	}
	// sort wins over similarity (same as TS sortOrder / python if-elif).
	if clause, args := orderClause("price-asc", "matcha", 2); clause != "price_yen ASC, id ASC" || len(args) != 0 {
		t.Fatalf("sort should win over q: %q %v", clause, args)
	}
	// similarity branch parameterizes the trimmed query after the match args.
	clause, args := orderClause("featured", "matcha", 2)
	if clause != "similarity(name, $3) DESC, id ASC" || len(args) != 1 || args[0] != "matcha" {
		t.Fatalf("similarity clause wrong: %q %v", clause, args)
	}
	// default ordering: featured with no query, and unknown sorts (the RSC
	// path's semantics; the HTTP layer 400s them before this point).
	if clause, _ := orderClause("featured", "", 0); clause != "id ASC" {
		t.Fatalf("default clause wrong: %q", clause)
	}
}

func mustQuery(t *testing.T, raw string) url.Values {
	t.Helper()
	v, err := url.ParseQuery(strings.TrimPrefix(raw, "?"))
	if err != nil {
		t.Fatalf("bad query %q: %v", raw, err)
	}
	return v
}

func expectAPIError(t *testing.T, apiErr *apiError, status int, message string) {
	t.Helper()
	if apiErr == nil {
		t.Fatalf("expected apiError %d %q, got nil", status, message)
	}
	if apiErr.status != status || apiErr.message != message {
		t.Fatalf("apiError = %d %q, want %d %q", apiErr.status, apiErr.message, status, message)
	}
}
