package api

import (
	"context"

	"github.com/scott-woods/finance-app/apps/api/internal/db/ent/category"
)

func (s *Server) ListCategories(ctx context.Context, request ListCategoriesRequestObject) (ListCategoriesResponseObject, error) {
	categories, err := s.DB.Category.Query().All(ctx)
	if err != nil {
		return nil, err
	}

	result := make([]Category, len(categories))
	for i, c := range categories {
		result[i] = Category{
			Id:   c.ID,
			Name: c.Name,
			Kind: CategoryKind(c.Kind),
		}
	}

	return ListCategories200JSONResponse(result), nil
}

func (s *Server) CreateCategory(ctx context.Context, request CreateCategoryRequestObject) (CreateCategoryResponseObject, error) {
	input := request.Body

	c, err := s.DB.Category.Create().
		SetName(input.Name).
		SetKind(category.Kind(input.Kind)).
		Save(ctx)
	if err != nil {
		return nil, err
	}

	return CreateCategory201JSONResponse(Category{
		Id:   c.ID,
		Name: c.Name,
		Kind: CategoryKind(c.Kind),
	}), nil
}
