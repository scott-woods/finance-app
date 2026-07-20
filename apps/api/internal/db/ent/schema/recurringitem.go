package schema

import (
	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
)

type RecurringItem struct {
	ent.Schema
}

func (RecurringItem) Fields() []ent.Field {
	return []ent.Field{
		field.Enum("kind").
			Values("expense", "investment_contribution", "income", "transfer"),
		field.String("name").
			NotEmpty(),
		field.Enum("frequency").
			Values("weekly", "biweekly", "monthly", "annual", "custom_interval"),
		field.Float("estimated_amount"),
		field.Time("start_date"),
		field.Bool("active").
			Default(true),
		field.Time("end_date").
			Optional().
			Nillable(),
		field.Bool("pre_tax").
			Default(false),
	}
}

func (RecurringItem) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("account", Account.Type).
			Ref("recurring_items").
			Unique(),
		edge.From("category", Category.Type).
			Ref("recurring_items").
			Unique(),
		edge.To("instances", RecurringInstance.Type),
	}
}
