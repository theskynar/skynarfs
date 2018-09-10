'use strict';

const fs = require('fs-extra');


/**
 * Fetch file content
 * @param {String} file path
 * @returns {String} Content
 */
async function fetchContent(file, diskInfo) {
  const diskSize = diskInfo.blocks * diskInfo.blocksize - diskInfo.remainingSize;
  const exists = await fs.exists(file);
  if (!exists) {
    throw new Error(`File ${file} does not exist`);
  }

  const stats = await fs.stat(file);
  if (stats.isDirectory()) {
    throw new Error(`The ${file} is a directory`);
  }

  if (file.size > (diskInfo.blocks * diskInfo.blocksize)) {
    throw new Error(`Insufficient space on disk ${diskInfo.name}.\nFile contains ${file.size} bytes, but the disk is up to ${diskSize}`);
  }

  const fd = await fs.open(file, 'r');

  for (let i = 0; i < stats.blocks; i++) {
    const reader = await fs.read(fd, Buffer.alloc(stats.blksize), 0, stats.blksize, i * stats.blksize);

    console.log('>>>', reader.buffer.toString());
  }

}


module.exports = {
  fetchContent,
  //persistOnDisk
};