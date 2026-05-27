import { useTeamById } from '../context/TeamRegistryContext';
import { ORDINAL } from '../constants';
import ThreePlayerStandingsTab from './ThreePlayerStandingsTab';

export default function StandingsTab({ ranked, pausedIds, tournamentMode, tptTeams, tptPlayers, tptSchedule, tptResults }) {
  const teamById = useTeamById();

  if (tournamentMode === 'tpt') {
    return <ThreePlayerStandingsTab tptTeams={tptTeams} tptPlayers={tptPlayers} tptSchedule={tptSchedule} tptResults={tptResults} />;
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
      {ranked.map((team, i) => {
        const diff = team.scoreDiff, paused = pausedIds.includes(team.id);
        return (
          <div key={team.id} className="flex items-center"
            style={{ padding: 'clamp(10px,2.5vw,18px) clamp(10px,2.5vw,18px)', gap: 'clamp(6px,1.5vw,12px)', background: i % 2 === 0 ? '#fff' : '#f8fafc', borderTop: '1px solid rgba(0,0,0,0.05)', opacity: paused ? 0.45 : 1 }}>
            <span className="font-black text-slate-500" style={{ width: 'clamp(28px,6vw,50px)', fontSize: 'clamp(14px,3.5vw,22px)' }}>
              {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : ORDINAL(i + 1)}
            </span>
            <div className="flex-1 min-w-0">
              <span className="inline-flex items-center rounded-full font-black"
                style={{ background: team.color, color: team.text, fontSize: 'clamp(13px,3.5vw,20px)', padding: 'clamp(4px,1vw,8px) clamp(10px,2.5vw,18px)', border: '2px solid rgba(255,255,255,0.25)', boxShadow: `0 2px 8px ${team.color}44` }}>
                {team.name}{paused ? ' ⏸' : ''}
              </span>
            </div>
            <span style={{ width: 'clamp(26px,5.5vw,42px)', textAlign: 'center', color: '#475569', fontSize: 'clamp(14px,3.5vw,22px)', fontWeight: 700 }}>{team.played}</span>
            <span style={{ width: 'clamp(26px,5.5vw,42px)', textAlign: 'center', color: '#16a34a', fontWeight: 900, fontSize: 'clamp(16px,4vw,24px)' }}>{team.wins}</span>
            <span style={{ width: 'clamp(26px,5.5vw,42px)', textAlign: 'center', color: '#dc2626', fontWeight: 900, fontSize: 'clamp(16px,4vw,24px)' }}>{team.losses}</span>
            <span style={{ width: 'clamp(30px,6.5vw,50px)', textAlign: 'center', fontWeight: 900, fontSize: 'clamp(14px,3.5vw,22px)', color: diff > 0 ? '#16a34a' : diff < 0 ? '#dc2626' : '#94a3b8' }}>{diff > 0 ? '+' : ''}{diff}</span>
          </div>
        );
      })}
    </div>
  );
}
