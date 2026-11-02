/// <reference types="vite/client" />
import { initializeApp } from 'firebase/app';
import {
  getDatabase,
  ref,
  set,
  update,
  onValue,
  off,
  push,
  get,
  onDisconnect,
  remove,
} from 'firebase/database';
import type { DatabaseReference, DataSnapshot } from 'firebase/database';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as authSignOut,
  onAuthStateChanged,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyBWcUvEUzlvUb0CwM_GsjLY0AmiYHa8GhA',
  authDomain: 'live-pickle.firebaseapp.com',
  databaseURL: 'https://live-pickle-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'live-pickle',
  storageBucket: 'live-pickle.firebasestorage.app',
  messagingSenderId: '419584191740',
  appId: '1:419584191740:web:430fdc01037a21838bfb79',
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);
export { ref, set, update, onValue, off, push, get, onDisconnect, remove };

// ── Authentication ─────────────────────────────────────────────────────────
export function signInWithGoogle() {
  return signInWithPopup(auth, new GoogleAuthProvider());
}
export function signOutUser() {
  return authSignOut(auth);
}
export function subscribeAuth(callback: (user: any) => void) {
  return onAuthStateChanged(auth, callback);
}

// ── Module-level constants ─────────────────────────────────────────────────
const TEST_MODE = import.meta.env.VITE_TEST_MODE === 'true';

// Tournaments live flat at tournaments/{tid}/{current,backups,presence,config,ownerUids}.
// A lightweight per-tournament summary (title, status, club name/logo, …) is kept
// separately at tournamentsMeta/{tid} so the landing page can list every
// tournament without downloading full snapshots and backups.
const TOURNAMENTS_ROOT = TEST_MODE ? 'tournaments_e2e' : 'tournaments';
const TOURNAMENTS_META_ROOT = TEST_MODE ? 'tournamentsMeta_e2e' : 'tournamentsMeta';
export const E2E_TOURNAMENT_ID = 'e2e_tournament';

// TEST_MODE always resolves to the shared e2e tournament regardless of the id.
const tournamentBase = (tid: string) =>
  `${TOURNAMENTS_ROOT}/${TEST_MODE ? E2E_TOURNAMENT_ID : tid}`;

export const tournamentsMetaRef = () => ref(db, TOURNAMENTS_META_ROOT);
export const tournamentMetaRef = (tid: string) => ref(db, `${TOURNAMENTS_META_ROOT}/${tid}`);

export function generateTournamentId() {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

export function writeTournamentMeta(tid: string | null | undefined, meta: Record<string, any>) {
  if (!tid) return Promise.resolve();
  return update(tournamentMetaRef(tid), meta).catch((err: Error) =>
    console.error('writeTournamentMeta failed', err)
  );
}

export async function fetchAllTournamentMeta(): Promise<any[]> {
  const snap = await get(tournamentsMetaRef());
  const raw = (snap.val() ?? {}) as Record<string, any>;
  return Object.entries(raw)
    .map(([id, meta]) => ({ ...(meta ?? {}), id }))
    .filter((t) => t.createdAt);
}

export async function deleteTournament(tid: string) {
  try {
    await remove(tournamentMetaRef(tid));
    await remove(ref(db, tournamentBase(tid)));
  } catch (err) {
    console.error('deleteTournament failed', err);
  }
}

// ── Tournament ownership (Google-auth) ────────────────────────────────────
// Whoever creates a tournament (signed in with Google) becomes its owner:
// tournaments/{tid}/ownerUids/{uid}: true. Owners get admin without a PIN and
// are the only ones allowed to manage PINs (enforced by database.rules.json).
const ownerRef = (tid: string, uid: string) =>
  ref(db, `${tournamentBase(tid)}/ownerUids/${uid}`);

export function claimTournamentOwnership(tid: string, uid: string) {
  return set(ownerRef(tid, uid), true).catch((err: Error) =>
    console.error('claimTournamentOwnership failed', err)
  );
}

export async function isTournamentOwner(tid: string, uid: string): Promise<boolean> {
  try {
    const snap = await get(ownerRef(tid, uid));
    return snap.val() === true;
  } catch {
    return false;
  }
}

// ── Known-players registry ─────────────────────────────────────────────────
const KNOWN_PLAYERS_PATH = TEST_MODE ? 'players_e2e' : 'players';

export const knownPlayersRef = () => ref(db, KNOWN_PLAYERS_PATH);

export function generatePlayerKey() {
  return push(knownPlayersRef()).key;
}
export function fetchKnownPlayers() {
  return get(knownPlayersRef());
}
export function removeKnownPlayer(id: string) {
  return remove(ref(db, `${KNOWN_PLAYERS_PATH}/${id}`)).catch((err: Error) =>
    console.error('removeKnownPlayer failed', err)
  );
}
export function saveKnownPlayer(
  name: string,
  duprId: string,
  nickname: string | undefined,
  id?: string | null,
  email?: string
) {
  const trimmedName = (name || '').trim();
  if (!trimmedName) return Promise.resolve();
  const playerId = id || push(knownPlayersRef()).key;
  const fields: Record<string, any> = {
    id: playerId,
    name: trimmedName,
    duprID: (duprId || '').trim(),
  };
  if (nickname !== undefined) fields.nickname = (nickname || '').trim();
  if (email !== undefined) fields.email = (email || '').trim();
  return set(ref(db, `${KNOWN_PLAYERS_PATH}/${playerId}`), fields).catch((err: Error) =>
    console.error('saveKnownPlayer failed', err)
  );
}

// ── Write-token helpers (module-level — shared across all repos) ──────────
const TOKEN_TTL_MS = 30_000;
const _tokens = new Map<string, { ts: number }>();

export function addWriteToken(tok: string) {
  const now = Date.now();
  for (const [k, v] of _tokens) {
    if (now - v.ts > TOKEN_TTL_MS) _tokens.delete(k);
  }
  _tokens.set(tok, { ts: now });
  if (_tokens.size > 100) _tokens.delete(_tokens.keys().next().value!);
}
export function isOwnToken(tok: string) {
  const entry = _tokens.get(tok);
  if (!entry) return false;
  if (Date.now() - entry.ts > TOKEN_TTL_MS) {
    _tokens.delete(tok);
    return false;
  }
  return true;
}

// ── Tournament repository ──────────────────────────────────────────────────
// Factory that closes over a resolved base path. Each tournament gets its own
// repo instance; the module-level write-token map stays shared so echo
// suppression works across all writes regardless of which repo issued them.
export interface TournamentRepo {
  tournamentRef(): DatabaseReference;
  pendingResultsRef(): DatabaseReference;
  presenceRef(): DatabaseReference;
  configRef(roleKeyPlural: string): DatabaseReference;
  pushSnapshot(snapshot: any, onError?: (msg: string) => void): Promise<void>;
  pushAtomicUpdate(fields: Record<string, any>, onError?: (msg: string) => void): Promise<void>;
  writeBackup(roundNum: number, snap: any): Promise<void>;
  fetchBackup(roundNum: number): Promise<DataSnapshot>;
  fetchBackupIndex(): Promise<DataSnapshot>;
  clearBackups(): Promise<void>;
  addPin(roleKeyPlural: string, pin: { hash: string; label: string }): Promise<string>;
  revokePin(roleKeyPlural: string, pinId: string): Promise<void>;
}

export function createTournamentRepo(tournamentId: string): TournamentRepo {
  const base = tournamentBase(tournamentId);

  const tPath = `${base}/current`;

  return {
    tournamentRef: () => ref(db, tPath),
    pendingResultsRef: () => ref(db, `${tPath}/pendingResults`),
    presenceRef: () => ref(db, `${base}/presence`),
    configRef: (rk) => ref(db, `${base}/config/${rk}`),

    pushSnapshot(snapshot, onError) {
      const tok = Math.random().toString(36).slice(2);
      addWriteToken(tok);
      const data = snapshot
        ? { ...snapshot, _writeToken: tok }
        : { phase: 'ended', _writeToken: tok };
      return set(ref(db, tPath), data).catch((err: Error) => {
        console.error('Firebase pushSnapshot failed', err);
        onError?.('Write failed — check your connection');
      }) as Promise<void>;
    },

    pushAtomicUpdate(fields, onError) {
      const tok = Math.random().toString(36).slice(2);
      addWriteToken(tok);
      return update(ref(db, tPath), { ...fields, _writeToken: tok }).catch((err: Error) => {
        console.error('Firebase pushAtomicUpdate failed', err);
        onError?.('Write failed — check your connection');
      }) as Promise<void>;
    },

    writeBackup(roundNum, snap) {
      return set(ref(db, `${base}/backups/round_${roundNum}`), {
        ...snap,
        _backupAt: Date.now(),
      }).catch((err: Error) => {
        console.error('Backup write failed', err);
      }) as Promise<void>;
    },

    fetchBackup(roundNum) {
      return get(ref(db, `${base}/backups/round_${roundNum}`));
    },

    fetchBackupIndex() {
      return get(ref(db, `${base}/backups`));
    },

    clearBackups() {
      return remove(ref(db, `${base}/backups`)).catch((err: Error) => {
        console.error('Backup clear failed', err);
      }) as Promise<void>;
    },

    async addPin(rk, { hash, label }) {
      const r = push(ref(db, `${base}/config/${rk}`));
      await set(r, { id: r.key, hash, label, createdAt: Date.now() });
      return r.key as string;
    },

    revokePin(rk, pinId) {
      return remove(ref(db, `${base}/config/${rk}/${pinId}`));
    },
  };
}
