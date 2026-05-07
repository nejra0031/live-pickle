import { useState } from 'react';

const sha256hex = async str => {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
};

export default function PinModal({ title = 'Admin PIN', correctPin, pinLoaded, pinLoadError, onSuccess, onClose }) {
  const [pin, setPin] = useState('');
  const [errMsg, setErrMsg] = useState('');

  const showErr = msg => { setErrMsg(msg); setTimeout(() => setErrMsg(''), 1800); };

  const check = async () => {
    if (!pinLoaded) return;
    if (!correctPin) { showErr('No PIN is configured in the database.'); return; }
    if (await sha256hex(pin) === correctPin) onSuccess();
    else { showErr('Incorrect PIN'); setPin(''); }
  };

  const hasErr = !!errMsg;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="rounded-2xl p-6 w-full max-w-xs flex flex-col gap-4"
        style={{ background: '#1e293b', border: `1px solid ${hasErr ? '#ef4444' : 'rgba(99,102,241,0.4)'}` }}
        onClick={e => e.stopPropagation()}>
        <div className="text-center">
          <div className="text-2xl mb-1">🔐</div>
          <div className="text-sm font-bold text-indigo-300">{title}</div>
          {errMsg && <div className="text-xs text-red-400 mt-1">{errMsg}</div>}
        </div>
        {pinLoadError && (
          <div className="text-xs text-amber-400 text-center">Could not load PIN — check connection.</div>
        )}
        {!pinLoaded
          ? <div style={{ textAlign: 'center', color: '#64748b', fontSize: 13, padding: '8px 0' }}>Loading…</div>
          : <input type="password" inputMode="numeric" maxLength={4} value={pin} placeholder="••••"
              onChange={e => setPin(e.target.value)} onKeyDown={e => e.key === 'Enter' && check()} autoFocus
              style={{ textAlign: 'center', padding: '10px', borderRadius: 10, fontSize: 20, letterSpacing: 6, background: 'rgba(255,255,255,0.07)', border: `1px solid ${hasErr ? '#ef4444' : 'rgba(255,255,255,0.15)'}`, color: '#e2e8f0', outline: 'none' }} />
        }
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl text-sm font-bold btn-cancel">Cancel</button>
          <button onClick={check} disabled={!pinLoaded} className="flex-1 py-2 rounded-xl text-sm font-bold"
            style={{ background: pinLoaded ? 'linear-gradient(90deg,#6366f1,#8b5cf6)' : 'rgba(255,255,255,0.08)', color: pinLoaded ? '#fff' : '#475569', cursor: pinLoaded ? 'pointer' : 'not-allowed', border: 'none' }}>
            Unlock
          </button>
        </div>
      </div>
    </div>
  );
}
