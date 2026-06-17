import { useState, useEffect } from 'react';
import { hasPermission } from '../../roleConfig';

export default function BreakBanner({ breakMode, onBreakEnd, role }) {
  const [breakSecsLeft, setBreakSecsLeft] = useState(() =>
    breakMode ? Math.max(0, Math.round((breakMode.endAt - Date.now()) / 1000)) : 0
  );

  useEffect(() => {
    if (!breakMode) return;
    const tick = () =>
      setBreakSecsLeft(Math.max(0, Math.round((breakMode.endAt - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [breakMode?.endAt]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!breakMode) return null;

  const bMins = Math.floor(breakSecsLeft / 60),
    bSecs = breakSecsLeft % 60;
  const over = breakSecsLeft === 0;

  return (
    <div
      className="rounded-2xl flex flex-col gap-2"
      style={{
        padding: 'clamp(14px,3.5vw,22px)',
        background: 'linear-gradient(135deg,#fef3c7,#fde68a)',
        border: '1px solid rgba(217,119,6,0.4)',
      }}
    >
      <div className="flex items-center gap-3">
        <span style={{ fontSize: 'clamp(22px,5.5vw,32px)', flexShrink: 0 }}>☕</span>
        <div className="flex-1">
          <p
            style={{
              fontWeight: 900,
              fontSize: 'clamp(14px,3.5vw,20px)',
              color: '#92400e',
              margin: 0,
            }}
          >
            {breakMode.message}
          </p>
          <p style={{ fontSize: 'clamp(10px,2.5vw,13px)', color: '#b45309', margin: 0 }}>
            Tournament is on a break — matches resume shortly.
          </p>
        </div>
        <div
          style={{
            fontFamily: 'monospace',
            fontWeight: 800,
            fontSize: 'clamp(18px,5vw,28px)',
            color: over ? '#ef4444' : '#92400e',
            flexShrink: 0,
          }}
        >
          {over ? 'OVER' : `${bMins}:${String(bSecs).padStart(2, '0')}`}
        </div>
      </div>
      {hasPermission(role, 'canBreakTournament') && (
        <button
          onClick={onBreakEnd}
          style={{
            alignSelf: 'flex-start',
            padding: '6px 16px',
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 'clamp(11px,2.5vw,13px)',
            cursor: 'pointer',
            background: 'rgba(146,64,14,0.15)',
            color: '#92400e',
            border: '1px solid rgba(146,64,14,0.3)',
          }}
        >
          End Break
        </button>
      )}
    </div>
  );
}
