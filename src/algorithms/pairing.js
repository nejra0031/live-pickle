import { rerank } from './standings';
import { buildByeCounts, greedySelectByes } from './bye';

export function buildMatchupCounts(history) {
  const c = {};
  history.forEach(rd => rd.games.forEach(g => {
    const key = [g.winnerId, g.loserId].sort().join('|');
    c[key] = (c[key] || 0) + 1;
  }));
  return c;
}

export function getLastRoundMatchups(history) {
  if (!history.length) return new Set();
  const s = new Set();
  history[history.length - 1].games.forEach(g => s.add([g.winnerId, g.loserId].sort().join('|')));
  return s;
}

function scoreCourtPairings(courts, mc, lrm) {
  let s = 0;
  courts.forEach(([a, b]) => {
    const k = [a.id, b.id].sort().join('|');
    if (lrm.has(k)) s += 100000;
    s += (mc[k] || 0) * 1000;
  });
  return s;
}

// Seeded bracket: pair team[i] vs team[floor(n/2) + i] by registration order.
// The last team is the odd-team-out when n is odd and has no seeded partner.
function computeSeededPairs(allSt) {
  const n = allSt.length;
  const half = Math.floor(n / 2);
  const pairs = [];
  for (let i = 0; i < half; i++) pairs.push([allSt[i].id, allSt[half + i].id]);
  return pairs;
}

function pairSwiss(playing, allSt, mc, lrm) {
  const ranked = rerank(allSt);
  const rankOf = id => { const i = ranked.findIndex(t => t.id === id); return i === -1 ? 9999 : i; };
  const byRank = [...playing].sort((a, b) => rankOf(b.id) - rankOf(a.id));
  const def = [];
  for (let c = 0; c < Math.floor(byRank.length / 2); c++)
    def.push([byRank[c * 2], byRank[c * 2 + 1]]);
  let best = def, bs = scoreCourtPairings(def, mc, lrm);
  for (let c = 0; c < def.length - 1; c++) {
    const s1 = def.map(p => [...p]); [s1[c][1], s1[c+1][0]] = [s1[c+1][0], s1[c][1]];
    const sc1 = scoreCourtPairings(s1, mc, lrm); if (sc1 < bs) { bs = sc1; best = s1; }
    const s2 = def.map(p => [...p]); [s2[c][1], s2[c+1][1]] = [s2[c+1][1], s2[c][1]];
    const sc2 = scoreCourtPairings(s2, mc, lrm); if (sc2 < bs) { bs = sc2; best = s2; }
  }
  return best;
}

function selectByes(didnt, hadBye, numBye, byeCounts) {
  const byeGroup = [];
  if (didnt.length >= numBye) {
    const byMostPlayed = [...didnt].sort((a, b) => b.played - a.played);
    let idx = 0;
    while (byeGroup.length < numBye && idx < byMostPlayed.length) {
      const cur = byMostPlayed[idx].played, tier = [];
      while (idx < byMostPlayed.length && byMostPlayed[idx].played === cur) tier.push(byMostPlayed[idx++]);
      const sl = numBye - byeGroup.length;
      if (tier.length <= sl) byeGroup.push(...tier);
      else byeGroup.push(...greedySelectByes(byeGroup, tier, sl, byeCounts));
    }
  } else {
    byeGroup.push(...didnt);
    byeGroup.push(...[...hadBye].sort((a, b) => b.played - a.played).slice(0, numBye - byeGroup.length));
  }
  return byeGroup;
}

// fullSt: standings for ALL teams in registration order, used to compute seeded pairs.
// allSt may be a subset of fullSt when preset courts have removed some teams.
export function generateRound(allSt, numCourts, roundIdx, history = [], pausedIds = [], finalRound = false, fullSt = null) {
  const pSet        = new Set(pausedIds);
  const allActive   = allSt.filter(t => !pSet.has(t.id));
  const mc          = buildMatchupCounts(history);
  const lrm         = getLastRoundMatchups(history);
  const lastByeSet  = history.length > 0 ? new Set(history[history.length - 1].bye || []) : new Set();
  const paused      = allSt.filter(t => pSet.has(t.id));

  // In final round mode, remove teams at max GP from the active pool and force them to bye.
  // This guarantees they always sit out regardless of the normal bye-selection heuristics.
  let active = allActive;
  let forcedFinalByes = [];
  let ec = numCourts;

  if (finalRound && allActive.length > 0) {
    const maxP = Math.max(...allActive.map(t => t.played));
    const belowMax = allActive.filter(t => t.played < maxP);
    if (belowMax.length >= 2) {
      forcedFinalByes = allActive.filter(t => t.played === maxP);
      active = belowMax;
      ec = Math.min(numCourts, Math.floor(belowMax.length / 2));
    }
  }

  // Seeded pairs from registration order (use fullSt when available to get correct seeds)
  const seededPairIds = computeSeededPairs(fullSt || allSt);
  const seededPartner = {};
  seededPairIds.forEach(([a, b]) => { seededPartner[a] = b; seededPartner[b] = a; });

  const activeById  = Object.fromEntries(active.map(t => [t.id, t]));
  const activeIdSet = new Set(active.map(t => t.id));

  // Ready seeded pairs: both teams are active (not paused, not in preset) and neither has played
  const readySeededPairs = seededPairIds.filter(([aId, bId]) =>
    activeIdSet.has(aId) && activeIdSet.has(bId) &&
    activeById[aId].played === 0 && activeById[bId].played === 0
  );
  const inReadyPair = new Set(readySeededPairs.flatMap(([a, b]) => [a, b]));

  // Unseeded teams not in a ready pair
  const unseededNotReady = active.filter(t => t.played === 0 && !inReadyPair.has(t.id));

  // Teams whose seeded partner is paused — they wait this round
  const loneUnseeded = unseededNotReady.filter(t =>
    seededPartner[t.id] !== undefined && pSet.has(seededPartner[t.id])
  );
  // Teams with no seeded partner (odd-team-out) or whose partner already played — enter Swiss pool
  const partnerlessUnseeded = unseededNotReady.filter(t =>
    seededPartner[t.id] === undefined || !pSet.has(seededPartner[t.id])
  );

  if (!active.some(t => t.played === 0)) {
    // Pure Swiss — all teams have played at least once
    const numBye = active.length - ec * 2;
    if (numBye <= 0) return { courts: pairSwiss(active, allSt, mc, lrm), bye: forcedFinalByes, paused };
    const byeCounts = buildByeCounts(history);
    const byeGroup = selectByes(
      active.filter(t => !lastByeSet.has(t.id)),
      active.filter(t => lastByeSet.has(t.id)),
      numBye, byeCounts
    );
    const byeSet = new Set(byeGroup.map(t => t.id));
    return { courts: pairSwiss(active.filter(t => !byeSet.has(t.id)), allSt, mc, lrm), bye: [...byeGroup, ...forcedFinalByes], paused };
  }

  // Seeded phase: schedule ready pairs in seed order, fill remaining courts with Swiss
  const seededToPlay = readySeededPairs.slice(0, ec);
  const waitingUnseededTeams = readySeededPairs.slice(seededToPlay.length)
    .flatMap(([aId, bId]) => [activeById[aId], activeById[bId]]);
  const remainingCourts = ec - seededToPlay.length;

  // Swiss pool: already-played teams + partnerless unseeded
  const swissPool = [...active.filter(t => t.played > 0), ...partnerlessUnseeded];

  let swissCourts = [], swissByeTeams = [];
  if (remainingCourts > 0 && swissPool.length >= 2) {
    const swissNumBye = swissPool.length - remainingCourts * 2;
    if (swissNumBye <= 0) {
      swissCourts = pairSwiss(swissPool, allSt, mc, lrm);
    } else {
      const byeCounts = buildByeCounts(history);
      const hadBye = swissPool.filter(t => lastByeSet.has(t.id));
      const didnt  = swissPool.filter(t => !lastByeSet.has(t.id));
      swissByeTeams = selectByes(didnt, hadBye, swissNumBye, byeCounts);
      const swissByeSet = new Set(swissByeTeams.map(t => t.id));
      swissCourts = pairSwiss(swissPool.filter(t => !swissByeSet.has(t.id)), allSt, mc, lrm);
    }
  } else {
    swissByeTeams = swissPool;
  }

  return {
    courts: [
      ...seededToPlay.map(([aId, bId]) => [activeById[aId], activeById[bId]]),
      ...swissCourts,
    ],
    bye: [...loneUnseeded, ...waitingUnseededTeams, ...swissByeTeams, ...forcedFinalByes],
    paused,
  };
}
