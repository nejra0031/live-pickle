import { rerank } from './standings';
import { buildByeCounts, greedySelectByes } from './bye';
import { pairKey, greedyAdjacentSwapPair } from './pairingUtils';
import type { Standing, RoundEntry } from '../types';

type StandingExt = Standing & { played: number; lastByeRound?: number; [key: string]: unknown };

export function buildMatchupCounts(history: RoundEntry[]): Record<string, number> {
  const c: Record<string, number> = {};
  history.forEach((rd) =>
    rd.games.forEach((g) => {
      const k = pairKey(g.winnerId, g.loserId);
      c[k] = (c[k] || 0) + 1;
    })
  );
  return c;
}

export function getLastRoundMatchups(history: RoundEntry[]): Set<string> {
  if (!history.length) return new Set();
  const s = new Set<string>();
  history[history.length - 1].games.forEach((g) => s.add(pairKey(g.winnerId, g.loserId)));
  return s;
}

function scoreCourtPairings(
  courts: [StandingExt, StandingExt][],
  mc: Record<string, number>,
  lrm: Set<string>
): number {
  let s = 0;
  courts.forEach(([a, b]) => {
    const k = pairKey(a.id, b.id);
    if (lrm.has(k)) s += 100000;
    s += (mc[k] || 0) * 1000;
  });
  return s;
}

// Seeded bracket: pair team[i] vs team[floor(n/2) + i] by registration order.
// The last team is the odd-team-out when n is odd and has no seeded partner.
function computeSeededPairs(allSt: StandingExt[]): [string, string][] {
  const n = allSt.length;
  const half = Math.floor(n / 2);
  const pairs: [string, string][] = [];
  for (let i = 0; i < half; i++) pairs.push([allSt[i].id, allSt[half + i].id]);
  return pairs;
}

function pairSwiss(
  playing: StandingExt[],
  allSt: StandingExt[],
  mc: Record<string, number>,
  lrm: Set<string>
): [StandingExt, StandingExt][] {
  const ranked = rerank(allSt);
  const rankOf = (id: string) => {
    const i = ranked.findIndex((t) => t.id === id);
    return i === -1 ? 9999 : i;
  };
  const byRank = [...playing].sort((a, b) => rankOf(b.id) - rankOf(a.id));
  return greedyAdjacentSwapPair(byRank, (courts) => scoreCourtPairings(courts, mc, lrm));
}

function selectByes(
  didnt: StandingExt[],
  hadBye: StandingExt[],
  numBye: number,
  byeCounts: ReturnType<typeof buildByeCounts>
): StandingExt[] {
  const byeGroup: StandingExt[] = [];
  if (didnt.length >= numBye) {
    const byMostPlayed = [...didnt].sort((a, b) => b.played - a.played);
    let idx = 0;
    while (byeGroup.length < numBye && idx < byMostPlayed.length) {
      const cur = byMostPlayed[idx].played,
        tier: StandingExt[] = [];
      while (idx < byMostPlayed.length && byMostPlayed[idx].played === cur)
        tier.push(byMostPlayed[idx++]);
      const sl = numBye - byeGroup.length;
      if (tier.length <= sl) byeGroup.push(...tier);
      else byeGroup.push(...(greedySelectByes(byeGroup, tier, sl, byeCounts) as StandingExt[]));
    }
  } else {
    byeGroup.push(...didnt);
    byeGroup.push(
      ...[...hadBye].sort((a, b) => b.played - a.played).slice(0, numBye - byeGroup.length)
    );
  }
  return byeGroup;
}

// fullSt: standings for ALL teams in registration order, used to compute seeded pairs.
// allSt may be a subset of fullSt when preset courts have removed some teams.
export function generateRound(
  allSt: StandingExt[],
  numCourts: number,
  roundIdx: number,
  history: RoundEntry[] = [],
  pausedIds: string[] = [],
  finalRound = false,
  fullSt: StandingExt[] | null = null
): { courts: [StandingExt, StandingExt][]; bye: StandingExt[]; paused: StandingExt[] } {
  const pSet = new Set(pausedIds);
  const allActive = allSt.filter((t) => !pSet.has(t.id));
  const mc = buildMatchupCounts(history);
  const lrm = getLastRoundMatchups(history);
  const lastByeSet =
    history.length > 0 ? new Set(history[history.length - 1].bye || []) : new Set<string>();
  const paused = allSt.filter((t) => pSet.has(t.id));

  // In final round mode, remove teams at max GP from the active pool and force them to bye.
  // This guarantees they always sit out regardless of the normal bye-selection heuristics.
  let active = allActive;
  let forcedFinalByes: StandingExt[] = [];
  let ec = numCourts;

  if (finalRound && allActive.length > 0) {
    const maxP = Math.max(...allActive.map((t) => t.played));
    const belowMax = allActive.filter((t) => t.played < maxP);
    if (belowMax.length >= 2) {
      forcedFinalByes = allActive.filter((t) => t.played === maxP);
      active = belowMax;
      ec = Math.min(numCourts, Math.floor(belowMax.length / 2));
    }
  }

  // Seeded pairs from registration order (use fullSt when available to get correct seeds)
  const seededPairIds = computeSeededPairs(fullSt || allSt);
  const seededPartner: Record<string, string> = {};
  seededPairIds.forEach(([a, b]) => {
    seededPartner[a] = b;
    seededPartner[b] = a;
  });

  const activeById = Object.fromEntries(active.map((t) => [t.id, t]));
  const activeIdSet = new Set(active.map((t) => t.id));

  // Ready seeded pairs: both teams are active (not paused, not in preset) and neither has played
  const readySeededPairs = seededPairIds.filter(
    ([aId, bId]) =>
      activeIdSet.has(aId) &&
      activeIdSet.has(bId) &&
      activeById[aId].played === 0 &&
      activeById[bId].played === 0
  );
  const inReadyPair = new Set(readySeededPairs.flatMap(([a, b]) => [a, b]));

  // Unseeded teams not in a ready pair
  const unseededNotReady = active.filter((t) => t.played === 0 && !inReadyPair.has(t.id));

  // Teams whose seeded partner is paused — ideally wait, but pair them together if courts are free
  const loneUnseededAll = unseededNotReady.filter(
    (t) => seededPartner[t.id] !== undefined && pSet.has(seededPartner[t.id])
  );
  // Teams with no seeded partner (odd-team-out) or whose partner already played — enter Swiss pool
  const partnerlessUnseeded = unseededNotReady.filter(
    (t) => seededPartner[t.id] === undefined || !pSet.has(seededPartner[t.id])
  );
  // Pair lone-unseeded teams together when >= 2 exist (rather than leaving courts empty)
  const lonePairCount = Math.floor(loneUnseededAll.length / 2);
  const loneSwiss = lonePairCount > 0 ? loneUnseededAll.slice(0, lonePairCount * 2) : [];
  const loneUnseeded = loneUnseededAll.slice(lonePairCount * 2); // odd one out still sits

  if (!active.some((t) => t.played === 0)) {
    // Pure Swiss — all teams have played at least once
    const numBye = active.length - ec * 2;
    if (numBye <= 0)
      return { courts: pairSwiss(active, allSt, mc, lrm), bye: forcedFinalByes, paused };
    const byeCounts = buildByeCounts(history);
    const byeGroup = selectByes(
      active.filter((t) => !lastByeSet.has(t.id)),
      active.filter((t) => lastByeSet.has(t.id)),
      numBye,
      byeCounts
    );
    const byeSet = new Set(byeGroup.map((t) => t.id));
    return {
      courts: pairSwiss(
        active.filter((t) => !byeSet.has(t.id)),
        allSt,
        mc,
        lrm
      ),
      bye: [...byeGroup, ...forcedFinalByes],
      paused,
    };
  }

  // Seeded phase: schedule ready pairs in seed order, fill remaining courts with Swiss
  const seededToPlay = readySeededPairs.slice(0, ec);
  const waitingUnseededTeams = readySeededPairs
    .slice(seededToPlay.length)
    .flatMap(([aId, bId]) => [activeById[aId], activeById[bId]]);
  const remainingCourts = ec - seededToPlay.length;

  // Swiss pool: already-played teams + partnerless unseeded + paired lone-unseeded
  const swissPool = [...active.filter((t) => t.played > 0), ...partnerlessUnseeded, ...loneSwiss];

  let swissCourts: [StandingExt, StandingExt][] = [],
    swissByeTeams: StandingExt[] = [];
  if (remainingCourts > 0 && swissPool.length >= 2) {
    const swissNumBye = swissPool.length - remainingCourts * 2;
    if (swissNumBye <= 0) {
      swissCourts = pairSwiss(swissPool, allSt, mc, lrm);
    } else {
      const byeCounts = buildByeCounts(history);
      const hadBye = swissPool.filter((t) => lastByeSet.has(t.id));
      const didnt = swissPool.filter((t) => !lastByeSet.has(t.id));
      swissByeTeams = selectByes(didnt, hadBye, swissNumBye, byeCounts);
      const swissByeSet = new Set(swissByeTeams.map((t) => t.id));
      swissCourts = pairSwiss(
        swissPool.filter((t) => !swissByeSet.has(t.id)),
        allSt,
        mc,
        lrm
      );
    }
  } else {
    swissByeTeams = swissPool;
  }

  return {
    courts: [
      ...seededToPlay.map(
        ([aId, bId]) => [activeById[aId], activeById[bId]] as [StandingExt, StandingExt]
      ),
      ...swissCourts,
    ],
    bye: [...loneUnseeded, ...waitingUnseededTeams, ...swissByeTeams, ...forcedFinalByes],
    paused,
  };
}
