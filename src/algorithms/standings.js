import { teamByIdModule } from '../constants';

// scoreDiff: cumulative (winnerScore − loserScore) per game; negative on a loss
export function mkStandings(ids) {
  return ids.map(id => ({
    ...teamByIdModule(id),
    id,
    wins: 0, losses: 0, scoreDiff: 0, played: 0,
    lastPlayedRound: -999, lastByeRound: -999,
  }));
}

export function rerank(st) {
  return [...st].sort((a, b) => {
    if (b.wins      !== a.wins)      return b.wins      - a.wins;
    if (b.scoreDiff !== a.scoreDiff) return b.scoreDiff - a.scoreDiff;
    return a.played - b.played;
  });
}

export function rebuildStandings(ids, history) {
  const map = Object.fromEntries(mkStandings(ids).map(t => [t.id, { ...t }]));
  history.forEach((rd, ri) => {
    rd.games.forEach(g => {
      const w = map[g.winnerId], l = map[g.loserId];
      if (!w || !l) return;
      w.wins++;     w.scoreDiff += g.winnerScore - g.loserScore; w.played++; w.lastPlayedRound = ri;
      l.losses++;   l.scoreDiff += g.loserScore  - g.winnerScore; l.played++; l.lastPlayedRound = ri;
    });
    (rd.bye || []).forEach(id => { if (map[id]) map[id].lastByeRound = ri; });
  });
  return Object.values(map);
}
