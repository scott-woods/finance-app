package api

import (
	"context"
	"time"

	"github.com/scott-woods/finance-app/apps/api/internal/db/ent/transaction"
)

func (s *Server) GetSpendingSummary(ctx context.Context, request GetSpendingSummaryRequestObject) (GetSpendingSummaryResponseObject, error) {
	year, month := request.Params.Year, request.Params.Month
	monthStart := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.UTC)
	monthEnd := monthStart.AddDate(0, 1, 0)
	daysInMonth := monthStart.AddDate(0, 1, -1).Day()

	recurring, err := s.computeRecurringSummary(ctx)
	if err != nil {
		return nil, err
	}
	available := recurring.DisposableIncome

	txs, err := s.DB.Transaction.Query().
		Where(
			transaction.ClassificationEQ(transaction.ClassificationDiscretionary),
			transaction.PostedDateGTE(monthStart),
			transaction.PostedDateLT(monthEnd),
		).
		All(ctx)
	if err != nil {
		return nil, err
	}

	dailyTotals := make(map[int]float64)
	var spentSoFar float64
	for _, tx := range txs {
		spentSoFar += tx.Amount
		dailyTotals[tx.PostedDate.Day()] += tx.Amount
	}

	dailySpending := make([]DailySpendingPoint, daysInMonth)
	for day := 1; day <= daysInMonth; day++ {
		date := time.Date(year, time.Month(month), day, 0, 0, 0, 0, time.UTC)
		dailySpending[day-1] = DailySpendingPoint{Date: date, Amount: dailyTotals[day]}
	}

	now := time.Now().UTC()
	daysElapsed := daysInMonth
	if now.Before(monthEnd) {
		if now.Before(monthStart) {
			daysElapsed = 0
		} else {
			daysElapsed = now.Day()
		}
	}
	daysRemaining := daysInMonth - daysElapsed

	remaining := available - spentSoFar
	targetDailyAverage := available / float64(daysInMonth)

	var actualDailyAverage float64
	if daysElapsed > 0 {
		actualDailyAverage = spentSoFar / float64(daysElapsed)
	}

	var safeToSpendPerDay float64
	if daysRemaining > 0 {
		safeToSpendPerDay = remaining / float64(daysRemaining)
	} else {
		safeToSpendPerDay = remaining
	}

	return GetSpendingSummary200JSONResponse{
		Available:          available,
		SpentSoFar:         spentSoFar,
		Remaining:          remaining,
		DaysInMonth:        daysInMonth,
		DaysElapsed:        daysElapsed,
		DaysRemaining:      daysRemaining,
		TargetDailyAverage: targetDailyAverage,
		ActualDailyAverage: actualDailyAverage,
		SafeToSpendPerDay:  safeToSpendPerDay,
		DailySpending:      dailySpending,
	}, nil
}
