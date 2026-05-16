import { test, expect } from '@playwright/test';
import { seedTournament, clearE2EData } from './helpers/firebase.js';
import { loginAsAdmin, waitForPlayTab, generateRound } from './helpers/app.js';

// Helper: complete a round with fixed scores and wait for between-rounds state
async function completeRound(page) {
  const inputs = page.locator('input[type="number"]');
  await inputs.nth(0).fill('11');
  await inputs.nth(1).fill('3');
  await page.locator('button:has-text("Confirm")').first().click();
  await page.waitForTimeout(400);
  await inputs.nth(0).fill('11');
  await inputs.nth(1).fill('5');
  await page.locator('button:has-text("Confirm")').first().click();
  // Wait for round completion
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

    // Give backup write a moment
    await page.waitForTimeout(1000);

    await page.click('button:has-text("History")');
    await expect(page.locator('button:has-text("Revert")')).toBeVisible({ timeout: 5000 });
  });

  test('reverting to Round 1 from Round 2 restores correct state', async ({ page }) => {
    await page.goto('/_admin.html');
    await waitForPlayTab(page);
    await loginAsAdmin(page);

    // Complete Round 1
    await generateRound(page);
    await completeRound(page);
    await page.waitForTimeout(1000); // allow backup write

    // Complete Round 2
    await generateRound(page);
    await completeRound(page);

    // Should now be at "Generate Round 3"
    await expect(page.locator('button').filter({ hasText: /Generate Round 3/ })).toBeVisible();

    // Go to History, revert to Round 1
    await page.click('button:has-text("History")');
    await page.locator('button:has-text("Revert")').first().click(); // Round 1 revert (oldest first)

    // PIN modal
    await page.fill('input[type="password"]', 'test1234');
    await page.click('button:has-text("Unlock")');

    // Confirm modal
    await page.click('button:has-text("Revert")');

    // Should be back to "Generate Round 2"
    await expect(page.locator('button').filter({ hasText: /Generate Round 2/ })).toBeVisible({ timeout: 6000 });
  });

  test('future backups appear after accidental revert', async ({ page }) => {
    await page.goto('/_admin.html');
    await waitForPlayTab(page);
    await loginAsAdmin(page);

    // Complete Rounds 1 and 2
    await generateRound(page);
    await completeRound(page);
    await page.waitForTimeout(1000);

    await generateRound(page);
    await completeRound(page);
    await page.waitForTimeout(1000);

    // Revert to Round 1 (accidentally)
    await page.click('button:has-text("History")');
    // Click the LAST revert button shown (Round 1, oldest-first default reversed)
    const revertBtns = await page.locator('button:has-text("Revert")').all();
    await revertBtns[revertBtns.length - 1].click();
    await page.fill('input[type="password"]', 'test1234');
    await page.click('button:has-text("Unlock")');
    await page.click('button:has-text("Revert")');

    await page.waitForTimeout(1000);

    // History tab should show "Snapshots from reverted rounds" panel with Round 2
    await page.click('button:has-text("History")');
    await expect(page.locator('text=Snapshots from reverted rounds')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('button:has-text("Round 2")')).toBeVisible();
  });
});
