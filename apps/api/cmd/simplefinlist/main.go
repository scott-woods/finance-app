package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"os"
	"time"

	"github.com/joho/godotenv"
)

type simplefinResponse struct {
	Accounts []struct {
		ID           string `json:"id"`
		Name         string `json:"name"`
		Balance      string `json:"balance"`
		Transactions []struct {
			ID          string `json:"id"`
			Posted      int64  `json:"posted"`
			Amount      string `json:"amount"`
			Description string `json:"description"`
			Pending     bool   `json:"pending"`
		} `json:"transactions"`
	} `json:"accounts"`
}

func main() {
	if err := godotenv.Load("../../.env"); err != nil {
		log.Println("no .env file found, relying on real environment variables")
	}

	accessURL := os.Getenv("SIMPLEFIN_ACCESS_URL")
	if accessURL == "" {
		log.Fatal("SIMPLEFIN_ACCESS_URL is not set")
	}

	u, err := url.Parse(accessURL)
	if err != nil {
		log.Fatalf("failed parsing access url: %v", err)
	}
	username := u.User.Username()
	password, _ := u.User.Password()
	u.User = nil
	u.Path = u.Path + "/accounts"

	q := u.Query()
	q.Set("start-date", fmt.Sprintf("%d", time.Now().AddDate(0, 0, -30).Unix()))
	u.RawQuery = q.Encode()

	req, err := http.NewRequest("GET", u.String(), nil)
	if err != nil {
		log.Fatalf("failed building request: %v", err)
	}
	req.SetBasicAuth(username, password)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		log.Fatalf("failed calling simplefin: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		log.Fatalf("unexpected status %d from simplefin", resp.StatusCode)
	}

	var data simplefinResponse
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		log.Fatalf("failed decoding response: %v", err)
	}

	for _, acct := range data.Accounts {
		fmt.Printf("Account: %q  id=%s  balance=%s\n", acct.Name, acct.ID, acct.Balance)
		for i, tx := range acct.Transactions {
			if i >= 5 {
				break
			}
			fmt.Printf("  txn id=%s amount=%s desc=%q pending=%v posted=%s\n",
				tx.ID, tx.Amount, tx.Description, tx.Pending, time.Unix(tx.Posted, 0).Format("2006-01-02"))
		}
	}
}
