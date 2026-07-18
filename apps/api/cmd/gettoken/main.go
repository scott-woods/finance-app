package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/clerk/clerk-sdk-go/v2"
	"github.com/clerk/clerk-sdk-go/v2/session"
	"github.com/clerk/clerk-sdk-go/v2/user"
	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load("../../.env"); err != nil {
		log.Println("no .env file found, relying on real environment variables")
	}

	clerk.SetKey(os.Getenv("CLERK_SECRET_KEY"))
	ctx := context.Background()

	users, err := user.List(ctx, &user.ListParams{})
	if err != nil {
		log.Fatalf("failed listing users: %v", err)
	}
	if len(users.Users) == 0 {
		log.Fatal("no users found in this Clerk instance")
	}
	u := users.Users[0]

	sess, err := session.Create(ctx, &session.CreateParams{
		UserID: u.ID,
	})
	if err != nil {
		log.Fatalf("failed creating session: %v", err)
	}

	token, err := session.CreateToken(ctx, &session.CreateTokenParams{
		ID:           sess.ID,
		TemplateName: "long-lived-testing",
	})
	if err != nil {
		log.Fatalf("failed creating token: %v", err)
	}

	fmt.Println(token.JWT)
}
