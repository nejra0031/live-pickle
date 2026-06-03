// Schedule generation and standings for the 3-player team tournament format.

// Returns array of scheduling rounds, each: { matchups: [{teamAId, teamBId}], byeTeamId }
// Uses the same circle-method rotation as generateRoundRobinSchedule.
export function generateTPTSchedule(teamIds) {
  if (!teamIds || teamIds.length < 2) return [];
  const teams = [...teamIds];
  if (teams.length % 2 === 1) teams.push(null); // null = bye placeholder
  const n = teams.length;
  const schedule = [];

  for (let r = 0; r < n - 1; r++) {
    const matchups = [];
    let byeTeamId = null;
    for (let i = 0; i < n / 2; i++) {
      const a = teams[i], b = teams[n - 1 - i];
      if (a && b) matchups.push({ teamAId: a, teamBId: b });
      else if (a) byeTeamId = a;
      else if (b) byeTeamId = b;
    }
    schedule.push({ matchups, byeTeamId });
    teams.splice(1, 0, teams.pop());
  }
  return schedule;
}

// Returns the 3 game definitions for a team matchup.
// sideA/sideB are arrays of playerIds (2 each).
export function getTPTGamesForMatchup(teamA, teamB) {
  return [
    {
      type: 'males_doubles',
      label: 'Males doubles',
      sideA: [teamA.maleIds[0], teamA.maleIds[1]],
      sideB: [teamB.maleIds[0], teamB.maleIds[1]],
    },
    {
      type: 'mixed_a',
      label: 'Mixed doubles',
      sideA: [teamA.maleIds[0], teamA.femaleId],
      sideB: [teamB.maleIds[0], teamB.femaleId],
    },
    {
      type: 'mixed_b',
      label: 'Mixed doubles',
      sideA: [teamA.maleIds[1], teamA.femaleId],
      sideB: [teamB.maleIds[1], teamB.femaleId],
    },
  ];
}

// Builds team and player standings from committed results.
// Returns { teamStandings, playerStandings }
// teamStandings: [{ id, name, color, text, wins, losses, scoreDiff, played }] sorted wins DESC, diff DESC
// playerStandings: { [teamId]: [{ id, name, gender, wins, losses, scoreDiff, played }] }
export function buildTPTStandings(tptTeams, players, tptSchedule, tptResults) {
  const teamMap = {};
  const playerMap = {};
  const partnershipMap = {}; // key: sorted pids joined by '_'

  Object.values(tptTeams).forEach(team => {
    teamMap[team.id] = { id: team.id, name: team.name, color: team.color, text: team.text, wins: 0, losses: 0, scoreDiff: 0, played: 0 };
    const pids = [...(team.maleIds || []), team.femaleId].filter(Boolean);
    pids.forEach(pid => {
      const p = players[pid];
      if (p) playerMap[pid] = { id: pid, name: p.name, gender: p.gender, teamId: team.id, wins: 0, losses: 0, scoreDiff: 0, played: 0 };
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
        partnershipMap[k] = { playerIds, type, teamId: team.id, wins: 0, losses: 0, scoreDiff: 0, played: 0 };
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
    const teamA = tptTeams[teamAId], teamB = tptTeams[teamBId];
    if (!teamA || !teamB) return;

    const { winnerTeamId, loserTeamId, winnerScore, loserScore } = result;
    const diff = winnerScore - loserScore;

    if (teamMap[winnerTeamId]) { teamMap[winnerTeamId].wins++; teamMap[winnerTeamId].scoreDiff += diff; teamMap[winnerTeamId].played++; }
    if (teamMap[loserTeamId])  { teamMap[loserTeamId].losses++; teamMap[loserTeamId].scoreDiff -= diff; teamMap[loserTeamId].played++; }

    const games = getTPTGamesForMatchup(teamA, teamB);
    const game = games[gi];
    if (!game) return;

    const winnerIsA = winnerTeamId === teamAId;
    const winnerPids = winnerIsA ? game.sideA : game.sideB;
    const loserPids  = winnerIsA ? game.sideB : game.sideA;

    winnerPids.forEach(pid => { if (playerMap[pid]) { playerMap[pid].wins++; playerMap[pid].scoreDiff += diff; playerMap[pid].played++; } });
    loserPids.forEach(pid =>  { if (playerMap[pid]) { playerMap[pid].losses++; playerMap[pid].scoreDiff -= diff; playerMap[pid].played++; } });

    const wk = [...winnerPids].sort().join('_'), lk = [...loserPids].sort().join('_');
    if (partnershipMap[wk]) { partnershipMap[wk].wins++; partnershipMap[wk].scoreDiff += diff; partnershipMap[wk].played++; }
    if (partnershipMap[lk]) { partnershipMap[lk].losses++; partnershipMap[lk].scoreDiff -= diff; partnershipMap[lk].played++; }
  });

  const teamStandings = Object.values(teamMap).sort((a, b) =>
    b.wins !== a.wins ? b.wins - a.wins : b.scoreDiff - a.scoreDiff
  );

  const playerStandings = {};
  const partnershipStandings = {};
  Object.values(tptTeams).forEach(team => {
    const pids = [...(team.maleIds || []), team.femaleId].filter(Boolean);
    playerStandings[team.id] = pids.map(pid => playerMap[pid]).filter(Boolean);
    const [m1, m2] = (team.maleIds || []).filter(Boolean);
    const f = team.femaleId;
    partnershipStandings[team.id] = [
      [...[m1, m2].filter(Boolean)].sort().join('_'),
      [...[m1, f].filter(Boolean)].sort().join('_'),
      [...[m2, f].filter(Boolean)].sort().join('_'),
    ].map(k => partnershipMap[k]).filter(Boolean);
  });

  return { teamStandings, playerStandings, partnershipStandings };
}
