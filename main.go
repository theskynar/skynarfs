package main

import (
	"github.com/theskynar/skynarfs/commands"
	"github.com/theskynar/skynarfs/config"
)

func init() {
	if err := config.Validate(); err != nil {
		panic(err)
	}
}

func main() {
	if err := commands.Execute(); err != nil {
		panic(err)
	}
}
