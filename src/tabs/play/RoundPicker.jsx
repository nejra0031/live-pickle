// Lets viewers/admins browse any round of a pre-generated schedule (Round Robin,
// Trio, Doubles RR) without dumping every round into one long list — which is
// confusing once a tournament has many rounds. Defaults to the live round; a
// "Back to current round" pill appears whenever the viewer has navigated away.
export default function RoundPicker({ totalRounds, currentRoundIdx, viewedRoundIdx, onSelectRound, roundLabel }) {
  if (totalRounds <= 1) return null;
  const atFirst = viewedRoundIdx <= 0;
  const atLast = viewedRoundIdx >= totalRounds - 1;
  const isCurrent = viewedRoundIdx === currentRoundIdx;

  return (
    <div className="flex items-center flex-wrap" style={{ gap: 'clamp(6px,1.5vw,10px)' }}>
      <button onClick={() => onSelectRound(viewedRoundIdx - 1)} disabled={atFirst}
        style={{ width: 32, height: 32, borderRadius: 10, fontWeight: 800, fontSize: 16, cursor: atFirst ? 'not-allowed' : 'pointer', background: atFirst ? 'rgba(0,0,0,0.03)' : 'rgba(15,76,117,0.08)', color: atFirst ? '#cbd5e1' : '#0f4c75', border: '1px solid rgba(0,0,0,0.08)', flexShrink: 0 }}>
        ‹
      </button>
      <select value={viewedRoundIdx} onChange={e => onSelectRound(Number(e.target.value))}
        style={{ padding: 'clamp(6px,1.5vw,8px) clamp(10px,2.5vw,14px)', borderRadius: 10, fontWeight: 700, fontSize: 'clamp(12px,2.8vw,14px)', background: '#fff', border: '1px solid rgba(0,0,0,0.12)', color: '#0f4c75', cursor: 'pointer' }}>
        {Array.from({ length: totalRounds }, (_, i) => (
          <option key={i} value={i}>{roundLabel(i)}{i === currentRoundIdx ? ' (current)' : ''}</option>
        ))}
      </select>
      <button onClick={() => onSelectRound(viewedRoundIdx + 1)} disabled={atLast}
        style={{ width: 32, height: 32, borderRadius: 10, fontWeight: 800, fontSize: 16, cursor: atLast ? 'not-allowed' : 'pointer', background: atLast ? 'rgba(0,0,0,0.03)' : 'rgba(15,76,117,0.08)', color: atLast ? '#cbd5e1' : '#0f4c75', border: '1px solid rgba(0,0,0,0.08)', flexShrink: 0 }}>
        ›
      </button>
      {!isCurrent && (
        <button onClick={() => onSelectRound(currentRoundIdx)}
          style={{ padding: 'clamp(6px,1.5vw,8px) clamp(10px,2.5vw,14px)', borderRadius: 10, fontWeight: 700, fontSize: 'clamp(11px,2.5vw,13px)', cursor: 'pointer', background: 'rgba(99,102,241,0.1)', color: '#4338ca', border: '1px solid rgba(99,102,241,0.3)' }}>
          ↩ Back to current round
        </button>
      )}
    </div>
  );
}
