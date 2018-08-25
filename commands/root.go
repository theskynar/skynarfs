package commands

import (
	"github.com/pkg/errors"
	"github.com/spf13/cobra"
)

var cfgFile string

var RootCmd = &cobra.Command{
	Use:   "skynarfs",
	Short: "Skynar filesystem CLI",
	Long:  "This CLI application manages a whole filesystem in a virtual disk",
}

func Execute() error {
	if err := RootCmd.Execute(); err != nil {
		return errors.Wrap(err, "Failed to execute command")
	}
	return nil
}

func init() {
	RootCmd.Flags().BoolP("toggle", "t", false, "Help message for toggle")
}
