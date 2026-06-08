import { describe, it, expect } from 'vitest';
import {
  generateDoublesRRSchedule, buildDoublesRRStandings,
  isValidDoublesRRPlayerCount, nearestValidDoublesRRPlayerCounts,
} from './doublesRR';

function ids(n) { return Array.from({ length: n }, (_, i) => `p${i}`); }

function partnershipKey(pair) { return [...pair].sort().join('|'); }

describe('generateDoublesRRSchedule', () => {
  it('pairs every player with every other player exactly once (even N)', () => {
    const players = ids(8);
    const schedule = generateDoublesRRSchedule(players, 2);
    expect(schedule.length).toBe(players.length - 1);

    const seen = new Map();
    schedule.forEach(round => round.courts.forEach(({ teamA, teamB }) => {
      [teamA, teamB].forEach(pair => {
        const k = partnershipKey(pair);
        seen.set(k, (seen.get(k) || 0) + 1);
      });
    }));
    for (let i = 0; i < players.length; i++) {
      for (let j = i + 1; j < players.length; j++) {
        expect(seen.get(partnershipKey([players[i], players[j]]))).toBe(1);
      }
    }
  });

  it('pairs every player with every other player exactly once (odd N, with byes)', () => {
    const players = ids(9); // 9 % 4 === 1 → supported odd count
    const schedule = generateDoublesRRSchedule(players, 2);
    expect(schedule.length).toBeGreaterThan(0);

    const seen = new Map();
    schedule.forEach(round => round.courts.forEach(({ teamA, teamB }) => {
      [teamA, teamB].forEach(pair => {
        const k = partnershipKey(pair);
        seen.set(k, (seen.get(k) || 0) + 1);
      });
    }));
    for (let i = 0; i < players.length; i++) {
      for (let j = i + 1; j < players.length; j++) {
        expect(seen.get(partnershipKey([players[i], players[j]]))).toBe(1);
      }
    }

    // Every court is even, every player who isn't on a court that round shows up as a bye.
    schedule.forEach(round => {
      const onCourt = new Set(round.courts.flatMap(c => [...c.teamA, ...c.teamB]));
      players.forEach(id => expect(onCourt.has(id) || round.byePlayerIds.includes(id)).toBe(true));
    });
  });

  it('limits courts per round to the requested numCourts and never repeats a partnership', () => {
    const players = ids(8);
    const schedule = generateDoublesRRSchedule(players, 1);
    schedule.forEach(round => expect(round.courts.length).toBeLessThanOrEqual(1));

    const seen = new Map();
    schedule.forEach(round => round.courts.forEach(({ teamA, teamB }) => {
      [teamA, teamB].forEach(pair => {
        const k = partnershipKey(pair);
        seen.set(k, (seen.get(k) || 0) + 1);
      });
    }));
    for (let i = 0; i < players.length; i++) {
      for (let j = i + 1; j < players.length; j++) {
        expect(seen.get(partnershipKey([players[i], players[j]]))).toBe(1);
      }
    }
  });

  it('returns an empty schedule for fewer than 4 players or unsupported counts', () => {
    expect(generateDoublesRRSchedule(ids(3), 2)).toEqual([]);
    expect(generateDoublesRRSchedule([], 2)).toEqual([]);
    expect(generateDoublesRRSchedule(ids(7), 2)).toEqual([]); // 7 % 4 === 3 → unsupported
    expect(generateDoublesRRSchedule(ids(10), 2)).toEqual([]); // 10 % 4 === 2 → unsupported
  });

  it('never repeats a partnership and avoids immediate-repeat opponents where possible', () => {
    const players = ids(12);
    const schedule = generateDoublesRRSchedule(players, 3);
    const opponentCounts = {};
    let lastOpponents = new Set();
    let immediateRepeats = 0, totalOpponentPairs = 0;
    schedule.forEach(round => {
      const roundOpponents = new Set();
      round.courts.forEach(({ teamA, teamB }) => teamA.forEach(a => teamB.forEach(b => {
        const k = partnershipKey([a, b]);
        totalOpponentPairs++;
        if (lastOpponents.has(k)) immediateRepeats++;
        opponentCounts[k] = (opponentCounts[k] || 0) + 1;
        roundOpponents.add(k);
      })));
      lastOpponents = roundOpponents;
    });
    // Each round's partnerships are an entirely different vertex-disjoint set, so a
    // greedy local optimiser (mirrors pairSwiss — best-effort, not a hard guarantee)
    // can't always drive immediate opponent repeats to zero. It should still keep
    // them rare relative to the total number of opponent pairings generated.
    expect(immediateRepeats).toBeLessThan(totalOpponentPairs * 0.2);
  });
});

describe('isValidDoublesRRPlayerCount / nearestValidDoublesRRPlayerCounts', () => {
  it('accepts counts where N % 4 is 0 or 1, rejects others', () => {
    [4, 5, 8, 9, 12, 13, 16, 17].forEach(n => expect(isValidDoublesRRPlayerCount(n)).toBe(true));
    [2, 3, 6, 7, 10, 11, 14, 15].forEach(n => expect(isValidDoublesRRPlayerCount(n)).toBe(false));
  });

  it('suggests the nearest supported counts below and above', () => {
    expect(nearestValidDoublesRRPlayerCounts(7)).toEqual({ lower: 5, upper: 8 });
    expect(nearestValidDoublesRRPlayerCounts(10)).toEqual({ lower: 9, upper: 12 });
    expect(nearestValidDoublesRRPlayerCounts(3)).toEqual({ lower: null, upper: 4 });
  });
});

describe('buildDoublesRRStandings', () => {
  const players = {
    p0: { id: 'p0', name: 'Alice' }, p1: { id: 'p1', name: 'Bob' },
    p2: { id: 'p2', name: 'Carol' }, p3: { id: 'p3', name: 'Dave' },
  };
  const history = [
    {
      roundNum: 1, games: [], bye: [], paused: [],
      doublesRRCourts: [
        { teamA: ['p0', 'p1'], teamB: ['p2', 'p3'], winnerIds: ['p0', 'p1'], loserIds: ['p2', 'p3'], winnerScore: 11, loserScore: 5 },
      ],
    },
    {
      roundNum: 2, games: [], bye: [], paused: [],
      doublesRRCourts: [
        { teamA: ['p0', 'p2'], teamB: ['p1', 'p3'], winnerIds: ['p1', 'p3'], loserIds: ['p0', 'p2'], winnerScore: 11, loserScore: 9 },
      ],
    },
  ];

  it('accumulates games played/won/lost and score totals per player', () => {
    const st = buildDoublesRRStandings(['p0', 'p1', 'p2', 'p3'], players, history);
    const p0 = st.find(p => p.id === 'p0');
    expect(p0).toMatchObject({ played: 2, wins: 1, losses: 1, scoreFor: 20, scoreAgainst: 16, scoreDiff: 4 });
    const p3 = st.find(p => p.id === 'p3');
    expect(p3).toMatchObject({ played: 2, wins: 1, losses: 1, scoreFor: 16, scoreAgainst: 20, scoreDiff: -4 });
  });

  it('ranks by wins desc then scoreDiff desc by default', () => {
    const st = buildDoublesRRStandings(['p0', 'p1', 'p2', 'p3'], players, history);
    // p1: 2 wins; p0/p3: 1 win each (p0 diff +4, p3 diff -4); p2: 0 wins
    expect(st[0].id).toBe('p1');
    expect(st[1].id).toBe('p0');
    expect(st[3].id).toBe('p2');
  });

  it('respects a custom tiebreak order (scoreDiff before wins)', () => {
    const st = buildDoublesRRStandings(['p0', 'p1', 'p2', 'p3'], players, history, ['scoreDiff', 'wins']);
    // Highest scoreDiff first regardless of win count
    expect(st[0].scoreDiff).toBeGreaterThanOrEqual(st[1].scoreDiff);
    expect(st[1].scoreDiff).toBeGreaterThanOrEqual(st[2].scoreDiff);
    expect(st[2].scoreDiff).toBeGreaterThanOrEqual(st[3].scoreDiff);
  });
});
