import { useState, useEffect, useRef } from 'react';
import {
  db, ref as fbRef,
  set as fbSet, update as fbUpdate,
  onValue, off, push, onDisconnect, remove,
  fetchBackupIndex, tournamentRef, pendingResultsRef, tournamentPinsRef, presenceRef,
  isOwnToken,
} from '../firebase';
import { ROLES } from '../roleConfig';
import { validateSnapshot, normaliseSnapshot } from '../normalise';

// Owns all Firebase read subscriptions, presence, PINs, and backup index.
// Callbacks (onSnapshot, onPendingResults, etc.) are stabilised via refs so
// the listeners are only registered once and never need to be torn down.
export function useFirebaseSync({
  role,
  roleRef,
  tournamentIdRef,
  onSnapshot,       // (rawData | null) => void
  onPendingResults, // (pendingData) => void
  onPhaseTimeout,   // () => void
  onTournamentSwap, // () => void
  onFirebaseError,  // (msg) => void
}) {
  const [firebaseConnected, setFirebaseConnected] = useState(false);
  const [presence, setPresence]     = useState(() =>
    Object.fromEntries([['viewer', 0], ...ROLES.map(r => [r.id, 0])])
  );
  const [pins,          setPins]          = useState({});
  const [pinsLoaded,    setPinsLoaded]    = useState({});
  const [pinsLoadError, setPinsLoadError] = useState({});
  const [backupRoundNums, setBackupRoundNums] = useState(new Set());

  const myPresRef        = useRef(null);
  const presHeartbeatRef = useRef(null);
  const initialLoadDone  = useRef(false);

  // Stabilize callbacks — listeners capture these refs so they always call
  // the latest version without needing to re-register.
  const onSnapshotRef       = useRef(onSnapshot);
  const onPendingResultsRef = useRef(onPendingResults);
  const onPhaseTimeoutRef   = useRef(onPhaseTimeout);
  const onTournamentSwapRef = useRef(onTournamentSwap);
  const onFirebaseErrorRef  = useRef(onFirebaseError);
  onSnapshotRef.current       = onSnapshot;
  onPendingResultsRef.current = onPendingResults;
  onPhaseTimeoutRef.current   = onPhaseTimeout;
  onTournamentSwapRef.current = onTournamentSwap;
  onFirebaseErrorRef.current  = onFirebaseError;

  // Live per-tournament PIN subscriptions — one listener per role on
  // config/{adminPins|refereePins}. pins[r.id] is an array of {id,hash,label,createdAt}
  // (empty array if none configured — pinless tournaments are valid).
  useEffect(() => {
    const subs = ROLES.map(r => {
      const pinsRef = tournamentPinsRef(r.firebasePinsPath);
      onValue(pinsRef, snap => {
        const val = snap.val() || {};
        setPins(prev => ({ ...prev, [r.id]: Object.values(val) }));
        setPinsLoaded(prev => ({ ...prev, [r.id]: true }));
      }, () => {
        setPinsLoaded(prev => ({ ...prev, [r.id]: true }));
        setPinsLoadError(prev => ({ ...prev, [r.id]: true }));
      });
      return pinsRef;
    });
    return () => subs.forEach(off);
  }, []);

  // Load backup index on mount
  useEffect(() => {
    fetchBackupIndex().then(snap => {
      const d = snap.val();
      if (d) setBackupRoundNums(new Set(Object.keys(d).map(k => Number(k.replace('round_', '')))));
    }).catch(() => {});
  }, []);

  // Main tournament listener — registered once
  useEffect(() => {
    const r = tournamentRef();
    onValue(r, snap => {
      const data = snap.val();
      const isInitialLoad = !initialLoadDone.current;
      if (isInitialLoad) initialLoadDone.current = true;
      if (!data) { onSnapshotRef.current(null); return; }
      // Echo suppression only applies to writes *this listener* issued after
      // it loaded — write tokens are tracked in a module-level Map that
      // outlives a remount, so a fresh listener's first callback must never
      // be skipped even if it happens to carry a token from a just-finished
      // write by the instance it's replacing (e.g. tournament creation).
      if (!isInitialLoad && data._writeToken && isOwnToken(data._writeToken)) return;
      if (data.phase !== 'play') { onSnapshotRef.current({ phase: 'waiting' }); return; }
      const validationError = validateSnapshot(data);
      if (validationError) {
        onFirebaseErrorRef.current(`Data integrity error: ${validationError}. Do not enter results — contact the organiser.`);
        return;
      }
      if (data._tournamentId && tournamentIdRef.current && data._tournamentId !== tournamentIdRef.current && initialLoadDone.current) {
        onTournamentSwapRef.current();
      }
      onSnapshotRef.current(normaliseSnapshot(data));
    });
    return () => off(r);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Pending results listener — registered once
  useEffect(() => {
    const r = pendingResultsRef();
    onValue(r, snap => {
      const d = snap.val();
      if (!d) return;
      onPendingResultsRef.current(d);
    });
    return () => off(r);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 6-second timeout fallback if Firebase never responds
  useEffect(() => {
    const t = setTimeout(() => {
      if (!initialLoadDone.current) {
        initialLoadDone.current = true;
        onPhaseTimeoutRef.current();
      }
    }, 6000);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Presence tracking and heartbeat — registered once
  useEffect(() => {
    const STALE_MS     = 90_000;
    const HEARTBEAT_MS = 30_000;
    const listenPresRef = presenceRef();
    onValue(listenPresRef, snap => {
      const d = snap.val() || {};
      const e = Object.values(d);
      const cutoff = Date.now() - STALE_MS;
      const live = e.filter(x => x?.lastSeen >= cutoff);
      const counts = { viewer: live.filter(x => !x?.role || x?.role === 'viewer').length };
      ROLES.forEach(r => { counts[r.id] = live.filter(x => x?.role === r.id).length; });
      setPresence(counts);
    });
    const connRef = fbRef(db, '.info/connected');
    onValue(connRef, snap => {
      console.log('[presence] .info/connected =', snap.val());
      setFirebaseConnected(snap.val() === true);
      if (snap.val() !== true) return;
      const r = push(presenceRef()); myPresRef.current = r;
      onDisconnect(r).remove();
      fbSet(r, { role: roleRef.current ?? 'viewer', joinedAt: Date.now(), lastSeen: Date.now() })
        .then(() => console.log('[presence] write OK, role=', roleRef.current ?? 'viewer'))
        .catch(err => console.error('[presence] write FAILED:', err));
      clearInterval(presHeartbeatRef.current);
      presHeartbeatRef.current = setInterval(() => {
        if (myPresRef.current) fbUpdate(myPresRef.current, { lastSeen: Date.now() }).catch(() => {});
      }, HEARTBEAT_MS);
    });
    return () => {
      if (myPresRef.current) remove(myPresRef.current);
      clearInterval(presHeartbeatRef.current);
      off(listenPresRef);
      off(connRef);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update presence role when role changes
  useEffect(() => {
    if (myPresRef.current) fbUpdate(myPresRef.current, { role: role ?? 'viewer' }).catch(() => {});
  }, [role]);

  return {
    firebaseConnected,
    presence,
    pins,
    pinsLoaded,
    pinsLoadError,
    backupRoundNums,
    setBackupRoundNums,
  };
}
