package main

import (
	"context"
	"encoding/json"
	"errors"
	"io"
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
// Begin covers checkout's transaction (satisfied by both the pool and a
// pgx.Tx).
type dbPool interface {
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
	Begin(ctx context.Context) (pgx.Tx, error)
}

// routes wires the full ichiba contract: the phase-1 reads plus the
// write path (checkout + orders). Method-scoped patterns are the Go
// 1.22+ stdlib mux: no router dependency needed for five handlers.
func (s *server) routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/health", s.handleHealth)
	mux.HandleFunc("GET /api/products", s.handleProducts)
	mux.HandleFunc("GET /api/shops", s.handleShops)
	mux.HandleFunc("POST /api/checkout", s.handleCheckout)
	mux.HandleFunc("GET /api/orders", s.handleOrders)
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

// handleCheckout — POST /api/checkout. Port of the TS route handler (and
// CheckoutView): rate limit first, then json → items array → per-item
// validation, each with the contract's exact error string, then the
// atomic checkout. Orders are attributed to "guest" (Clerk is TS-only —
// documented divergence).
func (s *server) handleCheckout(w http.ResponseWriter, r *http.Request) {
	if err := s.dbGuard(); err != nil {
		writeError(w, *err)
		return
	}
	// Cloud replacement for nginx `limit_req zone=write_zone`: 429 when
	// over budget. No-op locally (no Upstash env) so dev/CI stay green.
	if !checkWriteRateLimit(clientIP(r.Header)) {
		writeError(w, apiError{http.StatusTooManyRequests, "too many requests"})
		return
	}
	raw, err := io.ReadAll(r.Body)
	if err == nil {
		var parsed any
		if err = json.Unmarshal(raw, &parsed); err == nil {
			lines, apiErr := parseCheckoutLines(parsed)
			if apiErr == nil {
				var orders []Order
				orders, err = checkoutCart(r.Context(), s.pool, lines, "guest")
				if err == nil {
					writeJSON(w, http.StatusOK, checkoutResponse(orders))
					return
				}
				if oerr, ok := err.(*orderError); ok {
					writeError(w, apiError{oerr.status, oerr.message})
					return
				}
			} else {
				writeError(w, *apiErr)
				return
			}
		}
	}
	// Unparseable json and unexpected storage failures both land here —
	// the contract distinguishes them by status (400 invalid json vs 500).
	if isJSONError(err) {
		writeError(w, apiError{http.StatusBadRequest, "invalid json"})
		return
	}
	writeError(w, apiError{http.StatusInternalServerError, "database unavailable"})
}

// isJSONError distinguishes a malformed body from a storage failure.
func isJSONError(err error) bool {
	var syntaxErr *json.SyntaxError
	var unmarshalErr *json.UnmarshalTypeError
	return errors.As(err, &syntaxErr) || errors.As(err, &unmarshalErr) ||
		errors.Is(err, io.ErrUnexpectedEOF) || errors.Is(err, io.EOF)
}

// parseCheckoutLines mirrors the TS route's body validation:
//   - items must be a non-empty array (max 50);
//   - each item needs productId:string, qty:number — JSON booleans are
//     NOT numbers (they decode to bool and are rejected here, like
//     python's explicit isinstance(qty, bool) guard).
func parseCheckoutLines(body any) ([]CheckoutLine, *apiError) {
	obj, ok := body.(map[string]any)
	if !ok {
		return nil, &apiError{http.StatusBadRequest, "items must be a non-empty array (max 50)"}
	}
	rawItems, ok := obj["items"].([]any)
	if !ok || len(rawItems) == 0 || len(rawItems) > 50 {
		return nil, &apiError{http.StatusBadRequest, "items must be a non-empty array (max 50)"}
	}
	lines := make([]CheckoutLine, 0, len(rawItems))
	for _, raw := range rawItems {
		item, ok := raw.(map[string]any)
		if !ok {
			return nil, &apiError{http.StatusBadRequest, "each item needs productId:string, qty:number"}
		}
		productID, idOK := item["productId"].(string)
		qty, qtyOK := item["qty"].(float64)
		if !idOK || !qtyOK {
			return nil, &apiError{http.StatusBadRequest, "each item needs productId:string, qty:number"}
		}
		lines = append(lines, CheckoutLine{ProductID: productID, Qty: qty})
	}
	return lines, nil
}

func checkoutResponse(orders []Order) map[string]any {
	ids := make([]string, len(orders))
	for i, o := range orders {
		ids[i] = o.ID
	}
	return map[string]any{"orderIds": ids, "orders": orders}
}

// handleOrders — GET /api/orders: the caller's orders (guest until Clerk
// lands here).
func (s *server) handleOrders(w http.ResponseWriter, r *http.Request) {
	if err := s.dbGuard(); err != nil {
		writeError(w, *err)
		return
	}
	orders, err := listOrders(r.Context(), s.pool, "guest")
	if err != nil {
		writeError(w, apiError{http.StatusInternalServerError, "database unavailable"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"orders": orders})
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
