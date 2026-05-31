// Re-index the keyed entries of a pendingResults map after one or more indexed
// games are removed. `prefix` is the key family ('court_' or 'live_'). Removed
// indices are dropped; every higher index shifts down by the number of removed
// indices below it. Keys outside `prefix` are copied through unchanged.
//
// Consolidates the identical index-shifting logic that previously lived inline at
// three call sites (remove-active-court, remove-live-addition, courts-made-social).
export function reindexPendingAfterRemoval(pending, prefix, removedIndices) {
  const removed = removedIndices instanceof Set ? removedIndices : new Set(removedIndices);
  const sorted  = [...removed].sort((a, b) => a - b);
  const out = {};
  Object.keys(pending).forEach(k => {
    if (!k.startsWith(prefix)) { out[k] = pending[k]; return; }
    const ki = parseInt(k.slice(prefix.length), 10);
    if (removed.has(ki)) return; // dropped
    const shift = sorted.filter(r => r < ki).length;
    out[`${prefix}${ki - shift}`] = pending[k];
  });
  return out;
}
