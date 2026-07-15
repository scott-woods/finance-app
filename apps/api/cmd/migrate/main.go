package main

import (
	"context"
	"log"
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

	ctx := context.Background()
	if err := client.Schema.Create(ctx); err != nil {
		log.Fatalf("failed creating schema: %v", err)
	}

	log.Println("schema created successfully")
}
