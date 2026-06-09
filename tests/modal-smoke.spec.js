const { test, expect } = require('@playwright/test');
const { seedTournament, clearE2EData } = require('./helpers/firebase.js');
const { loginAsAdmin, waitForPlayTab } = require('./helpers/app.js');

// Smoke coverage for the admin modals that the rest of the suite never opens.
// These guard the modal wiring (e.g. the upcoming ModalRoot extraction): each
// case opens a modal from the between-rounds admin tools and asserts it renders.
test.beforeEach(async () => {
  await clearE2EData();
  await seedTournament();
});

// Teams & Courts moved into Tournament Settings modal (commit 6cba45a)
test('opens Teams & players section in Tournament Settings modal', async ({ page }) => {
  await page.goto('/_admin.html');
  await waitForPlayTab(page);
  await loginAsAdmin(page);

  await page.locator('button:has-text("Tournament Settings")').first().click();
  await expect(page.locator('.modal-overlay')).toBeVisible({ timeout: 3000 });
  await page.locator('button:has-text("Teams & players")').first().click();
  await expect(page.locator('text=Rename')).toBeVisible({ timeout: 3000 });
});

test('opens Courts section in Tournament Settings modal', async ({ page }) => {
  await page.goto('/_admin.html');
  await waitForPlayTab(page);
  await loginAsAdmin(page);

  await page.locator('button:has-text("Tournament Settings")').first().click();
  await expect(page.locator('.modal-overlay')).toBeVisible({ timeout: 3000 });
  await page.locator('button:has-text("Courts")').first().click();
  await expect(page.locator('text=Add court')).toBeVisible({ timeout: 3000 });
});

const cases = [
  { tool: 'Pre-set',     title: 'Pre-set Matchup' },
  { tool: 'Round Robin', title: 'Start Round Robin' },
];

for (const { tool, title } of cases) {
  test(`opens the "${title}" modal from admin tools`, async ({ page }) => {
    await page.goto('/_admin.html');
    await waitForPlayTab(page);
    await loginAsAdmin(page);

    await page.locator('button').filter({ hasText: tool }).first().click();
    await expect(page.locator(`text=${title}`)).toBeVisible({ timeout: 3000 });
  });
}

test('opens the Break modal', async ({ page }) => {
  await page.goto('/_admin.html');
  await waitForPlayTab(page);
  await loginAsAdmin(page);

  await page.locator('button').filter({ hasText: 'Break' }).first().click();
  await expect(page.locator('.modal-overlay')).toBeVisible({ timeout: 3000 });
});
