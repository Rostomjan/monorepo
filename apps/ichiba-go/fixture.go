package main

import (
	"fmt"
	"strings"
)

// Deterministic fixtures — the Go port of generateCatalog in
// apps/ichiba/src/lib/catalog.ts (and ichibaapi.catalog.generate_catalog).
// The same seed MUST produce byte-identical ids/names/prices in all three
// languages; testdata/catalog-42.json is the TS truth and fixture_test.go
// locks this port to it. Arrays stay in lockstep with the TS/python ones.

var adjectives = [...]string{
	"Classic", "Premium", "Eco", "Compact", "Deluxe", "Smart", "Handmade", "Limited",
}

var nouns = [...]string{
	"Matcha Set", "Rice Cooker", "Backpack", "Sneakers", "Tea Pot",
	"Headphones", "Kimono", "Knife Set", "Lantern", "Plush Toy",
}

// mulberry32 is the exact TS variant (note the second step is
// `(t + imul(t ^ t>>>7, 61|t)) ^ t`, not the textbook `t ^= t + …`).
// uint32 arithmetic reproduces JS's Math.imul/`>>>` bit patterns, and the
// division by 2^32 is exact for both, so every double matches bit-for-bit.
type mulberry32 struct{ state uint32 }

func newMulberry32(seed int32) *mulberry32 {
	// TS starts with `seed |= 0` (int32 wrap); uint32(int32(seed)) is the
	// same bit pattern.
	return &mulberry32{state: uint32(seed)}
}

func (m *mulberry32) next() float64 {
	m.state += 0x6d2b79f5
	t := m.state
	t = imul32(t^(t>>15), t|1)
	t = (t + imul32(t^(t>>7), t|61)) ^ t
	return float64(t^(t>>14)) / 4294967296.0
}

// imul32 is Math.imul: 32-bit wrapping multiply. Go's uint32 multiply wraps
// identically, so this is a*B — spelled out to make the intent obvious.
func imul32(a, b uint32) uint32 { return a * b }

func generateCatalog(shopCount, productsPerShop int, seed int32) ([]Shop, []Product) {
	rng := newMulberry32(seed)
	shops := make([]Shop, 0, shopCount)
	for i := 0; i < shopCount; i++ {
		shops = append(shops, Shop{
			ID:   fmt.Sprintf("shop-%d", i+1),
			Name: fmt.Sprintf("Shop %d %s", i+1, adjectives[int(rng.next()*float64(len(adjectives)))]),
		})
	}
	products := make([]Product, 0, shopCount*productsPerShop)
	for _, shop := range shops {
		for j := 0; j < productsPerShop; j++ {
			noun := nouns[int(rng.next()*float64(len(nouns)))]
			adjective := adjectives[int(rng.next()*float64(len(adjectives)))]
			products = append(products, Product{
				ID:       fmt.Sprintf("%s-p%d", shop.ID, j+1),
				ShopID:   shop.ID,
				Name:     fmt.Sprintf("%s %s %d", adjective, noun, j+1),
				PriceYen: 500 + int(rng.next()*20000),
				Stock:    1 + int(rng.next()*50),
			})
		}
	}
	return shops, products
}

// likePattern escapes the LIKE metacharacters so user input can never
// become a wildcard — 100% match with TS likePattern() and python
// like_pattern(). Postgres's default LIKE escape character is the
// backslash, so the escaped pattern works in raw SQL unchanged.
func likePattern(q string) string {
	var b strings.Builder
	b.WriteByte('%')
	for _, r := range q {
		if r == '%' || r == '_' || r == '\\' {
			b.WriteByte('\\')
		}
		b.WriteRune(r)
	}
	b.WriteByte('%')
	return b.String()
}
