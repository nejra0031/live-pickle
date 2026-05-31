import { describe, it, expect } from 'vitest';
import { toArr, normaliseSnapshot } from './normalise';

describe('toArr', () => {
  it('passes real arrays through', () => {
    expect(toArr([1, 2, 3])).toEqual([1, 2, 3]);
  });
  it('converts Firebase object-keyed arrays back to arrays in index order', () => {
    expect(toArr({ 0: 'a', 1: 'b', 2: 'c' })).toEqual(['a', 'b', 'c']);
  });
  it('returns [] for null, undefined, or scalar input', () => {
    expect(toArr(null)).toEqual([]);
    expect(toArr(undefined)).toEqual([]);
    expect(toArr(5)).toEqual([]);
  });
});

describe('normaliseSnapshot — roundData', () => {
  it('preserves courtNums when present (Phase A fix)', () => {
    const s = normaliseSnapshot({
      phase: 'play',
      roundData: { courtTeamIds: { 0: { 0: 'red', 1: 'blue' } }, byeIds: {}, pausedTeamIds: {}, courtNums: { 0: '5', 1: '7' } },
    });
    expect(s.roundData.courtNums).toEqual(['5', '7']);
  });

  it('omits courtNums entirely when absent so the courtNumbers fallback still applies', () => {
    const s = normaliseSnapshot({
      phase: 'play',
      roundData: { courtTeamIds: { 0: { 0: 'red', 1: 'blue' } }, byeIds: {}, pausedTeamIds: {} },
    });
    expect('courtNums' in s.roundData).toBe(false);
  });

  it('converts object-keyed courtTeamIds to nested arrays', () => {
    const s = normaliseSnapshot({
      phase: 'play',
      roundData: { courtTeamIds: { 0: { 0: 'red', 1: 'blue' }, 1: { 0: 'green', 1: 'yellow' } }, byeIds: { 0: 'pink' }, pausedTeamIds: {} },
    });
    expect(s.roundData.courtTeamIds).toEqual([['red', 'blue'], ['green', 'yellow']]);
    expect(s.roundData.byeIds).toEqual(['pink']);
  });

  it('returns null roundData when there is no round', () => {
    expect(normaliseSnapshot({ phase: 'play' }).roundData).toBeNull();
  });
});

describe('normaliseSnapshot — history', () => {
  it('normalises object-keyed history and its nested arrays', () => {
    const s = normaliseSnapshot({
      phase: 'play',
      history: { 0: { roundNum: 1, games: { 0: { winnerId: 'red', loserId: 'blue' } }, bye: { 0: 'green' }, paused: {} } },
    });
    expect(s.history).toHaveLength(1);
    expect(s.history[0].games).toEqual([{ winnerId: 'red', loserId: 'blue' }]);
    expect(s.history[0].bye).toEqual(['green']);
    expect(s.history[0].paused).toEqual([]);
  });

  it('defaults tournamentMode to swiss', () => {
    expect(normaliseSnapshot({ phase: 'play' }).tournamentMode).toBe('swiss');
  });
});
