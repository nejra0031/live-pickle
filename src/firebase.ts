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
export const DEFAULT_CLUB_ID = TEST_MODE ? 'blue_test' : 'blue';

// ── Club and user path helpers ─────────────────────────────────────────────
export const clubInfoRef = (clubId: string) => ref(db, `clubs/${clubId}/info`);
export const clubTournamentsRef = (clubId: string) => ref(db, `clubs/${clubId}/tournaments`);
export const tournamentMetaRef = (clubId: string, tid: string) =>
  ref(db, `clubs/${clubId}/tournaments/${tid}/meta`);
export const usersRef = () => ref(db, 'users');
export const userRef = (uid: string) => ref(db, `users/${uid}`);

// ── Clubs registry (root-level index of all clubs) ────────────────────────
const CLUBS_INDEX_PATH = TEST_MODE ? 'clubsIndex_test' : 'clubsIndex';

export const clubsIndexRef = () => ref(db, CLUBS_INDEX_PATH);
export const clubIndexEntryRef = (clubId: string) => ref(db, `${CLUBS_INDEX_PATH}/${clubId}`);

export const DEFAULT_CLUB_INFO = { name: 'BLUE', imageUrl: null };

export async function ensureClubsIndexBootstrapped() {
  const idxSnap = await get(clubsIndexRef());
  const idx = idxSnap.val() ?? {};
  if (idx[DEFAULT_CLUB_ID]) return;

  const infoSnap = await get(clubInfoRef(DEFAULT_CLUB_ID));
  let info = infoSnap.val();
  if (!info) {
    info = DEFAULT_CLUB_INFO;
    await set(clubInfoRef(DEFAULT_CLUB_ID), info);
  }
  await set(clubIndexEntryRef(DEFAULT_CLUB_ID), info);
}

// ── Club ownership (Google-auth) ──────────────────────────────────────────
export const clubOwnedClubsRef = (uid: string) => ref(db, `clubOwners/${uid}`);
export const clubOwnerEntryRef = (clubId: string, uid: string) =>
  ref(db, `clubOwners/${uid}/${clubId}`);
export const clubOwnersRef = (clubId: string) => ref(db, `clubs/${clubId}/ownerUids`);
export const clubOwnerRef = (clubId: string, uid: string) =>
  ref(db, `clubs/${clubId}/ownerUids/${uid}`);

function slugifyClubName(name: string) {
  return (
    (name || 'club')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'club'
  );
}

export async function createClub(name: string, uid: string) {
  const idxSnap = await get(clubsIndexRef());
  const idx = idxSnap.val() ?? {};
  const base = slugifyClubName(name);
  let clubId = base,
    n = 2;
  while (idx[clubId]) clubId = `${base}-${n++}`;

  const info = { name: (name || '').trim() || base, imageUrl: null };
  await set(clubIndexEntryRef(clubId), info);
  await set(clubInfoRef(clubId), info);
  await set(clubOwnerRef(clubId, uid), true);
  await set(clubOwnerEntryRef(clubId, uid), true);
  return clubId;
}

export async function fetchOwnedClubIds(uid: string) {
  const snap = await get(clubOwnedClubsRef(uid));
  return Object.keys(snap.val() ?? {});
}

// ── User club memberships (self-joined) ───────────────────────────────────────
const userClubsPath = (uid: string) => `userClubs/${uid}`;
const userClubsRef = (uid: string) => ref(db, userClubsPath(uid));

export async function fetchUserClubs(uid: string): Promise<string[]> {
  const snap = await get(userClubsRef(uid));
  return Object.keys(snap.val() ?? {});
}

export async function joinUserClubs(uid: string, clubIds: string[]): Promise<void> {
  if (!uid || clubIds.length === 0) return;
  const updates: Record<string, boolean> = {};
  clubIds.forEach((id) => { updates[id] = true; });
  await update(userClubsRef(uid), updates);
}

export function writeTournamentMeta(clubId: string, tid: string, meta: Record<string, any>) {
  return update(ref(db, `clubs/${clubId}/tournaments/${tid}/meta`), meta).catch((err: Error) =>
    console.error('writeTournamentMeta failed', err)
  );
}

export function deleteTournament(clubId: string, tid: string) {
  return remove(ref(db, `clubs/${clubId}/tournaments/${tid}`)).catch((err: Error) =>
    console.error('deleteTournament failed', err)
  );
}

// ── Club members (per-club roster at clubs/{clubId}/members/) ─────────────
export const clubMembersRef = (clubId: string) => ref(db, `clubs/${clubId}/members`);
export const clubMemberRef = (clubId: string, uid: string) =>
  ref(db, `clubs/${clubId}/members/${uid}`);

export async function fetchClubMembers(clubId: string) {
  const snap = await get(clubMembersRef(clubId));
  const raw = snap.val() ?? {};
  return Object.values(raw) as any[];
}

export function removeClubMember(uid: string, clubId: string) {
  return remove(clubMemberRef(clubId, uid)).catch((err: Error) =>
    console.error('removeClubMember failed', err)
  );
}

export async function migrateKnownPlayersToClub(clubId: string): Promise<number> {
  const snap = await get(ref(db, KNOWN_PLAYERS_PATH));
  const raw = snap.val() ?? {};
  const players = Object.values(raw) as any[];
  await Promise.all(
    players.map((p) => {
      if (!p?.id) return Promise.resolve();
      const member = {
        id: p.id,
        nickname: (p.nickname || '').trim(),
        name: (p.name || '').trim(),
        duprId: (p.duprID || p.duprId || '').trim(),
        email: (p.email || '').trim(),
        createdAt: p.createdAt || Date.now(),
      };
      return set(clubMemberRef(clubId, p.id), member);
    })
  );
  return players.length;
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

export function createTournamentRepo(clubId: string, tournamentId: string): TournamentRepo {
  // TEST_MODE always resolves to the shared e2e path regardless of args, exactly
  // mirroring the old activePaths() TEST_MODE branch.
  const base = TEST_MODE
    ? 'clubs/blue_test/tournaments/e2e_tournament'
    : `clubs/${clubId}/tournaments/${tournamentId}`;

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
