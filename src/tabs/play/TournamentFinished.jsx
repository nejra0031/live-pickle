import { useTeamLabel } from '../../context/TeamRegistryContext';

export default function TournamentFinished({ ranked, history, isAdmin, onResumeTournament, onReset }) {
  const teamLabel = useTeamLabel();
  const top    = ranked.slice(0, 3);
  const podium = [top[1], top[0], top[2]].filter(Boolean);
  const heights = [120, 160, 90];
  const medals  = ['🥈', '🥇', '🥉'];
  const placeFor = t => top.indexOf(t) + 1;

  return (
    <div className="flex flex-col" style={{ gap: 'clamp(10px,2.5vw,16px)' }}>
      <div className="rounded-2xl text-center" style={{ padding: 'clamp(16px,4vw,28px)', background: 'linear-gradient(135deg,#fef3c7,#fde68a)', border: '1px solid rgba(217,119,6,0.3)' }}>
        <div style={{ fontSize: 'clamp(36px,9vw,56px)' }}>🏆</div>
        <p className="font-black" style={{ color: '#92400e', fontSize: 'clamp(18px,4.5vw,26px)', margin: '4px 0' }}>Tournament Complete</p>
        <p style={{ color: '#78350f', fontSize: 'clamp(11px,2.8vw,14px)', margin: 0 }}>{history.length} round{history.length !== 1 ? 's' : ''} played</p>
      </div>
      <div className="flex items-end justify-center" style={{ gap: 'clamp(6px,1.5vw,12px)', padding: 'clamp(12px,3vw,20px) 0' }}>
        {podium.map((t, i) => {
          const h = heights[i], place = placeFor(t);
          return (
            <div key={t.id} className="flex flex-col items-center" style={{ flex: '1 1 0', minWidth: 0, maxWidth: 160 }}>
              <div style={{ fontSize: 'clamp(22px,6vw,36px)', marginBottom: 4 }}>{medals[i]}</div>
              <div className="rounded-full font-black inline-flex items-center justify-center"
                style={{ background: t.color, color: t.text, padding: 'clamp(6px,1.5vw,10px) clamp(10px,2.5vw,16px)', fontSize: 'clamp(12px,3vw,17px)', border: '3px solid rgba(255,255,255,0.5)', boxShadow: `0 4px 16px ${t.color}55`, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {teamLabel(t.id)}
              </div>
              <div style={{ fontSize: 'clamp(10px,2.5vw,13px)', color: '#64748b', fontWeight: 700, marginTop: 6 }}>
                {t.wins}W · {t.losses}L · {t.scoreDiff > 0 ? '+' : ''}{t.scoreDiff}
              </div>
              <div style={{ width: '100%', height: `clamp(${h * 0.5}px,${h * 0.18}vw,${h}px)`, marginTop: 8, borderRadius: '8px 8px 0 0', background: place === 1 ? 'linear-gradient(180deg,#fbbf24,#d97706)' : place === 2 ? 'linear-gradient(180deg,#cbd5e1,#94a3b8)' : 'linear-gradient(180deg,#f59e42,#b45309)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 'clamp(20px,5vw,32px)', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                {place}
              </div>
            </div>
          );
        })}
      </div>
      {isAdmin && <button onClick={onResumeTournament} style={{ padding: 'clamp(8px,2vw,12px)', borderRadius: 12, fontWeight: 700, fontSize: 'clamp(12px,3vw,15px)', cursor: 'pointer', background: 'rgba(0,0,0,0.05)', color: '#475569', border: '1px solid rgba(0,0,0,0.1)' }}>↩ Resume tournament</button>}
      {isAdmin && <button onClick={onReset} style={{ cursor: 'pointer', background: 'none', border: 'none', color: '#94a3b8', fontSize: 12, textDecoration: 'underline' }}>↩ Reset tournament…</button>}
    </div>
  );
}
