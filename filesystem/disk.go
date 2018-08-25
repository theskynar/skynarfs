package filesystem

import (
	"encoding/binary"
	"fmt"
	"os"

	"github.com/pkg/errors"
)

func CreateVirtualDisk(vDisk *VDiskAttributes) error {
	fmt.Println("Disk", vDisk.Diskname)
	f, err := os.Create(vDisk.Diskname)
	if err != nil {
		return errors.Wrap(err, "Failed to create virtual disk")
	}
	defer f.Close()

	if err = zerofill(f, vDisk.Blocks, vDisk.Blocksize); err != nil {
		return errors.Wrap(err, "Failed to zerofill virtual disk")
	}

	return nil
}

func zerofill(f *os.File, blocks uint64, blocksize uint64) error {
	buf := make([]byte, (blocks * blocksize))
	err := binary.Write(f, binary.LittleEndian, buf)
	if err != nil {
		return errors.Wrap(err, "Failed to write binary to file")
	}
	return nil
}
