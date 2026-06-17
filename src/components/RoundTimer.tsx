export default function RoundTimer({
  secsLeft,
  totalSecs,
  roundNum,
  timerRunning,
  canToggleTimer,
  canControlTimer,
  onToggle,
  onRestart,
  onOpenSettings,
}: {
  secsLeft: any;
  totalSecs: any;
  roundNum?: any;
  timerRunning: any;
  canToggleTimer: any;
  canControlTimer: any;
  onToggle: any;
  onRestart: any;
  onOpenSettings: any;
}) {
  const mins = Math.floor(secsLeft / 60),
    secs = secsLeft % 60;
  const pct = totalSecs > 0 ? secsLeft / totalSecs : 1;
  const elapsed = 1 - pct;
  const expired = secsLeft === 0;

  // Gradient: red grows left→right as time elapses; 0% red at start, 100% at expiry
  const barBg = `linear-gradient(to right, #ef4444 ${elapsed * 100}%, #6366f1 ${elapsed * 100}%)`;

  return (
    <div
      style={{
        borderRadius: 12,
        background: barBg,
        display: 'flex',
        alignItems: 'center',
        padding: 'clamp(6px,1.5vw,10px) clamp(10px,2.5vw,16px)',
        gap: 'clamp(8px,2vw,14px)',
        position: 'relative',
      }}
    >
      {/* Time — absolutely centered in the full bar */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          textAlign: 'center',
          fontFamily: 'monospace',
          fontWeight: 800,
          fontSize: 'clamp(24px,6vw,36px)',
          color: 'white',
          textShadow: '0 1px 5px rgba(0,0,0,0.3)',
          pointerEvents: 'none',
          lineHeight: 1,
          zIndex: 1,
        }}
      >
        {expired ? "TIME'S UP" : `${mins}:${String(secs).padStart(2, '0')}`}
      </div>

      {/* Left: circle + Round label */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'clamp(4px,1vw,8px)',
          flexShrink: 0,
          position: 'relative',
          zIndex: 2,
        }}
      >
        <svg
          style={{ width: 'clamp(28px,7vw,38px)', height: 'clamp(28px,7vw,38px)', flexShrink: 0 }}
          viewBox="0 0 34 34"
        >
          <circle
            cx={17}
            cy={17}
            r={13}
            fill="none"
            stroke="rgba(255,255,255,0.3)"
            strokeWidth={3}
          />
          <circle
            cx={17}
            cy={17}
            r={13}
            fill="none"
            stroke="white"
            strokeWidth={3}
            strokeDasharray={`${2 * Math.PI * 13}`}
            strokeDashoffset={`${-2 * Math.PI * 13 * (1 - pct)}`}
            strokeLinecap="round"
            transform="rotate(-90 17 17)"
            style={{ transition: 'stroke-dashoffset 1s linear' }}
          />
          {expired && (
            <text x={17} y={21} textAnchor="middle" fontSize={9} fill="white" fontWeight="bold">
              !
            </text>
          )}
        </svg>
        <span
          style={{
            fontSize: 'clamp(14px,3.5vw,20px)',
            fontWeight: 800,
            color: 'white',
            textShadow: '0 1px 3px rgba(0,0,0,0.25)',
            whiteSpace: 'nowrap',
            lineHeight: 1,
          }}
        >
          Round {roundNum}
        </span>
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Right: timer controls */}
      {(canToggleTimer || canControlTimer) && (
        <div
          style={{ display: 'flex', gap: 'clamp(4px,1vw,8px)', position: 'relative', zIndex: 2 }}
        >
          {canToggleTimer && (
            <button
              onClick={onToggle}
              style={{
                fontSize: 'clamp(11px,2.5vw,14px)',
                padding: 'clamp(4px,1vw,7px) clamp(8px,2vw,12px)',
                borderRadius: 8,
                fontWeight: 700,
                cursor: 'pointer',
                background: 'rgba(255,255,255,0.2)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.35)',
              }}
            >
              {timerRunning ? '⏸' : '▶'}
            </button>
          )}
          {canControlTimer && (
            <button
              onClick={onRestart}
              style={{
                fontSize: 'clamp(11px,2.5vw,14px)',
                padding: 'clamp(4px,1vw,7px) clamp(8px,2vw,12px)',
                borderRadius: 8,
                fontWeight: 700,
                cursor: 'pointer',
                background: 'rgba(255,255,255,0.15)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.25)',
              }}
            >
              ↺
            </button>
          )}
          {canControlTimer && (
            <button
              onClick={onOpenSettings}
              style={{
                fontSize: 'clamp(11px,2.5vw,14px)',
                padding: 'clamp(4px,1vw,7px) clamp(8px,2vw,12px)',
                borderRadius: 8,
                fontWeight: 700,
                cursor: 'pointer',
                background: 'rgba(255,255,255,0.15)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.25)',
              }}
            >
              ⚙
            </button>
          )}
        </div>
      )}
    </div>
  );
}
