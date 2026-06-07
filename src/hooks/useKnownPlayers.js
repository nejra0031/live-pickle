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
      setPlayers(Object.values(val).filter(p => p && p.name));
    }).catch(err => console.error('fetchKnownPlayers failed', err));
  }, []);

  const save = useCallback((name, duprId) => {
    const trimmedName = (name || '').trim();
    if (!trimmedName) return;
    const trimmedDuprId = (duprId || '').trim();
    setPlayers(p => {
      const id = trimmedName.toLowerCase();
      const existing = p.find(x => x.name.trim().toLowerCase() === id);
      if (existing && existing.duprId === trimmedDuprId) return p;
      const entry = { id: existing?.id || id, name: trimmedName, duprId: trimmedDuprId };
      return existing ? p.map(x => x === existing ? entry : x) : [...p, entry];
    });
    saveKnownPlayer(trimmedName, trimmedDuprId);
  }, []);

  return { players, save };
}
