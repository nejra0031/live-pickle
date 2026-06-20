import { useTeamById, useTeamLabel } from '../../context/TeamRegistryContext';
import CourtCard from '../../components/CourtCard';
import TeamChip from '../../components/TeamChip';
import { chipStyle } from '../../utils/chipStyle';
import RoundTimer from '../../components/RoundTimer';
import { courtKey, liveKey } from '../../constants';
import { ROLE_MAP, hasPermission } from '../../roleConfig';
import SocialCourts from './SocialCourts';
import BreakBanner from './BreakBanner';

function ViewerCourtCard({ courtLabel, teams, winner, loser, pendingResult }: any) {
  const done = !!pendingResult && !!winner && !!loser;
  return (
    <div
      className="rounded-2xl flex flex-col"
      style={{
        padding: 'clamp(12px,3vw,20px)',
        gap: 'clamp(8px,2vw,14px)',
        background: done ? 'var(--ball-bg)' : 'var(--white)',
        borderTop: '1px solid var(--border)',
        borderRight: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
        borderLeft: `3px solid ${done ? 'var(--ball)' : 'var(--court)'}`,
        boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-display)',
          color: done ? 'var(--ball)' : 'var(--court)',
          fontWeight: 700,
          fontSize: 'clamp(12px,3vw,15px)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}
      >
        {done ? '✓ ' : ''}{courtLabel}
      </span>
      {teams.map((team: any) => {
        const isWinner = done && team.id === winner.id;
        const score = done ? (isWinner ? pendingResult.winnerScore : pendingResult.loserScore) : null;
        return (
          <div
            key={team.id}
            className="flex items-center rounded-xl overflow-hidden"
            style={{
              ...chipStyle(team, isWinner),
              display: 'flex',
              gap: 'clamp(8px,2vw,12px)',
              padding: 'clamp(8px,2vw,14px) clamp(10px,2.5vw,16px)',
              borderLeft: `8px solid ${team.chipBackground ?? team.color}`,
            }}
          >
            <span style={{ fontWeight: 800, fontSize: 'clamp(16px,4.5vw,26px)', flex: 1, color: isWinner ? team.text : 'var(--ink)', lineHeight: 1.1 }}>
              {team.name}
            </span>
            {done && (
              <>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: isWinner ? 800 : 700, fontSize: 'clamp(17px,4.5vw,24px)', color: isWinner ? team.text : 'var(--muted)', lineHeight: 1 }}>
                  {score}
                </span>
              </>
            )}
          </div>
        );
      }).reduce((acc: any[], chip: any, i: number) => i === 0
        ? [...acc, chip, <div key="vs" style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 'clamp(10px,2.5vw,12px)', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>vs</div>]
        : [...acc, chip], [])}
    </div>
  );
}

export default function ActiveRound({
  round,
  roundNum,
  courtNumbers,
  socialCourts,
  liveAdditions,
  pending,
  role,
  finalRound,
  setFinalRound,
  targetRounds,
  activeRoundExtras,
  roundKey,
  breakMode,
  timerSecsLeft,
  timerDuration,
  timerRunning,
  onTimerToggle,
  onTimerRestart,
  onTimerSettings,
  onResult,
  onLiveResult,
  onUndoResult,
  onUndoLiveResult,
  onEditActiveCourt,
  onRemoveActiveCourt,
  onEditLive,
  onRemoveLive: _onRemoveLive,
  onRegenerateRound,
  onCancelRound,
  onLiveAddGame,
  onBreakStart,
  onBreakEnd,
  onFinishTournament,
  onRemoveExtra,
  onTournamentSettings,
  isAdmin,
  isReferee,
}: any) {
  const teamById = useTeamById();
  const teamLabel = useTeamLabel();
  const labeled = (t: any) => (t ? { ...t, name: teamLabel(t.id) } : t);
  const canWrite = hasPermission(role, 'canSubmitResults');
  const nextRN = roundNum === 0 ? 1 : roundNum + 1;
  const isAutoFinal = targetRounds > 0 && nextRN === targetRounds && !finalRound;
  const showTimer = timerDuration > 0 && !breakMode;

  return (
    <div className="flex flex-col gap-4">
      <BreakBanner breakMode={breakMode} onBreakEnd={onBreakEnd} role={role} />
      <SocialCourts socialCourts={socialCourts} />
      <div style={{ textAlign: 'center', lineHeight: 1 }}>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(10px,2.5vw,13px)',
            fontWeight: 800,
            color: 'var(--muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.18em',
            marginBottom: 2,
          }}
        >
          Round
        </div>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(48px,13vw,80px)',
            fontWeight: 900,
            color: 'var(--court)',
            lineHeight: 1,
            letterSpacing: '-1px',
          }}
        >
          {roundNum}
        </div>
      </div>
      {showTimer && (
        <RoundTimer
          secsLeft={timerSecsLeft}
          totalSecs={timerDuration}
          timerRunning={timerRunning}
          canToggleTimer={
            hasPermission(role, 'canEditTimer') || hasPermission(role, 'canToggleTimer')
          }
          canControlTimer={hasPermission(role, 'canEditTimer')}
          onToggle={onTimerToggle}
          onRestart={onTimerRestart}
          onOpenSettings={onTimerSettings}
        />
      )}

      {canWrite ? (
        <>
          {round.courts.map((teams: any, idx: number) => (
            <CourtCard
              key={`${roundKey}-court-${idx}`}
              courtLabel={`Court ${round.courtNums?.[idx] ?? courtNumbers[idx] ?? idx + 1}`}
              teams={teams.map(labeled)}
              onResult={(r: any) => onResult(idx, r)}
              pendingResult={pending[courtKey(idx)]}
              onEdit={isAdmin ? () => onEditActiveCourt(idx) : undefined}
              onRemove={isAdmin ? () => onRemoveActiveCourt(idx) : undefined}
              onUndo={() => onUndoResult(idx)}
            />
          ))}
          {liveAdditions.map((la: any, i: number) => {
            const tA = teamById(la.teamId1), tB = teamById(la.teamId2);
            if (!tA || !tB) return null;
            return (
              <CourtCard
                key={`live-${i}`}
                courtLabel={`Court ${la.courtNumber}`}
                teams={[labeled(tA), labeled(tB)]}
                onResult={(r: any) => onLiveResult(i, r)}
                pendingResult={pending[liveKey(i)]}
                onEdit={isAdmin ? () => onEditLive(i) : undefined}
                onUndo={() => onUndoLiveResult(i)}
              />
            );
          })}
          {(round.paused?.length > 0 || round.bye?.length > 0) && (
            <div className="flex items-center flex-wrap" style={{ gap: 'clamp(6px,1.5vw,10px)' }}>
              {round.paused?.length > 0 && (
                <>
                  <span
                    style={{
                      color: 'var(--muted)',
                      fontSize: 'clamp(10px,2.5vw,13px)',
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    Paused:
                  </span>
                  {round.paused.map((t: any) => (
                    <TeamChip key={t.id} teamId={t.id} />
                  ))}
                </>
              )}
              {round.bye?.length > 0 && (
                <>
                  <span
                    style={{
                      color: 'var(--muted)',
                      fontSize: 'clamp(10px,2.5vw,13px)',
                      fontWeight: 700,
                      flexShrink: 0,
                      marginLeft: round.paused?.length > 0 ? 'clamp(6px,1.5vw,10px)' : 0,
                    }}
                  >
                    Bye:
                  </span>
                  {round.bye.map((t: any) => (
                    <TeamChip key={t.id} teamId={t.id} />
                  ))}
                </>
              )}
            </div>
          )}

          {isAdmin && (
            <div
              className="rounded-2xl flex flex-col"
              style={{
                padding: 'clamp(12px,3vw,18px)',
                gap: 'clamp(12px,3vw,16px)',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
              }}
            >
              <p
                style={{
                  fontSize: 'clamp(9px,2vw,11px)',
                  color: 'var(--muted)',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  margin: 0,
                }}
              >
                Admin Options
              </p>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: 'clamp(6px,1.5vw,8px)',
                }}
              >
                {[
                  {
                    label: '🔀',
                    sub: 'Regenerate',
                    onClick: onRegenerateRound,
                    bg: 'var(--court-faint)',
                    color: 'var(--court)',
                    border: 'var(--court-soft)',
                  },
                  {
                    label: '➕',
                    sub: 'Add Game',
                    onClick: onLiveAddGame,
                    bg: 'var(--court-faint)',
                    color: 'var(--court)',
                    border: 'var(--court-soft)',
                  },
                  {
                    label: '☕',
                    sub: 'Break',
                    onClick: onBreakStart,
                    bg: 'var(--court-faint)',
                    color: 'var(--court)',
                    border: 'var(--court-soft)',
                  },
                  {
                    label: '✕',
                    sub: 'Cancel Round',
                    onClick: onCancelRound,
                    bg: 'var(--red-faint)',
                    color: 'var(--red)',
                    border: 'var(--red-soft)',
                  },
                ].map(({ label, sub, onClick, bg, color, border }) => (
                  <button
                    key={sub}
                    onClick={onClick}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 3,
                      padding: 'clamp(8px,2vw,12px) 4px',
                      borderRadius: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      background: bg,
                      color,
                      border: `1px solid ${border}`,
                    }}
                  >
                    <span style={{ fontSize: 'clamp(18px,4.5vw,26px)', lineHeight: 1 }}>{label}</span>
                    <span style={{ fontSize: 'clamp(10px,2.5vw,12px)' }}>{sub}</span>
                  </button>
                ))}
              </div>

              {Object.keys(pending).length > 0 && (
                <p style={{ fontSize: 'clamp(10px,2.5vw,12px)', color: 'var(--muted)', margin: 0 }}>
                  Regenerate requires PIN — scores already entered.
                </p>
              )}

              {activeRoundExtras.length > 0 && (
                <div
                  className="rounded-xl"
                  style={{
                    padding: 'clamp(8px,2vw,12px)',
                    background: 'var(--court-faint)',
                    border: '1px solid var(--court-soft)',
                  }}
                >
                  <p
                    style={{
                      fontSize: 'clamp(9px,2vw,11px)',
                      color: 'var(--court)',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      marginBottom: 6,
                    }}
                  >
                    Manually added ({activeRoundExtras.length})
                  </p>
                  <div className="flex flex-col gap-1">
                    {activeRoundExtras.map((g: any, gi: number) => {
                      const w = teamById(g.winnerId), l = teamById(g.loserId);
                      return (
                        <div
                          key={gi}
                          className="flex items-center"
                          style={{ gap: 'clamp(4px,1vw,8px)', fontSize: 'clamp(11px,2.5vw,13px)' }}
                        >
                          <span style={{ color: 'var(--muted)', minWidth: 50 }}>
                            Court {g.courtNumber}
                          </span>
                          <span style={{ color: w?.color, fontWeight: 700 }}>
                            {w ? teamLabel(w.id) : ''}
                          </span>
                          <span style={{ fontFamily: 'var(--font-mono)', color: w?.color, fontWeight: 500 }}>
                            {g.winnerScore}
                          </span>
                          <span style={{ color: 'var(--muted)' }}>–</span>
                          <span style={{ fontFamily: 'var(--font-mono)', color: l?.color, fontWeight: 500 }}>
                            {g.loserScore}
                          </span>
                          <span style={{ color: l?.color, fontWeight: 700 }}>
                            {l ? teamLabel(l.id) : ''}
                          </span>
                          <button
                            onClick={() => onRemoveExtra(gi)}
                            style={{
                              marginLeft: 'auto',
                              fontSize: 11,
                              padding: '2px 8px',
                              borderRadius: 6,
                              background: 'var(--red-faint)',
                              color: 'var(--red)',
                              border: '1px solid var(--red-soft)',
                              cursor: 'pointer',
                            }}
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <button
                onClick={onFinishTournament}
                style={{
                  width: '100%',
                  padding: 'clamp(10px,2.5vw,13px)',
                  borderRadius: 12,
                  fontWeight: 800,
                  fontSize: 'clamp(13px,3vw,15px)',
                  cursor: 'pointer',
                  background: 'var(--ball)',
                  color: 'var(--ink)',
                  border: 'none',
                }}
              >
                🏁 Finish Tournament
              </button>
              <button
                onClick={onTournamentSettings}
                style={{
                  width: '100%',
                  padding: 'clamp(8px,2vw,12px)',
                  borderRadius: 12,
                  fontWeight: 700,
                  fontSize: 'clamp(12px,3vw,15px)',
                  cursor: 'pointer',
                  background: 'var(--court-faint)',
                  color: 'var(--court)',
                  border: '1px solid var(--court-soft)',
                }}
              >
                ⚙️ Tournament Settings
              </button>
            </div>
          )}

          {isReferee && (
            <div
              className="rounded-2xl flex flex-col"
              style={{
                padding: 'clamp(12px,3vw,18px)',
                gap: 'clamp(12px,3vw,16px)',
                background: 'var(--surface)',
                border: '1px solid var(--court-soft)',
              }}
            >
              <p
                style={{
                  fontSize: 'clamp(9px,2vw,11px)',
                  color: 'var(--court)',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  margin: 0,
                }}
              >
                {(ROLE_MAP as any)[role]?.title ?? 'Referee'} Options
              </p>
              {hasPermission(role, 'canGenerateRound') && (
                <div className="flex gap-2">
                  <button
                    onClick={onRegenerateRound}
                    style={{
                      flex: 1,
                      padding: 'clamp(8px,2vw,11px)',
                      borderRadius: 12,
                      fontWeight: 700,
                      fontSize: 'clamp(11px,2.5vw,13px)',
                      cursor: 'pointer',
                      background: 'var(--court-faint)',
                      color: 'var(--court)',
                      border: '1px solid var(--court-soft)',
                    }}
                  >
                    🔀 Regenerate
                  </button>
                  <button
                    onClick={onCancelRound}
                    style={{
                      flex: 1,
                      padding: 'clamp(8px,2vw,11px)',
                      borderRadius: 12,
                      fontWeight: 700,
                      fontSize: 'clamp(11px,2.5vw,13px)',
                      cursor: 'pointer',
                      background: 'var(--red-faint)',
                      color: 'var(--red)',
                      border: '1px solid var(--red-soft)',
                    }}
                  >
                    ✕ Cancel Round
                  </button>
                </div>
              )}
              <button
                onClick={onTournamentSettings}
                style={{
                  width: '100%',
                  padding: 'clamp(8px,2vw,12px)',
                  borderRadius: 12,
                  fontWeight: 700,
                  fontSize: 'clamp(12px,3vw,15px)',
                  cursor: 'pointer',
                  background: 'var(--court-faint)',
                  color: 'var(--court)',
                  border: '1px solid var(--court-soft)',
                }}
              >
                ⚙️ Tournament Settings
              </button>
            </div>
          )}
        </>
      ) : (
        /* Viewer branch */
        <div className="flex flex-col" style={{ gap: 'clamp(10px,2.5vw,16px)' }}>
          {round.courts.map((teams: any, idx: number) => {
            const pr = pending[courtKey(idx)];
            const winner = pr ? teams.map(labeled).find((t: any) => t.id === pr.winnerId) : null;
            const loser = pr ? teams.map(labeled).find((t: any) => t.id === pr.loserId) : null;
            return (
              <ViewerCourtCard
                key={idx}
                courtLabel={`Court ${round.courtNums?.[idx] ?? courtNumbers[idx] ?? idx + 1}`}
                teams={teams.map(labeled)}
                winner={winner}
                loser={loser}
                pendingResult={pr}
              />
            );
          })}
          {liveAdditions.map((la: any, i: number) => {
            const tA = labeled(teamById(la.teamId1)), tB = labeled(teamById(la.teamId2));
            if (!tA || !tB) return null;
            const pr = pending[liveKey(i)];
            const winner = pr ? [tA, tB].find((t: any) => t.id === pr.winnerId) : null;
            const loser = pr ? [tA, tB].find((t: any) => t.id === pr.loserId) : null;
            return (
              <ViewerCourtCard
                key={`live-${i}`}
                courtLabel={`Court ${la.courtNumber}`}
                teams={[tA, tB]}
                winner={winner}
                loser={loser}
                pendingResult={pr}
              />
            );
          })}
          {(round.paused?.length > 0 || round.bye?.length > 0) && (
            <div className="flex items-center flex-wrap" style={{ gap: 'clamp(6px,1.5vw,10px)' }}>
              {round.paused?.length > 0 && (
                <>
                  <span style={{ color: 'var(--muted)', fontSize: 'clamp(10px,2.5vw,13px)', fontWeight: 700, flexShrink: 0 }}>
                    Paused:
                  </span>
                  {round.paused.map((t: any) => (
                    <TeamChip key={t.id} teamId={t.id} />
                  ))}
                </>
              )}
              {round.bye?.length > 0 && (
                <>
                  <span
                    style={{
                      color: 'var(--muted)',
                      fontSize: 'clamp(10px,2.5vw,13px)',
                      fontWeight: 700,
                      flexShrink: 0,
                      marginLeft: round.paused?.length > 0 ? 'clamp(6px,1.5vw,10px)' : 0,
                    }}
                  >
                    Bye:
                  </span>
                  {round.bye.map((t: any) => (
                    <TeamChip key={t.id} teamId={t.id} />
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
