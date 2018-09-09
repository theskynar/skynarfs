'use strict';

const Vorpal = require('vorpal');
const util = require('util');

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

    applyColors(this.vorpal.chalk);
  }
}

function applyColors(chalk) {
  console.log = function () {
    this._stdout.write(chalk['green'](util.format.apply(this, arguments)) + '\n');
  };

  console.info = function () {
    this._stdout.write(chalk['green'](util.format.apply(this, arguments)) + '\n');
  };

  console.warn = function () {
    this._stdout.write(chalk['yellow'](util.format.apply(this, arguments)) + '\n');
  };

  console.error = function () {
    this._stdout.write(chalk['red'](util.format.apply(this, arguments)) + '\n');
  };
}

module.exports = RootCmd;