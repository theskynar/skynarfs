package config

import (
	"os"

	"github.com/pkg/errors"
)

const (
	Workspace = "WORKSPACE"
)

func Validate() error {

	ws := os.Getenv(Workspace)

	if os.Getenv(Workspace) == "" {
		return errors.Errorf("%s is not set", Workspace)
	}

	if _, err := os.Stat(ws); os.IsNotExist(err) {
		return errors.Errorf("%s not found", Workspace)
	}

	return nil
}
