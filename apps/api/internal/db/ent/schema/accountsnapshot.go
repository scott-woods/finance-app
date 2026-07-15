package schema

import (
	"entgo.io/ent"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
)

type AccountSnapshot struct {
	ent.Schema
}

func (AccountSnapshot) Fields() []ent.Field {
	return []ent.Field{
		field.Float("balance"),
		field.Time("as_of_date"),
		field.Enum("source").
			Values("manual", "simplefin").
			Default("manual"),
	}
}

func (AccountSnapshot) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("account", Account.Type).
			Ref("snapshots").
			Unique().
			Required(),
	}
}
