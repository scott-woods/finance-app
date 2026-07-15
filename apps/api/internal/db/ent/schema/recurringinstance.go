package schema

import (
	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
)

type RecurringInstance struct {
	ent.Schema
}

func (RecurringInstance) Fields() []ent.Field {
	return []ent.Field{
		field.Time("due_date"),
		field.Float("estimated_amount"),
		field.Float("actual_amount").
			Optional().
			Nillable(),
		field.Enum("status").
			Values("upcoming", "estimated", "confirmed", "paid").
			Default("upcoming"),
	}
}

func (RecurringInstance) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("recurring_item", RecurringItem.Type).
			Ref("instances").
			Unique().
			Required(),
		edge.To("transaction", Transaction.Type).
			Unique(),
	}
}
