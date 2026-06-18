import { useState } from 'react';
import { sha256hex } from '../utils/pin';

interface Props {
  title?: string;
  checkPin: ((hash: string) => string | null) | null;
  pinLoadError?: boolean;
  onSuccess: (role: string) => void;
  onClose: () => void;
}
export default function PinModal({ title = 'Login', checkPin, pinLoadError, onSuccess, onClose }: Props) {
  const [pin, setPin] = useState('');
  const [errMsg, setErrMsg] = useState('');

  const showErr = (msg: string) => {
    setErrMsg(msg);
    setTimeout(() => setErrMsg(''), 1800);
  };

  const check = async () => {
    if (!checkPin) return;
    const hash = await sha256hex(pin);
    const matched = checkPin(hash);
    if (matched !== null) onSuccess(matched);
    else {
      showErr('Incorrect PIN');
      setPin('');
    }
  };

  const hasErr = !!errMsg;
  const ready = !!checkPin;

  return (
    <div className="modal-overlay">
      <div
        className="rounded-2xl p-6 w-full max-w-xs flex flex-col gap-5 modal-box"
        style={{ border: hasErr ? '1px solid rgba(220,38,38,0.4)' : undefined }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 22, marginBottom: 4 }}>🔐</div>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--court)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {title}
          </div>
          {errMsg && <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 4 }}>{errMsg}</div>}
        </div>
        {pinLoadError && (
          <div className="notice-amber">Could not load PIN — check connection.</div>
        )}
        {!ready ? (
          <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, padding: '8px 0' }}>
            Loading…
          </div>
        ) : (
          <input
            type="password"
            inputMode="numeric"
            value={pin}
            placeholder="PIN"
            onChange={(e) => setPin(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && check()}
            autoFocus
            className="input-dark"
            style={{
              textAlign: 'center',
              fontSize: 22,
              letterSpacing: 8,
              border: hasErr ? '1px solid rgba(220,38,38,0.5)' : undefined,
            }}
          />
        )}
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-bold btn-cancel">
            Cancel
          </button>
          <button
            onClick={check}
            disabled={!ready}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold btn-indigo"
          >
            Unlock
          </button>
        </div>
      </div>
    </div>
  );
}
