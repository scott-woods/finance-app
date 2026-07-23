package api

import (
	"context"
	"fmt"
	"os"
	"strconv"
	"time"

	"github.com/scott-woods/finance-app/apps/api/internal/db/ent"
	"github.com/scott-woods/finance-app/apps/api/internal/db/ent/account"
	"github.com/scott-woods/finance-app/apps/api/internal/db/ent/transaction"
	"github.com/scott-woods/finance-app/apps/api/internal/simplefin"
)

func (s *Server) SyncSimplefin(ctx context.Context, request SyncSimplefinRequestObject) (SyncSimplefinResponseObject, error) {
	accessURL := os.Getenv("SIMPLEFIN_ACCESS_URL")
	if accessURL == "" {
		return nil, fmt.Errorf("SIMPLEFIN_ACCESS_URL is not set")
	}

	linkedAccounts, err := s.DB.Account.Query().
		Where(
			account.SourceEQ(account.SourceSimplefin),
			account.ExternalAccountIDNotNil(),
		).
		All(ctx)
	if err != nil {
		return nil, err
	}

	byExternalID := make(map[string]*ent.Account)
	for _, a := range linkedAccounts {
		byExternalID[*a.ExternalAccountID] = a
	}

	since := time.Now().AddDate(0, 0, -30)
	sfAccounts, err := simplefin.FetchAccounts(accessURL, since)
	if err != nil {
		return nil, err
	}

	var imported, skipped int

	for _, sfAccount := range sfAccounts {
		localAccount, ok := byExternalID[sfAccount.ID]
		if !ok {
			continue
		}

		for _, tx := range sfAccount.Transactions {
			exists, err := s.DB.Transaction.Query().
				Where(transaction.ExternalIDEQ(tx.ID)).
				Exist(ctx)
			if err != nil {
				return nil, err
			}
			if exists {
				skipped++
				continue
			}

			amount, err := strconv.ParseFloat(tx.Amount, 64)
			if err != nil {
				continue
			}
			amount = -amount
			if amount < 0 {
				skipped++
				continue
			}

			extID := tx.ID
			_, err = s.DB.Transaction.Create().
				SetAmount(amount).
				SetDescription(tx.Description).
				SetPostedDate(time.Unix(tx.Posted, 0).UTC()).
				SetAccountID(localAccount.ID).
				SetSource(transaction.SourceSimplefin).
				SetStatus(transaction.StatusConfirmed).
				SetClassification(transaction.ClassificationDiscretionary).
				SetExternalID(extID).
				Save(ctx)
			if err != nil {
				return nil, err
			}
			imported++
		}
	}

	return SyncSimplefin200JSONResponse{
		AccountsSynced:       len(linkedAccounts),
		TransactionsImported: imported,
		TransactionsSkipped:  skipped,
	}, nil
}
