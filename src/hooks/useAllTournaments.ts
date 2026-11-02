import { useState, useEffect, useCallback } from 'react';
import { fetchAllTournamentMeta, deleteTournament as fbDeleteTournament } from '../firebase';

// Landing-page list of every tournament, read from the lightweight
// tournamentsMeta index (never the full snapshots).
export function useAllTournaments() {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setTournaments(await fetchAllTournamentMeta());
    } catch (err) {
      console.error('useAllTournaments fetch failed', err);
      setError('Failed to load tournaments');
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteTournament = useCallback(
    async (tid: string) => {
      await fbDeleteTournament(tid);
      await fetchData();
    },
    [fetchData]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { tournaments, loading, error, refresh: fetchData, deleteTournament };
}
