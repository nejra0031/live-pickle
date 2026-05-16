import { fbSet, clearE2EData, TEST_PIN_HASH } from './helpers/firebase.js';

export default async function globalSetup() {
  // Write test admin PIN to the test-specific path
  await fbSet('config/adminPin_test', TEST_PIN_HASH);
  // Clear any leftover e2e data from a previous run
  await clearE2EData();
  console.log('  [setup] Test PIN set, e2e data cleared');
}
