import { useState } from 'react';
import NumInput from './NumInput';
import { chipStyle } from '../utils/chipStyle';

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
    const w = teams[wIdx], l = teams[1 - wIdx];
    onResult({
      winnerId: w.id,
      loserId: l.id,
      winnerScore: wIdx === 0 ? Number(s0) : Number(s1),
      loserScore: wIdx === 0 ? Number(s1) : Number(s0),
    });
  };

  if (pendingResult) {
    const winner = teams.find((t: any) => t.id === pendingResult.winnerId);
    const loser = teams.find((t: any) => t.id === pendingResult.loserId);
    return (
      <div
        className="rounded-2xl"
        style={{
          padding: 'clamp(10px,2.5vw,16px)',
          background: 'var(--ball-bg)',
          borderTop: '1px solid var(--ball-border)',
          borderRight: '1px solid var(--ball-border)',
          borderBottom: '1px solid var(--ball-border)',
          borderLeft: '3px solid var(--ball)',
        }}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span style={{ color: 'var(--court)', fontSize: 'clamp(16px,4vw,22px)', flexShrink: 0, fontWeight: 800 }}>
            ✓
          </span>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              color: 'var(--court)',
              fontWeight: 700,
              fontSize: 'clamp(12px,3vw,15px)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              flexShrink: 0,
            }}
          >
            {courtLabel}
          </span>
          {winner && loser && (
            <div className="flex items-center gap-2 flex-1 flex-wrap" style={{ minWidth: 0 }}>
              <span style={{ color: 'var(--ink)', fontWeight: 800, fontSize: 'clamp(12px,3vw,15px)' }}>
                {winner.name}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--ink)', fontSize: 'clamp(17px,4.5vw,23px)', lineHeight: 1, minWidth: '2ch', textAlign: 'right' }}>
                  {pendingResult.winnerScore}
                </span>
                <span style={{ color: 'var(--muted)', fontSize: 'clamp(13px,3vw,16px)', fontWeight: 700 }}>–</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--muted)', fontSize: 'clamp(17px,4.5vw,23px)', lineHeight: 1, minWidth: '2ch', textAlign: 'left' }}>
                  {pendingResult.loserScore}
                </span>
              </div>
              <span style={{ color: 'var(--muted)', fontWeight: 800, fontSize: 'clamp(12px,3vw,15px)' }}>
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
                background: 'var(--red-faint)',
                color: 'var(--red)',
                border: '1px solid var(--red-soft)',
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
        background: 'var(--white)',
        borderTop: '1px solid var(--border)',
        borderRight: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
        borderLeft: '3px solid var(--court)',
        boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
      }}
    >
      <div className="flex items-center gap-2">
        <span
          style={{
            fontFamily: 'var(--font-display)',
            color: 'var(--court)',
            fontWeight: 700,
            fontSize: 'clamp(12px,3vw,15px)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            flex: 1,
          }}
        >
          {courtLabel}
        </span>
        {onEdit && (
          <button
            onClick={onEdit}
            style={{
              fontSize: 'clamp(10px,2vw,12px)',
              padding: '2px 8px',
              borderRadius: 6,
              fontWeight: 600,
              cursor: 'pointer',
              background: 'var(--court-faint)',
              color: 'var(--court)',
              border: '1px solid var(--court-soft)',
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
              background: 'var(--red-faint)',
              color: 'var(--red)',
              border: '1px solid var(--red-soft)',
              flexShrink: 0,
            }}
          >
            ✕ Remove
          </button>
        )}
      </div>

      {teams.map((team: any, i: number) => {
        const iw = wIdx === i;
        return (
          <div key={team.id}>
            <div className="flex items-center" style={{ gap: 'clamp(6px,1.5vw,12px)' }}>
              <div
                className="flex-1 flex items-center rounded-xl overflow-hidden"
                style={{
                  ...chipStyle(team, iw),
                  display: 'flex',
                  gap: 'clamp(8px,2vw,12px)',
                  padding: 'clamp(8px,2vw,14px) clamp(10px,2.5vw,16px)',
                  borderLeft: `8px solid ${team.chipBackground ?? team.color}`,
                }}
              >
                <span
                  style={{
                    fontWeight: 800,
                    fontSize: 'clamp(16px,4.5vw,26px)',
                    flex: 1,
                    color: iw ? team.text : 'var(--ink)',
                    lineHeight: 1.1,
                  }}
                >
                  {team.name}
                </span>
              </div>
              <NumInput value={i === 0 ? s0 : s1} onChange={i === 0 ? setS0 : setS1} />
            </div>
            {i === 0 && (
              <div
                style={{
                  textAlign: 'center',
                  color: 'var(--muted)',
                  fontSize: 'clamp(10px,2.5vw,12px)',
                  fontWeight: 700,
                  margin: 'clamp(3px,0.8vw,6px) 0',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                }}
              >
                vs
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
          background: valid ? 'var(--court)' : 'rgba(0,0,0,0.05)',
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
