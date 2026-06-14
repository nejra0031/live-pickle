const { createHash } = require('crypto');

const DB_URL = 'https://live-pickle-default-rtdb.asia-southeast1.firebasedatabase.app';
const TEST_PIN = 'test1234';
const TEST_PIN_HASH = createHash('sha256').update(TEST_PIN).digest('hex');

const E2E_CLUB_ID       = 'blue_test';
const E2E_TOURNAMENT_ID = 'e2e_tournament';
const E2E_BASE          = `clubs/${E2E_CLUB_ID}/tournaments/${E2E_TOURNAMENT_ID}`;
// Keep exported names unchanged so spec files need no edits
const E2E_TOURNAMENT_PATH = E2E_BASE + '/current';
const E2E_BACKUPS_PATH    = E2E_BASE + '/backups';
const E2E_PRESENCE_PATH   = E2E_BASE + '/presence';

async function fbReq(path, method, body) {
  const res = await fetch(`${DB_URL}/${path}.json`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`Firebase ${method} ${path} failed: ${res.status}`);
  return res.json();
}

const fbSet    = (path, data) => fbReq(path, 'PUT', data);
const fbDelete = (path)       => fbReq(path, 'DELETE');
const fbGet    = (path)       => fbReq(path, 'GET');

async function seedTournament(overrides = {}) {
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
  // Seed meta so the landing page can list this tournament
  await fbSet(`${E2E_BASE}/meta`, {
    id: E2E_TOURNAMENT_ID,
    title: base.tournamentTitle,
    mode: base.tournamentMode,
    status: 'active',
    createdAt: base.savedAt,
    teamCount: (base.activeTeamIds || []).length,
  });
}

// Minimal 3-Player Team (TPT) tournament: 2 teams, 1 scheduled round, 1 matchup.
async function seedTPTTournament(overrides = {}) {
  const base = {
    phase: 'play',
    _tournamentId: 'test-tpt-001',
    tournamentMode: 'tpt',
    tournamentTitle: 'E2E TPT Tournament',
    courtNumbers: ['1'],
    socialCourts: [],
    activeTeamIds: [],
    teamRegistry: [],
    tptTeams: {
      A: { id: 'A', name: 'Aces',  color: '#3b82f6', text: '#fff', maleIds: ['am1', 'am2'], femaleId: 'af' },
      B: { id: 'B', name: 'Bolts', color: '#ef4444', text: '#fff', maleIds: ['bm1', 'bm2'], femaleId: 'bf' },
    },
    players: {
      am1: { id: 'am1', name: 'Adam', gender: 'male' },
      am2: { id: 'am2', name: 'Alex', gender: 'male' },
      af:  { id: 'af',  name: 'Anna', gender: 'female' },
      bm1: { id: 'bm1', name: 'Ben',  gender: 'male' },
      bm2: { id: 'bm2', name: 'Bob',  gender: 'male' },
      bf:  { id: 'bf',  name: 'Beth', gender: 'female' },
    },
    tptSchedule: [{ matchups: [{ teamAId: 'A', teamBId: 'B' }], byeTeamId: null }],
    tptResults: {},
    history: [],
    roundNum: 0,
    pausedIds: [],
    timerDuration: 0,
    timerDefaultMins: 12,
    timerRunning: false,
    timerStartedAt: null,
    timerPausedSecsLeft: 0,
    roundData: null,
    roundComplete: false,
    tournamentFinished: false,
    breakMode: null,
    savedAt: Date.now(),
    ...overrides,
  };
  await fbSet(E2E_TOURNAMENT_PATH, base);
  // Seed meta so the landing page can list this tournament
  await fbSet(`${E2E_BASE}/meta`, {
    id: E2E_TOURNAMENT_ID,
    title: base.tournamentTitle,
    mode: base.tournamentMode,
    status: 'active',
    createdAt: base.savedAt,
    teamCount: 0,
  });
}

async function clearE2EData() {
  await fbDelete(`clubs/${E2E_CLUB_ID}`).catch(() => {});
  await fbDelete('clubsIndex_test').catch(() => {});
}

module.exports = {
  DB_URL, TEST_PIN, TEST_PIN_HASH,
  E2E_CLUB_ID, E2E_TOURNAMENT_ID, E2E_BASE,
  E2E_TOURNAMENT_PATH, E2E_BACKUPS_PATH, E2E_PRESENCE_PATH,
  fbSet, fbDelete, fbGet, seedTournament, seedTPTTournament, clearE2EData,
};
