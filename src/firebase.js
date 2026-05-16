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

// ── Path constants (test-isolated) ────────────────────────────────────────
const TEST_MODE = import.meta.env.VITE_TEST_MODE === 'true';
const TOURNAMENT_PATH  = TEST_MODE ? 'current_tournament_e2e' : 'current_tournament';
const BACKUPS_PATH     = TEST_MODE ? 'tournament_backups_e2e' : 'tournament_backups';
const ADMIN_PIN_PATH   = TEST_MODE ? 'config/adminPin_test'   : 'config/adminPin';
const PRESENCE_PATH    = TEST_MODE ? 'presence_e2e'           : 'presence';

// Exported so App.jsx can use the correct path for presence push/listen
export const tournamentRef     = () => ref(db, TOURNAMENT_PATH);
export const pendingResultsRef = () => ref(db, `${TOURNAMENT_PATH}/pendingResults`);
export const adminPinRef       = () => ref(db, ADMIN_PIN_PATH);
export const presenceRef       = () => ref(db, PRESENCE_PATH);

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
  return set(ref(db, `${BACKUPS_PATH}/round_${roundNum}`), { ...snap, _backupAt: Date.now() }).catch(err => {
    console.error('Backup write failed', err);
  });
}
export function fetchBackup(roundNum) {
  return get(ref(db, `${BACKUPS_PATH}/round_${roundNum}`));
}
export function fetchBackupIndex() {
  return get(ref(db, BACKUPS_PATH));
}
export function clearBackups() {
  return remove(ref(db, BACKUPS_PATH)).catch(err => console.error('Backup clear failed', err));
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
