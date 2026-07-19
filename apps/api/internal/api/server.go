package api

import (
	"context"
	"sort"
	"time"

	"github.com/scott-woods/finance-app/apps/api/internal/db/ent"
	"github.com/scott-woods/finance-app/apps/api/internal/db/ent/account"
	"github.com/scott-woods/finance-app/apps/api/internal/db/ent/accountsnapshot"
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

func (s *Server) ListAccountSnapshots(ctx context.Context, request ListAccountSnapshotsRequestObject) (ListAccountSnapshotsResponseObject, error) {
	snapshots, err := s.DB.AccountSnapshot.Query().
		Where(accountsnapshot.HasAccountWith(account.ID(request.Id))).
		All(ctx)
	if err != nil {
		return nil, err
	}

	result := make([]AccountSnapshot, len(snapshots))
	for i, snap := range snapshots {
		result[i] = toAPIAccountSnapshot(snap, snap.QueryAccount().OnlyIDX(context.Background()))
	}

	return ListAccountSnapshots200JSONResponse(result), nil
}

func (s *Server) CreateAccountSnapshot(ctx context.Context, request CreateAccountSnapshotRequestObject) (CreateAccountSnapshotResponseObject, error) {
	exists, err := s.DB.Account.Query().Where(account.ID(request.Id)).Exist(ctx)
	if err != nil {
		return nil, err
	}
	if !exists {
		return CreateAccountSnapshot404Response{}, nil
	}

	input := request.Body
	snap, err := s.DB.AccountSnapshot.Create().
		SetBalance(input.Balance).
		SetAsOfDate(input.AsOfDate).
		SetAccountID(request.Id).
		Save(ctx)
	if err != nil {
		return nil, err
	}

	return CreateAccountSnapshot201JSONResponse(toAPIAccountSnapshot(snap, snap.QueryAccount().OnlyIDX(context.Background()))), nil
}

func (s *Server) GetNetWorthSummary(ctx context.Context, request GetNetWorthSummaryRequestObject) (GetNetWorthSummaryResponseObject, error) {
	accounts, err := s.DB.Account.Query().
		Where(account.StatusEQ(account.StatusActive)).
		All(ctx)
	if err != nil {
		return nil, err
	}

	assetGroups := map[account.Type]*AccountTypeGroup{}
	debtGroups := map[account.Type]*AccountTypeGroup{}
	var totalAssets, totalDebts float64

	for _, a := range accounts {
		latest, err := a.QuerySnapshots().
			Order(
				ent.Desc(accountsnapshot.FieldAsOfDate),
				ent.Desc(accountsnapshot.FieldID),
			).
			First(ctx)
		if err != nil && !ent.IsNotFound(err) {
			return nil, err
		}

		balance := AccountBalance{
			Id:   a.ID,
			Name: a.Name,
			Type: AccountType(a.Type),
		}
		var value float64
		if latest != nil {
			balance.Balance = &latest.Balance
			balance.AsOfDate = &latest.AsOfDate
			value = latest.Balance
		}

		groups := assetGroups
		if !a.IsAsset {
			groups = debtGroups
		}

		group, ok := groups[a.Type]
		if !ok {
			group = &AccountTypeGroup{Type: AccountType(a.Type)}
			groups[a.Type] = group
		}
		group.Accounts = append(group.Accounts, balance)
		group.Subtotal += value

		if a.IsAsset {
			totalAssets += value
		} else {
			totalDebts += value
		}
	}

	toSlice := func(m map[account.Type]*AccountTypeGroup) []AccountTypeGroup {
		result := make([]AccountTypeGroup, 0, len(m))
		for _, g := range m {
			result = append(result, *g)
		}
		return result
	}

	return GetNetWorthSummary200JSONResponse{
		NetWorth:    totalAssets - totalDebts,
		TotalAssets: totalAssets,
		TotalDebts:  totalDebts,
		AssetGroups: toSlice(assetGroups),
		DebtGroups:  toSlice(debtGroups),
	}, nil
}

func (s *Server) GetNetWorthTrend(ctx context.Context, request GetNetWorthTrendRequestObject) (GetNetWorthTrendResponseObject, error) {
	accounts, err := s.DB.Account.Query().
		Where(account.StatusEQ(account.StatusActive)).
		All(ctx)
	if err != nil {
		return nil, err
	}

	type accountSnaps struct {
		isAsset   bool
		snapshots []*ent.AccountSnapshot
	}

	byAccount := make(map[int]*accountSnaps)
	dateSet := make(map[time.Time]struct{})

	for _, a := range accounts {
		snaps, err := a.QuerySnapshots().
			Order(ent.Asc(accountsnapshot.FieldAsOfDate), ent.Asc(accountsnapshot.FieldID)).
			All(ctx)
		if err != nil {
			return nil, err
		}
		if len(snaps) == 0 {
			continue
		}
		byAccount[a.ID] = &accountSnaps{isAsset: a.IsAsset, snapshots: snaps}
		for _, snap := range snaps {
			dateSet[snap.AsOfDate.Truncate(24*time.Hour)] = struct{}{}
		}
	}

	dates := make([]time.Time, 0, len(dateSet))
	for d := range dateSet {
		dates = append(dates, d)
	}
	sort.Slice(dates, func(i, j int) bool { return dates[i].Before(dates[j]) })

	idx := make(map[int]int)
	latestValue := make(map[int]float64)
	points := make([]NetWorthTrendPoint, 0, len(dates))

	for _, d := range dates {
		for accID, as := range byAccount {
			i := idx[accID]
			for i < len(as.snapshots) && !as.snapshots[i].AsOfDate.Truncate(24*time.Hour).After(d) {
				latestValue[accID] = as.snapshots[i].Balance
				i++
			}
			idx[accID] = i
		}

		var totalAssets, totalDebts float64
		for accID, as := range byAccount {
			if v, ok := latestValue[accID]; ok {
				if as.isAsset {
					totalAssets += v
				} else {
					totalDebts += v
				}
			}
		}

		points = append(points, NetWorthTrendPoint{
			AsOfDate:    d,
			NetWorth:    totalAssets - totalDebts,
			TotalAssets: totalAssets,
			TotalDebts:  totalDebts,
		})
	}

	return GetNetWorthTrend200JSONResponse(points), nil
}

func (s *Server) UpdateAccountSnapshot(ctx context.Context, request UpdateAccountSnapshotRequestObject) (UpdateAccountSnapshotResponseObject, error) {
	input := request.Body

	snap, err := s.DB.AccountSnapshot.UpdateOneID(request.SnapshotId).
		SetBalance(input.Balance).
		SetAsOfDate(input.AsOfDate).
		Save(ctx)
	if ent.IsNotFound(err) {
		return UpdateAccountSnapshot404Response{}, nil
	}
	if err != nil {
		return nil, err
	}

	return UpdateAccountSnapshot200JSONResponse(toAPIAccountSnapshot(snap, request.Id)), nil
}

func (s *Server) DeleteAccountSnapshot(ctx context.Context, request DeleteAccountSnapshotRequestObject) (DeleteAccountSnapshotResponseObject, error) {
	err := s.DB.AccountSnapshot.DeleteOneID(request.SnapshotId).Exec(ctx)
	if ent.IsNotFound(err) {
		return DeleteAccountSnapshot404Response{}, nil
	}
	if err != nil {
		return nil, err
	}

	return DeleteAccountSnapshot204Response{}, nil
}

func toAPIAccountSnapshot(s *ent.AccountSnapshot, accountId int) AccountSnapshot {
	return AccountSnapshot{
		Id:        s.ID,
		AccountId: accountId,
		Balance:   s.Balance,
		AsOfDate:  s.AsOfDate,
	}
}
