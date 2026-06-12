import { describe, it, expect } from 'vitest';
import {
  csvField, buildDUPRRows, buildDUPRCsv, DUPR_CSV_HEADER,
  playerNeedsInfo, collectTPTPlayerIds, collectSwissTeamIds,
} from './duprExport';

describe('csvField', () => {
  it('leaves plain values unquoted', () => {
    expect(csvField('Jane Doe')).toBe('Jane Doe');
    expect(csvField(11)).toBe('11');
    expect(csvField('')).toBe('');
    expect(csvField(undefined)).toBe('');
  });

  it('quotes and escapes values containing commas, quotes, or newlines', () => {
    expect(csvField('Madison Square Garden, New York')).toBe('"Madison Square Garden, New York"');
    expect(csvField('She said "hi"')).toBe('"She said ""hi"""');
    expect(csvField('line1\nline2')).toBe('"line1\nline2"');
  });
});

describe('playerNeedsInfo', () => {
  it('flags missing/blank name or DUPR ID', () => {
    expect(playerNeedsInfo(undefined)).toBe(true);
    expect(playerNeedsInfo({ name: '', duprId: '' })).toBe(true);
    expect(playerNeedsInfo({ name: 'Jane', duprId: '' })).toBe(true);
    expect(playerNeedsInfo({ name: '', duprId: 'AB12C3' })).toBe(true);
    expect(playerNeedsInfo({ name: 'Jane', duprId: 'AB12C3' })).toBe(false);
  });
});

describe('buildDUPRRows — TPT mode', () => {
  const tptTeams = {
    teamA: { id: 'teamA', maleIds: ['m1', 'm2'], femaleId: 'f1' },
    teamB: { id: 'teamB', maleIds: ['m3', 'm4'], femaleId: 'f2' },
  };
  const tptPlayers = {
    m1: { id: 'm1', name: 'Alex', duprId: 'AB12C3' },
    m2: { id: 'm2', name: 'Sam', duprId: 'DE45F6' },
    f1: { id: 'f1', name: 'Jane', duprId: 'GH78I9' },
    m3: { id: 'm3', name: 'Chris', duprId: 'JK01L2' },
    m4: { id: 'm4', name: 'Pat', duprId: 'MN34O5' },
    f2: { id: 'f2', name: 'Robin', duprId: 'PQ67R8' },
  };

  it('emits one row per game with the correct sides and scores', () => {
    const history = [{
      roundNum: 1,
      tptMatchups: [{
        teamAId: 'teamA', teamBId: 'teamB',
        games: [
          { winnerTeamId: 'teamA', loserTeamId: 'teamB', winnerScore: 11, loserScore: 5 },
          { winnerTeamId: 'teamB', loserTeamId: 'teamA', winnerScore: 11, loserScore: 8 },
          { winnerTeamId: 'teamA', loserTeamId: 'teamB', winnerScore: 11, loserScore: 9 },
        ],
      }],
    }];
    const { rows } = buildDUPRRowsResult(history, tptTeams, tptPlayers);
    expect(rows).toHaveLength(3);

    // Males doubles — teamA won
    expect(rows[0]).toMatchObject({
      playerA1: 'Alex', playerA1DuprId: 'AB12C3', playerA2: 'Sam', playerA2DuprId: 'DE45F6',
      playerB1: 'Chris', playerB1DuprId: 'JK01L2', playerB2: 'Pat', playerB2DuprId: 'MN34O5',
      teamAGame1: 11, teamBGame1: 5, matchType: 'D',
    });
    // Mixed #1 — teamB won, so the score must still align with side A/B (not winner/loser)
    expect(rows[1]).toMatchObject({
      playerA1: 'Alex', playerA2: 'Jane', playerB1: 'Chris', playerB2: 'Robin',
      teamAGame1: 8, teamBGame1: 11,
    });
  });

  it('still emits a row with blank player fields when a player record is missing', () => {
    const sparsePlayers = { ...tptPlayers, f2: undefined };
    const history = [{
      roundNum: 1,
      tptMatchups: [{
        teamAId: 'teamA', teamBId: 'teamB',
        games: [
          { winnerTeamId: 'teamA', loserTeamId: 'teamB', winnerScore: 11, loserScore: 5 },
          { winnerTeamId: 'teamA', loserTeamId: 'teamB', winnerScore: 11, loserScore: 8 },
        ],
      }],
    }];
    const { rows } = buildDUPRRowsResult(history, tptTeams, sparsePlayers);
    expect(rows).toHaveLength(2);
    expect(rows[1]).toMatchObject({ playerB2: '', playerB2DuprId: '' });
  });

  it('exports the substitute player in place of the rostered player', () => {
    const history = [{
      roundNum: 1,
      tptMatchups: [{
        teamAId: 'teamA', teamBId: 'teamB',
        games: [
          { winnerTeamId: 'teamA', loserTeamId: 'teamB', winnerScore: 11, loserScore: 5 },
        ],
      }],
    }];
    // Game 0 is "males_doubles": sideA = [m1, m2]. Substitute m1 -> f1.
    const tptSubstitutions = { '0_0_0': { m1: 'f1' } };
    const rows = buildDUPRRows({ history, tournamentMode: 'tpt', tptTeams, tptPlayers, tptSubstitutions });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ playerA1: 'Jane', playerA1DuprId: 'GH78I9', playerA2: 'Sam', playerA2DuprId: 'DE45F6' });
  });

  function buildDUPRRowsResult(history, tptTeams, tptPlayers) {
    const rows = buildDUPRRows({ history, tournamentMode: 'tpt', tptTeams, tptPlayers });
    return { rows };
  }
});

describe('buildDUPRRows — swiss/round-robin mode', () => {
  const teams = {
    red: { id: 'red', name: 'Red', players: [{ name: 'Jane Doe', duprId: 'AB12C3' }, { name: 'Alex Smith', duprId: 'DE45F6' }] },
    blue: { id: 'blue', name: 'Blue', players: [{ name: 'Sam Lee', duprId: 'GH78I9' }, { name: 'Chris Park', duprId: 'JK01L2' }] },
    green: { id: 'green', name: 'Green' }, // no players configured
  };
  const teamById = id => teams[id];

  it('emits a row per game for teams with complete player info', () => {
    const history = [{ roundNum: 1, games: [{ winnerId: 'red', loserId: 'blue', winnerScore: 11, loserScore: 7, courtNumber: '1' }] }];
    const rows = buildDUPRRows({ history, tournamentMode: 'swiss', teamById });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      playerA1: 'Jane Doe', playerA1DuprId: 'AB12C3', playerA2: 'Alex Smith', playerA2DuprId: 'DE45F6',
      playerB1: 'Sam Lee', playerB1DuprId: 'GH78I9', playerB2: 'Chris Park', playerB2DuprId: 'JK01L2',
      teamAGame1: 11, teamBGame1: 7,
    });
  });

  it('still emits a row with blank player fields when a team has no player info', () => {
    const history = [{ roundNum: 1, games: [
      { winnerId: 'red', loserId: 'green', winnerScore: 11, loserScore: 3, courtNumber: '1' },
      { winnerId: 'red', loserId: 'blue', winnerScore: 11, loserScore: 9, courtNumber: '2' },
    ] }];
    const rows = buildDUPRRows({ history, tournamentMode: 'swiss', teamById });
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ playerB1: '', playerB1DuprId: '', playerB2: '', playerB2DuprId: '', teamAGame1: 11, teamBGame1: 3 });
    expect(rows[1]).toMatchObject({ playerB1: 'Sam Lee', playerB1DuprId: 'GH78I9' });
  });
});

describe('collectTPTPlayerIds / collectSwissTeamIds', () => {
  it('dedupes players appearing across TPT matchups', () => {
    const tptTeams = { A: { id: 'A', maleIds: ['m1', 'm2'], femaleId: 'f1' }, B: { id: 'B', maleIds: ['m3', 'm4'], femaleId: 'f2' } };
    const history = [
      { roundNum: 1, tptMatchups: [{ teamAId: 'A', teamBId: 'B', games: [] }] },
      { roundNum: 2, tptMatchups: [{ teamAId: 'A', teamBId: 'B', games: [] }] },
    ];
    expect(collectTPTPlayerIds({ history, tptTeams }).sort()).toEqual(['f1', 'f2', 'm1', 'm2', 'm3', 'm4']);
  });

  it('dedupes teams appearing across swiss/RR games and ignores TPT rounds', () => {
    const history = [
      { roundNum: 1, games: [{ winnerId: 'red', loserId: 'blue' }, { winnerId: 'red', loserId: 'green' }] },
      { roundNum: 2, tptMatchups: [{ teamAId: 'X', teamBId: 'Y', games: [] }] },
    ];
    expect(collectSwissTeamIds({ history }).sort()).toEqual(['blue', 'green', 'red']);
  });
});

describe('buildDUPRCsv', () => {
  it('produces the exact DUPR header followed by escaped row data', () => {
    const rows = [{
      matchType: 'D',
      playerA1: 'Jane Doe', playerA1DuprId: 'AB12C3', playerA1ExternalId: '',
      playerA2: 'Alex Smith', playerA2DuprId: 'DE45F6', playerA2ExternalId: '',
      playerB1: 'Sam Lee', playerB1DuprId: 'GH78I9', playerB1ExternalId: '',
      playerB2: 'Chris Park', playerB2DuprId: 'JK01L2', playerB2ExternalId: '',
      teamAGame1: 11, teamBGame1: 5, teamAGame2: 11, teamBGame2: 7,
      teamAGame3: '', teamBGame3: '', teamAGame4: '', teamBGame4: '', teamAGame5: '', teamBGame5: '',
    }];
    const csv = buildDUPRCsv(rows, { eventName: 'Tuesday Night League', date: '2025-01-15', location: 'Madison Square Garden, 4 Pennsylvania Plaza, New York, NY 10001', scoreType: 'SIDEOUT' });
    const lines = csv.split('\r\n');
    expect(lines[0]).toBe(DUPR_CSV_HEADER.join(','));
    expect(lines[1]).toBe(
      'D,Tuesday Night League,2025-01-15,Jane Doe,AB12C3,,Alex Smith,DE45F6,,Sam Lee,GH78I9,,Chris Park,JK01L2,,' +
      '11,5,11,7,,,,,,,"Madison Square Garden, 4 Pennsylvania Plaza, New York, NY 10001",SIDEOUT'
    );
  });
});
