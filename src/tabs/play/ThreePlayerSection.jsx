import { hasPermission } from '../../roleConfig';
import CourtCard from '../../components/CourtCard';
import RoundTimer from '../../components/RoundTimer';
import BreakBanner from './BreakBanner';
import { getTPTGamesForMatchup } from '../../algorithms/threePlayerTeam';

function sideLabel(playerIds, players) {
  return playerIds.map(pid => players[pid]?.name ?? '?').join(' & ');
}

function GameLabel({ type, idx }) {
  if (type === 'males_doubles') return <span style={{ fontSize: 'clamp(9px,2vw,11px)', fontWeight: 700, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Males doubles</span>;
  return <span style={{ fontSize: 'clamp(9px,2vw,11px)', fontWeight: 700, color: '#be185d', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Mixed doubles {idx === 1 ? '①' : '②'}</span>;
}

export default function ThreePlayerSection({
  tptTeams, tptPlayers, tptSchedule, tptResults, courtNumbers, history,
  role, isAdmin,
  timerDuration, timerSecsLeft, timerRunning, breakMode,
  onTPTResult, onFinishTournament, onBreakStart, onBreakEnd,
  onManageTeams, onManageCourts, onReset,
  onTimerToggle, onTimerRestart, onTimerSettings,
}) {
  const canWrite = hasPermission(role, 'canSubmitResults');
  const currentRoundIdx = history.length;
  const totalRounds = tptSchedule.length;
  const allDone = totalRounds > 0 && currentRoundIdx >= totalRounds;

  const gamesComplete = (() => {
    if (allDone) return totalRounds * (tptSchedule[0]?.matchups?.length ?? 0) * 3;
    let n = 0;
    for (let ri = 0; ri <= currentRoundIdx && ri < totalRounds; ri++) {
      const round = tptSchedule[ri];
      if (!round) continue;
      round.matchups.forEach((_, mi) => {
        for (let gi = 0; gi < 3; gi++) {
          if (tptResults[`${ri}_${mi}_${gi}`]) n++;
        }
      });
    }
    return n;
  })();

  const totalGames = tptSchedule.reduce((acc, r) => acc + (r.matchups?.length ?? 0) * 3, 0);

  const renderMatchupCard = (matchup, mi, ri, isCurrentRound) => {
    const teamA = tptTeams[matchup.teamAId];
    const teamB = tptTeams[matchup.teamBId];
    if (!teamA || !teamB) return null;
    const games = getTPTGamesForMatchup(teamA, teamB);
    const courtLabel = courtNumbers[mi] ?? String(mi + 1);

    return (
      <div key={mi} className="flex flex-col" style={{ gap: 'clamp(6px,1.5vw,10px)', padding: 'clamp(10px,2.5vw,14px)', borderRadius: 14, background: isCurrentRound ? '#fff' : 'rgba(0,0,0,0.02)', border: `1px solid ${isCurrentRound ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.07)'}`, boxShadow: isCurrentRound ? '0 2px 8px rgba(0,0,0,0.06)' : 'none' }}>
        <div className="flex items-center gap-2">
          <span style={{ fontWeight: 800, color: '#0f4c75', fontSize: 'clamp(11px,2.5vw,14px)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Court {courtLabel}
          </span>
          <span style={{ color: '#94a3b8', fontSize: 'clamp(10px,2.5vw,12px)', fontWeight: 600 }}>·</span>
          <span style={{ fontWeight: 700, fontSize: 'clamp(11px,2.5vw,13px)', color: '#475569' }}>
            <span style={{ color: teamA.color, fontWeight: 800 }}>{teamA.name}</span>
            <span style={{ color: '#94a3b8', margin: '0 4px' }}>vs</span>
            <span style={{ color: teamB.color, fontWeight: 800 }}>{teamB.name}</span>
          </span>
        </div>

        {games.map((game, gi) => {
          const key = `${ri}_${mi}_${gi}`;
          const stored = tptResults[key];
          const pendingResult = stored
            ? { winnerId: stored.winnerTeamId, loserId: stored.loserTeamId, winnerScore: stored.winnerScore, loserScore: stored.loserScore }
            : null;
          const sideA = { id: teamA.id, name: sideLabel(game.sideA, tptPlayers), color: teamA.color, text: teamA.text };
          const sideB = { id: teamB.id, name: sideLabel(game.sideB, tptPlayers), color: teamB.color, text: teamB.text };

          return (
            <div key={gi}>
              <div className="mb-1 px-1">
                <GameLabel type={game.type} idx={gi} />
              </div>
              {isCurrentRound && canWrite ? (
                <CourtCard
                  courtLabel={game.label}
                  teams={[sideA, sideB]}
                  pendingResult={pendingResult}
                  onResult={r => onTPTResult(ri, mi, gi, { winnerTeamId: r.winnerId, loserTeamId: r.loserId, winnerScore: r.winnerScore, loserScore: r.loserScore })}
                />
              ) : (
                <CompletedGameRow sideA={sideA} sideB={sideB} result={pendingResult} />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col" style={{ gap: 'clamp(10px,2.5vw,16px)' }}>
      <BreakBanner breakMode={breakMode} onBreakEnd={onBreakEnd} role={role} />

      {(timerDuration > 0 || breakMode) && (
        <RoundTimer secsLeft={timerSecsLeft} totalSecs={timerDuration} timerRunning={timerRunning}
          canToggleTimer={hasPermission(role, 'canEditTimer') || hasPermission(role, 'canTogglePause')}
          canControlTimer={hasPermission(role, 'canEditTimer')}
          canEndBreak={hasPermission(role, 'canBreakTournament')}
          onToggle={onTimerToggle} onRestart={onTimerRestart} onOpenSettings={onTimerSettings}
          breakInfo={breakMode} onEndBreak={onBreakEnd} />
      )}

      <div className="rounded-2xl flex flex-col" style={{ padding: 'clamp(10px,2.5vw,16px)', gap: 'clamp(4px,1vw,8px)', background: 'rgba(15,76,117,0.05)', border: '1px solid rgba(15,76,117,0.18)' }}>
        <p className="font-bold" style={{ color: '#0f4c75', fontSize: 'clamp(13px,3.5vw,17px)' }}>
          3-Player Team Tournament
        </p>
        <p style={{ color: '#64748b', fontSize: 'clamp(10px,2.5vw,13px)' }}>
          {allDone
            ? `All ${totalRounds} rounds complete · ${gamesComplete} games played`
            : `Round ${currentRoundIdx + 1} of ${totalRounds} · ${gamesComplete}/${totalGames} games complete`}
        </p>
      </div>

      {/* Current round */}
      {!allDone && tptSchedule[currentRoundIdx] && (
        <div className="flex flex-col" style={{ gap: 'clamp(8px,2vw,12px)' }}>
          <span style={{ color: '#0f4c75', fontWeight: 800, fontSize: 'clamp(12px,3vw,15px)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Round {currentRoundIdx + 1}
          </span>
          {tptSchedule[currentRoundIdx].matchups.map((matchup, mi) =>
            renderMatchupCard(matchup, mi, currentRoundIdx, true)
          )}
          {tptSchedule[currentRoundIdx].byeTeamId && tptTeams[tptSchedule[currentRoundIdx].byeTeamId] && (
            <div className="rounded-xl px-4 py-2" style={{ background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.08)', fontSize: 'clamp(11px,2.5vw,13px)', color: '#64748b', fontWeight: 600 }}>
              Bye: <span style={{ color: tptTeams[tptSchedule[currentRoundIdx].byeTeamId].color, fontWeight: 800 }}>{tptTeams[tptSchedule[currentRoundIdx].byeTeamId].name}</span>
            </div>
          )}
        </div>
      )}

      {/* All done */}
      {allDone && isAdmin && (
        <div className="rounded-2xl flex flex-col" style={{ padding: 'clamp(12px,3vw,18px)', gap: 'clamp(8px,2vw,12px)', background: 'linear-gradient(135deg,#fef3c7,#fde68a)', border: '1px solid rgba(217,119,6,0.3)' }}>
          <p className="font-black text-center" style={{ color: '#92400e', fontSize: 'clamp(15px,3.5vw,20px)', margin: 0 }}>All rounds complete!</p>
          <button onClick={onFinishTournament} style={{ padding: 'clamp(10px,2.5vw,14px)', borderRadius: 12, fontWeight: 800, fontSize: 'clamp(13px,3vw,16px)', cursor: 'pointer', background: 'linear-gradient(90deg,#d97706,#f59e0b)', color: '#fff', border: 'none' }}>
            🏁 Finish Tournament
          </button>
        </div>
      )}
      {allDone && !isAdmin && (
        <div className="rounded-2xl p-8 text-center" style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: 'clamp(28px,7vw,44px)', marginBottom: 8 }}>🏆</div>
          <p className="font-bold" style={{ color: '#0f4c75', fontSize: 'clamp(14px,3.5vw,20px)' }}>All rounds complete!</p>
        </div>
      )}

      {/* Past rounds */}
      {history.length > 0 && (
        <div className="flex flex-col" style={{ gap: 'clamp(8px,2vw,12px)' }}>
          {[...history].reverse().map((h, idx) => {
            if (!h.tptMatchups) return null;
            const ri = history.length - 1 - idx;
            return (
              <div key={ri} className="flex flex-col" style={{ gap: 'clamp(6px,1.5vw,8px)', padding: 'clamp(10px,2.5vw,14px)', borderRadius: 14, background: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.2)' }}>
                <div className="flex items-center justify-between">
                  <span style={{ color: '#16a34a', fontWeight: 800, fontSize: 'clamp(12px,3vw,15px)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    ✓ Round {h.roundNum} · Complete
                  </span>
                </div>
                {h.tptMatchups.map((matchup, mi) =>
                  renderMatchupCard(matchup, mi, ri, false)
                )}
              </div>
            );
          })}
        </div>
      )}

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
        <button onClick={onManageTeams} style={{ padding: 'clamp(8px,2vw,12px)', borderRadius: 12, fontWeight: 700, fontSize: 'clamp(12px,3vw,15px)', cursor: 'pointer', background: 'rgba(99,102,241,0.08)', color: '#4338ca', border: '1px solid rgba(99,102,241,0.25)' }}>
          ✏️ Manage Teams &amp; Players
        </button>
      )}
      {isAdmin && (
        <button onClick={onManageCourts} style={{ cursor: 'pointer', background: 'none', border: 'none', color: '#6366f1', fontSize: 12, textDecoration: 'underline' }}>
          🏟️ Manage courts (rename)
        </button>
      )}
      {isAdmin && (
        <button onClick={onReset} style={{ cursor: 'pointer', background: 'none', border: 'none', color: '#94a3b8', fontSize: 12, textDecoration: 'underline' }}>
          ↩ Reset tournament…
        </button>
      )}
    </div>
  );
}

function CompletedGameRow({ sideA, sideB, result }) {
  if (!result) {
    return (
      <div className="rounded-xl flex items-center" style={{ padding: 'clamp(8px,2vw,12px)', gap: 'clamp(6px,1.5vw,10px)', background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.07)' }}>
        <span className="inline-flex items-center rounded-full font-bold" style={{ background: sideA.color, color: sideA.text, padding: '3px 10px', fontSize: 'clamp(11px,2.8vw,14px)' }}>{sideA.name}</span>
        <span style={{ color: '#cbd5e1', fontWeight: 700 }}>vs</span>
        <span className="inline-flex items-center rounded-full font-bold" style={{ background: sideB.color, color: sideB.text, padding: '3px 10px', fontSize: 'clamp(11px,2.8vw,14px)' }}>{sideB.name}</span>
      </div>
    );
  }
  const winner = result.winnerId === sideA.id ? sideA : sideB;
  const loser  = result.winnerId === sideA.id ? sideB : sideA;
  return (
    <div className="rounded-xl flex items-center flex-wrap" style={{ padding: 'clamp(8px,2vw,12px)', gap: 'clamp(6px,1.5vw,10px)', background: '#f0fdf4', border: '1px solid rgba(34,197,94,0.25)' }}>
      <span style={{ color: '#16a34a', fontSize: 'clamp(14px,3.5vw,18px)', flexShrink: 0 }}>✓</span>
      <span className="inline-flex items-center rounded-full font-bold" style={{ background: winner.color, color: winner.text, padding: '3px 10px', fontSize: 'clamp(11px,2.8vw,14px)', whiteSpace: 'nowrap' }}>{winner.name}</span>
      <span style={{ fontWeight: 900, color: '#1e293b', fontSize: 'clamp(13px,3vw,16px)' }}>{result.winnerScore}</span>
      <span style={{ color: '#94a3b8' }}>–</span>
      <span style={{ fontWeight: 900, color: '#1e293b', fontSize: 'clamp(13px,3vw,16px)' }}>{result.loserScore}</span>
      <span className="inline-flex items-center rounded-full font-bold" style={{ background: loser.color, color: loser.text, padding: '3px 10px', fontSize: 'clamp(11px,2.8vw,14px)', whiteSpace: 'nowrap' }}>{loser.name}</span>
    </div>
  );
}
