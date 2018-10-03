'use strict';

const fs = require('fs-extra');
const path = require('path');

/**
 * Fetch file content
 * @param {String} file path
 * @returns {String} Content
 */
async function fileStats(file) {
  const exists = await fs.exists(file);
  if (!exists) {
    throw new Error(`File ${file} does not exist`);
  }

  const stats = await fs.stat(file);
  if (stats.isDirectory()) {
    throw new Error(`The ${file} is a directory`);
  }

  return stats;
}

async function removeFile(disk, blockIndex, blockCount) {
  const filePath = path.join(__dirname, `../../../tmp/disks/${disk.name}/disk`)
  const diskFD = await fs.open(filePath, 'r+');

  await fs.write(diskFD, Buffer.alloc(blockCount * disk.blocksize), 0, blockCount * disk.blocksize, blockIndex * disk.blocksize);
}

async function importFile(file, disk, startBlock, blockCount) {
  const filePath = path.join(__dirname, `../../../tmp/disks/${disk.name}/disk`)
  const diskFD = await fs.open(filePath, 'r+');

  const data = await fs.readFile(file, 'utf8');
  const buffer = Buffer.from(data, 'ascii');

  const binUsage = disk.blocksize * blockCount;

  await fs.write(diskFD, buffer, 0, buffer.length, startBlock * disk.blocksize);

  if (binUsage > buffer.length) {
    const clearBuffer = Buffer.alloc(binUsage - buffer.length);
    await fs.write(diskFD, clearBuffer, 0, clearBuffer.length, startBlock * disk.blocksize + buffer.length);
  }
}

async function persistFile(buffer, disk, startBlock, blockCount) {
  const filePath = path.join(__dirname, `../../../tmp/disks/${disk.name}/disk`)
  const diskFD = await fs.open(filePath, 'r+');

  const binUsage = disk.blocksize * blockCount;

  await fs.write(diskFD, buffer, 0, buffer.length, startBlock * disk.blocksize);

  if (binUsage > buffer.length) {
    const clearBuffer = Buffer.alloc(binUsage - buffer.length);
    await fs.write(diskFD, clearBuffer, 0, clearBuffer.length, startBlock * disk.blocksize + buffer.length);
  }
}

async function typeFile({ blocksize, name }, blockIndex, blockCount, log) {
  blocksize = parseInt(blocksize);
  const filePath = path.join(__dirname, `../../../tmp/disks/${name}/disk`);
  const exists = await fs.exists(filePath);
  if (!exists) {
    throw new Error(`Virtual Disk ${name} could not be found`);
  }

  log(`\nReading the file disk, looking for blocks [${blockIndex}:${blockCount + blockIndex}]...\n`);
  const fd = await fs.open(filePath, 'r');

  let hasContent = false;
  const read = await fs.read(fd, Buffer.alloc(blocksize * blockCount), 0, blocksize * blockCount, blockIndex * blocksize);
  const stringBuffer = read.buffer.toString();
  const typefile = {
    hex: 'HEX => ',
    bin: 'BIN => ',
    dec: 'DEC => ',
    empty: true
  };

  for (let j = 0; j < stringBuffer.length; j++) {
    if (stringBuffer[j] != '\0') {
      const char = stringBuffer[j];
      const charCode = stringBuffer.charCodeAt(j);
      hasContent = true;
      const convs = {
        hex: charCode.toString(16).toUpperCase(),
        bin: textToBin(char),
        dec: char
      };
      typefile.hex += `${convs.hex || '?'}\t`;
      typefile.dec += `${convs.dec == '\n' ? '\\n' : convs.dec}\t`;
      typefile.bin += `${convs.bin} `;
      typefile.empty = false;
    }
  }

  log(`\n CONTEÚDO ARQUIVO:\n`);
  log(typefile.hex);
  log(typefile.dec);

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
  fileStats,
  persistFile,
  importFile,
  typeFile,
  removeFile
};