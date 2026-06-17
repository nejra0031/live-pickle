import { pairKey } from './pairingUtils';

// Circle-method round-robin → flattened into court-sized scheduling rounds.
// Returns array of scheduling rounds; each scheduling round is an array of [teamIdA, teamIdB] pairs.
//
// `startOffset` rotates the input order before running the circle method. The
// resulting schedule still pairs every team against every other team exactly
// once (a round robin is exhaustive — the pairing SET can't differ), but which
// pairs land in the same round/court, and in what order, changes. This is what
// "generate additional games" uses to avoid producing a byte-for-byte repeat
// of an existing schedule for the same roster.
export function generateRoundRobinSchedule(
  teamIds: string[],
  numCourts: number,
  startOffset = 0
): [string, string][][] {
  if (!teamIds || teamIds.length < 2) return [];
  const teams: (string | null)[] = [...teamIds];
  if (teams.length % 2 === 1) teams.push(null); // placeholder for odd count
  const n = teams.length;
  if (startOffset % n) {
    const o = ((startOffset % n) + n) % n;
    teams.unshift(...teams.splice(o));
  }
  const courts = Math.max(1, numCourts || 1);
  const scheduledRounds: [string, string][][] = [];

  for (let r = 0; r < n - 1; r++) {
    const matches: [string, string][] = [];
    for (let i = 0; i < n / 2; i++) {
      const a = teams[i],
        b = teams[n - 1 - i];
      if (a && b) matches.push([a, b]);
    }
    for (let i = 0; i < matches.length; i += courts)
      scheduledRounds.push(matches.slice(i, i + courts));
    // Rotate keeping teams[0] fixed
    teams.splice(1, 0, teams.pop()!);
  }
  return scheduledRounds;
}

// Generates a schedule covering only the given remaining pairs — used to
// regenerate the unplayed remainder of an in-progress round robin without
// repeating matchups that have already been played (a full round robin is
// exhaustive, so "another full round robin" for the same roster necessarily
// repeats every pair; completing the existing one instead guarantees no
// repeats by construction). Greedily groups pairs into maximal matchings (no
// team appears twice in the same matching — required so they can be played in
// parallel across courts), then splits each matching into court-sized
// scheduling rounds, mirroring the shape generateRoundRobinSchedule produces.
export function generateRemainingRoundRobinSchedule(
  teamIds: string[],
  playedPairKeys: Set<string>,
  numCourts: number
): [string, string][][] {
  if (!teamIds || teamIds.length < 2) return [];
  const remaining: [string, string][] = [];
  for (let i = 0; i < teamIds.length; i++) {
    for (let j = i + 1; j < teamIds.length; j++) {
      const a = teamIds[i],
        b = teamIds[j];
      if (!playedPairKeys.has(pairKey(a, b))) remaining.push([a, b]);
    }
  }
  if (!remaining.length) return [];
  const courts = Math.max(1, numCourts || 1);
  const scheduledRounds: [string, string][][] = [];
  let pool = remaining;
  while (pool.length) {
    const used = new Set<string>();
    const matching: [string, string][] = [];
    const leftover: [string, string][] = [];
    for (const pair of pool) {
      const [a, b] = pair;
      if (!used.has(a) && !used.has(b)) {
        matching.push(pair);
        used.add(a);
        used.add(b);
      } else {
        leftover.push(pair);
      }
    }
    for (let i = 0; i < matching.length; i += courts)
      scheduledRounds.push(matching.slice(i, i + courts));
    pool = leftover;
  }
  return scheduledRounds;
}
