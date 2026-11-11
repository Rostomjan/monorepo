package main

// Free-tier rate limiter — Go port of apps/ichiba/src/lib/rate-limit.ts
// (and ichibaapi.rate_limit). Same Upstash Redis REST pipeline
// (INCR + EXPIRE NX), same env names, same fail-open default: a dead
// limiter must not take checkout down with it, and unset env (local dev,
// CI) no-ops open.

import (
	"encoding/json"
	"net/http"
	"os"
	"strings"
	"time"
)

const (
	writeRateLimit     = 100 // req/min per IP — mirrors the nginx `write_zone` budget
	rateLimitWindowSec = 60
)

// clientIP follows the same header chain as TS: x-forwarded-for first
// hop → x-real-ip → "anon".
func clientIP(header http.Header) string {
	if f4 := header.Get("x-forwarded-for"); f4 != "" {
		return strings.TrimSpace(strings.Split(f4, ",")[0])
	}
	if rip := header.Get("x-real-ip"); rip != "" {
		return rip
	}
	return "anon"
}

// checkWriteRateLimit reports whether the request is within budget.
// True = allowed.
func checkWriteRateLimit(ip string) bool {
	url := firstEnv("UPSTASH_REDIS_REST_URL", "KV_REST_API_URL")
	token := firstEnv("UPSTASH_REDIS_REST_TOKEN", "KV_REST_API_TOKEN")
	if url == "" || token == "" {
		return true
	}
	key := "ichiba:rl:write:" + ip
	payload, _ := json.Marshal([][]string{
		{"INCR", key},
		{"EXPIRE", key, rateLimitWindowStr(), "NX"},
	})
	req, err := http.NewRequest(http.MethodPost, url+"/pipeline", strings.NewReader(string(payload)))
	if err != nil {
		return true
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	client := &http.Client{Timeout: 5 * time.Second}
	res, err := client.Do(req)
	if err != nil {
		return true // fail open
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		return true
	}
	var data []struct {
		Result any `json:"result"`
	}
	if err := json.NewDecoder(res.Body).Decode(&data); err != nil || len(data) == 0 {
		return true
	}
	if count, ok := data[0].Result.(float64); ok {
		return int(count) <= writeRateLimit
	}
	return true
}

func rateLimitWindowStr() string { return "60" }

func firstEnv(names ...string) string {
	for _, name := range names {
		if value := os.Getenv(name); value != "" {
			return value
		}
	}
	return ""
}
