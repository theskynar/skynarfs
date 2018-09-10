'use strict';

const fs = require('fs-extra');

/**
 * Persist every created and manipulated disk on the filesystem
 * @param {DiskOptions} opts { name, blocksize, blocks }
 */
async function persistNewDisk(block, opts) {
  const fd = await fs.open('tmp/main', 'r+');

  const name = Buffer.alloc(20, 0, 'binary');
  name.write(opts.name, 0, 'binary');

  const blocks = Buffer.alloc(20, 0, 'binary');
  blocks.write(opts.blocks.toString(), 0);

  const blocksize = Buffer.alloc(20, 0, 'binary');
  blocksize.write(opts.blocksize.toString(), 0);

  let pos = 0;
  if (block === 1) {
    pos = 0;
  } else {
    pos = block * 128 - 127;
  }

  await fs.write(fd, name, 0, name.byteLength, pos);
  await fs.write(fd, blocks, 0, blocks.byteLength, pos + 20);
  await fs.write(fd, blocksize, 0, blocksize.byteLength, pos + 40);
}

/**
 * Create a virtual disk, providing name, quantity of blocks and block size in bytes
 * @param {DiskOptions} opts { name, blocksize, blocks }
 */
async function createDisk(opts) {
  const path = `tmp/disks/${opts.name}`;
  const size = opts.blocksize * opts.blocks;
  const buffer = new Buffer(size);
  const exists = await fs.exists(path);
  if (exists) {
    throw new Error(`Virtual Disk with name ${opts.name} already exists`);
  }

  // Create disk dir
  await fs.mkdirp(path);

  // Create disk files
  await Promise.all([
    fs.writeFile(`${path}/disk`, buffer, { encoding: 'binary' }),
    fs.writeFile(`${path}/address`, { encoding: 'binary' })
  ]);
}


async function formatDisk(opts) {
  const path = `tmp/disks/${opts.name}`;
  const size = parseInt(opts.blocksize) * parseInt(opts.blocks);
  const buffer = new Buffer(size);
  const exists = await fs.exists(path);
  if (!exists) {
    throw new Error(`Virtual Disk with name ${opts.name} could not be found`);
  }

  // Create disk files
  await Promise.all([
    fs.writeFile(`${path}/disk`, buffer, { encoding: 'binary' }),
    fs.writeFile(`${path}/address`, { encoding: 'binary' })
  ]);
}

async function typeDisk(opts, color) {
  opts.blocksize = parseInt(opts.blocksize);
  opts.blocks = parseInt(opts.blocks);

  const path = `tmp/disks/${opts.name}`;
  const exists = await fs.exists(path);
  if (!exists) {
    throw new Error(`Virtual Disk with name ${opts.name} could not be found`);
  }

  console.log(color(`\nReading the virtual disk ${opts.name}...\n`));

  const fd = await fs.open(`${path}/disk`, 'r');
  let hasContent = false;
  for (let i = 0; i < opts.blocks; i++) {
    const read = await fs.read(fd, Buffer.alloc(opts.blocksize), 0, opts.blocksize, i * opts.blocksize);
    for (let j = 0; j < opts.blocksize; j++) {
      if (read.buffer[j] != 0) {
        hasContent = true;
        console.log(color(`Block ${i + 1} - Position ${j} - Code ${read.buffer[j].toString(2)} - Content ${String.fromCharCode(read.buffer[j])}`));
      }
    }
  }
  console.log();

  return hasContent;
}

module.exports = {
  createDisk,
  formatDisk,
  typeDisk,
  persistNewDisk
};