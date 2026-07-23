package main

import (
	"encoding/base64"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load("../../.env"); err != nil {
		log.Println("no .env file found, relying on real environment variables")
	}

	setupToken := strings.TrimSpace(os.Getenv("SIMPLEFIN_SETUP_TOKEN"))
	if setupToken == "" {
		log.Fatal("SIMPLEFIN_SETUP_TOKEN is not set")
	}

	claimURLBytes, err := base64.StdEncoding.DecodeString(setupToken)
	if err != nil {
		log.Fatalf("failed decoding setup token: %v", err)
	}

	resp, err := http.Post(string(claimURLBytes), "text/plain", nil)
	if err != nil {
		log.Fatalf("failed claiming setup token: %v", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Fatalf("failed reading response: %v", err)
	}
	if resp.StatusCode != http.StatusOK {
		log.Fatalf("unexpected status %d: %s", resp.StatusCode, string(body))
	}

	fmt.Println("Access URL — save this to .env as SIMPLEFIN_ACCESS_URL, then remove SIMPLEFIN_SETUP_TOKEN:")
	fmt.Println(string(body))
}
