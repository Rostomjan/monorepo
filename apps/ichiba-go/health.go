package main

import (
	"encoding/json"
	"net/http"
)

// healthBody mirrors the python HealthView dict exactly (ok, app, stage,
// database, relations). Relations stays {} on the error path like the
// python/TS handlers; json.RawMessage preserves that instead of emitting
// four false keys.
type healthBody struct {
	OK        bool            `json:"ok"`
	App       string          `json:"app"`
	Stage     int             `json:"stage"`
	Database  string          `json:"database"`
	Relations json.RawMessage `json:"relations"`
}

type relations struct {
	Shops      bool `json:"shops"`
	Products   bool `json:"products"`
	Orders     bool `json:"orders"`
	OrderItems bool `json:"order_items"`
}

// handleHealth — liveness + catalog readiness. Reports which relations
// exist so a missing migration is a 10-second diagnosis instead of a 500
// mystery. Same JSON shape as the TS route and the python HealthView, 503
// when not ready, and never cached (it drives LB failover decisions).
func (s *server) handleHealth(w http.ResponseWriter, r *http.Request) {
	status := healthBody{
		OK:        true,
		App:       "ichiba",
		Stage:     3,
		Database:  "unknown",
		Relations: json.RawMessage("{}"),
	}

	if s.pool == nil {
		status.OK = false
		status.Database = "DATABASE_URL (or POSTGRES_URL) is not set"
		writeJSON(w, healthCode(status.OK), status)
		return
	}

	var found map[string]bool
	rows, err := s.pool.Query(r.Context(),
		"SELECT tablename FROM pg_tables WHERE schemaname = 'public' "+
			"AND tablename IN ('shops', 'products', 'orders', 'order_items')")
	if err == nil {
		defer rows.Close()
		found = map[string]bool{}
		for rows.Next() {
			var name string
			if scanErr := rows.Scan(&name); scanErr != nil {
				err = scanErr
				break
			}
			found[name] = true
		}
		if err == nil {
			err = rows.Err()
		}
	}

	if err != nil {
		status.OK = false
		status.Database = truncateMessage(err.Error())
	} else {
		rel := relations{
			Shops:      found["shops"],
			Products:   found["products"],
			Orders:     found["orders"],
			OrderItems: found["order_items"],
		}
		encoded, _ := json.Marshal(rel)
		status.Relations = encoded
		ready := rel.Shops && rel.Products && rel.Orders && rel.OrderItems
		status.Database = "ready"
		if !ready {
			status.Database = "missing-migrations"
			status.OK = false
		}
	}

	writeJSON(w, healthCode(status.OK), status)
}

func healthCode(ok bool) int {
	if ok {
		return http.StatusOK
	}
	return http.StatusServiceUnavailable
}

// truncateMessage caps the failure text at 160 chars like the python view.
func truncateMessage(msg string) string {
	runes := []rune(msg)
	if len(runes) > 160 {
		return string(runes[:160])
	}
	return msg
}
