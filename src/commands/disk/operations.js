'use strict';

const fs = require('fs-extra');
const path = require('path');

/**
 * Persist every created and manipulated disk on the filesystem
 * 
 * @param {number} block
 * @param {DiskOptions} opts { name, blocksize, blocks }
 */
async function persistNewDisk(block, opts) {
  const filePath = path.join(__dirname, '../../../tmp/main')
  const fd = await fs.open(filePath, 'r+');

  const name = Buffer.alloc(20, 0, 'binary');
  name.write(opts.name.replace(/\W/g, ''), 0, 'binary');

  const blocks = Buffer.alloc(20, 0, 'binary');
  blocks.write(opts.blocks.toString(), 0);

  const blocksize = Buffer.alloc(20, 0, 'binary');
  blocksize.write(opts.blocksize.toString(), 0);

  let pos = (block - 1) * 128;

  await fs.write(fd, name, 0, name.byteLength, pos);
  await fs.write(fd, blocks, 0, blocks.byteLength, pos + 20);
  await fs.write(fd, blocksize, 0, blocksize.byteLength, pos + 40);
}

/**
 * Remove disk from main file.
 *
 * @param {*} name Name of disk to remove of main.
 */
async function unPersistDisk(name) {
  const filePath = path.join(__dirname, '../../../tmp/main')
  let file = fs.readFileSync(filePath, { encoding: 'utf-8' });
  let index = 0;
  let diskName = file.substr(index, 20).replace(/\W/g, '');

  while (index < file.length && diskName !== name) {
    index += 128;
    diskName = file.substr(index, 20).replace(/\W/g, '');
  }  

  if (!diskName) {
    throw new Error(`Cannot find informations of disk with name '${name}'`);
  }

  const buff = Buffer.from(file, 'utf-8');
  const tmpBuff = Buffer.alloc(128, 0 , 'binary');
  buff.write(tmpBuff.toString(), index, tmpBuff.length);

  fs.writeFileSync(filePath, buff.toString(), 'binary');
}

/**
 * Create a virtual disk, providing name, quantity of blocks and block size in bytes
 * @param {DiskOptions} opts { name, blocksize, blocks }
 */
async function createDisk(opts) {
  const filePath = path.join(__dirname, `../../../tmp/disks/${opts.name}`);
  const size = opts.blocksize * opts.blocks;
  const buffer = Buffer.alloc(size);
  const exists = await fs.exists(filePath);

  if (exists) {
    throw new Error(`Virtual Disk with name ${opts.name} already exists`);
  }

  // Create disk dir
  await fs.mkdirp(filePath);

  // Create disk files
  await Promise.all([
    fs.writeFile(`${filePath}/disk`, buffer, { encoding: 'binary' })
  ]);
}

/**
 * Remove virtual disk.
 *
 * @param {*} name Name of disk to remove.
 */
async function removeDisk(name) {
  const filePath = path.join(__dirname, `../../../tmp/disks/${name}`);
  const exists = await fs.exists(filePath);

  if (!exists) {
    throw new Error(`Virtual Disk with name ${name} not exists`);
  }

  fs.unlinkSync(`${filePath}/disk`);
  fs.rmdirSync(filePath);
}

async function formatDisk(opts) {
  const filePath = path.join(__dirname, `../../../tmp/disks/${opts.name}`);
  const size = parseInt(opts.blocksize) * parseInt(opts.blocks);
  const buffer = Buffer.alloc(size);
  const exists = await fs.exists(filePath);
  if (!exists) {
    throw new Error(`Virtual Disk with name ${opts.name} could not be found`);
  }

  // Create disk files
  await Promise.all([
    fs.writeFile(`${filePath}/disk`, buffer, { encoding: 'binary' })
  ]);
}

async function typeDisk(opts, color, log) {
  opts.blocksize = parseInt(opts.blocksize);
  opts.blocks = parseInt(opts.blocks);

  const filePath = path.join(__dirname, `../../../tmp/disks/${opts.name}`);
  const exists = await fs.exists(filePath);
  if (!exists) {
    throw new Error(`Virtual Disk with name ${opts.name} could not be found`);
  }

  log(color(`\nReading the virtual disk ${opts.name}...\n`));

  const fd = await fs.open(`${filePath}/disk`, 'r');
  let hasContent = false;

  const byBlock = {};

  for (let i = 0; i < opts.blocks; i++) {
    const read = await fs.read(fd, Buffer.alloc(opts.blocksize), 0, opts.blocksize, i * opts.blocksize);
    const stringBuffer = read.buffer.toString();
    byBlock[i] = {
      hex: 'HEX => ',
      bin: 'BIN => ',
      dec: 'DEC => ',
      empty: true
    };

    for (let j = 0; j < opts.blocksize; j++) {
      if (stringBuffer[j] != '\0') {
        const char = stringBuffer[j];
        const charCode = stringBuffer.charCodeAt(j);
        hasContent = true;
        const convs = {
          hex: charCode.toString(16).toUpperCase(),
          bin: textToBin(char),
          dec: char
        };
        byBlock[i].hex += `${convs.hex || '?'}\t`;
        byBlock[i].dec += `${convs.dec == '\n' ? '\\n' : convs.dec}\t`;
        byBlock[i].bin += `${convs.bin} `;
        byBlock[i].empty = false;
      }
    }
  }

  for (const k in byBlock) {
    const { hex, dec, empty } = byBlock[k];
    if (empty) continue;
    log(`\nBLOCO: ${parseInt(k) + 1}\n`);
    log(hex);
    log(dec);
  }
  log('\n');

  return hasContent;
}

function textToBin(text) {
  const length = text.length,
    output = [];
  for (var i = 0; i < length; i++) {
    var bin = text[i].charCodeAt().toString(2);
    output.push(Array(8 - bin.length + 1).join('0') + bin);
  }
  return output.join('');
}

module.exports = {
  createDisk,
  removeDisk,
  formatDisk,
  typeDisk,
  persistNewDisk,
  unPersistDisk
};