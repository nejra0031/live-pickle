const { test, expect } = require('@playwright/test');
const { seedTournament, clearE2EData } = require('./helpers/firebase.js');
const { loginAsAdmin, waitForPlayTab, generateRound } = require('./helpers/app.js');

async function completeRound(page) {
  const inputs = page.locator('input[type="number"]');
  await inputs.nth(0).fill('11');
  await inputs.nth(1).fill('3');
  await page.locator('button:has-text("Confirm")').first().click();
  await page.waitForTimeout(400);
  await inputs.nth(0).fill('11');
  await inputs.nth(1).fill('5');
  await page.locator('button:has-text("Confirm")').first().click();
  await page.waitForSelector('button:has-text("Generate Round")', { timeout: 5000 });
}

test.describe('Backup and revert', () => {
  test.beforeEach(async () => {
    await clearE2EData();
    await seedTournament();
  });

  test('backup button appears in history after round completes', async ({ page }) => {
    await page.goto('/_admin.html');
    await waitForPlayTab(page);
    await loginAsAdmin(page);
    await generateRound(page);
    await completeRound(page);
    await page.waitForTimeout(1000);

    await page.click('button:has-text("History")');
    await expect(page.locator('button:has-text("Revert")')).toBeVisible({ timeout: 5000 });
  });

  test('reverting to Round 1 from Round 2 restores correct state', async ({ page }) => {
    await page.goto('/_admin.html');
    await waitForPlayTab(page);
    await loginAsAdmin(page);

    await generateRound(page);
    await completeRound(page);
    await page.waitForTimeout(1000);

    await generateRound(page);
    await completeRound(page);

    await expect(page.locator('button').filter({ hasText: /Generate Round 3/ })).toBeVisible();

    await page.click('button:has-text("History")');
    // Revert buttons appear newest-first; last one is Round 1
    const revertBtns = page.locator('button:has-text("Revert")');
    await revertBtns.last().click();

    await page.fill('input[type="password"]', 'test1234');
    await page.click('button:has-text("Unlock")');
    await page.click('button:has-text("Revert")');

    await expect(page.locator('button').filter({ hasText: /Generate Round 2/ })).toBeVisible({ timeout: 6000 });
  });

  test('future backups panel appears after accidental revert', async ({ page }) => {
    await page.goto('/_admin.html');
    await waitForPlayTab(page);
    await loginAsAdmin(page);

    await generateRound(page);
    await completeRound(page);
    await page.waitForTimeout(1000);

    await generateRound(page);
    await completeRound(page);
    await page.waitForTimeout(1000);

    await page.click('button:has-text("History")');
    // Revert to Round 1 (last button = oldest = Round 1)
    const revertBtns = page.locator('button:has-text("Revert")');
    await revertBtns.last().click();
    await page.fill('input[type="password"]', 'test1234');
    await page.click('button:has-text("Unlock")');
    await page.click('button:has-text("Revert")');

    await page.waitForTimeout(1000);
    await page.click('button:has-text("History")');
    await expect(page.locator('text=Snapshots from reverted rounds')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('button:has-text("Round 2")')).toBeVisible();
  });
});
