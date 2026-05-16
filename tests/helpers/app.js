import { TEST_PIN } from './firebase.js';

// ── Page helpers ───────────────────────────────────────────────────────────

export async function loginAsAdmin(page) {
  await page.click('button:has-text("Admin login")');
  await page.fill('input[type="password"]', TEST_PIN);
  await page.click('button:has-text("Unlock")');
  // Confirmed when button changes to "Admin"
  await page.waitForSelector('button:has-text("Admin")', { timeout: 5000 });
}

// Wait for the play tab to be fully loaded (phase === 'play')
export async function waitForPlayTab(page) {
  await page.waitForSelector('text=E2E Test Tournament', { timeout: 8000 });
}

// Generate the next round as admin and wait for it to appear
export async function generateRound(page) {
  const btn = page.locator('button').filter({ hasText: /Generate Round/ });
  await btn.click();
  await page.waitForSelector('text=Round', { timeout: 5000 });
}

// Enter a score for a court card by team names.
// Finds the court card containing teamA, fills in scores, and confirms.
export async function enterScore(page, score0, score1) {
  // There are exactly two number inputs per court card; fill them top-to-bottom
  const inputs = page.locator('input[type="number"]');
  await inputs.nth(0).fill(String(score0));
  await inputs.nth(1).fill(String(score1));
  // Click the confirm button (becomes enabled when scores are valid)
  await page.locator('button:has-text("Confirm")').first().click();
}

// Enter scores for ALL visible (unfilled) court cards.
// Alternates 11-0, 0-11 so there's always a winner.
export async function enterAllScores(page) {
  const inputs = await page.locator('input[type="number"]').all();
  // Courts have pairs of inputs; fill each pair
  for (let i = 0; i < inputs.length; i += 2) {
    const scoreA = i === 0 ? 11 : 0;
    const scoreB = i === 0 ? 0 : 11;
    await inputs[i].fill(String(scoreA));
    await inputs[i + 1].fill(String(scoreB));
    await page.locator('button:has-text("Confirm")').first().click();
    // Wait briefly for the pending state to update
    await page.waitForTimeout(300);
  }
}

// Dismiss the PIN modal if it appears (e.g. for destructive actions)
export async function confirmPin(page) {
  await page.fill('input[type="password"]', TEST_PIN);
  await page.click('button:has-text("Unlock")');
}

// Confirm a ConfirmModal dialog
export async function confirmModal(page, labelText = 'Confirm') {
  await page.click(`button:has-text("${labelText}")`);
}
