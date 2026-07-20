package api

import (
	"context"
	"sort"
	"time"

	"github.com/scott-woods/finance-app/apps/api/internal/db/ent"
	"github.com/scott-woods/finance-app/apps/api/internal/db/ent/account"
	"github.com/scott-woods/finance-app/apps/api/internal/db/ent/accountsnapshot"
)

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
