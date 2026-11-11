package main

import (
	"context"
	"encoding/json"
	"net/http"
	"net/url"
	"slices"
	"strconv"

	"github.com/jackc/pgx/v5"
)

// server holds the process-wide dependencies. pool is nil when no
// DATABASE_URL is configured — every data endpoint then degrades to the
// same 503 JSON the python db_guard emits (contract: refuse JSON-ly, never
// a raw 500/stack).
type server struct {
	pool dbPool
}

// dbPool is the slice of *pgxpool.Pool the handlers need. The indirection
// keeps the HTTP layer decoupled from the driver (and fakes testable).
type dbPool interface {
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
}

// routes wires the phase-1 read contract. Method-scoped patterns are the
// Go 1.22+ stdlib mux: no router dependency needed for three GETs.
func (s *server) routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/health", s.handleHealth)
	mux.HandleFunc("GET /api/products", s.handleProducts)
	mux.HandleFunc("GET /api/shops", s.handleShops)
	return mux
}

// apiError is the contract's error shape: {"error": <message>} with the
// exact status. Messages are part of the contract — the live contract
// checker asserts them verbatim across all backends.
type apiError struct {
	status  int
	message string
}

func writeError(w http.ResponseWriter, err apiError) {
	writeJSON(w, err.status, map[string]string{"error": err.message})
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

// handleProducts — GET /api/products. Port of the python ProductsView:
// parse + validate the query, then hand off to queryProducts (the shared
// listing semantics). Unknown sort values are a hard 400 here, same as the
// python twin (the TS site treats them as the default ordering at the RSC
// layer, before any HTTP call happens).
func (s *server) handleProducts(w http.ResponseWriter, r *http.Request) {
	if err := s.dbGuard(); err != nil {
		writeError(w, *err)
		return
	}
	opts, apiErr := parseProductQuery(r.URL.Query())
	if apiErr != nil {
		writeError(w, *apiErr)
		return
	}
	result, err := queryProducts(r.Context(), s.pool, opts)
	if err != nil {
		writeError(w, apiError{http.StatusInternalServerError, "database unavailable"})
		return
	}
	writeJSON(w, http.StatusOK, result)
}

// handleShops — GET /api/shops.
func (s *server) handleShops(w http.ResponseWriter, r *http.Request) {
	if err := s.dbGuard(); err != nil {
		writeError(w, *err)
		return
	}
	shops, err := listShops(r.Context(), s.pool)
	if err != nil {
		writeError(w, apiError{http.StatusInternalServerError, "database unavailable"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"shops": shops})
}

func (s *server) dbGuard() *apiError {
	if s.pool == nil {
		return &apiError{
			http.StatusServiceUnavailable,
			"DATABASE_URL (or POSTGRES_URL) is not set — ichiba-go has no Postgres to talk to",
		}
	}
	return nil
}

// parseProductQuery mirrors the python view's parsing: absent page/perPage
// are nil (queryProducts applies the TS defaults), a present value that
// fails to parse is ONE shared 400 message, unknown sorts are a hard 400.
// sort="" is treated as absent (python: `params.get("sort") or None`).
func parseProductQuery(vals url.Values) (productQuery, *apiError) {
	opts := productQuery{
		q:      vals.Get("q"),
		shopID: vals.Get("shopId"),
		sort:   vals.Get("sort"),
	}
	if opts.sort != "" && !slices.Contains(sortOptions, opts.sort) {
		return opts, &apiError{http.StatusBadRequest, sortVocabulary}
	}
	if err := parseOptionalInt(vals, "page", &opts.page); err != nil {
		return opts, &apiError{http.StatusBadRequest, "page and perPage must be integers"}
	}
	if err := parseOptionalInt(vals, "perPage", &opts.perPage); err != nil {
		return opts, &apiError{http.StatusBadRequest, "page and perPage must be integers"}
	}
	return opts, nil
}

func parseOptionalInt(vals url.Values, name string, target **int) error {
	raw := vals.Get(name)
	if raw == "" {
		return nil
	}
	n, err := strconv.Atoi(raw)
	if err != nil {
		return err
	}
	*target = &n
	return nil
}
