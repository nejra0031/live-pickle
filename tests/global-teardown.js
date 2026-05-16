import { clearE2EData } from './helpers/firebase.js';

export default async function globalTeardown() {
  await clearE2EData();
  console.log('  [teardown] e2e data cleared');
}
