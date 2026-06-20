import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchKnownPlayers, fetchClubMembers, saveKnownPlayer, generatePlayerKey } from '../firebase';

export default function useKnownPlayers(clubId?: string | null) {
  const [players, setPlayers] = useState<any[]>([]);
  const playersRef = useRef<any[]>([]);

  useEffect(() => {
    let cancelled = false;

    if (clubId) {
      fetchClubMembers(clubId)
        .then((members) => {
          if (cancelled) return;
          // Normalise duprId → duprID so PlayerNameField's filter works
          const list = members
            .filter((p) => p && (p.name || p.nickname))
            .map((p) => ({ ...p, duprID: p.duprID || p.duprId || '' }));
          playersRef.current = list;
          setPlayers(list);
        })
        .catch((err) => console.error('fetchClubMembers failed', err));
    } else {
      fetchKnownPlayers()
        .then((snap) => {
          if (cancelled) return;
          const val = (snap.val() || {}) as Record<string, any>;
          const list = Object.values(val).filter((p) => p && p.name);
          playersRef.current = list;
          setPlayers(list);
        })
        .catch((err) => console.error('fetchKnownPlayers failed', err));
    }

    return () => { cancelled = true; };
  }, [clubId]);

  const save = useCallback((name: string, duprId: string, nickname?: string) => {
    const trimmedName = (name || '').trim();
    if (!trimmedName) return;
    const trimmedDuprId = (duprId || '').trim();
    const trimmedNickname = nickname !== undefined ? (nickname || '').trim() : undefined;

    const existing = playersRef.current.find(
      (x) => (x.name || '').trim().toLowerCase() === trimmedName.toLowerCase()
    );
    const resolvedNickname = trimmedNickname !== undefined ? trimmedNickname : existing?.nickname;
    if (existing && existing.duprID === trimmedDuprId && existing.nickname === resolvedNickname)
      return;

    const playerId = existing?.id || generatePlayerKey();
    const entry = {
      id: playerId,
      name: trimmedName,
      duprID: trimmedDuprId,
      nickname: resolvedNickname,
    };
    const next = existing
      ? playersRef.current.map((x) => (x === existing ? entry : x))
      : [...playersRef.current, entry];
    playersRef.current = next;
    setPlayers(next);
    saveKnownPlayer(trimmedName, trimmedDuprId, trimmedNickname, playerId);
  }, []);

  return { players, save };
}
