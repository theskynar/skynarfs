package commands

import (
	"fmt"
	"os"

	"github.com/spf13/cobra"
	"github.com/theskynar/skynarfs/filesystem"
)

var path string

func init() {
	path = os.Getenv("WORKSPACE")

	cmdCreateDisk := create()
	RootCmd.AddCommand(cmdCreateDisk)

	cmdFormatDisk := format()
	RootCmd.AddCommand(cmdFormatDisk)

	cmdlsVDisk := lsVDisks()
	RootCmd.AddCommand(cmdlsVDisk)

	cmdCatDisk := catDisk()
	RootCmd.AddCommand(cmdCatDisk)
}

func create() *cobra.Command {
	vDisk := filesystem.VDiskAttributes{}

	cmdCreateDisk := &cobra.Command{
		Use:   "createdisk --name <diskname> --block <qtdblocks> --blocksize <sizeofeachblock>",
		Short: "Create a virtual disk",
		Long:  "Create a virtual disk providing name, blocks and blocksize",
		Run: func(cmd *cobra.Command, Args []string) {
			fmt.Printf("Executing createdisk command...")

			vDisk.Diskname = fmt.Sprintf("%s/%s", path, vDisk.Diskname)
			if err := filesystem.CreateVirtualDisk(&vDisk); err != nil {
				fmt.Println("Error: ", err)
				os.Exit(1)
			}

			fmt.Printf("Executing createdisk command... %s", vDisk.Diskname)
		},
	}

	cmdCreateDisk.PersistentFlags().StringVar(&vDisk.Diskname, "diskname", "", "The name of the desired disk")
	cmdCreateDisk.PersistentFlags().Uint64Var(&vDisk.Blocks, "blocks", 1000, "The quantity of blocks")
	cmdCreateDisk.PersistentFlags().Uint64Var(&vDisk.Blocksize, "blocksize", 32, "Defines maximum size in bytes of a disk block")
	cmdCreateDisk.MarkPersistentFlagRequired("diskname")

	return cmdCreateDisk
}

func format() *cobra.Command {
	var diskname string

	cmdFormatDisk := &cobra.Command{
		Use:   "formatdisk [name]",
		Short: "Format a virtual disk",
		Long:  "Format a virtual disk by providing its name",
		Args:  cobra.NoArgs,
		Run: func(cmd *cobra.Command, Args []string) {
			fmt.Printf("Executing formatdisk command...")
		},
	}

	cmdFormatDisk.PersistentFlags().StringVar(&diskname, "diskname", "", "The name of the desired disk")
	cmdFormatDisk.MarkPersistentFlagRequired("diskname")

	return cmdFormatDisk
}

func catDisk() *cobra.Command {
	var diskname string

	cmdDisplayContent := &cobra.Command{
		Use:   "catdisk [name]",
		Short: "Display virtual disk content",
		Long:  "Display virtual disk content by its providing name",
		Args:  cobra.NoArgs,
		Run: func(cmd *cobra.Command, Args []string) {
			fmt.Printf("Executing catdisk command...")
		},
	}

	cmdDisplayContent.PersistentFlags().StringVar(&diskname, "diskname", "", "The name of the desired disk")
	cmdDisplayContent.MarkPersistentFlagRequired("diskname")

	return cmdDisplayContent
}

func lsVDisks() *cobra.Command {
	cmdlsVDisk := &cobra.Command{
		Use:   "lsvd",
		Short: "List all the available virtual disks",
		Long:  "List all the available virtual disks containing in depth information",
		Args:  cobra.NoArgs,
		Run: func(cmd *cobra.Command, Args []string) {
			fmt.Printf("Executing lsvd command...")
		},
	}

	return cmdlsVDisk
}
