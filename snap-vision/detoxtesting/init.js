const detox = require('detox');
const config = require('../package.json').detox;

beforeAll(async () => {
  await detox.init(config);
}, 300000);

afterAll(async () => {
  await detox.cleanup();
});