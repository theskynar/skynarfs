'use strict';

const EventEmitter = require('events');
const fs = require('fs-extra');
const path = require('path');

/**
 * @class Storage
 * @extends {EventEmitter}
 */
class Storage extends EventEmitter {
  constructor() {
    super();

    this.mainAvailableBlocks = new Array(1000).fill(0);
    this.mainDisksInfo = {};
    this.diskNames = [];

    this.currentDisk = null;
  }

  async init() {
    // Initialize main disk files
    try {
      const dirPath = path.join(__dirname, '../../tmp/disks');
      const mainPath = path.join(__dirname, '../../tmp/main');
      fs.mkdirpSync(dirPath);
      const exists = fs.existsSync(mainPath);
      if (!exists) {
        const buffer = Buffer.alloc(1000 * 128);
        fs.writeFileSync(mainPath, buffer, { encoding: 'binary' });
      }

      await this.synchronizeDisksInfo();
    } catch (err) {
      console.error('[MAIN] Failed to create main disk file', err);
    }

    this.intervalId = setInterval(async () => {
      await this.synchronizeDisksInfo();
    }, 5000);
  }


  /**
   * Fetch the next available block in the disk
   * @returns {Object} {start, end}
   * @memberof Storage
   */
  getAvailableBlock() {
    for (let i = 0; i < 1000; i++) {
      if (this.mainAvailableBlocks[i] == 1) {
        return i + 1;
      }
    }
    throw new Error('Unable to allocate new disk, you ran out of space');
  }


  /**
   * Synchronize all disks information into memory
   * @memberof Storage
   */
  async synchronizeDisksInfo() {
    try {
      this.mainDisksInfo = {};

      const mainPath = path.join(__dirname, '../../tmp/main');
      const fd = await fs.open(mainPath, 'r');
      for (let i = 0; i <= 10; i++) {
        const read = await fs.read(fd, Buffer.alloc(128), 0, 128, i * 128);
        const disk = { name: '', blocksize: '', blocks: '', available: 0, used: 0 };
        let blockAval = 1;
        for (let j = 0; j < 20; j++) {
          if (read.buffer[j] != 0) {
            disk.name += String.fromCharCode(read.buffer[j]);
            blockAval = 0;
          }
        }
        for (let j = 20; j < 40; j++) {
          if (read.buffer[j] != 0) {
            disk.blocks += String.fromCharCode(read.buffer[j]);
            blockAval = 0;
          }
        }
        for (let j = 40; j < 60; j++) {
          if (read.buffer[j] != 0) {
            disk.blocksize += String.fromCharCode(read.buffer[j]);
            blockAval = 0;
          }
        }
        this.mainAvailableBlocks[i] = blockAval;
        if (disk.name) {
          this.mainDisksInfo[disk.name] = disk;
        }
      }

      await fs.close(fd);
    } catch (err) {
      console.error('[MAIN] Failed to synchronize disks information', err);
    }
  }


  /**
   * Stop nodejs interval timer
   * @memberof Storage
   */
  stop() {
    clearInterval(this.intervalId);
  }
}

module.exports = Storage;