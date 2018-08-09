package main

import (
	"fmt"

	"github.com/theskynar/skynarfs/filesystem"
)

func main() {
	fmt.Printf("Starting filesystem")
	if err := filesystem.CreateVirtualDisk("/tmp/myhd", 2048); err != nil {
		panic(err)
	}
}
