import { describe, it, expect } from 'vitest';
import { buildTPTStandings } from './threePlayerTeam';

const players = {
  a1: { name: 'A1', gender: 'M' },
  a2: { name: 'A2', gender: 'M' },
  af: { name: 'AF', gender: 'F' },
  b1: { name: 'B1', gender: 'M' },
  b2: { name: 'B2', gender: 'M' },
  bf: { name: 'BF', gender: 'F' },
  c1: { name: 'C1', gender: 'M' },
  c2: { name: 'C2', gender: 'M' },
  cf: { name: 'CF', gender: 'F' },
};

const tptTeams = {
  A: { id: 'A', name: 'Team A', color: '#fff', text: '#000', maleIds: ['a1', 'a2'], femaleId: 'af' },
  B: { id: 'B', name: 'Team B', color: '#fff', text: '#000', maleIds: ['b1', 'b2'], femaleId: 'bf' },
  C: { id: 'C', name: 'Team C', color: '#fff', text: '#000', maleIds: ['c1', 'c2'], femaleId: 'cf' },
};

const tptSchedule = [
  { matchups: [{ teamAId: 'A', teamBId: 'B' }], byeTeamId: 'C' },
];

// Males doubles game (gi=0): sideA = [a1, a2], sideB = [b1, b2]. Team A wins 11-5.
const tptResults = {
  '0_0_0': { winnerTeamId: 'A', loserTeamId: 'B', winnerScore: 11, loserScore: 5 },
};

function findPlayer(playerStandings, teamId, pid) {
  return playerStandings[teamId].find(p => p.id === pid);
}

describe('buildTPTStandings', () => {
  it('credits the rostered players when there is no substitution', () => {
    const { teamStandings, playerStandings } = buildTPTStandings(tptTeams, players, tptSchedule, tptResults, ['wins', 'scoreDiff']);

    const teamA = teamStandings.find(t => t.id === 'A');
    expect(teamA.wins).toBe(1);
    expect(teamA.scoreDiff).toBe(6);

    expect(findPlayer(playerStandings, 'A', 'a1').wins).toBe(1);
    expect(findPlayer(playerStandings, 'A', 'a2').wins).toBe(1);
    expect(findPlayer(playerStandings, 'B', 'b1').losses).toBe(1);
    expect(findPlayer(playerStandings, 'B', 'b2').losses).toBe(1);
  });

  it('reassigns player credit to the substitute without changing team standings', () => {
    // a2's slot in this game was actually played by c1 (a player from a different team).
    const tptSubstitutions = {
      '0_0_0': { a2: 'c1' },
    };

    const { teamStandings, playerStandings } = buildTPTStandings(tptTeams, players, tptSchedule, tptResults, ['wins', 'scoreDiff'], tptSubstitutions);

    // Team-level results are untouched by the substitution.
    const teamA = teamStandings.find(t => t.id === 'A');
    const teamB = teamStandings.find(t => t.id === 'B');
    expect(teamA.wins).toBe(1);
    expect(teamA.scoreDiff).toBe(6);
    expect(teamB.losses).toBe(1);
    expect(teamB.scoreDiff).toBe(-6);

    // The substitute (c1) gains the win/scoreDiff for this game.
    const c1 = findPlayer(playerStandings, 'C', 'c1');
    expect(c1.wins).toBe(1);
    expect(c1.scoreDiff).toBe(6);
    expect(c1.played).toBe(1);

    // The originally-rostered player (a2) gets no credit for this game.
    const a2 = findPlayer(playerStandings, 'A', 'a2');
    expect(a2.wins).toBe(0);
    expect(a2.played).toBe(0);

    // a1 (not substituted) is unaffected.
    expect(findPlayer(playerStandings, 'A', 'a1').wins).toBe(1);
  });
});
