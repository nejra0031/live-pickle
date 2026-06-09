import { ORDINAL } from '../constants';
import TiebreakOrderEditor from '../components/TiebreakOrderEditor';

export default function DoublesRRStandingsTab({ doublesRRStandings, doublesRRTiebreakOrder, onDoublesRRTiebreakOrderChange, isAdmin }) {
  if (!doublesRRStandings || doublesRRStandings.length === 0) {
    return <div className="text-center text-slate-400 py-8 text-sm">No results yet.</div>;
  }

  const colW = { rank: 'clamp(28px,6vw,50px)', stat: 'clamp(26px,5.5vw,42px)', score: 'clamp(34px,7vw,54px)', diff: 'clamp(30px,6.5vw,50px)' };

  return (
    <div className="flex flex-col" style={{ gap: 'clamp(10px,2.5vw,16px)' }}>
      {isAdmin && onDoublesRRTiebreakOrderChange && (
        <div className="rounded-2xl flex flex-col" style={{ padding: 'clamp(10px,2.5vw,16px)', gap: 'clamp(6px,1.5vw,10px)', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)' }}>
          <p style={{ color: '#4338ca', fontWeight: 800, fontSize: 'clamp(11px,2.5vw,13px)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Ranking order (highest priority first)
          </p>
          <TiebreakOrderEditor order={doublesRRTiebreakOrder} onChange={onDoublesRRTiebreakOrderChange} />
        </div>
      )}

      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.1)', boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
        <div className="flex items-center font-bold uppercase tracking-widest"
          style={{ background: '#0f4c75', color: '#fff', padding: 'clamp(8px,2vw,14px) clamp(10px,2.5vw,18px)', gap: 'clamp(6px,1.5vw,10px)', fontSize: 'clamp(9px,2vw,12px)' }}>
          <span style={{ width: colW.rank }}>Rank</span>
          <span className="flex-1">Player</span>
          <span style={{ width: colW.stat, textAlign: 'center' }}>GP</span>
          <span style={{ width: colW.stat, textAlign: 'center', color: '#86efac' }}>W</span>
          <span style={{ width: colW.stat, textAlign: 'center', color: '#fca5a5' }}>L</span>
          <span style={{ width: colW.score, textAlign: 'center', color: '#bae6fd' }}>PF</span>
          <span style={{ width: colW.score, textAlign: 'center', color: '#fecaca' }}>PA</span>
          <span style={{ width: colW.diff, textAlign: 'center', color: '#7dd3fc' }}>+/−</span>
        </div>
        {doublesRRStandings.map((p, i) => {
          const diff = p.scoreDiff;
          return (
            <div key={p.id} className="flex items-center"
              style={{ padding: 'clamp(10px,2.5vw,18px) clamp(10px,2.5vw,18px)', gap: 'clamp(6px,1.5vw,10px)', background: i % 2 === 0 ? '#fff' : '#f8fafc', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
              <span className="font-black text-slate-500" style={{ width: colW.rank, fontSize: 'clamp(14px,3.5vw,22px)' }}>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : ORDINAL(i + 1)}
              </span>
              <div className="flex-1 min-w-0">
                <span className="inline-flex items-center rounded-full font-black"
                  style={{ background: p.color || '#475569', color: p.text || '#fff', fontSize: 'clamp(13px,3.5vw,20px)', padding: 'clamp(4px,1vw,8px) clamp(10px,2.5vw,18px)', border: '2px solid rgba(255,255,255,0.25)' }}>
                  {p.name}
                </span>
              </div>
              <span style={{ width: colW.stat, textAlign: 'center', color: '#475569', fontSize: 'clamp(14px,3.5vw,22px)', fontWeight: 700 }}>{p.played}</span>
              <span style={{ width: colW.stat, textAlign: 'center', color: '#16a34a', fontWeight: 900, fontSize: 'clamp(16px,4vw,24px)' }}>{p.wins}</span>
              <span style={{ width: colW.stat, textAlign: 'center', color: '#dc2626', fontWeight: 900, fontSize: 'clamp(16px,4vw,24px)' }}>{p.losses}</span>
              <span style={{ width: colW.score, textAlign: 'center', color: '#0369a1', fontWeight: 700, fontSize: 'clamp(13px,3.2vw,18px)' }}>{p.scoreFor}</span>
              <span style={{ width: colW.score, textAlign: 'center', color: '#b91c1c', fontWeight: 700, fontSize: 'clamp(13px,3.2vw,18px)' }}>{p.scoreAgainst}</span>
              <span style={{ width: colW.diff, textAlign: 'center', fontWeight: 900, fontSize: 'clamp(14px,3.5vw,22px)', color: diff > 0 ? '#16a34a' : diff < 0 ? '#dc2626' : '#94a3b8' }}>{diff > 0 ? '+' : ''}{diff}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
