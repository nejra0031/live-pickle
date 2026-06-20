import { useState, useEffect, useCallback } from 'react';
import { fetchOwnedClubIds, fetchUserClubs, joinUserClubs, createClub as fbCreateClub } from '../firebase';

export function useMyClubs(uid: string | null | undefined) {
  const [ownedClubIds, setOwnedClubIds] = useState<string[]>([]);
  const [joinedClubIds, setJoinedClubIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!uid) {
      setOwnedClubIds([]);
      setJoinedClubIds([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [owned, joined] = await Promise.all([
        fetchOwnedClubIds(uid),
        fetchUserClubs(uid),
      ]);
      setOwnedClubIds(owned);
      setJoinedClubIds(joined);
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
      await joinUserClubs(uid, [clubId]);
      await refresh();
      return clubId;
    },
    [uid, refresh]
  );

  const joinClubs = useCallback(
    async (clubIds: string[]) => {
      if (!uid) return;
      await joinUserClubs(uid, clubIds);
      await refresh();
    },
    [uid, refresh]
  );

  return { ownedClubIds, joinedClubIds, loading, refresh, createClub, joinClubs };
}
