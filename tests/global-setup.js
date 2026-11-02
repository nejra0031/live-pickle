const { clearE2EData } = require('./helpers/firebase.js');

module.exports = async function globalSetup() {
  await clearE2EData();
  console.log('  [setup] e2e data cleared');
};
