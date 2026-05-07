import { SAVE_KEY } from './constants';

export function saveState(s) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch (_) {}
}
export function loadState() {
  try { const r = localStorage.getItem(SAVE_KEY); return r ? JSON.parse(r) : null; } catch (_) { return null; }
}
export function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch (_) {}
}
