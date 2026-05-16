const { fbSet, clearE2EData, TEST_PIN_HASH } = require('./helpers/firebase.js');

module.exports = async function globalSetup() {
  await fbSet('config/adminPin_test', TEST_PIN_HASH);
  await clearE2EData();
  console.log('  [setup] Test PIN set, e2e data cleared');
};
