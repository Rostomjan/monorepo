// Command ichiba-go is the Go twin of ichiba's TS backend
// (apps/ichiba, docs/BACKEND_TWINS.md). Full contract: the phase-1 reads
// (/api/health, /api/products, /api/shops) plus the write path
// (/api/checkout, /api/orders). Writes stay flag-canonical in apps/ichiba
// itself (Clerk attribution lives there); the twins serve the same
// contract for parity testing.
//
// Deliberately framework-free (net/http + pgx, no gin/echo/chi): the point
// of the learning lab is what each stack gives you invisibly. Django hands
// you an ORM, router, serializers and a test client; Next hides reads
// behind RSC and unstable_cache; Go hands you the standard library and
// lets you write the ~300 lines yourself.
package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Port map (docs/BACKEND_TWINS.md): 3003 ichiba TS · 3021 ichiba-py · 3022 ichiba-go.
const defaultPort = "3022"

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = defaultPort
	}

	app := &server{pool: connectDatabase()}
	srv := &http.Server{
		Addr:              ":" + port,
		Handler:           app.routes(),
		ReadHeaderTimeout: 10 * time.Second,
	}

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)
	go func() {
		<-stop
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_ = srv.Shutdown(shutdownCtx)
	}()

	log.Printf("ichiba-go listening on :%s", port)
	if err := srv.ListenAndServe(); !errors.Is(err, http.ErrServerClosed) {
		log.Fatal(err)
	}
}

// connectDatabase returns nil when no DATABASE_URL/POSTGRES_URL is set; the
// read handlers then answer 503 JSON instead of a raw panic (same behaviour
// as the TS lazy-connect error and the python db_guard, minus the throw).
// A set-but-down database is NOT an error here: pgxpool connects lazily and
// each endpoint surfaces its own failure (health reports it, the rest 500).
func connectDatabase() *pgxpool.Pool {
	url := databaseURL()
	if url == "" {
		log.Print("DATABASE_URL (or POSTGRES_URL) is not set — serving 503 on data endpoints until it is")
		return nil
	}
	pool, err := pgxpool.New(context.Background(), url)
	if err != nil {
		log.Fatalf("invalid DATABASE_URL: %v", err)
	}
	return pool
}

func databaseURL() string {
	if url := os.Getenv("DATABASE_URL"); url != "" {
		return url
	}
	return os.Getenv("POSTGRES_URL")
}
