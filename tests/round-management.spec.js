import { test, expect } from '@playwright/test';
import { seedTournament, clearE2EData } from './helpers/firebase.js';
import { loginAsAdmin, waitForPlayTab, generateRound, enterScore } from './helpers/app.js';

test.describe('Round management', () => {
  test.beforeEach(async () => {
    await clearE2EData();
    await seedTournament();
  });

  test('admin generates Round 1', async ({ page }) => {
    await page.goto('/_admin.html');
    await waitForPlayTab(page);
    await loginAsAdmin(page);

    await expect(page.locator('button').filter({ hasText: /Generate Round 1/ })).toBeVisible();
    await generateRound(page);
    await expect(page.locator('text=Round 1')).toBeVisible();
    // Both courts should be visible
    await expect(page.locator('text=Court 1')).toBeVisible();
    await expect(page.locator('text=Court 2')).toBeVisible();
  });

  test('entering scores on one court shows pending state', async ({ page }) => {
    await page.goto('/_admin.html');
    await waitForPlayTab(page);
    await loginAsAdmin(page);
    await generateRound(page);

    // Fill first court: 11-5
    const inputs = page.locator('input[type="number"]');
    await inputs.nth(0).fill('11');
    await inputs.nth(1).fill('5');
    await page.locator('button:has-text("Confirm")').first().click();

    // Court 1 should show the ✓ pending result
    await expect(page.locator('text=✓').first()).toBeVisible({ timeout: 3000 });
  });

  test('entering scores on all courts completes the round', async ({ page }) => {
    await page.goto('/_admin.html');
    await waitForPlayTab(page);
    await loginAsAdmin(page);
    await generateRound(page);

    // Enter scores for both courts
    const inputs = page.locator('input[type="number"]');
    await inputs.nth(0).fill('11');
    await inputs.nth(1).fill('3');
    await page.locator('button:has-text("Confirm")').first().click();
    await page.waitForTimeout(400);

    await inputs.nth(0).fill('7');
    await inputs.nth(1).fill('11');
    await page.locator('button:has-text("Confirm")').first().click();

    // Round should auto-complete — "Generate Round 2" button appears
    await expect(page.locator('button').filter({ hasText: /Generate Round 2/ })).toBeVisible({ timeout: 5000 });
  });

  test('cancelling a round returns to between-rounds state', async ({ page }) => {
    await page.goto('/_admin.html');
    await waitForPlayTab(page);
    await loginAsAdmin(page);
    await generateRound(page);

    await page.click('button:has-text("Cancel Round")');
    // PIN modal
    await page.fill('input[type="password"]', 'test1234');
    await page.click('button:has-text("Unlock")');

    await expect(page.locator('button').filter({ hasText: /Generate Round 1/ })).toBeVisible({ timeout: 5000 });
  });

  test('completed round appears in history tab', async ({ page }) => {
    await page.goto('/_admin.html');
    await waitForPlayTab(page);
    await loginAsAdmin(page);
    await generateRound(page);

    const inputs = page.locator('input[type="number"]');
    await inputs.nth(0).fill('11');
    await inputs.nth(1).fill('0');
    await page.locator('button:has-text("Confirm")').first().click();
    await page.waitForTimeout(400);
    await inputs.nth(0).fill('11');
    await inputs.nth(1).fill('2');
    await page.locator('button:has-text("Confirm")').first().click();

    await page.waitForSelector('button:has-text("Generate Round 2")', { timeout: 5000 });

    await page.click('button:has-text("History")');
    await expect(page.locator('text=Round 1')).toBeVisible();
  });
});
