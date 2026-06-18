import { useState } from 'react';
import { sha256hex } from '../utils/pin';
import { ROLE_MAP } from '../roleConfig';
import type { RoleId } from '../types';

interface Props {
  checkPin: ((hash: string) => string | null) | null;
  pinLoadError: boolean;
  currentRole: string | null;
  onPinSuccess: (role: string) => void;
  onClearRole: () => void;
  user: any;
  onSignIn: (() => void) | null;
  onSignOut: (() => void) | null;
  onClose: () => void;
}

export default function LoginModal({
  checkPin,
  pinLoadError,
  currentRole,
  onPinSuccess,
  onClearRole,
  user,
  onSignIn,
  onSignOut,
  onClose,
}: Props) {
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
    if (matched !== null) {
      onPinSuccess(matched);
      onClose();
    } else {
      showErr('Incorrect PIN');
      setPin('');
    }
  };

  const hasErr = !!errMsg;
  const pinReady = !!checkPin;
  const roleInfo = currentRole ? ROLE_MAP[currentRole as RoleId] : null;
  const showGoogle = !!onSignIn;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="rounded-2xl p-6 w-full max-w-xs flex flex-col gap-5 modal-box"
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 22, marginBottom: 4 }}>🔐</div>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--court)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Access
          </div>
        </div>

        {/* PIN section */}
        <div className="flex flex-col gap-3">
          <p className="modal-label">PIN</p>
          {currentRole ? (
            <div className="flex flex-col gap-2">
              <div style={{ textAlign: 'center', color: 'var(--court)', fontSize: 14, fontWeight: 700 }}>
                ✓ {roleInfo?.title ?? currentRole}
              </div>
              <button
                onClick={() => { onClearRole(); onClose(); }}
                className="py-2.5 rounded-xl text-sm font-bold btn-cancel"
                style={{ width: '100%' }}
              >
                Sign out of PIN session
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {pinLoadError && (
                <div className="notice-amber">Could not load PIN — check connection.</div>
              )}
              {errMsg && (
                <div style={{ fontSize: 12, color: 'var(--red)', textAlign: 'center' }}>{errMsg}</div>
              )}
              {!pinReady ? (
                <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, padding: '6px 0' }}>
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
              <button
                onClick={check}
                disabled={!pinReady || !pin}
                className="py-2.5 rounded-xl text-sm font-bold btn-indigo"
                style={{ width: '100%' }}
              >
                Unlock
              </button>
            </div>
          )}
        </div>

        {/* Google section */}
        {showGoogle && (
          <>
            <div className="flex items-center gap-2">
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              <span style={{ color: 'var(--muted)', fontSize: 11, fontWeight: 600 }}>or</span>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>

            <div className="flex flex-col gap-2">
              <p className="modal-label">Google account</p>
              {user ? (
                <div className="flex items-center gap-2">
                  {user.photoURL && (
                    <img src={user.photoURL} alt="" style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0 }} />
                  )}
                  <span style={{ flex: 1, fontSize: 12, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
                    {user.email}
                  </span>
                  <button
                    onClick={() => { onSignOut?.(); onClose(); }}
                    className="btn-cancel rounded-lg text-xs font-bold"
                    style={{ flexShrink: 0, padding: '4px 10px' }}
                  >
                    Sign out
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { onSignIn?.(); onClose(); }}
                  className="py-2.5 rounded-xl text-sm font-bold"
                  style={{ width: '100%', background: 'var(--ink)', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                  <span style={{ fontSize: 15, lineHeight: 1 }}>G</span>
                  Sign in with Google
                </button>
              )}
            </div>
          </>
        )}

        <button
          onClick={onClose}
          className="py-2.5 rounded-xl text-sm font-bold btn-cancel"
          style={{ width: '100%' }}
        >
          Close
        </button>
      </div>
    </div>
  );
}
