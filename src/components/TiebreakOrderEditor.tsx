const CRITERION_LABELS: Record<string, string> = {
  wins: 'Wins',
  scoreDiff: 'Score differential',
  headToHead: 'Head-to-head',
};

export default function TiebreakOrderEditor({ order, onChange }: { order: string[]; onChange: (v: string[]) => void; dark?: boolean }) {
  const move = (i: number, dir: number) => {
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div className="flex flex-col" style={{ gap: 6 }}>
      {order.map((criterion, i) => (
        <div
          key={criterion}
          className="flex items-center rounded-xl"
          style={{
            gap: 10,
            padding: '10px 12px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
          }}
        >
          <span
            style={{
              width: 20,
              fontSize: 11,
              fontWeight: 800,
              color: 'var(--court)',
              textAlign: 'center',
              flexShrink: 0,
              letterSpacing: '0.04em',
            }}
          >
            {i + 1}
          </span>
          <span
            className="flex-1"
            style={{ color: 'var(--ink)', fontSize: 14, fontWeight: 600 }}
          >
            {CRITERION_LABELS[criterion] || criterion}
          </span>
          <div className="flex" style={{ gap: 4, flexShrink: 0 }}>
            <button
              onClick={() => move(i, -1)}
              disabled={i === 0}
              title="Move up"
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                fontWeight: 700,
                fontSize: 14,
                cursor: i === 0 ? 'default' : 'pointer',
                opacity: i === 0 ? 0.3 : 1,
                background: 'var(--white)',
                color: 'var(--court)',
                border: '1px solid var(--court-soft)',
              }}
            >
              ↑
            </button>
            <button
              onClick={() => move(i, 1)}
              disabled={i === order.length - 1}
              title="Move down"
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                fontWeight: 700,
                fontSize: 14,
                cursor: i === order.length - 1 ? 'default' : 'pointer',
                opacity: i === order.length - 1 ? 0.3 : 1,
                background: 'var(--white)',
                color: 'var(--court)',
                border: '1px solid var(--court-soft)',
              }}
            >
              ↓
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
