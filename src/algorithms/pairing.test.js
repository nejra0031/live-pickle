import { describe, it, expect } from 'vitest';
import { buildMatchupCounts, getLastRoundMatchups, generateRound } from './pairing';
import { mkStandings, rebuildStandings } from './standings';

describe('buildMatchupCounts', () => {
  it('counts a matchup regardless of which team won', () => {
    const c = buildMatchupCounts([
      { games: [{ winnerId: 'red', loserId: 'blue' }] },
      { games: [{ winnerId: 'blue', loserId: 'red' }] },
    ]);
    expect(c['blue|red']).toBe(2);
  });
});

describe('getLastRoundMatchups', () => {
  it('returns only the matchups from the final round', () => {
    const s = getLastRoundMatchups([
      { games: [{ winnerId: 'red', loserId: 'blue' }] },
      { games: [{ winnerId: 'green', loserId: 'yellow' }] },
    ]);
    expect(s.has('green|yellow')).toBe(true);
    expect(s.has('blue|red')).toBe(false);
  });

  it('returns an empty set for empty history', () => {
    expect(getLastRoundMatchups([]).size).toBe(0);
  });
});

describe('generateRound', () => {
  it('seeds all teams across courts with no byes in round 1', () => {
    const st = mkStandings(['red', 'blue', 'green', 'yellow']);
    const r = generateRound(st, 2, 0, [], []);
    expect(r.courts).toHaveLength(2);
    expect(
      r.courts
        .flat()
        .map((t) => t.id)
        .sort()
    ).toEqual(['blue', 'green', 'red', 'yellow']);
    expect(r.bye).toEqual([]);
  });

  it('gives exactly one bye when teams outnumber court slots', () => {
    const st = mkStandings(['red', 'blue', 'green', 'yellow', 'pink']);
    const r = generateRound(st, 2, 0, [], []);
    expect(r.courts).toHaveLength(2);
    expect(r.bye).toHaveLength(1);
  });

  it('avoids replaying the immediately-previous matchup when an alternative exists', () => {
    const ids = ['red', 'blue', 'green', 'yellow'];
    const history = [
      {
        roundNum: 1,
        bye: [],
        paused: [],
        games: [
          { winnerId: 'red', loserId: 'blue', winnerScore: 11, loserScore: 0, courtNumber: '1' },
          {
            winnerId: 'green',
            loserId: 'yellow',
            winnerScore: 11,
            loserScore: 0,
            courtNumber: '2',
          },
        ],
      },
    ];
    const st = rebuildStandings(ids, history);
    const r = generateRound(st, 2, 1, history, []);
    const lastPairs = new Set(['blue|red', 'green|yellow']);
    const newPairs = r.courts.map(([a, b]) => [a.id, b.id].sort().join('|'));
    newPairs.forEach((p) => expect(lastPairs.has(p)).toBe(false));
  });

  it('excludes paused teams from the courts', () => {
    const st = mkStandings(['red', 'blue', 'green', 'yellow']);
    const r = generateRound(st, 2, 0, [], ['yellow']);
    const onCourt = r.courts.flat().map((t) => t.id);
    expect(onCourt).not.toContain('yellow');
    expect(r.paused.map((t) => t.id)).toContain('yellow');
  });
});
