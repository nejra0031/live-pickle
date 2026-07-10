import { useContext, useEffect, useMemo, useState } from 'react';
import { buildTPTStandings, formatTPTTeamLabel } from '../algorithms/threePlayerTeam';
import { TeamRegistryContext } from '../context/TeamRegistryContext';
import { playerDisplayName } from '../utils/nameDisplay';
import { chipStyle } from '../utils/chipStyle';
import { ORDINAL } from '../constants';

const RANK_COLOR = (i: number) =>
  i === 0 ? '#F59E0B' : i === 1 ? '#94A3B8' : i === 2 ? '#C97D3A' : 'rgba(0,0,0,0.1)';

interface Props {
  tptTeams: Record<string, any>;
  tptPlayers: Record<string, any>;
  history: any[];
  tiebreakOrder: any[];
  tptSubstitutions?: Record<string, any>;
  tournamentFinished?: boolean;
}
export default function ThreePlayerStandingsTab({
  tptTeams,
  tptPlayers,
  history,
  tiebreakOrder,
  tptSubstitutions = {},
  tournamentFinished = false,
}: Props) {
  const { teamStandings, playerStandings, partnershipStandings } = useMemo(
    () => buildTPTStandings(tptTeams, tptPlayers, history, tiebreakOrder, tptSubstitutions),
    [tptTeams, tptPlayers, history, tiebreakOrder, tptSubstitutions]
  );
  const { teamNameDisplay } = useContext(TeamRegistryContext);
  const [openIds, setOpenIds] = useState(new Set());
  const toggle = (id: string) =>
    setOpenIds((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });

  // When the tournament finishes (podium shown on the Current round tab),
  // expand every team so the full player/partnership breakdown is visible
  // without needing to click each row.
  useEffect(() => {
    if (tournamentFinished) setOpenIds(new Set(teamStandings.map((t) => t.id)));
  }, [tournamentFinished]); // eslint-disable-line react-hooks/exhaustive-deps

  if (teamStandings.length === 0) {
    return <div className="text-center text-slate-400 py-8 text-sm">No results yet.</div>;
  }

  const colW = {
    rank: 'clamp(28px,6vw,50px)',
    stat: 'clamp(26px,5.5vw,42px)',
    diff: 'clamp(30px,6.5vw,50px)',
  };

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ border: '1px solid rgba(0,0,0,0.1)', boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}
    >
      <div
        className="flex items-center font-bold uppercase tracking-widest"
        style={{
          background: 'var(--court)',
          color: '#fff',
          padding: 'clamp(8px,2vw,14px) clamp(10px,2.5vw,18px)',
          gap: 'clamp(6px,1.5vw,12px)',
          fontSize: 'clamp(9px,2vw,12px)',
        }}
      >
        <span style={{ width: colW.rank }}>Rank</span>
        <span className="flex-1">Name</span>
        <span style={{ width: colW.stat, textAlign: 'center' }}>GP</span>
        <span style={{ width: colW.stat, textAlign: 'center' }}>W</span>
        <span style={{ width: colW.stat, textAlign: 'center' }}>L</span>
        <span style={{ width: colW.diff, textAlign: 'center' }}>+/−</span>
      </div>

      {teamStandings.map((team, i) => {
        const diff = team.scoreDiff;
        const partnerships = partnershipStandings[team.id] || [];
        const players = playerStandings[team.id] || [];
        const isOpen = openIds.has(team.id);
        const hasDetails = partnerships.length > 0 || players.length > 0;
        const rowBg = i % 2 === 0 ? '#fff' : '#f8fafc';
        const partBg = i % 2 === 0 ? '#f0f9ff' : '#e0f2fe';
        const playerBg = i % 2 === 0 ? '#f8fafc' : '#f1f5f9';
        const pad = 'clamp(10px,2.5vw,18px)';

        return (
          <div
            key={team.id}
            style={{ borderTop: i > 0 ? '1px solid rgba(0,0,0,0.07)' : undefined }}
          >
            {/* Team row — clickable to expand/collapse player & partnership details */}
            <div
              className="flex items-center"
              onClick={hasDetails ? () => toggle(team.id) : undefined}
              style={{
                padding: `${pad} ${pad}`,
                gap: 'clamp(6px,1.5vw,12px)',
                background: rowBg,
                borderLeft: `4px solid ${RANK_COLOR(i)}`,
                cursor: hasDetails ? 'pointer' : 'default',
              }}
            >
              <span
                className="font-black text-slate-500"
                style={{ width: colW.rank, fontSize: 'clamp(14px,3.5vw,22px)', flexShrink: 0 }}
              >
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : ORDINAL(i + 1)}
              </span>
              <div className="flex-1 min-w-0">
                <span
                  style={{
                    ...chipStyle(team),
                    fontSize: 'clamp(13px,3.5vw,20px)',
                    padding: 'clamp(4px,1vw,8px) clamp(10px,2.5vw,18px)',
                  }}
                >
                  {formatTPTTeamLabel(team, tptPlayers, teamNameDisplay)}
                </span>
              </div>
              <span
                style={{
                  width: colW.stat,
                  textAlign: 'center',
                  color: '#475569',
                  fontSize: 'clamp(14px,3.5vw,22px)',
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {team.played}
              </span>
              <span
                style={{
                  width: colW.stat,
                  textAlign: 'center',
                  color: 'var(--ink)',
                  fontWeight: 900,
                  fontSize: 'clamp(16px,4vw,24px)',
                  flexShrink: 0,
                }}
              >
                {team.wins}
              </span>
              <span
                style={{
                  width: colW.stat,
                  textAlign: 'center',
                  color: 'var(--ink)',
                  fontWeight: 900,
                  fontSize: 'clamp(16px,4vw,24px)',
                  flexShrink: 0,
                }}
              >
                {team.losses}
              </span>
              <span
                style={{
                  width: colW.diff,
                  textAlign: 'center',
                  fontWeight: 900,
                  fontSize: 'clamp(14px,3.5vw,22px)',
                  color: 'var(--ink)',
                  flexShrink: 0,
                }}
              >
                {diff > 0 ? '+' : ''}
                {diff}
              </span>
            </div>

            {isOpen && (
              <>
                {/* Partnership rows */}
                {partnerships.length > 0 && (
                  <div
                    style={{
                      background: partBg,
                      borderTop: '1px solid rgba(0,0,0,0.05)',
                      padding: `clamp(4px,1vw,6px) ${pad} clamp(8px,2vw,12px)`,
                    }}
                  >
                    {partnerships.map((p, pi) => {
                      const pd = p.scoreDiff;
                      const names = p.playerIds
                        .map((id: string) => {
                          const pl = tptPlayers[id];
                          return pl ? playerDisplayName(pl) : id;
                        })
                        .join(' & ');
                      const icon = p.type === 'males' ? '♂♂' : '♂♀';
                      const iconColor = p.type === 'males' ? '#1d4ed8' : '#7c3aed';
                      return (
                        <div
                          key={pi}
                          className="flex items-center"
                          style={{
                            gap: 'clamp(4px,1vw,8px)',
                            padding: 'clamp(3px,0.8vw,5px) 0',
                            borderTop: pi > 0 ? '1px solid rgba(0,0,0,0.04)' : undefined,
                          }}
                        >
                          <span
                            style={{
                              width: colW.rank,
                              flexShrink: 0,
                              textAlign: 'center',
                              fontSize: 11,
                              color: iconColor,
                              fontWeight: 800,
                            }}
                          >
                            {icon}
                          </span>
                          <span
                            className="flex-1 font-semibold"
                            style={{
                              fontSize: 'clamp(12px,3vw,16px)',
                              color: '#1e3a5f',
                              minWidth: 0,
                            }}
                          >
                            {names}
                          </span>
                          <span
                            style={{
                              width: colW.stat,
                              textAlign: 'center',
                              color: '#64748b',
                              fontSize: 'clamp(12px,3vw,15px)',
                              fontWeight: 600,
                              flexShrink: 0,
                            }}
                          >
                            {p.played}
                          </span>
                          <span
                            style={{
                              width: colW.stat,
                              textAlign: 'center',
                              color: 'var(--ink)',
                              fontWeight: 700,
                              fontSize: 'clamp(13px,3.2vw,17px)',
                              flexShrink: 0,
                            }}
                          >
                            {p.wins}
                          </span>
                          <span
                            style={{
                              width: colW.stat,
                              textAlign: 'center',
                              color: 'var(--ink)',
                              fontWeight: 700,
                              fontSize: 'clamp(13px,3.2vw,17px)',
                              flexShrink: 0,
                            }}
                          >
                            {p.losses}
                          </span>
                          <span
                            style={{
                              width: colW.diff,
                              textAlign: 'center',
                              fontWeight: 700,
                              fontSize: 'clamp(12px,3vw,15px)',
                              color: 'var(--ink)',
                              flexShrink: 0,
                            }}
                          >
                            {pd > 0 ? '+' : ''}
                            {pd}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Individual player rows */}
                {players.length > 0 && (
                  <div
                    style={{
                      background: playerBg,
                      borderTop: '1px solid rgba(0,0,0,0.05)',
                      padding: `clamp(4px,1vw,6px) ${pad} clamp(8px,2vw,12px)`,
                    }}
                  >
                    {players.map((p, pi) => {
                      const pd = p.scoreDiff;
                      return (
                        <div
                          key={p.id}
                          className="flex items-center"
                          style={{
                            gap: 'clamp(4px,1vw,8px)',
                            padding: 'clamp(3px,0.8vw,5px) 0',
                            borderTop: pi > 0 ? '1px solid rgba(0,0,0,0.04)' : undefined,
                          }}
                        >
                          <span
                            style={{
                              width: colW.rank,
                              flexShrink: 0,
                              textAlign: 'center',
                              fontSize: 10,
                              color: p.gender === 'female' ? '#be185d' : '#1d4ed8',
                              fontWeight: 700,
                            }}
                          >
                            {p.gender === 'female' ? '♀' : '♂'}
                          </span>
                          <span
                            className="flex-1 font-bold"
                            style={{
                              fontSize: 'clamp(11px,2.8vw,15px)',
                              color: '#334155',
                              minWidth: 0,
                            }}
                          >
                            {p.name}
                          </span>
                          <span
                            style={{
                              width: colW.stat,
                              textAlign: 'center',
                              color: '#64748b',
                              fontSize: 'clamp(11px,2.8vw,14px)',
                              fontWeight: 600,
                              flexShrink: 0,
                            }}
                          >
                            {p.played}
                          </span>
                          <span
                            style={{
                              width: colW.stat,
                              textAlign: 'center',
                              color: 'var(--ink)',
                              fontWeight: 700,
                              fontSize: 'clamp(12px,3vw,16px)',
                              flexShrink: 0,
                            }}
                          >
                            {p.wins}
                          </span>
                          <span
                            style={{
                              width: colW.stat,
                              textAlign: 'center',
                              color: 'var(--ink)',
                              fontWeight: 700,
                              fontSize: 'clamp(12px,3vw,16px)',
                              flexShrink: 0,
                            }}
                          >
                            {p.losses}
                          </span>
                          <span
                            style={{
                              width: colW.diff,
                              textAlign: 'center',
                              fontWeight: 700,
                              fontSize: 'clamp(11px,2.8vw,15px)',
                              color: 'var(--ink)',
                              flexShrink: 0,
                            }}
                          >
                            {pd > 0 ? '+' : ''}
                            {pd}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
