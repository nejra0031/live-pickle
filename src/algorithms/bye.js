export function buildByeCounts(history) {
  const solo = {}, pairs = {};
  history.forEach(rd => {
    const ids = rd.bye || [];
    ids.forEach(id => { solo[id] = (solo[id] || 0) + 1; });
    for (let i = 0; i < ids.length; i++)
      for (let j = i + 1; j < ids.length; j++) {
        const k = [ids[i], ids[j]].sort().join('|');
        pairs[k] = (pairs[k] || 0) + 1;
      }
  });
  return { solo, pairs };
}

export function scoreByeGroup(ids, { solo, pairs }) {
  let ps = 0, ss = 0;
  for (let i = 0; i < ids.length; i++) {
    ss += solo[ids[i]] || 0;
    for (let j = i + 1; j < ids.length; j++) {
      const k = [ids[i], ids[j]].sort().join('|');
      ps += pairs[k] || 0;
    }
  }
  return ps * 1000 + ss;
}

// Greedy bye selection — O(n log n) instead of exponential combinations.
// For each tier, score each candidate individually and pick the sl lowest-penalty ones.
export function greedySelectByes(byeGroup, tier, sl, byeCounts) {
  const scored = tier.map(t => ({
    t,
    // Score as if this team joined the current byeGroup
    score: scoreByeGroup([...byeGroup.map(b => b.id), t.id], byeCounts),
  }));
  scored.sort((a, b) => a.score - b.score);
  return scored.slice(0, sl).map(x => x.t);
}
