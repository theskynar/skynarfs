package filesystem

type VDiskAttributes struct {
	Diskname  string
	Blocks    uint64
	Blocksize uint64
	Size      uint64
	Mode      uint32
}

type VDisk struct {
	attr *VDiskAttributes
}

type VDiskManager struct {
}
