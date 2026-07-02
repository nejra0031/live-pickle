import { useState, useRef, useContext } from 'react';
import { useTeamById, useTeamLabel, TeamRegistryContext } from '../context/TeamRegistryContext';
import { rerank, rebuildStandings } from '../algorithms/standings';
import { getTPTGamesForMatchup, formatTPTTeamLabel } from '../algorithms/threePlayerTeam';
import { buildSidePresentation } from '../algorithms/doublesRR';
import { playerDisplayName } from '../utils/nameDisplay';
import { hasPermission } from '../roleConfig';
import { chipStyle } from '../utils/chipStyle';
import { useTournamentState } from '../state/TournamentProvider';
import { useModal } from '../state/ModalProvider';
import { useAppCtx } from '../state/AppCtx';

export default function MatchesTab() {
  const { state } = useTournamentState();
  const { openModal } = useModal();
  const ctx = useAppCtx();

  const {
    history,
    activeTeamIds,
    cancelledRoundNums,
    tournamentMode,
    courtNumbers,
    roundRobinSchedule,
    roundRobinCourts,
    roundRobinStartRoundNum,
    roundRobinStartSnapshot,
    roundRobinEndSnapshot,
  } = state;

  const {
    effectiveRole,
    canEditScores,
    canDeleteGame,
    canFullEdit,
    backupRoundNums,
    tptTeams,
    tptPlayers,
    tptSubstitutions,
    doublesRRPlayers,
    doublesRRSchedule,
    onEditCourtNumber,
  } = ctx;

  const tptSchedule = ctx.tptSchedule ?? [];
  const tptTeamsMap = tptTeams ?? {};
  const tptPlayersMap = tptPlayers ?? {};
  const tptSubsMap = tptSubstitutions ?? {};
  const doublesRRPlayersMap = doublesRRPlayers ?? {};
  const doublesRRScheduleArr = doublesRRSchedule ?? [];
  const backupRoundNumsSet = backupRoundNums instanceof Set ? backupRoundNums : new Set();

  const onAddGame = (ri: number) => openModal('addGame', { target: String(ri), defaultCourt: '' });
  const onEditGame = (ri: number, gameIdx: number) => openModal('editGame', { ri, gameIdx });
  const onEditTPTGame = (ri: number, mi: number, gi: number) => openModal('editTPTGame', { ri, mi, gi });
  const onEditTPTSubs = (ri: number, mi: number, gi: number) => openModal('editTPTSubs', { ri, mi, gi });
  const onEditDoublesRRGame = (ri: number, ci: number) => openModal('editDoublesRRGame', { ri, ci });
  const onExportDUPR = hasPermission(effectiveRole, 'canExportDUPR')
    ? () => openModal('exportDUPR')
    : undefined;
  const onRemoveGame = (ri: number, gameIdx: number) =>
    openModal('pin', { purpose: 'removeGame', removeGameTarget: { ri, gameIdx } });
  const onRevertToRound = (rn: number) => openModal('pin', { purpose: 'revertToRound', revertTarget: rn });
  const onRevertToBeginning = () => openModal('pin', { purpose: 'revertToBeginning' });

  const teamById = useTeamById();
  const teamLabel = useTeamLabel();
  const { teamNameDisplay } = useContext(TeamRegistryContext);
  const [newestFirst, setNewestFirst] = useState(true);
  const [editingCourtNum, setEditingCourtNum] = useState<{ ri: number; gi: number } | null>(null);
  const [courtNumDraft, setCourtNumDraft] = useState('');
  const courtInputRef = useRef<HTMLInputElement | null>(null);

  const commitCourtEdit = (ri: number, gi: number) => {
    const val = courtNumDraft.trim();
    if (val) onEditCourtNumber?.(ri, gi, val);
    setEditingCourtNum(null);
  };

  const chip = (id: string, faded?: boolean) => {
    const t = teamById(id);
    if (!t) return null;
    return (
      <span
        key={id}
        style={{
          ...chipStyle(t),
          fontSize: 'clamp(11px,3vw,15px)',
          padding: 'clamp(3px,0.8vw,6px) clamp(8px,2vw,14px)',
          opacity: faded ? 0.5 : 1,
          textDecoration: faded ? 'line-through' : 'none',
        }}
      >
        {teamLabel(id)}
      </span>
    );
  };

  const renderRRSnapshot = () => {
    if (!roundRobinStartSnapshot) return null;
    const { startRoundNum: srn, participatingIds = [], excludedIds = [] } = roundRobinStartSnapshot;
    const snapHist = history.filter((h) => h.roundNum < srn);
    const snapRanked = rerank(rebuildStandings(activeTeamIds, snapHist));
    return (
      <div
        className="rounded-2xl"
        style={{
          background: '#fff',
          border: '1px solid var(--court-soft)',
          overflow: 'hidden',
          boxShadow: '0 2px 12px rgba(27,122,120,0.08)',
        }}
      >
        <div
          style={{
            padding: 'clamp(8px,2vw,12px) clamp(12px,3vw,18px)',
            background: 'var(--court-faint)',
            borderBottom: '1px solid var(--court-soft)',
          }}
        >
          <span
            style={{
              fontSize: 'clamp(10px,2.5vw,13px)',
              color: 'var(--court)',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            🔁 Round Robin Started{srn > 1 ? ` after Round ${srn - 1}` : ''}
          </span>
        </div>
        {participatingIds.length > 0 && (
          <div
            style={{
              padding: 'clamp(8px,2vw,12px) clamp(12px,3vw,18px)',
              borderBottom: '1px solid rgba(0,0,0,0.07)',
            }}
          >
            <p
              style={{
                fontSize: 'clamp(9px,2vw,11px)',
                color: '#94a3b8',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: 6,
              }}
            >
              Progressed ({participatingIds.length})
            </p>
            <div className="flex flex-wrap" style={{ gap: 'clamp(4px,1vw,8px)' }}>
              {participatingIds.map((id) => chip(id, false))}
            </div>
          </div>
        )}
        {excludedIds.length > 0 && (
          <div
            style={{
              padding: 'clamp(8px,2vw,12px) clamp(12px,3vw,18px)',
              borderBottom: '1px solid rgba(0,0,0,0.07)',
            }}
          >
            <p
              style={{
                fontSize: 'clamp(9px,2vw,11px)',
                color: '#94a3b8',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: 6,
              }}
            >
              Dropped out ({excludedIds.length})
            </p>
            <div className="flex flex-wrap" style={{ gap: 'clamp(4px,1vw,8px)' }}>
              {excludedIds.map((id) => chip(id, true))}
            </div>
          </div>
        )}
        {snapRanked.length > 0 && (
          <div style={{ padding: 'clamp(8px,2vw,12px) clamp(12px,3vw,18px)' }}>
            <p
              style={{
                fontSize: 'clamp(9px,2vw,11px)',
                color: '#94a3b8',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: 6,
              }}
            >
              Standings at start of Round Robin
            </p>
            <div
              className="rounded-xl overflow-hidden"
              style={{ border: '1px solid rgba(0,0,0,0.08)' }}
            >
              <div
                className="flex items-center font-bold uppercase tracking-widest"
                style={{
                  background: 'var(--court-faint)',
                  color: '#475569',
                  padding: 'clamp(5px,1.2vw,8px) clamp(8px,2vw,12px)',
                  gap: 'clamp(4px,1vw,8px)',
                  fontSize: 'clamp(8px,1.8vw,11px)',
                }}
              >
                <span style={{ width: 'clamp(20px,4.5vw,32px)' }}>#</span>
                <span className="flex-1">Team</span>
                <span style={{ width: 'clamp(22px,4.5vw,34px)', textAlign: 'center' }}>GP</span>
                <span
                  style={{ width: 'clamp(22px,4.5vw,34px)', textAlign: 'center', color: '#16a34a' }}
                >
                  W
                </span>
                <span
                  style={{ width: 'clamp(22px,4.5vw,34px)', textAlign: 'center', color: '#dc2626' }}
                >
                  L
                </span>
                <span
                  style={{ width: 'clamp(28px,5.5vw,42px)', textAlign: 'center', color: '#0284c7' }}
                >
                  +/−
                </span>
              </div>
              {snapRanked.map((team, i) => {
                const dropped = excludedIds.includes(team.id);
                return (
                  <div
                    key={team.id}
                    className="flex items-center"
                    style={{
                      padding: 'clamp(5px,1.2vw,8px) clamp(8px,2vw,12px)',
                      gap: 'clamp(4px,1vw,8px)',
                      background: i % 2 === 0 ? '#fff' : '#f8fafc',
                      borderTop: '1px solid rgba(0,0,0,0.05)',
                      opacity: dropped ? 0.5 : 1,
                    }}
                  >
                    <span
                      style={{
                        width: 'clamp(20px,4.5vw,32px)',
                        fontWeight: 800,
                        color: '#64748b',
                        fontSize: 'clamp(11px,2.5vw,14px)',
                      }}
                    >
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span
                        style={{
                          ...chipStyle({ color: team.color ?? '#475569', text: team.text ?? '#fff' }),
                          fontSize: 'clamp(10px,2.5vw,13px)',
                          padding: 'clamp(2px,0.5vw,4px) clamp(7px,1.7vw,12px)',
                          textDecoration: dropped ? 'line-through' : 'none',
                          opacity: dropped ? 0.6 : 1,
                        }}
                      >
                        {teamLabel(team.id)}
                      </span>
                    </div>
                    <span
                      style={{
                        width: 'clamp(22px,4.5vw,34px)',
                        textAlign: 'center',
                        color: '#475569',
                        fontSize: 'clamp(11px,2.5vw,14px)',
                        fontWeight: 700,
                      }}
                    >
                      {team.played}
                    </span>
                    <span
                      style={{
                        width: 'clamp(22px,4.5vw,34px)',
                        textAlign: 'center',
                        color: '#16a34a',
                        fontWeight: 800,
                        fontSize: 'clamp(11px,2.5vw,14px)',
                      }}
                    >
                      {team.wins}
                    </span>
                    <span
                      style={{
                        width: 'clamp(22px,4.5vw,34px)',
                        textAlign: 'center',
                        color: '#dc2626',
                        fontWeight: 800,
                        fontSize: 'clamp(11px,2.5vw,14px)',
                      }}
                    >
                      {team.losses}
                    </span>
                    <span
                      style={{
                        width: 'clamp(28px,5.5vw,42px)',
                        textAlign: 'center',
                        fontWeight: 800,
                        fontSize: 'clamp(11px,2.5vw,14px)',
                        color:
                          team.scoreDiff > 0
                            ? '#16a34a'
                            : team.scoreDiff < 0
                              ? '#dc2626'
                              : '#94a3b8',
                      }}
                    >
                      {team.scoreDiff > 0 ? '+' : ''}
                      {team.scoreDiff}
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
    const accent = completed ? 'var(--court-soft)' : 'rgba(220,38,38,0.3)';
    const bg = completed
      ? 'var(--court-faint)'
      : 'linear-gradient(90deg,rgba(220,38,38,0.08),rgba(239,68,68,0.08))';
    const textCol = completed ? 'var(--court)' : '#b91c1c';
    return (
      <div
        className="rounded-2xl"
        style={{
          background: '#fff',
          border: `1px solid ${accent}`,
          overflow: 'hidden',
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        }}
      >
        <div
          style={{
            padding: 'clamp(8px,2vw,12px) clamp(12px,3vw,18px)',
            background: bg,
            borderBottom: `1px solid ${accent}`,
          }}
        >
          <span
            style={{
              fontSize: 'clamp(10px,2.5vw,13px)',
              color: textCol,
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            {completed ? '🏁 Round Robin Complete' : '⛔ Round Robin Cancelled'}
          </span>
        </div>
        <div style={{ padding: 'clamp(8px,2vw,12px) clamp(12px,3vw,18px)' }}>
          <p style={{ fontSize: 'clamp(11px,2.5vw,14px)', color: '#475569', margin: 0 }}>
            {ern != null
              ? `${completed ? 'Completed' : 'Cancelled'} after Round ${ern}. Standings carry over from this point on.`
              : 'Cancelled before any Round Robin rounds were played.'}
          </p>
        </div>
      </div>
    );
  };

  const sortedEntries = [...history]
    .map((h, ri) => ({ type: 'round', h, ri }))
    .sort((a, b) => a.h.roundNum - b.h.roundNum);
  const committedNums = new Set(history.map((h) => h.roundNum));
  const effectiveCancelled = cancelledRoundNums.filter((n) => !committedNums.has(n));
  const futureBackups = [...backupRoundNumsSet]
    .filter((n) => !committedNums.has(n))
    .sort((a, b) => a - b);

  const upcomingEntries: any[] = [];
  if (tournamentMode === 'roundrobin' && roundRobinSchedule && roundRobinSchedule.length > 0) {
    roundRobinSchedule.forEach((pairs, idx) => {
      const roundNum = (roundRobinStartRoundNum || 1) + idx;
      if (!committedNums.has(roundNum))
        upcomingEntries.push({ type: 'upcoming', mode: 'roundrobin', roundNum, idx, pairs });
    });
  } else if (tournamentMode === 'tpt' && tptSchedule.length > 0) {
    tptSchedule.forEach((round: any, idx: number) => {
      const roundNum = idx + 1;
      if (!committedNums.has(roundNum))
        upcomingEntries.push({ type: 'upcoming', mode: 'tpt', roundNum, idx, round });
    });
  } else if (tournamentMode === 'doublesrr' && doublesRRScheduleArr.length > 0) {
    doublesRRScheduleArr.forEach((round: any, idx: number) => {
      const roundNum = idx + 1;
      if (!committedNums.has(roundNum))
        upcomingEntries.push({ type: 'upcoming', mode: 'doublesrr', roundNum, idx, round });
    });
  }
  // The first entry pushed above (ascending schedule order) is the round currently
  // being played on the Play tab — every other upcoming entry can be promoted to replace it.
  const currentUpcomingIdx = upcomingEntries.length > 0 ? upcomingEntries[0].idx : null;
  const onPromoteRound = (mode: string, targetIdx: number) =>
    openModal('pin', { purpose: 'promoteRound', promoteRoundTarget: { mode, targetIdx } });

  const allEntries = [
    ...sortedEntries,
    ...effectiveCancelled.map((n) => ({ type: 'cancelled', roundNum: n })),
    ...upcomingEntries,
  ].sort((a, b) => {
    const an = a.type === 'round' ? a.h.roundNum : a.roundNum;
    const bn = b.type === 'round' ? b.h.roundNum : b.roundNum;
    return an - bn;
  });

  const showSnapshotAtTop =
    !!roundRobinStartSnapshot &&
    history.every((h) => h.roundNum < (roundRobinStartSnapshot.startRoundNum || 0));
  // Effective round to anchor the end-snapshot to: the last RR round if rounds were played,
  // otherwise the last Swiss round before RR (startRoundNum - 1). Null means no anchor exists.
  const rrEndAnchorRound = roundRobinEndSnapshot
    ? roundRobinEndSnapshot.endRoundNum != null
      ? roundRobinEndSnapshot.endRoundNum
      : roundRobinStartSnapshot && roundRobinStartSnapshot.startRoundNum > 1
        ? roundRobinStartSnapshot.startRoundNum - 1
        : null
    : null;
  const showEndAtTop = !!roundRobinEndSnapshot && rrEndAnchorRound == null;
  const displayEntries = newestFirst ? [...allEntries].reverse() : allEntries;
  const isEmpty =
    history.length === 0 &&
    !roundRobinStartSnapshot &&
    !roundRobinEndSnapshot &&
    cancelledRoundNums.length === 0 &&
    upcomingEntries.length === 0;
  const hasAnyHistory =
    history.length > 0 || cancelledRoundNums.length > 0 || !!roundRobinStartSnapshot;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 flex-wrap">
        {canFullEdit && hasAnyHistory && (
          <button
            onClick={onRevertToBeginning}
            style={{
              fontSize: 12,
              padding: '4px 10px',
              borderRadius: 8,
              fontWeight: 700,
              cursor: 'pointer',
              background: 'rgba(220,38,38,0.07)',
              color: '#b91c1c',
              border: '1px solid rgba(220,38,38,0.2)',
            }}
          >
            ↩ Revert to Beginning
          </button>
        )}
        <div className="flex items-center gap-2" style={{ marginLeft: 'auto' }}>
          {hasAnyHistory && onExportDUPR && (
            <button
              onClick={onExportDUPR}
              style={{
                fontSize: 12,
                padding: '4px 10px',
                borderRadius: 8,
                fontWeight: 700,
                cursor: 'pointer',
                background: 'var(--court-faint)',
                color: 'var(--court)',
                border: '1px solid var(--court-soft)',
              }}
            >
              ⬇ Export DUPR
            </button>
          )}
          <div className="flex items-center rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            <button
              onClick={() => setNewestFirst(false)}
              style={{
                fontSize: 12,
                padding: '4px 10px',
                fontWeight: 700,
                cursor: 'pointer',
                background: !newestFirst ? 'var(--court)' : 'transparent',
                color: !newestFirst ? '#fff' : 'var(--muted)',
                border: 'none',
                borderRight: '1px solid var(--border)',
              }}
            >
              ↑ Oldest
            </button>
            <button
              onClick={() => setNewestFirst(true)}
              style={{
                fontSize: 12,
                padding: '4px 10px',
                fontWeight: 700,
                cursor: 'pointer',
                background: newestFirst ? 'var(--court)' : 'transparent',
                color: newestFirst ? '#fff' : 'var(--muted)',
                border: 'none',
              }}
            >
              ↓ Newest
            </button>
          </div>
        </div>
      </div>

      {isEmpty && (
        <div className="text-center text-slate-400 py-8 text-sm">No rounds completed yet.</div>
      )}

      {canFullEdit && futureBackups.length > 0 && (
        <div
          className="rounded-2xl flex flex-col gap-2"
          style={{
            padding: 'clamp(10px,2.5vw,14px) clamp(12px,3vw,18px)',
            background: 'rgba(217,119,6,0.06)',
            border: '1px solid rgba(217,119,6,0.3)',
          }}
        >
          <p
            style={{
              fontSize: 'clamp(10px,2.5vw,13px)',
              fontWeight: 800,
              color: '#92400e',
              margin: 0,
            }}
          >
            ⏩ Snapshots from reverted rounds
          </p>
          <p style={{ fontSize: 'clamp(9px,2vw,11px)', color: '#b45309', margin: 0 }}>
            These rounds existed before your last revert. You can restore any of them.
          </p>
          <div className="flex flex-wrap gap-2">
            {futureBackups.map((rn) => (
              <button
                key={rn}
                onClick={() => onRevertToRound(rn)}
                style={{
                  fontSize: 'clamp(11px,2.5vw,13px)',
                  padding: 'clamp(4px,1vw,6px) clamp(10px,2.5vw,14px)',
                  borderRadius: 8,
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: 'rgba(217,119,6,0.12)',
                  color: '#92400e',
                  border: '1px solid rgba(217,119,6,0.35)',
                }}
              >
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
            <div
              key={`cancelled-${entry.roundNum}`}
              className="rounded-2xl flex items-center gap-3"
              style={{
                padding: 'clamp(10px,2.5vw,14px) clamp(12px,3vw,18px)',
                background: 'rgba(220,38,38,0.04)',
                border: '1px dashed rgba(220,38,38,0.25)',
              }}
            >
              <span style={{ fontSize: 'clamp(16px,4vw,20px)' }}>✕</span>
              <span
                style={{ fontSize: 'clamp(11px,2.5vw,14px)', color: '#dc2626', fontWeight: 700 }}
              >
                Round {entry.roundNum} cancelled
              </span>
            </div>
          );
        }

        if (entry.type === 'upcoming') {
          const { mode, roundNum, idx } = entry;
          const canPromote = canFullEdit && currentUpcomingIdx != null && idx !== currentUpcomingIdx;
          const header = (
            <div
              className="flex items-center justify-between"
              style={{
                padding: 'clamp(8px,2vw,11px) clamp(12px,3vw,18px)',
                background: 'rgba(0,0,0,0.03)',
                borderBottom: '1px solid rgba(0,0,0,0.06)',
              }}
            >
              <div className="flex items-baseline" style={{ gap: 6 }}>
                <span
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 'clamp(9px,2vw,11px)',
                    color: '#94a3b8',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.12em',
                  }}
                >
                  Round
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 'clamp(20px,5vw,30px)',
                    color: '#94a3b8',
                    fontWeight: 900,
                    lineHeight: 1,
                  }}
                >
                  {roundNum}
                </span>
              </div>
              <div className="flex items-center" style={{ gap: 8 }}>
                {canPromote && (
                  <button
                    onClick={() => onPromoteRound(mode, idx)}
                    title="Make this the current round, swapping it with the round in progress"
                    style={{
                      fontSize: 'clamp(9px,2vw,11px)',
                      padding: '3px 8px',
                      borderRadius: 6,
                      fontWeight: 700,
                      cursor: 'pointer',
                      background: 'var(--court-faint)',
                      color: 'var(--court)',
                      border: '1px solid var(--court-soft)',
                    }}
                  >
                    ⇄ Make current
                  </button>
                )}
                <span
                  style={{
                    fontSize: 'clamp(9px,2vw,11px)',
                    color: '#94a3b8',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  Upcoming
                </span>
              </div>
            </div>
          );
          const wrap = (children: any) => (
            <div
              key={`upcoming-${roundNum}`}
              className="rounded-2xl"
              style={{
                background: '#fff',
                border: '1px dashed rgba(0,0,0,0.15)',
                overflow: 'hidden',
                opacity: 0.7,
              }}
            >
              {header}
              <div
                style={{
                  padding: 'clamp(8px,2vw,12px) clamp(12px,3vw,18px)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'clamp(6px,1.5vw,10px)',
                }}
              >
                {children}
              </div>
            </div>
          );

          if (mode === 'roundrobin') {
            const rrCourts =
              roundRobinCourts && roundRobinCourts.length > 0 ? roundRobinCourts : courtNumbers;
            return wrap(
              entry.pairs.map(([idA, idB]: [string, string], mi: number) => {
                const tA = teamById(idA),
                  tB = teamById(idB);
                if (!tA || !tB) return null;
                return (
                  <div
                    key={mi}
                    className="flex items-center flex-wrap"
                    style={{ gap: 'clamp(6px,1.5vw,10px)' }}
                  >
                    <span
                      style={{
                        fontSize: 'clamp(9px,2vw,11px)',
                        color: '#94a3b8',
                        fontWeight: 700,
                        minWidth: 'clamp(48px,11vw,64px)',
                      }}
                    >
                      Court {rrCourts[mi] ?? mi + 1}
                    </span>
                    {chip(tA.id, false)}
                    <span style={{ color: '#cbd5e1', fontWeight: 700 }}>vs</span>
                    {chip(tB.id, false)}
                  </div>
                );
              })
            );
          }

          if (mode === 'tpt') {
            const round = entry.round;
            const byeTeam = round.byeTeamId ? tptTeamsMap[round.byeTeamId] : null;
            const pName = (id: string) => {
              const p = tptPlayersMap[id];
              return p ? playerDisplayName(p) : '?';
            };
            const sideLabel = (pids: string[]) => pids.filter(Boolean).map(pName).join(' & ');
            return wrap(
              <>
                {round.matchups.map((matchup: any, mi: number) => {
                  const teamA = tptTeamsMap[matchup.teamAId];
                  const teamB = tptTeamsMap[matchup.teamBId];
                  if (!teamA || !teamB) return null;
                  const gameDefs = getTPTGamesForMatchup(teamA, teamB);
                  return (
                    <div
                      key={mi}
                      className="rounded-xl"
                      style={{
                        padding: 'clamp(6px,1.5vw,10px)',
                        border: '1px solid rgba(0,0,0,0.07)',
                        background: 'rgba(0,0,0,0.01)',
                      }}
                    >
                      <div
                        className="flex items-center gap-2"
                        style={{ marginBottom: 'clamp(5px,1.2vw,8px)' }}
                      >
                        <span
                          style={{
                            ...chipStyle(teamA),
                            fontSize: 'clamp(11px,2.8vw,14px)',
                            padding: '3px 10px',
                          }}
                        >
                          {formatTPTTeamLabel(teamA, tptPlayersMap, teamNameDisplay)}
                        </span>
                        <span style={{ color: '#94a3b8', fontWeight: 700 }}>vs</span>
                        <span
                          style={{
                            ...chipStyle(teamB),
                            fontSize: 'clamp(11px,2.8vw,14px)',
                            padding: '3px 10px',
                          }}
                        >
                          {formatTPTTeamLabel(teamB, tptPlayersMap, teamNameDisplay)}
                        </span>
                      </div>
                      {gameDefs.map((def, gi) => {
                        const gameLabel = gi === 0 ? 'Males' : gi === 1 ? 'Mixed #1' : 'Mixed #2';
                        return (
                          <div
                            key={gi}
                            style={{
                              padding: 'clamp(2px,0.5vw,4px) 0',
                              borderTop: '1px solid rgba(0,0,0,0.05)',
                            }}
                          >
                            <div
                              className="flex items-center flex-wrap"
                              style={{ gap: 'clamp(4px,1vw,8px)' }}
                            >
                              <span
                                style={{
                                  fontSize: 'clamp(9px,2vw,11px)',
                                  color: gi === 0 ? '#1d4ed8' : '#be185d',
                                  fontWeight: 700,
                                  minWidth: 'clamp(52px,12vw,72px)',
                                  flexShrink: 0,
                                }}
                              >
                                {gameLabel}
                              </span>
                              <span
                                style={{
                                  ...chipStyle(teamA),
                                  fontSize: 'clamp(10px,2.5vw,13px)',
                                  padding: '2px 8px',
                                }}
                              >
                                {sideLabel(def.sideA)}
                              </span>
                              <span style={{ color: '#cbd5e1', fontWeight: 700 }}>vs</span>
                              <span
                                style={{
                                  ...chipStyle(teamB),
                                  fontSize: 'clamp(10px,2.5vw,13px)',
                                  padding: '2px 8px',
                                }}
                              >
                                {sideLabel(def.sideB)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
                {byeTeam && (
                  <div className="flex items-center gap-2">
                    <span
                      style={{
                        color: '#94a3b8',
                        fontSize: 'clamp(10px,2.5vw,12px)',
                        fontWeight: 700,
                      }}
                    >
                      Bye:
                    </span>
                    <span
                      style={{
                        ...chipStyle(byeTeam),
                        fontSize: 'clamp(11px,3vw,14px)',
                        padding: '2px 10px',
                      }}
                    >
                      {formatTPTTeamLabel(byeTeam, tptPlayersMap, teamNameDisplay)}
                    </span>
                  </div>
                )}
              </>
            );
          }

          // doublesrr
          const round = entry.round;
          return wrap(
            <>
              {round.courts.map((court: any, ci: number) => {
                const sideA = buildSidePresentation(
                  court.teamA,
                  doublesRRPlayersMap,
                  teamNameDisplay
                );
                const sideB = buildSidePresentation(
                  court.teamB,
                  doublesRRPlayersMap,
                  teamNameDisplay
                );
                return (
                  <div
                    key={ci}
                    className="flex items-center flex-wrap"
                    style={{ gap: 'clamp(6px,1.5vw,10px)' }}
                  >
                    <span
                      style={{
                        fontSize: 'clamp(9px,2vw,11px)',
                        color: '#94a3b8',
                        fontWeight: 700,
                        minWidth: 'clamp(48px,11vw,64px)',
                      }}
                    >
                      Court {ci + 1}
                    </span>
                    <span
                      style={{
                        ...chipStyle(sideA),
                        fontSize: 'clamp(11px,2.8vw,14px)',
                        padding: '3px 10px',
                      }}
                    >
                      {sideA.name}
                    </span>
                    <span style={{ color: '#cbd5e1', fontWeight: 700 }}>vs</span>
                    <span
                      style={{
                        ...chipStyle(sideB),
                        fontSize: 'clamp(11px,2.8vw,14px)',
                        padding: '3px 10px',
                      }}
                    >
                      {sideB.name}
                    </span>
                  </div>
                );
              })}
              {round.byePlayerIds?.length > 0 &&
                (() => {
                  const byeSide = buildSidePresentation(
                    round.byePlayerIds,
                    doublesRRPlayersMap,
                    teamNameDisplay
                  );
                  return (
                    <div className="flex items-center gap-2">
                      <span
                        style={{
                          color: '#94a3b8',
                          fontSize: 'clamp(10px,2.5vw,12px)',
                          fontWeight: 700,
                        }}
                      >
                        Bye:
                      </span>
                      <span
                        style={{
                          ...chipStyle(byeSide),
                          fontSize: 'clamp(11px,2.8vw,14px)',
                          padding: '3px 10px',
                        }}
                      >
                        {byeSide.name}
                      </span>
                    </div>
                  );
                })()}
            </>
          );
        }

        const { h, ri } = entry;
        const isTPTRound = !!h.tptMatchups;
        const isDoublesRRRound = !!h.doublesRRCourts;
        const seIdx = sortedEntries.findIndex((e) => e.ri === ri);

        if (isTPTRound) {
          const byeTeam = h.tptByeTeamId ? tptTeamsMap[h.tptByeTeamId] : null;
          return (
            <div
              key={ri}
              className="rounded-2xl"
              style={{
                background: '#fff',
                border: '1px solid rgba(0,0,0,0.08)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: 'clamp(8px,2vw,11px) clamp(12px,3vw,18px)',
                  background: 'var(--court-faint)',
                  borderBottom: '1px solid rgba(0,0,0,0.07)',
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 6,
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 'clamp(9px,2vw,11px)',
                    color: 'var(--court)',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.12em',
                    opacity: 0.75,
                  }}
                >
                  Round
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 'clamp(22px,5.5vw,32px)',
                    color: 'var(--court)',
                    fontWeight: 900,
                    lineHeight: 1,
                  }}
                >
                  {h.roundNum}
                </span>
              </div>
              <div
                style={{
                  padding: 'clamp(8px,2vw,12px) clamp(12px,3vw,18px)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'clamp(8px,2vw,12px)',
                }}
              >
                {h.tptMatchups.map((matchup: any, mi: number) => {
                  const teamA = tptTeamsMap[matchup.teamAId];
                  const teamB = tptTeamsMap[matchup.teamBId];
                  if (!teamA || !teamB) return null;
                  const gameDefs = getTPTGamesForMatchup(teamA, teamB);
                  const pName = (id: string) => {
                    const p = tptPlayersMap[id];
                    return p ? playerDisplayName(p) : '?';
                  };
                  const sideLabel = (pids: string[], subs: Record<string, any> = {}) => (
                    <span>
                      {pids.filter(Boolean).map((pid: string, idx: number) => {
                        const subPid = subs[pid];
                        const el = subPid ? (
                          <span
                            key={idx}
                            style={{ fontStyle: 'italic' }}
                            title={`Sub for ${pName(pid)}`}
                          >
                            {pName(subPid)}
                          </span>
                        ) : (
                          <span key={idx}>{pName(pid)}</span>
                        );
                        return idx === 0 ? (
                          el
                        ) : (
                          <span key={`sep-${idx}`}>
                            {' & '}
                            {el}
                          </span>
                        );
                      })}
                    </span>
                  );
                  const sideChip = (pids: string[], team: any, won: boolean, subs: Record<string, any> = {}) => (
                    <span
                      style={{
                        ...chipStyle(team, won),
                        whiteSpace: 'normal',
                        fontSize: 'clamp(11px,2.8vw,14px)',
                        padding: '3px 10px',
                      }}
                    >
                      {sideLabel(pids, subs)}
                    </span>
                  );
                  return (
                    <div
                      key={mi}
                      className="rounded-xl"
                      style={{
                        padding: 'clamp(8px,2vw,12px)',
                        border: '1px solid rgba(0,0,0,0.07)',
                        background: 'rgba(0,0,0,0.01)',
                      }}
                    >
                      <div
                        className="flex items-center gap-2"
                        style={{ marginBottom: 'clamp(6px,1.5vw,10px)' }}
                      >
                        <span
                          style={{
                            ...chipStyle(teamA),
                            fontSize: 'clamp(11px,2.8vw,14px)',
                            padding: '3px 10px',
                          }}
                        >
                          {formatTPTTeamLabel(teamA, tptPlayersMap, teamNameDisplay)}
                        </span>
                        <span style={{ color: '#94a3b8', fontWeight: 700 }}>vs</span>
                        <span
                          style={{
                            ...chipStyle(teamB),
                            fontSize: 'clamp(11px,2.8vw,14px)',
                            padding: '3px 10px',
                          }}
                        >
                          {formatTPTTeamLabel(teamB, tptPlayersMap, teamNameDisplay)}
                        </span>
                      </div>
                      {(matchup.games || []).map((game: any, gi: number) => {
                        if (!game) return null;
                        const def = gameDefs[gi];
                        const gameLabel = gi === 0 ? 'Males' : gi === 1 ? 'Mixed #1' : 'Mixed #2';
                        const aWon = game.winnerTeamId === teamA.id;
                        const scoreA = aWon ? game.winnerScore : game.loserScore;
                        const scoreB = aWon ? game.loserScore : game.winnerScore;
                        const subs = tptSubsMap[`${ri}_${mi}_${gi}`] || {};
                        return (
                          <div
                            key={gi}
                            style={{
                              padding: 'clamp(3px,0.8vw,5px) 0',
                              borderTop: gi > 0 ? '1px solid rgba(0,0,0,0.05)' : undefined,
                            }}
                          >
                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: 'auto 1fr auto 1fr auto',
                                alignItems: 'center',
                                gap: 'clamp(4px,1vw,8px)',
                              }}
                            >
                              <span
                                style={{
                                  fontSize: 'clamp(9px,2vw,11px)',
                                  color: gi === 0 ? '#1d4ed8' : '#be185d',
                                  fontWeight: 700,
                                  minWidth: 'clamp(52px,12vw,72px)',
                                }}
                              >
                                {gameLabel}
                              </span>
                              <div className="flex justify-end">{sideChip(def?.sideA || [], teamA, aWon, subs)}</div>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'clamp(3px,0.8vw,5px)', flexShrink: 0 }}>
                                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#1e293b', fontSize: 'clamp(12px,3vw,15px)', minWidth: '2ch', textAlign: 'right' }}>{scoreA}</span>
                                <span style={{ color: '#94a3b8' }}>–</span>
                                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#1e293b', fontSize: 'clamp(12px,3vw,15px)', minWidth: '2ch', textAlign: 'left' }}>{scoreB}</span>
                              </div>
                              <div className="flex justify-start">{sideChip(def?.sideB || [], teamB, !aWon, subs)}</div>
                              <div className="flex gap-1">
                                {canEditScores && (
                                  <button
                                    onClick={() => onEditTPTGame?.(ri, mi, gi)}
                                    style={{ fontSize: 'clamp(10px,2.5vw,13px)', padding: 'clamp(2px,0.5vw,4px) clamp(5px,1.2vw,8px)', borderRadius: 8, background: 'var(--court-faint)', color: 'var(--court)', border: '1px solid var(--court-soft)', cursor: 'pointer' }}
                                  >
                                    ✏️
                                  </button>
                                )}
                                {canEditScores && (
                                  <button
                                    onClick={() => onEditTPTSubs?.(ri, mi, gi)}
                                    title="Edit substitute players"
                                    style={{ fontSize: 'clamp(10px,2.5vw,13px)', padding: 'clamp(2px,0.5vw,4px) clamp(5px,1.2vw,8px)', borderRadius: 8, background: 'var(--court-faint)', color: 'var(--court)', border: '1px solid var(--court-soft)', cursor: 'pointer' }}
                                  >
                                    🔁
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
                {byeTeam && (
                  <div className="flex items-center gap-2">
                    <span
                      style={{
                        color: '#94a3b8',
                        fontSize: 'clamp(10px,2.5vw,12px)',
                        fontWeight: 700,
                      }}
                    >
                      Bye:
                    </span>
                    <span
                      style={{
                        ...chipStyle(byeTeam),
                        fontSize: 'clamp(11px,3vw,14px)',
                        padding: '2px 10px',
                      }}
                    >
                      {formatTPTTeamLabel(byeTeam, tptPlayersMap, teamNameDisplay)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        }

        if (isDoublesRRRound) {
          const sideChip = (pids: string[], won: boolean) => {
            const side = buildSidePresentation(pids || [], doublesRRPlayersMap, teamNameDisplay);
            return (
              <span
                style={{
                  ...chipStyle(side, won),
                  whiteSpace: 'normal',
                  fontSize: 'clamp(11px,2.8vw,14px)',
                  padding: '3px 10px',
                }}
              >
                {side.name}
              </span>
            );
          };
          return (
            <div
              key={ri}
              className="rounded-2xl"
              style={{
                background: '#fff',
                border: '1px solid rgba(0,0,0,0.08)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: 'clamp(8px,2vw,11px) clamp(12px,3vw,18px)',
                  background: 'var(--court-faint)',
                  borderBottom: '1px solid rgba(0,0,0,0.07)',
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 6,
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 'clamp(9px,2vw,11px)',
                    color: 'var(--court)',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.12em',
                    opacity: 0.75,
                  }}
                >
                  Round
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 'clamp(22px,5.5vw,32px)',
                    color: 'var(--court)',
                    fontWeight: 900,
                    lineHeight: 1,
                  }}
                >
                  {h.roundNum}
                </span>
              </div>
              <div
                style={{
                  padding: 'clamp(8px,2vw,12px) clamp(12px,3vw,18px)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'clamp(6px,1.5vw,10px)',
                }}
              >
                {h.doublesRRCourts.map((court: any, ci: number) => {
                  const aWon =
                    court.winnerIds && court.winnerIds.join(',') === (court.teamA || []).join(',');
                  const scoreA = aWon ? court.winnerScore : court.loserScore;
                  const scoreB = aWon ? court.loserScore : court.winnerScore;
                  return (
                    <div
                      key={ci}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'auto 1fr auto 1fr auto',
                        alignItems: 'center',
                        gap: 'clamp(4px,1vw,8px)',
                        padding: 'clamp(4px,1vw,6px) 0',
                        borderTop: ci > 0 ? '1px solid rgba(0,0,0,0.05)' : undefined,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 'clamp(9px,2vw,11px)',
                          color: 'var(--court)',
                          fontWeight: 700,
                          minWidth: 'clamp(48px,11vw,64px)',
                        }}
                      >
                        Court {ci + 1}
                      </span>
                      <div className="flex justify-end">{sideChip(court.teamA, aWon)}</div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'clamp(3px,0.8vw,5px)', flexShrink: 0 }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#1e293b', fontSize: 'clamp(12px,3vw,15px)', minWidth: '2ch', textAlign: 'right' }}>{scoreA}</span>
                        <span style={{ color: '#94a3b8' }}>–</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#1e293b', fontSize: 'clamp(12px,3vw,15px)', minWidth: '2ch', textAlign: 'left' }}>{scoreB}</span>
                      </div>
                      <div className="flex justify-start">{sideChip(court.teamB, !aWon)}</div>
                      <div>
                        {canEditScores && (
                          <button
                            onClick={() => onEditDoublesRRGame?.(ri, ci)}
                            style={{ fontSize: 'clamp(10px,2.5vw,13px)', padding: 'clamp(2px,0.5vw,4px) clamp(5px,1.2vw,8px)', borderRadius: 8, background: 'var(--court-faint)', color: 'var(--court)', border: '1px solid var(--court-soft)', cursor: 'pointer' }}
                          >
                            ✏️
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {h.bye?.length > 0 &&
                  (() => {
                    const byeSide = buildSidePresentation(
                      h.bye,
                      doublesRRPlayersMap,
                      teamNameDisplay
                    );
                    return (
                      <div className="flex items-center gap-2">
                        <span
                          style={{
                            color: '#94a3b8',
                            fontSize: 'clamp(10px,2.5vw,12px)',
                            fontWeight: 700,
                          }}
                        >
                          Bye:
                        </span>
                        <span
                          style={{
                            ...chipStyle(byeSide),
                            fontSize: 'clamp(11px,2.8vw,14px)',
                            padding: '3px 10px',
                          }}
                        >
                          {byeSide.name}
                        </span>
                      </div>
                    );
                  })()}
              </div>
            </div>
          );
        }

        const sbf = rebuildStandings(
          activeTeamIds,
          sortedEntries.slice(0, seIdx).map((e) => e.h)
        );
        const saf = rebuildStandings(
          activeTeamIds,
          sortedEntries.slice(0, seIdx + 1).map((e) => e.h)
        );
        const rbf = rerank(sbf),
          raf = rerank(saf);
        const rb = (id: string) => rbf.findIndex((t: any) => t.id === id) + 1;
        const ra = (id: string) => raf.findIndex((t: any) => t.id === id) + 1;
        const played = h.games.flatMap((g: any) => [g.winnerId, g.loserId]);
        const hasBye = h.bye?.length > 0;
        const isFirstRR =
          roundRobinStartSnapshot && h.roundNum === roundRobinStartSnapshot.startRoundNum;
        const isLastRR = rrEndAnchorRound != null && h.roundNum === rrEndAnchorRound;

        return (
          <div key={ri} className="flex flex-col gap-3">
            <div
              className="rounded-2xl"
              style={{
                background: '#fff',
                border: '1px solid rgba(0,0,0,0.08)',
                overflow: 'hidden',
              }}
            >
              <div
                className="flex items-center justify-between"
                style={{
                  padding: 'clamp(8px,2vw,11px) clamp(12px,3vw,18px)',
                  background: 'var(--court-faint)',
                  borderBottom: '1px solid rgba(0,0,0,0.07)',
                }}
              >
                <div className="flex items-baseline" style={{ gap: 6 }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 'clamp(9px,2vw,11px)',
                      color: 'var(--court)',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.12em',
                      opacity: 0.75,
                    }}
                  >
                    Round
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 'clamp(22px,5.5vw,32px)',
                      color: 'var(--court)',
                      fontWeight: 900,
                      lineHeight: 1,
                    }}
                  >
                    {h.roundNum}
                  </span>
                </div>
                {canFullEdit && (
                  <div className="flex items-center gap-1">
                    {backupRoundNumsSet.has(h.roundNum) && (
                      <button
                        onClick={() => onRevertToRound(h.roundNum)}
                        style={{
                          fontSize: 'clamp(10px,2.5vw,12px)',
                          padding: 'clamp(3px,0.8vw,5px) clamp(8px,2vw,12px)',
                          borderRadius: 8,
                          fontWeight: 700,
                          cursor: 'pointer',
                          background: 'rgba(220,38,38,0.08)',
                          color: '#dc2626',
                          border: '1px solid rgba(220,38,38,0.25)',
                        }}
                      >
                        ↩ Revert
                      </button>
                    )}
                    <button
                      onClick={() => onAddGame(ri)}
                      style={{
                        fontSize: 'clamp(10px,2.5vw,12px)',
                        padding: 'clamp(3px,0.8vw,5px) clamp(8px,2vw,12px)',
                        borderRadius: 8,
                        fontWeight: 700,
                        cursor: 'pointer',
                        background: 'var(--court-faint)',
                        color: 'var(--court)',
                        border: '1px solid var(--court-soft)',
                      }}
                    >
                      ➕ Add Game
                    </button>
                  </div>
                )}
              </div>

              <div style={{ padding: 'clamp(8px,2vw,12px) clamp(12px,3vw,18px)' }}>
                {h.games.map((game: any, gi: number) => {
                  const w = teamById(game.winnerId),
                    l = teamById(game.loserId);
                  return (
                    <div
                      key={gi}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'clamp(22px,5vw,36px) 1fr auto 1fr auto',
                        alignItems: 'center',
                        gap: 'clamp(4px,1vw,8px)',
                        marginBottom: gi < h.games.length - 1 ? 'clamp(6px,1.5vw,10px)' : 0,
                      }}
                    >
                      <div style={{ textAlign: 'center' }}>
                        {editingCourtNum?.ri === ri && editingCourtNum?.gi === gi ? (
                          <input
                            ref={courtInputRef}
                            value={courtNumDraft}
                            onChange={(e) => setCourtNumDraft(e.target.value)}
                            onBlur={() => commitCourtEdit(ri, gi)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') commitCourtEdit(ri, gi);
                              if (e.key === 'Escape') setEditingCourtNum(null);
                            }}
                            style={{
                              width: '100%',
                              fontSize: 'clamp(10px,2.5vw,13px)',
                              fontWeight: 700,
                              textAlign: 'center',
                              padding: '2px 4px',
                              borderRadius: 4,
                              background: 'rgba(0,0,0,0.06)',
                              border: '1px solid rgba(0,0,0,0.2)',
                              outline: 'none',
                            }}
                          />
                        ) : (
                          <span
                            style={{
                              color: '#94a3b8',
                              fontSize: 'clamp(10px,2.5vw,13px)',
                              fontWeight: 700,
                              cursor: canFullEdit ? 'pointer' : 'default',
                            }}
                            title={canFullEdit ? 'Click to edit court number' : undefined}
                            onClick={
                              canFullEdit
                                ? () => {
                                    setEditingCourtNum({ ri, gi });
                                    setCourtNumDraft(String(game.courtNumber ?? ''));
                                    setTimeout(() => courtInputRef.current?.focus(), 0);
                                  }
                                : undefined
                            }
                          >
                            {game.courtNumber}
                          </span>
                        )}
                      </div>
                      <div className="flex justify-end">
                        <span
                          style={{
                            ...(w ? chipStyle(w, true) : {}),
                            whiteSpace: 'normal',
                            fontSize: 'clamp(11px,3vw,15px)',
                            padding: 'clamp(3px,0.8vw,6px) clamp(8px,2vw,14px)',
                            textAlign: 'right',
                          }}
                        >
                          {w ? teamLabel(w.id) : ''}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'clamp(3px,0.8vw,5px)', flexShrink: 0 }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: w?.color, fontSize: 'clamp(16px,4vw,22px)', lineHeight: 1, minWidth: '2ch', textAlign: 'right' }}>
                          {game.winnerScore}
                        </span>
                        <span style={{ color: '#cbd5e1', fontSize: 'clamp(12px,3vw,16px)', fontWeight: 700 }}>–</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--muted)', fontSize: 'clamp(16px,4vw,22px)', lineHeight: 1, minWidth: '2ch', textAlign: 'left' }}>
                          {game.loserScore}
                        </span>
                      </div>
                      <div className="flex justify-start">
                        <span
                          style={{
                            ...(l ? chipStyle(l, false) : {}),
                            whiteSpace: 'normal',
                            fontSize: 'clamp(11px,3vw,15px)',
                            padding: 'clamp(3px,0.8vw,6px) clamp(8px,2vw,14px)',
                          }}
                        >
                          {l ? teamLabel(l.id) : ''}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        {canEditScores && (
                          <button
                            onClick={() => onEditGame(ri, gi)}
                            style={{
                              fontSize: 'clamp(10px,2.5vw,13px)',
                              padding: 'clamp(3px,0.8vw,6px) clamp(6px,1.5vw,10px)',
                              borderRadius: 8,
                              background: 'var(--court-faint)',
                              color: 'var(--court)',
                              border: '1px solid var(--court-soft)',
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            ✏️
                          </button>
                        )}
                        {canDeleteGame && (
                          <button
                            onClick={() => onRemoveGame(ri, gi)}
                            style={{
                              fontSize: 'clamp(10px,2.5vw,13px)',
                              padding: 'clamp(3px,0.8vw,6px) clamp(6px,1.5vw,10px)',
                              borderRadius: 8,
                              background: 'rgba(220,38,38,0.08)',
                              color: '#dc2626',
                              border: '1px solid rgba(220,38,38,0.2)',
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {h.paused && h.paused.length > 0 && (
                <div
                  style={{
                    borderTop: '1px solid rgba(0,0,0,0.07)',
                    padding: 'clamp(6px,1.5vw,10px) clamp(12px,3vw,18px)',
                  }}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      style={{
                        color: '#94a3b8',
                        fontSize: 'clamp(10px,2.5vw,12px)',
                        fontWeight: 700,
                        minWidth: 32,
                      }}
                    >
                      Paused
                    </span>
                    {h.paused.map((id: string) => {
                      const t = teamById(id);
                      if (!t) return null;
                      return (
                        <span
                          key={id}
                          className="inline-flex items-center rounded-full font-bold"
                          style={{
                            background: 'rgba(0,0,0,0.05)',
                            color: '#64748b',
                            fontSize: 'clamp(11px,3vw,15px)',
                            padding: 'clamp(3px,0.8vw,6px) clamp(8px,2vw,14px)',
                            border: '1px solid rgba(0,0,0,0.1)',
                            textDecoration: 'line-through',
                          }}
                        >
                          {teamLabel(id)}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {hasBye && (
                <div
                  style={{
                    borderTop: '1px solid rgba(0,0,0,0.07)',
                    padding: 'clamp(6px,1.5vw,10px) clamp(12px,3vw,18px)',
                  }}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      style={{
                        color: '#94a3b8',
                        fontSize: 'clamp(10px,2.5vw,12px)',
                        fontWeight: 700,
                        minWidth: 32,
                      }}
                    >
                      Bye
                    </span>
                    {h.bye.map((id: string) => {
                      const t = teamById(id);
                      if (!t) return null;
                      return (
                        <span
                          key={id}
                          style={{
                            ...chipStyle(t),
                            fontSize: 'clamp(11px,3vw,15px)',
                            padding: 'clamp(3px,0.8vw,6px) clamp(8px,2vw,14px)',
                          }}
                        >
                          {teamLabel(id)}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              <div
                style={{
                  borderTop: '1px solid rgba(0,0,0,0.07)',
                  padding: 'clamp(6px,1.5vw,10px) clamp(12px,3vw,18px)',
                }}
              >
                <p
                  style={{
                    fontSize: 'clamp(9px,2vw,11px)',
                    color: '#94a3b8',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    marginBottom: 4,
                  }}
                >
                  Rankings
                </p>
                <div
                  className="flex flex-wrap"
                  style={{ gap: 'clamp(8px,2vw,16px) clamp(12px,3vw,20px)' }}
                >
                  {played.map((id: string) => {
                    const b = rb(id),
                      a = ra(id),
                      d = b - a,
                      t = teamById(id);
                    if (!t) return null;
                    return (
                      <div
                        key={id}
                        className="flex items-center gap-1"
                        style={{ fontSize: 'clamp(11px,2.5vw,14px)' }}
                      >
                        <span style={{ color: t.color, fontWeight: 700 }}>{teamLabel(id)}</span>
                        <span style={{ color: '#94a3b8' }}>#{b}→</span>
                        <span
                          style={{
                            fontWeight: 700,
                            color: d > 0 ? '#16a34a' : d < 0 ? '#dc2626' : '#94a3b8',
                          }}
                        >
                          #{a}
                        </span>
                        {d > 0 && (
                          <span style={{ color: '#16a34a', fontSize: 'clamp(9px,2vw,11px)' }}>
                            ▲{d}
                          </span>
                        )}
                        {d < 0 && (
                          <span style={{ color: '#dc2626', fontSize: 'clamp(9px,2vw,11px)' }}>
                            ▼{Math.abs(d)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            {isLastRR && renderRREndSnapshot()}
            {newestFirst && isFirstRR && renderRRSnapshot()}
            {!newestFirst && isFirstRR && renderRRSnapshot()}
          </div>
        );
      })}

      {!newestFirst && showSnapshotAtTop && renderRRSnapshot()}
      {!newestFirst && showEndAtTop && renderRREndSnapshot()}
    </div>
  );
}
