import { useTeamById } from '../context/TeamRegistryContext';

export default function GameResultRow({ game, isAdmin, onEdit, onRemove }) {
  const teamById = useTeamById();
  const w = teamById(game.winnerId);
  const l = teamById(game.loserId);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'clamp(22px,5vw,36px) 1fr clamp(22px,5vw,34px) clamp(10px,2vw,14px) clamp(22px,5vw,34px) 1fr auto', alignItems: 'center', gap: 'clamp(4px,1vw,8px)' }}>
      <span style={{ color: '#94a3b8', fontSize: 'clamp(10px,2.5vw,13px)', fontWeight: 700, textAlign: 'center' }}>{game.courtNumber}</span>
      <div className="flex justify-end">
        <span className="inline-flex items-center rounded-full font-bold" style={{ background: w?.color, color: w?.text, fontSize: 'clamp(11px,3vw,15px)', padding: 'clamp(3px,0.8vw,6px) clamp(8px,2vw,14px)', whiteSpace: 'nowrap' }}>{w?.name}</span>
      </div>
      <span style={{ fontWeight: 800, textAlign: 'right', color: w?.color, fontSize: 'clamp(13px,3vw,17px)' }}>{game.winnerScore}</span>
      <span style={{ color: '#cbd5e1', fontSize: 'clamp(10px,2.5vw,13px)', textAlign: 'center' }}>–</span>
      <span style={{ fontWeight: 800, textAlign: 'left', color: l?.color, fontSize: 'clamp(13px,3vw,17px)' }}>{game.loserScore}</span>
      <div className="flex justify-start">
        <span className="inline-flex items-center rounded-full font-bold" style={{ background: l?.color, color: l?.text, fontSize: 'clamp(11px,3vw,15px)', padding: 'clamp(3px,0.8vw,6px) clamp(8px,2vw,14px)', whiteSpace: 'nowrap' }}>{l?.name}</span>
      </div>
      <div className="flex gap-1">
        {isAdmin && (
          <>
            <button onClick={onEdit} style={{ fontSize: 'clamp(10px,2.5vw,13px)', padding: 'clamp(3px,0.8vw,6px) clamp(6px,1.5vw,10px)', borderRadius: 8, background: 'rgba(15,76,117,0.08)', color: '#0f4c75', border: '1px solid rgba(15,76,117,0.2)', cursor: 'pointer', whiteSpace: 'nowrap' }}>✏️</button>
            <button onClick={onRemove} style={{ fontSize: 'clamp(10px,2.5vw,13px)', padding: 'clamp(3px,0.8vw,6px) clamp(6px,1.5vw,10px)', borderRadius: 8, background: 'rgba(220,38,38,0.08)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.2)', cursor: 'pointer', whiteSpace: 'nowrap' }}>×</button>
          </>
        )}
      </div>
    </div>
  );
}
