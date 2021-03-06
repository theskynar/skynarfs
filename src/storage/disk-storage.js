'use strict';

const fs = require('fs');
const path = require('path');
const _ = require('lodash');

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

    const firstAvailableBlock = Math.ceil(10000 / blockSize);

    this.diskTree = {
      name: '~',
      availableBlocks: [`${firstAvailableBlock}:${blocks - firstAvailableBlock}`],
      childrens: []
    };
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
      type: 'file',
      blockIndex,
      blockCount,
      createdAt: (new Date()).getTime()
    };

    this.currentNode.childrens.push(file);
    this.toBinary();
    return true;
  }

  /**
   * Get entity by name.
   * @returns
   * @memberof DiskStorage
   */
  getByName(name) {
    return this.currentNode.childrens.find((val) => val.name == name);
  }

  /**
   * Mode node to another path.
   *
   * @param {string} originPath Source path
   * @param {string} distPath Dist path
   * @memberof DiskStorage
   */
  move(originPath, distPath) {
    // Save original stack for future.
    let originalNavStack = [...this.navigationStack];
    
    const originPathArray = originPath.split("/");
    const originNodeName = originPathArray.pop();
    
    // If is children of another folder, navigate to folder.
    if (originPathArray.length > 0) {
      const navigationSuccess = this.navigateTo(originPathArray.join('/'));
      
      // If navigation fail, path is invalid.
      if (!navigationSuccess) {
        this.navigationStack = originalNavStack;
        throw new Error("Source path is invalid");
      }
    }

    // Get original node index.
    const originNodeIndex = this.currentNode.childrens.findIndex((node) => node.name === originNodeName);

    // If not exists, path is invalid.
    if (originNodeIndex === -1) {
      this.navigationStack = originalNavStack;
      throw new Error("Source path is invalid");
    }

    // If exists, get origin node and origin parent node (used for remove node in future).
    const originNode = this.currentNode.childrens[originNodeIndex];
    const originParentNode = this.currentNode;

    // Restore original navigation stack, and navigate to destination folder.
    this.navigationStack = originalNavStack;
    originalNavStack = [...this.navigationStack];

    if (distPath !== '.') {
      const navigationSuccess = this.navigateTo(distPath);

      // If navigation fail, path is invalid.
      if (!navigationSuccess) {
        this.navigationStack = originalNavStack;
        throw new Error("Dist path is invalid");
      }
    }

    originParentNode.childrens.splice(originNodeIndex, 1);
    this.currentNode.childrens.push(originNode);

    // Restore original navigation stack, and navigate to destination folder.
    this.navigationStack = originalNavStack;
  }

  getNode(path) {
    const splitedPath = path.split('/');
    let current = this.currentNode;

    while(current && current.type !== 'file' && splitedPath.length > 0) {
      current = current.childrens.find(x => x.name === splitedPath[0]);
      splitedPath.shift();
    }

    if (!current || current.type === 'file' && splitedPath.length > 0) {
      return null;
    }

    return current;
  }

  /**
   * Copy object to another path.
   *
   * @param {*} originPath
   * @param {*} distPath
   * @returns
   * @memberof DiskStorage
   */
  async copy(originPath, distPath, onCopyFile) {
    const originNode = this.getNode(originPath);
  
    if (!originNode) {
      throw new Error('Path is invalid.');
    }

    if (originNode.type === 'file') {
      const distPathArray = distPath.split("/");
      const distNodeName = distPathArray.pop();
      let distFolder = this.currentNode;

      if (distPathArray.length > 0) {
        distFolder = this.getNode(distPathArray.join('/'));
      }

      if (!distFolder) {
        throw new Error('Dist path is invalid.');
      }

      const copyNode = _.clone(originNode);
      copyNode.blockIndex = this.nextAvailableBlock(originNode.blockCount);
      copyNode.name = distNodeName;
      copyNode.createdAt = (new Date()).getTime();
      this.removeAvailableBlock(copyNode.blockIndex, copyNode.blockCount);

      distFolder.childrens.push(copyNode);
      await onCopyFile(copyNode.blockIndex, copyNode.blockCount, originNode.blockIndex);
    } else {
      const distFolder = this.getNode(distPath);

      if (distFolder.type === 'FILE') {
        throw new Error('Dist path is invalid.');
      }

      const copyNode = _.clone(originNode);
      copyNode.childrens = [];
      copyNode.createdAt = (new Date()).getTime();

      distFolder.childrens.push(copyNode);

      for (const child of originNode.childrens) {
        const isFile = child.type === 'file';
        const childOrigin = `${originPath}/${child.name}`;
        let childDist = `${distPath}/${copyNode.name}`;

        if (isFile) {
          childDist = `${childDist}/${child.name}`;
        }

        await this.copy(childOrigin, childDist, onCopyFile);
      }
    }
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
      return null;
    } else if (item.childrens && item.childrens.length > 0 && !recursive) {
      return null;
    }

    this.currentNode.childrens.splice(index, 1);
    this.toBinary();
    return item;
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
   * @param {*} path
   * @returns
   * @memberof DiskStorage
   */
  navigateTo(path) {
    const folders = path.split('/');
    const originalNavStack = [...this.navigationStack];

    for (const folderName of folders) {
      if (folderName.trim() === '..') {
        this.navigateBack();
        continue;
      }

      const nextNode = this.availableFolders.find(x => x.name === folderName);

      if (!nextNode) {
        this.navigationStack = originalNavStack;
        return false;
      }

      this.navigationStack.push(nextNode);
    }

    return true;
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
      this.diskTree.availableBlocks[currentBlockIndex] = `${avBlockIndex + blockCount}:${avBlockCount - blockCount}`;
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
      this.diskTree.availableBlocks.splice(rightSiblingIndex - 1, 1);

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
   * Rename node.
   *
   * @param {*} name Node name.
   * @param {*} newName New node name.
   * @memberof DiskStorage
   */
  renameNode(name, newName) {
    const node = this.currentNode.childrens.find(x => x.name === name);

    if (!node) {
      throw new Error(`Cannot find '${name}'`);
    }

    node.name = newName;
  }

  /**
   * Load binary file.
   *
   * @memberof DiskStorage
   */
  fromBinary() {
    try {
      const filePath = path.join(__dirname, `../../tmp/disks/${this.name}/disk`);
      const file = fs.readFileSync(filePath, 'utf-8').substr(0, 10000);
      const tree = {};
      tree.name = '~';
      tree.availableBlocks = file.substr(0, 100).replace(/\u0000/g, '').split('|');
      tree.childrens = file.substr(100, 120).replace(/\u0000/g, '').split('|').map(x => parseInt(x)).filter(x => !!x);

      const informations = []; // All file/folder informations.
      let finish = false; // If true, stop the process.
      let index = 220; // Start reading file/folders.

      while (!finish) {
        const info = {};
        info.name = file.substr(index, 20).replace(/\u0000/g, '');

        if (!info.name.length) {
          finish = true;
        } else {
          info.type = file.substr(index + 20, 8).replace(/\u0000/g, '');
          info.createdAt = parseInt(file.substr(index + 28, 14).replace(/\u0000/g, ''));

          if (info.type === 'file') {
            // IS FILE
            info.blockIndex = parseInt(file.substr(index + 42, 4).replace(/\u0000/g, ''));
            info.blockCount = parseInt(file.substr(index + 46, 4).replace(/\u0000/g, ''));
            index += 50;
          } else {
            // IS FOLDER
            info.childrens = file.substr(index + 42, 120).replace(/\u0000/g, '').split('|').map(x => parseInt(x)).filter(x => !!x);
            index += 162;
          }

          informations.push(info);
        }
      }

      for (let item of informations) {
        if (item.childrens) {
          item.childrens = item.childrens.map(child => informations.find(x => x.createdAt === child));
        }
      }

      tree.childrens = tree.childrens.map(child => informations.find(x => x.createdAt === child));
      this.diskTree = tree;
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
      let result = "";
      result += `${this.diskTree.availableBlocks.join('|').padEnd(100, '\0')}`;
      result += `${this.diskTree.childrens.map(x => x.createdAt.toString().padEnd(14, '\0')).join('|').padEnd(120, '\0')}`;

      const parseChild = (node) => {
        result += `${node.name.padEnd(20, '\0')}`;
        result += `${node.type.padEnd(8, '\0')}`;
        result += `${node.createdAt.toString().padEnd(14, '\0')}`;

        if (node.type === 'file') {
          // IS FILE
          result += `${node.blockIndex.toString().padEnd(4, '\0')}`;
          result += `${node.blockCount.toString().padEnd(4, '\0')}`;
        } else {
          // IS FOLDER
          result += `${node.childrens.map(x => x.createdAt.toString().padEnd(14, '\0')).join('|').padEnd(120, '\0')}`;
        }
      };

      this.deepRun(this.diskTree, parseChild, false);
      result = result.padEnd(10000, '\0');

      const filePath = path.join(__dirname, `../../tmp/disks/${this.name}/disk`);
      const file = fs.readFileSync(filePath, 'utf-8').replace(/.{10000}/, result);
      fs.writeFileSync(filePath, file);
    } catch (e) {
      console.error('Error on convert disk to Binary File', e);
    }
  }

  deepRun(node, cb, runCB = true) {
    if (runCB && node) {
      cb(node);
    }

    if (node.childrens && node.childrens.length > 0) {
      for (let item of node.childrens) this.deepRun(item, cb);
    }
  }
}

module.exports = DiskStorage;