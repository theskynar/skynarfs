'use strict';

const repl = require('vorpal-repl');
const util = require('util');

// const { createValidation, commonValidation } = require('./schema');
const operations = require('./operations');

class FileCmd {
  /**
   * 
   * @param {Vorpal} vorpal 
   */
  constructor(diskCmd, replCmd, storage) {
    this.diskCMd = diskCmd;
    this.replCmd = replCmd;
    this.chalk = diskCmd.chalk;
    this.storage = storage;
  }

  commands() {
    this.replCmd.command('cd <dirname>', 'DIR').action(this.enterDir.bind(this));
    this.replCmd.command('mkdir <dirname>', 'DIR').action(this.createDir.bind(this));
    this.replCmd.command('createfile <file>', 'FILE').action(this.createFile.bind(this));
  }

  async enterDir({ dirname }, cb) {
    const success = this.storage.currentDisk.navigateTo(dirname);

    if (success) {
      this.replCmd.delimiter(`$skynarfs:${this.storage.currentDisk.name}:${this.storage.currentDisk.path}> `).show();
      cb();
    } else {
      cb(`Not such a file or directory '${dirname}'.`);
    }
  }

  async createDir({ dirname }, cb) {
    const success = this.storage.currentDisk.insertFolder(dirname);

    if (success) {
      cb();
    } else {
      cb(`Directory '${dirname}' already exists.`);
    }
  }

  async createFile({ file }, cb) {
    const currDisk = this.storage.currentDisk;
    console.log(this.storage.mainDisksInfo, currDisk.name);
    const diskInfo = this.storage.mainDisksInfo[currDisk.name];
    if (!diskInfo) {
      cb(new Error(`Disk ${currDisk.name} was not found`));
    }

    const stats = await operations.fileStats(file);
    const blockCount = Math.ceil(stats.size / diskInfo.blocks);
    const blockIndex = currDisk.nextAvailableBlock(blockCount);

    await operations.persistFile(file, stats, diskInfo);
    cb();
    // if (success) {
    //   cb();
    // } else {
    //   cb(`Directory '${file}' already exists.`);
    // }
  }
}

module.exports = FileCmd;
