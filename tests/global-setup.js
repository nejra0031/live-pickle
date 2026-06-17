const { clearE2EData, fbDelete, fbSet, E2E_CLUB_ID } = require('./helpers/firebase.js');

module.exports = async function globalSetup() {
  await clearE2EData();
  // Seed the clubs index once — clearE2EData() no longer deletes it, so it
  // persists between tests. This lets ensureClubsIndexBootstrapped() take the
  // 1-read fast path on every test instead of doing 4 Firebase ops each time.
  await fbDelete('clubsIndex_test').catch(() => {});
  await fbSet(`clubsIndex_test/${E2E_CLUB_ID}`, { name: 'BLUE', imageUrl: null });
  console.log('  [setup] e2e data cleared and clubs index seeded');
};
