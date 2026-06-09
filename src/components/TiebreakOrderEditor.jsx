const CRITERION_LABELS = { wins: 'Wins', scoreDiff: 'Score differential', headToHead: 'Head-to-head' };

export default function TiebreakOrderEditor({ order, onChange }) {
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
          <span className="font-black text-slate-500" style={{ width: 22, fontSize: 13 }}>{i + 1}.</span>
          <span className="flex-1 font-semibold" style={{ color: '#334155', fontSize: 'clamp(12px,3vw,14px)' }}>
            {CRITERION_LABELS[criterion] || criterion}
          </span>
          <button onClick={() => move(i, -1)} disabled={i === 0}
            style={{ width: 28, height: 28, borderRadius: 8, fontWeight: 700, cursor: i === 0 ? 'default' : 'pointer', opacity: i === 0 ? 0.35 : 1, background: 'rgba(99,102,241,0.1)', color: '#4338ca', border: '1px solid rgba(99,102,241,0.25)' }}>
            ↑
          </button>
          <button onClick={() => move(i, 1)} disabled={i === order.length - 1}
            style={{ width: 28, height: 28, borderRadius: 8, fontWeight: 700, cursor: i === order.length - 1 ? 'default' : 'pointer', opacity: i === order.length - 1 ? 0.35 : 1, background: 'rgba(99,102,241,0.1)', color: '#4338ca', border: '1px solid rgba(99,102,241,0.25)' }}>
            ↓
          </button>
        </div>
      ))}
    </div>
  );
}
