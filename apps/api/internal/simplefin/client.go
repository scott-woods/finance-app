package simplefin

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"time"
)

type Account struct {
	ID           string        `json:"id"`
	Name         string        `json:"name"`
	Balance      string        `json:"balance"`
	Transactions []Transaction `json:"transactions"`
}

type Transaction struct {
	ID          string `json:"id"`
	Posted      int64  `json:"posted"`
	Amount      string `json:"amount"`
	Description string `json:"description"`
	Pending     bool   `json:"pending"`
}

type accountsResponse struct {
	Accounts []Account `json:"accounts"`
}

func FetchAccounts(accessURL string, since time.Time) ([]Account, error) {
	u, err := url.Parse(accessURL)
	if err != nil {
		return nil, fmt.Errorf("parsing access url: %w", err)
	}
	username := u.User.Username()
	password, _ := u.User.Password()
	u.User = nil
	u.Path = u.Path + "/accounts"

	q := u.Query()
	q.Set("start-date", fmt.Sprintf("%d", since.Unix()))
	u.RawQuery = q.Encode()

	req, err := http.NewRequest("GET", u.String(), nil)
	if err != nil {
		return nil, fmt.Errorf("building request: %w", err)
	}
	req.SetBasicAuth(username, password)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("calling simplefin: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected status %d from simplefin", resp.StatusCode)
	}

	var data accountsResponse
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return nil, fmt.Errorf("decoding response: %w", err)
	}

	return data.Accounts, nil
}
