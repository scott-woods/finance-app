package api

import (
	"context"
	"time"

	"github.com/scott-woods/finance-app/apps/api/internal/db/ent"
	"github.com/scott-woods/finance-app/apps/api/internal/db/ent/account"
	"github.com/scott-woods/finance-app/apps/api/internal/db/ent/transaction"
)

var transactableAccountTypes = map[account.Type]bool{
	account.TypeChecking:   true,
	account.TypeSavings:    true,
	account.TypeCreditCard: true,
}

func (s *Server) ListTransactions(ctx context.Context, request ListTransactionsRequestObject) (ListTransactionsResponseObject, error) {
	monthStart := time.Date(request.Params.Year, time.Month(request.Params.Month), 1, 0, 0, 0, 0, time.UTC)
	monthEnd := monthStart.AddDate(0, 1, 0)

	txs, err := s.DB.Transaction.Query().
		Where(
			transaction.PostedDateGTE(monthStart),
			transaction.PostedDateLT(monthEnd),
		).
		WithAccount().
		WithCategory().
		Order(ent.Desc(transaction.FieldPostedDate), ent.Desc(transaction.FieldID)).
		All(ctx)
	if err != nil {
		return nil, err
	}

	result := make([]Transaction, len(txs))
	for i, tx := range txs {
		result[i] = toAPITransaction(tx)
	}

	return ListTransactions200JSONResponse(result), nil
}

func (s *Server) CreateTransaction(ctx context.Context, request CreateTransactionRequestObject) (CreateTransactionResponseObject, error) {
	input := request.Body

	acct, err := s.DB.Account.Get(ctx, input.AccountId)
	if ent.IsNotFound(err) {
		return CreateTransaction400Response{}, nil
	}
	if err != nil {
		return nil, err
	}
	if !transactableAccountTypes[acct.Type] {
		return CreateTransaction400Response{}, nil
	}

	create := s.DB.Transaction.Create().
		SetAmount(input.Amount).
		SetPostedDate(input.PostedDate).
		SetAccountID(input.AccountId).
		SetSource(transaction.SourceManual).
		SetStatus(transaction.StatusConfirmed).
		SetClassification(transaction.ClassificationDiscretionary).
		SetNillableCategoryID(input.CategoryId)

	if input.Description != nil {
		create = create.SetDescription(*input.Description)
	}

	created, err := create.Save(ctx)
	if err != nil {
		return nil, err
	}

	tx, err := s.DB.Transaction.Query().
		Where(transaction.ID(created.ID)).
		WithAccount().
		WithCategory().
		Only(ctx)
	if err != nil {
		return nil, err
	}

	return CreateTransaction201JSONResponse(toAPITransaction(tx)), nil
}

func (s *Server) UpdateTransaction(ctx context.Context, request UpdateTransactionRequestObject) (UpdateTransactionResponseObject, error) {
	input := request.Body

	update := s.DB.Transaction.UpdateOneID(request.Id).
		SetAmount(input.Amount).
		SetPostedDate(input.PostedDate).
		SetAccountID(input.AccountId)

	if input.CategoryId != nil {
		update = update.SetCategoryID(*input.CategoryId)
	} else {
		update = update.ClearCategory()
	}
	if input.Description != nil {
		update = update.SetDescription(*input.Description)
	} else {
		update = update.ClearDescription()
	}

	if _, err := update.Save(ctx); err != nil {
		if ent.IsNotFound(err) {
			return UpdateTransaction404Response{}, nil
		}
		return nil, err
	}

	tx, err := s.DB.Transaction.Query().
		Where(transaction.ID(request.Id)).
		WithAccount().
		WithCategory().
		Only(ctx)
	if err != nil {
		return nil, err
	}

	return UpdateTransaction200JSONResponse(toAPITransaction(tx)), nil
}

func (s *Server) DeleteTransaction(ctx context.Context, request DeleteTransactionRequestObject) (DeleteTransactionResponseObject, error) {
	err := s.DB.Transaction.DeleteOneID(request.Id).Exec(ctx)
	if ent.IsNotFound(err) {
		return DeleteTransaction404Response{}, nil
	}
	if err != nil {
		return nil, err
	}

	return DeleteTransaction204Response{}, nil
}

func toAPITransaction(tx *ent.Transaction) Transaction {
	var categoryID *int
	if tx.Edges.Category != nil {
		categoryID = &tx.Edges.Category.ID
	}

	var description *string
	if tx.Description != "" {
		description = &tx.Description
	}

	return Transaction{
		Id:             tx.ID,
		Amount:         tx.Amount,
		Description:    description,
		CategoryId:     categoryID,
		AccountId:      tx.Edges.Account.ID,
		PostedDate:     tx.PostedDate,
		Classification: TransactionClassification(tx.Classification),
		Status:         TransactionStatus(tx.Status),
	}
}
