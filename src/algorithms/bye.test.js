import { describe, it, expect } from 'vitest';
import { buildByeCounts, scoreByeGroup, greedySelectByes } from './bye';
import { pairKey } from './pairingUtils';

describe('buildByeCounts', () => {
  it('counts solo byes per team', () => {
    const history = [{ bye: ['t1', 't2'] }, { bye: ['t1'] }];
    const { solo } = buildByeCounts(history);
    expect(solo.t1).toBe(2);
    expect(solo.t2).toBe(1);
    expect(solo.t3).toBeUndefined();
  });

  it('counts pair byes for teams that sit out together', () => {
    const history = [{ bye: ['t1', 't2'] }, { bye: ['t1', 't2', 't3'] }];
    const { pairs } = buildByeCounts(history);
    expect(pairs[pairKey('t1', 't2')]).toBe(2);
    expect(pairs[pairKey('t1', 't3')]).toBe(1);
    expect(pairs[pairKey('t2', 't3')]).toBe(1);
  });

  it('handles rounds with no byes', () => {
    const history = [
      { games: [], bye: [] },
      { games: [], bye: ['t1'] },
    ];
    const { solo, pairs } = buildByeCounts(history);
    expect(solo.t1).toBe(1);
    expect(Object.keys(pairs)).toHaveLength(0);
  });

  it('returns empty counts for empty history', () => {
    const { solo, pairs } = buildByeCounts([]);
    expect(Object.keys(solo)).toHaveLength(0);
    expect(Object.keys(pairs)).toHaveLength(0);
  });
});

describe('scoreByeGroup', () => {
  it('returns 0 for teams with no prior bye history', () => {
    expect(scoreByeGroup(['a', 'b'], { solo: {}, pairs: {} })).toBe(0);
  });

  it('adds 1000× pair penalty per shared prior bye', () => {
    const pairs = { [pairKey('a', 'b')]: 2 };
    expect(scoreByeGroup(['a', 'b'], { solo: {}, pairs })).toBe(2000);
  });

  it('adds 1× solo penalty per prior solo bye', () => {
    const solo = { a: 3, b: 1 };
    expect(scoreByeGroup(['a', 'b'], { solo, pairs: {} })).toBe(4);
  });

  it('combines pair and solo penalties', () => {
    const solo = { a: 1 };
    const pairs = { [pairKey('a', 'b')]: 1 };
    expect(scoreByeGroup(['a', 'b'], { solo, pairs })).toBe(1001);
  });
});

describe('greedySelectByes', () => {
  const team = (id) => ({ id });

  it('selects the requested number of teams', () => {
    const tier = [team('a'), team('b'), team('c')];
    const selected = greedySelectByes([], tier, 2, { solo: {}, pairs: {} });
    expect(selected).toHaveLength(2);
  });

  it('prefers teams with fewer prior byes', () => {
    const tier = [team('heavy'), team('light')];
    const byeCounts = { solo: { heavy: 5, light: 0 }, pairs: {} };
    const selected = greedySelectByes([], tier, 1, byeCounts);
    expect(selected[0].id).toBe('light');
  });

  it('avoids pairing teams that have already sat out together', () => {
    // 'a' and 'b' have sat out together before; 'a' and 'c' have not
    const pairs = { [pairKey('a', 'b')]: 1 };
    const byeGroup = [team('a')];
    const tier = [team('b'), team('c')];
    const selected = greedySelectByes(byeGroup, tier, 1, { solo: {}, pairs });
    expect(selected[0].id).toBe('c');
  });
});
