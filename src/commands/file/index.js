'use strict';

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
    this.replCmd.command('rm <name>', 'DIR').option('-r, --recursive', 'Remove recursive').action(this.remove.bind(this));
    this.replCmd.command('ls', 'DIr').action(this.listFolder.bind(this));
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

  async remove({ name, options }, cb) {
    const success = this.storage.currentDisk.remove(name, options.recursive);

    if (success) {
      cb();
    } else {
      cb(`Cannot remove file or directory '${name}'. Try to use --recursive.`);
    }
  }

  async listFolder(args, cb) {
    try {
      const folders = this.storage.currentDisk.availableFolders.map(x => x.name + '/').join('\n');
      const files = this.storage.currentDisk.availableFiles.map(x => x.name).join('\n');

      console.log([folders, files].join('\n'));
      cb();
    } catch (e) {
      cb(e);
    }
  }

  async createFile({ file }, cb) {
    const currDisk = this.storage.currentDisk;
    const diskInfo = this.storage.mainDisksInfo[currDisk.name];
    if (!diskInfo) {
      cb(new Error(`Disk ${currDisk.name} was not found`));
    }

    const stats = await operations.fileStats(file);
    const blockCount = Math.ceil(stats.size / diskInfo.blocks);
    const blockIndex = currDisk.nextAvailableBlock(blockCount);

    await operations.persistFile(file, diskInfo, blockIndex);
    cb();
  }
}

module.exports = FileCmd;
