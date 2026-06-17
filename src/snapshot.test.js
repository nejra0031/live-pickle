import { describe, it, expect } from 'vitest';
import { buildSnapshot, snapshotToState } from './snapshot';

const baseState = {
  activeTeamIds: ['red', 'blue'],
  courtNumbers: ['1', '2'],
  socialCourts: ['2'],
  tournamentTeams: [{ id: 'red' }],
  tournamentTitle: 'T',
  timerDuration: 720,
  timerDefaultMins: 12,
  history: [{ roundNum: 1, games: [] }],
  roundNum: 3,
  pausedIds: ['green'],
  targetRounds: 5,
  tournamentMode: 'swiss',
  roundRobinSchedule: null,
  roundRobinCourts: null,
  roundRobinStartRoundNum: null,
  roundRobinStartSnapshot: null,
  roundRobinEndSnapshot: null,
  nextRoundPresets: [{ teamId1: 'a', teamId2: 'b' }],
  activeRoundExtras: [{ x: 1 }],
  tournamentFinished: false,
  cancelledRoundNums: [2],
};

describe('buildSnapshot', () => {
  it('always sets phase to play', () => {
    expect(buildSnapshot(baseState).phase).toBe('play');
  });

  it('maps tournamentTeams to teamRegistry', () => {
    expect(buildSnapshot(baseState).teamRegistry).toBe(baseState.tournamentTeams);
  });

  it('defaults timerPausedSecsLeft to timerDuration', () => {
    expect(buildSnapshot(baseState).timerPausedSecsLeft).toBe(720);
  });

  it('uses canonical idle defaults for round/timer/break fields', () => {
    const s = buildSnapshot(baseState);
    expect(s.roundComplete).toBe(false);
    expect(s.timerRunning).toBe(false);
    expect(s.timerStartedAt).toBeNull();
    expect(s.roundData).toBeNull();
    expect(s.breakMode).toBeNull();
    expect(s.finalRound).toBe(false);
    expect(s.activeRoundExtras).toEqual([]);
    expect(s.liveAdditions).toEqual([]);
  });

  it('persists fields older call sites used to silently drop (regression guard)', () => {
    const s = buildSnapshot(baseState);
    expect(s.socialCourts).toEqual(['2']);
    expect(s.targetRounds).toBe(5);
    expect(s.cancelledRoundNums).toEqual([2]);
  });

  it('lets overrides win over defaults', () => {
    const s = buildSnapshot(baseState, { roundComplete: true, roundData: { x: 1 }, roundNum: 99 });
    expect(s.roundComplete).toBe(true);
    expect(s.roundData).toEqual({ x: 1 });
    expect(s.roundNum).toBe(99);
  });

  it('defaults socialCourts to [] when absent', () => {
    const { socialCourts: _socialCourts, ...noSocial } = baseState;
    expect(buildSnapshot(noSocial).socialCourts).toEqual([]);
  });

  it('sets savedAt to a numeric timestamp', () => {
    expect(typeof buildSnapshot(baseState).savedAt).toBe('number');
  });

  it('omits _tournamentId unless explicitly overridden', () => {
    expect('_tournamentId' in buildSnapshot(baseState)).toBe(false);
    expect(buildSnapshot(baseState, { _tournamentId: 'abc' })._tournamentId).toBe('abc');
  });
});

describe('snapshotToState', () => {
  // Fields buildSnapshot derives from state (so they survive a write→read round-trip).
  // NOT included: roundComplete/finalRound/activeRoundExtras/liveAdditions (buildSnapshot
  // resets these to canonical defaults), and round (reconstructed via `derived`).
  const STATE_DERIVED = [
    'activeTeamIds',
    'tournamentTeams',
    'courtNumbers',
    'timerDuration',
    'timerDefaultMins',
    'history',
    'roundNum',
    'pausedIds',
    'tournamentMode',
    'roundRobinSchedule',
    'roundRobinCourts',
    'roundRobinStartRoundNum',
    'roundRobinStartSnapshot',
    'roundRobinEndSnapshot',
    'nextRoundPresets',
    'tournamentFinished',
    'cancelledRoundNums',
    'targetRounds',
    'tournamentTitle',
    'socialCourts',
  ];

  const state = {
    tournamentTitle: 'My Cup',
    activeTeamIds: ['red', 'blue', 'green'],
    tournamentTeams: [{ id: 'red', name: 'Red', color: '#f00', text: '#fff' }],
    courtNumbers: ['5', '7'],
    timerDuration: 720,
    timerDefaultMins: 12,
    history: [{ roundNum: 1, games: [] }],
    roundNum: 4,
    pausedIds: ['green'],
    tournamentMode: 'roundrobin',
    roundRobinSchedule: [[['a', 'b']]],
    roundRobinCourts: ['5'],
    roundRobinStartRoundNum: 2,
    roundRobinStartSnapshot: { startRoundNum: 2 },
    roundRobinEndSnapshot: { endRoundNum: 5 },
    nextRoundPresets: [{ teamId1: 'a', teamId2: 'b' }],
    tournamentFinished: true,
    cancelledRoundNums: [3],
    targetRounds: 6,
    socialCourts: ['7'], // ⊆ courtNumbers, so survives the filter
  };

  it('round-trips every state-derived field through buildSnapshot', () => {
    const back = snapshotToState(buildSnapshot(state));
    for (const f of STATE_DERIVED) {
      expect(back[f]).toEqual(state[f]);
    }
  });

  it('maps the fields buildSnapshot resets (read directly from the snapshot)', () => {
    const snap = {
      courtNumbers: ['1', '2'],
      roundComplete: true,
      finalRound: true,
      activeRoundExtras: [{ a: 1 }],
      liveAdditions: [{ b: 2 }],
    };
    const back = snapshotToState(snap);
    expect(back.roundComplete).toBe(true);
    expect(back.finalRound).toBe(true);
    expect(back.activeRoundExtras).toEqual([{ a: 1 }]);
    expect(back.liveAdditions).toEqual([{ b: 2 }]);
  });

  it('drops social courts that are no longer in courtNumbers', () => {
    const back = snapshotToState({ courtNumbers: ['1', '2'], socialCourts: ['2', '99'] });
    expect(back.socialCourts).toEqual(['2']);
  });

  it('takes round from derived (reconstructed outside this fn)', () => {
    const nr = { courts: [], bye: [], paused: [] };
    expect(snapshotToState({ courtNumbers: [] }, { round: nr }).round).toBe(nr);
  });

  it('omits tournamentTeams/tournamentTitle when absent (LOAD then preserves them)', () => {
    const back = snapshotToState({ courtNumbers: [], teamRegistry: [] });
    expect('tournamentTeams' in back).toBe(false);
    expect('tournamentTitle' in back).toBe(false);
  });

  it('applies safe defaults for missing fields', () => {
    const back = snapshotToState({ courtNumbers: [] });
    expect(back.timerDuration).toBe(0);
    expect(back.timerDefaultMins).toBe(12);
    expect(back.tournamentMode).toBe('swiss');
    expect(back.pausedIds).toEqual([]);
    expect(back.roundComplete).toBe(false);
    expect(back.targetRounds).toBe(0);
    expect(back.roundRobinSchedule).toBeNull();
  });

  it('does not produce non-reducer fields', () => {
    const back = snapshotToState({ courtNumbers: [] }, { round: null });
    ['standings', 'breakMode', 'pending', 'roundKey'].forEach((k) => expect(k in back).toBe(false));
  });
});
