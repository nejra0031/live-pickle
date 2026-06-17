import { useState, useEffect, useCallback } from 'react';
import { get, update, usersRef, userRef, saveKnownPlayer } from '../firebase';

function memberSlug(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[.#$[\]/]/g, '');
}

export function useClubMembers(clubId) {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const snap = await get(usersRef());
      const raw = snap.val();
      if (raw) {
        const list = (Object.values(raw) as any[])
          .filter((u) => u?.clubs?.[clubId])
          .map((u) => u.profile ?? u)
          .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
        setMembers(list);
      } else {
        setMembers([]);
      }
    } catch (err) {
      console.error('useClubMembers fetch failed', err);
      setError('Failed to load members');
    } finally {
      setLoading(false);
    }
  }, [clubId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const addMember = useCallback(
    async (name, duprId, nickname) => {
      const trimmedName = (name || '').trim();
      if (!trimmedName) return;
      const uid = memberSlug(trimmedName);
      const profile = {
        id: uid,
        name: trimmedName,
        duprId: (duprId || '').trim(),
        nickname: (nickname || '').trim(),
        createdAt: Date.now(),
      };
      await update(userRef(uid), { profile, clubs: { [clubId]: true } });
      // Also save to players so they appear in tournament setup autocomplete
      await saveKnownPlayer(trimmedName, duprId, nickname);
      await fetchMembers();
    },
    [clubId, fetchMembers]
  );

  return { members, loading, error, addMember, refresh: fetchMembers };
}
