package api

import (
	"context"

	"github.com/scott-woods/finance-app/apps/api/internal/db/ent"
	"github.com/scott-woods/finance-app/apps/api/internal/db/ent/account"
	"github.com/scott-woods/finance-app/apps/api/internal/db/ent/accountsnapshot"
)

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
