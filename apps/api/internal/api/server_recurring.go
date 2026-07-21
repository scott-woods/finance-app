package api

import (
	"context"
	"time"

	"github.com/scott-woods/finance-app/apps/api/internal/db/ent"
	"github.com/scott-woods/finance-app/apps/api/internal/db/ent/recurringinstance"
	"github.com/scott-woods/finance-app/apps/api/internal/db/ent/recurringitem"
)

func (s *Server) ListRecurringItems(ctx context.Context, request ListRecurringItemsRequestObject) (ListRecurringItemsResponseObject, error) {
	items, err := s.DB.RecurringItem.Query().
		WithCategory().
		WithAccount().
		All(ctx)
	if err != nil {
		return nil, err
	}

	result := make([]RecurringItem, len(items))
	for i, item := range items {
		var categoryID, accountID *int
		if item.Edges.Category != nil {
			categoryID = &item.Edges.Category.ID
		}
		if item.Edges.Account != nil {
			accountID = &item.Edges.Account.ID
		}
		result[i] = toAPIRecurringItem(item, categoryID, accountID)
	}

	return ListRecurringItems200JSONResponse(result), nil
}

func (s *Server) CreateRecurringItem(ctx context.Context, request CreateRecurringItemRequestObject) (CreateRecurringItemResponseObject, error) {
	input := request.Body

	create := s.DB.RecurringItem.Create().
		SetKind(recurringitem.Kind(input.Kind)).
		SetName(input.Name).
		SetFrequency(recurringitem.Frequency(input.Frequency)).
		SetEstimatedAmount(input.EstimatedAmount).
		SetStartDate(input.StartDate).
		SetNillableCategoryID(input.CategoryId).
		SetNillableAccountID(input.AccountId)

	if input.EndDate != nil {
		create = create.SetEndDate(*input.EndDate)
	}
	if input.Active != nil {
		create = create.SetActive(*input.Active)
	}
	if input.PreTax != nil {
		create = create.SetPreTax(*input.PreTax)
	}

	item, err := create.Save(ctx)
	if err != nil {
		return nil, err
	}

	return CreateRecurringItem201JSONResponse(toAPIRecurringItem(item, input.CategoryId, input.AccountId)), nil
}

func (s *Server) UpdateRecurringItem(ctx context.Context, request UpdateRecurringItemRequestObject) (UpdateRecurringItemResponseObject, error) {
	input := request.Body

	update := s.DB.RecurringItem.UpdateOneID(request.Id).
		SetKind(recurringitem.Kind(input.Kind)).
		SetName(input.Name).
		SetFrequency(recurringitem.Frequency(input.Frequency)).
		SetEstimatedAmount(input.EstimatedAmount).
		SetStartDate(input.StartDate)

	if input.EndDate != nil {
		update = update.SetEndDate(*input.EndDate)
	} else {
		update = update.ClearEndDate()
	}
	if input.Active != nil {
		update = update.SetActive(*input.Active)
	}
	if input.PreTax != nil {
		update = update.SetPreTax(*input.PreTax)
	}
	if input.CategoryId != nil {
		update = update.SetCategoryID(*input.CategoryId)
	} else {
		update = update.ClearCategory()
	}
	if input.AccountId != nil {
		update = update.SetAccountID(*input.AccountId)
	} else {
		update = update.ClearAccount()
	}

	item, err := update.Save(ctx)
	if ent.IsNotFound(err) {
		return UpdateRecurringItem404Response{}, nil
	}
	if err != nil {
		return nil, err
	}

	return UpdateRecurringItem200JSONResponse(toAPIRecurringItem(item, input.CategoryId, input.AccountId)), nil
}

func (s *Server) DeleteRecurringItem(ctx context.Context, request DeleteRecurringItemRequestObject) (DeleteRecurringItemResponseObject, error) {
	err := s.DB.RecurringItem.DeleteOneID(request.Id).Exec(ctx)
	if ent.IsNotFound(err) {
		return DeleteRecurringItem404Response{}, nil
	}
	if err != nil {
		return nil, err
	}

	return DeleteRecurringItem204Response{}, nil
}

func (s *Server) ListRecurringInstances(ctx context.Context, request ListRecurringInstancesRequestObject) (ListRecurringInstancesResponseObject, error) {
	monthStart := time.Date(request.Params.Year, time.Month(request.Params.Month), 1, 0, 0, 0, 0, time.UTC)
	monthEnd := monthStart.AddDate(0, 1, 0)

	if err := s.ensureInstancesGenerated(ctx, monthStart, monthEnd); err != nil {
		return nil, err
	}

	instances, err := s.DB.RecurringInstance.Query().
		Where(
			recurringinstance.DueDateGTE(monthStart),
			recurringinstance.DueDateLT(monthEnd),
		).
		WithRecurringItem(func(q *ent.RecurringItemQuery) {
			q.WithCategory()
		}).
		Order(ent.Asc(recurringinstance.FieldDueDate)).
		All(ctx)
	if err != nil {
		return nil, err
	}

	result := make([]RecurringInstance, len(instances))
	for i, inst := range instances {
		result[i] = toAPIRecurringInstance(inst)
	}

	return ListRecurringInstances200JSONResponse(result), nil
}

func (s *Server) UpdateRecurringInstance(ctx context.Context, request UpdateRecurringInstanceRequestObject) (UpdateRecurringInstanceResponseObject, error) {
	input := request.Body

	update := s.DB.RecurringInstance.UpdateOneID(request.Id)
	if input.ActualAmount != nil {
		update = update.SetActualAmount(*input.ActualAmount)
	}
	if input.Status != nil {
		update = update.SetStatus(recurringinstance.Status(*input.Status))
	}

	if _, err := update.Save(ctx); err != nil {
		if ent.IsNotFound(err) {
			return UpdateRecurringInstance404Response{}, nil
		}
		return nil, err
	}

	inst, err := s.DB.RecurringInstance.Query().
		Where(recurringinstance.ID(request.Id)).
		WithRecurringItem(func(q *ent.RecurringItemQuery) { q.WithCategory() }).
		Only(ctx)
	if err != nil {
		return nil, err
	}

	return UpdateRecurringInstance200JSONResponse(toAPIRecurringInstance(inst)), nil
}

func (s *Server) GetRecurringSummary(ctx context.Context, request GetRecurringSummaryRequestObject) (GetRecurringSummaryResponseObject, error) {
	summary, err := s.computeRecurringSummary(ctx)
	if err != nil {
		return nil, err
	}
	return GetRecurringSummary200JSONResponse(summary), nil
}

func (s *Server) ensureInstancesGenerated(ctx context.Context, monthStart, monthEnd time.Time) error {
	items, err := s.DB.RecurringItem.Query().
		Where(
			recurringitem.ActiveEQ(true),
			recurringitem.StartDateLT(monthEnd),
			recurringitem.Or(
				recurringitem.EndDateIsNil(),
				recurringitem.EndDateGTE(monthStart),
			),
		).
		All(ctx)
	if err != nil {
		return err
	}

	for _, item := range items {
		for _, due := range computeDueDates(item, monthStart, monthEnd) {
			exists, err := s.DB.RecurringInstance.Query().
				Where(
					recurringinstance.HasRecurringItemWith(recurringitem.ID(item.ID)),
					recurringinstance.DueDateEQ(due),
				).
				Exist(ctx)
			if err != nil {
				return err
			}
			if exists {
				continue
			}

			_, err = s.DB.RecurringInstance.Create().
				SetRecurringItem(item).
				SetDueDate(due).
				SetEstimatedAmount(item.EstimatedAmount).
				Save(ctx)
			if err != nil {
				return err
			}
		}
	}

	return nil
}

func (s *Server) computeRecurringSummary(ctx context.Context) (RecurringSummary, error) {
	items, err := s.DB.RecurringItem.Query().
		Where(recurringitem.ActiveEQ(true)).
		All(ctx)
	if err != nil {
		return RecurringSummary{}, err
	}

	var totalIncome, totalExpenses, investPreTax, investPostTax, totalTransfers float64

	for _, item := range items {
		monthly := monthlyEquivalent(item.EstimatedAmount, item.Frequency)

		switch item.Kind {
		case recurringitem.KindIncome:
			totalIncome += monthly
		case recurringitem.KindExpense:
			totalExpenses += monthly
		case recurringitem.KindInvestmentContribution:
			if item.PreTax {
				investPreTax += monthly
			} else {
				investPostTax += monthly
			}
		case recurringitem.KindTransfer:
			totalTransfers += monthly
		}
	}

	disposableIncome := totalIncome - totalExpenses - investPostTax - totalTransfers
	effectiveIncome := totalIncome + investPreTax
	totalInvestments := investPreTax + investPostTax

	var savingsRate float64
	if effectiveIncome > 0 {
		savingsRate = (totalInvestments / effectiveIncome) * 100
	}

	return RecurringSummary{
		TotalIncome:             totalIncome,
		TotalExpenses:           totalExpenses,
		TotalInvestmentsPreTax:  investPreTax,
		TotalInvestmentsPostTax: investPostTax,
		DisposableIncome:        disposableIncome,
		EffectiveIncome:         effectiveIncome,
		SavingsRate:             savingsRate,
	}, nil
}

func toAPIRecurringInstance(inst *ent.RecurringInstance) RecurringInstance {
	item := inst.Edges.RecurringItem
	var categoryID *int
	if item.Edges.Category != nil {
		categoryID = &item.Edges.Category.ID
	}

	return RecurringInstance{
		Id:              inst.ID,
		RecurringItemId: item.ID,
		DueDate:         inst.DueDate,
		EstimatedAmount: inst.EstimatedAmount,
		ActualAmount:    inst.ActualAmount,
		Status:          RecurringInstanceStatus(inst.Status),
		ItemName:        item.Name,
		Kind:            RecurringItemKind(item.Kind),
		CategoryId:      categoryID,
	}
}

func toAPIRecurringItem(item *ent.RecurringItem, categoryID, accountID *int) RecurringItem {
	active := item.Active
	preTax := item.PreTax
	return RecurringItem{
		Id:              item.ID,
		Kind:            RecurringItemKind(item.Kind),
		Name:            item.Name,
		Frequency:       RecurringFrequency(item.Frequency),
		EstimatedAmount: item.EstimatedAmount,
		StartDate:       item.StartDate,
		EndDate:         item.EndDate,
		Active:          &active,
		PreTax:          &preTax,
		CategoryId:      categoryID,
		AccountId:       accountID,
	}
}

func computeDueDates(item *ent.RecurringItem, monthStart, monthEnd time.Time) []time.Time {
	var dates []time.Time

	switch item.Frequency {
	case recurringitem.FrequencyMonthly:
		lastDay := monthStart.AddDate(0, 1, -1).Day()
		day := item.StartDate.Day()
		if day > lastDay {
			day = lastDay
		}
		due := time.Date(monthStart.Year(), monthStart.Month(), day, 0, 0, 0, 0, time.UTC)
		if !due.Before(item.StartDate) && (item.EndDate == nil || !due.After(*item.EndDate)) {
			dates = append(dates, due)
		}

	case recurringitem.FrequencyWeekly, recurringitem.FrequencyBiweekly:
		interval := 7
		if item.Frequency == recurringitem.FrequencyBiweekly {
			interval = 14
		}
		cursor := item.StartDate
		for cursor.Before(monthEnd) {
			if !cursor.Before(monthStart) && (item.EndDate == nil || !cursor.After(*item.EndDate)) {
				dates = append(dates, cursor)
			}
			cursor = cursor.AddDate(0, 0, interval)
		}

	case recurringitem.FrequencyAnnual:
		due := time.Date(monthStart.Year(), item.StartDate.Month(), item.StartDate.Day(), 0, 0, 0, 0, time.UTC)
		if !due.Before(monthStart) && due.Before(monthEnd) &&
			!due.Before(item.StartDate) && (item.EndDate == nil || !due.After(*item.EndDate)) {
			dates = append(dates, due)
		}
	}

	return dates
}

func monthlyEquivalent(amount float64, freq recurringitem.Frequency) float64 {
	switch freq {
	case recurringitem.FrequencyWeekly:
		return amount * 4.33
	case recurringitem.FrequencyBiweekly:
		return amount * 2.17
	case recurringitem.FrequencyAnnual:
		return amount / 12
	default:
		return amount
	}
}
