import { useState, useEffect, useCallback } from 'react';
import {
  get,
  clubsIndexRef,
  clubInfoRef,
  clubTournamentsRef,
  ensureClubsIndexBootstrapped,
  deleteTournament as fbDeleteTournament,
} from '../firebase';

export function useAllClubs() {
  const [clubs, setClubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await ensureClubsIndexBootstrapped();

      const idxSnap = await get(clubsIndexRef());
      const idx = idxSnap.val() ?? {};
      const clubIds = Object.keys(idx);

      const results = await Promise.all(
        clubIds.map(async (clubId) => {
          let clubInfo = idx[clubId];
          if (!clubInfo) {
            const infoSnap = await get(clubInfoRef(clubId));
            clubInfo = infoSnap.val() ?? { name: clubId, imageUrl: null };
          }

          const tSnap = await get(clubTournamentsRef(clubId));
          const raw = tSnap.val();
          const tournaments = raw
            ? Object.entries(raw)
                .map(([id, val]) => ({ id, ...((val as any)?.meta ?? {}) }))
                .filter((t) => t.createdAt)
            : [];

          return { clubId, clubInfo, tournaments };
        })
      );

      setClubs(results);
    } catch (err) {
      console.error('useAllClubs fetch failed', err);
      setError('Failed to load club data');
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteTournament = useCallback(
    async (clubId, tid) => {
      await fbDeleteTournament(clubId, tid);
      await fetchData();
    },
    [fetchData]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { clubs, loading, error, refresh: fetchData, deleteTournament };
}
