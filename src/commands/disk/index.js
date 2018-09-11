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
    this.diskMode.command('createdisk <name> <blocksize> <blocks>', 'DISK').action(this.create.bind(this));
    this.diskMode.command('formatdisk <name>', 'DISK').action(this.format.bind(this));
    this.diskMode.command('typedisk <name>', 'DISK').action(this.type.bind(this));
    this.diskMode.command('enterdisk <name>', 'DISK').action(this.enter.bind(this));
    this.diskMode.command('lsdisk', 'DISK').action(this.list.bind(this));
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

      this.storage.currentDisk = new DiskStorage(args.name);
      this.storage.currentDisk.toBinary();

      console.info(
        colors['green'](`\n[DISK] Virtual disk ${args.name} with size ${args.blocks * args.blocksize} created successfully\n`)
      );

      cb(null);
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
      console.info(colors['green'](`\n[DISK] Virtual disk ${args.name} was formatted\n`));
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

      const hasContent = await operations.typeDisk(disk, colors['green']);
      if (!hasContent) {
        console.info(colors['green'](`\n[DISK] Virtual disk ${args.name} HAS NO CONTENT\n`));
      }
      cb();
    } catch (err) {
      cb(colors['red'](`\nFailed to format disk ${err}\n`));
    }
  }

  list(args, cb) {
    try {
      console.log(colors['green']('\nAvailable disks: '));
      const disks = Object.keys(this.storage.mainDisksInfo);
      const data = this.storage.mainDisksInfo;
      for (let i = 0; i < disks.length; i++) {
        console.log(colors['blue'](`${disks[i]} - ${data[disks[i]].blocks * data[disks[i]].blocksize} bytes`));
      }
      console.log();
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
      }

      const disk = this.storage.mainDisksInfo[args.name];
      if (!disk) {
        cb(colors['red']('Disk was not found'));
        return;
      }

      this.storage.currentDisk = new DiskStorage(args.name, disk.blocks, disk.blocksize);
      this.storage.currentDisk.fromBinary();

      this.replMode.delimiter(`$skynarfs:${args.name}> `).show();
    } catch (err) {
      cb(new Error(colors.red(`Entering disk errors: ${err}`)));
    }
  }
}

module.exports = DiskCmd;
