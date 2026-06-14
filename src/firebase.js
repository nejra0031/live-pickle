import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, update, onValue, off, push, get, onDisconnect, remove } from 'firebase/database';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as authSignOut, onAuthStateChanged } from 'firebase/auth';

const firebaseConfig = {
  apiKey:            'AIzaSyBWcUvEUzlvUb0CwM_GsjLY0AmiYHa8GhA',
  authDomain:        'live-pickle.firebaseapp.com',
  databaseURL:       'https://live-pickle-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId:         'live-pickle',
  storageBucket:     'live-pickle.firebasestorage.app',
  messagingSenderId: '419584191740',
  appId:             '1:419584191740:web:430fdc01037a21838bfb79',
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);
export { ref, set, update, onValue, off, push, get, onDisconnect, remove };

// ── Authentication ──────────────────────────────────────────────────────
export function signInWithGoogle() {
  return signInWithPopup(auth, new GoogleAuthProvider());
}
export function signOutUser() {
  return authSignOut(auth);
}
export function subscribeAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

// ── Active tournament context ──────────────────────────────────────────────
const TEST_MODE = import.meta.env.VITE_TEST_MODE === 'true';
export const DEFAULT_CLUB_ID = TEST_MODE ? 'blue_test' : 'blue';

let _activeClubId = null;
let _activeTournamentId = null;

export function setActiveTournament(clubId, tournamentId) {
  _activeClubId = clubId;
  _activeTournamentId = tournamentId;
}

export function getActiveContext() {
  return { clubId: _activeClubId, tournamentId: _activeTournamentId };
}

function activePaths() {
  if (TEST_MODE) {
    const base = 'clubs/blue_test/tournaments/e2e_tournament';
    return {
      tournament: base + '/current',
      backups:    base + '/backups',
      presence:   base + '/presence',
      config:     base + '/config',
    };
  }
  const base = `clubs/${_activeClubId}/tournaments/${_activeTournamentId}`;
  return {
    tournament: base + '/current',
    backups:    base + '/backups',
    presence:   base + '/presence',
    config:     base + '/config',
  };
}

// ── Tournament-scoped path helpers ─────────────────────────────────────────
export const tournamentRef     = () => ref(db, activePaths().tournament);
export const pendingResultsRef = () => ref(db, activePaths().tournament + '/pendingResults');
export const presenceRef       = () => ref(db, activePaths().presence);

// Per-tournament PIN config: config/{adminPins|refereePins}/{pinId} = {id, hash, label, createdAt}.
export const tournamentPinsRef = (roleKeyPlural) => ref(db, activePaths().config + '/' + roleKeyPlural);

export async function addTournamentPin(roleKeyPlural, { hash, label }) {
  const r = push(tournamentPinsRef(roleKeyPlural));
  await set(r, { id: r.key, hash, label, createdAt: Date.now() });
}

export function revokeTournamentPin(roleKeyPlural, pinId) {
  return remove(ref(db, activePaths().config + '/' + roleKeyPlural + '/' + pinId));
}

// ── Club and user path helpers ─────────────────────────────────────────────
export const clubInfoRef        = (clubId) => ref(db, `clubs/${clubId}/info`);
export const clubTournamentsRef = (clubId) => ref(db, `clubs/${clubId}/tournaments`);
export const tournamentMetaRef  = (clubId, tid) => ref(db, `clubs/${clubId}/tournaments/${tid}/meta`);
export const usersRef           = () => ref(db, 'users');
export const userRef            = (uid) => ref(db, `users/${uid}`);

// ── Clubs registry (root-level index of all clubs) ──────────────────────────
const CLUBS_INDEX_PATH = TEST_MODE ? 'clubsIndex_test' : 'clubsIndex';

export const clubsIndexRef     = () => ref(db, CLUBS_INDEX_PATH);
export const clubIndexEntryRef = (clubId) => ref(db, `${CLUBS_INDEX_PATH}/${clubId}`);

export const DEFAULT_CLUB_INFO = { name: 'BLUE', imageUrl: null };

// Registers DEFAULT_CLUB_ID in clubsIndex if it isn't there yet — covers both
// a brand-new DB (seeds clubs/{id}/info too) and migrating the existing
// 'blue' club into the new index on first load, regardless of what else is
// already in clubsIndex.
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

// ── Club ownership (Google-auth) ────────────────────────────────────────
// clubOwners/{uid}/{clubId}: forward index — clubs this Google user owns.
// clubs/{clubId}/ownerUids/{uid}: reverse index — used by isOwner checks and
// by database.rules.json to gate writes to PIN config.
export const clubOwnedClubsRef = (uid)          => ref(db, `clubOwners/${uid}`);
export const clubOwnerEntryRef = (clubId, uid)  => ref(db, `clubOwners/${uid}/${clubId}`);
export const clubOwnersRef     = (clubId)       => ref(db, `clubs/${clubId}/ownerUids`);
export const clubOwnerRef      = (clubId, uid)  => ref(db, `clubs/${clubId}/ownerUids/${uid}`);

function slugifyClubName(name) {
  return (name || 'club')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'club';
}

// Creates a new club owned by `uid` (self-serve), returning the new clubId.
export async function createClub(name, uid) {
  const idxSnap = await get(clubsIndexRef());
  const idx = idxSnap.val() ?? {};
  const base = slugifyClubName(name);
  let clubId = base, n = 2;
  while (idx[clubId]) clubId = `${base}-${n++}`;

  const info = { name: (name || '').trim() || base, imageUrl: null };
  await set(clubIndexEntryRef(clubId), info);
  await set(clubInfoRef(clubId), info);
  await set(clubOwnerRef(clubId, uid), true);
  await set(clubOwnerEntryRef(clubId, uid), true);
  return clubId;
}

export async function fetchOwnedClubIds(uid) {
  const snap = await get(clubOwnedClubsRef(uid));
  return Object.keys(snap.val() ?? {});
}

export function writeTournamentMeta(clubId, tid, meta) {
  return update(ref(db, `clubs/${clubId}/tournaments/${tid}/meta`), meta)
    .catch(err => console.error('writeTournamentMeta failed', err));
}

export function deleteTournament(clubId, tid) {
  return remove(ref(db, `clubs/${clubId}/tournaments/${tid}`))
    .catch(err => console.error('deleteTournament failed', err));
}

// ── Known-players registry (cross-tournament, for DUPR export autocomplete) ─
const KNOWN_PLAYERS_PATH = TEST_MODE ? 'known_players_e2e' : 'known_players';

export const knownPlayersRef = () => ref(db, KNOWN_PLAYERS_PATH);

function playerSlug(name) {
  return name.trim().toLowerCase().replace(/\s+/g, '_').replace(/[.#$\[\]/]/g, '');
}
export function fetchKnownPlayers() {
  return get(knownPlayersRef());
}
export function saveKnownPlayer(name, duprId, nickname) {
  const trimmedName = (name || '').trim();
  const slug = playerSlug(trimmedName);
  if (!slug) return Promise.resolve();
  const fields = { id: slug, name: trimmedName, duprID: (duprId || '').trim() };
  if (nickname !== undefined) fields.nickname = (nickname || '').trim();
  return update(ref(db, `${KNOWN_PLAYERS_PATH}/${slug}`), fields)
    .catch(err => console.error('saveKnownPlayer failed', err));
}

// ── Write-token helpers ────────────────────────────────────────────────────
const TOKEN_TTL_MS = 30_000;
const _tokens = new Map();

export function addWriteToken(tok) {
  const now = Date.now();
  for (const [k, v] of _tokens) { if (now - v.ts > TOKEN_TTL_MS) _tokens.delete(k); }
  _tokens.set(tok, { ts: now });
  if (_tokens.size > 100) _tokens.delete(_tokens.keys().next().value);
}
export function isOwnToken(tok) {
  const entry = _tokens.get(tok);
  if (!entry) return false;
  if (Date.now() - entry.ts > TOKEN_TTL_MS) { _tokens.delete(tok); return false; }
  return true;
}

// ── Backup helpers ─────────────────────────────────────────────────────────
export function writeBackup(roundNum, snap) {
  return set(ref(db, activePaths().backups + `/round_${roundNum}`), { ...snap, _backupAt: Date.now() }).catch(err => {
    console.error('Backup write failed', err);
  });
}
export function fetchBackup(roundNum) {
  return get(ref(db, activePaths().backups + `/round_${roundNum}`));
}
export function fetchBackupIndex() {
  return get(ref(db, activePaths().backups));
}
export function clearBackups() {
  return remove(ref(db, activePaths().backups)).catch(err => console.error('Backup clear failed', err));
}

// ── Atomic helpers ─────────────────────────────────────────────────────────
export function pushSnapshot(snapshot, onError) {
  const tok = Math.random().toString(36).slice(2);
  addWriteToken(tok);
  const data = snapshot ? { ...snapshot, _writeToken: tok } : { phase: 'ended', _writeToken: tok };
  return set(tournamentRef(), data).catch(err => {
    console.error('Firebase pushSnapshot failed', err);
    onError?.('Write failed — check your connection');
  });
}

export function pushAtomicUpdate(fields, onError) {
  const tok = Math.random().toString(36).slice(2);
  addWriteToken(tok);
  return update(tournamentRef(), { ...fields, _writeToken: tok }).catch(err => {
    console.error('Firebase pushAtomicUpdate failed', err);
    onError?.('Write failed — check your connection');
  });
}
