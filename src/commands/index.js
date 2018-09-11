'use strict';

const Vorpal = require('vorpal');

const DiskCmd = require('./disk');
const FileCmd = require('./file');

class RootCmd {
  constructor(storage) {
    this.storage = storage;
  }

  init() {
    this.diskMode = new Vorpal().delimiter('$skynarfs');
    this.replMode = new Vorpal().delimiter('$skynarfs');
    this.diskMode.show();

    new DiskCmd(this.diskMode, this.replMode, this.storage).commands();
    new FileCmd(this.diskMode, this.replMode, this.storage).commands();
  }
}



module.exports = RootCmd;