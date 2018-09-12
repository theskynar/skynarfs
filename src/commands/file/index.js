'use strict';

const operations = require('./operations');
const colors = require('colors');

class FileCmd {
  /**
   * 
   * @param {Vorpal} vorpal 
   */
  constructor(diskCmd, replCmd, storage) {
    this.diskCmd = diskCmd;
    this.replCmd = replCmd;
    this.chalk = diskCmd.chalk;
    this.storage = storage;
  }

  commands() {
    // Navigate to directory
    this.replCmd.command('cd <dirname>', 'DIR')
      .autocomplete({ data: () => this.storage.currentDisk.availableFolders.map((x) => x.name) })
      .action(this.enterDir.bind(this));

    // Create directory
    this.replCmd.command('createdir <dirname>', 'DIR').action(this.createDir.bind(this));

    // Remove file or folder
    this.replCmd.command('remove <name>', 'DIR')
      .option('-r, --recursive', 'Remove recursive')
      .autocomplete({
        data: () => [
          ...this.storage.currentDisk.availableFolders.map((x) => x.name),
          ...this.storage.currentDisk.availableFiles.map((x) => x.name)
        ]
      })
      .action(this.remove.bind(this));

    // List folders and files
    this.replCmd.command('dir [dirname]', 'DIR')
      .autocomplete({ data: () => this.storage.currentDisk.availableFolders.map((x) => x.name) })
      .action(this.listFolder.bind(this));

    // Create file
    this.replCmd.command('createfile <file>', 'FILE').action(this.createFile.bind(this));

    // Fetch file content
    this.replCmd.command('type <file>', 'FILE')
      .autocomplete({
        data: () => [
          ...this.storage.currentDisk.availableFiles.map((x) => x.name)
        ]
      })
      .action(this.typeFile.bind(this));

    this.replCmd.command('exit').remove();
    this.replCmd.command('exit [f]', 'CLI').action(this.exit.bind(this));
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

      const folders = curDisk.availableFolders.map((x) => x.name + '/').join('\n');
      const files = curDisk.availableFiles.map((x) => x.name).join('\n');

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
    try {
      const filePath = file.split('/');
      const fileName = filePath[filePath.length - 1];
      const currDisk = this.storage.currentDisk;
      const diskInfo = this.storage.mainDisksInfo[currDisk.name];
      if (!diskInfo) {
        cb(new Error(`Disk ${currDisk.name} was not found`));
      }

      const stats = await operations.fileStats(file);
      const blockCount = Math.ceil(stats.size / diskInfo.blocksize);
      const blockIndex = currDisk.nextAvailableBlock(blockCount);

      await operations.persistFile(file, diskInfo, blockIndex, blockCount);

      currDisk.insertFile(fileName, blockIndex, blockCount);
      cb();
    } catch (e) {
      cb(e);
    }
  }

  async typeFile({ file }, cb) {
    try {
      if (!file) {
        cb(colors['red'](`\nThe file ${file} does not exist\n`));
        return;
      }
      const diskStorage = this.storage.currentDisk;
      console.log(diskStorage);
      const disk = this.storage.mainDisksInfo[diskStorage.name];
      console.log(disk);
      if (!disk) {
        cb(colors['red'](`\nThe disk ${disk.name} does not exist\n`));
        return;
      }
      const fileNode = this.storage.currentDisk.getByName(file);

      if (fileNode.length == 0) {
        cb(colors['red'](`\nThe file ${file} was not persist properly or it is corrupted\n`));
        return;
      }

      const hasContent = await operations.typeFile(disk, fileNode[0].blockIndex, fileNode[0].blockCount);
      if (!hasContent) {
        console.info(colors['green'](`\n[DISK] FILE ${file} HAS NO CONTENT\n`));
      }
      cb();
    } catch (err) {
      cb(colors['red'](`\nFailed to type file ${err.message}\n${err.stack}`));
    }
  }

  exit(args, cb) {
    if (args.options.f) {
      cb();
      process.kill(process.pid, 'SIGINT');
      return;
    }

    this.diskCmd.delimiter('$skynarfs ').show();
  }
}

module.exports = FileCmd;
