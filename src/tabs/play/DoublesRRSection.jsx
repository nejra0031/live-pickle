import { useContext } from 'react';
import { hasPermission } from '../../roleConfig';
import CourtCard from '../../components/CourtCard';
import MatchupVsBox from '../../components/MatchupVsBox';
import RoundTimer from '../../components/RoundTimer';
import BreakBanner from './BreakBanner';
import TournamentCompleteBlock from './TournamentCompleteBlock';
import { scheduleProgress } from './scheduleProgress';
import { buildSidePresentation } from '../../algorithms/doublesRR';
import { TeamRegistryContext } from '../../context/TeamRegistryContext';

export default function DoublesRRSection({
  doublesRRPlayers, doublesRRSchedule, doublesRRResults, courtNumbers, history,
  role, isAdmin,
  timerDuration, timerSecsLeft, timerRunning, breakMode,
  onDoublesRRResult, onUndoDoublesRRResult, onGenerateAdditionalGames, onFinishTournament, onBreakStart, onBreakEnd,
  onTournamentSettings,
  onTimerToggle, onTimerRestart, onTimerSettings,
}) {
  const { teamNameDisplay } = useContext(TeamRegistryContext);
  const canWrite = hasPermission(role, 'canSubmitResults');
  const { currentRoundIdx, totalRounds, allDone } = scheduleProgress(doublesRRSchedule, history);
  const viewedRound = doublesRRSchedule[currentRoundIdx];

  const gamesComplete = (() => {
    if (allDone) return doublesRRSchedule.reduce((acc, r) => acc + r.courts.length, 0);
    let n = 0;
    for (let ri = 0; ri <= currentRoundIdx && ri < totalRounds; ri++) {
      const round = doublesRRSchedule[ri];
      if (!round) continue;
      round.courts.forEach((_, ci) => { if (doublesRRResults[`${ri}_${ci}`]) n++; });
    }
    return n;
  })();

  const totalGames = doublesRRSchedule.reduce((acc, r) => acc + r.courts.length, 0);

  const renderCourtCard = (court, ci, ri, isCurrentRound) => {
    const courtLabel = courtNumbers[ci] ?? String(ci + 1);
    const key = `${ri}_${ci}`;
    const stored = doublesRRResults[key];
    const pendingResult = stored
      ? { winnerId: stored.winnerIds.join('|'), loserId: stored.loserIds.join('|'), winnerScore: stored.winnerScore, loserScore: stored.loserScore }
      : null;
    const sideA = buildSidePresentation(court.teamA, doublesRRPlayers, teamNameDisplay);
    const sideB = buildSidePresentation(court.teamB, doublesRRPlayers, teamNameDisplay);

    return (
      <div key={ci}>
        {pendingResult || (isCurrentRound && canWrite) ? (
          <CourtCard
            courtLabel={`Court ${courtLabel}`}
            teams={[sideA, sideB]}
            pendingResult={pendingResult}
            onResult={r => onDoublesRRResult(ri, ci, {
              winnerIds: r.winnerId.split('|'), loserIds: r.loserId.split('|'),
              winnerScore: r.winnerScore, loserScore: r.loserScore,
            })}
            onUndo={pendingResult && isCurrentRound && canWrite && onUndoDoublesRRResult ? () => onUndoDoublesRRResult(ri, ci) : undefined}
          />
        ) : (
          <MatchupVsBox courtLabel={`Court ${courtLabel}`} teamA={sideA} teamB={sideB} compact />
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col" style={{ gap: 'clamp(10px,2.5vw,16px)' }}>
      <BreakBanner breakMode={breakMode} onBreakEnd={onBreakEnd} role={role} />

      {timerDuration > 0 && !breakMode && (
        <RoundTimer secsLeft={timerSecsLeft} totalSecs={timerDuration} timerRunning={timerRunning}
          canToggleTimer={hasPermission(role, 'canEditTimer') || hasPermission(role, 'canToggleTimer')}
          canControlTimer={hasPermission(role, 'canEditTimer')}
          onToggle={onTimerToggle} onRestart={onTimerRestart} onOpenSettings={onTimerSettings} />
      )}

      <div className="rounded-2xl flex flex-col" style={{ padding: 'clamp(10px,2.5vw,16px)', gap: 'clamp(4px,1vw,8px)', background: 'rgba(15,76,117,0.05)', border: '1px solid rgba(15,76,117,0.18)' }}>
        <p className="font-bold" style={{ color: '#0f4c75', fontSize: 'clamp(13px,3.5vw,17px)' }}>
          Doubles Round Robin
        </p>
        <p style={{ color: '#64748b', fontSize: 'clamp(10px,2.5vw,13px)' }}>
          {allDone
            ? `All ${totalRounds} rounds complete · ${gamesComplete} games played`
            : `Round ${currentRoundIdx + 1} of ${totalRounds} · ${gamesComplete}/${totalGames} games complete`}
        </p>
      </div>

      {/* Active round only — no browsing other rounds here (see Matches tab) */}
      {viewedRound && (
        <div className="flex flex-col" style={{ gap: 'clamp(8px,2vw,12px)' }}>
          <span style={{ color: '#0f4c75', fontWeight: 800, fontSize: 'clamp(12px,3vw,15px)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Round {currentRoundIdx + 1}
          </span>
          {viewedRound.courts.map((court, ci) =>
            renderCourtCard(court, ci, currentRoundIdx, true)
          )}
          {viewedRound.byePlayerIds?.length > 0 && (() => {
            const byeSide = buildSidePresentation(viewedRound.byePlayerIds, doublesRRPlayers, teamNameDisplay);
            return (
              <div className="rounded-xl px-4 py-2 flex items-center gap-2" style={{ background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.08)', fontSize: 'clamp(11px,2.5vw,13px)', color: '#64748b', fontWeight: 600 }}>
                <span>Bye:</span>
                <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold"
                  style={{ background: byeSide.chipBackground ?? byeSide.color, color: byeSide.text, border: '2px solid rgba(255,255,255,0.15)' }}>
                  {byeSide.name}
                </span>
              </div>
            );
          })()}
        </div>
      )}

      {allDone && <TournamentCompleteBlock isAdmin={isAdmin} onFinish={onFinishTournament} />}

      {/* Admin controls */}
      {isAdmin && !allDone && (
        <button onClick={onFinishTournament} style={{ padding: 'clamp(8px,2vw,12px)', borderRadius: 12, fontWeight: 700, fontSize: 'clamp(12px,3vw,15px)', cursor: 'pointer', background: 'linear-gradient(90deg,#d97706,#f59e0b)', color: '#fff', border: 'none' }}>
          🏁 Finish Tournament
        </button>
      )}
      {isAdmin && (
        <button onClick={onBreakStart} style={{ padding: 'clamp(8px,2vw,12px)', borderRadius: 12, fontWeight: 700, fontSize: 'clamp(12px,3vw,15px)', cursor: 'pointer', background: 'rgba(217,119,6,0.1)', color: '#92400e', border: '1px solid rgba(217,119,6,0.3)' }}>
          ☕ Pause Tournament (Break)
        </button>
      )}
      {isAdmin && (
        <button onClick={onGenerateAdditionalGames} style={{ padding: 'clamp(8px,2vw,12px)', borderRadius: 12, fontWeight: 700, fontSize: 'clamp(12px,3vw,15px)', cursor: 'pointer', background: 'rgba(217,119,6,0.08)', color: '#92400e', border: '1px solid rgba(217,119,6,0.25)' }}>
          🔁 Generate Additional Games
        </button>
      )}
      {isAdmin && (
        <button onClick={onTournamentSettings} style={{ padding: 'clamp(8px,2vw,12px)', borderRadius: 12, fontWeight: 700, fontSize: 'clamp(12px,3vw,15px)', cursor: 'pointer', background: 'rgba(99,102,241,0.08)', color: '#4338ca', border: '1px solid rgba(99,102,241,0.25)' }}>
          ⚙️ Tournament Settings
        </button>
      )}
    </div>
  );
}
