const { test, expect } = require('@playwright/test');
const { seedDoublesRRTournament, clearE2EData } = require('./helpers/firebase.js');
const { loginAsAdmin, navigateToTournament } = require('./helpers/app.js');

// Smoke coverage for the Doubles RR ("Doubles · Rotating Partners") play path,
// mirroring tests/tpt.spec.js. Seeds an 8-player / 1-round / 2-court tournament
// (so submitting one court's result doesn't complete the round) and exercises
// rendering plus a result submission (handleDoublesRRResult).
const EXTRA_PLAYERS = {
  p1: { id: 'p1', name: 'Pat',   color: '#3b82f6', text: '#fff' },
  p2: { id: 'p2', name: 'Quinn', color: '#ef4444', text: '#fff' },
  p3: { id: 'p3', name: 'Riley', color: '#22c55e', text: '#fff' },
  p4: { id: 'p4', name: 'Sam',   color: '#f59e0b', text: '#000' },
  p5: { id: 'p5', name: 'Avery', color: '#8b5cf6', text: '#fff' },
  p6: { id: 'p6', name: 'Blake', color: '#06b6d4', text: '#fff' },
  p7: { id: 'p7', name: 'Casey', color: '#ec4899', text: '#fff' },
  p8: { id: 'p8', name: 'Drew',  color: '#84cc16', text: '#000' },
};

test.beforeEach(async () => {
  await clearE2EData();
  await seedDoublesRRTournament({
    courtNumbers: ['1', '2'],
    doublesRRPlayers: EXTRA_PLAYERS,
    doublesRRSchedule: [{
      courts: [
        { teamA: ['p1', 'p2'], teamB: ['p3', 'p4'] },
        { teamA: ['p5', 'p6'], teamB: ['p7', 'p8'] },
      ],
      byePlayerIds: [],
    }],
  });
});

test('renders the Doubles RR play view with court and partnership labels', async ({ page }) => {
  await page.goto('/_admin.html');
  await navigateToTournament(page, 'E2E Doubles RR Tournament');
  await loginAsAdmin(page);

  await expect(page.locator('text=Doubles Round Robin')).toBeVisible();
  await expect(page.locator('text=Round 1 of 1')).toBeVisible();
  await expect(page.locator('text=Pat & Quinn').first()).toBeVisible();
  await expect(page.locator('text=Riley & Sam').first()).toBeVisible();
  await expect(page.locator('text=Avery & Blake').first()).toBeVisible();
  await expect(page.locator('text=Casey & Drew').first()).toBeVisible();
});

test('records a Doubles RR court result', async ({ page }) => {
  await page.goto('/_admin.html');
  await navigateToTournament(page, 'E2E Doubles RR Tournament');
  await loginAsAdmin(page);

  // First court card = Pat & Quinn vs Riley & Sam; two score inputs + Confirm.
  const inputs = page.locator('input[type="number"]');
  await inputs.nth(0).fill('11');
  await inputs.nth(1).fill('5');
  await page.locator('button:has-text("Confirm")').first().click();

  // The submitted court collapses into a completed (✓) row; the second
  // court (Avery & Blake vs Casey & Drew) remains active.
  await expect(page.locator('text=✓').first()).toBeVisible({ timeout: 3000 });
  await expect(page.locator('text=11').first()).toBeVisible();
  await expect(page.locator('text=Avery & Blake').first()).toBeVisible();
});
