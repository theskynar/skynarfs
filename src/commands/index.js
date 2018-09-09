'use strict';

const Vorpal = require('vorpal');

const DiskCmd = require('./disk');
// const DirectoryCmd = require('./directory');
// const FileCmd = require('./file');

class RootCmd {
  constructor(storage) {
    this.vorpal = Vorpal();
    this.storage = storage;
  }

  init() {
    new DiskCmd(this.vorpal, this.storage).commands();

    this.vorpal.delimiter('skynarfs').show();
  }
}



module.exports = RootCmd;