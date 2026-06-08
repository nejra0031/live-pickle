import { useTeamById, useTeamLabel } from '../../context/TeamRegistryContext';
import CourtCard from '../../components/CourtCard';
import MatchupVsBox from '../../components/MatchupVsBox';
import RoundTimer from '../../components/RoundTimer';
import { hasPermission } from '../../roleConfig';
import BreakBanner from './BreakBanner';
import SocialCourts from './SocialCourts';

export default function RoundRobinSection({
  roundRobinSchedule, roundRobinCourts, roundRobinStartRoundNum,
  timerDuration, timerSecsLeft, timerRunning, breakMode, role,
  pending, pausedIds, courtNumbers, socialCourts, history,
  isAdmin,
  onRRMatchResult, rrMatchKey,
  onContinueSwissAfterRR, onExitRoundRobin, onSelectRRTeams,
  onFinishTournament, onBreakEnd, onBreakStart, onReset, onManageCourts,
  onTimerToggle, onTimerRestart, onTimerSettings,
}) {
  const teamById = useTeamById();
  const teamLabel = useTeamLabel();
  const canWrite = hasPermission(role, 'canSubmitResults');
  const rrCourts = (roundRobinCourts && roundRobinCourts.length > 0) ? roundRobinCourts : courtNumbers;
  const completedCount = roundRobinSchedule.filter((_, i) => history.some(h => h.roundNum === (roundRobinStartRoundNum || 1) + i)).length;
  const allDone = completedCount === roundRobinSchedule.length && roundRobinSchedule.length > 0;
  const currentRoundIdx = Math.min(completedCount, Math.max(0, roundRobinSchedule.length - 1));
  const srIdx = currentRoundIdx;
  const schedRound = roundRobinSchedule[srIdx];

  return (
    <div className="flex flex-col" style={{ gap: 'clamp(10px,2.5vw,16px)' }}>
      <BreakBanner breakMode={breakMode} onBreakEnd={onBreakEnd} role={role} />
      <SocialCourts socialCourts={socialCourts} />
      {timerDuration > 0 && !breakMode && (
        <RoundTimer secsLeft={timerSecsLeft} totalSecs={timerDuration} timerRunning={timerRunning}
          canToggleTimer={hasPermission(role, 'canEditTimer') || hasPermission(role, 'canToggleTimer')}
          canControlTimer={hasPermission(role, 'canEditTimer')}
          onToggle={onTimerToggle} onRestart={onTimerRestart} onOpenSettings={onTimerSettings} />
      )}
      <div className="rounded-2xl flex flex-col" style={{ padding: 'clamp(10px,2.5vw,16px)', gap: 'clamp(4px,1vw,8px)', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.25)' }}>
        <p className="font-bold" style={{ color: '#4338ca', fontSize: 'clamp(13px,3.5vw,17px)' }}>🔁 Round Robin</p>
        <p style={{ color: '#64748b', fontSize: 'clamp(10px,2.5vw,13px)' }}>
          {roundRobinSchedule.length} round{roundRobinSchedule.length !== 1 ? 's' : ''} · {roundRobinSchedule.reduce((a, r) => a + r.length, 0)} total matches · Courts: {rrCourts.join(', ')}. {completedCount}/{roundRobinSchedule.length} round{roundRobinSchedule.length !== 1 ? 's' : ''} complete.
        </p>
      </div>

      {schedRound && (() => {
        const labelNum = (roundRobinStartRoundNum || 1) + srIdx;
        const committedEntry = history.find(h => h.roundNum === labelNum);
        const isComplete = !!committedEntry;
        return (
          <div className="flex flex-col"
            style={{ gap: 'clamp(8px,2vw,12px)', padding: 'clamp(10px,2.5vw,14px)', borderRadius: 14, background: isComplete ? 'rgba(34,197,94,0.05)' : 'rgba(0,0,0,0.02)', border: `1px solid ${isComplete ? 'rgba(34,197,94,0.25)' : 'rgba(0,0,0,0.08)'}` }}>
            <div className="flex items-center justify-between">
              <span style={{ color: isComplete ? '#16a34a' : '#0f4c75', fontWeight: 800, fontSize: 'clamp(12px,3vw,15px)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{isComplete ? '✓ ' : ''}Round {labelNum}</span>
              {isComplete && <span style={{ color: '#16a34a', fontSize: 'clamp(10px,2.5vw,13px)', fontWeight: 700 }}>Complete</span>}
            </div>
            {schedRound.map(([idA, idB], mi) => {
              const tA = teamById(idA), tB = teamById(idB);
              if (!tA || !tB) return null;
              const courtLabel = `Court ${rrCourts[mi] ?? mi + 1}`;
              const committedGame = isComplete ? committedEntry.games.find(g => (g.winnerId === idA && g.loserId === idB) || (g.winnerId === idB && g.loserId === idA)) : null;
              const pendingKey = rrMatchKey(srIdx, mi);
              const pendingResult = pending[pendingKey];
              if (committedGame) {
                const w = teamById(committedGame.winnerId), l = teamById(committedGame.loserId);
                const committedLabel = `Court ${committedGame.courtNumber ?? rrCourts[mi] ?? mi + 1}`;
                return (
                  <div key={mi} className="rounded-xl flex items-center" style={{ padding: 'clamp(8px,2vw,12px)', gap: 'clamp(8px,2vw,12px)', background: '#fff', border: '1px solid rgba(0,0,0,0.08)' }}>
                    <span style={{ color: '#94a3b8', fontSize: 'clamp(10px,2.5vw,12px)', fontWeight: 700, minWidth: 50 }}>{committedLabel}</span>
                    <span className="inline-flex items-center rounded-full font-bold" style={{ background: w?.color, color: w?.text, padding: '3px 10px', fontSize: 'clamp(11px,2.8vw,14px)', whiteSpace: 'nowrap' }}>{w ? teamLabel(w.id) : ''}</span>
                    <span style={{ fontWeight: 800, color: w?.color, fontSize: 'clamp(13px,3vw,16px)' }}>{committedGame.winnerScore}</span>
                    <span style={{ color: '#cbd5e1' }}>–</span>
                    <span style={{ fontWeight: 800, color: l?.color, fontSize: 'clamp(13px,3vw,16px)' }}>{committedGame.loserScore}</span>
                    <span className="inline-flex items-center rounded-full font-bold" style={{ background: l?.color, color: l?.text, padding: '3px 10px', fontSize: 'clamp(11px,2.8vw,14px)', whiteSpace: 'nowrap' }}>{l ? teamLabel(l.id) : ''}</span>
                  </div>
                );
              }
              if (canWrite) {
                const aIsPaused = pausedIds.includes(idA), bIsPaused = pausedIds.includes(idB);
                if (aIsPaused || bIsPaused) {
                  const activeId = aIsPaused ? idB : idA, pausedId = aIsPaused ? idA : idB;
                  const activeTeam = aIsPaused ? tB : tA, pausedTeam = aIsPaused ? tA : tB;
                  return (
                    <div key={`rr-${srIdx}-${mi}-paused`} className="rounded-xl flex flex-col gap-2" style={{ padding: 'clamp(8px,2vw,12px)', background: 'rgba(220,38,38,0.04)', border: '1px dashed rgba(220,38,38,0.3)' }}>
                      <div className="flex items-center gap-2">
                        <span style={{ color: '#94a3b8', fontSize: 'clamp(10px,2.5vw,12px)', fontWeight: 700, minWidth: 50 }}>{courtLabel}</span>
                        <span className="inline-flex items-center rounded-full font-bold" style={{ background: activeTeam.color, color: activeTeam.text, padding: '3px 10px', fontSize: 'clamp(11px,2.8vw,14px)' }}>{teamLabel(activeTeam.id)}</span>
                        <span style={{ color: '#94a3b8', fontSize: 13 }}>vs</span>
                        <span className="inline-flex items-center rounded-full font-bold" style={{ background: pausedTeam.color, color: pausedTeam.text, padding: '3px 10px', fontSize: 'clamp(11px,2.8vw,14px)', opacity: 0.5, textDecoration: 'line-through' }}>{teamLabel(pausedTeam.id)}</span>
                        <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 700 }}>PAUSED</span>
                      </div>
                      <button onClick={() => onRRMatchResult(srIdx, mi, { winnerId: activeId, loserId: pausedId, winnerScore: 1, loserScore: 0, courtNumber: rrCourts[mi] ?? mi + 1 })}
                        style={{ alignSelf: 'flex-start', fontSize: 'clamp(10px,2.5vw,12px)', padding: 'clamp(3px,0.8vw,5px) clamp(8px,2vw,12px)', borderRadius: 8, fontWeight: 700, cursor: 'pointer', background: 'rgba(220,38,38,0.1)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.25)' }}>
                        🏳 Forfeit — award walkover to {teamLabel(activeTeam.id)}
                      </button>
                    </div>
                  );
                }
                return <CourtCard key={`rr-${srIdx}-${mi}-${pendingResult ? 'done' : 'open'}`} courtLabel={courtLabel} teams={[{ ...tA, name: teamLabel(tA.id) }, { ...tB, name: teamLabel(tB.id) }]} onResult={r => onRRMatchResult(srIdx, mi, { ...r, courtNumber: rrCourts[mi] ?? mi + 1 })} pendingResult={pendingResult} />;
              }
              const aIsPausedV = pausedIds.includes(idA), bIsPausedV = pausedIds.includes(idB);
              return (
                <div key={mi} className="rounded-xl" style={{ padding: 'clamp(10px,2.5vw,14px)', background: '#fff', border: `1px solid ${aIsPausedV || bIsPausedV ? 'rgba(220,38,38,0.3)' : 'rgba(0,0,0,0.1)'}` }}>
                  <MatchupVsBox courtLabel={courtLabel}
                    headerExtra={(aIsPausedV || bIsPausedV) && <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 700 }}>⚠ Team paused</span>}
                    teamA={{ ...tA, name: teamLabel(tA.id) }} teamB={{ ...tB, name: teamLabel(tB.id) }}
                    dimA={aIsPausedV} dimB={bIsPausedV} />
                </div>
              );
            })}
          </div>
        );
      })()}

      {allDone && isAdmin && (
        <div className="rounded-2xl flex flex-col" style={{ padding: 'clamp(12px,3vw,18px)', gap: 'clamp(8px,2vw,12px)', background: 'linear-gradient(135deg,#fef3c7,#fde68a)', border: '1px solid rgba(217,119,6,0.3)' }}>
          <p className="font-black text-center" style={{ color: '#92400e', fontSize: 'clamp(15px,3.5vw,20px)', margin: 0 }}>🏆 Round Robin Complete</p>
          <p className="text-center" style={{ color: '#78350f', fontSize: 'clamp(11px,2.8vw,14px)', margin: 0 }}>{roundRobinSchedule.length} round{roundRobinSchedule.length !== 1 ? 's' : ''} · {roundRobinSchedule.reduce((a, r) => a + r.length, 0)} matches played</p>
          <button onClick={onContinueSwissAfterRR} style={{ padding: 'clamp(10px,2.5vw,14px)', borderRadius: 12, fontWeight: 800, fontSize: 'clamp(13px,3vw,16px)', cursor: 'pointer', background: 'linear-gradient(90deg,#0f4c75,#1a6fa8)', color: '#fff', border: 'none' }}>↩ Continue with Swiss</button>
          <button onClick={() => { onExitRoundRobin('completed'); onSelectRRTeams(); }} style={{ padding: 'clamp(10px,2.5vw,14px)', borderRadius: 12, fontWeight: 800, fontSize: 'clamp(13px,3vw,16px)', cursor: 'pointer', background: 'linear-gradient(90deg,#6366f1,#8b5cf6)', color: '#fff', border: 'none' }}>🔁 Start a new Round Robin</button>
          <button onClick={onFinishTournament} style={{ padding: 'clamp(10px,2.5vw,14px)', borderRadius: 12, fontWeight: 800, fontSize: 'clamp(13px,3vw,16px)', cursor: 'pointer', background: 'linear-gradient(90deg,#d97706,#f59e0b)', color: '#fff', border: 'none' }}>🏁 Finish Tournament</button>
        </div>
      )}
      {hasPermission(role, 'canSwitchTournamentMode') && !allDone && <button onClick={() => onExitRoundRobin()} style={{ padding: 'clamp(8px,2vw,12px)', borderRadius: 12, fontWeight: 700, fontSize: 'clamp(12px,3vw,15px)', cursor: 'pointer', background: 'rgba(0,0,0,0.05)', color: '#475569', border: '1px solid rgba(0,0,0,0.1)' }}>↩ Exit Round Robin (back to Swiss)</button>}
      {isAdmin && !allDone && <button onClick={onFinishTournament} style={{ padding: 'clamp(8px,2vw,12px)', borderRadius: 12, fontWeight: 700, fontSize: 'clamp(12px,3vw,15px)', cursor: 'pointer', background: 'linear-gradient(90deg,#d97706,#f59e0b)', color: '#fff', border: 'none' }}>🏁 Finish Tournament</button>}
      {isAdmin && <button onClick={onBreakStart} style={{ padding: 'clamp(8px,2vw,12px)', borderRadius: 12, fontWeight: 700, fontSize: 'clamp(12px,3vw,15px)', cursor: 'pointer', background: 'rgba(217,119,6,0.1)', color: '#92400e', border: '1px solid rgba(217,119,6,0.3)' }}>☕ Pause Tournament (Break)</button>}
      {isAdmin && <button onClick={onReset} style={{ cursor: 'pointer', background: 'none', border: 'none', color: '#94a3b8', fontSize: 12, textDecoration: 'underline' }}>↩ Reset tournament…</button>}
      {isAdmin && <button onClick={onManageCourts} style={{ cursor: 'pointer', background: 'none', border: 'none', color: '#6366f1', fontSize: 12, textDecoration: 'underline' }}>🏟️ Manage courts (rename)</button>}
    </div>
  );
}
