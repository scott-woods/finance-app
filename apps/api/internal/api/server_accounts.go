package api

import (
	"context"

	"github.com/scott-woods/finance-app/apps/api/internal/db/ent"
	"github.com/scott-woods/finance-app/apps/api/internal/db/ent/account"
)

func (s *Server) ListAccounts(ctx context.Context, request ListAccountsRequestObject) (ListAccountsResponseObject, error) {
	accounts, err := s.DB.Account.Query().All(ctx)
	if err != nil {
		return nil, err
	}

	result := make([]Account, len(accounts))
	for i, a := range accounts {
		result[i] = toAPIAccount(a)
	}

	return ListAccounts200JSONResponse(result), nil
}

func (s *Server) GetAccount(ctx context.Context, request GetAccountRequestObject) (GetAccountResponseObject, error) {
	account, err := s.DB.Account.Get(ctx, request.Id)
	if ent.IsNotFound(err) {
		return GetAccount404Response{}, nil
	}
	if err != nil {
		return nil, err
	}

	result := toAPIAccount(account)
	return GetAccount200JSONResponse(result), nil
}

func (s *Server) CreateAccount(ctx context.Context, request CreateAccountRequestObject) (CreateAccountResponseObject, error) {
	input := request.Body

	status := account.StatusActive
	if input.Status != nil {
		status = account.Status(*input.Status)
	}

	create := s.DB.Account.Create().
		SetName(input.Name).
		SetType(account.Type(input.Type)).
		SetIsAsset(input.IsAsset).
		SetStatus(status)

	if input.CreditLimit != nil {
		create = create.SetCreditLimit(*input.CreditLimit)
	}

	acct, err := create.Save(ctx)
	if err != nil {
		return nil, err
	}

	return CreateAccount201JSONResponse(toAPIAccount(acct)), nil
}

func (s *Server) UpdateAccount(ctx context.Context, request UpdateAccountRequestObject) (UpdateAccountResponseObject, error) {
	input := request.Body

	update := s.DB.Account.UpdateOneID(request.Id).
		SetName(input.Name).
		SetType(account.Type(input.Type)).
		SetIsAsset(input.IsAsset)

	if input.CreditLimit != nil {
		update = update.SetCreditLimit(*input.CreditLimit)
	} else {
		update = update.ClearCreditLimit()
	}

	if input.Status != nil {
		update = update.SetStatus(account.Status(*input.Status))
	}

	acct, err := update.Save(ctx)
	if ent.IsNotFound(err) {
		return UpdateAccount404Response{}, nil
	}
	if err != nil {
		return nil, err
	}

	return UpdateAccount200JSONResponse(toAPIAccount(acct)), nil
}

func (s *Server) DeleteAccount(ctx context.Context, request DeleteAccountRequestObject) (DeleteAccountResponseObject, error) {
	err := s.DB.Account.DeleteOneID(request.Id).Exec(ctx)
	if ent.IsNotFound(err) {
		return DeleteAccount404Response{}, nil
	}
	if err != nil {
		return nil, err
	}

	return DeleteAccount204Response{}, nil
}

func toAPIAccount(a *ent.Account) Account {
	status := AccountStatus(a.Status)
	return Account{
		Id:          a.ID,
		Name:        a.Name,
		Type:        AccountType(a.Type),
		IsAsset:     a.IsAsset,
		CreditLimit: a.CreditLimit,
		CreatedAt:   a.CreatedAt,
		Status:      &status,
		ClosedAt:    a.ClosedAt,
	}
}
