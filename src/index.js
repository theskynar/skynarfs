'use strict';

const RootCmd = require('./commands/index');
const Storage = require('./storage');

try {
  const storage = new Storage();
  const rootCommand = new RootCmd(storage);

  process.on('SIGINT', () => {
    storage.stop();
  });

  storage.init();
  rootCommand.init();
} catch (err) {
  console.error('Error: ', err.message, err.stack);
}
