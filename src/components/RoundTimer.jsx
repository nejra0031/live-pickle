import { useState, useEffect } from 'react';

export default function RoundTimer({ secsLeft, totalSecs, roundNum, timerRunning, isAdmin, onToggle, onRestart, onOpenSettings, breakInfo, onEndBreak }) {
  const [breakSecsLeft, setBreakSecsLeft] = useState(() => breakInfo ? Math.max(0, Math.round((breakInfo.endAt - Date.now()) / 1000)) : 0);

  useEffect(() => {
    if (!breakInfo) return;
    const tick = () => setBreakSecsLeft(Math.max(0, Math.round((breakInfo.endAt - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [breakInfo?.endAt]); // eslint-disable-line react-hooks/exhaustive-deps

  if (breakInfo) {
    const bm = Math.floor(breakSecsLeft / 60), bs = breakSecsLeft % 60, over = breakSecsLeft === 0;
    return (
      <div className="flex items-center rounded-xl"
        style={{ padding: 'clamp(6px,1.5vw,10px) clamp(10px,2.5vw,16px)', gap: 'clamp(8px,2vw,14px)', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.5)', marginBottom: 'clamp(6px,1.5vw,10px)' }}>
        <div style={{ fontSize: 'clamp(20px,5vw,28px)', flexShrink: 0 }}>☕</div>
        <div className="flex-1">
          <div style={{ fontSize: 'clamp(9px,2vw,12px)', color: '#d97706', lineHeight: 1, marginBottom: 2, fontWeight: 800, letterSpacing: '0.08em' }}>BREAK</div>
          <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 'clamp(13px,3.5vw,18px)', lineHeight: 1, color: over ? '#ef4444' : '#92400e' }}>
            {over ? 'BREAK OVER' : `${bm}:${String(bs).padStart(2, '0')}`}
          </div>
        </div>
        {isAdmin && (
          <button onClick={onEndBreak}
            style={{ fontSize: 'clamp(10px,2.5vw,13px)', padding: 'clamp(4px,1vw,7px) clamp(8px,2vw,12px)', borderRadius: 8, fontWeight: 700, cursor: 'pointer', background: 'rgba(251,191,36,0.2)', color: '#92400e', border: '1px solid rgba(251,191,36,0.5)' }}>
            End Break
          </button>
        )}
      </div>
    );
  }

  const mins = Math.floor(secsLeft / 60), secs = secsLeft % 60;
  const pct  = totalSecs > 0 ? secsLeft / totalSecs : 1;
  const expired = secsLeft === 0, urgent = pct < 0.2 && !expired;
  const color = expired ? '#ef4444' : urgent ? '#f97316' : '#6366f1';

  return (
    <div className="flex items-center rounded-xl"
      style={{ padding: 'clamp(6px,1.5vw,10px) clamp(10px,2.5vw,16px)', gap: 'clamp(8px,2vw,14px)', background: 'rgba(0,0,0,0.03)', border: `1px solid ${color}66`, marginBottom: 'clamp(6px,1.5vw,10px)' }}>
      <svg style={{ width: 'clamp(28px,7vw,38px)', height: 'clamp(28px,7vw,38px)', flexShrink: 0 }} viewBox="0 0 34 34">
        <circle cx={17} cy={17} r={13} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth={3} />
        <circle cx={17} cy={17} r={13} fill="none" stroke={color} strokeWidth={3}
          strokeDasharray={`${2 * Math.PI * 13}`} strokeDashoffset={`${-2 * Math.PI * 13 * (1 - pct)}`}
          strokeLinecap="round" transform="rotate(-90 17 17)"
          style={{ transition: 'stroke-dashoffset 1s linear,stroke 0.3s' }} />
        {expired && <text x={17} y={21} textAnchor="middle" fontSize={9} fill="#dc2626" fontWeight="bold">!</text>}
      </svg>
      <div className="flex-1">
        <div style={{ fontSize: 'clamp(9px,2vw,12px)', color: '#94a3b8', lineHeight: 1, marginBottom: 2 }}>Round {roundNum}</div>
        <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 'clamp(13px,3.5vw,18px)', lineHeight: 1, color: expired ? '#dc2626' : urgent ? '#ea580c' : '#1e293b' }}>
          {expired ? "TIME'S UP" : `${mins}:${String(secs).padStart(2, '0')}`}
        </div>
      </div>
      {isAdmin && (
        <div className="flex" style={{ gap: 'clamp(4px,1vw,8px)' }}>
          <button onClick={onToggle}
            style={{ fontSize: 'clamp(11px,2.5vw,14px)', padding: 'clamp(4px,1vw,7px) clamp(8px,2vw,12px)', borderRadius: 8, fontWeight: 700, cursor: 'pointer', background: timerRunning ? 'rgba(220,38,38,0.1)' : 'rgba(15,76,117,0.1)', color: timerRunning ? '#dc2626' : '#0f4c75', border: `1px solid ${timerRunning ? 'rgba(220,38,38,0.25)' : 'rgba(15,76,117,0.25)'}` }}>
            {timerRunning ? '⏸' : '▶'}
          </button>
          <button onClick={onRestart} style={{ fontSize: 'clamp(11px,2.5vw,14px)', padding: 'clamp(4px,1vw,7px) clamp(8px,2vw,12px)', borderRadius: 8, fontWeight: 700, cursor: 'pointer', background: 'rgba(0,0,0,0.05)', color: '#64748b', border: '1px solid rgba(0,0,0,0.1)' }}>↺</button>
          <button onClick={onOpenSettings} style={{ fontSize: 'clamp(11px,2.5vw,14px)', padding: 'clamp(4px,1vw,7px) clamp(8px,2vw,12px)', borderRadius: 8, fontWeight: 700, cursor: 'pointer', background: 'rgba(0,0,0,0.05)', color: '#64748b', border: '1px solid rgba(0,0,0,0.1)' }}>⚙</button>
        </div>
      )}
    </div>
  );
}
