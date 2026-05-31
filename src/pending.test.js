import { describe, it, expect } from 'vitest';
import { reindexPendingAfterRemoval } from './pending';

describe('reindexPendingAfterRemoval', () => {
  it('drops the removed index and shifts higher ones down', () => {
    const pending = { court_0: 'a', court_1: 'b', court_2: 'c' };
    expect(reindexPendingAfterRemoval(pending, 'court_', [1])).toEqual({ court_0: 'a', court_1: 'c' });
  });

  it('leaves lower indices unchanged', () => {
    const pending = { court_0: 'a', court_2: 'c' };
    expect(reindexPendingAfterRemoval(pending, 'court_', [1])).toEqual({ court_0: 'a', court_1: 'c' });
  });

  it('preserves keys outside the prefix', () => {
    const pending = { court_0: 'a', live_0: 'L', rr_0_1: 'R' };
    expect(reindexPendingAfterRemoval(pending, 'court_', [0])).toEqual({ live_0: 'L', rr_0_1: 'R' });
  });

  it('handles the live_ prefix independently of court_', () => {
    const pending = { court_0: 'a', live_0: 'x', live_1: 'y', live_2: 'z' };
    expect(reindexPendingAfterRemoval(pending, 'live_', [0])).toEqual({ court_0: 'a', live_0: 'y', live_1: 'z' });
  });

  it('shifts cumulatively when several indices are removed', () => {
    const pending = { court_0: 'a', court_1: 'b', court_2: 'c', court_3: 'd', court_4: 'e' };
    // remove 1 and 3 → survivors 0,2,4 → reindexed to 0,1,2
    expect(reindexPendingAfterRemoval(pending, 'court_', new Set([1, 3]))).toEqual({ court_0: 'a', court_1: 'c', court_2: 'e' });
  });

  it('accepts an array or a Set equivalently', () => {
    const pending = { court_0: 'a', court_1: 'b' };
    expect(reindexPendingAfterRemoval(pending, 'court_', [0]))
      .toEqual(reindexPendingAfterRemoval(pending, 'court_', new Set([0])));
  });

  it('does not mutate the input and returns a new object', () => {
    const pending = { court_0: 'a' };
    const out = reindexPendingAfterRemoval(pending, 'court_', [99]);
    expect(out).not.toBe(pending);
    expect(pending).toEqual({ court_0: 'a' });
    expect(out).toEqual({ court_0: 'a' }); // index 99 not present, nothing changes
  });
});
