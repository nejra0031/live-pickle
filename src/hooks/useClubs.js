import { useState, useEffect, useCallback } from 'react';
import { get, set, clubInfoRef, clubTournamentsRef, deleteTournament as fbDeleteTournament } from '../firebase';

const DEFAULT_CLUB_INFO = { name: 'BLUE', imageUrl: null };

export function useClubs(clubId) {
  const [clubInfo, setClubInfo]       = useState(null);
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Bootstrap club info if it doesn't exist yet
      const infoSnap = await get(clubInfoRef(clubId));
      let info = infoSnap.val();
      if (!info) {
        await set(clubInfoRef(clubId), DEFAULT_CLUB_INFO);
        info = DEFAULT_CLUB_INFO;
      }
      setClubInfo(info);

      // Fetch tournament list (meta only)
      const tournamentsSnap = await get(clubTournamentsRef(clubId));
      const raw = tournamentsSnap.val();
      if (raw) {
        const list = Object.entries(raw)
          .map(([id, val]) => ({ id, ...(val?.meta ?? {}) }))
          .filter(t => t.createdAt)
          .sort((a, b) => b.createdAt - a.createdAt);
        setTournaments(list);
      } else {
        setTournaments([]);
      }
    } catch (err) {
      console.error('useClubs fetch failed', err);
      setError('Failed to load club data');
    } finally {
      setLoading(false);
    }
  }, [clubId]);

  const deleteTournament = useCallback(async (tid) => {
    await fbDeleteTournament(clubId, tid);
    await fetchData();
  }, [clubId, fetchData]);

  // Fetch on first render
  useEffect(() => { fetchData(); }, [fetchData]);

  return { clubInfo, tournaments, loading, error, refresh: fetchData, deleteTournament };
}
