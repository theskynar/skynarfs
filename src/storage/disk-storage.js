'use strict';

const fs = require('fs');

/**
 * Helper class for control all disk address.
 *
 * @class DiskStorage
 */
class DiskStorage {
  constructor(name) {
    this.name = name;
    this.diskTree = { name: 'root', childrens: [] };
    this.navigationStack = [];
  }

  /**
   * Return the current node.
   *
   * @readonly
   * @memberof DiskStorage
   */
  get currentNode() {
    return this.navigationStack[this.navigationStack.length - 1];
  }

  /**
   * Return the current parent.
   *
   * @readonly
   * @memberof DiskStorage
   */
  get currentParent() {
    return this.navigationStack[this.navigationStack.length - 2];
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

    const file = {
      name,
      blockIndex,
      blockCount,
      createdAt: (new Date()).getTime()
    };

    this.currentNode.childrens.push(file);
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
  remove(name, recursive = true) {
    const index = this.currentNode.childrens.findIndex(x => x.name === name);
    const item = this.currentNode.childrens[index];

    if (index === -1) {
      return false;
    } else if (item.childrens.length > 0 && !recursive) {
      return false;
    }

    this.currentNode.childrens.splice(index, 1);
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
      const buffer = Buffer.from(text);
      fs.writeFileSync(`tmp/disks/${this.name}/address`, buffer, { encoding: 'binary' });
    } catch (e) {
      console.error('Error on convert disk to Binary File', e);
    }
  }
}

module.exports = DiskStorage;