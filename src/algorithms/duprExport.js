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

export const BLANK_PLAYER = { name: '', duprId: '' };

// A player is "complete" once it has both a name and a DUPR ID — anything less
// is worth surfacing to the admin for editing before export (blanks are still
// exported fine; this is just what the modal offers to fill in).
export function playerNeedsInfo(p) {
  return !p || !p.name?.trim() || !p.duprId?.trim();
}

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

// Every player who appears in a TPT history matchup, deduped — used by the
// export modal to find players missing a DUPR ID and offer to fill it in.
export function collectTPTPlayerIds({ history, tptTeams }) {
  const ids = new Set();
  for (const h of history) {
    if (!h.tptMatchups) continue;
    for (const m of h.tptMatchups) {
      for (const team of [tptTeams[m.teamAId], tptTeams[m.teamBId]]) {
        if (!team) continue;
        (team.maleIds || []).forEach(id => ids.add(id));
        if (team.femaleId) ids.add(team.femaleId);
      }
    }
  }
  return [...ids];
}

// Every team that appears in a Swiss/RR history game, deduped — used by the
// export modal to find teams missing player names/DUPR IDs.
export function collectSwissTeamIds({ history }) {
  const ids = new Set();
  for (const h of history) {
    if (h.tptMatchups) continue;
    for (const g of h.games || []) { ids.add(g.winnerId); ids.add(g.loserId); }
  }
  return [...ids];
}

function buildTPTRows({ history, tptTeams, tptPlayers }) {
  const rows = [];
  for (const h of history) {
    if (!h.tptMatchups) continue;
    for (const matchup of h.tptMatchups) {
      const teamA = tptTeams[matchup.teamAId];
      const teamB = tptTeams[matchup.teamBId];
      if (!teamA || !teamB) continue;
      const gameDefs = getTPTGamesForMatchup(teamA, teamB);
      (matchup.games || []).forEach((game, gi) => {
        const def = gameDefs[gi];
        if (!def || !game) return;
        const [pA1, pA2] = def.sideA.map(id => tptPlayers[id] || BLANK_PLAYER);
        const [pB1, pB2] = def.sideB.map(id => tptPlayers[id] || BLANK_PLAYER);
        const aWon = game.winnerTeamId === teamA.id;
        const scoreA = aWon ? game.winnerScore : game.loserScore;
        const scoreB = aWon ? game.loserScore : game.winnerScore;
        rows.push(makeRow({ playerA1: pA1, playerA2: pA2, playerB1: pB1, playerB2: pB2, scoreA, scoreB }));
      });
    }
  }
  return rows;
}

function buildSwissRows({ history, teamById }) {
  const rows = [];
  for (const h of history) {
    if (h.tptMatchups) continue;
    for (const game of h.games || []) {
      const winner = teamById(game.winnerId);
      const loser = teamById(game.loserId);
      if (!winner || !loser) continue;
      const [wA1, wA2] = (winner.players?.length === 2) ? winner.players : [BLANK_PLAYER, BLANK_PLAYER];
      const [lB1, lB2] = (loser.players?.length === 2) ? loser.players : [BLANK_PLAYER, BLANK_PLAYER];
      rows.push(makeRow({
        playerA1: wA1, playerA2: wA2, playerB1: lB1, playerB2: lB2,
        scoreA: game.winnerScore, scoreB: game.loserScore,
      }));
    }
  }
  return rows;
}

// Returns the CSV rows — plain objects keyed by DUPR_CSV_HEADER columns (minus
// event/date/location, which are filled in by the caller via buildDUPRCsv).
// Every completed game produces a row; players/teams missing name or DUPR ID
// data are exported with blank fields rather than being skipped.
export function buildDUPRRows({ history, tournamentMode, tptTeams = {}, tptPlayers = {}, teamById }) {
  return tournamentMode === 'tpt'
    ? buildTPTRows({ history, tptTeams, tptPlayers })
    : buildSwissRows({ history, teamById });
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
