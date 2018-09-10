'use strict';

const repl = require('vorpal-repl');
const util = require('util');

// const { createValidation, commonValidation } = require('./schema');
const operations = require('./operations');

class FileCmd {
  /**
   * 
   * @param {Vorpal} vorpal 
   */
  constructor(vorpal, storage) {
    this.vorpal = vorpal;
    this.chalk = vorpal.chalk;
    this.storage = storage;
  }
}

module.exports = FileCmd;
