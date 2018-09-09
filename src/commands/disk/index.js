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
          console.info(`[DISK] Virtual disk ${args.name} with size ${args.blocks * args.blocksize} created successfully\n`);
          cb(null);
        } catch (err) {
          console.log('>>>>>>>', err);
          cb(this.chalk['red'](err));
        }
      });
  }

  format() {
    this.vorpal
      .command('formatdisk <name>', 'DISK')
      .action((args, cb) => {
        const result = commonValidation(args);
        if (result.error) {
          const err = `\nFailed to format disk, try again:\n${util.inspect(result.error.details, false, Infinity)}\n`;
          cb(this.vorpal.chalk['red'](err));
        }
        cb();
      });
  }

  type() {
    this.vorpal
      .command('typedisk <name>', 'DISK')
      .action((args, cb) => {
        const result = commonValidation(args);
        if (result.error) {
          const err = `\nFailed to fetch content from the disk, 
            try again:\n${util.inspect(result.error.details, false, Infinity)}\n`;
          cb(this.vorpal.chalk['red'](err));
        }
        cb();
      });
  }

  list() {
    this.vorpal
      .command('lsdisk', 'DISK')
      .action((args, cb) => {
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
