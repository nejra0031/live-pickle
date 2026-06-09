import { useState } from 'react';

const sha256hex = async str => {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
};

// checkPin: sync (hashHex: string) => role | null — null means no match
// If checkPin is null, pins are still loading
export default function PinModal({ title = 'Login', checkPin, pinLoadError, onSuccess, onClose }) {
  const [pin, setPin] = useState('');
  const [errMsg, setErrMsg] = useState('');

  const showErr = msg => { setErrMsg(msg); setTimeout(() => setErrMsg(''), 1800); };

  const check = async () => {
    if (!checkPin) return;
    const hash = await sha256hex(pin);
    const matched = checkPin(hash);
    if (matched !== null) onSuccess(matched);
    else { showErr('Incorrect PIN'); setPin(''); }
  };

  const hasErr = !!errMsg;
  const ready = !!checkPin;

  return (
    <div className="modal-overlay">
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
        {!ready
          ? <div style={{ textAlign: 'center', color: '#64748b', fontSize: 13, padding: '8px 0' }}>Loading…</div>
          : <input type="password" inputMode="numeric" value={pin} placeholder="PIN"
              onChange={e => setPin(e.target.value)} onKeyDown={e => e.key === 'Enter' && check()} autoFocus
              style={{ textAlign: 'center', padding: '10px', borderRadius: 10, fontSize: 20, letterSpacing: 6, background: 'rgba(255,255,255,0.07)', border: `1px solid ${hasErr ? '#ef4444' : 'rgba(255,255,255,0.15)'}`, color: '#e2e8f0', outline: 'none' }} />
        }
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl text-sm font-bold btn-cancel">Cancel</button>
          <button onClick={check} disabled={!ready} className="flex-1 py-2 rounded-xl text-sm font-bold"
            style={{ background: ready ? 'linear-gradient(90deg,#6366f1,#8b5cf6)' : 'rgba(255,255,255,0.08)', color: ready ? '#fff' : '#475569', cursor: ready ? 'pointer' : 'not-allowed', border: 'none' }}>
            Unlock
          </button>
        </div>
      </div>
    </div>
  );
}
