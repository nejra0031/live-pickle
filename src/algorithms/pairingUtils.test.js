import { describe, it, expect } from 'vitest';
import { pairKey, greedyAdjacentSwapPair } from './pairingUtils';

describe('pairKey', () => {
  it('is order-independent', () => {
    expect(pairKey('a', 'b')).toBe(pairKey('b', 'a'));
  });

  it('produces distinct keys for distinct pairs', () => {
    expect(pairKey('a', 'b')).not.toBe(pairKey('a', 'c'));
    expect(pairKey('a', 'b')).not.toBe(pairKey('b', 'c'));
  });

  it('handles numeric-looking ids', () => {
    expect(pairKey('10', '2')).toBe(pairKey('2', '10'));
    expect(pairKey('10', '2')).not.toBe(pairKey('1', '02'));
  });
});

describe('greedyAdjacentSwapPair', () => {
  it('returns default consecutive pairs when all scores are equal', () => {
    const items = ['a', 'b', 'c', 'd'];
    const result = greedyAdjacentSwapPair(items, () => 0);
    expect(result).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });

  it('accepts an alternative swap when it reduces the score', () => {
    // default [[A,B],[C,D]] has penalty 100 (A-B is a repeat)
    // swap B↔C gives [[A,C],[B,D]] — no repeats, score 0
    const repeats = new Set([pairKey('A', 'B')]);
    const scoreFn = (pairs) =>
      pairs.reduce((sum, [x, y]) => sum + (repeats.has(pairKey(x, y)) ? 100 : 0), 0);
    const result = greedyAdjacentSwapPair(['A', 'B', 'C', 'D'], scoreFn);
    const flatPairs = result.map(([x, y]) => pairKey(x, y));
    expect(flatPairs).not.toContain(pairKey('A', 'B'));
  });

  it('keeps the default when no swap improves the score', () => {
    // all pairs equally bad — no improvement possible
    const scoreFn = () => 50;
    const result = greedyAdjacentSwapPair(['a', 'b', 'c', 'd'], scoreFn);
    expect(result).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });

  it('handles a two-item list (single pair, no swap candidates)', () => {
    const result = greedyAdjacentSwapPair(['x', 'y'], () => 0);
    expect(result).toEqual([['x', 'y']]);
  });

  it('ignores the trailing item in an odd-length list', () => {
    const result = greedyAdjacentSwapPair(['a', 'b', 'c'], () => 0);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(['a', 'b']);
  });
});
