import { useTeamById, useTeamLabel } from '../../context/TeamRegistryContext';
import { ROLE_MAP, hasPermission } from '../../roleConfig';
import BreakBanner from './BreakBanner';
import SocialCourts from './SocialCourts';

const settingsBtnStyle = {
  width: '100%',
  padding: 'clamp(8px,2vw,12px)',
  borderRadius: 12,
  fontWeight: 700,
  fontSize: 'clamp(12px,3vw,15px)',
  cursor: 'pointer',
  background: 'var(--court-faint)',
  color: 'var(--court)',
  border: '1px solid var(--court-soft)',
};

interface Props {
  isAdmin: boolean;
  isReferee: boolean;
  role: string | null;
  roundNum: number;
  finalRound: boolean;
  setFinalRound: (updater: (prev: boolean) => boolean) => void;
  targetRounds: number;
  gamesPerTeam: number;
  minGamesPlayed: number;
  nextRoundPresets: any[];
  breakMode: any;
  socialCourts: string[];
  activeTeamIds: string[];
  onGenerateRound: () => void;
  onSelectRRTeams: () => void;
  onPresetMatch: () => void;
  onBreakStart: () => void;
  onBreakEnd: () => void;
  onFinishTournament: () => void;
  onTournamentSettings: () => void;
}
export default function BetweenRounds({
  isAdmin,
  isReferee,
  role,
  roundNum,
  finalRound,
  setFinalRound,
  targetRounds,
  gamesPerTeam,
  minGamesPlayed,
  nextRoundPresets,
  breakMode,
  socialCourts,
  activeTeamIds,
  onGenerateRound,
  onSelectRRTeams,
  onPresetMatch,
  onBreakStart,
  onBreakEnd,
  onFinishTournament,
  onTournamentSettings,
}: Props) {
  const teamById = useTeamById();
  const teamLabel = useTeamLabel();
  const nextRN = roundNum === 0 ? 1 : roundNum + 1;
  const isAutoFinal = targetRounds > 0 && nextRN === targetRounds && !finalRound;
  const gamesPerTeamMet = gamesPerTeam > 0 && minGamesPlayed >= gamesPerTeam;
  const notEnoughTeams = roundNum === 0 && (activeTeamIds?.length ?? 0) < 2;
  const hintStyle = {
    fontSize: 'clamp(11px,2.5vw,13px)',
    fontWeight: 700,
    color: '#92400e',
    background: 'rgba(251,191,36,0.1)',
    border: '1px solid rgba(251,191,36,0.3)',
    borderRadius: 12,
    padding: 'clamp(10px,2.5vw,13px)',
    textAlign: 'center' as const,
    margin: 0,
  };

  return (
    <div className="flex flex-col gap-4">
      <BreakBanner breakMode={breakMode} onBreakEnd={onBreakEnd} role={role} />
      <SocialCourts socialCourts={socialCourts} />

      {isAdmin ? (
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
                label: '🔁',
                sub: 'Round Robin',
                onClick: onSelectRRTeams,
                bg: 'var(--court-faint)',
                color: 'var(--court)',
                border: 'var(--court-soft)',
              },
              {
                label: '📌',
                sub: 'Pre-set',
                onClick: onPresetMatch,
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
                label: '🏁',
                sub: 'Finish',
                onClick: onFinishTournament,
                bg: 'rgba(200,232,78,0.15)',
                color: 'var(--ink)',
                border: 'rgba(200,232,78,0.4)',
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

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              padding: 'clamp(8px,2vw,10px) clamp(10px,2.5vw,14px)',
              borderRadius: 10,
              background: finalRound ? 'rgba(251,191,36,0.08)' : 'rgba(0,0,0,0.03)',
              border: `1px solid ${finalRound ? 'rgba(251,191,36,0.35)' : 'var(--border)'}`,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 'clamp(12px,3vw,14px)',
                  fontWeight: 700,
                  color: finalRound ? '#92400e' : 'var(--muted)',
                }}
              >
                🏁 Final Round
              </div>
              <div
                style={{
                  fontSize: 'clamp(9px,2vw,11px)',
                  color: isAutoFinal ? '#d97706' : 'var(--muted)',
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
                color: finalRound ? '#92400e' : 'var(--muted)',
                border: `1px solid ${finalRound ? 'rgba(251,191,36,0.5)' : 'var(--border)'}`,
              }}
            >
              {finalRound ? 'On' : 'Off'}
            </button>
          </div>

          {nextRoundPresets.length > 0 && (
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
                Pre-set matchups ({nextRoundPresets.length})
              </p>
              <div className="flex flex-col gap-1">
                {nextRoundPresets.map((p, pi) => {
                  const t1 = teamById(p.teamId1), t2 = teamById(p.teamId2);
                  return (
                    <div
                      key={pi}
                      className="flex items-center"
                      style={{ gap: 'clamp(4px,1vw,8px)', fontSize: 'clamp(11px,2.5vw,13px)' }}
                    >
                      <span style={{ color: 'var(--muted)', minWidth: 50 }}>Court {p.courtNumber}</span>
                      <span style={{ color: t1?.color, fontWeight: 700 }}>
                        {t1 ? teamLabel(p.teamId1) : ''}
                      </span>
                      <span style={{ color: 'var(--muted)' }}>vs</span>
                      <span style={{ color: t2?.color, fontWeight: 700 }}>
                        {t2 ? teamLabel(p.teamId2) : ''}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {notEnoughTeams ? (
            <p style={hintStyle}>
              Add at least 2 teams in ⚙️ Tournament Settings to generate Round 1.
            </p>
          ) : gamesPerTeamMet ? (
            <p style={hintStyle}>
              All teams have played {gamesPerTeam} game{gamesPerTeam !== 1 ? 's' : ''} — target
              reached. Click Finish to end the tournament.
            </p>
          ) : (
            <>
              <button
                onClick={onGenerateRound}
                style={{
                  width: '100%',
                  padding: 'clamp(10px,2.5vw,13px)',
                  borderRadius: 12,
                  fontWeight: 800,
                  fontSize: 'clamp(13px,3vw,15px)',
                  cursor: 'pointer',
                  background: finalRound || isAutoFinal ? 'var(--ball)' : 'var(--court)',
                  color: finalRound || isAutoFinal ? 'var(--ink)' : '#fff',
                  border: 'none',
                }}
              >
                {roundNum === 0
                  ? isAutoFinal
                    ? '🏁 Generate Final Round →'
                    : 'Generate Round 1 →'
                  : finalRound || isAutoFinal
                    ? '🏁 Generate Final Round →'
                    : `Generate Round ${roundNum + 1} →`}
              </button>
              {gamesPerTeam > 0 && (
                <p
                  style={{
                    fontSize: 'clamp(10px,2.2vw,12px)',
                    color: 'var(--muted)',
                    fontWeight: 600,
                    textAlign: 'center',
                    margin: 0,
                  }}
                >
                  {minGamesPlayed}/{gamesPerTeam} games per team played
                </p>
              )}
            </>
          )}
          <button onClick={onTournamentSettings} style={settingsBtnStyle}>
            ⚙️ Tournament Settings
          </button>
        </div>
      ) : isReferee ? (
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
            {(ROLE_MAP as any)[role!]?.title ?? 'Referee'} Options
          </p>
          {hasPermission(role, 'canSwitchTournamentMode') && (
            <button
              onClick={onSelectRRTeams}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: 'clamp(8px,2vw,12px)',
                borderRadius: 12,
                fontWeight: 700,
                fontSize: 'clamp(11px,2.5vw,13px)',
                cursor: 'pointer',
                background: 'var(--court-faint)',
                color: 'var(--court)',
                border: '1px solid var(--court-soft)',
              }}
            >
              🔁 Switch to Round Robin
            </button>
          )}
          {hasPermission(role, 'canGenerateRound') &&
            !(targetRounds > 0 && roundNum >= targetRounds) &&
            !gamesPerTeamMet &&
            (notEnoughTeams ? (
              <p style={hintStyle}>Waiting for the admin to add teams in Tournament Settings.</p>
            ) : (
              <button
                onClick={onGenerateRound}
                style={{
                  width: '100%',
                  padding: 'clamp(10px,2.5vw,13px)',
                  borderRadius: 12,
                  fontWeight: 800,
                  fontSize: 'clamp(13px,3vw,15px)',
                  cursor: 'pointer',
                  background: finalRound || isAutoFinal ? 'var(--ball)' : 'var(--court)',
                  color: finalRound || isAutoFinal ? 'var(--ink)' : '#fff',
                  border: 'none',
                }}
              >
                {roundNum === 0
                  ? isAutoFinal
                    ? '🏁 Generate Final Round →'
                    : 'Generate Round 1 →'
                  : finalRound || isAutoFinal
                    ? '🏁 Generate Final Round →'
                    : `Generate Round ${roundNum + 1} →`}
              </button>
            ))}
          {hasPermission(role, 'canGenerateRound') && gamesPerTeamMet && (
            <p style={hintStyle}>
              All teams have played {gamesPerTeam} game{gamesPerTeam !== 1 ? 's' : ''} — target
              reached.
            </p>
          )}
          <button onClick={onTournamentSettings} style={settingsBtnStyle}>
            ⚙️ Tournament Settings
          </button>
        </div>
      ) : (
        <div
          className="rounded-2xl p-10 text-center flex flex-col items-center gap-3"
          style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid var(--border)' }}
        >
          <div style={{ fontSize: 'clamp(28px,7vw,44px)' }}>{roundNum === 0 ? '🏓' : '⏳'}</div>
          <p
            className="font-bold"
            style={{ color: 'var(--court)', fontSize: 'clamp(14px,3.5vw,20px)', margin: 0 }}
          >
            {roundNum === 0 ? 'Waiting for Round 1…' : 'Waiting for next round…'}
          </p>
          <p style={{ fontSize: 'clamp(11px,2.5vw,14px)', color: 'var(--muted)', margin: 0 }}>
            {notEnoughTeams
              ? 'Waiting for the organizer to add teams in Tournament Settings.'
              : roundNum === 0
                ? 'The organizer will start the tournament shortly.'
                : 'The organizer is setting up the next round.'}
          </p>
        </div>
      )}
    </div>
  );
}
