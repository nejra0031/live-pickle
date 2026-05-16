import { useState } from 'react';
import { useTeamById } from '../context/TeamRegistryContext';
import { rerank, rebuildStandings } from '../algorithms/standings';

export default function HistoryTab({
  history, activeTeamIds, cancelledRoundNums,
  roundRobinStartSnapshot, roundRobinEndSnapshot,
  isAdmin, backupRoundNums = new Set(), onAddGame, onEditGame, onRemoveGame, onRevertToRound,
}) {
  const teamById = useTeamById();
  const [newestFirst, setNewestFirst] = useState(true);

  const chip = (id, faded) => {
    const t = teamById(id); if (!t) return null;
    return (
      <span key={id} className="inline-flex items-center rounded-full font-bold"
        style={{ background: t.color, color: t.text, fontSize: 'clamp(11px,3vw,15px)', padding: 'clamp(3px,0.8vw,6px) clamp(8px,2vw,14px)', opacity: faded ? 0.5 : 1, textDecoration: faded ? 'line-through' : 'none', border: '2px solid rgba(255,255,255,0.2)' }}>
        {t.name}
      </span>
    );
  };

  const renderRRSnapshot = () => {
    if (!roundRobinStartSnapshot) return null;
    const { startRoundNum: srn, participatingIds = [], excludedIds = [] } = roundRobinStartSnapshot;
    const snapHist = history.filter(h => h.roundNum < srn);
    const snapRanked = rerank(rebuildStandings(activeTeamIds, snapHist));
    return (
      <div className="rounded-2xl" style={{ background: '#fff', border: '1px solid rgba(99,102,241,0.35)', overflow: 'hidden', boxShadow: '0 2px 12px rgba(99,102,241,0.08)' }}>
        <div style={{ padding: 'clamp(8px,2vw,12px) clamp(12px,3vw,18px)', background: 'linear-gradient(90deg,rgba(99,102,241,0.12),rgba(139,92,246,0.12))', borderBottom: '1px solid rgba(99,102,241,0.2)' }}>
          <span style={{ fontSize: 'clamp(10px,2.5vw,13px)', color: '#4338ca', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            🔁 Round Robin Started{srn > 1 ? ` after Round ${srn - 1}` : ''}
          </span>
        </div>
        {participatingIds.length > 0 && (
          <div style={{ padding: 'clamp(8px,2vw,12px) clamp(12px,3vw,18px)', borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
            <p style={{ fontSize: 'clamp(9px,2vw,11px)', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Progressed ({participatingIds.length})</p>
            <div className="flex flex-wrap" style={{ gap: 'clamp(4px,1vw,8px)' }}>{participatingIds.map(id => chip(id, false))}</div>
          </div>
        )}
        {excludedIds.length > 0 && (
          <div style={{ padding: 'clamp(8px,2vw,12px) clamp(12px,3vw,18px)', borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
            <p style={{ fontSize: 'clamp(9px,2vw,11px)', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Dropped out ({excludedIds.length})</p>
            <div className="flex flex-wrap" style={{ gap: 'clamp(4px,1vw,8px)' }}>{excludedIds.map(id => chip(id, true))}</div>
          </div>
        )}
        {snapRanked.length > 0 && (
          <div style={{ padding: 'clamp(8px,2vw,12px) clamp(12px,3vw,18px)' }}>
            <p style={{ fontSize: 'clamp(9px,2vw,11px)', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Standings at start of Round Robin</p>
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.08)' }}>
              <div className="flex items-center font-bold uppercase tracking-widest"
                style={{ background: 'rgba(15,76,117,0.08)', color: '#475569', padding: 'clamp(5px,1.2vw,8px) clamp(8px,2vw,12px)', gap: 'clamp(4px,1vw,8px)', fontSize: 'clamp(8px,1.8vw,11px)' }}>
                <span style={{ width: 'clamp(20px,4.5vw,32px)' }}>#</span>
                <span className="flex-1">Team</span>
                <span style={{ width: 'clamp(22px,4.5vw,34px)', textAlign: 'center' }}>GP</span>
                <span style={{ width: 'clamp(22px,4.5vw,34px)', textAlign: 'center', color: '#16a34a' }}>W</span>
                <span style={{ width: 'clamp(22px,4.5vw,34px)', textAlign: 'center', color: '#dc2626' }}>L</span>
                <span style={{ width: 'clamp(28px,5.5vw,42px)', textAlign: 'center', color: '#0284c7' }}>+/−</span>
              </div>
              {snapRanked.map((team, i) => {
                const dropped = excludedIds.includes(team.id);
                return (
                  <div key={team.id} className="flex items-center"
                    style={{ padding: 'clamp(5px,1.2vw,8px) clamp(8px,2vw,12px)', gap: 'clamp(4px,1vw,8px)', background: i % 2 === 0 ? '#fff' : '#f8fafc', borderTop: '1px solid rgba(0,0,0,0.05)', opacity: dropped ? 0.5 : 1 }}>
                    <span style={{ width: 'clamp(20px,4.5vw,32px)', fontWeight: 800, color: '#64748b', fontSize: 'clamp(11px,2.5vw,14px)' }}>{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <span className="inline-flex items-center rounded-full font-bold"
                        style={{ background: team.color, color: team.text, fontSize: 'clamp(10px,2.5vw,13px)', padding: 'clamp(2px,0.5vw,4px) clamp(7px,1.7vw,12px)', textDecoration: dropped ? 'line-through' : 'none' }}>
                        {team.name}
                      </span>
                    </div>
                    <span style={{ width: 'clamp(22px,4.5vw,34px)', textAlign: 'center', color: '#475569', fontSize: 'clamp(11px,2.5vw,14px)', fontWeight: 700 }}>{team.played}</span>
                    <span style={{ width: 'clamp(22px,4.5vw,34px)', textAlign: 'center', color: '#16a34a', fontWeight: 800, fontSize: 'clamp(11px,2.5vw,14px)' }}>{team.wins}</span>
                    <span style={{ width: 'clamp(22px,4.5vw,34px)', textAlign: 'center', color: '#dc2626', fontWeight: 800, fontSize: 'clamp(11px,2.5vw,14px)' }}>{team.losses}</span>
                    <span style={{ width: 'clamp(28px,5.5vw,42px)', textAlign: 'center', fontWeight: 800, fontSize: 'clamp(11px,2.5vw,14px)', color: team.scoreDiff > 0 ? '#16a34a' : team.scoreDiff < 0 ? '#dc2626' : '#94a3b8' }}>
                      {team.scoreDiff > 0 ? '+' : ''}{team.scoreDiff}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderRREndSnapshot = () => {
    if (!roundRobinEndSnapshot) return null;
    const { endRoundNum: ern, endReason } = roundRobinEndSnapshot;
    const completed = endReason === 'completed';
    const accent = completed ? 'rgba(99,102,241,0.35)' : 'rgba(220,38,38,0.3)';
    const bg = completed ? 'linear-gradient(90deg,rgba(99,102,241,0.12),rgba(139,92,246,0.12))' : 'linear-gradient(90deg,rgba(220,38,38,0.08),rgba(239,68,68,0.08))';
    const textCol = completed ? '#4338ca' : '#b91c1c';
    return (
      <div className="rounded-2xl" style={{ background: '#fff', border: `1px solid ${accent}`, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <div style={{ padding: 'clamp(8px,2vw,12px) clamp(12px,3vw,18px)', background: bg, borderBottom: `1px solid ${accent}` }}>
          <span style={{ fontSize: 'clamp(10px,2.5vw,13px)', color: textCol, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {completed ? '🏁 Round Robin Complete' : '⛔ Round Robin Cancelled'}
          </span>
        </div>
        <div style={{ padding: 'clamp(8px,2vw,12px) clamp(12px,3vw,18px)' }}>
          <p style={{ fontSize: 'clamp(11px,2.5vw,14px)', color: '#475569', margin: 0 }}>
            {ern != null ? `${completed ? 'Completed' : 'Cancelled'} after Round ${ern}. Standings carry over from this point on.` : 'Cancelled before any Round Robin rounds were played.'}
          </p>
        </div>
      </div>
    );
  };

  const sortedEntries = [...history].map((h, ri) => ({ type: 'round', h, ri })).sort((a, b) => a.h.roundNum - b.h.roundNum);
  const committedNums = new Set(history.map(h => h.roundNum));
  const effectiveCancelled = cancelledRoundNums.filter(n => !committedNums.has(n));
  const allEntries = [
    ...sortedEntries,
    ...effectiveCancelled.map(n => ({ type: 'cancelled', roundNum: n }))
  ].sort((a, b) => {
    const an = a.type === 'round' ? a.h.roundNum : a.roundNum;
    const bn = b.type === 'round' ? b.h.roundNum : b.roundNum;
    return an - bn;
  });

  const showSnapshotAtTop = !!roundRobinStartSnapshot && history.every(h => h.roundNum < (roundRobinStartSnapshot.startRoundNum || 0));
  const showEndAtTop = !!roundRobinEndSnapshot && roundRobinEndSnapshot.endRoundNum == null;

  const displayEntries = newestFirst ? [...allEntries].reverse() : allEntries;

  const isEmpty = history.length === 0 && !roundRobinStartSnapshot && !roundRobinEndSnapshot && cancelledRoundNums.length === 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <button onClick={() => setNewestFirst(p => !p)}
          style={{ fontSize: 12, padding: '4px 10px', borderRadius: 8, fontWeight: 700, cursor: 'pointer', background: 'rgba(0,0,0,0.06)', color: '#475569', border: '1px solid rgba(0,0,0,0.1)' }}>
          {newestFirst ? '↓ Newest first' : '↑ Oldest first'}
        </button>
      </div>

      {isEmpty && <div className="text-center text-slate-400 py-8 text-sm">No rounds completed yet.</div>}

      {newestFirst && showEndAtTop && renderRREndSnapshot()}
      {newestFirst && showSnapshotAtTop && renderRRSnapshot()}

      {displayEntries.map((entry, _i) => {
        if (entry.type === 'cancelled') {
          return (
            <div key={`cancelled-${entry.roundNum}`} className="rounded-2xl flex items-center gap-3"
              style={{ padding: 'clamp(10px,2.5vw,14px) clamp(12px,3vw,18px)', background: 'rgba(220,38,38,0.04)', border: '1px dashed rgba(220,38,38,0.25)' }}>
              <span style={{ fontSize: 'clamp(16px,4vw,20px)' }}>✕</span>
              <span style={{ fontSize: 'clamp(11px,2.5vw,14px)', color: '#dc2626', fontWeight: 700 }}>Round {entry.roundNum} cancelled</span>
            </div>
          );
        }
        const { h, ri } = entry;
        const seIdx = sortedEntries.findIndex(e => e.ri === ri);
        const sbf = rebuildStandings(activeTeamIds, sortedEntries.slice(0, seIdx).map(e => e.h));
        const saf = rebuildStandings(activeTeamIds, sortedEntries.slice(0, seIdx + 1).map(e => e.h));
        const rbf = rerank(sbf), raf = rerank(saf);
        const rb = id => rbf.findIndex(t => t.id === id) + 1;
        const ra = id => raf.findIndex(t => t.id === id) + 1;
        const played = h.games.flatMap(g => [g.winnerId, g.loserId]);
        const hasBye = h.bye?.length > 0;
        const isFirstRR = roundRobinStartSnapshot && h.roundNum === roundRobinStartSnapshot.startRoundNum;
        const isLastRR = roundRobinEndSnapshot && roundRobinEndSnapshot.endRoundNum != null && h.roundNum === roundRobinEndSnapshot.endRoundNum;

        return (
          <div key={ri}>
            {newestFirst && isLastRR && renderRREndSnapshot()}
            <div className="rounded-2xl" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', overflow: 'hidden' }}>
              <div className="flex items-center justify-between" style={{ padding: 'clamp(8px,2vw,12px) clamp(12px,3vw,18px)', background: 'rgba(15,76,117,0.06)', borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
                <span style={{ fontSize: 'clamp(10px,2.5vw,13px)', color: '#0f4c75', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Round {h.roundNum}</span>
                {isAdmin && (
                  <div className="flex items-center gap-1">
                    {backupRoundNums.has(h.roundNum) && (
                      <button onClick={() => onRevertToRound(h.roundNum)}
                        style={{ fontSize: 'clamp(10px,2.5vw,12px)', padding: 'clamp(3px,0.8vw,5px) clamp(8px,2vw,12px)', borderRadius: 8, fontWeight: 700, cursor: 'pointer', background: 'rgba(220,38,38,0.08)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.25)' }}>
                        ↩ Revert
                      </button>
                    )}
                    <button onClick={() => onAddGame(ri)}
                      style={{ fontSize: 'clamp(10px,2.5vw,12px)', padding: 'clamp(3px,0.8vw,5px) clamp(8px,2vw,12px)', borderRadius: 8, fontWeight: 700, cursor: 'pointer', background: 'rgba(99,102,241,0.1)', color: '#4338ca', border: '1px solid rgba(99,102,241,0.3)' }}>
                      ➕ Add Game
                    </button>
                  </div>
                )}
              </div>

              <div style={{ padding: 'clamp(8px,2vw,12px) clamp(12px,3vw,18px)' }}>
                {h.games.map((game, gi) => {
                  const w = teamById(game.winnerId), l = teamById(game.loserId);
                  return (
                    <div key={gi} style={{ display: 'grid', gridTemplateColumns: 'clamp(22px,5vw,36px) 1fr clamp(22px,5vw,34px) clamp(10px,2vw,14px) clamp(22px,5vw,34px) 1fr auto', alignItems: 'center', gap: 'clamp(4px,1vw,8px)', marginBottom: gi < h.games.length - 1 ? 'clamp(6px,1.5vw,10px)' : 0 }}>
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
                            <button onClick={() => onEditGame(ri, gi)}
                              style={{ fontSize: 'clamp(10px,2.5vw,13px)', padding: 'clamp(3px,0.8vw,6px) clamp(6px,1.5vw,10px)', borderRadius: 8, background: 'rgba(15,76,117,0.08)', color: '#0f4c75', border: '1px solid rgba(15,76,117,0.2)', cursor: 'pointer', whiteSpace: 'nowrap' }}>✏️</button>
                            <button onClick={() => onRemoveGame(ri, gi)}
                              style={{ fontSize: 'clamp(10px,2.5vw,13px)', padding: 'clamp(3px,0.8vw,6px) clamp(6px,1.5vw,10px)', borderRadius: 8, background: 'rgba(220,38,38,0.08)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.2)', cursor: 'pointer', whiteSpace: 'nowrap' }}>×</button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {h.paused && h.paused.length > 0 && (
                <div style={{ borderTop: '1px solid rgba(0,0,0,0.07)', padding: 'clamp(6px,1.5vw,10px) clamp(12px,3vw,18px)' }}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span style={{ color: '#94a3b8', fontSize: 'clamp(10px,2.5vw,12px)', fontWeight: 700, minWidth: 32 }}>Paused</span>
                    {h.paused.map(id => {
                      const t = teamById(id); if (!t) return null;
                      return (
                        <span key={id} className="inline-flex items-center rounded-full font-bold"
                          style={{ background: 'rgba(0,0,0,0.05)', color: '#64748b', fontSize: 'clamp(11px,3vw,15px)', padding: 'clamp(3px,0.8vw,6px) clamp(8px,2vw,14px)', border: '1px solid rgba(0,0,0,0.1)', textDecoration: 'line-through' }}>
                          {t.name}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {hasBye && (
                <div style={{ borderTop: '1px solid rgba(0,0,0,0.07)', padding: 'clamp(6px,1.5vw,10px) clamp(12px,3vw,18px)' }}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span style={{ color: '#94a3b8', fontSize: 'clamp(10px,2.5vw,12px)', fontWeight: 700, minWidth: 32 }}>Bye</span>
                    {h.bye.map(id => {
                      const t = teamById(id); if (!t) return null;
                      return (
                        <span key={id} className="inline-flex items-center rounded-full font-bold"
                          style={{ background: t.color, color: t.text, fontSize: 'clamp(11px,3vw,15px)', padding: 'clamp(3px,0.8vw,6px) clamp(8px,2vw,14px)' }}>
                          {t.name}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              <div style={{ borderTop: '1px solid rgba(0,0,0,0.07)', padding: 'clamp(6px,1.5vw,10px) clamp(12px,3vw,18px)' }}>
                <p style={{ fontSize: 'clamp(9px,2vw,11px)', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Rankings</p>
                <div className="flex flex-wrap" style={{ gap: 'clamp(8px,2vw,16px) clamp(12px,3vw,20px)' }}>
                  {played.map(id => {
                    const b = rb(id), a = ra(id), d = b - a, t = teamById(id); if (!t) return null;
                    return (
                      <div key={id} className="flex items-center gap-1" style={{ fontSize: 'clamp(11px,2.5vw,14px)' }}>
                        <span style={{ color: t.color, fontWeight: 700 }}>{t.name}</span>
                        <span style={{ color: '#94a3b8' }}>#{b}→</span>
                        <span style={{ fontWeight: 700, color: d > 0 ? '#16a34a' : d < 0 ? '#dc2626' : '#94a3b8' }}>#{a}</span>
                        {d > 0 && <span style={{ color: '#16a34a', fontSize: 'clamp(9px,2vw,11px)' }}>▲{d}</span>}
                        {d < 0 && <span style={{ color: '#dc2626', fontSize: 'clamp(9px,2vw,11px)' }}>▼{Math.abs(d)}</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            {newestFirst && isFirstRR && renderRRSnapshot()}
            {!newestFirst && isLastRR && renderRREndSnapshot()}
            {!newestFirst && isFirstRR && renderRRSnapshot()}
          </div>
        );
      })}

      {!newestFirst && showSnapshotAtTop && renderRRSnapshot()}
      {!newestFirst && showEndAtTop && renderRREndSnapshot()}
    </div>
  );
}
