// Schedule generation and standings for the 3-player team tournament format.

import { playerDisplayName } from '../utils/nameDisplay';
import type { TPTTeam, TPTPlayer, TPTSchedule, TPTResults, TPTSubstitutions } from '../types';

export function formatTPTTeamLabel(
  team: TPTTeam | null | undefined,
  tptPlayers: Record<string, TPTPlayer>,
  mode: string
): string {
  if (!team) return '';
  const allIds = [...(team.maleIds || []), team.femaleId].filter(Boolean);
  const playerNames = allIds
    .map((pid) => playerDisplayName(tptPlayers[pid]))
    .filter(Boolean)
    .join(' & ');
  if (mode === 'players') return playerNames || team.name;
  if (mode === 'both') return playerNames ? `${team.name} (${playerNames})` : team.name;
  return team.name;
}

// Returns array of scheduling rounds, each: { matchups: [{teamAId, teamBId}], byeTeamId }
// Uses the same circle-method rotation as generateRoundRobinSchedule.
export function generateTPTSchedule(teamIds: string[]): TPTSchedule {
  if (!teamIds || teamIds.length < 2) return [];
  const teams: (string | null)[] = [...teamIds];
  if (teams.length % 2 === 1) teams.push(null); // null = bye placeholder
  const n = teams.length;
  const schedule: TPTSchedule = [];

  for (let r = 0; r < n - 1; r++) {
    const matchups: { teamAId: string; teamBId: string }[] = [];
    let byeTeamId: string | null = null;
    for (let i = 0; i < n / 2; i++) {
      const a = teams[i],
        b = teams[n - 1 - i];
      if (a && b) matchups.push({ teamAId: a, teamBId: b });
      else if (a) byeTeamId = a;
      else if (b) byeTeamId = b;
    }
    schedule.push({ matchups, byeTeamId });
    teams.splice(1, 0, teams.pop()!);
  }
  return schedule;
}

interface TPTGameDef {
  type: string;
  label: string;
  sideA: [string, string];
  sideB: [string, string];
}

// Returns the 3 game definitions for a team matchup.
// sideA/sideB are arrays of playerIds (2 each).
export function getTPTGamesForMatchup(teamA: TPTTeam, teamB: TPTTeam): TPTGameDef[] {
  return [
    {
      type: 'males_doubles',
      label: 'Males doubles',
      sideA: [teamA.maleIds[0], teamA.maleIds[1]],
      sideB: [teamB.maleIds[0], teamB.maleIds[1]],
    },
    {
      type: 'mixed_a',
      label: 'Mixed doubles #1',
      sideA: [teamA.maleIds[0], teamA.femaleId],
      sideB: [teamB.maleIds[0], teamB.femaleId],
    },
    {
      type: 'mixed_b',
      label: 'Mixed doubles #2',
      sideA: [teamA.maleIds[1], teamA.femaleId],
      sideB: [teamB.maleIds[1], teamB.femaleId],
    },
  ];
}

// Builds team and player standings from committed results.
// Returns { teamStandings, playerStandings }
// teamStandings: [{ id, name, color, text, wins, losses, scoreDiff, played }] sorted by tiebreakOrder
// playerStandings: { [teamId]: [{ id, name, gender, wins, losses, scoreDiff, played }] }
export function buildTPTStandings(
  tptTeams: Record<string, TPTTeam>,
  players: Record<string, TPTPlayer>,
  tptSchedule: TPTSchedule,
  tptResults: TPTResults,
  tiebreakOrder: string[],
  tptSubstitutions: TPTSubstitutions = {}
) {
  const criteria = tiebreakOrder && tiebreakOrder.length ? tiebreakOrder : ['wins', 'scoreDiff'];
  const teamMap: Record<string, any> = {};
  const playerMap: Record<string, any> = {};
  const partnershipMap: Record<string, any> = {}; // key: sorted pids joined by '_'

  Object.values(tptTeams).forEach((team) => {
    teamMap[team.id] = {
      id: team.id,
      name: team.name,
      color: team.color,
      text: team.text,
      wins: 0,
      losses: 0,
      scoreDiff: 0,
      played: 0,
    };
    const pids = [...(team.maleIds || []), team.femaleId].filter(Boolean);
    pids.forEach((pid) => {
      const p = players[pid];
      if (p)
        playerMap[pid] = {
          id: pid,
          name: (p as any).nickname || p.name,
          gender: p.gender,
          teamId: team.id,
          wins: 0,
          losses: 0,
          scoreDiff: 0,
          played: 0,
        };
    });
    const [m1, m2] = (team.maleIds || []).filter(Boolean);
    const f = team.femaleId;
    [
      { playerIds: [m1, m2].filter(Boolean), type: 'males' },
      { playerIds: [m1, f].filter(Boolean), type: 'mixed' },
      { playerIds: [m2, f].filter(Boolean), type: 'mixed' },
    ].forEach(({ playerIds, type }) => {
      if (playerIds.length === 2) {
        const k = [...playerIds].sort().join('_');
        partnershipMap[k] = {
          playerIds,
          type,
          teamId: team.id,
          wins: 0,
          losses: 0,
          scoreDiff: 0,
          played: 0,
        };
      }
    });
  });

  Object.entries(tptResults).forEach(([key, result]) => {
    if (!result) return;
    const parts = key.split('_');
    if (parts.length !== 3) return;
    const [ri, mi, gi] = parts.map(Number);
    const schedRound = tptSchedule[ri];
    if (!schedRound) return;
    const matchup = schedRound.matchups?.[mi];
    if (!matchup) return;

    const { teamAId, teamBId } = matchup;
    const teamA = tptTeams[teamAId],
      teamB = tptTeams[teamBId];
    if (!teamA || !teamB) return;

    const { winnerTeamId, loserTeamId, winnerScore, loserScore } = result;
    const diff = winnerScore - loserScore;

    if (teamMap[winnerTeamId]) {
      teamMap[winnerTeamId].wins++;
      teamMap[winnerTeamId].scoreDiff += diff;
      teamMap[winnerTeamId].played++;
    }
    if (teamMap[loserTeamId]) {
      teamMap[loserTeamId].losses++;
      teamMap[loserTeamId].scoreDiff -= diff;
      teamMap[loserTeamId].played++;
    }

    const games = getTPTGamesForMatchup(teamA, teamB);
    const game = games[gi];
    if (!game) return;

    const subs = (tptSubstitutions as any)[key] || {};
    const applySub = (pid: string) => subs[pid] || pid;
    const sideA = (game.sideA || []).map(applySub);
    const sideB = (game.sideB || []).map(applySub);

    const winnerIsA = winnerTeamId === teamAId;
    const winnerPids = winnerIsA ? sideA : sideB;
    const loserPids = winnerIsA ? sideB : sideA;

    winnerPids.forEach((pid: string) => {
      if (playerMap[pid]) {
        playerMap[pid].wins++;
        playerMap[pid].scoreDiff += diff;
        playerMap[pid].played++;
      }
    });
    loserPids.forEach((pid: string) => {
      if (playerMap[pid]) {
        playerMap[pid].losses++;
        playerMap[pid].scoreDiff -= diff;
        playerMap[pid].played++;
      }
    });

    const wk = [...winnerPids].sort().join('_'),
      lk = [...loserPids].sort().join('_');
    if (partnershipMap[wk]) {
      partnershipMap[wk].wins++;
      partnershipMap[wk].scoreDiff += diff;
      partnershipMap[wk].played++;
    }
    if (partnershipMap[lk]) {
      partnershipMap[lk].losses++;
      partnershipMap[lk].scoreDiff -= diff;
      partnershipMap[lk].played++;
    }
  });

  // Build H2H matchup-win map when needed.
  // A team wins a head-to-head matchup by winning 2 of the 3 individual games.
  let h2h: Record<string, any> | null = null;
  if (criteria.includes('headToHead')) {
    h2h = {};
    tptSchedule.forEach((round, ri) => {
      (round.matchups || []).forEach((matchup, mi) => {
        const { teamAId, teamBId } = matchup;
        let aWins = 0,
          bWins = 0,
          aScoreDiff = 0;
        for (let gi = 0; gi < 3; gi++) {
          const r = tptResults[`${ri}_${mi}_${gi}`];
          if (!r) continue;
          const diff = (r.winnerScore || 0) - (r.loserScore || 0);
          if (r.winnerTeamId === teamAId) {
            aWins++;
            aScoreDiff += diff;
          } else if (r.winnerTeamId === teamBId) {
            bWins++;
            aScoreDiff -= diff;
          }
        }
        if (aWins + bWins === 0) return;
        const ak = `${teamAId}_${teamBId}`,
          bk = `${teamBId}_${teamAId}`;
        if (!h2h![ak]) h2h![ak] = { wins: 0, scoreDiff: 0 };
        if (!h2h![bk]) h2h![bk] = { wins: 0, scoreDiff: 0 };
        if (aWins >= 2) {
          h2h![ak].wins++;
          h2h![ak].scoreDiff += aScoreDiff;
          h2h![bk].scoreDiff -= aScoreDiff;
        } else if (bWins >= 2) {
          h2h![bk].wins++;
          h2h![bk].scoreDiff -= aScoreDiff;
          h2h![ak].scoreDiff += aScoreDiff;
        }
      });
    });
  }

  const teamStandings = Object.values(teamMap).sort((a: any, b: any) => {
    for (const c of criteria) {
      if (c === 'wins' && b.wins !== a.wins) return b.wins - a.wins;
      if (c === 'scoreDiff' && b.scoreDiff !== a.scoreDiff) return b.scoreDiff - a.scoreDiff;
      if (c === 'headToHead' && h2h) {
        const as = h2h[`${a.id}_${b.id}`] || { wins: 0, scoreDiff: 0 };
        const bs = h2h[`${b.id}_${a.id}`] || { wins: 0, scoreDiff: 0 };
        if (as.wins !== bs.wins) return bs.wins - as.wins;
        if (as.scoreDiff !== bs.scoreDiff) return bs.scoreDiff - as.scoreDiff;
      }
    }
    return 0;
  });

  const playerStandings: Record<string, any[]> = {};
  const partnershipStandings: Record<string, any[]> = {};
  Object.values(tptTeams).forEach((team) => {
    const pids = [...(team.maleIds || []), team.femaleId].filter(Boolean);
    playerStandings[team.id] = pids.map((pid) => playerMap[pid]).filter(Boolean);
    const [m1, m2] = (team.maleIds || []).filter(Boolean);
    const f = team.femaleId;
    partnershipStandings[team.id] = [
      [...[m1, m2].filter(Boolean)].sort().join('_'),
      [...[m1, f].filter(Boolean)].sort().join('_'),
      [...[m2, f].filter(Boolean)].sort().join('_'),
    ]
      .map((k) => partnershipMap[k])
      .filter(Boolean);
  });

  return { teamStandings, playerStandings, partnershipStandings };
}
