'use strict';

const EventEmitter = require('events');
const fs = require('fs-extra');



/**
 * @class Storage
 * @extends {EventEmitter}
 */
class Storage extends EventEmitter {
  constructor() {
    super();

    this.mainAvailableBlocks = [];
    for (let i = 1; i <= 1000; i++) {
      this.mainAvailableBlocks.push(i);
    }

    this.mainDisksInfo = {};
  }

  init() {
    // Initialize main disk files
    try {
      fs.mkdirpSync('tmp/disks');
      const exists = fs.existsSync('tmp/main');
      if (!exists) {
        const buffer = new Buffer(1000 * 512);
        fs.writeFileSync('tmp/main', buffer, { encoding: 'binary' });
      }
    } catch (err) {
      console.error('[MAIN ]Failed to create main disk file', err);
    }

    this.intervalId = setInterval(async () => {
      await this.synchronizeDisksInfo();
    }, 2000);
  }


  /**
   * Fetch the next available block in the disk
   * @returns {Object} {start, end}
   * @memberof Storage
   */
  getAvailableBlock() {
    const block = this.mainAvailableBlocks.shift();
    const bytes = parseInt(block) * 512;
    return block;
  }


  /**
   * Synchronize all disks information into memory
   * @memberof Storage
   */
  async synchronizeDisksInfo() {
    try {
      const out = await fs.readFile('tmp/main', { flags: 'r', encoding: 'utf8' });
      if (out.trim()) {
        // console.info('[MAIN] Disks', out);
      }
    } catch (err) {
      console.error('[MAIN] Failed to synchronize disks information');
    }
  }

  stop() {
    clearInterval(this.intervalId);
  }
}

module.exports = Storage;