import { useTeamById, useTeamLabel } from '../../context/TeamRegistryContext';
import CourtCard from '../../components/CourtCard';
import MatchupVsBox from '../../components/MatchupVsBox';
import TeamChip from '../../components/TeamChip';
import RoundTimer from '../../components/RoundTimer';
import { courtKey, liveKey } from '../../constants';
import { ROLE_MAP, hasPermission } from '../../roleConfig';
import SocialCourts from './SocialCourts';
import BreakBanner from './BreakBanner';

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
}) {
  const teamById = useTeamById();
  const teamLabel = useTeamLabel();
  const labeled = (t) => (t ? { ...t, name: teamLabel(t.id) } : t);
  const canWrite = hasPermission(role, 'canSubmitResults');
  const nextRN = roundNum === 0 ? 1 : roundNum + 1;
  const isAutoFinal = targetRounds > 0 && nextRN === targetRounds && !finalRound;
  const showTimer = timerDuration > 0 && !breakMode;

  return (
    <div className="flex flex-col gap-4">
      <BreakBanner breakMode={breakMode} onBreakEnd={onBreakEnd} role={role} />
      <SocialCourts socialCourts={socialCourts} />
      {showTimer ? (
        <RoundTimer
          secsLeft={timerSecsLeft}
          totalSecs={timerDuration}
          roundNum={roundNum}
          timerRunning={timerRunning}
          canToggleTimer={
            hasPermission(role, 'canEditTimer') || hasPermission(role, 'canToggleTimer')
          }
          canControlTimer={hasPermission(role, 'canEditTimer')}
          onToggle={onTimerToggle}
          onRestart={onTimerRestart}
          onOpenSettings={onTimerSettings}
        />
      ) : (
        <div style={{ textAlign: 'center' }}>
          <span className="text-blue-900 font-black" style={{ fontSize: 'clamp(22px,6vw,32px)' }}>
            Round {roundNum}
          </span>
        </div>
      )}

      {canWrite ? (
        <>
          {round.courts.map((teams, idx) => (
            <CourtCard
              key={`${roundKey}-court-${idx}`}
              courtLabel={`Court ${round.courtNums?.[idx] ?? courtNumbers[idx] ?? idx + 1}`}
              teams={teams.map(labeled)}
              onResult={(r) => onResult(idx, r)}
              pendingResult={pending[courtKey(idx)]}
              onEdit={isAdmin ? () => onEditActiveCourt(idx) : undefined}
              onRemove={isAdmin ? () => onRemoveActiveCourt(idx) : undefined}
              onUndo={() => onUndoResult(idx)}
            />
          ))}
          {liveAdditions.map((la, i) => {
            const tA = teamById(la.teamId1),
              tB = teamById(la.teamId2);
            if (!tA || !tB) return null;
            return (
              <CourtCard
                key={`live-${i}`}
                courtLabel={`Court ${la.courtNumber}`}
                teams={[labeled(tA), labeled(tB)]}
                onResult={(r) => onLiveResult(i, r)}
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
                      color: '#64748b',
                      fontSize: 'clamp(10px,2.5vw,13px)',
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    Paused:
                  </span>
                  {round.paused.map((t) => (
                    <TeamChip key={t.id} teamId={t.id} />
                  ))}
                </>
              )}
              {round.bye?.length > 0 && (
                <>
                  <span
                    style={{
                      color: '#64748b',
                      fontSize: 'clamp(10px,2.5vw,13px)',
                      fontWeight: 700,
                      flexShrink: 0,
                      marginLeft: round.paused?.length > 0 ? 'clamp(6px,1.5vw,10px)' : 0,
                    }}
                  >
                    Bye:
                  </span>
                  {round.bye.map((t) => (
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
                background: '#f8fafc',
                border: '1px solid rgba(0,0,0,0.08)',
              }}
            >
              <p
                style={{
                  fontSize: 'clamp(9px,2vw,11px)',
                  color: '#94a3b8',
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
                    bg: 'rgba(15,76,117,0.08)',
                    color: '#0f4c75',
                    border: 'rgba(15,76,117,0.2)',
                  },
                  {
                    label: '➕',
                    sub: 'Add Game',
                    onClick: onLiveAddGame,
                    bg: 'rgba(99,102,241,0.08)',
                    color: '#4338ca',
                    border: 'rgba(99,102,241,0.25)',
                  },
                  {
                    label: '☕',
                    sub: 'Break',
                    onClick: onBreakStart,
                    bg: 'rgba(217,119,6,0.08)',
                    color: '#92400e',
                    border: 'rgba(217,119,6,0.25)',
                  },
                  {
                    label: '✕',
                    sub: 'Cancel Round',
                    onClick: onCancelRound,
                    bg: 'rgba(220,38,38,0.07)',
                    color: '#dc2626',
                    border: 'rgba(220,38,38,0.2)',
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
                    <span style={{ fontSize: 'clamp(18px,4.5vw,26px)', lineHeight: 1 }}>
                      {label}
                    </span>
                    <span style={{ fontSize: 'clamp(10px,2.5vw,12px)' }}>{sub}</span>
                  </button>
                ))}
              </div>

              {Object.keys(pending).length > 0 && (
                <p style={{ fontSize: 'clamp(10px,2.5vw,12px)', color: '#94a3b8', margin: 0 }}>
                  Regenerate requires PIN — scores already entered.
                </p>
              )}

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  padding: 'clamp(8px,2vw,10px) clamp(10px,2.5vw,14px)',
                  borderRadius: 10,
                  background: finalRound ? 'rgba(251,191,36,0.08)' : 'rgba(0,0,0,0.03)',
                  border: `1px solid ${finalRound ? 'rgba(251,191,36,0.35)' : 'rgba(0,0,0,0.07)'}`,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 'clamp(12px,3vw,14px)',
                      fontWeight: 700,
                      color: finalRound ? '#92400e' : '#475569',
                    }}
                  >
                    🏁 Final Round
                  </div>
                  <div
                    style={{
                      fontSize: 'clamp(9px,2vw,11px)',
                      color: isAutoFinal ? '#d97706' : '#94a3b8',
                      marginTop: 2,
                    }}
                  >
                    {isAutoFinal
                      ? `Auto-applying for round ${nextRN}`
                      : 'Applies to the next round generated'}
                  </div>
                </div>
                <button
                  onClick={() => setFinalRound((f) => !f)}
                  style={{
                    flexShrink: 0,
                    padding: 'clamp(4px,1vw,6px) clamp(12px,3vw,18px)',
                    borderRadius: 8,
                    fontWeight: 700,
                    fontSize: 'clamp(11px,2.5vw,13px)',
                    cursor: 'pointer',
                    background: finalRound ? 'rgba(251,191,36,0.25)' : 'rgba(0,0,0,0.06)',
                    color: finalRound ? '#92400e' : '#64748b',
                    border: `1px solid ${finalRound ? 'rgba(251,191,36,0.5)' : 'rgba(0,0,0,0.1)'}`,
                  }}
                >
                  {finalRound ? 'On' : 'Off'}
                </button>
              </div>

              {activeRoundExtras.length > 0 && (
                <div
                  className="rounded-xl"
                  style={{
                    padding: 'clamp(8px,2vw,12px)',
                    background: 'rgba(99,102,241,0.06)',
                    border: '1px solid rgba(99,102,241,0.2)',
                  }}
                >
                  <p
                    style={{
                      fontSize: 'clamp(9px,2vw,11px)',
                      color: '#4338ca',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      marginBottom: 6,
                    }}
                  >
                    Manually added ({activeRoundExtras.length})
                  </p>
                  <div className="flex flex-col gap-1">
                    {activeRoundExtras.map((g, gi) => {
                      const w = teamById(g.winnerId),
                        l = teamById(g.loserId);
                      return (
                        <div
                          key={gi}
                          className="flex items-center"
                          style={{ gap: 'clamp(4px,1vw,8px)', fontSize: 'clamp(11px,2.5vw,13px)' }}
                        >
                          <span style={{ color: '#94a3b8', minWidth: 50 }}>
                            Court {g.courtNumber}
                          </span>
                          <span style={{ color: w?.color, fontWeight: 700 }}>
                            {w ? teamLabel(w.id) : ''}
                          </span>
                          <span style={{ color: w?.color, fontWeight: 800 }}>{g.winnerScore}</span>
                          <span style={{ color: '#cbd5e1' }}>–</span>
                          <span style={{ color: l?.color, fontWeight: 800 }}>{g.loserScore}</span>
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
                              background: 'rgba(220,38,38,0.1)',
                              color: '#dc2626',
                              border: '1px solid rgba(220,38,38,0.2)',
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
                  background: 'linear-gradient(90deg,#d97706,#f59e0b)',
                  color: '#fff',
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
                  background: 'rgba(99,102,241,0.08)',
                  color: '#4338ca',
                  border: '1px solid rgba(99,102,241,0.25)',
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
                background: '#f8fafc',
                border: '1px solid rgba(99,102,241,0.15)',
              }}
            >
              <p
                style={{
                  fontSize: 'clamp(9px,2vw,11px)',
                  color: '#6366f1',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  margin: 0,
                }}
              >
                {ROLE_MAP[role]?.title ?? 'Referee'} Options
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
                      background: 'rgba(15,76,117,0.08)',
                      color: '#0f4c75',
                      border: '1px solid rgba(15,76,117,0.2)',
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
                      background: 'rgba(220,38,38,0.07)',
                      color: '#dc2626',
                      border: '1px solid rgba(220,38,38,0.2)',
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
                  background: 'rgba(99,102,241,0.08)',
                  color: '#4338ca',
                  border: '1px solid rgba(99,102,241,0.25)',
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
          {round.courts.map((teams, idx) => (
            <div
              key={idx}
              className="rounded-2xl"
              style={{
                padding: 'clamp(12px,3vw,20px)',
                background: '#fff',
                border: '1px solid rgba(0,0,0,0.1)',
                boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
              }}
            >
              <MatchupVsBox
                courtLabel={`Court ${round.courtNums?.[idx] ?? courtNumbers[idx] ?? idx + 1}`}
                teamA={labeled(teams[0])}
                teamB={labeled(teams[1])}
              />
            </div>
          ))}
          {liveAdditions.map((la, i) => {
            const tA = teamById(la.teamId1),
              tB = teamById(la.teamId2);
            if (!tA || !tB) return null;
            return (
              <div
                key={`live-${i}`}
                className="rounded-2xl"
                style={{
                  padding: 'clamp(12px,3vw,20px)',
                  background: '#fff',
                  border: '1px solid rgba(0,0,0,0.1)',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                }}
              >
                <MatchupVsBox
                  courtLabel={`Court ${la.courtNumber}`}
                  teamA={labeled(tA)}
                  teamB={labeled(tB)}
                />
              </div>
            );
          })}
          {(round.paused?.length > 0 || round.bye?.length > 0) && (
            <div className="flex items-center flex-wrap" style={{ gap: 'clamp(6px,1.5vw,10px)' }}>
              {round.paused?.length > 0 && (
                <>
                  <span
                    style={{
                      color: '#64748b',
                      fontSize: 'clamp(10px,2.5vw,13px)',
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    Paused:
                  </span>
                  {round.paused.map((t) => (
                    <TeamChip key={t.id} teamId={t.id} />
                  ))}
                </>
              )}
              {round.bye?.length > 0 && (
                <>
                  <span
                    style={{
                      color: '#64748b',
                      fontSize: 'clamp(10px,2.5vw,13px)',
                      fontWeight: 700,
                      flexShrink: 0,
                      marginLeft: round.paused?.length > 0 ? 'clamp(6px,1.5vw,10px)' : 0,
                    }}
                  >
                    Bye:
                  </span>
                  {round.bye.map((t) => (
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
