// Firebase REST helpers for test setup — runs in Node.js (no import.meta.env)
import { createHash } from 'crypto';

export const DB_URL = 'https://live-pickle-default-rtdb.asia-southeast1.firebasedatabase.app';
export const TEST_PIN = 'test1234';
export const TEST_PIN_HASH = createHash('sha256').update(TEST_PIN).digest('hex');

export const E2E_TOURNAMENT_PATH = 'current_tournament_e2e';
export const E2E_BACKUPS_PATH    = 'tournament_backups_e2e';
export const E2E_PRESENCE_PATH   = 'presence_e2e';

async function fbReq(path, method, body) {
  const res = await fetch(`${DB_URL}/${path}.json`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`Firebase ${method} ${path} failed: ${res.status}`);
  return res.json();
}

export const fbSet    = (path, data) => fbReq(path, 'PUT', data);
export const fbDelete = (path)       => fbReq(path, 'DELETE');
export const fbGet    = (path)       => fbReq(path, 'GET');

// Write the initial tournament state used by most tests
export async function seedTournament(overrides = {}) {
  const base = {
    phase: 'play',
    _tournamentId: 'test-tournament-001',
    activeTeamIds: ['t1', 't2', 't3', 't4'],
    courtNumbers: ['1', '2'],
    teamRegistry: [
      { id: 't1', name: 'Alpha', color: '#3b82f6', text: '#fff' },
      { id: 't2', name: 'Beta',  color: '#ef4444', text: '#fff' },
      { id: 't3', name: 'Gamma', color: '#22c55e', text: '#fff' },
      { id: 't4', name: 'Delta', color: '#f59e0b', text: '#000' },
    ],
    tournamentTitle: 'E2E Test Tournament',
    timerDuration: 0,
    timerDefaultMins: 12,
    history: [],
    roundNum: 0,
    pausedIds: [],
    timerRunning: false,
    timerStartedAt: null,
    timerPausedSecsLeft: 0,
    roundData: null,
    roundComplete: false,
    tournamentMode: 'swiss',
    roundRobinSchedule: null,
    roundRobinCourts: null,
    roundRobinStartRoundNum: null,
    roundRobinStartSnapshot: null,
    roundRobinEndSnapshot: null,
    activeRoundExtras: [],
    liveAdditions: [],
    nextRoundPresets: [],
    tournamentFinished: false,
    breakMode: null,
    cancelledRoundNums: [],
    socialCourts: [],
    finalRound: false,
    savedAt: Date.now(),
    ...overrides,
  };
  await fbSet(E2E_TOURNAMENT_PATH, base);
}

export async function clearE2EData() {
  await Promise.all([
    fbDelete(E2E_TOURNAMENT_PATH).catch(() => {}),
    fbDelete(E2E_BACKUPS_PATH).catch(() => {}),
    fbDelete(E2E_PRESENCE_PATH).catch(() => {}),
  ]);
}
