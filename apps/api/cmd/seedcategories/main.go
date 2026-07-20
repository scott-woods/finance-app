package main

import (
	"context"
	"log"
	"os"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq"

	"github.com/scott-woods/finance-app/apps/api/internal/db/ent"
	"github.com/scott-woods/finance-app/apps/api/internal/db/ent/category"
)

var starterCategories = []struct {
	Name string
	Kind category.Kind
}{
	{"Subscriptions", category.KindSpending},
	{"Utilities", category.KindSpending},
	{"Housing", category.KindSpending},
	{"Debt Payments", category.KindSpending},
	{"Insurance", category.KindSpending},
	{"Investments", category.KindSpending},
	{"Personal", category.KindSpending},
	{"Income", category.KindIncome},
}

func main() {
	if err := godotenv.Load("../../.env"); err != nil {
		log.Println("no .env file found, relying on real environment variables")
	}

	client, err := ent.Open("postgres", os.Getenv("DATABASE_URL"))
	if err != nil {
		log.Fatalf("failed connecting to postgres: %v", err)
	}
	defer client.Close()

	ctx := context.Background()

	for _, c := range starterCategories {
		exists, err := client.Category.Query().
			Where(category.NameEQ(c.Name)).
			Exist(ctx)
		if err != nil {
			log.Fatalf("failed checking category %q: %v", c.Name, err)
		}
		if exists {
			log.Printf("skipping %q, already exists", c.Name)
			continue
		}

		_, err = client.Category.Create().
			SetName(c.Name).
			SetKind(c.Kind).
			Save(ctx)
		if err != nil {
			log.Fatalf("failed creating category %q: %v", c.Name, err)
		}
		log.Printf("created %q", c.Name)
	}
}
