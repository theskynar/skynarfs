'use strict';

const fs = require('fs');

/**
 * Helper class for control all disk address.
 *
 * @class DiskStorage
 */
class DiskStorage {
  constructor(name, blocks, blockSize) {
    this.name = name;
    this.blocks = blocks;
    this.blockSize = blockSize;
    this.diskTree = { name: '~', availableBlocks: [`1:${blocks}`], childrens: [] };
    this.navigationStack = [];
  }

  /**
   * Return the current node.
   *
   * @readonly
   * @memberof DiskStorage
   */
  get currentNode() {
    return this.navigationStack[this.navigationStack.length - 1] || this.diskTree;
  }

  /**
   * Return the current parent.
   *
   * @readonly
   * @memberof DiskStorage
   */
  get currentParent() {
    return this.navigationStack[this.navigationStack.length - 2] || this.diskTree;
  }

  /**
   * Return all files available in the current node.
   *
   * @readonly
   * @memberof DiskStorage
   */
  get availableFiles() {
    return this.currentNode.childrens.filter(x => x.type === 'file');
  }

  /**
   * Return all folders available in the current node.
   *
   * @readonly
   * @memberof DiskStorage
   */
  get availableFolders() {
    return this.currentNode.childrens.filter(x => x.type === 'folder');
  }

  /**
   * Return path by navigation stack.
   *
   * @readonly
   * @memberof DiskStorage
   */
  get path() {
    return '/' + this.navigationStack.map(x => x.name).join('/');
  }

  /**
   * Insert folder in the current node.
   *
   * @param {*} name
   * @returns
   * @memberof DiskStorage
   */
  insertFolder(name) {
    if (this.parentHasItem(name, 'folder')) {
      return false;
    }

    const folder = {
      name,
      type: 'folder',
      childrens: [],
      createdAt: (new Date()).getTime()
    };

    this.currentNode.childrens.push(folder);
    this.toBinary();
    return true;
  }

  /**
   * Insert file in the current node.
   *
   * @param {*} name
   * @param {*} blockIndex
   * @param {*} blockCount
   * @returns
   * @memberof DiskStorage
   */
  insertFile(name, blockIndex, blockCount) {
    if (this.parentHasItem(name, 'file')) {
      return false;
    }

    this.removeAvailableBlock(blockIndex, blockCount);

    const file = {
      name,
      blockIndex,
      blockCount,
      createdAt: (new Date()).getTime()
    };

    this.currentNode.childrens.push(file);
    this.toBinary();
    return true;
  }

  /**
   * Remove file or folder in the current node.
   *
   * @param {*} name
   * @param {boolean} [recursive=true]
   * @returns
   * @memberof DiskStorage
   */
  remove(name, recursive = false) {
    const index = this.currentNode.childrens.findIndex(x => x.name === name);
    const item = this.currentNode.childrens[index];

    if (item.type === 'file') {
      this.addAvailableBlock(item.blockIndex, item.blockCount);
    }

    if (index === -1) {
      return false;
    } else if (item.childrens.length > 0 && !recursive) {
      return false;
    }

    this.currentNode.childrens.splice(index, 1);
    this.toBinary();
    return true;
  }

  /**
   * Navigate back to the parent.
   *
   * @returns
   * @memberof DiskStorage
   */
  navigateBack() {
    if (!this.currentParent) {
      return false;
    }

    this.navigationStack.pop();
    return true;
  }

  /**
   * Navigate to folder inside current node.
   *
   * @param {*} folderName
   * @returns
   * @memberof DiskStorage
   */
  navigateTo(folderName) {
    if (folderName.trim() === '..') {
      return this.navigateBack();
    }

    const nextNode = this.availableFolders.find(x => x.name === folderName);

    if (nextNode) {
      this.navigationStack.push(nextNode);
      return true;
    }

    return false;
  }

  /**
   * Verify if current node have item with name and type.
   *
   * @param {*} name
   * @param {*} type
   * @returns
   * @memberof DiskStorage
   */
  parentHasItem(name, type) {
    return !!this.currentParent.childrens.find(x => x.name === name && x.type === type);
  }

  /**
   * Return next available block index by blockCount.
   *
   * @param {*} blockCount
   * @returns
   * @memberof DiskStorage
   */
  nextAvailableBlock(blockCount) {
    for (const availableBlock of this.diskTree.availableBlocks) {
      const [blockIndex, blockSize] = availableBlock.split(":").map(x => parseInt(x));

      if (blockCount <= blockSize) {
        return blockIndex;
      }
    }
  }

  /**
   * Update availableBlock on add new file.
   *
   * @param {*} blockIndex
   * @param {*} blockCount
   * @memberof DiskStorage
   */
  removeAvailableBlock(blockIndex, blockCount) {
    const currentBlockIndex = this.diskTree
      .availableBlocks
      .findIndex(x => x.match(new RegExp(`^${blockIndex}:`, 'g')));

    const [avBlockIndex, avBlockCount] = this.diskTree.availableBlocks[currentBlockIndex]
      .split(':')
      .map(x => parseInt(x));

    if (avBlockCount === blockCount) {
      this.diskTree.availableBlocks.splice(currentBlockIndex, 1);
    } else {
      this.diskTree.availableBlocks[currentBlockIndex] = `${avBlockIndex}:${avBlockCount - blockCount}`;
    }
  }

  /**
   * Update availableBlock on remove file.
   *
   * @param {*} blockIndex
   * @param {*} blockCount
   * @memberof DiskStorage
   */
  addAvailableBlock(blockIndex, blockCount) {
    const rightSiblingIndex = this.diskTree
      .availableBlocks
      .findIndex(x => !!x.match(new RegExp(`^${blockIndex + blockCount}:`, 'g')));

    let leftSiblingIndex = this.diskTree
      .availableBlocks
      .findIndex(x => {
        const [curBlockIndex, curBlockCount] = x.split(':').map(y => parseInt(y));

        return curBlockIndex + curBlockCount === blockIndex;
      });

    if (leftSiblingIndex >= 0 && rightSiblingIndex >= 0) {
      const [leftIndex, leftCount] = this.diskTree
        .availableBlocks[leftSiblingIndex]
        .split(':').map(y => parseInt(y));

      const [rightIndex, rightCount] = this.diskTree
        .availableBlocks[rightSiblingIndex]
        .split(':').map(y => parseInt(y));

      this.diskTree.availableBlocks.splice(leftSiblingIndex, 1);
      this.diskTree.availableBlocks.splice(rightSiblingIndex, 1);

      this.diskTree.availableBlocks.unshift(`${leftIndex}:${leftCount + blockCount + rightCount}`);
    } else if (leftSiblingIndex >= 0) {
      const [leftIndex, leftCount] = this.diskTree
        .availableBlocks[leftSiblingIndex]
        .split(':').map(y => parseInt(y));

      this.diskTree.availableBlocks.splice(leftSiblingIndex, 1); 
      
      this.diskTree.availableBlocks.unshift(`${leftIndex}:${leftCount + blockCount}`);
    } else if (rightSiblingIndex >= 0) {
      const [rightIndex, rightCount] = this.diskTree
        .availableBlocks[rightSiblingIndex]
        .split(':').map(y => parseInt(y));

      this.diskTree.availableBlocks.splice(rightSiblingIndex, 1); 
      
      this.diskTree.availableBlocks.unshift(`${blockIndex}:${blockCount + rightCount}`);
    } else {
      this.diskTree.availableBlocks.unshift(`${blockIndex}:${blockCount}`);
    }
  }

  /**
   * Load binary file.
   *
   * @memberof DiskStorage
   */
  fromBinary() {
    try {
      const file = fs.readFileSync(`tmp/disks/${this.name}/address`, { encoding: 'utf-8' });
      this.diskTree = JSON.parse(file);
    } catch (e) {
      console.error('Error on convert binary file to disk', e);
    }
  }

  /**
   * Persist data in binary file.
   *
   * @memberof DiskStorage
   */
  toBinary() {
    try {
      const text = JSON.stringify(this.diskTree);
      fs.writeFileSync(`tmp/disks/${this.name}/address`, text);
    } catch (e) {
      console.error('Error on convert disk to Binary File', e);
    }
  }
}

module.exports = DiskStorage;