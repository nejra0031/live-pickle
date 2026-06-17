import { describe, it, expect } from 'vitest';
import { generateRemainingRoundRobinSchedule } from './roundRobin';

function ids(n) {
  return Array.from({ length: n }, (_, i) => `t${i}`);
}
function pairKey(a, b) {
  return [a, b].sort().join('|');
}
function allPairKeys(teamIds) {
  const keys = new Set();
  for (let i = 0; i < teamIds.length; i++)
    for (let j = i + 1; j < teamIds.length; j++) keys.add(pairKey(teamIds[i], teamIds[j]));
  return keys;
}

describe('generateRemainingRoundRobinSchedule', () => {
  it('schedules exactly the pairs that have not yet played, each exactly once', () => {
    const teams = ids(6);
    const played = new Set([pairKey('t0', 't1'), pairKey('t2', 't3'), pairKey('t0', 't4')]);
    const schedule = generateRemainingRoundRobinSchedule(teams, played, 2);

    const seen = new Map();
    schedule.forEach((round) =>
      round.forEach(([a, b]) => {
        const k = pairKey(a, b);
        seen.set(k, (seen.get(k) || 0) + 1);
      })
    );

    const expected = [...allPairKeys(teams)].filter((k) => !played.has(k));
    expect([...seen.keys()].sort()).toEqual(expected.sort());
    seen.forEach((count) => expect(count).toBe(1));
    expect(seen.has(pairKey('t0', 't1'))).toBe(false);
    expect(seen.has(pairKey('t2', 't3'))).toBe(false);
    expect(seen.has(pairKey('t0', 't4'))).toBe(false);
  });

  it('never schedules the same team twice within a single round (so courts can run in parallel)', () => {
    const teams = ids(8);
    const played = new Set([pairKey('t0', 't1')]);
    const schedule = generateRemainingRoundRobinSchedule(teams, played, 3);
    schedule.forEach((round) => {
      const seenTeams = new Set();
      round.forEach(([a, b]) => {
        expect(seenTeams.has(a)).toBe(false);
        expect(seenTeams.has(b)).toBe(false);
        seenTeams.add(a);
        seenTeams.add(b);
      });
    });
  });

  it('caps the number of matches per scheduling round at numCourts', () => {
    const teams = ids(8);
    const schedule = generateRemainingRoundRobinSchedule(teams, new Set(), 2);
    schedule.forEach((round) => expect(round.length).toBeLessThanOrEqual(2));
  });

  it('handles odd team counts without pairing a team with itself', () => {
    const teams = ids(5);
    const schedule = generateRemainingRoundRobinSchedule(teams, new Set(), 2);
    const seen = new Map();
    schedule.forEach((round) =>
      round.forEach(([a, b]) => {
        expect(a).not.toBe(b);
        const k = pairKey(a, b);
        seen.set(k, (seen.get(k) || 0) + 1);
      })
    );
    expect([...seen.keys()].sort()).toEqual([...allPairKeys(teams)].sort());
    seen.forEach((count) => expect(count).toBe(1));
  });

  it('returns an empty schedule when every pair has already played', () => {
    const teams = ids(4);
    const schedule = generateRemainingRoundRobinSchedule(teams, allPairKeys(teams), 2);
    expect(schedule).toEqual([]);
  });

  it('returns an empty schedule for fewer than two teams', () => {
    expect(generateRemainingRoundRobinSchedule(['t0'], new Set(), 2)).toEqual([]);
    expect(generateRemainingRoundRobinSchedule([], new Set(), 2)).toEqual([]);
  });
});
