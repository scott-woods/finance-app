package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq"

	"github.com/scott-woods/finance-app/apps/api/internal/db/ent"
)

func main() {
	if err := godotenv.Load("../../.env"); err != nil {
		log.Println("no .env file found, relying on real environment variables")
	}

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("DATABASE_URL is not set")
	}

	client, err := ent.Open("postgres", dbURL)
	if err != nil {
		log.Fatalf("failed connecting to postgres: %v", err)
	}
	defer client.Close()

	mux := http.NewServeMux()

	mux.HandleFunc("GET /accounts", func(w http.ResponseWriter, r *http.Request) {
		accounts, err := client.Account.Query().All(context.Background())
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(accounts)
	})

	log.Println("listening on :8080")
	if err := http.ListenAndServe(":8080", mux); err != nil {
		log.Fatal(err)
	}
}
