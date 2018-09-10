'use strict';

const repl = require('vorpal-repl');
const util = require('util');

const { createValidation, commonValidation } = require('./schema');
const operations = require('./operations');

class DiskCmd {
  /**
   * 
   * @param {Vorpal} vorpal 
   */
  constructor(vorpal, storage) {
    this.vorpal = vorpal;
    this.chalk = vorpal.chalk;
    this.storage = storage;
  }

  commands() {
    this.create();
    this.format();
    this.type();
    this.list();
    this.enter();
  }

  create() {
    this.vorpal
      .command('createdisk <name> <blocksize> <blocks>', 'DISK')
      .action(async (args, cb) => {
        const result = createValidation(args);
        if (result.error) {
          const err = `\nFailed to create disk, try again:\n${util.inspect(result.error.details, false, Infinity)}\n`;
          cb(this.chalk['red'](err));
        }
        try {
          const bytes = this.storage.getAvailableBlock();
          await operations.createDisk(args);
          await operations.persistNewDisk(bytes, result.value);
          console.info(
            this.chalk['green'](`\n[DISK] Virtual disk ${args.name} with size ${args.blocks * args.blocksize} created successfully\n`)
          );
          cb(null);
        } catch (err) {
          cb(this.chalk['red'](err));
        }
      });
  }

  format() {
    this.vorpal
      .command('formatdisk <name>', 'DISK')
      .action(async (args, cb) => {
        const result = commonValidation(args);
        if (result.error) {
          const err = `\nFailed to format disk, try again:\n${util.inspect(result.error.details, false, Infinity)}\n`;
          cb(this.vorpal.chalk['red'](err));
        }

        try {
          const disk = this.storage.mainDisksInfo[result.value.name];
          if (!disk) {
            cb(this.chalk['yellow'](`\nThe disk ${result.value.name} does not exist\n`));
          }

          await operations.formatDisk(disk);
          console.info(this.chalk['green'](`\n[DISK] Virtual disk ${args.name} was formatted\n`));
          cb();
        } catch (err) {
          cb(this.chalk['red'](`\nFailed to format disk ${err}\n`));
        }
      });
  }

  type() {
    this.vorpal
      .command('typedisk <name>', 'DISK')
      .action(async (args, cb) => {
        const result = commonValidation(args);
        if (result.error) {
          const err = `\nFailed to fetch content from the disk, 
            try again:\n${util.inspect(result.error.details, false, Infinity)}\n`;
          cb(this.vorpal.chalk['red'](err));
        }

        try {
          const disk = this.storage.mainDisksInfo[result.value.name];
          if (!disk) {
            cb(this.chalk['yellow'](`\nThe disk ${result.value.name} does not exist\n`));
          }

          const hasContent = await operations.typeDisk(disk, this.chalk['green']);
          if (!hasContent) {
            console.info(this.chalk['green'](`\n[DISK] Virtual disk ${args.name} HAS NO CONTENT\n`));
          }
          cb();
        } catch (err) {
          cb(this.chalk['red'](`\nFailed to format disk ${err}\n`));
        }
        cb();
      });
  }

  list() {
    this.vorpal
      .command('lsdisk', 'DISK')
      .action((args, cb) => {
        console.log(this.chalk['green']('\nAvailable disks: '));
        const disks = Object.keys(this.storage.mainDisksInfo);
        const data = this.storage.mainDisksInfo;
        for (let i = 0; i < disks.length; i++) {
          console.log(this.chalk['blue'](`${disks[i]} - ${data[disks[i]].blocks * data[disks[i]].blocksize} bytes`));
        }
        console.log();
        cb();
      });
  }

  enter() {
    this.vorpal
      .command('enterdisk <name>', 'DISK')
      .delimiter()
      .action((args, cb) => {
        const result = commonValidation(args);
        if (result.error) {
          const err = `\nFailed to enter disk, 
            try again:\n${util.inspect(result.error.details, false, Infinity)}\n`;
          cb(this.vorpal.chalk['red'](err));
        }

        this.vorpal
          .delimiter(`${args.name}> `)
          .use(repl)
          .show(cb);
      });
  }
}

module.exports = DiskCmd;
