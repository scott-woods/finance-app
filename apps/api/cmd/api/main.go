package main

import (
	"log"
	"net/http"
	"os"

	"github.com/clerk/clerk-sdk-go/v2"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"

	"github.com/scott-woods/finance-app/apps/api/internal/api"
	"github.com/scott-woods/finance-app/apps/api/internal/db/ent"
)

func main() {
	if err := godotenv.Load("../../.env"); err != nil {
		log.Println("no .env file found, relying on real environment variables")
	}

	clerk.SetKey(os.Getenv("CLERK_SECRET_KEY"))

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("DATABASE_URL is not set")
	}

	client, err := ent.Open("postgres", dbURL)
	if err != nil {
		log.Fatalf("failed connecting to postgres: %v", err)
	}
	defer client.Close()

	server := api.NewServer(client)
	strictHandler := api.NewStrictHandler(server, nil)

	mux := http.NewServeMux()
	api.HandlerFromMux(strictHandler, mux)

	log.Println("listening on :8080")
	if err := http.ListenAndServe(":8080", api.RequireAuth(mux)); err != nil {
		log.Fatal(err)
	}
}
