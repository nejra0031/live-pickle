const TEST_PIN = 'test1234';

async function loginAsAdmin(page) {
  await page.click('button:has-text("Admin login")');
  await page.fill('input[type="password"]', TEST_PIN);
  await page.click('button:has-text("Unlock")');
  await page.waitForSelector('button:has-text("Admin")', { timeout: 5000 });
}

async function waitForPlayTab(page) {
  await page.waitForSelector('text=E2E Test Tournament', { timeout: 8000 });
}

async function generateRound(page) {
  const btn = page.locator('button').filter({ hasText: /Generate Round/ });
  await btn.click();
  await page.waitForSelector('text=Round', { timeout: 5000 });
}

module.exports = { loginAsAdmin, waitForPlayTab, generateRound };
