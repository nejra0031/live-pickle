const TEST_PIN = 'test1234';
const TEST_REFEREE_PIN = 'ref56789';

async function loginAsAdmin(page) {
  await page.click('button:has-text("Login")');
  await page.fill('input[type="password"]', TEST_PIN);
  await page.click('button:has-text("Unlock")');
  await page.waitForSelector('button:has-text("Admin")', { timeout: 5000 });
}

async function loginAsReferee(page) {
  await page.click('button:has-text("Login")');
  await page.fill('input[type="password"]', TEST_REFEREE_PIN);
  await page.click('button:has-text("Unlock")');
  await page.waitForSelector('button:has-text("Referee")', { timeout: 5000 });
}

// Navigate from the landing page into a specific tournament and wait until
// the tournament view is ready. The tournament's title must be visible on the
// landing page as a clickable card.
async function navigateToTournament(page, title) {
  await page.waitForSelector(`text=${title}`, { timeout: 8000 });
  await page.click(`text=${title}`);
  // The "← Tournaments" back button only appears inside the tournament view.
  await page.waitForSelector('button:has-text("← Tournaments")', { timeout: 8000 });
}

async function waitForPlayTab(page) {
  await navigateToTournament(page, 'E2E Test Tournament');
}

async function generateRound(page) {
  const btn = page.locator('button').filter({ hasText: /Generate Round/ });
  await btn.click();
  await page.waitForSelector('text=Round', { timeout: 5000 });
}

module.exports = { loginAsAdmin, loginAsReferee, navigateToTournament, waitForPlayTab, generateRound };
