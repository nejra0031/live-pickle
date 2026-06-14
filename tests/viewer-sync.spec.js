const { test, expect } = require('@playwright/test');
const { seedTournament, clearE2EData } = require('./helpers/firebase.js');
const { loginAsAdmin, waitForPlayTab, generateRound } = require('./helpers/app.js');

test.beforeEach(async () => {
  await clearE2EData();
  await seedTournament();
});

test('viewer sees tournament title on load', async ({ browser }) => {
  const viewer = await browser.newPage();
  await viewer.goto('/_admin.html');
  await expect(viewer.locator('text=E2E Test Tournament')).toBeVisible({ timeout: 8000 });
  await viewer.close();
});

test('viewer sees Round 1 when admin generates it', async ({ browser }) => {
  const adminCtx = await browser.newContext();
  const viewerCtx = await browser.newContext();
  const admin = await adminCtx.newPage();
  const viewer = await viewerCtx.newPage();

  await admin.goto('/_admin.html');
  await viewer.goto('/_admin.html');
  await waitForPlayTab(admin);
  await waitForPlayTab(viewer);
  await loginAsAdmin(admin);
  await generateRound(admin);

  await expect(viewer.locator('text=Round 1')).toBeVisible({ timeout: 6000 });
  await expect(viewer.locator('text=Court 1')).toBeVisible();
  await expect(viewer.locator('text=Court 2')).toBeVisible();
  await expect(viewer.locator('button:has-text("Confirm")')).not.toBeVisible();
  await expect(viewer.locator('button:has-text("Cancel Round")')).not.toBeVisible();

  await adminCtx.close();
  await viewerCtx.close();
});

test('viewer sees round completion after all scores entered', async ({ browser }) => {
  const adminCtx = await browser.newContext();
  const viewerCtx = await browser.newContext();
  const admin = await adminCtx.newPage();
  const viewer = await viewerCtx.newPage();

  await admin.goto('/_admin.html');
  await viewer.goto('/_admin.html');
  await waitForPlayTab(admin);
  await waitForPlayTab(viewer);
  await loginAsAdmin(admin);
  await generateRound(admin);

  const inputs = admin.locator('input[type="number"]');
  await inputs.nth(0).fill('11');
  await inputs.nth(1).fill('4');
  await admin.locator('button:has-text("Confirm")').first().click();
  await admin.waitForTimeout(400);
  await inputs.nth(0).fill('11');
  await inputs.nth(1).fill('6');
  await admin.locator('button:has-text("Confirm")').first().click();

  await expect(viewer.locator('text=Waiting for next round')).toBeVisible({ timeout: 6000 });

  await adminCtx.close();
  await viewerCtx.close();
});

test('viewer cannot see admin controls', async ({ browser }) => {
  const viewer = await browser.newPage();
  await viewer.goto('/_admin.html');
  await waitForPlayTab(viewer);

  await expect(viewer.locator('button:has-text("Admin login")')).not.toBeVisible();
  await expect(viewer.locator('button:has-text("Generate")')).not.toBeVisible();

  await viewer.close();
});
