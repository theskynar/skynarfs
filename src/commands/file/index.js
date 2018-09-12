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
    // Navigate to directory
    this.replCmd.command('cd <dirname>', 'DIR')
      .autocomplete({ data: () => this.storage.currentDisk.availableFolders.map(x => x.name) })
      .action(this.enterDir.bind(this));

    // Create directory
    this.replCmd.command('createdir <dirname>', 'DIR').action(this.createDir.bind(this));

    // Remove file or folder
    this.replCmd.command('remove <name>', 'DIR')
      .option('-r, --recursive', 'Remove recursive')
      .autocomplete({data: () => [
        ...this.storage.currentDisk.availableFolders.map(x => x.name),
        ...this.storage.currentDisk.availableFiles.map(x => x.name)
      ]})
      .action(this.remove.bind(this));

    // List folders and files
    this.replCmd.command('dir [dirname]', 'DIR')
      .autocomplete({ data: () => this.storage.currentDisk.availableFolders.map(x => x.name) })  
      .action(this.listFolder.bind(this));

    // Create file
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

  async remove({name, options}, cb) {
    const success = this.storage.currentDisk.remove(name, options.recursive);

    if (success) {
      cb();
    } else {
      cb(`Cannot remove file or directory '${name}'. Try to use --recursive.`);
    }
  }

  async listFolder({ dirname }, cb) {
    try {
      const curDisk = this.storage.currentDisk;
      const originalNavStack = [...curDisk.navigationStack];
      
      if (dirname) {
        const navigationSuccess = curDisk.navigateTo(dirname);

        if (!navigationSuccess) {
          throw new Error(`Cannot such directory '${dirname}'`);
        }
      }

      const folders = curDisk.availableFolders.map(x => x.name + '/').join('\n');
      const files = curDisk.availableFiles.map(x => x.name).join('\n');

      if (dirname) {
        curDisk.navigationStack = originalNavStack;
      }

      console.log([folders, files].join('\n'));
      cb();
    } catch (e) {
      cb(e);
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
