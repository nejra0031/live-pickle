import { useState, useEffect, useCallback } from 'react';
import { set, clubMemberRef, saveKnownPlayer, fetchClubMembers, removeClubMember } from '../firebase';

function memberSlug(nickname: string) {
  return nickname
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[.#$[\]/]/g, '');
}

export function useClubMembers(clubId: string) {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = (await fetchClubMembers(clubId))
        .filter((p: any) => p && (p.nickname || p.name))
        .sort((a: any, b: any) =>
          ((a.nickname || a.name) ?? '').localeCompare((b.nickname || b.name) ?? '')
        );
      setMembers(list);
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
    async (nickname: string, fullName: string, duprId: string, email: string) => {
      const trimmedNickname = (nickname || '').trim();
      if (!trimmedNickname) return;
      const uid = memberSlug(trimmedNickname);
      const trimmedFullName = (fullName || '').trim();
      const profile = {
        id: uid,
        nickname: trimmedNickname,
        name: trimmedFullName,
        duprId: (duprId || '').trim(),
        email: (email || '').trim(),
        createdAt: Date.now(),
      };
      await set(clubMemberRef(clubId, uid), profile);
      await saveKnownPlayer(
        trimmedFullName || trimmedNickname,
        duprId,
        trimmedNickname,
        uid,
        (email || '').trim()
      );
      await fetchMembers();
    },
    [clubId, fetchMembers]
  );

  const updateMember = useCallback(
    async (id: string, nickname: string, fullName: string, duprId: string, email: string) => {
      const trimmedNickname = (nickname || '').trim();
      if (!trimmedNickname) return;
      const trimmedFullName = (fullName || '').trim();
      const profile = {
        id,
        nickname: trimmedNickname,
        name: trimmedFullName,
        duprId: (duprId || '').trim(),
        email: (email || '').trim(),
      };
      await set(clubMemberRef(clubId, id), profile);
      await saveKnownPlayer(
        trimmedFullName || trimmedNickname,
        duprId,
        trimmedNickname,
        id,
        (email || '').trim()
      );
      await fetchMembers();
    },
    [clubId, fetchMembers]
  );

  const removeMember = useCallback(
    async (id: string) => {
      await removeClubMember(id, clubId);
      await fetchMembers();
    },
    [clubId, fetchMembers]
  );

  return { members, loading, error, addMember, updateMember, removeMember, refresh: fetchMembers };
}
