package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
)

// Account holds the schema definition for the Account entity.
type Account struct {
	ent.Schema
}

// Fields of the Account.
func (Account) Fields() []ent.Field {
	return []ent.Field{
		field.String("name").
			NotEmpty(),
		field.Enum("type").
			Values(
				"checking",
				"savings",
				"credit_card",
				"investment",
				"real_estate",
				"vehicle",
				"loan",
				"other_asset",
				"other_debt",
			),
		field.Bool("is_asset"),
		field.Enum("source").
			Values("manual", "simplefin").
			Default("manual"),
		field.String("external_account_id").
			Optional().
			Nillable(),
		field.Float("credit_limit").
			Optional().
			Nillable(),
		field.Time("created_at").
			Default(time.Now).
			Immutable(),
		field.Enum("status").
			Values("active", "closed", "hidden").
			Default("active"),
		field.Time("closed_at").
			Optional().
			Nillable(),
	}
}

// Edges of the Account.
func (Account) Edges() []ent.Edge {
	return []ent.Edge{
		edge.To("snapshots", AccountSnapshot.Type),
		edge.To("transactions", Transaction.Type),
		edge.To("recurring_items", RecurringItem.Type),
	}
}
