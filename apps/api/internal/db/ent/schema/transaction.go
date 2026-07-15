package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
)

type Transaction struct {
	ent.Schema
}

func (Transaction) Fields() []ent.Field {
	return []ent.Field{
		field.Float("amount"),
		field.String("description").
			Optional(),
		field.Time("posted_date"),
		field.Enum("source").
			Values("manual", "simplefin").
			Default("manual"),
		field.Enum("status").
			Values("provisional", "confirmed").
			Default("provisional"),
		field.String("external_id").
			Optional().
			Nillable().
			Unique(),
		field.Enum("classification").
			Values("discretionary", "recurring_fulfillment", "transfer", "income"),
		field.Time("created_at").
			Default(time.Now).
			Immutable(),
	}
}

func (Transaction) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("account", Account.Type).
			Ref("transactions").
			Unique().
			Required(),
		edge.From("category", Category.Type).
			Ref("transactions").
			Unique(),
		edge.From("recurring_instance", RecurringInstance.Type).
			Ref("transaction").
			Unique(),
		edge.To("transfer_pair", Transaction.Type).
			Unique(),
		edge.From("transfer_pair_of", Transaction.Type).
			Ref("transfer_pair").
			Unique(),
	}
}
