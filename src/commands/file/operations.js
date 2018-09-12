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

  return stats;
}


async function persistFile(file, disk, startBlk) {
  const diskFD = await fs.open(`tmp/disks/${disk.name}/disk`, 'r+');

  const data = await fs.readFile(file, 'utf-8');
  const binary = textToBin(data);
  const buffer = Buffer.from(binary);

  const endBlk = Math.ceil(buffer.byteLength / disk.blocksize);
  const offset = buffer.byteLength - disk.blocksize > 0 ? disk.blocksize : buffer.byteLength;

  for (let i = startBlk; i <= endBlk; i++) {
    await fs.write(diskFD, buffer, 0, offset, startBlk - 1);
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