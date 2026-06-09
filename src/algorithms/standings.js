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

export const DEFAULT_STANDINGS_TIEBREAK_ORDER = ['wins', 'scoreDiff', 'headToHead'];

export function rerank(st, order, history) {
  const criteria = order || ['wins', 'scoreDiff'];

  let h2h = null;
  if (criteria.includes('headToHead') && history && history.length > 0) {
    h2h = {};
    for (const rd of history) {
      for (const g of rd.games || []) {
        const wk = `${g.winnerId}_${g.loserId}`;
        const lk = `${g.loserId}_${g.winnerId}`;
        if (!h2h[wk]) h2h[wk] = { wins: 0, scoreDiff: 0 };
        if (!h2h[lk]) h2h[lk] = { wins: 0, scoreDiff: 0 };
        h2h[wk].wins++;
        const diff = (g.winnerScore || 0) - (g.loserScore || 0);
        h2h[wk].scoreDiff += diff;
        h2h[lk].scoreDiff -= diff;
      }
    }
  }

  return [...st].sort((a, b) => {
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
