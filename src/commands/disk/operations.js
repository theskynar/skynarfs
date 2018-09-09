'use strict';

const fs = require('fs-extra');


/**
 * Persist every created and manipulated disk on the filesystem
 * @param {DiskOptions} opts { name, blocksize, blocks }
 */
async function persistDisk(opts) {

  const data = await fs.open('tmp/main');
  console.log(data);
  const buff = Buffer.alloc(512);
  let start = 0, end = 512;
  for (let i = 0; i < 1000; i++) {
    const bytes = fs.read(data.fd, buff, 0, start, end);
    start = end + 1;
    end += 512;

    console.log(bytes);
  }
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
  createDisk
};