import { useTeamById } from '../context/TeamRegistryContext';
import CourtCard from '../components/CourtCard';
import TeamChip from '../components/TeamChip';
import { courtKey, liveKey } from '../constants';

export default function PlayTab({
  tournamentFinished, breakMode, round, roundNum, tournamentMode,
  roundRobinSchedule, roundRobinCourts, roundRobinStartRoundNum,
  courtNumbers, socialCourts = [], liveAdditions, pending, isAdmin, finalRound, setFinalRound,
  history, ranked, activeRoundExtras, nextRoundPresets, roundKey,
  onResult, onLiveResult, onRRMatchResult,
  onGenerateRound, onRegenerateRound, onFinishTournament, onResumeTournament,
  onBreakStart, onBreakEnd,
  onEditActiveCourt, onRemoveActiveCourt,
  onEditLive, onRemoveLive,
  onUndoResult, onUndoLiveResult,
  onRemovePreset, onRemoveExtra,
  onSelectRRTeams, onPresetMatch, onLiveAddGame,
  onContinueSwissAfterRR, onExitRoundRobin,
  onManageTeams, onManageCourts,
  onReset, onCancelRound,
  rrMatchKey,
}) {
  const teamById = useTeamById();

  const breakBanner = breakMode ? (
    <div className="rounded-2xl flex flex-col gap-2" style={{ padding: 'clamp(14px,3.5vw,22px)', background: 'linear-gradient(135deg,#fef3c7,#fde68a)', border: '1px solid rgba(217,119,6,0.4)' }}>
      <div className="flex items-center gap-2">
        <span style={{ fontSize: 'clamp(22px,5.5vw,32px)' }}>☕</span>
        <div>
          <p style={{ fontWeight: 900, fontSize: 'clamp(14px,3.5vw,20px)', color: '#92400e', margin: 0 }}>{breakMode.message}</p>
          <p style={{ fontSize: 'clamp(10px,2.5vw,13px)', color: '#b45309', margin: 0 }}>Tournament is on a break — matches resume shortly.</p>
        </div>
      </div>
      {isAdmin && (
        <button onClick={onBreakEnd} style={{ alignSelf: 'flex-start', padding: '6px 16px', borderRadius: 8, fontWeight: 700, fontSize: 'clamp(11px,2.5vw,13px)', cursor: 'pointer', background: 'rgba(146,64,14,0.15)', color: '#92400e', border: '1px solid rgba(146,64,14,0.3)' }}>
          End Break
        </button>
      )}
    </div>
  ) : null;

  const socialSection = socialCourts.length > 0 ? (
    <div className="flex flex-col" style={{ gap: 'clamp(8px,2vw,12px)' }}>
      <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 'clamp(9px,2vw,11px)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>— social play —</div>
      {socialCourts.map(c => (
        <div key={c} className="rounded-2xl flex flex-col items-center" style={{ padding: 'clamp(14px,3.5vw,22px)', background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.2)' }}>
          <p style={{ fontSize: 'clamp(10px,2.5vw,13px)', color: '#6366f1', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Court {c}</p>
          <p className="font-black" style={{ fontSize: 'clamp(28px,7vw,44px)', color: '#6366f1', letterSpacing: '0.05em', margin: 0 }}>SOCIAL</p>
          <p style={{ fontSize: 'clamp(10px,2.5vw,12px)', color: '#94a3b8', marginTop: 4 }}>Open play — not counted in standings</p>
        </div>
      ))}
    </div>
  ) : null;

  /* ── Tournament finished — podium ── */
  if (tournamentFinished) {
    const top = ranked.slice(0, 3);
    const podium = [top[1], top[0], top[2]].filter(Boolean);
    const heights = [120, 160, 90];
    const medals = ['🥈', '🥇', '🥉'];
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
                  {t.name}
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

  /* ── Round Robin mode ── */
  if (tournamentMode === 'roundrobin' && roundRobinSchedule) {
    const rrCourts = (roundRobinCourts && roundRobinCourts.length > 0) ? roundRobinCourts : courtNumbers;
    const completedCount = roundRobinSchedule.filter((_, i) => history.some(h => h.roundNum === (roundRobinStartRoundNum || 1) + i)).length;
    const allDone = completedCount === roundRobinSchedule.length && roundRobinSchedule.length > 0;
    return (
      <div className="flex flex-col" style={{ gap: 'clamp(10px,2.5vw,16px)' }}>
        {breakBanner}
        {socialSection}
        <div className="rounded-2xl flex flex-col" style={{ padding: 'clamp(10px,2.5vw,16px)', gap: 'clamp(4px,1vw,8px)', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.25)' }}>
          <p className="font-bold" style={{ color: '#4338ca', fontSize: 'clamp(13px,3.5vw,17px)' }}>🔁 Round Robin</p>
          <p style={{ color: '#64748b', fontSize: 'clamp(10px,2.5vw,13px)' }}>
            {roundRobinSchedule.length} round{roundRobinSchedule.length !== 1 ? 's' : ''} · {roundRobinSchedule.reduce((a, r) => a + r.length, 0)} total matches · Courts: {rrCourts.join(', ')}. {completedCount}/{roundRobinSchedule.length} round{roundRobinSchedule.length !== 1 ? 's' : ''} complete.
          </p>
        </div>

        {roundRobinSchedule.map((schedRound, srIdx) => {
          const labelNum = (roundRobinStartRoundNum || 1) + srIdx;
          const committedEntry = history.find(h => h.roundNum === labelNum);
          const isComplete = !!committedEntry;
          return (
            <div key={srIdx} className="flex flex-col"
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
                  return (
                    <div key={mi} className="rounded-xl flex items-center" style={{ padding: 'clamp(8px,2vw,12px)', gap: 'clamp(8px,2vw,12px)', background: '#fff', border: '1px solid rgba(0,0,0,0.08)' }}>
                      <span style={{ color: '#94a3b8', fontSize: 'clamp(10px,2.5vw,12px)', fontWeight: 700, minWidth: 50 }}>{courtLabel}</span>
                      <span className="inline-flex items-center rounded-full font-bold" style={{ background: w?.color, color: w?.text, padding: '3px 10px', fontSize: 'clamp(11px,2.8vw,14px)', whiteSpace: 'nowrap' }}>{w?.name}</span>
                      <span style={{ fontWeight: 800, color: w?.color, fontSize: 'clamp(13px,3vw,16px)' }}>{committedGame.winnerScore}</span>
                      <span style={{ color: '#cbd5e1' }}>–</span>
                      <span style={{ fontWeight: 800, color: l?.color, fontSize: 'clamp(13px,3vw,16px)' }}>{committedGame.loserScore}</span>
                      <span className="inline-flex items-center rounded-full font-bold" style={{ background: l?.color, color: l?.text, padding: '3px 10px', fontSize: 'clamp(11px,2.8vw,14px)', whiteSpace: 'nowrap' }}>{l?.name}</span>
                    </div>
                  );
                }
                if (isAdmin) {
                  return <CourtCard key={`rr-${srIdx}-${mi}-${pendingResult ? 'done' : 'open'}`} courtLabel={courtLabel} teams={[tA, tB]} onResult={r => onRRMatchResult(srIdx, mi, r)} pendingResult={pendingResult} />;
                }
                return (
                  <div key={mi} className="rounded-xl" style={{ padding: 'clamp(10px,2.5vw,14px)', background: '#fff', border: '1px solid rgba(0,0,0,0.1)' }}>
                    <p style={{ fontSize: 'clamp(10px,2.5vw,13px)', color: '#0f4c75', fontWeight: 800, marginBottom: 'clamp(6px,1.5vw,10px)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{courtLabel}</p>
                    <div className="flex items-stretch" style={{ gap: 'clamp(6px,1.5vw,10px)' }}>
                      <div className="flex-1 flex items-center justify-center rounded-xl" style={{ padding: 'clamp(10px,2.5vw,16px)', background: tA.color, border: `2px solid ${tA.color}` }}>
                        <span className="font-black text-center" style={{ fontSize: 'clamp(14px,3.5vw,22px)', color: tA.text }}>{tA.name}</span>
                      </div>
                      <div className="flex items-center justify-center flex-shrink-0">
                        <span style={{ color: '#cbd5e1', fontWeight: 900, fontSize: 'clamp(12px,3vw,18px)' }}>VS</span>
                      </div>
                      <div className="flex-1 flex items-center justify-center rounded-xl" style={{ padding: 'clamp(10px,2.5vw,16px)', background: tB.color, border: `2px solid ${tB.color}` }}>
                        <span className="font-black text-center" style={{ fontSize: 'clamp(14px,3.5vw,22px)', color: tB.text }}>{tB.name}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}

        {allDone && isAdmin && (
          <div className="rounded-2xl flex flex-col" style={{ padding: 'clamp(12px,3vw,18px)', gap: 'clamp(8px,2vw,12px)', background: 'linear-gradient(135deg,#fef3c7,#fde68a)', border: '1px solid rgba(217,119,6,0.3)' }}>
            <p className="font-black text-center" style={{ color: '#92400e', fontSize: 'clamp(15px,3.5vw,20px)', margin: 0 }}>🏆 Round Robin Complete</p>
            <p className="text-center" style={{ color: '#78350f', fontSize: 'clamp(11px,2.8vw,14px)', margin: 0 }}>{roundRobinSchedule.length} round{roundRobinSchedule.length !== 1 ? 's' : ''} · {roundRobinSchedule.reduce((a, r) => a + r.length, 0)} matches played</p>
            <button onClick={onContinueSwissAfterRR} style={{ padding: 'clamp(10px,2.5vw,14px)', borderRadius: 12, fontWeight: 800, fontSize: 'clamp(13px,3vw,16px)', cursor: 'pointer', background: 'linear-gradient(90deg,#0f4c75,#1a6fa8)', color: '#fff', border: 'none' }}>↩ Continue with Swiss</button>
            <button onClick={() => { onExitRoundRobin('completed'); onSelectRRTeams(); }} style={{ padding: 'clamp(10px,2.5vw,14px)', borderRadius: 12, fontWeight: 800, fontSize: 'clamp(13px,3vw,16px)', cursor: 'pointer', background: 'linear-gradient(90deg,#6366f1,#8b5cf6)', color: '#fff', border: 'none' }}>🔁 Start a new Round Robin</button>
            <button onClick={onFinishTournament} style={{ padding: 'clamp(10px,2.5vw,14px)', borderRadius: 12, fontWeight: 800, fontSize: 'clamp(13px,3vw,16px)', cursor: 'pointer', background: 'linear-gradient(90deg,#d97706,#f59e0b)', color: '#fff', border: 'none' }}>🏁 Finish Tournament</button>
          </div>
        )}
        {isAdmin && !allDone && <button onClick={() => onExitRoundRobin()} style={{ padding: 'clamp(8px,2vw,12px)', borderRadius: 12, fontWeight: 700, fontSize: 'clamp(12px,3vw,15px)', cursor: 'pointer', background: 'rgba(0,0,0,0.05)', color: '#475569', border: '1px solid rgba(0,0,0,0.1)' }}>↩ Exit Round Robin (back to Swiss)</button>}
        {isAdmin && !allDone && <button onClick={onFinishTournament} style={{ padding: 'clamp(8px,2vw,12px)', borderRadius: 12, fontWeight: 700, fontSize: 'clamp(12px,3vw,15px)', cursor: 'pointer', background: 'linear-gradient(90deg,#d97706,#f59e0b)', color: '#fff', border: 'none' }}>🏁 Finish Tournament</button>}
        {isAdmin && <button onClick={onBreakStart} style={{ padding: 'clamp(8px,2vw,12px)', borderRadius: 12, fontWeight: 700, fontSize: 'clamp(12px,3vw,15px)', cursor: 'pointer', background: 'rgba(217,119,6,0.1)', color: '#92400e', border: '1px solid rgba(217,119,6,0.3)' }}>☕ Pause Tournament (Break)</button>}
        {isAdmin && <button onClick={onReset} style={{ cursor: 'pointer', background: 'none', border: 'none', color: '#94a3b8', fontSize: 12, textDecoration: 'underline' }}>↩ Reset tournament…</button>}
        {isAdmin && <button onClick={onManageCourts} style={{ cursor: 'pointer', background: 'none', border: 'none', color: '#6366f1', fontSize: 12, textDecoration: 'underline' }}>🏟️ Manage courts (rename)</button>}
      </div>
    );
  }

  /* ── No active round (between rounds) ── */
  if (!round) {
    return (
      <div className="flex flex-col gap-4">
        {breakBanner}
        {isAdmin ? (
          <div className="rounded-2xl flex flex-col" style={{ padding: 'clamp(12px,3vw,20px)', gap: 'clamp(8px,2vw,14px)', background: '#f8fafc', border: '1px solid rgba(0,0,0,0.08)' }}>
            <p className="font-bold text-center" style={{ color: '#0f4c75', fontSize: 'clamp(13px,3.5vw,18px)' }}>
              {roundNum === 0 ? '🏓 Ready to start' : `✓ Round ${roundNum} complete`}
            </p>
            <p style={{ color: '#475569', fontSize: 'clamp(11px,2.5vw,14px)', textAlign: 'center' }}>
              {roundNum === 0 ? 'Use ✏️ Manage teams to set team statuses, then generate Round 1.' : 'Use ✏️ Manage teams to adjust statuses, then generate the next round.'}
            </p>
            {roundNum > 0 && (
              <div className="flex items-center justify-between gap-3 rounded-xl" style={{ padding: 'clamp(10px,2.5vw,16px)', background: finalRound ? 'rgba(251,191,36,0.1)' : 'rgba(0,0,0,0.03)', border: `1px solid ${finalRound ? 'rgba(251,191,36,0.4)' : 'rgba(0,0,0,0.07)'}` }}>
                <div>
                  <div style={{ fontSize: 'clamp(12px,3vw,16px)', fontWeight: 700, color: finalRound ? '#92400e' : '#475569' }}>🏁 Final Round Mode</div>
                  <div style={{ fontSize: 'clamp(10px,2.5vw,13px)', color: '#94a3b8', marginTop: 2 }}>Schedules fewer games to equalize games played</div>
                </div>
                <button onClick={() => setFinalRound(f => !f)} style={{ fontSize: 'clamp(11px,2.5vw,14px)', padding: 'clamp(6px,1.5vw,10px) clamp(10px,2.5vw,16px)', borderRadius: 10, fontWeight: 700, cursor: 'pointer', flexShrink: 0, background: finalRound ? 'rgba(251,191,36,0.25)' : 'rgba(0,0,0,0.06)', color: finalRound ? '#92400e' : '#64748b', border: `1px solid ${finalRound ? 'rgba(251,191,36,0.5)' : 'rgba(0,0,0,0.1)'}` }}>
                  {finalRound ? '✓ On' : 'Off'}
                </button>
              </div>
            )}
            <button onClick={onGenerateRound} style={{ width: '100%', padding: 'clamp(10px,2.5vw,16px)', borderRadius: 12, fontWeight: 800, fontSize: 'clamp(14px,3.5vw,18px)', cursor: 'pointer', background: finalRound ? 'linear-gradient(90deg,#d97706,#f59e0b)' : 'linear-gradient(90deg,#0f4c75,#1a6fa8)', color: '#fff', border: 'none' }}>
              {roundNum === 0 ? 'Generate Round 1 →' : finalRound ? '🏁 Generate Final Round →' : `Generate Round ${roundNum + 1} →`}
            </button>
            <button onClick={onSelectRRTeams} style={{ width: '100%', padding: 'clamp(8px,2vw,12px)', borderRadius: 12, fontWeight: 700, fontSize: 'clamp(12px,3vw,15px)', cursor: 'pointer', background: 'linear-gradient(90deg,#6366f1,#8b5cf6)', color: '#fff', border: 'none' }}>🔁 Start Round Robin →</button>
            <button onClick={onPresetMatch} style={{ width: '100%', padding: 'clamp(8px,2vw,12px)', borderRadius: 12, fontWeight: 700, fontSize: 'clamp(12px,3vw,15px)', cursor: 'pointer', background: 'rgba(99,102,241,0.1)', color: '#4338ca', border: '1px solid rgba(99,102,241,0.3)' }}>
              📌 Pre-set Game for Round {roundNum === 0 ? 1 : roundNum + 1}
            </button>
            {nextRoundPresets.length > 0 && (
              <div className="rounded-xl" style={{ padding: 'clamp(8px,2vw,12px)', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)' }}>
                <p style={{ fontSize: 'clamp(9px,2vw,11px)', color: '#4338ca', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Pre-set matchups ({nextRoundPresets.length})</p>
                <div className="flex flex-col gap-1">
                  {nextRoundPresets.map((p, pi) => {
                    const t1 = teamById(p.teamId1), t2 = teamById(p.teamId2);
                    return (
                      <div key={pi} className="flex items-center" style={{ gap: 'clamp(4px,1vw,8px)', fontSize: 'clamp(11px,2.5vw,13px)' }}>
                        <span style={{ color: '#94a3b8', minWidth: 50 }}>Court {p.courtNumber}</span>
                        <span style={{ color: t1?.color, fontWeight: 700 }}>{t1?.name}</span>
                        <span style={{ color: '#cbd5e1' }}>vs</span>
                        <span style={{ color: t2?.color, fontWeight: 700 }}>{t2?.name}</span>
                        <button onClick={() => onRemovePreset(pi)} style={{ marginLeft: 'auto', fontSize: 11, padding: '2px 8px', borderRadius: 6, background: 'rgba(220,38,38,0.1)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.2)', cursor: 'pointer' }}>×</button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <button onClick={onBreakStart} style={{ width: '100%', padding: 'clamp(8px,2vw,12px)', borderRadius: 12, fontWeight: 700, fontSize: 'clamp(12px,3vw,15px)', cursor: 'pointer', background: 'rgba(217,119,6,0.1)', color: '#92400e', border: '1px solid rgba(217,119,6,0.3)' }}>☕ Pause Tournament (Break)</button>
            <button onClick={onFinishTournament} style={{ width: '100%', padding: 'clamp(8px,2vw,12px)', borderRadius: 12, fontWeight: 700, fontSize: 'clamp(12px,3vw,15px)', cursor: 'pointer', background: 'linear-gradient(90deg,#d97706,#f59e0b)', color: '#fff', border: 'none' }}>🏁 Finish Tournament</button>
            <div className="flex flex-wrap" style={{ gap: 'clamp(4px,1vw,8px)', borderTop: '1px solid rgba(0,0,0,0.07)', paddingTop: 'clamp(8px,2vw,12px)' }}>
              <button onClick={onReset} style={{ cursor: 'pointer', background: 'none', border: 'none', color: '#94a3b8', fontSize: 12, textDecoration: 'underline' }}>↩ Reset tournament…</button>
              <button onClick={onManageTeams} style={{ cursor: 'pointer', background: 'none', border: 'none', color: '#6366f1', fontSize: 12, textDecoration: 'underline' }}>✏️ Manage teams</button>
              <button onClick={onManageCourts} style={{ cursor: 'pointer', background: 'none', border: 'none', color: '#6366f1', fontSize: 12, textDecoration: 'underline' }}>🏟️ Manage courts</button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl p-10 text-center flex flex-col items-center gap-3" style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.08)' }}>
            <div style={{ fontSize: 'clamp(28px,7vw,44px)' }}>{roundNum === 0 ? '🏓' : '⏳'}</div>
            <p className="font-bold" style={{ color: '#0f4c75', fontSize: 'clamp(14px,3.5vw,20px)', margin: 0 }}>
              {roundNum === 0 ? 'Waiting for Round 1…' : 'Waiting for next round…'}
            </p>
            <p className="text-slate-500" style={{ fontSize: 'clamp(11px,2.5vw,14px)', margin: 0 }}>
              {roundNum === 0 ? 'The organizer will start the tournament shortly.' : 'The organizer is setting up the next round.'}
            </p>
          </div>
        )}
      </div>
    );
  }

  /* ── Active Swiss round ── */
  return (
    <div className="flex flex-col gap-4">
      {breakBanner}
      {socialSection}
      <div style={{ textAlign: 'center' }}>
        <span className="text-blue-900 font-black" style={{ fontSize: 'clamp(22px,6vw,32px)' }}>Round {roundNum}</span>
      </div>

      {isAdmin ? (
        <>
          {round.courts.map((teams, idx) => (
            <CourtCard key={`${roundKey}-court-${idx}`} courtLabel={`Court ${round.courtNums?.[idx] ?? courtNumbers[idx] ?? idx + 1}`}
              teams={teams} onResult={r => onResult(idx, r)} pendingResult={pending[courtKey(idx)]}
              onEdit={() => onEditActiveCourt(idx)}
              onRemove={() => onRemoveActiveCourt(idx)}
              onUndo={() => onUndoResult(idx)} />
          ))}
          {liveAdditions.map((la, i) => {
            const tA = teamById(la.teamId1), tB = teamById(la.teamId2);
            if (!tA || !tB) return null;
            return <CourtCard key={`live-${i}`} courtLabel={`Court ${la.courtNumber}`}
              teams={[tA, tB]} onResult={r => onLiveResult(i, r)} pendingResult={pending[liveKey(i)]}
              onEdit={() => onEditLive(i)}
              onUndo={() => onUndoLiveResult(i)} />;
          })}
          {(round.paused?.length > 0 || round.bye?.length > 0) && (
            <div className="flex items-center flex-wrap" style={{ gap: 'clamp(6px,1.5vw,10px)' }}>
              {round.paused?.length > 0 && (
                <>
                  <span style={{ color: '#64748b', fontSize: 'clamp(10px,2.5vw,13px)', fontWeight: 700, flexShrink: 0 }}>Paused:</span>
                  {round.paused.map(t => <TeamChip key={t.id} teamId={t.id} />)}
                </>
              )}
              {round.bye?.length > 0 && (
                <>
                  <span style={{ color: '#64748b', fontSize: 'clamp(10px,2.5vw,13px)', fontWeight: 700, flexShrink: 0, marginLeft: round.paused?.length > 0 ? 'clamp(6px,1.5vw,10px)' : 0 }}>Bye:</span>
                  {round.bye.map(t => <TeamChip key={t.id} teamId={t.id} />)}
                </>
              )}
            </div>
          )}
          <div className="rounded-2xl flex flex-col" style={{ padding: 'clamp(12px,3vw,18px)', gap: 'clamp(12px,3vw,16px)', background: '#f8fafc', border: '1px solid rgba(0,0,0,0.08)' }}>
            <p style={{ fontSize: 'clamp(9px,2vw,11px)', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Admin Options</p>

            {/* 3-column action grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'clamp(6px,1.5vw,8px)' }}>
              {[
                { label: '🔀', sub: 'Regenerate',  onClick: onRegenerateRound, bg: 'rgba(15,76,117,0.08)',   color: '#0f4c75', border: 'rgba(15,76,117,0.2)' },
                { label: '➕', sub: 'Add Game',    onClick: onLiveAddGame,     bg: 'rgba(99,102,241,0.08)',  color: '#4338ca', border: 'rgba(99,102,241,0.25)' },
                { label: '☕', sub: 'Break',        onClick: onBreakStart,      bg: 'rgba(217,119,6,0.08)',   color: '#92400e', border: 'rgba(217,119,6,0.25)' },
                { label: '✏️', sub: 'Teams',        onClick: onManageTeams,     bg: 'rgba(99,102,241,0.08)',  color: '#4338ca', border: 'rgba(99,102,241,0.25)' },
                { label: '🏟️', sub: 'Courts',       onClick: onManageCourts,    bg: 'rgba(99,102,241,0.08)',  color: '#4338ca', border: 'rgba(99,102,241,0.25)' },
                { label: '✕',  sub: 'Cancel Round', onClick: onCancelRound,     bg: 'rgba(220,38,38,0.07)',   color: '#dc2626', border: 'rgba(220,38,38,0.2)' },
              ].map(({ label, sub, onClick, bg, color, border }) => (
                <button key={sub} onClick={onClick} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: 'clamp(8px,2vw,12px) 4px', borderRadius: 12, fontWeight: 700, cursor: 'pointer', background: bg, color, border: `1px solid ${border}` }}>
                  <span style={{ fontSize: 'clamp(18px,4.5vw,26px)', lineHeight: 1 }}>{label}</span>
                  <span style={{ fontSize: 'clamp(10px,2.5vw,12px)' }}>{sub}</span>
                </button>
              ))}
            </div>

            {Object.keys(pending).length > 0 && (
              <p style={{ fontSize: 'clamp(10px,2.5vw,12px)', color: '#94a3b8', margin: 0 }}>Regenerate requires PIN — scores already entered.</p>
            )}

            {/* Final Round toggle row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: 'clamp(8px,2vw,10px) clamp(10px,2.5vw,14px)', borderRadius: 10, background: finalRound ? 'rgba(251,191,36,0.08)' : 'rgba(0,0,0,0.03)', border: `1px solid ${finalRound ? 'rgba(251,191,36,0.35)' : 'rgba(0,0,0,0.07)'}` }}>
              <div>
                <div style={{ fontSize: 'clamp(12px,3vw,14px)', fontWeight: 700, color: finalRound ? '#92400e' : '#475569' }}>🏁 Final Round</div>
                <div style={{ fontSize: 'clamp(9px,2vw,11px)', color: '#94a3b8', marginTop: 2 }}>Applies to the next round generated</div>
              </div>
              <button onClick={() => setFinalRound(f => !f)} style={{ flexShrink: 0, padding: 'clamp(4px,1vw,6px) clamp(12px,3vw,18px)', borderRadius: 8, fontWeight: 700, fontSize: 'clamp(11px,2.5vw,13px)', cursor: 'pointer', background: finalRound ? 'rgba(251,191,36,0.25)' : 'rgba(0,0,0,0.06)', color: finalRound ? '#92400e' : '#64748b', border: `1px solid ${finalRound ? 'rgba(251,191,36,0.5)' : 'rgba(0,0,0,0.1)'}` }}>
                {finalRound ? 'On' : 'Off'}
              </button>
            </div>

            {activeRoundExtras.length > 0 && (
              <div className="rounded-xl" style={{ padding: 'clamp(8px,2vw,12px)', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)' }}>
                <p style={{ fontSize: 'clamp(9px,2vw,11px)', color: '#4338ca', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Manually added ({activeRoundExtras.length})</p>
                <div className="flex flex-col gap-1">
                  {activeRoundExtras.map((g, gi) => {
                    const w = teamById(g.winnerId), l = teamById(g.loserId);
                    return (
                      <div key={gi} className="flex items-center" style={{ gap: 'clamp(4px,1vw,8px)', fontSize: 'clamp(11px,2.5vw,13px)' }}>
                        <span style={{ color: '#94a3b8', minWidth: 50 }}>Court {g.courtNumber}</span>
                        <span style={{ color: w?.color, fontWeight: 700 }}>{w?.name}</span>
                        <span style={{ color: w?.color, fontWeight: 800 }}>{g.winnerScore}</span>
                        <span style={{ color: '#cbd5e1' }}>–</span>
                        <span style={{ color: l?.color, fontWeight: 800 }}>{g.loserScore}</span>
                        <span style={{ color: l?.color, fontWeight: 700 }}>{l?.name}</span>
                        <button onClick={() => onRemoveExtra(gi)} style={{ marginLeft: 'auto', fontSize: 11, padding: '2px 8px', borderRadius: 6, background: 'rgba(220,38,38,0.1)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.2)', cursor: 'pointer' }}>×</button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Finish Tournament */}
            <button onClick={onFinishTournament} style={{ width: '100%', padding: 'clamp(10px,2.5vw,13px)', borderRadius: 12, fontWeight: 800, fontSize: 'clamp(13px,3vw,15px)', cursor: 'pointer', background: 'linear-gradient(90deg,#d97706,#f59e0b)', color: '#fff', border: 'none' }}>🏁 Finish Tournament</button>

            <button onClick={onReset} style={{ cursor: 'pointer', background: 'none', border: 'none', color: '#94a3b8', fontSize: 'clamp(10px,2.5vw,12px)', fontWeight: 600, padding: 0, textDecoration: 'underline' }}>↩ Reset tournament…</button>
          </div>
        </>
      ) : (
        /* Viewer branch */
        <div className="flex flex-col" style={{ gap: 'clamp(10px,2.5vw,16px)' }}>
          {round.courts.map((teams, idx) => (
            <div key={idx} className="rounded-2xl" style={{ padding: 'clamp(12px,3vw,20px)', background: '#fff', border: '1px solid rgba(0,0,0,0.1)', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <p style={{ fontSize: 'clamp(10px,2.5vw,13px)', color: '#0f4c75', fontWeight: 800, marginBottom: 'clamp(8px,2vw,14px)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Court {round.courtNums?.[idx] ?? courtNumbers[idx] ?? idx + 1}</p>
              <div className="flex items-stretch" style={{ gap: 'clamp(8px,2vw,14px)' }}>
                <div className="flex-1 flex items-center justify-center rounded-2xl" style={{ padding: 'clamp(14px,3.5vw,24px) clamp(10px,2.5vw,16px)', background: teams[0].color, border: `2px solid ${teams[0].color}` }}>
                  <span className="font-black text-center leading-tight" style={{ fontSize: 'clamp(18px,5vw,36px)', color: teams[0].text }}>{teams[0].name}</span>
                </div>
                <div className="flex items-center justify-center flex-shrink-0">
                  <span style={{ color: '#cbd5e1', fontWeight: 900, fontSize: 'clamp(14px,3.5vw,22px)' }}>VS</span>
                </div>
                <div className="flex-1 flex items-center justify-center rounded-2xl" style={{ padding: 'clamp(14px,3.5vw,24px) clamp(10px,2.5vw,16px)', background: teams[1].color, border: `2px solid ${teams[1].color}` }}>
                  <span className="font-black text-center leading-tight" style={{ fontSize: 'clamp(18px,5vw,36px)', color: teams[1].text }}>{teams[1].name}</span>
                </div>
              </div>
            </div>
          ))}
          {liveAdditions.map((la, i) => {
            const tA = teamById(la.teamId1), tB = teamById(la.teamId2);
            if (!tA || !tB) return null;
            return (
              <div key={`live-${i}`} className="rounded-2xl" style={{ padding: 'clamp(12px,3vw,20px)', background: '#fff', border: '1px solid rgba(0,0,0,0.1)', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                <p style={{ fontSize: 'clamp(10px,2.5vw,13px)', color: '#0f4c75', fontWeight: 800, marginBottom: 'clamp(8px,2vw,14px)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Court {la.courtNumber}</p>
                <div className="flex items-stretch" style={{ gap: 'clamp(8px,2vw,14px)' }}>
                  <div className="flex-1 flex items-center justify-center rounded-2xl" style={{ padding: 'clamp(14px,3.5vw,24px) clamp(10px,2.5vw,16px)', background: tA.color, border: `2px solid ${tA.color}` }}>
                    <span className="font-black text-center leading-tight" style={{ fontSize: 'clamp(18px,5vw,36px)', color: tA.text }}>{tA.name}</span>
                  </div>
                  <div className="flex items-center justify-center flex-shrink-0">
                    <span style={{ color: '#cbd5e1', fontWeight: 900, fontSize: 'clamp(14px,3.5vw,22px)' }}>VS</span>
                  </div>
                  <div className="flex-1 flex items-center justify-center rounded-2xl" style={{ padding: 'clamp(14px,3.5vw,24px) clamp(10px,2.5vw,16px)', background: tB.color, border: `2px solid ${tB.color}` }}>
                    <span className="font-black text-center leading-tight" style={{ fontSize: 'clamp(18px,5vw,36px)', color: tB.text }}>{tB.name}</span>
                  </div>
                </div>
              </div>
            );
          })}
          {(round.paused?.length > 0 || round.bye?.length > 0) && (
            <div className="flex items-center flex-wrap" style={{ gap: 'clamp(6px,1.5vw,10px)' }}>
              {round.paused?.length > 0 && (
                <>
                  <span style={{ color: '#64748b', fontSize: 'clamp(10px,2.5vw,13px)', fontWeight: 700, flexShrink: 0 }}>Paused:</span>
                  {round.paused.map(t => <TeamChip key={t.id} teamId={t.id} />)}
                </>
              )}
              {round.bye?.length > 0 && (
                <>
                  <span style={{ color: '#64748b', fontSize: 'clamp(10px,2.5vw,13px)', fontWeight: 700, flexShrink: 0, marginLeft: round.paused?.length > 0 ? 'clamp(6px,1.5vw,10px)' : 0 }}>Bye:</span>
                  {round.bye.map(t => <TeamChip key={t.id} teamId={t.id} />)}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
