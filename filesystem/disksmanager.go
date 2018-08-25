package filesystem

import (
	"fmt"
	"os"

	"github.com/pkg/errors"
)

func init() {
	// TODO: Read default path dir getting all created virtualdisks and its sizes.
}

func RegisterVirtualDisk(vDisk *VDiskAttributes) error {
	f, err := os.Create(fmt.Sprintf("%s/general.sfs", os.Getenv("WORKSPACE")))
	if err != nil {
		return errors.Wrap(err, "Failed to register the virtual disk in the storage")
	}
	defer f.Close()

	blocks := 1000

	b := make([]byte, 32)
	for i := 0; i < blocks; i++ {
		dat, err := f.Read(b)
		if err != nil {
			return errors.Wrap(err, "Failed to read the vdisk manager file")
		}
		fmt.Printf("%d bytes: %s\n", dat, string(b))
	}

	return nil
}
