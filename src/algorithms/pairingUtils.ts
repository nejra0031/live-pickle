// Canonical pair key — order-independent, used across pairing and doublesRR algorithms.
export function pairKey(a: string, b: string): string {
  return [a, b].sort().join('|');
}

// Greedy adjacent-swap pairing: given a pre-ordered list of items, group them
// into consecutive pairs, then try swapping adjacent members to find a lower
// score. Returns the best pairing found. scoreFn receives the full pairing
// array and returns a scalar (lower = better).
export function greedyAdjacentSwapPair<T>(
  items: T[],
  scoreFn: (pairs: [T, T][]) => number
): [T, T][] {
  const def: [T, T][] = [];
  for (let c = 0; c < Math.floor(items.length / 2); c++) def.push([items[c * 2], items[c * 2 + 1]]);
  let best = def,
    bs = scoreFn(def);
  for (let c = 0; c < def.length - 1; c++) {
    const s1 = def.map((p) => [...p] as [T, T]);
    [s1[c][1], s1[c + 1][0]] = [s1[c + 1][0], s1[c][1]];
    const sc1 = scoreFn(s1);
    if (sc1 < bs) {
      bs = sc1;
      best = s1;
    }
    const s2 = def.map((p) => [...p] as [T, T]);
    [s2[c][1], s2[c + 1][1]] = [s2[c + 1][1], s2[c][1]];
    const sc2 = scoreFn(s2);
    if (sc2 < bs) {
      bs = sc2;
      best = s2;
    }
  }
  return best;
}
