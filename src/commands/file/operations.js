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


async function persistFile(file, stats, diskInfo) {
  const fileFD = fs.open(file, 'r');
  const diskFD = fs.open(`tmp/disks/${diskInfo.name}/disk`);

  for (let i = 0; i < stats.blocks; i++) {
    const { buffer } = await fs.read(fileFD, Buffer.alloc(stats.blksize), 0, stats.blksize, i * stats.blksize);
    console.log('>>>>', buffer.toString(), buffer.toString(2));
  }
}

function parseToBin() { }

module.exports = {
  fileStats,
  persistFile
};