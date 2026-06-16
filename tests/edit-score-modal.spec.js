const { test, expect } = require('@playwright/test');
const { seedTournament, seedTPTTournament, seedDoublesRRTournament, clearE2EData } = require('./helpers/firebase.js');
const { loginAsAdmin, loginAsReferee, navigateToTournament, waitForPlayTab } = require('./helpers/app.js');

// Coverage for the unified EditGameModal (src/modals/EditGameModal.jsx) across all
// three tournament modes: Swiss/Round-Robin (full-edit for admin, scores-only for
// referee), TPT, and Doubles RR.

test.describe('Swiss/RR edit-score modal', () => {
  test.beforeEach(async () => {
    await clearE2EData();
    await seedTournament({
      roundNum: 1,
      history: [{
        roundNum: 1,
        games: [
          { winnerId: 't1', loserId: 't2', winnerScore: 11, loserScore: 5, courtNumber: '1' },
          { winnerId: 't3', loserId: 't4', winnerScore: 11, loserScore: 7, courtNumber: '2' },
        ],
        bye: [], paused: [],
      }],
    });
  });

  test('admin full-edit shows court and team pickers, and saves score changes', async ({ page }) => {
    await page.goto('/_admin.html');
    await waitForPlayTab(page);
    await loginAsAdmin(page);

    await page.click('button:has-text("Matches")');
    await expect(page.locator('text=Round 1')).toBeVisible();

    await page.locator('button:has-text("✏️")').first().click();

    const modal = page.locator('.modal-overlay');
    await expect(modal).toBeVisible();
    // Full edit: court field + Team A/B chip pickers shown (3 inputs: court text + 2 scores)
    await expect(modal.locator('input')).toHaveCount(3);
    await expect(modal.locator('text=Team A')).toBeVisible();
    await expect(modal.locator('text=Team B')).toBeVisible();

    const numInputs = modal.locator('input[type="number"]');
    await expect(numInputs.nth(0)).toHaveValue('11');
    await expect(numInputs.nth(1)).toHaveValue('5');

    await numInputs.nth(1).fill('9');
    await modal.locator('button:has-text("Save")').click();
    await expect(modal).not.toBeVisible();

    // Reopen and verify the new score persisted
    await page.locator('button:has-text("✏️")').first().click();
    await expect(modal.locator('input[type="number"]').nth(1)).toHaveValue('9');
    await modal.locator('button:has-text("Cancel")').click();
  });

  test('referee scoreOnly hides court and team pickers, but can edit scores', async ({ page }) => {
    await page.goto('/_admin.html');
    await waitForPlayTab(page);
    await loginAsReferee(page);

    await page.click('button:has-text("Matches")');
    await expect(page.locator('text=Round 1')).toBeVisible();

    await page.locator('button:has-text("✏️")').first().click();

    const modal = page.locator('.modal-overlay');
    await expect(modal).toBeVisible();
    // Scores-only: no court field, no Team A/B chip pickers (only 2 score inputs)
    await expect(modal.locator('input')).toHaveCount(2);
    await expect(modal.locator('text=Team A')).toHaveCount(0);
    await expect(modal.locator('text=Team B')).toHaveCount(0);

    const numInputs = modal.locator('input[type="number"]');
    await expect(numInputs.nth(0)).toHaveValue('11');
    await expect(numInputs.nth(1)).toHaveValue('5');

    await numInputs.nth(1).fill('9');
    await modal.locator('button:has-text("Save")').click();
    await expect(modal).not.toBeVisible();

    // Reopen and verify the new score persisted
    await page.locator('button:has-text("✏️")').first().click();
    await expect(modal.locator('input[type="number"]').nth(1)).toHaveValue('9');
    await modal.locator('button:has-text("Cancel")').click();
  });
});

test.describe('TPT edit-score modal', () => {
  test.beforeEach(async () => {
    await clearE2EData();
    await seedTPTTournament({
      roundNum: 1,
      history: [{
        roundNum: 1,
        games: [],
        tptMatchups: [{
          teamAId: 'A', teamBId: 'B',
          games: [
            { winnerTeamId: 'A', loserTeamId: 'B', winnerScore: 11, loserScore: 5 },
            null,
            null,
          ],
        }],
      }],
    });
  });

  test('shows side chips only (no court/team pickers) and saves score changes', async ({ page }) => {
    await page.goto('/_admin.html');
    await navigateToTournament(page, 'E2E TPT Tournament');
    await loginAsAdmin(page);

    await page.click('button:has-text("Matches")');
    await expect(page.locator('text=Round 1')).toBeVisible();

    await page.locator('button:has-text("✏️")').first().click();

    const modal = page.locator('.modal-overlay');
    await expect(modal).toBeVisible();
    // Males-doubles side labels (team A's males vs team B's males)
    await expect(modal.locator('text=Adam & Alex').first()).toBeVisible();
    await expect(modal.locator('text=Ben & Bob').first()).toBeVisible();
    // No court field, no team pickers — only the 2 score inputs
    await expect(modal.locator('input')).toHaveCount(2);

    const numInputs = modal.locator('input[type="number"]');
    await expect(numInputs.nth(0)).toHaveValue('11');
    await expect(numInputs.nth(1)).toHaveValue('5');

    await numInputs.nth(1).fill('7');
    await modal.locator('button:has-text("Save")').click();
    await expect(modal).not.toBeVisible();

    // Reopen and verify the new score persisted
    await page.locator('button:has-text("✏️")').first().click();
    await expect(modal.locator('input[type="number"]').nth(1)).toHaveValue('7');
    await modal.locator('button:has-text("Cancel")').click();
  });
});

test.describe('Doubles RR edit-score modal', () => {
  test.beforeEach(async () => {
    await clearE2EData();
    await seedDoublesRRTournament({
      roundNum: 1,
      history: [{
        roundNum: 1,
        games: [],
        bye: [], paused: [],
        doublesRRCourts: [{
          teamA: ['p1', 'p2'], teamB: ['p3', 'p4'],
          winnerIds: ['p1', 'p2'], loserIds: ['p3', 'p4'],
          winnerScore: 11, loserScore: 6,
        }],
      }],
    });
  });

  test('shows side chips only (no court/team pickers) and saves score changes', async ({ page }) => {
    await page.goto('/_admin.html');
    await navigateToTournament(page, 'E2E Doubles RR Tournament');
    await loginAsAdmin(page);

    await page.click('button:has-text("Matches")');
    await expect(page.locator('text=Round 1')).toBeVisible();

    await page.locator('button:has-text("✏️")').first().click();

    const modal = page.locator('.modal-overlay');
    await expect(modal).toBeVisible();
    await expect(modal.locator('text=Pat & Quinn').first()).toBeVisible();
    await expect(modal.locator('text=Riley & Sam').first()).toBeVisible();
    // No court field, no team pickers — only the 2 score inputs
    await expect(modal.locator('input')).toHaveCount(2);

    const numInputs = modal.locator('input[type="number"]');
    await expect(numInputs.nth(0)).toHaveValue('11');
    await expect(numInputs.nth(1)).toHaveValue('6');

    await numInputs.nth(1).fill('8');
    await modal.locator('button:has-text("Save")').click();
    await expect(modal).not.toBeVisible();

    // Reopen and verify the new score persisted
    await page.locator('button:has-text("✏️")').first().click();
    await expect(modal.locator('input[type="number"]').nth(1)).toHaveValue('8');
    await modal.locator('button:has-text("Cancel")').click();
  });
});
