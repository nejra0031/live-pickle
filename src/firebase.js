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
// Tokens are used to suppress echo updates from our own writes.
// Bounded to 50 entries to prevent unbounded growth.
const _tokens = new Set();

export function addWriteToken(tok) {
  _tokens.add(tok);
  if (_tokens.size > 50) _tokens.delete(_tokens.values().next().value);
}
export function isOwnToken(tok) { return _tokens.has(tok); }

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
