import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchKnownPlayers, saveKnownPlayer } from '../firebase';

// Cross-tournament registry of known players (name + DUPR ID), fetched once
// and kept in local state so newly-saved entries are immediately suggestible.
export default function useKnownPlayers() {
  const [players, setPlayers] = useState([]);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    fetchKnownPlayers().then(snap => {
      const val = snap.val() || {};
      // Legacy entries can collide on the same person under different keys —
      // collapse to one entry per lowercased name so suggestions don't repeat.
      const byName = new Map();
      for (const p of Object.values(val)) { if (p && p.name) byName.set(p.name.trim().toLowerCase(), p); }
      setPlayers([...byName.values()]);
    }).catch(err => console.error('fetchKnownPlayers failed', err));
  }, []);

  const save = useCallback((name, duprId, nickname) => {
    const trimmedName = (name || '').trim();
    if (!trimmedName) return;
    const trimmedDuprId = (duprId || '').trim();
    const trimmedNickname = nickname !== undefined ? (nickname || '').trim() : undefined;
    setPlayers(p => {
      const id = trimmedName.toLowerCase();
      const existing = p.find(x => x.name.trim().toLowerCase() === id);
      const resolvedNickname = trimmedNickname !== undefined ? trimmedNickname : existing?.nickname;
      if (existing && existing.duprID === trimmedDuprId && existing.nickname === resolvedNickname) return p;
      const entry = { id: existing?.id || id, name: trimmedName, duprID: trimmedDuprId, nickname: resolvedNickname };
      return existing ? p.map(x => x === existing ? entry : x) : [...p, entry];
    });
    saveKnownPlayer(trimmedName, trimmedDuprId, trimmedNickname);
  }, []);

  return { players, save };
}
