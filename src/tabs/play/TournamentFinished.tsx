import { useTeamLabel, useTeamById } from '../../context/TeamRegistryContext';

interface Props {
  ranked: any[];
  history: any[];
  isAdmin: boolean;
  onResumeTournament: () => void;
  onReset: () => void;
}
export default function TournamentFinished({ ranked, history, isAdmin, onResumeTournament, onReset }: Props) {
  const teamLabel = useTeamLabel();
  const teamById = useTeamById();
  const top = ranked.slice(0, 3);
  const podium = [top[1], top[0], top[2]].filter(Boolean);
  const heights = [120, 160, 90];
  const placeLabels = ['2nd', '1st', '3rd'];

  return (
    <div className="flex flex-col" style={{ gap: 'clamp(10px,2.5vw,16px)' }}>
      <div
        className="rounded-2xl text-center"
        style={{
          padding: 'clamp(16px,4vw,28px)',
          background: 'var(--court-faint)',
          border: '1px solid var(--court-soft)',
        }}
      >
        <div style={{ fontSize: 'clamp(36px,9vw,56px)' }}>🏆</div>
        <p
          className="font-black"
          style={{ color: 'var(--ink)', fontSize: 'clamp(18px,4.5vw,26px)', margin: '4px 0' }}
        >
          Tournament Complete
        </p>
        <p style={{ color: 'var(--muted)', fontSize: 'clamp(11px,2.8vw,14px)', margin: 0 }}>
          {history.length} round{history.length !== 1 ? 's' : ''} played
        </p>
      </div>
      <div
        className="flex items-end justify-center"
        style={{ gap: 'clamp(6px,1.5vw,12px)', padding: 'clamp(12px,3vw,20px) 0' }}
      >
        {podium.map((t, i) => {
          const h = heights[i];
          const place = top.indexOf(t) + 1;
          const team = teamById(t.id);
          const bg = t.color || team?.color || '#64748b';
          const fg = t.text || team?.text || '#ffffff';
          const label = teamLabel(t.id) || t.name || t.id;
          return (
            <div
              key={t.id}
              className="flex flex-col items-center"
              style={{ flex: '1 1 0', minWidth: 0, maxWidth: 160 }}
            >
              <div
                className="rounded-full font-black inline-flex items-center justify-center"
                style={{
                  background: bg,
                  color: fg,
                  padding: 'clamp(6px,1.5vw,10px) clamp(10px,2.5vw,16px)',
                  fontSize: 'clamp(12px,3vw,17px)',
                  border: '3px solid rgba(255,255,255,0.5)',
                  boxShadow: `0 4px 16px ${bg}55`,
                  maxWidth: '100%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {label}
              </div>
              <div
                style={{
                  fontSize: 'clamp(10px,2.5vw,13px)',
                  color: '#64748b',
                  fontWeight: 700,
                  marginTop: 6,
                }}
              >
                {t.wins}W · {t.losses}L · {t.scoreDiff > 0 ? '+' : ''}
                {t.scoreDiff}
              </div>
              <div
                style={{
                  width: '100%',
                  height: `clamp(${h * 0.5}px,${h * 0.18}vw,${h}px)`,
                  marginTop: 8,
                  borderRadius: '8px 8px 0 0',
                  background: 'var(--court)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: 'clamp(11px,2.5vw,15px)',
                  fontWeight: 800,
                  letterSpacing: '0.02em',
                }}
              >
                {placeLabels[i]}
              </div>
            </div>
          );
        })}
      </div>
      {isAdmin && (
        <button
          onClick={onResumeTournament}
          style={{
            padding: 'clamp(8px,2vw,12px)',
            borderRadius: 12,
            fontWeight: 700,
            fontSize: 'clamp(12px,3vw,15px)',
            cursor: 'pointer',
            background: 'rgba(0,0,0,0.05)',
            color: '#475569',
            border: '1px solid rgba(0,0,0,0.1)',
          }}
        >
          ↩ Resume tournament
        </button>
      )}
      {isAdmin && (
        <button
          onClick={onReset}
          style={{
            cursor: 'pointer',
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            fontSize: 12,
            textDecoration: 'underline',
          }}
        >
          ↩ Reset tournament…
        </button>
      )}
    </div>
  );
}
