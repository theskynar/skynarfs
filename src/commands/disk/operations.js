'use strict';

const fs = require('fs-extra');

/**
 * Persist every created and manipulated disk on the filesystem
 * @param {DiskOptions} opts { name, blocksize, blocks }
 */
async function persistNewDisk(block, opts) {
  console.log('>>>>>>', block, opts);
  const fd = await fs.open('tmp/main', 'r+');
  const buff = Buffer.alloc(512);
  const content = JSON.stringify(opts);
  buff.write(content, 0, 'binary');
  await fs.write(fd, buff, 0, buff.byteOffset, block * 512);
  const bytes2 = await fs.read(fd, buff, block * 512, 512);

  console.log('BYTES: >>>>', bytes2);
}

/**
 * Create a virtual disk, providing name, quantity of blocks and block size in bytes
 * @param {DiskOptions} opts { name, blocksize, blocks }
 */
async function createDisk(opts) {
  const size = opts.blocksize * opts.blocks;
  const buffer = new Buffer(size);
  const exists = await fs.exists(`tmp/disks/${opts.name}`);
  if (exists) {
    throw new Error(`Virtual Disk with name ${opts.name} already exists`);
  }

  await fs.writeFile(`tmp/disks/${opts.name}`, buffer, { encoding: 'binary' });
}


module.exports = {
  createDisk,
  persistNewDisk
};