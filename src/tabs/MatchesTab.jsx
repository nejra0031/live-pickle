import { useState, useRef, useContext } from 'react';
import { useTeamById, useTeamLabel, TeamRegistryContext } from '../context/TeamRegistryContext';
import { rerank, rebuildStandings } from '../algorithms/standings';
import { getTPTGamesForMatchup, formatTPTTeamLabel } from '../algorithms/threePlayerTeam';
import { buildSidePresentation } from '../algorithms/doublesRR';

export default function MatchesTab({
  history, activeTeamIds, cancelledRoundNums,
  tournamentMode, courtNumbers = [],
  roundRobinSchedule = [], roundRobinCourts = [], roundRobinStartRoundNum = null,
  tptSchedule = [], doublesRRSchedule = [],
  roundRobinStartSnapshot, roundRobinEndSnapshot,
  canEditScores, canDeleteGame, canFullEdit,
  backupRoundNums = new Set(), onAddGame, onEditGame, onRemoveGame, onRevertToRound, onRevertToBeginning, onEditCourtNumber,
  onEditTPTGame, onEditDoublesRRGame, onExportDUPR,
  tptTeams = {}, tptPlayers = {}, doublesRRPlayers = {},
}) {
  const teamById = useTeamById();
  const teamLabel = useTeamLabel();
  const { teamNameDisplay } = useContext(TeamRegistryContext);
  const [newestFirst, setNewestFirst] = useState(true);
  const [editingCourtNum, setEditingCourtNum] = useState(null); // { ri, gi }
  const [courtNumDraft, setCourtNumDraft] = useState('');
  const courtInputRef = useRef(null);

  const commitCourtEdit = (ri, gi) => {
    const val = courtNumDraft.trim();
    if (val) onEditCourtNumber?.(ri, gi, val);
    setEditingCourtNum(null);
  };

  const chip = (id, faded) => {
    const t = teamById(id); if (!t) return null;
    return (
      <span key={id} className="inline-flex items-center rounded-full font-bold"
        style={{ background: t.color, color: t.text, fontSize: 'clamp(11px,3vw,15px)', padding: 'clamp(3px,0.8vw,6px) clamp(8px,2vw,14px)', opacity: faded ? 0.5 : 1, textDecoration: faded ? 'line-through' : 'none', border: '2px solid rgba(255,255,255,0.2)' }}>
        {teamLabel(id)}
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
                        {teamLabel(team.id)}
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
  // Backups for rounds no longer in history — available after a partial revert
  const futureBackups = [...backupRoundNums].filter(n => !committedNums.has(n)).sort((a, b) => a - b);

  // Predetermined-schedule modes: prefill not-yet-played rounds so the whole schedule is visible up front
  const upcomingEntries = [];
  if (tournamentMode === 'roundrobin' && roundRobinSchedule.length > 0) {
    roundRobinSchedule.forEach((pairs, idx) => {
      const roundNum = (roundRobinStartRoundNum || 1) + idx;
      if (!committedNums.has(roundNum)) upcomingEntries.push({ type: 'upcoming', mode: 'roundrobin', roundNum, pairs });
    });
  } else if (tournamentMode === 'tpt' && tptSchedule.length > 0) {
    tptSchedule.forEach((round, idx) => {
      const roundNum = idx + 1;
      if (!committedNums.has(roundNum)) upcomingEntries.push({ type: 'upcoming', mode: 'tpt', roundNum, round });
    });
  } else if (tournamentMode === 'doublesrr' && doublesRRSchedule.length > 0) {
    doublesRRSchedule.forEach((round, idx) => {
      const roundNum = idx + 1;
      if (!committedNums.has(roundNum)) upcomingEntries.push({ type: 'upcoming', mode: 'doublesrr', roundNum, round });
    });
  }

  const allEntries = [
    ...sortedEntries,
    ...effectiveCancelled.map(n => ({ type: 'cancelled', roundNum: n })),
    ...upcomingEntries,
  ].sort((a, b) => {
    const an = a.type === 'round' ? a.h.roundNum : a.roundNum;
    const bn = b.type === 'round' ? b.h.roundNum : b.roundNum;
    return an - bn;
  });

  const showSnapshotAtTop = !!roundRobinStartSnapshot && history.every(h => h.roundNum < (roundRobinStartSnapshot.startRoundNum || 0));
  const showEndAtTop = !!roundRobinEndSnapshot && roundRobinEndSnapshot.endRoundNum == null;

  const displayEntries = newestFirst ? [...allEntries].reverse() : allEntries;

  const isEmpty = history.length === 0 && !roundRobinStartSnapshot && !roundRobinEndSnapshot && cancelledRoundNums.length === 0 && upcomingEntries.length === 0;

  const hasAnyHistory = history.length > 0 || cancelledRoundNums.length > 0 || !!roundRobinStartSnapshot;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        {canFullEdit && hasAnyHistory ? (
          <button onClick={onRevertToBeginning}
            style={{ fontSize: 12, padding: '4px 10px', borderRadius: 8, fontWeight: 700, cursor: 'pointer', background: 'rgba(220,38,38,0.07)', color: '#b91c1c', border: '1px solid rgba(220,38,38,0.2)' }}>
            ↩ Revert to Beginning
          </button>
        ) : <span />}
        <div className="flex items-center gap-2">
          {hasAnyHistory && onExportDUPR && (
            <button onClick={onExportDUPR}
              style={{ fontSize: 12, padding: '4px 10px', borderRadius: 8, fontWeight: 700, cursor: 'pointer', background: 'rgba(99,102,241,0.1)', color: '#4338ca', border: '1px solid rgba(99,102,241,0.3)' }}>
              ⬇ Export to DUPR
            </button>
          )}
          <button onClick={() => setNewestFirst(p => !p)}
            style={{ fontSize: 12, padding: '4px 10px', borderRadius: 8, fontWeight: 700, cursor: 'pointer', background: 'rgba(0,0,0,0.06)', color: '#475569', border: '1px solid rgba(0,0,0,0.1)' }}>
            {newestFirst ? '↓ Newest first' : '↑ Oldest first'}
          </button>
        </div>
      </div>

      {isEmpty && <div className="text-center text-slate-400 py-8 text-sm">No rounds completed yet.</div>}

      {canFullEdit && futureBackups.length > 0 && (
        <div className="rounded-2xl flex flex-col gap-2" style={{ padding: 'clamp(10px,2.5vw,14px) clamp(12px,3vw,18px)', background: 'rgba(217,119,6,0.06)', border: '1px solid rgba(217,119,6,0.3)' }}>
          <p style={{ fontSize: 'clamp(10px,2.5vw,13px)', fontWeight: 800, color: '#92400e', margin: 0 }}>⏩ Snapshots from reverted rounds</p>
          <p style={{ fontSize: 'clamp(9px,2vw,11px)', color: '#b45309', margin: 0 }}>These rounds existed before your last revert. You can restore any of them.</p>
          <div className="flex flex-wrap gap-2">
            {futureBackups.map(rn => (
              <button key={rn} onClick={() => onRevertToRound(rn)}
                style={{ fontSize: 'clamp(11px,2.5vw,13px)', padding: 'clamp(4px,1vw,6px) clamp(10px,2.5vw,14px)', borderRadius: 8, fontWeight: 700, cursor: 'pointer', background: 'rgba(217,119,6,0.12)', color: '#92400e', border: '1px solid rgba(217,119,6,0.35)' }}>
                ↩ Round {rn}
              </button>
            ))}
          </div>
        </div>
      )}

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

        if (entry.type === 'upcoming') {
          const { mode, roundNum } = entry;
          const header = (
            <div className="flex items-center justify-between" style={{ padding: 'clamp(8px,2vw,12px) clamp(12px,3vw,18px)', background: 'rgba(0,0,0,0.03)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
              <span style={{ fontSize: 'clamp(10px,2.5vw,13px)', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Round {roundNum}</span>
              <span style={{ fontSize: 'clamp(9px,2vw,11px)', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Upcoming</span>
            </div>
          );
          const wrap = children => (
            <div key={`upcoming-${roundNum}`} className="rounded-2xl" style={{ background: '#fff', border: '1px dashed rgba(0,0,0,0.15)', overflow: 'hidden', opacity: 0.7 }}>
              {header}
              <div style={{ padding: 'clamp(8px,2vw,12px) clamp(12px,3vw,18px)', display: 'flex', flexDirection: 'column', gap: 'clamp(6px,1.5vw,10px)' }}>{children}</div>
            </div>
          );

          if (mode === 'roundrobin') {
            const rrCourts = (roundRobinCourts && roundRobinCourts.length > 0) ? roundRobinCourts : courtNumbers;
            return wrap(entry.pairs.map(([idA, idB], mi) => {
              const tA = teamById(idA), tB = teamById(idB);
              if (!tA || !tB) return null;
              return (
                <div key={mi} className="flex items-center flex-wrap" style={{ gap: 'clamp(6px,1.5vw,10px)' }}>
                  <span style={{ fontSize: 'clamp(9px,2vw,11px)', color: '#94a3b8', fontWeight: 700, minWidth: 'clamp(48px,11vw,64px)' }}>Court {rrCourts[mi] ?? mi + 1}</span>
                  {chip(tA.id, false)}
                  <span style={{ color: '#cbd5e1', fontWeight: 700 }}>vs</span>
                  {chip(tB.id, false)}
                </div>
              );
            }));
          }

          if (mode === 'tpt') {
            const round = entry.round;
            const byeTeam = round.byeTeamId ? tptTeams[round.byeTeamId] : null;
            const pName = id => { const p = tptPlayers[id]; return p ? (p.nickname || p.name) : '?'; };
            const sideLabel = pids => pids.filter(Boolean).map(pName).join(' & ');
            return wrap(<>
              {round.matchups.map((matchup, mi) => {
                const teamA = tptTeams[matchup.teamAId];
                const teamB = tptTeams[matchup.teamBId];
                if (!teamA || !teamB) return null;
                const gameDefs = getTPTGamesForMatchup(teamA, teamB);
                return (
                  <div key={mi} className="rounded-xl" style={{ padding: 'clamp(6px,1.5vw,10px)', border: '1px solid rgba(0,0,0,0.07)', background: 'rgba(0,0,0,0.01)' }}>
                    <div className="flex items-center gap-2" style={{ marginBottom: 'clamp(5px,1.2vw,8px)' }}>
                      <span className="inline-flex items-center rounded-full font-black" style={{ background: teamA.color, color: teamA.text, fontSize: 'clamp(11px,2.8vw,14px)', padding: '3px 10px' }}>{formatTPTTeamLabel(teamA, tptPlayers, teamNameDisplay)}</span>
                      <span style={{ color: '#94a3b8', fontWeight: 700 }}>vs</span>
                      <span className="inline-flex items-center rounded-full font-black" style={{ background: teamB.color, color: teamB.text, fontSize: 'clamp(11px,2.8vw,14px)', padding: '3px 10px' }}>{formatTPTTeamLabel(teamB, tptPlayers, teamNameDisplay)}</span>
                    </div>
                    {gameDefs.map((def, gi) => {
                      const gameLabel = gi === 0 ? 'Males' : gi === 1 ? 'Mixed #1' : 'Mixed #2';
                      return (
                        <div key={gi} style={{ padding: 'clamp(2px,0.5vw,4px) 0', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                          <div className="flex items-center flex-wrap" style={{ gap: 'clamp(4px,1vw,8px)' }}>
                            <span style={{ fontSize: 'clamp(9px,2vw,11px)', color: gi === 0 ? '#1d4ed8' : '#be185d', fontWeight: 700, minWidth: 'clamp(52px,12vw,72px)', flexShrink: 0 }}>{gameLabel}</span>
                            <span className="inline-flex items-center rounded-full font-bold" style={{ background: teamA.color, color: teamA.text, fontSize: 'clamp(10px,2.5vw,13px)', padding: '2px 8px', whiteSpace: 'nowrap' }}>{sideLabel(def.sideA)}</span>
                            <span style={{ color: '#cbd5e1', fontWeight: 700 }}>vs</span>
                            <span className="inline-flex items-center rounded-full font-bold" style={{ background: teamB.color, color: teamB.text, fontSize: 'clamp(10px,2.5vw,13px)', padding: '2px 8px', whiteSpace: 'nowrap' }}>{sideLabel(def.sideB)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
              {byeTeam && (
                <div className="flex items-center gap-2">
                  <span style={{ color: '#94a3b8', fontSize: 'clamp(10px,2.5vw,12px)', fontWeight: 700 }}>Bye:</span>
                  <span className="inline-flex items-center rounded-full font-bold" style={{ background: byeTeam.color, color: byeTeam.text, fontSize: 'clamp(11px,3vw,14px)', padding: '2px 10px' }}>{formatTPTTeamLabel(byeTeam, tptPlayers, teamNameDisplay)}</span>
                </div>
              )}
            </>);
          }

          // doublesrr
          const round = entry.round;
          return wrap(<>
            {round.courts.map((court, ci) => {
              const sideA = buildSidePresentation(court.teamA, doublesRRPlayers, teamNameDisplay);
              const sideB = buildSidePresentation(court.teamB, doublesRRPlayers, teamNameDisplay);
              return (
                <div key={ci} className="flex items-center flex-wrap" style={{ gap: 'clamp(6px,1.5vw,10px)' }}>
                  <span style={{ fontSize: 'clamp(9px,2vw,11px)', color: '#94a3b8', fontWeight: 700, minWidth: 'clamp(48px,11vw,64px)' }}>Court {ci + 1}</span>
                  <span className="inline-flex items-center rounded-full font-bold" style={{ background: sideA.chipBackground ?? sideA.color, color: sideA.text, fontSize: 'clamp(11px,2.8vw,14px)', padding: '3px 10px', whiteSpace: 'nowrap' }}>{sideA.name}</span>
                  <span style={{ color: '#cbd5e1', fontWeight: 700 }}>vs</span>
                  <span className="inline-flex items-center rounded-full font-bold" style={{ background: sideB.chipBackground ?? sideB.color, color: sideB.text, fontSize: 'clamp(11px,2.8vw,14px)', padding: '3px 10px', whiteSpace: 'nowrap' }}>{sideB.name}</span>
                </div>
              );
            })}
            {round.byePlayerIds?.length > 0 && (() => {
              const byeSide = buildSidePresentation(round.byePlayerIds, doublesRRPlayers, teamNameDisplay);
              return (
                <div className="flex items-center gap-2">
                  <span style={{ color: '#94a3b8', fontSize: 'clamp(10px,2.5vw,12px)', fontWeight: 700 }}>Bye:</span>
                  <span className="inline-flex items-center rounded-full font-bold" style={{ background: byeSide.chipBackground ?? byeSide.color, color: byeSide.text, fontSize: 'clamp(11px,2.8vw,14px)', padding: '3px 10px', whiteSpace: 'nowrap' }}>{byeSide.name}</span>
                </div>
              );
            })()}
          </>);
        }
        const { h, ri } = entry;
        const isTPTRound = !!h.tptMatchups;
        const isDoublesRRRound = !!h.doublesRRCourts;
        const seIdx = sortedEntries.findIndex(e => e.ri === ri);

        if (isTPTRound) {
          const byeTeam = h.tptByeTeamId ? tptTeams[h.tptByeTeamId] : null;
          return (
            <div key={ri} className="rounded-2xl" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', overflow: 'hidden' }}>
              <div style={{ padding: 'clamp(8px,2vw,12px) clamp(12px,3vw,18px)', background: 'rgba(15,76,117,0.06)', borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
                <span style={{ fontSize: 'clamp(10px,2.5vw,13px)', color: '#0f4c75', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Round {h.roundNum}</span>
              </div>
              <div style={{ padding: 'clamp(8px,2vw,12px) clamp(12px,3vw,18px)', display: 'flex', flexDirection: 'column', gap: 'clamp(8px,2vw,12px)' }}>
                {h.tptMatchups.map((matchup, mi) => {
                  const teamA = tptTeams[matchup.teamAId];
                  const teamB = tptTeams[matchup.teamBId];
                  if (!teamA || !teamB) return null;
                  const gameDefs = getTPTGamesForMatchup(teamA, teamB);
                  const pName = id => { const p = tptPlayers[id]; return p ? (p.nickname || p.name) : '?'; };
                  const sideLabel = pids => pids.filter(Boolean).map(pName).join(' & ');
                  const sideChip = (pids, team, won) => (
                    <span className="inline-flex items-center rounded-full font-bold"
                      style={{ background: team.color, color: team.text, fontSize: 'clamp(11px,2.8vw,14px)', padding: '3px 10px', whiteSpace: 'nowrap', opacity: won ? 1 : 0.6 }}>
                      {sideLabel(pids)}
                    </span>
                  );
                  return (
                    <div key={mi} className="rounded-xl" style={{ padding: 'clamp(8px,2vw,12px)', border: '1px solid rgba(0,0,0,0.07)', background: 'rgba(0,0,0,0.01)' }}>
                      <div className="flex items-center gap-2" style={{ marginBottom: 'clamp(6px,1.5vw,10px)' }}>
                        <span className="inline-flex items-center rounded-full font-black" style={{ background: teamA.color, color: teamA.text, fontSize: 'clamp(11px,2.8vw,14px)', padding: '3px 10px' }}>{formatTPTTeamLabel(teamA, tptPlayers, teamNameDisplay)}</span>
                        <span style={{ color: '#94a3b8', fontWeight: 700 }}>vs</span>
                        <span className="inline-flex items-center rounded-full font-black" style={{ background: teamB.color, color: teamB.text, fontSize: 'clamp(11px,2.8vw,14px)', padding: '3px 10px' }}>{formatTPTTeamLabel(teamB, tptPlayers, teamNameDisplay)}</span>
                      </div>
                      {(matchup.games || []).map((game, gi) => {
                        if (!game) return null;
                        const def = gameDefs[gi];
                        const gameLabel = gi === 0 ? 'Males' : gi === 1 ? 'Mixed #1' : 'Mixed #2';
                        const aWon = game.winnerTeamId === teamA.id;
                        const scoreA = aWon ? game.winnerScore : game.loserScore;
                        const scoreB = aWon ? game.loserScore : game.winnerScore;
                        return (
                          <div key={gi} style={{ padding: 'clamp(3px,0.8vw,5px) 0', borderTop: gi > 0 ? '1px solid rgba(0,0,0,0.05)' : undefined }}>
                            <div className="flex items-center flex-wrap" style={{ gap: 'clamp(4px,1vw,8px)' }}>
                              <span style={{ fontSize: 'clamp(9px,2vw,11px)', color: gi === 0 ? '#1d4ed8' : '#be185d', fontWeight: 700, minWidth: 'clamp(52px,12vw,72px)', flexShrink: 0 }}>{gameLabel}</span>
                              {sideChip(def?.sideA || [], teamA, aWon)}
                              <span style={{ fontWeight: 800, color: '#1e293b', fontSize: 'clamp(12px,3vw,15px)' }}>{scoreA}</span>
                              <span style={{ color: '#94a3b8' }}>–</span>
                              <span style={{ fontWeight: 800, color: '#1e293b', fontSize: 'clamp(12px,3vw,15px)' }}>{scoreB}</span>
                              {sideChip(def?.sideB || [], teamB, !aWon)}
                              {canEditScores && (
                                <button onClick={() => onEditTPTGame?.(ri, mi, gi)}
                                  style={{ fontSize: 'clamp(10px,2.5vw,13px)', padding: 'clamp(2px,0.5vw,4px) clamp(5px,1.2vw,8px)', borderRadius: 8, background: 'rgba(15,76,117,0.08)', color: '#0f4c75', border: '1px solid rgba(15,76,117,0.2)', cursor: 'pointer' }}>✏️</button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
                {byeTeam && (
                  <div className="flex items-center gap-2">
                    <span style={{ color: '#94a3b8', fontSize: 'clamp(10px,2.5vw,12px)', fontWeight: 700 }}>Bye:</span>
                    <span className="inline-flex items-center rounded-full font-bold" style={{ background: byeTeam.color, color: byeTeam.text, fontSize: 'clamp(11px,3vw,14px)', padding: '2px 10px' }}>{formatTPTTeamLabel(byeTeam, tptPlayers, teamNameDisplay)}</span>
                  </div>
                )}
              </div>
            </div>
          );
        }

        if (isDoublesRRRound) {
          const sideChip = (pids, won) => {
            const side = buildSidePresentation(pids || [], doublesRRPlayers, teamNameDisplay);
            return (
              <span className="inline-flex items-center rounded-full font-bold"
                style={{ background: side.chipBackground ?? side.color, color: side.text, fontSize: 'clamp(11px,2.8vw,14px)', padding: '3px 10px', whiteSpace: 'nowrap', opacity: won ? 1 : 0.6 }}>
                {side.name}
              </span>
            );
          };
          return (
            <div key={ri} className="rounded-2xl" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', overflow: 'hidden' }}>
              <div style={{ padding: 'clamp(8px,2vw,12px) clamp(12px,3vw,18px)', background: 'rgba(15,76,117,0.06)', borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
                <span style={{ fontSize: 'clamp(10px,2.5vw,13px)', color: '#0f4c75', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Round {h.roundNum}</span>
              </div>
              <div style={{ padding: 'clamp(8px,2vw,12px) clamp(12px,3vw,18px)', display: 'flex', flexDirection: 'column', gap: 'clamp(6px,1.5vw,10px)' }}>
                {h.doublesRRCourts.map((court, ci) => {
                  const aWon = court.winnerIds && court.winnerIds.join(',') === (court.teamA || []).join(',');
                  const scoreA = aWon ? court.winnerScore : court.loserScore;
                  const scoreB = aWon ? court.loserScore : court.winnerScore;
                  return (
                    <div key={ci} className="flex items-center flex-wrap" style={{ gap: 'clamp(4px,1vw,8px)', padding: 'clamp(4px,1vw,6px) 0', borderTop: ci > 0 ? '1px solid rgba(0,0,0,0.05)' : undefined }}>
                      <span style={{ fontSize: 'clamp(9px,2vw,11px)', color: '#0f4c75', fontWeight: 700, minWidth: 'clamp(48px,11vw,64px)', flexShrink: 0 }}>Court {ci + 1}</span>
                      {sideChip(court.teamA, aWon)}
                      <span style={{ fontWeight: 800, color: '#1e293b', fontSize: 'clamp(12px,3vw,15px)' }}>{scoreA}</span>
                      <span style={{ color: '#94a3b8' }}>–</span>
                      <span style={{ fontWeight: 800, color: '#1e293b', fontSize: 'clamp(12px,3vw,15px)' }}>{scoreB}</span>
                      {sideChip(court.teamB, !aWon)}
                      {canEditScores && (
                        <button onClick={() => onEditDoublesRRGame?.(ri, ci)}
                          style={{ fontSize: 'clamp(10px,2.5vw,13px)', padding: 'clamp(2px,0.5vw,4px) clamp(5px,1.2vw,8px)', borderRadius: 8, background: 'rgba(15,76,117,0.08)', color: '#0f4c75', border: '1px solid rgba(15,76,117,0.2)', cursor: 'pointer' }}>✏️</button>
                      )}
                    </div>
                  );
                })}
                {h.bye?.length > 0 && (() => {
                  const byeSide = buildSidePresentation(h.bye, doublesRRPlayers, teamNameDisplay);
                  return (
                    <div className="flex items-center gap-2">
                      <span style={{ color: '#94a3b8', fontSize: 'clamp(10px,2.5vw,12px)', fontWeight: 700 }}>Bye:</span>
                      <span className="inline-flex items-center rounded-full font-bold"
                        style={{ background: byeSide.chipBackground ?? byeSide.color, color: byeSide.text, fontSize: 'clamp(11px,2.8vw,14px)', padding: '3px 10px', whiteSpace: 'nowrap' }}>
                        {byeSide.name}
                      </span>
                    </div>
                  );
                })()}
              </div>
            </div>
          );
        }

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
          <div key={ri} className="flex flex-col gap-3">
            {newestFirst && isLastRR && renderRREndSnapshot()}
            <div className="rounded-2xl" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', overflow: 'hidden' }}>
              <div className="flex items-center justify-between" style={{ padding: 'clamp(8px,2vw,12px) clamp(12px,3vw,18px)', background: 'rgba(15,76,117,0.06)', borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
                <span style={{ fontSize: 'clamp(10px,2.5vw,13px)', color: '#0f4c75', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Round {h.roundNum}</span>
                {canFullEdit && (
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
                      <div style={{ textAlign: 'center' }}>
                        {editingCourtNum?.ri === ri && editingCourtNum?.gi === gi ? (
                          <input ref={courtInputRef} value={courtNumDraft} onChange={e => setCourtNumDraft(e.target.value)}
                            onBlur={() => commitCourtEdit(ri, gi)}
                            onKeyDown={e => { if (e.key === 'Enter') commitCourtEdit(ri, gi); if (e.key === 'Escape') setEditingCourtNum(null); }}
                            style={{ width: '100%', fontSize: 'clamp(10px,2.5vw,13px)', fontWeight: 700, textAlign: 'center', padding: '2px 4px', borderRadius: 4, background: 'rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.2)', outline: 'none' }} />
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: 'clamp(10px,2.5vw,13px)', fontWeight: 700, cursor: canFullEdit ? 'pointer' : 'default' }}
                            title={canFullEdit ? 'Click to edit court number' : undefined}
                            onClick={canFullEdit ? () => { setEditingCourtNum({ ri, gi }); setCourtNumDraft(String(game.courtNumber ?? '')); setTimeout(() => courtInputRef.current?.focus(), 0); } : undefined}>
                            {game.courtNumber}
                          </span>
                        )}
                      </div>
                      <div className="flex justify-end">
                        <span className="inline-flex items-center rounded-full font-bold" style={{ background: w?.color, color: w?.text, fontSize: 'clamp(11px,3vw,15px)', padding: 'clamp(3px,0.8vw,6px) clamp(8px,2vw,14px)', whiteSpace: 'nowrap' }}>{w ? teamLabel(w.id) : ''}</span>
                      </div>
                      <span style={{ fontWeight: 800, textAlign: 'right', color: w?.color, fontSize: 'clamp(13px,3vw,17px)' }}>{game.winnerScore}</span>
                      <span style={{ color: '#cbd5e1', fontSize: 'clamp(10px,2.5vw,13px)', textAlign: 'center' }}>–</span>
                      <span style={{ fontWeight: 800, textAlign: 'left', color: l?.color, fontSize: 'clamp(13px,3vw,17px)' }}>{game.loserScore}</span>
                      <div className="flex justify-start">
                        <span className="inline-flex items-center rounded-full font-bold" style={{ background: l?.color, color: l?.text, fontSize: 'clamp(11px,3vw,15px)', padding: 'clamp(3px,0.8vw,6px) clamp(8px,2vw,14px)', whiteSpace: 'nowrap' }}>{l ? teamLabel(l.id) : ''}</span>
                      </div>
                      <div className="flex gap-1">
                        {canEditScores && (
                          <button onClick={() => onEditGame(ri, gi)}
                            style={{ fontSize: 'clamp(10px,2.5vw,13px)', padding: 'clamp(3px,0.8vw,6px) clamp(6px,1.5vw,10px)', borderRadius: 8, background: 'rgba(15,76,117,0.08)', color: '#0f4c75', border: '1px solid rgba(15,76,117,0.2)', cursor: 'pointer', whiteSpace: 'nowrap' }}>✏️</button>
                        )}
                        {canDeleteGame && (
                          <button onClick={() => onRemoveGame(ri, gi)}
                            style={{ fontSize: 'clamp(10px,2.5vw,13px)', padding: 'clamp(3px,0.8vw,6px) clamp(6px,1.5vw,10px)', borderRadius: 8, background: 'rgba(220,38,38,0.08)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.2)', cursor: 'pointer', whiteSpace: 'nowrap' }}>×</button>
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
                          {teamLabel(id)}
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
                          {teamLabel(id)}
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
                        <span style={{ color: t.color, fontWeight: 700 }}>{teamLabel(id)}</span>
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
