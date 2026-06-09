const { test, expect } = require('@playwright/test');
const { seedTPTTournament, clearE2EData } = require('./helpers/firebase.js');
const { loginAsAdmin, navigateToTournament } = require('./helpers/app.js');

// Smoke coverage for the 3-Player Team (TPT) play path — the surface a future
// useTPTManagement extraction (plan C.4) would touch. Seeds a 2-team / 1-round
// TPT tournament and exercises rendering plus a result submission (handleTPTResult).
test.beforeEach(async () => {
  await clearE2EData();
  await seedTPTTournament();
});

test('renders the TPT play view with matchup and game labels', async ({ page }) => {
  await page.goto('/_admin.html');
  await navigateToTournament(page, 'E2E TPT Tournament');
  await loginAsAdmin(page);

  await expect(page.locator('text=3-Player Team Tournament')).toBeVisible();
  await expect(page.locator('text=Round 1 of 1')).toBeVisible();
  await expect(page.locator('text=Aces').first()).toBeVisible();
  await expect(page.locator('text=Bolts').first()).toBeVisible();
  await expect(page.locator('text=Males doubles').first()).toBeVisible();
  // males-doubles side A label = both of team A's males
  await expect(page.locator('text=Adam & Alex').first()).toBeVisible();
});

test('records a TPT game result', async ({ page }) => {
  await page.goto('/_admin.html');
  await navigateToTournament(page, 'E2E TPT Tournament');
  await loginAsAdmin(page);

  // First game card = males doubles; two score inputs + Confirm.
  const inputs = page.locator('input[type="number"]');
  await inputs.nth(0).fill('11');
  await inputs.nth(1).fill('5');
  await page.locator('button:has-text("Confirm")').first().click();

  // The submitted game collapses into a completed (✓) row.
  await expect(page.locator('text=✓').first()).toBeVisible({ timeout: 3000 });
  await expect(page.locator('text=11').first()).toBeVisible();
});
