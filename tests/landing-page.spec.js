const { test, expect } = require('@playwright/test');
const { seedTournament, clearE2EData, fbSet, E2E_META_PATH, E2E_TOURNAMENT_ID } = require('./helpers/firebase.js');

// 1×1 transparent PNG — a valid, tiny club logo data URL.
const TINY_LOGO =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
const { navigateToTournament } = require('./helpers/app.js');

test.beforeEach(async () => {
  await clearE2EData();
});

test('shows the tournament club name and logo on the card and in the header', async ({ page }) => {
  await seedTournament({ clubName: 'Lakeside PC', clubLogo: TINY_LOGO });
  await fbSet(`${E2E_META_PATH}/clubName`, 'Lakeside PC');
  await fbSet(`${E2E_META_PATH}/clubLogo`, TINY_LOGO);
  await page.goto('/_admin.html');

  const card = page.locator('div[role="button"]', { hasText: 'E2E Test Tournament' });
  await expect(card.locator('text=Lakeside PC')).toBeVisible({ timeout: 8000 });

  await navigateToTournament(page, 'E2E Test Tournament');
  await expect(page.getByTestId('header-club-name')).toHaveText('Lakeside PC');
  await expect(page.getByTestId('header-logo')).toHaveAttribute('src', TINY_LOGO);
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
  // Anyone can create a tournament — the button is shown even when signed out
  // (clicking it prompts Google sign-in first).
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

  await expect(page.locator('button:has-text("New Tournament")')).toBeVisible({ timeout: 5000 });
  await expect(page.locator('text=E2E Test Tournament')).toBeVisible();
});

test('finished tournament shows Finished status badge', async ({ page }) => {
  await seedTournament();
  // Overwrite meta status to finished
  await fbSet(E2E_META_PATH, {
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

test('signed-out landing page shows tournament and the New Tournament button', async ({ page }) => {
  await seedTournament();
  await page.goto('/_admin.html');

  await expect(page.locator('text=E2E Test Tournament')).toBeVisible({ timeout: 8000 });
  await expect(page.locator('button:has-text("New Tournament")')).toBeVisible();
});
