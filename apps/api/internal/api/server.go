package api

import (
	"github.com/scott-woods/finance-app/apps/api/internal/db/ent"
)

// Server implements the generated StrictServerInterface.
type Server struct {
	DB *ent.Client
}

func NewServer(db *ent.Client) *Server {
	return &Server{DB: db}
}
