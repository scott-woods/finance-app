package schema

import (
	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
)

type Category struct {
	ent.Schema
}

func (Category) Fields() []ent.Field {
	return []ent.Field{
		field.String("name").
			NotEmpty(),
		field.Enum("kind").
			Values("spending", "income"),
	}
}

func (Category) Edges() []ent.Edge {
	return []ent.Edge{
		edge.To("transactions", Transaction.Type),
		edge.To("recurring_items", RecurringItem.Type),
	}
}
