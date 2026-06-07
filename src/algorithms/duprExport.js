// Builds CSV rows/content for DUPR's bulk match-import format.

import { getTPTGamesForMatchup } from './threePlayerTeam';

export const DUPR_CSV_HEADER = [
  'matchType', 'event', 'date',
  'playerA1', 'playerA1DuprId', 'playerA1ExternalId',
  'playerA2', 'playerA2DuprId', 'playerA2ExternalId',
  'playerB1', 'playerB1DuprId', 'playerB1ExternalId',
  'playerB2', 'playerB2DuprId', 'playerB2ExternalId',
  'teamAGame1', 'teamBGame1', 'teamAGame2', 'teamBGame2',
  'teamAGame3', 'teamBGame3', 'teamAGame4', 'teamBGame4',
  'teamAGame5', 'teamBGame5',
  'location', 'scoreType',
];

// Quote-escapes a CSV field per RFC4180 — only quotes when needed.
export function csvField(value) {
  const s = value == null ? '' : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function makeRow({ playerA1, playerA2, playerB1, playerB2, scoreA, scoreB }) {
  return {
    matchType: 'D',
    playerA1: playerA1.name, playerA1DuprId: playerA1.duprId || '', playerA1ExternalId: '',
    playerA2: playerA2.name, playerA2DuprId: playerA2.duprId || '', playerA2ExternalId: '',
    playerB1: playerB1.name, playerB1DuprId: playerB1.duprId || '', playerB1ExternalId: '',
    playerB2: playerB2.name, playerB2DuprId: playerB2.duprId || '', playerB2ExternalId: '',
    teamAGame1: scoreA, teamBGame1: scoreB,
    teamAGame2: '', teamBGame2: '', teamAGame3: '', teamBGame3: '', teamAGame4: '', teamBGame4: '', teamAGame5: '', teamBGame5: '',
    scoreType: 'SIDEOUT',
  };
}

function buildTPTRows({ history, tptTeams, tptPlayers }) {
  const rows = [];
  let skipped = 0;
  for (const h of history) {
    if (!h.tptMatchups) continue;
    for (const matchup of h.tptMatchups) {
      const teamA = tptTeams[matchup.teamAId];
      const teamB = tptTeams[matchup.teamBId];
      if (!teamA || !teamB) { skipped += (matchup.games || []).length; continue; }
      const gameDefs = getTPTGamesForMatchup(teamA, teamB);
      (matchup.games || []).forEach((game, gi) => {
        const def = gameDefs[gi];
        if (!def || !game) { skipped++; return; }
        const [pA1, pA2] = def.sideA.map(id => tptPlayers[id]);
        const [pB1, pB2] = def.sideB.map(id => tptPlayers[id]);
        if (!pA1 || !pA2 || !pB1 || !pB2) { skipped++; return; }
        const aWon = game.winnerTeamId === teamA.id;
        const scoreA = aWon ? game.winnerScore : game.loserScore;
        const scoreB = aWon ? game.loserScore : game.winnerScore;
        rows.push(makeRow({ playerA1: pA1, playerA2: pA2, playerB1: pB1, playerB2: pB2, scoreA, scoreB }));
      });
    }
  }
  return { rows, skipped };
}

function teamHasPlayers(team) {
  return Array.isArray(team?.players) && team.players.length === 2 && team.players.every(p => p?.name?.trim());
}

function buildSwissRows({ history, teamById }) {
  const rows = [];
  let skipped = 0;
  for (const h of history) {
    if (h.tptMatchups) continue;
    for (const game of h.games || []) {
      const winner = teamById(game.winnerId);
      const loser = teamById(game.loserId);
      if (!winner || !loser || !teamHasPlayers(winner) || !teamHasPlayers(loser)) { skipped++; continue; }
      const [wA1, wA2] = winner.players;
      const [lB1, lB2] = loser.players;
      rows.push(makeRow({
        playerA1: wA1, playerA2: wA2, playerB1: lB1, playerB2: lB2,
        scoreA: game.winnerScore, scoreB: game.loserScore,
      }));
    }
  }
  return { rows, skipped };
}

// Returns { rows, skipped } — `rows` are plain objects keyed by DUPR_CSV_HEADER columns
// (minus event/date/location, which are filled in by the caller via buildDUPRCsv).
export function buildDUPRRows({ history, tournamentMode, tptTeams = {}, tptPlayers = {}, teamById }) {
  if (tournamentMode === 'tpt') return buildTPTRows({ history, tptTeams, tptPlayers });
  return buildSwissRows({ history, teamById });
}

// Joins the header + rows into a full CSV string, filling in event/date/location for every row.
export function buildDUPRCsv(rows, { eventName, date, location }) {
  const lines = [DUPR_CSV_HEADER.join(',')];
  for (const row of rows) {
    const full = { ...row, event: eventName, date, location };
    lines.push(DUPR_CSV_HEADER.map(col => csvField(full[col])).join(','));
  }
  return lines.join('\r\n');
}

export function downloadCsv(filename, content) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
