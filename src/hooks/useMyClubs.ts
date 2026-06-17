import { useState, useEffect, useCallback } from 'react';
import { fetchOwnedClubIds, createClub as fbCreateClub } from '../firebase';

// Tracks the clubs the signed-in user (by uid) owns.
export function useMyClubs(uid: string | null | undefined) {
  const [ownedClubIds, setOwnedClubIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!uid) {
      setOwnedClubIds([]);
      return;
    }
    setLoading(true);
    try {
      setOwnedClubIds(await fetchOwnedClubIds(uid));
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createClub = useCallback(
    async (name: string) => {
      if (!uid) return null;
      const clubId = await fbCreateClub(name, uid);
      await refresh();
      return clubId;
    },
    [uid, refresh]
  );

  return { ownedClubIds, loading, refresh, createClub };
}
