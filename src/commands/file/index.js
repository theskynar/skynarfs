'use strict';

const operations = require('./operations');
const colors = require('colors');
const child_process = require('child_process');
const path = require('path');
const fs = require('fs');

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

    // Import file
    this.replCmd.command('importfile <file>', 'FILE').action(this.importFile.bind(this));

    this.replCmd.command('create <file>', 'FILE').action(this.createFile.bind(this));

    // Fetch file content
    this.replCmd.command('type <file>', 'FILE')
      .autocomplete({
        data: () => [
          ...this.storage.currentDisk.availableFiles.map((x) => x.name)
        ]
      })
      .action(this.typeFile.bind(this));

    // Move file/folder
    this.replCmd.command('mv <source> <dist>', 'FILE/DIR').action(this.move.bind(this));

    // Move file/folder
    this.replCmd.command('rename <name> <newName>', 'FILE/DIR').action(this.rename.bind(this));

    // Export file
    this.replCmd.command('export <file> <outFile>', 'FILE').action(this.exportFile.bind(this));

    // Copy
    this.replCmd.command('copy <source> <dist>', 'FILE').action(this.copy.bind(this));

    // Status of available blocks
    this.replCmd.command('status', 'STATUS').action(this.statusBlocks.bind(this));

    this.replCmd.command('exitdisk', 'CLI')
  }

  async exportFile({ file, outFile }, cb) {
    try {
      const fileInfo = this.storage.currentDisk.getByName(file);

      if (!fileInfo && fileInfo.type !== 'FILE') {
        throw new Error('Cannot find file.');
      }

      const { blockSize, name } = this.storage.currentDisk;
      await operations.exportFile(name, outFile, fileInfo.blockIndex, fileInfo.blockCount, blockSize);
    } catch (e) {
      cb(e);
    }
  }

  async statusBlocks({}, cb) {
    try {
      this.replCmd.log(colors.cyan(`\nAvailable Blocks:`));
      
      for (let avBlock of this.storage.currentDisk.diskTree.availableBlocks) {
        const [index, size] = avBlock.split(':'); 
        this.replCmd.log(colors.green(`In index ${index} has ${size} blocks availables`));
      }

      const tmpPath = path.join(__dirname, '../../../tmp/diskthree.json');
      fs.writeFileSync(tmpPath, JSON.stringify(this.storage.currentDisk.diskTree), {encoding: 'utf-8'});

      cb();
    } catch (e) {
      cb(e);
    }
  }

  async enterDir({ dirname }, cb) {
    const success = this.storage.currentDisk.navigateTo(dirname);

    if (success) {
      this.diskCmd.hide();
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

  async rename({ name, newName }, cb) {
    try {
      this.storage.currentDisk.renameNode(name, newName);

      cb();
    } catch(e) {
      cb(e);
    }
  }

  async move({ source, dist }, cb) {
    try {
      this.storage.currentDisk.move(source, dist);
      cb();
    } catch (e) {
      cb(e);
    }
  }

  async copy({ source, dist }, cb) {
    try {
      const currDisk = this.storage.currentDisk;
      const diskInfo = this.storage.mainDisksInfo[currDisk.name];

      const onCopyFile = async (blockIndex, blockCount, originBlockIndex) => {
        await operations.copyFile(diskInfo, originBlockIndex, blockIndex, blockCount);
      };

      await this.storage.currentDisk.copy(source, dist, onCopyFile);
      this.storage.currentDisk.toBinary();
      cb();
    } catch (e) {
      cb(e);
    }
  }

  async copyFolder({ source, dist }) {

  }

  async copyFile({ source, dist }) {
    const currDisk = this.storage.currentDisk;
    const diskInfo = this.storage.mainDisksInfo[currDisk.name];
  }

  async remove({ name, options }, cb) {
    const itemRemoved = this.storage.currentDisk.remove(name, options.recursive);

    if (itemRemoved) {
      const currDisk = this.storage.currentDisk;
      const diskInfo = this.storage.mainDisksInfo[currDisk.name];
      operations.removeFile(diskInfo, itemRemoved.blockIndex, itemRemoved.blockCount);

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

      this.replCmd.log([folders, files].filter(x => !!x).join('\n'));
      cb();
    } catch (e) {
      cb(e);
    }
  }

  async importFile({ file }, cb) {
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

      await operations.importFile(file, diskInfo, blockIndex, blockCount);

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
      const disk = this.storage.mainDisksInfo[diskStorage.name];
      if (!disk) {
        cb(colors['red'](`\nThe disk ${disk.name} does not exist\n`));
        return;
      }
      const fileNode = this.storage.currentDisk.getByName(file);

      if (!fileNode) {
        cb(colors['red'](`\nThe file ${file} was not persist properly or it is corrupted\n`));
        return;
      }

      const hasContent = await operations.typeFile(disk, fileNode.blockIndex, fileNode.blockCount, this.replCmd.log.bind(this.replCmd));
      if (!hasContent) {
        this.replCmd.log(colors['green'](`\n[DISK] FILE ${file} HAS NO CONTENT\n`));
      }
      cb();
    } catch (err) {
      cb(colors['red'](`\nFailed to type file ${err.message}\n${err.stack}`));
    }
  }

  createFile({ file }, cb) {
    try {
      // VALIDAR SIZE FILE
      if (file.length > 15) {
        cb(colors.red('File name must have at maximum 15 characters'));
        return;
      }

      const currDisk = this.storage.currentDisk;
      const diskInfo = this.storage.mainDisksInfo[currDisk.name];

      if (!diskInfo) {
        cb(colors.red(`Disk ${currDisk.name} was not found`));
        return;
      }

      this.diskCmd.hide();
      this.replCmd.hide();

      const tempPath = path.join(__dirname, '../../../tmp/create-file.txt');

      const editor = child_process.spawn('vim', [tempPath], {
          stdio: 'inherit'
      });

      editor.on('exit', async () => {
        this.replCmd.show();
        const str = fs.readFileSync(tempPath, { encoding: 'utf-8' });

        console.log(colors.yellow('\nGOT Ctrl-Z Signal'));
        console.log(colors.blue('\nWriting bytes...'));
        const buffer = Buffer.from(str, 'ascii');
        const blockCount = Math.ceil(buffer.length / diskInfo.blocksize);
        const blockIndex = currDisk.nextAvailableBlock(blockCount);
  
        await operations.persistFile(buffer, diskInfo, blockIndex, blockCount);
        currDisk.insertFile(file, blockIndex, blockCount);
        fs.unlinkSync(tempPath);
        
        this.replCmd.show();
        this.replCmd.log(colors.green(`\nCreated the file ${file} with content:\n${str}`));
        cb();
      });
    } catch (e) {
      cb(e);
    }
  }

  exit(args, cb) {
    if (args.options.f) {
      cb();
      process.kill(process.pid, 'SIGINT');
      return;
    }

    this.replCmd.hide();
    this.diskCmd.delimiter('$skynarfs ').show();
  }
}

module.exports = FileCmd;
