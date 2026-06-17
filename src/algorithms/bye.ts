import { pairKey } from './pairingUtils';

export interface ByeCounts {
  solo: Record<string, number>;
  pairs: Record<string, number>;
}

export function buildByeCounts(history: Array<{ bye?: string[] }>): ByeCounts {
  const solo: Record<string, number> = {},
    pairs: Record<string, number> = {};
  history.forEach((rd) => {
    const ids = rd.bye || [];
    ids.forEach((id) => {
      solo[id] = (solo[id] || 0) + 1;
    });
    for (let i = 0; i < ids.length; i++)
      for (let j = i + 1; j < ids.length; j++) {
        const k = pairKey(ids[i], ids[j]);
        pairs[k] = (pairs[k] || 0) + 1;
      }
  });
  return { solo, pairs };
}

export function scoreByeGroup(ids: string[], { solo, pairs }: ByeCounts): number {
  let ps = 0,
    ss = 0;
  for (let i = 0; i < ids.length; i++) {
    ss += solo[ids[i]] || 0;
    for (let j = i + 1; j < ids.length; j++) {
      const k = pairKey(ids[i], ids[j]);
      ps += pairs[k] || 0;
    }
  }
  return ps * 1000 + ss;
}

// Greedy bye selection — O(n log n) instead of exponential combinations.
// For each tier, score each candidate individually and pick the sl lowest-penalty ones.
export function greedySelectByes(
  byeGroup: Array<{ id: string }>,
  tier: Array<{ id: string }>,
  sl: number,
  byeCounts: ByeCounts
): Array<{ id: string }> {
  const scored = tier.map((t) => ({
    t,
    // Score as if this team joined the current byeGroup
    score: scoreByeGroup([...byeGroup.map((b) => b.id), t.id], byeCounts),
  }));
  scored.sort((a, b) => a.score - b.score);
  return scored.slice(0, sl).map((x) => x.t);
}
