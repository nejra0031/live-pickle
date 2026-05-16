const { clearE2EData } = require('./helpers/firebase.js');

module.exports = async function globalTeardown() {
  await clearE2EData();
  console.log('  [teardown] e2e data cleared');
};
