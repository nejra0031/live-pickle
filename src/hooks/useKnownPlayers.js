import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchKnownPlayers, saveKnownPlayer, generatePlayerKey } from '../firebase';

// Cross-tournament registry of known players (name + DUPR ID), fetched once
// and kept in local state so newly-saved entries are immediately suggestible.
export default function useKnownPlayers() {
  const [players, setPlayers] = useState([]);
  const playersRef = useRef([]);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    fetchKnownPlayers().then(snap => {
      const val = snap.val() || {};
      const list = Object.values(val).filter(p => p && p.name);
      playersRef.current = list;
      setPlayers(list);
    }).catch(err => console.error('fetchKnownPlayers failed', err));
  }, []);

  const save = useCallback((name, duprId, nickname) => {
    const trimmedName = (name || '').trim();
    if (!trimmedName) return;
    const trimmedDuprId = (duprId || '').trim();
    const trimmedNickname = nickname !== undefined ? (nickname || '').trim() : undefined;

    const existing = playersRef.current.find(x => x.name.trim().toLowerCase() === trimmedName.toLowerCase());
    const resolvedNickname = trimmedNickname !== undefined ? trimmedNickname : existing?.nickname;
    if (existing && existing.duprID === trimmedDuprId && existing.nickname === resolvedNickname) return;

    const playerId = existing?.id || generatePlayerKey();
    const entry = { id: playerId, name: trimmedName, duprID: trimmedDuprId, nickname: resolvedNickname };
    const next = existing
      ? playersRef.current.map(x => x === existing ? entry : x)
      : [...playersRef.current, entry];
    playersRef.current = next;
    setPlayers(next);
    saveKnownPlayer(trimmedName, trimmedDuprId, trimmedNickname, playerId);
  }, []);

  return { players, save };
}
