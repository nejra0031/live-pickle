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
export const db  = getDatabase(app);
export { ref, set, update, onValue, off, push, get, onDisconnect, remove };

// ── Write-token helpers ────────────────────────────────────────────────────
// Tokens suppress echo updates from our own writes.
// Each entry is { ts: Date.now() }. Tokens older than TOKEN_TTL_MS are expired
// on every write so the map stays small even under sustained high-frequency writes.
const TOKEN_TTL_MS = 30_000;
const _tokens = new Map();

export function addWriteToken(tok) {
  const now = Date.now();
  // Evict expired tokens
  for (const [k, v] of _tokens) { if (now - v.ts > TOKEN_TTL_MS) _tokens.delete(k); }
  _tokens.set(tok, { ts: now });
  // Hard cap at 100 entries as a safety net
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
  return set(ref(db, `tournament_backups/round_${roundNum}`), { ...snap, _backupAt: Date.now() }).catch(err => {
    console.error('Backup write failed', err);
  });
}
export function fetchBackup(roundNum) {
  return get(ref(db, `tournament_backups/round_${roundNum}`));
}
export function fetchBackupIndex() {
  return get(ref(db, 'tournament_backups'));
}
export function clearBackups() {
  return remove(ref(db, 'tournament_backups')).catch(err => console.error('Backup clear failed', err));
}

// ── Atomic helpers ─────────────────────────────────────────────────────────
// pushSnapshot: full replace — only called by the admin who generated the round.
// NOTE: set() is not atomic with concurrent update() calls from other clients;
// the round-start admin is the only writer at that moment so races are minimal.
export function pushSnapshot(snapshot, onError) {
  const tok = Math.random().toString(36).slice(2);
  addWriteToken(tok);
  const r = ref(db, 'current_tournament');
  const data = snapshot ? { ...snapshot, _writeToken: tok } : { phase: 'ended', _writeToken: tok };
  return set(r, data).catch(err => {
    console.error('Firebase pushSnapshot failed', err);
    onError?.('Write failed — check your connection');
  });
}

export function pushAtomicUpdate(fields, onError) {
  const tok = Math.random().toString(36).slice(2);
  addWriteToken(tok);
  return update(ref(db, 'current_tournament'), { ...fields, _writeToken: tok }).catch(err => {
    console.error('Firebase pushAtomicUpdate failed', err);
    onError?.('Write failed — check your connection');
  });
}
