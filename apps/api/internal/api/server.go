package api

import (
	"context"

	"github.com/scott-woods/finance-app/apps/api/internal/db/ent"
	"github.com/scott-woods/finance-app/apps/api/internal/db/ent/account"
)

// Server implements the generated StrictServerInterface.
type Server struct {
	DB *ent.Client
}

func NewServer(db *ent.Client) *Server {
	return &Server{DB: db}
}

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

	create := s.DB.Account.Create().
		SetName(input.Name).
		SetType(account.Type(input.Type)).
		SetIsAsset(input.IsAsset)

	if input.CreditLimit != nil {
		create = create.SetCreditLimit(*input.CreditLimit)
	}

	account, err := create.Save(ctx)
	if err != nil {
		return nil, err
	}

	result := toAPIAccount(account)
	return CreateAccount201JSONResponse(result), nil
}

// toAPIAccount maps an Ent entity to the API's public representation —
// deliberately not exposing internal fields like source or external_account_id.
func toAPIAccount(a *ent.Account) Account {
	return Account{
		Id:          a.ID,
		Name:        a.Name,
		Type:        AccountType(a.Type),
		IsAsset:     a.IsAsset,
		CreditLimit: a.CreditLimit,
		CreatedAt:   a.CreatedAt,
	}
}
