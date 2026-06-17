import { useState } from 'react';
import NumInput from './NumInput';

export default function CourtCard({
  courtLabel,
  teams,
  onResult,
  pendingResult,
  onEdit,
  onRemove,
  onUndo,
}: {
  courtLabel: any;
  teams: any;
  onResult: any;
  pendingResult: any;
  onEdit?: any;
  onRemove?: any;
  onUndo: any;
}) {
  const [s0, setS0] = useState('');
  const [s1, setS1] = useState('');
  const valid = s0 !== '' && s1 !== '' && Number(s0) !== Number(s1);
  const wIdx = valid ? (Number(s0) > Number(s1) ? 0 : 1) : null;

  const confirm = () => {
    if (!valid || wIdx === null) return;
    const w = teams[wIdx],
      l = teams[1 - wIdx];
    onResult({
      winnerId: w.id,
      loserId: l.id,
      winnerScore: wIdx === 0 ? Number(s0) : Number(s1),
      loserScore: wIdx === 0 ? Number(s1) : Number(s0),
    });
  };

  if (pendingResult) {
    const winner = teams.find((t) => t.id === pendingResult.winnerId);
    const loser = teams.find((t) => t.id === pendingResult.loserId);
    return (
      <div
        className="rounded-2xl"
        style={{
          padding: 'clamp(10px,2.5vw,16px)',
          background: '#f0fdf4',
          border: '1px solid rgba(34,197,94,0.3)',
        }}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span style={{ color: '#16a34a', fontSize: 'clamp(16px,4vw,22px)', flexShrink: 0 }}>
            ✓
          </span>
          <span
            style={{
              color: '#0f4c75',
              fontWeight: 800,
              fontSize: 'clamp(10px,2.5vw,13px)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              flexShrink: 0,
            }}
          >
            {courtLabel}
          </span>
          {winner && loser && (
            <div className="flex items-center gap-1 flex-1 flex-wrap" style={{ minWidth: 0 }}>
              <span
                style={{
                  color: winner.color,
                  fontWeight: 800,
                  fontSize: 'clamp(12px,3vw,15px)',
                  whiteSpace: 'nowrap',
                }}
              >
                {winner.name}
              </span>
              <span style={{ fontWeight: 900, color: '#1e293b', fontSize: 'clamp(13px,3vw,16px)' }}>
                {pendingResult.winnerScore}
              </span>
              <span style={{ color: '#94a3b8', fontSize: 'clamp(12px,3vw,15px)' }}>–</span>
              <span style={{ fontWeight: 900, color: '#1e293b', fontSize: 'clamp(13px,3vw,16px)' }}>
                {pendingResult.loserScore}
              </span>
              <span
                style={{
                  color: loser.color,
                  fontWeight: 800,
                  fontSize: 'clamp(12px,3vw,15px)',
                  whiteSpace: 'nowrap',
                }}
              >
                {loser.name}
              </span>
            </div>
          )}
          {onUndo && (
            <button
              onClick={onUndo}
              style={{
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: 6,
                cursor: 'pointer',
                background: 'rgba(220,38,38,0.08)',
                color: '#dc2626',
                border: '1px solid rgba(220,38,38,0.2)',
                flexShrink: 0,
                marginLeft: 'auto',
              }}
            >
              ✕ Undo
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl flex flex-col"
      style={{
        padding: 'clamp(12px,3vw,20px)',
        gap: 'clamp(8px,2vw,14px)',
        background: '#fff',
        border: '1px solid rgba(0,0,0,0.1)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      }}
    >
      <div className="flex items-center gap-2">
        <span
          style={{
            color: '#0f4c75',
            fontWeight: 800,
            fontSize: 'clamp(10px,2.5vw,13px)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          {courtLabel}
        </span>
        <div className="flex-1 h-px" style={{ background: 'rgba(0,0,0,0.08)' }} />
        {onEdit && (
          <button
            onClick={onEdit}
            style={{
              fontSize: 'clamp(10px,2vw,12px)',
              padding: '2px 8px',
              borderRadius: 6,
              fontWeight: 600,
              cursor: 'pointer',
              background: 'rgba(99,102,241,0.08)',
              color: '#6366f1',
              border: '1px solid rgba(99,102,241,0.25)',
              flexShrink: 0,
            }}
          >
            ✏ Edit
          </button>
        )}
        {onRemove && (
          <button
            onClick={onRemove}
            style={{
              fontSize: 'clamp(10px,2vw,12px)',
              padding: '2px 8px',
              borderRadius: 6,
              fontWeight: 600,
              cursor: 'pointer',
              background: 'rgba(220,38,38,0.08)',
              color: '#dc2626',
              border: '1px solid rgba(220,38,38,0.25)',
              flexShrink: 0,
            }}
          >
            ✕ Remove
          </button>
        )}
      </div>

      {teams.map((team, i) => {
        const iw = wIdx === i;
        return (
          <div key={team.id}>
            <div className="flex items-center" style={{ gap: 'clamp(6px,1.5vw,12px)' }}>
              <div
                className="flex-1 flex items-center rounded-xl"
                style={{
                  gap: 'clamp(6px,1.5vw,10px)',
                  padding: 'clamp(8px,2vw,14px) clamp(10px,2.5vw,16px)',
                  background: iw ? (team.chipBackground ?? team.color) : 'rgba(0,0,0,0.03)',
                  border: `1.5px solid ${iw ? team.color : 'rgba(0,0,0,0.08)'}`,
                }}
              >
                <div
                  style={{
                    width: 'clamp(10px,2.5vw,14px)',
                    height: 'clamp(10px,2.5vw,14px)',
                    borderRadius: '50%',
                    flexShrink: 0,
                    background: team.chipBackground ?? team.color,
                    boxShadow: iw ? 'none' : `0 0 0 2px ${team.color}44`,
                  }}
                />
                <span
                  style={{
                    fontWeight: 800,
                    fontSize: 'clamp(14px,3.5vw,20px)',
                    flex: 1,
                    color: iw ? team.text : '#1e293b',
                  }}
                >
                  {team.name}
                </span>
                {iw && (
                  <span
                    style={{
                      fontSize: 'clamp(10px,2.5vw,13px)',
                      fontWeight: 700,
                      color: team.text,
                    }}
                  >
                    WIN
                  </span>
                )}
              </div>
              <NumInput value={i === 0 ? s0 : s1} onChange={i === 0 ? setS0 : setS1} />
            </div>
            {i === 0 && (
              <div
                style={{
                  textAlign: 'center',
                  color: '#94a3b8',
                  fontSize: 'clamp(10px,2.5vw,13px)',
                  fontWeight: 700,
                  margin: 'clamp(3px,0.8vw,6px) 0',
                }}
              >
                VS
              </div>
            )}
          </div>
        );
      })}

      {s0 !== '' && s1 !== '' && !valid && (
        <p style={{ fontSize: 'clamp(10px,2.5vw,13px)', color: '#d97706', textAlign: 'center' }}>
          Scores cannot be equal.
        </p>
      )}
      <button
        onClick={confirm}
        disabled={!valid}
        style={{
          width: '100%',
          padding: 'clamp(10px,2.5vw,14px)',
          borderRadius: 12,
          fontWeight: 800,
          fontSize: 'clamp(13px,3.5vw,18px)',
          cursor: valid ? 'pointer' : 'not-allowed',
          background: valid ? 'linear-gradient(90deg,#0f4c75,#1a6fa8)' : 'rgba(0,0,0,0.05)',
          color: valid ? '#fff' : '#94a3b8',
          border: valid ? 'none' : '1px solid rgba(0,0,0,0.07)',
        }}
      >
        {valid && wIdx !== null
          ? `✓ Confirm — ${teams[wIdx].name} wins`
          : 'Enter scores to confirm'}
      </button>
    </div>
  );
}
