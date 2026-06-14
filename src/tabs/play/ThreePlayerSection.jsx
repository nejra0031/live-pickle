import { useContext } from 'react';
import { hasPermission } from '../../roleConfig';
import CourtCard from '../../components/CourtCard';
import MatchupVsBox from '../../components/MatchupVsBox';
import RoundTimer from '../../components/RoundTimer';
import BreakBanner from './BreakBanner';
import TournamentCompleteBlock from './TournamentCompleteBlock';
import { scheduleProgress } from './scheduleProgress';
import { getTPTGamesForMatchup, formatTPTTeamLabel } from '../../algorithms/threePlayerTeam';
import { TeamRegistryContext } from '../../context/TeamRegistryContext';

function sideLabel(playerIds, players) {
  return playerIds.map(pid => { const p = players[pid]; return p ? (p.nickname || p.name) : '?'; }).join(' & ');
}


export default function ThreePlayerSection({
  tptTeams, tptPlayers, tptSchedule, tptResults, courtNumbers, history,
  role, isAdmin,
  timerDuration, timerSecsLeft, timerRunning, breakMode,
  onTPTResult, onUndoTPTResult, onFinishTournament, onBreakStart, onBreakEnd,
  onTournamentSettings,
  onTimerToggle, onTimerRestart, onTimerSettings,
}) {
  const { teamNameDisplay } = useContext(TeamRegistryContext);
  const tptTeamLabel = (team) => formatTPTTeamLabel(team, tptPlayers, teamNameDisplay);
  const canWrite = hasPermission(role, 'canSubmitResults');
  const { currentRoundIdx, totalRounds, allDone } = scheduleProgress(tptSchedule, history);
  const viewedRound = tptSchedule[currentRoundIdx];

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
            <span style={{ color: teamA.color, fontWeight: 800 }}>{tptTeamLabel(teamA)}</span>
            <span style={{ color: '#94a3b8', margin: '0 4px' }}>vs</span>
            <span style={{ color: teamB.color, fontWeight: 800 }}>{tptTeamLabel(teamB)}</span>
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
            <div key={key}>
              {pendingResult || (isCurrentRound && canWrite) ? (
                <CourtCard
                  courtLabel={game.label}
                  teams={[sideA, sideB]}
                  pendingResult={pendingResult}
                  onResult={r => onTPTResult(ri, mi, gi, { winnerTeamId: r.winnerId, loserTeamId: r.loserId, winnerScore: r.winnerScore, loserScore: r.loserScore })}
                  onUndo={pendingResult && isCurrentRound && canWrite && onUndoTPTResult ? () => onUndoTPTResult(ri, mi, gi) : undefined}
                />
              ) : (
                <MatchupVsBox courtLabel={game.label} teamA={sideA} teamB={sideB} compact />
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

      {timerDuration > 0 && !breakMode && (
        <RoundTimer secsLeft={timerSecsLeft} totalSecs={timerDuration} timerRunning={timerRunning}
          canToggleTimer={hasPermission(role, 'canEditTimer') || hasPermission(role, 'canToggleTimer')}
          canControlTimer={hasPermission(role, 'canEditTimer')}
          onToggle={onTimerToggle} onRestart={onTimerRestart} onOpenSettings={onTimerSettings} />
      )}

      {tptSchedule.length === 0 ? (
        <div className="rounded-2xl flex flex-col items-center text-center" style={{ padding: 'clamp(16px,4vw,24px)', gap: 8, background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.08)' }}>
          <p style={{ fontWeight: 800, color: '#0f4c75', margin: 0 }}>No schedule yet</p>
          <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>
            {isAdmin ? 'Add at least 2 teams in Tournament Settings to generate the tournament schedule.' : 'Waiting for the organizer to add teams.'}
          </p>
          {isAdmin && <button onClick={onTournamentSettings} style={{ padding: 'clamp(8px,2vw,12px)', borderRadius: 12, fontWeight: 700, fontSize: 'clamp(12px,3vw,15px)', cursor: 'pointer', background: 'rgba(99,102,241,0.08)', color: '#4338ca', border: '1px solid rgba(99,102,241,0.25)' }}>⚙️ Tournament Settings</button>}
        </div>
      ) : (
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
      )}

      {/* Active round only — no browsing other rounds here (see Matches tab) */}
      {viewedRound && (
        <div className="flex flex-col" style={{ gap: 'clamp(8px,2vw,12px)' }}>
          <span style={{ color: '#0f4c75', fontWeight: 800, fontSize: 'clamp(12px,3vw,15px)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Round {currentRoundIdx + 1}
          </span>
          {viewedRound.matchups.map((matchup, mi) =>
            renderMatchupCard(matchup, mi, currentRoundIdx, true)
          )}
          {viewedRound.byeTeamId && tptTeams[viewedRound.byeTeamId] && (
            <div className="rounded-xl px-4 py-2 flex items-center gap-2" style={{ background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.08)', fontSize: 'clamp(11px,2.5vw,13px)', color: '#64748b', fontWeight: 600 }}>
              <span>Bye:</span>
              <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold"
                style={{ background: tptTeams[viewedRound.byeTeamId].color, color: tptTeams[viewedRound.byeTeamId].text, border: '2px solid rgba(255,255,255,0.15)' }}>
                {tptTeamLabel(tptTeams[viewedRound.byeTeamId])}
              </span>
            </div>
          )}
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
        <button onClick={onTournamentSettings} style={{ padding: 'clamp(8px,2vw,12px)', borderRadius: 12, fontWeight: 700, fontSize: 'clamp(12px,3vw,15px)', cursor: 'pointer', background: 'rgba(99,102,241,0.08)', color: '#4338ca', border: '1px solid rgba(99,102,241,0.25)' }}>
          ⚙️ Tournament Settings
        </button>
      )}
    </div>
  );
}
