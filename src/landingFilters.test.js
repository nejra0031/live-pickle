import { describe, it, expect } from 'vitest';
import { TOURNAMENT_MODES, getSortTimestamp, isTournamentFull, splitAndSortTournaments, applyLandingFilters } from './landingFilters';

describe('getSortTimestamp', () => {
  it('uses startTime when present and valid', () => {
    const t = { startTime: '2026-06-20T08:00', createdAt: 1 };
    expect(getSortTimestamp(t)).toBe(new Date('2026-06-20T08:00').getTime());
  });

  it('falls back to createdAt when startTime is an empty string', () => {
    const t = { startTime: '', createdAt: 12345 };
    expect(getSortTimestamp(t)).toBe(12345);
  });

  it('falls back to createdAt when startTime is an invalid date string', () => {
    const t = { startTime: 'not-a-date', createdAt: 12345 };
    expect(getSortTimestamp(t)).toBe(12345);
  });

  it('returns null when neither startTime nor createdAt is usable', () => {
    expect(getSortTimestamp({})).toBeNull();
  });
});

describe('isTournamentFull', () => {
  it('returns false when maxPlayers is 0 (unlimited)', () => {
    expect(isTournamentFull({ playerCount: 10, maxPlayers: 0 })).toBe(false);
  });

  it('returns true when playerCount has reached maxPlayers', () => {
    expect(isTournamentFull({ playerCount: 8, maxPlayers: 8 })).toBe(true);
  });

  it('returns true when teamCount has reached maxPlayers', () => {
    expect(isTournamentFull({ teamCount: 4, maxPlayers: 4 })).toBe(true);
  });

  it('returns false when count is under maxPlayers', () => {
    expect(isTournamentFull({ playerCount: 6, maxPlayers: 8 })).toBe(false);
  });
});

describe('splitAndSortTournaments', () => {
  it('splits finished vs non-finished (active/setup) into separate lists', () => {
    const a = { id: 'a', status: 'active', createdAt: 1 };
    const s = { id: 's', status: 'setup', createdAt: 2 };
    const f = { id: 'f', status: 'finished', createdAt: 3 };
    const { upcoming, finished } = splitAndSortTournaments([a, s, f]);
    expect(upcoming.map(t => t.id).sort()).toEqual(['a', 's']);
    expect(finished.map(t => t.id)).toEqual(['f']);
  });

  it('sorts upcoming by date ascending (earliest first)', () => {
    const early = { id: 'early', status: 'active', startTime: '2026-01-01T00:00' };
    const late = { id: 'late', status: 'active', startTime: '2026-12-31T00:00' };
    const { upcoming } = splitAndSortTournaments([late, early]);
    expect(upcoming.map(t => t.id)).toEqual(['early', 'late']);
  });

  it('sorts finished by date descending (most recent first)', () => {
    const old = { id: 'old', status: 'finished', startTime: '2025-01-01T00:00' };
    const recent = { id: 'recent', status: 'finished', startTime: '2026-01-01T00:00' };
    const { finished } = splitAndSortTournaments([old, recent]);
    expect(finished.map(t => t.id)).toEqual(['recent', 'old']);
  });

  it('places items with no usable date last in both lists', () => {
    const dated = { id: 'dated', status: 'active', startTime: '2026-01-01T00:00' };
    const undated = { id: 'undated', status: 'active' };
    const { upcoming } = splitAndSortTournaments([undated, dated]);
    expect(upcoming.map(t => t.id)).toEqual(['dated', 'undated']);

    const datedF = { id: 'datedF', status: 'finished', startTime: '2026-01-01T00:00' };
    const undatedF = { id: 'undatedF', status: 'finished' };
    const { finished } = splitAndSortTournaments([undatedF, datedF]);
    expect(finished.map(t => t.id)).toEqual(['datedF', 'undatedF']);
  });

  it('falls back to createdAt for sorting when startTime is missing', () => {
    const a = { id: 'a', status: 'active', createdAt: 100 };
    const b = { id: 'b', status: 'active', createdAt: 200 };
    const { upcoming } = splitAndSortTournaments([b, a]);
    expect(upcoming.map(t => t.id)).toEqual(['a', 'b']);
  });

  it('does not mutate the input array', () => {
    const input = [
      { id: 'b', status: 'active', createdAt: 2 },
      { id: 'a', status: 'active', createdAt: 1 },
    ];
    splitAndSortTournaments(input);
    expect(input.map(t => t.id)).toEqual(['b', 'a']);
  });
});

describe('applyLandingFilters', () => {
  const swiss = { id: 'swiss', mode: 'swiss', status: 'active' };
  const tpt = { id: 'tpt', mode: 'tpt', status: 'active' };
  const finishedSwiss = { id: 'finishedSwiss', mode: 'swiss', status: 'finished' };
  const finishedTpt = { id: 'finishedTpt', mode: 'tpt', status: 'finished' };
  const full = { id: 'full', mode: 'swiss', status: 'active', playerCount: 8, maxPlayers: 8 };
  const open = { id: 'open', mode: 'swiss', status: 'active', playerCount: 4, maxPlayers: 8 };
  const finishedFull = { id: 'finishedFull', mode: 'swiss', status: 'finished', playerCount: 8, maxPlayers: 8 };

  it('passes everything through when all modes are enabled (no-op default)', () => {
    const split = { upcoming: [swiss, tpt], finished: [finishedSwiss, finishedTpt] };
    const result = applyLandingFilters(split, { enabledModes: new Set(TOURNAMENT_MODES), hideFull: false });
    expect(result).toEqual(split);
  });

  it('filters out tournaments whose mode is unchecked, from both lists', () => {
    const split = { upcoming: [swiss, tpt], finished: [finishedSwiss, finishedTpt] };
    const result = applyLandingFilters(split, { enabledModes: new Set(['swiss', 'roundrobin', 'doublesrr']), hideFull: false });
    expect(result.upcoming.map(t => t.id)).toEqual(['swiss']);
    expect(result.finished.map(t => t.id)).toEqual(['finishedSwiss']);
  });

  it('hideFull removes full tournaments from upcoming only', () => {
    const split = { upcoming: [full, open], finished: [finishedFull] };
    const result = applyLandingFilters(split, { enabledModes: new Set(TOURNAMENT_MODES), hideFull: true });
    expect(result.upcoming.map(t => t.id)).toEqual(['open']);
    expect(result.finished.map(t => t.id)).toEqual(['finishedFull']);
  });

  it('hideFull has no effect on non-full tournaments', () => {
    const split = { upcoming: [open], finished: [] };
    const result = applyLandingFilters(split, { enabledModes: new Set(TOURNAMENT_MODES), hideFull: true });
    expect(result.upcoming.map(t => t.id)).toEqual(['open']);
  });

  it('combines mode filter and hideFull filter correctly', () => {
    const split = { upcoming: [full, open, tpt], finished: [finishedTpt] };
    const result = applyLandingFilters(split, { enabledModes: new Set(['swiss']), hideFull: true });
    expect(result.upcoming.map(t => t.id)).toEqual(['open']);
    expect(result.finished).toEqual([]);
  });
});
