package filesystem

import (
	"os"

	"github.com/pkg/errors"
)

// Creates a virtual disk based on a path
func CreateVirtualDisk(name string, size int32) error {
	f, err := os.Create(name)
	if err != nil {
		return errors.Wrap(err, "Failed to create virtual disk")
	}
	f.Close()
	return nil
}
