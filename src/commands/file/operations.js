'use strict';

const fs = require('fs-extra');


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

  console.log(stats);

  return stats;
}


async function persistFile(file, disk, startBlock, blockCount) {
  const diskFD = await fs.open(`tmp/disks/${disk.name}/disk`, 'r+');

  const data = await fs.readFile(file, 'utf8');
  const binary = textToBin(data);
  const buffer = Buffer.from(binary, 'binary');

  const binUsage = disk.blocksize * blockCount;

  await fs.write(diskFD, buffer, 0, buffer.length, startBlock * disk.blocksize);

  if (binUsage > buffer.length) {
    const clearBuffer = Buffer.alloc(binUsage - buffer.length);
    await fs.write(diskFD, clearBuffer, 0, clearBuffer.length, startBlock * disk.blocksize + buffer.length);
  }
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
  persistFile
};