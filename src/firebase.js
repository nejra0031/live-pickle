import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, update, onValue, off, push, get, onDisconnect, remove } from 'firebase/database';

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
export { ref, set, update, onValue, off, push, get, onDisconnect, remove };

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

// PINs live at the global config/ node in both modes.
// Per-tournament PINs can be wired up once a PIN-setup flow exists.
export const rolePinRef = (leaf) => {
  if (TEST_MODE) return ref(db, `config/${leaf}_test`);
  return ref(db, `config/${leaf}`);
};

// ── Club and user path helpers ─────────────────────────────────────────────
export const clubInfoRef        = (clubId) => ref(db, `clubs/${clubId}/info`);
export const clubTournamentsRef = (clubId) => ref(db, `clubs/${clubId}/tournaments`);
export const tournamentMetaRef  = (clubId, tid) => ref(db, `clubs/${clubId}/tournaments/${tid}/meta`);
export const usersRef           = () => ref(db, 'users');
export const userRef            = (uid) => ref(db, `users/${uid}`);

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
