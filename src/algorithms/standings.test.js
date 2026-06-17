import { describe, it, expect } from 'vitest';
import { rerank, rebuildStandings } from './standings';

describe('rebuildStandings', () => {
  it('accumulates wins/losses/scoreDiff/played from history games', () => {
    const st = rebuildStandings(
      ['red', 'blue'],
      [{ games: [{ winnerId: 'red', loserId: 'blue', winnerScore: 11, loserScore: 5 }], bye: [] }]
    );
    const red = st.find((t) => t.id === 'red');
    const blue = st.find((t) => t.id === 'blue');
    expect(red).toMatchObject({ wins: 1, losses: 0, scoreDiff: 6, played: 1 });
    expect(blue).toMatchObject({ wins: 0, losses: 1, scoreDiff: -6, played: 1 });
  });

  it('skips games that reference a team outside the active set', () => {
    const st = rebuildStandings(
      ['red'],
      [{ games: [{ winnerId: 'red', loserId: 'ghost', winnerScore: 11, loserScore: 0 }], bye: [] }]
    );
    expect(st.find((t) => t.id === 'red').wins).toBe(0);
  });

  it('records bye rounds without affecting played count', () => {
    const st = rebuildStandings(['red', 'blue'], [{ games: [], bye: ['red'] }]);
    const red = st.find((t) => t.id === 'red');
    expect(red.played).toBe(0);
    expect(red.lastByeRound).toBe(0);
  });
});

describe('rerank', () => {
  it('orders by wins desc, then scoreDiff desc, then played asc', () => {
    const ranked = rerank([
      { id: 'a', wins: 1, scoreDiff: 2, played: 2 },
      { id: 'b', wins: 2, scoreDiff: 0, played: 2 },
      { id: 'c', wins: 1, scoreDiff: 5, played: 2 },
    ]);
    expect(ranked.map((t) => t.id)).toEqual(['b', 'c', 'a']);
  });

  it('does not mutate the input array', () => {
    const input = [
      { id: 'a', wins: 0, scoreDiff: 0, played: 0 },
      { id: 'b', wins: 1, scoreDiff: 0, played: 0 },
    ];
    rerank(input);
    expect(input[0].id).toBe('a');
  });
});
