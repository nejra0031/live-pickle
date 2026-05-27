import { useMemo } from 'react';
import { buildTPTStandings } from '../algorithms/threePlayerTeam';
import { ORDINAL } from '../constants';

export default function ThreePlayerStandingsTab({ tptTeams, tptPlayers, tptSchedule, tptResults }) {
  const { teamStandings, playerStandings } = useMemo(
    () => buildTPTStandings(tptTeams, tptPlayers, tptSchedule, tptResults),
    [tptTeams, tptPlayers, tptSchedule, tptResults]
  );

  if (teamStandings.length === 0) {
    return <div className="text-center text-slate-400 py-8 text-sm">No results yet.</div>;
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.1)', boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
      <div className="flex items-center font-bold uppercase tracking-widest"
        style={{ background: '#0f4c75', color: '#fff', padding: 'clamp(8px,2vw,14px) clamp(10px,2.5vw,18px)', gap: 'clamp(6px,1.5vw,12px)', fontSize: 'clamp(9px,2vw,12px)' }}>
        <span style={{ width: 'clamp(28px,6vw,50px)' }}>Rank</span>
        <span className="flex-1">Team</span>
        <span style={{ width: 'clamp(26px,5.5vw,42px)', textAlign: 'center' }}>GP</span>
        <span style={{ width: 'clamp(26px,5.5vw,42px)', textAlign: 'center', color: '#86efac' }}>W</span>
        <span style={{ width: 'clamp(26px,5.5vw,42px)', textAlign: 'center', color: '#fca5a5' }}>L</span>
        <span style={{ width: 'clamp(30px,6.5vw,50px)', textAlign: 'center', color: '#7dd3fc' }}>+/−</span>
      </div>

      {teamStandings.map((team, i) => {
        const diff = team.scoreDiff;
        const players = playerStandings[team.id] || [];
        return (
          <div key={team.id} style={{ borderTop: i > 0 ? '1px solid rgba(0,0,0,0.07)' : undefined }}>
            {/* Team row */}
            <div className="flex items-center"
              style={{ padding: 'clamp(10px,2.5vw,18px) clamp(10px,2.5vw,18px)', gap: 'clamp(6px,1.5vw,12px)', background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
              <span className="font-black text-slate-500" style={{ width: 'clamp(28px,6vw,50px)', fontSize: 'clamp(14px,3.5vw,22px)', flexShrink: 0 }}>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : ORDINAL(i + 1)}
              </span>
              <div className="flex-1 min-w-0">
                <span className="inline-flex items-center rounded-full font-black"
                  style={{ background: team.color, color: team.text, fontSize: 'clamp(13px,3.5vw,20px)', padding: 'clamp(4px,1vw,8px) clamp(10px,2.5vw,18px)', border: '2px solid rgba(255,255,255,0.25)', boxShadow: `0 2px 8px ${team.color}44` }}>
                  {team.name}
                </span>
              </div>
              <span style={{ width: 'clamp(26px,5.5vw,42px)', textAlign: 'center', color: '#475569', fontSize: 'clamp(14px,3.5vw,22px)', fontWeight: 700, flexShrink: 0 }}>{team.played}</span>
              <span style={{ width: 'clamp(26px,5.5vw,42px)', textAlign: 'center', color: '#16a34a', fontWeight: 900, fontSize: 'clamp(16px,4vw,24px)', flexShrink: 0 }}>{team.wins}</span>
              <span style={{ width: 'clamp(26px,5.5vw,42px)', textAlign: 'center', color: '#dc2626', fontWeight: 900, fontSize: 'clamp(16px,4vw,24px)', flexShrink: 0 }}>{team.losses}</span>
              <span style={{ width: 'clamp(30px,6.5vw,50px)', textAlign: 'center', fontWeight: 900, fontSize: 'clamp(14px,3.5vw,22px)', color: diff > 0 ? '#16a34a' : diff < 0 ? '#dc2626' : '#94a3b8', flexShrink: 0 }}>{diff > 0 ? '+' : ''}{diff}</span>
            </div>

            {/* Player breakdown */}
            {players.length > 0 && (
              <div style={{ background: i % 2 === 0 ? '#f8fafc' : '#f1f5f9', borderTop: '1px solid rgba(0,0,0,0.05)', padding: 'clamp(4px,1vw,6px) clamp(10px,2.5vw,18px) clamp(8px,2vw,12px)' }}>
                {players.map((p, pi) => {
                  const pd = p.scoreDiff;
                  return (
                    <div key={p.id} className="flex items-center"
                      style={{ gap: 'clamp(4px,1vw,8px)', padding: 'clamp(3px,0.8vw,5px) 0', borderTop: pi > 0 ? '1px solid rgba(0,0,0,0.04)' : undefined }}>
                      <span style={{ width: 'clamp(28px,6vw,50px)', flexShrink: 0, textAlign: 'center', fontSize: 10, color: p.gender === 'female' ? '#be185d' : '#1d4ed8', fontWeight: 700 }}>
                        {p.gender === 'female' ? '♀' : '♂'}
                      </span>
                      <span className="flex-1 font-bold" style={{ fontSize: 'clamp(11px,2.8vw,15px)', color: '#334155', minWidth: 0 }}>{p.name}</span>
                      <span style={{ width: 'clamp(26px,5.5vw,42px)', textAlign: 'center', color: '#64748b', fontSize: 'clamp(11px,2.8vw,14px)', fontWeight: 600, flexShrink: 0 }}>{p.played}</span>
                      <span style={{ width: 'clamp(26px,5.5vw,42px)', textAlign: 'center', color: '#16a34a', fontWeight: 700, fontSize: 'clamp(12px,3vw,16px)', flexShrink: 0 }}>{p.wins}</span>
                      <span style={{ width: 'clamp(26px,5.5vw,42px)', textAlign: 'center', color: '#dc2626', fontWeight: 700, fontSize: 'clamp(12px,3vw,16px)', flexShrink: 0 }}>{p.losses}</span>
                      <span style={{ width: 'clamp(30px,6.5vw,50px)', textAlign: 'center', fontWeight: 700, fontSize: 'clamp(11px,2.8vw,15px)', color: pd > 0 ? '#16a34a' : pd < 0 ? '#dc2626' : '#94a3b8', flexShrink: 0 }}>{pd > 0 ? '+' : ''}{pd}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
