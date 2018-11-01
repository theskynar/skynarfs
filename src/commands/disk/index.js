'use strict';

const util = require('util');
const colors = require('colors');

const { createValidation, commonValidation } = require('./schema');
const operations = require('./operations');
const DiskStorage = require('../../storage/disk-storage');

class DiskCmd {
  /**
   * 
   * @param {Vorpal} vorpal 
   */
  constructor(diskMode, replMode, storage) {
    this.diskMode = diskMode;
    this.replMode = replMode;
    this.storage = storage;
  }

  commands() {
    this.diskMode.command('createhd <name> <blocksize> <blocks>', 'DISK').action(this.create.bind(this));
    this.diskMode.command('formathd <name>', 'DISK').action(this.format.bind(this));
    this.diskMode.command('typehd <name>', 'DISK').action(this.type.bind(this));
    this.diskMode.command('enterhd <name>', 'DISK').action(this.enter.bind(this));
    this.diskMode.command('statushd <name>', 'DISK').action(this.status.bind(this));
    this.diskMode.command('removehd <name>', 'DISK').action(this.remove.bind(this));
    this.diskMode.command('dirhd', 'DISK').action(this.list.bind(this));
  }

  async status({ name }, cb) {
    try {
      const disk = this.storage.mainDisksInfo[name];

      if (!disk) {
        throw new Error(`Disk with name '${name} not exists.'`);
      }

      const blocks = parseInt(disk.blocks);
      const blockSize = parseInt(disk.blocksize);

      const diskStorageInfo = new DiskStorage(name, blocks, blockSize);
      diskStorageInfo.fromBinary();

      const totalSize = blocks * blockSize;
      const availableSize = diskStorageInfo.diskTree.availableBlocks.reduce((curr, item) => {
        const spaceSize = parseInt(item.split(':')[1]) * blockSize;

        return curr + spaceSize;
      }, 0);

      this.diskMode.log(
        colors['cyan'](`[DISK] ${name}\n`)
      );

      this.diskMode.log(
        colors['blue'](`Total size: ${totalSize} Bytes`)
      );

      this.diskMode.log(
        colors['red'](`Used size: ${totalSize - availableSize} Bytes`)
      );

      this.diskMode.log(
        colors['green'](`Available size: ${availableSize} Bytes\n`)
      );

      cb();
    } catch (e) {
      cb(colors['red'](e.message || e));
    }
  }

  async create(args, cb) {
    const result = createValidation(args);

    if (result.error) {
      const err = `\nFailed to create disk, try again:\n${util.inspect(result.error.details, false, Infinity)}\n`;
      cb(colors['red'](err));
    }

    try {
      const bytes = this.storage.getAvailableBlock();
      await operations.createDisk(args);
      await operations.persistNewDisk(bytes, result.value);

      this.storage.currentDisk = new DiskStorage(args.name, args.blocks, args.blocksize);
      this.storage.currentDisk.toBinary();

      this.diskMode.log(
        colors['green'](`\n[DISK] Virtual disk ${args.name} with size ${args.blocks * args.blocksize} created successfully\n`)
      );

      cb(null);
    } catch (err) {
      cb(colors['red'](err));
    }
  }

  async remove({ name }, cb) {
    try {
      await operations.unPersistDisk(name);
      await operations.removeDisk(name);
      await this.storage.synchronizeDisksInfo();

      this.diskMode.log(
        colors['green'](`\n[DISK] Virtual disk ${name} removed successfully\n`)
      );

      cb();
    } catch (err) {
      cb(colors['red'](err));
    }
  }

  async format(args, cb) {
    const result = commonValidation(args);
    if (result.error) {
      const err = `\nFailed to format disk, try again:\n${util.inspect(result.error.details, false, Infinity)}\n`;
      cb(colors['red'](err));
    }

    try {
      const disk = this.storage.mainDisksInfo[result.value.name];
      if (!disk) {
        cb(colors['yellow'](`\nThe disk ${result.value.name} does not exist\n`));
      }

      await operations.formatDisk(disk);
      this.storage.currentDisk = new DiskStorage(disk.name, disk.blocks, disk.blocksize);
      this.storage.currentDisk.toBinary();

      this.diskMode.log(colors['green'](`\n[DISK] Virtual disk ${args.name} was formatted\n`));
      cb();
    } catch (err) {
      cb(colors['red'](`\nFailed to format disk ${err}\n`));
    }
  }

  async type(args, cb) {
    const result = commonValidation(args);
    if (result.error) {
      const err = `\nFailed to fetch content from the disk, 
            try again:\n${util.inspect(result.error.details, false, Infinity)}\n`;
      cb(colors['red'](err));
    }

    try {
      const disk = this.storage.mainDisksInfo[result.value.name];
      if (!disk) {
        cb(colors['yellow'](`\nThe disk ${result.value.name} does not exist\n`));
      }

      const hasContent = await operations.typeDisk(disk, colors['green'], this.diskMode.log.bind(this.diskMode));
      if (!hasContent) {
        this.diskMode.log(colors['green'](`\n[DISK] Virtual disk ${args.name} HAS NO CONTENT\n`));
      }
      cb();
    } catch (err) {
      cb(colors['red'](`\nFailed to read disk ${err}\n`));
    }
  }

  list(args, cb) {
    try {
      const diskNames = Object.keys(this.storage.mainDisksInfo);

      if (diskNames.length > 0) {
        this.diskMode.log(colors['green']('\nAvailable disks: '));

        for (const name of diskNames) {
          const disk = this.storage.mainDisksInfo[name];

          this.diskMode.log(colors['blue'](`${name} - ${disk.blocks * disk.blocksize} bytes`));
        }

        this.diskMode.log('\n');
      }

      cb();
    } catch (err) {
      cb(new Error(colors.red(`Listing errors: ${err}`)));
    }
  }

  async enter(args, cb) {
    try {
      const result = commonValidation(args);
      if (result.error) {
        const err = `\nFailed to enter disk, 
              try again:\n${util.inspect(result.error.details, false, Infinity)}\n`;
        cb(colors['red'](err));
        return;
      }

      const disk = this.storage.mainDisksInfo[args.name];
      if (!disk) {
        cb(colors['red']('Disk was not found'));
        return;
      }

      this.storage.currentDisk = new DiskStorage(args.name, disk.blocks, disk.blocksize);
      this.storage.currentDisk.fromBinary();

      this.diskMode.hide();
      this.replMode.delimiter(`$skynarfs:${args.name}> `).show();
    } catch (err) {
      cb(new Error(colors.red(`Entering disk errors: ${err}`)));
    }
  }
}

module.exports = DiskCmd;
