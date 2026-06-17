import { generateRoundRobinSchedule } from './roundRobin';
import { pairKey, greedyAdjacentSwapPair } from './pairingUtils';
import { playerDisplayName } from '../utils/nameDisplay';
import type { DoublesRRPlayer } from '../types';

// Score how good a candidate set of court oppositions is — lower is better.
// Mirrors scoreCourtPairings in pairing.js, but counts INDIVIDUAL opponent-pair
// repeats (each court contributes 2x2 = 4 opponent pairs, one per cross-team duo).
function scoreCourtOppositions(
  courts: [string[], string[]][],
  opponentCounts: Record<string, number>,
  lastRoundOpponents: Set<string>
): number {
  let s = 0;
  courts.forEach(([teamA, teamB]) => {
    teamA.forEach((a) =>
      teamB.forEach((b) => {
        const k = pairKey(a, b);
        if (lastRoundOpponents.has(k)) s += 100000;
        s += (opponentCounts[k] || 0) * 1000;
      })
    );
  });
  return s;
}

// Greedy + adjacent-swap pairing of partnerships into 2v2 courts, minimising
// individual opponent repeats — delegates to greedyAdjacentSwapPair in pairingUtils.js.
function pairPartnershipsIntoCourts(
  partnerships: [string, string][],
  opponentCounts: Record<string, number>,
  lastRoundOpponents: Set<string>
): [string[], string[]][] {
  return greedyAdjacentSwapPair(partnerships, (courts) =>
    scoreCourtOppositions(courts as any, opponentCounts, lastRoundOpponents)
  ) as [string[], string[]][];
}

// Doubles RR requires every round to produce an even number of vertex-disjoint
// partnerships, so they can all pair into complete 2v2 courts with nobody
// permanently dropped. That holds exactly when floor(N/2) is even — i.e.
// N % 4 is 0 or 1 (4, 5, 8, 9, 12, 13, 16, 17, ...). For other counts there's
// structurally always exactly one leftover partnership every round, which would
// either have to sit out forever (breaking "partners with everyone exactly
// once") or cascade into open-ended rescheduling — so those counts aren't
// supported. The setup screen validates against this and suggests a fix.
export function isValidDoublesRRPlayerCount(n: number): boolean {
  return n >= 4 && Math.floor(n / 2) % 2 === 0;
}

// Nearest supported counts below/above n — used by the setup screen to say
// "you have 7 players, try 5 or 8".
export function nearestValidDoublesRRPlayerCounts(n: number): {
  lower: number | null;
  upper: number;
} {
  let lower = n;
  while (lower >= 4 && !isValidDoublesRRPlayerCount(lower)) lower--;
  let upper = n;
  while (!isValidDoublesRRPlayerCount(upper)) upper++;
  return { lower: lower >= 4 ? lower : null, upper };
}

// Tallies individual-opponent-pair counts from an already-generated schedule's
// court pairings — used to seed `priorOpponentCounts` when generating a follow-up
// schedule, so its court assignments are biased away from oppositions that have
// already occurred (partnerships are exhaustive over a full schedule and will
// necessarily recur, but who opposes whom within a court still has freedom).
export function countScheduleOpponentPairs(
  schedule: Array<{ courts: Array<{ teamA: string[]; teamB: string[] }> }>
): Record<string, number> {
  const counts: Record<string, number> = {};
  (schedule || []).forEach((round) => {
    (round.courts || []).forEach(({ teamA, teamB }) => {
      teamA.forEach((a) =>
        teamB.forEach((b) => {
          const k = pairKey(a, b);
          counts[k] = (counts[k] || 0) + 1;
        })
      );
    });
  });
  return counts;
}

interface DoublesRRScheduleOpts {
  startOffset?: number;
  priorOpponentCounts?: Record<string, number> | null;
}

// Generates a full Doubles RR schedule up front (like roundRobinSchedule/tptSchedule
// — not regenerated round to round). Built on the existing circle-method
// round-robin scheduler: feeding it player IDs and reinterpreting each "match"
// [p1, p2] as a PARTNERSHIP (rather than an opposition) gives — for free — a
// rotation of "logical rounds" where every player partners with every other
// player exactly once, and within each logical round every partnership is
// vertex-disjoint (each player appears in exactly one).
//
// `opts.startOffset` rotates the player order before the circle method runs, so
// a follow-up schedule partners people up in a different sequence rather than
// reproducing the same one. `opts.priorOpponentCounts` seeds the opposition
// tally with counts from an existing schedule (see `countScheduleOpponentPairs`)
// so the new schedule's court pairings actively avoid repeating those oppositions
// wherever the chunk structure allows — "generate additional games" uses both to
// produce a schedule that's structurally different from what came before.
export function generateDoublesRRSchedule(
  playerIds: string[],
  numCourts: number,
  opts: DoublesRRScheduleOpts = {}
): Array<{ courts: Array<{ teamA: string[]; teamB: string[] }>; byePlayerIds: string[] }> {
  if (!playerIds || playerIds.length < 4 || !isValidDoublesRRPlayerCount(playerIds.length))
    return [];

  const courts = Math.max(1, numCourts || 1);
  const chunkSize = courts * 2;
  const { startOffset = 0, priorOpponentCounts = null } = opts;
  let orderedIds = playerIds;
  if (startOffset % playerIds.length) {
    const o = ((startOffset % playerIds.length) + playerIds.length) % playerIds.length;
    orderedIds = [...playerIds.slice(o), ...playerIds.slice(0, o)];
  }
  const logicalRounds = generateRoundRobinSchedule(orderedIds, orderedIds.length);

  const opponentCounts: Record<string, number> = priorOpponentCounts
    ? { ...priorOpponentCounts }
    : {};
  let lastRoundOpponents = new Set<string>();
  const schedule: Array<{
    courts: Array<{ teamA: string[]; teamB: string[] }>;
    byePlayerIds: string[];
  }> = [];

  logicalRounds.forEach((partnerships, logicalIdx) => {
    // Rotate the partnership order each logical round so that, when a logical
    // round must be split across multiple physical rounds, who plays first
    // (and who benches) is spread evenly over the tournament.
    const rotation = partnerships.length ? logicalIdx % partnerships.length : 0;
    const rotated = [...partnerships.slice(rotation), ...partnerships.slice(0, rotation)];

    for (let i = 0; i < rotated.length; i += chunkSize) {
      const chunk = rotated.slice(i, i + chunkSize);
      const partneredIds = new Set(chunk.flat());
      const byePlayerIds = playerIds.filter((id) => !partneredIds.has(id));
      const courtPairs = pairPartnershipsIntoCourts(
        chunk as [string, string][],
        opponentCounts,
        lastRoundOpponents
      );

      const roundOpponents = new Set<string>();
      courtPairs.forEach(([teamA, teamB]) =>
        teamA.forEach((a) =>
          teamB.forEach((b) => {
            const k = pairKey(a, b);
            opponentCounts[k] = (opponentCounts[k] || 0) + 1;
            roundOpponents.add(k);
          })
        )
      );
      lastRoundOpponents = roundOpponents;

      schedule.push({
        courts: courtPairs.map(([teamA, teamB]) => ({ teamA, teamB })),
        byePlayerIds,
      });
    }
  });

  return schedule;
}

const TIEBREAK_CRITERIA: Record<string, (a: any, b: any, h2h?: any) => number> = {
  wins: (a, b) => b.wins - a.wins,
  scoreDiff: (a, b) => b.scoreDiff - a.scoreDiff,
  headToHead: (a, b, h2h) => {
    const rec = h2h[pairKey(a.id, b.id)];
    if (!rec || !rec[a.id] || !rec[b.id]) return 0;
    if (rec[b.id].wins !== rec[a.id].wins) return rec[b.id].wins - rec[a.id].wins;
    return rec[b.id].diff - rec[a.id].diff;
  },
};

export const DEFAULT_DOUBLES_RR_TIEBREAK_ORDER = ['wins', 'scoreDiff', 'headToHead'];

// Rebuilt from scratch from history each change (matches rebuildStandings/
// buildTPTStandings philosophy — no incremental updates). Produces per-player
// Games Played / Won / Lost / Score For / Score Against / Score Differential,
// ranked by an admin-configurable tiebreak order.
export function buildDoublesRRStandings(
  playerIds: string[],
  players: Record<string, DoublesRRPlayer>,
  history: Array<{
    doublesRRCourts?: Array<{
      winnerIds: string[];
      loserIds: string[];
      winnerScore: number;
      loserScore: number;
    }>;
  }>,
  tiebreakOrder: string[] = DEFAULT_DOUBLES_RR_TIEBREAK_ORDER
) {
  const map: Record<string, any> = Object.fromEntries(
    playerIds.map((id) => [
      id,
      {
        id,
        name: players[id]?.name || '?',
        color: players[id]?.color,
        text: players[id]?.text,
        played: 0,
        wins: 0,
        losses: 0,
        scoreFor: 0,
        scoreAgainst: 0,
        scoreDiff: 0,
      },
    ])
  );

  // Head-to-head: per unordered pair, tallies of wins/diff accrued while opposing each other.
  const h2h: Record<string, Record<string, { wins: number; diff: number }>> = {};

  history.forEach((rd) => {
    (rd.doublesRRCourts || []).forEach((g) => {
      const { winnerIds, loserIds, winnerScore, loserScore } = g;
      winnerIds.forEach((id) => {
        const p = map[id];
        if (!p) return;
        p.played++;
        p.wins++;
        p.scoreFor += winnerScore;
        p.scoreAgainst += loserScore;
        p.scoreDiff += winnerScore - loserScore;
      });
      loserIds.forEach((id) => {
        const p = map[id];
        if (!p) return;
        p.played++;
        p.losses++;
        p.scoreFor += loserScore;
        p.scoreAgainst += winnerScore;
        p.scoreDiff += loserScore - winnerScore;
      });
      winnerIds.forEach((w) =>
        loserIds.forEach((l) => {
          const k = pairKey(w, l);
          if (!h2h[k]) h2h[k] = {};
          h2h[k][w] = h2h[k][w] || { wins: 0, diff: 0 };
          h2h[k][l] = h2h[k][l] || { wins: 0, diff: 0 };
          h2h[k][w].wins++;
          h2h[k][w].diff += winnerScore - loserScore;
          h2h[k][l].diff += loserScore - winnerScore;
        })
      );
    });
  });

  const order =
    tiebreakOrder && tiebreakOrder.length ? tiebreakOrder : DEFAULT_DOUBLES_RR_TIEBREAK_ORDER;
  const list = Object.values(map);
  list.sort((a, b) => {
    for (const criterion of order) {
      const cmp = TIEBREAK_CRITERIA[criterion];
      if (!cmp) continue;
      const c = cmp(a, b, h2h);
      if (c !== 0) return c;
    }
    return a.played - b.played;
  });
  return list;
}

const SIDE_FALLBACK_COLOR = '#475569';
const SIDE_FALLBACK_TEXT = '#ffffff';

// Formats a single DoublesRR player's display name according to mode:
//   'name' / 'players' — nickname if set, otherwise real name
//   'both'             — "nickname (name)" if nickname set, otherwise name
export function formatPlayerName(
  player: (DoublesRRPlayer & { nickname?: string }) | null | undefined,
  mode: string
): string {
  if (!player) return '';
  if (mode === 'both')
    return (player as any).nickname ? `${(player as any).nickname} (${player.name})` : player.name;
  return playerDisplayName(player as any);
}

// Builds the chip-display data for a Doubles RR "side" (a synthetic, rotating
// 2-player partnership). When the two players have different individually-assigned
// colors, `chipBackground` carries a left-to-right gradient between them — renderers
// that support it should prefer `chipBackground` over `color` for backgrounds, while
// keeping `color` (always solid) for borders/shadows/text-contrast.
export function buildSidePresentation(
  playerIds: string[],
  playersById: Record<string, DoublesRRPlayer & { nickname?: string }>,
  mode = 'name'
) {
  const players = playerIds.map((id) => playersById[id]).filter(Boolean);
  const name = players.map((p) => formatPlayerName(p, mode)).join(' & ') || playerIds.join(' & ');
  const [a, b] = players;
  const color = a?.color || SIDE_FALLBACK_COLOR;
  const text = a?.text || SIDE_FALLBACK_TEXT;
  const chipBackground =
    a?.color && b?.color && a.color !== b.color
      ? `linear-gradient(90deg, ${a.color}, ${b.color})`
      : undefined;
  return { id: playerIds.join('|'), name, color, text, chipBackground };
}
