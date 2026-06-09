const CRITERION_LABELS = { wins: 'Wins', scoreDiff: 'Score differential', headToHead: 'Head-to-head' };

export default function TiebreakOrderEditor({ order, onChange, dark = false }) {
  const move = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div className="flex flex-col" style={{ gap: 6 }}>
      {order.map((criterion, i) => (
        <div key={criterion} className="flex items-center" style={{ gap: 8 }}>
          <span style={{ width: 22, fontSize: 13, fontWeight: 900, color: dark ? '#64748b' : '#94a3b8' }}>{i + 1}.</span>
          <span className="flex-1 font-semibold" style={{ color: dark ? '#e2e8f0' : '#334155', fontSize: 'clamp(12px,3vw,14px)' }}>
            {CRITERION_LABELS[criterion] || criterion}
          </span>
          <button onClick={() => move(i, -1)} disabled={i === 0}
            style={{ width: 28, height: 28, borderRadius: 8, fontWeight: 700, cursor: i === 0 ? 'default' : 'pointer', opacity: i === 0 ? 0.35 : 1, background: dark ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.1)', color: dark ? '#a5b4fc' : '#4338ca', border: `1px solid ${dark ? 'rgba(99,102,241,0.4)' : 'rgba(99,102,241,0.25)'}` }}>
            ↑
          </button>
          <button onClick={() => move(i, 1)} disabled={i === order.length - 1}
            style={{ width: 28, height: 28, borderRadius: 8, fontWeight: 700, cursor: i === order.length - 1 ? 'default' : 'pointer', opacity: i === order.length - 1 ? 0.35 : 1, background: dark ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.1)', color: dark ? '#a5b4fc' : '#4338ca', border: `1px solid ${dark ? 'rgba(99,102,241,0.4)' : 'rgba(99,102,241,0.25)'}` }}>
            ↓
          </button>
        </div>
      ))}
    </div>
  );
}
