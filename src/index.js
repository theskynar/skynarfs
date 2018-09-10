'use strict';

const RootCmd = require('./commands/index');
const Storage = require('./storage');

try {
  const storage = new Storage();
  const rootCommand = new RootCmd(storage);

  process.on('SIGINT', () => {
    storage.stop();
  });

  storage.init().then(() => {
    rootCommand.init();
  }).catch((err) => {
    process.kill(process.pid, 'SIGINT');
  });
} catch (err) {
  console.error('Error: ', err.message, err.stack);
}
