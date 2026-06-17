// Builds CSV rows/content for DUPR's bulk match-import format.

import { getTPTGamesForMatchup } from './threePlayerTeam';
import type { TournamentMode, TPTTeam, TPTPlayer, RoundEntry } from '../types';

export const DUPR_CSV_HEADER = [
  'matchType',
  'event',
  'date',
  'playerA1',
  'playerA1DuprId',
  'playerA1ExternalId',
  'playerA2',
  'playerA2DuprId',
  'playerA2ExternalId',
  'playerB1',
  'playerB1DuprId',
  'playerB1ExternalId',
  'playerB2',
  'playerB2DuprId',
  'playerB2ExternalId',
  'teamAGame1',
  'teamBGame1',
  'teamAGame2',
  'teamBGame2',
  'teamAGame3',
  'teamBGame3',
  'teamAGame4',
  'teamBGame4',
  'teamAGame5',
  'teamBGame5',
  'location',
  'scoreType',
];

export const BLANK_PLAYER = { name: '', duprId: '' };

interface PlayerLike {
  name?: string;
  duprId?: string;
}

// A player is "complete" once it has both a name and a DUPR ID — anything less
// is worth surfacing to the admin for editing before export (blanks are still
// exported fine; this is just what the modal offers to fill in).
export function playerNeedsInfo(p: PlayerLike | null | undefined): boolean {
  return !p || !p.name?.trim() || !p.duprId?.trim();
}

// Quote-escapes a CSV field per RFC4180 — only quotes when needed.
export function csvField(value: string | number | null | undefined): string {
  const s = value == null ? '' : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

interface RowParams {
  playerA1: PlayerLike;
  playerA2: PlayerLike;
  playerB1: PlayerLike;
  playerB2: PlayerLike;
  scoreA: number | string;
  scoreB: number | string;
}

function makeRow({
  playerA1,
  playerA2,
  playerB1,
  playerB2,
  scoreA,
  scoreB,
}: RowParams): Record<string, string | number> {
  return {
    matchType: 'D',
    playerA1: playerA1.name || '',
    playerA1DuprId: playerA1.duprId || '',
    playerA1ExternalId: '',
    playerA2: playerA2.name || '',
    playerA2DuprId: playerA2.duprId || '',
    playerA2ExternalId: '',
    playerB1: playerB1.name || '',
    playerB1DuprId: playerB1.duprId || '',
    playerB1ExternalId: '',
    playerB2: playerB2.name || '',
    playerB2DuprId: playerB2.duprId || '',
    playerB2ExternalId: '',
    teamAGame1: scoreA,
    teamBGame1: scoreB,
    teamAGame2: '',
    teamBGame2: '',
    teamAGame3: '',
    teamBGame3: '',
    teamAGame4: '',
    teamBGame4: '',
    teamAGame5: '',
    teamBGame5: '',
  };
}

// Every player who appears in a TPT history matchup, deduped — used by the
// export modal to find players missing a DUPR ID and offer to fill it in.
// Players brought in via tptSubstitutions are included too, since they're who
// actually appears in the export rows.
export function collectTPTPlayerIds({
  history,
  tptTeams,
  tptSubstitutions = {},
}: {
  history: RoundEntry[];
  tptTeams: Record<string, TPTTeam>;
  tptSubstitutions?: Record<string, any>;
}): string[] {
  const ids = new Set<string>();
  history.forEach((h, ri) => {
    if (!h.tptMatchups) return;
    h.tptMatchups.forEach((m, mi) => {
      for (const team of [tptTeams[m.teamAId], tptTeams[m.teamBId]]) {
        if (!team) continue;
        (team.maleIds || []).forEach((id) => ids.add(id));
        if (team.femaleId) ids.add(team.femaleId);
      }
      (m.games || []).forEach((_, gi) => {
        const subs = tptSubstitutions[`${ri}_${mi}_${gi}`] || {};
        Object.values(subs).forEach((id: any) => ids.add(id));
      });
    });
  });
  return [...ids];
}

// Every player who appears in a Doubles RR history court, deduped — used by
// the export modal to find players missing a DUPR ID.
export function collectDoublesRRPlayerIds({ history }: { history: RoundEntry[] }): string[] {
  const ids = new Set<string>();
  for (const h of history) {
    if (!h.doublesRRCourts) continue;
    for (const court of h.doublesRRCourts) {
      ((court as any).teamA || []).forEach((id: string) => ids.add(id));
      ((court as any).teamB || []).forEach((id: string) => ids.add(id));
    }
  }
  return [...ids];
}

// Every team that appears in a Swiss/RR history game, deduped — used by the
// export modal to find teams missing player names/DUPR IDs.
export function collectSwissTeamIds({ history }: { history: RoundEntry[] }): string[] {
  const ids = new Set<string>();
  for (const h of history) {
    if (h.tptMatchups) continue;
    for (const g of h.games || []) {
      ids.add(g.winnerId);
      ids.add(g.loserId);
    }
  }
  return [...ids];
}

function buildTPTRows({
  history,
  tptTeams,
  tptPlayers,
  tptSubstitutions = {},
}: {
  history: RoundEntry[];
  tptTeams: Record<string, TPTTeam>;
  tptPlayers: Record<string, TPTPlayer>;
  tptSubstitutions?: Record<string, any>;
}): Record<string, string | number>[] {
  const rows: Record<string, string | number>[] = [];
  history.forEach((h, ri) => {
    if (!h.tptMatchups) return;
    h.tptMatchups.forEach((matchup, mi) => {
      const teamA = tptTeams[matchup.teamAId];
      const teamB = tptTeams[matchup.teamBId];
      if (!teamA || !teamB) return;
      const gameDefs = getTPTGamesForMatchup(teamA, teamB);
      (matchup.games || []).forEach((game, gi) => {
        const def = gameDefs[gi];
        if (!def || !game) return;
        const subs = tptSubstitutions[`${ri}_${mi}_${gi}`] || {};
        const applySub = (id: string) => subs[id] || id;
        const [pA1, pA2] = def.sideA.map((id) => tptPlayers[applySub(id)] || BLANK_PLAYER);
        const [pB1, pB2] = def.sideB.map((id) => tptPlayers[applySub(id)] || BLANK_PLAYER);
        const aWon = game.winnerTeamId === teamA.id;
        const scoreA = aWon ? game.winnerScore : game.loserScore;
        const scoreB = aWon ? game.loserScore : game.winnerScore;
        rows.push(
          makeRow({ playerA1: pA1, playerA2: pA2, playerB1: pB1, playerB2: pB2, scoreA, scoreB })
        );
      });
    });
  });
  return rows;
}

// Doubles RR partnerships ARE the rows — no game-definition step needed,
// each court's teamA/teamB 2-id arrays map straight to playerA1/A2 & playerB1/B2.
function buildDoublesRRRows({
  history,
  doublesRRPlayers,
}: {
  history: RoundEntry[];
  doublesRRPlayers: Record<string, any>;
}): Record<string, string | number>[] {
  const rows: Record<string, string | number>[] = [];
  for (const h of history) {
    if (!h.doublesRRCourts) continue;
    for (const court of h.doublesRRCourts) {
      const { winnerIds, loserIds, winnerScore, loserScore } = court as any;
      if (!winnerIds || !loserIds) continue;
      const teamA = (court as any).teamA || [];
      const teamB = (court as any).teamB || [];
      const [pA1, pA2] = teamA.map((id: string) => doublesRRPlayers[id] || BLANK_PLAYER);
      const [pB1, pB2] = teamB.map((id: string) => doublesRRPlayers[id] || BLANK_PLAYER);
      const aWon = winnerIds.join(',') === teamA.join(',');
      const scoreA = aWon ? winnerScore : loserScore;
      const scoreB = aWon ? loserScore : winnerScore;
      rows.push(
        makeRow({ playerA1: pA1, playerA2: pA2, playerB1: pB1, playerB2: pB2, scoreA, scoreB })
      );
    }
  }
  return rows;
}

function buildSwissRows({
  history,
  teamById,
}: {
  history: RoundEntry[];
  teamById: (id: string) => any;
}): Record<string, string | number>[] {
  const rows: Record<string, string | number>[] = [];
  for (const h of history) {
    if (h.tptMatchups) continue;
    for (const game of h.games || []) {
      const winner = teamById(game.winnerId);
      const loser = teamById(game.loserId);
      if (!winner || !loser) continue;
      const [wA1, wA2] =
        winner.players?.length === 2 ? winner.players : [BLANK_PLAYER, BLANK_PLAYER];
      const [lB1, lB2] = loser.players?.length === 2 ? loser.players : [BLANK_PLAYER, BLANK_PLAYER];
      rows.push(
        makeRow({
          playerA1: wA1,
          playerA2: wA2,
          playerB1: lB1,
          playerB2: lB2,
          scoreA: game.winnerScore,
          scoreB: game.loserScore,
        })
      );
    }
  }
  return rows;
}

// Returns the CSV rows — plain objects keyed by DUPR_CSV_HEADER columns (minus
// event/date/location, which are filled in by the caller via buildDUPRCsv).
// Every completed game produces a row; players/teams missing name or DUPR ID
// data are exported with blank fields rather than being skipped.
export function buildDUPRRows({
  history,
  tournamentMode,
  tptTeams = {},
  tptPlayers = {},
  tptSubstitutions = {},
  doublesRRPlayers = {},
  teamById,
}: {
  history: RoundEntry[];
  tournamentMode: TournamentMode;
  tptTeams?: Record<string, TPTTeam>;
  tptPlayers?: Record<string, TPTPlayer>;
  tptSubstitutions?: Record<string, any>;
  doublesRRPlayers?: Record<string, any>;
  teamById: (id: string) => any;
}): Record<string, string | number>[] {
  if (tournamentMode === 'tpt')
    return buildTPTRows({ history, tptTeams, tptPlayers, tptSubstitutions });
  if (tournamentMode === 'doublesrr') return buildDoublesRRRows({ history, doublesRRPlayers });
  return buildSwissRows({ history, teamById });
}

// Joins the header + rows into a full CSV string, filling in event/date/location/scoreType
// for every row — these are export-wide settings chosen by the admin, not per-game data.
export function buildDUPRCsv(
  rows: Record<string, string | number>[],
  {
    eventName,
    date,
    location,
    scoreType,
  }: { eventName: string; date: string; location: string; scoreType: string }
): string {
  const lines = [DUPR_CSV_HEADER.join(',')];
  for (const row of rows) {
    const full = { ...row, event: eventName, date, location, scoreType };
    lines.push(DUPR_CSV_HEADER.map((col) => csvField((full as any)[col])).join(','));
  }
  return lines.join('\r\n');
}

export function downloadCsv(filename: string, content: string): void {
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
