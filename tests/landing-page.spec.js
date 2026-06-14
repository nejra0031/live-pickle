const { test, expect } = require('@playwright/test');
const { seedTournament, clearE2EData, fbSet, E2E_BASE, E2E_TOURNAMENT_ID } = require('./helpers/firebase.js');
const { navigateToTournament } = require('./helpers/app.js');

test.beforeEach(async () => {
  await clearE2EData();
});

test('shows BLUE club header on admin landing page', async ({ page }) => {
  await page.goto('/_admin.html');
  await expect(page.locator('text=BLUE')).toBeVisible({ timeout: 8000 });
  await expect(page.locator('img[alt="BLUE logo"]')).toBeVisible();
});

test('lists seeded tournament with title, mode badge, and status badge', async ({ page }) => {
  await seedTournament();
  await page.goto('/_admin.html');

  const card = page.locator('div[role="button"]', { hasText: 'E2E Test Tournament' });
  await expect(card).toBeVisible({ timeout: 8000 });
  await expect(card.locator('text=Swiss')).toBeVisible();
  await expect(card.locator('text=Active')).toBeVisible();
});

test('empty state shown when no tournaments exist', async ({ page }) => {
  await page.goto('/_admin.html');
  await expect(page.locator('text=No tournaments yet')).toBeVisible({ timeout: 8000 });
  await expect(page.locator('button:has-text("New Tournament")')).toBeVisible();
});

test('clicking a tournament card enters the tournament view', async ({ page }) => {
  await seedTournament();
  await page.goto('/_admin.html');

  await navigateToTournament(page, 'E2E Test Tournament');

  // Back button confirms we are inside the tournament view
  await expect(page.locator('button:has-text("← Tournaments")')).toBeVisible();
  // Tournament title is visible in the header
  await expect(page.locator('text=E2E Test Tournament').first()).toBeVisible();
});

test('back button returns to the landing page', async ({ page }) => {
  await seedTournament();
  await page.goto('/_admin.html');
  await navigateToTournament(page, 'E2E Test Tournament');

  await page.click('button:has-text("← Tournaments")');

  await expect(page.locator('text=BLUE')).toBeVisible({ timeout: 5000 });
  await expect(page.locator('text=E2E Test Tournament')).toBeVisible();
});

test('finished tournament shows Finished status badge', async ({ page }) => {
  await seedTournament();
  // Overwrite meta status to finished
  await fbSet(`${E2E_BASE}/meta`, {
    id: E2E_TOURNAMENT_ID,
    title: 'E2E Test Tournament',
    mode: 'swiss',
    status: 'finished',
    createdAt: Date.now(),
    teamCount: 4,
  });
  await page.goto('/_admin.html');

  const card = page.locator('div[role="button"]', { hasText: 'E2E Test Tournament' });
  await expect(card.locator('text=Finished')).toBeVisible({ timeout: 8000 });
});

test('viewer landing page shows tournament but no New Tournament button', async ({ page }) => {
  await seedTournament();
  await page.goto('/_admin.html');

  await expect(page.locator('text=E2E Test Tournament')).toBeVisible({ timeout: 8000 });
  await expect(page.locator('button:has-text("New Tournament")')).not.toBeVisible();
});
