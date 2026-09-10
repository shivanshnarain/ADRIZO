const path = require('node:path');
const createJiti = require('jiti');

const jiti = createJiti(path.resolve(__dirname, 'run-test.js'), {
  alias: {
    '@': path.resolve(__dirname, '../src')
  }
});

const target = process.argv[2] || './test-buy1-get2-free-promotion.ts';
jiti(path.resolve(__dirname, target));
