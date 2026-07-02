import { useMemo } from 'react';
import { ROLES, hasPermission } from '../roleConfig';
import { courtKey } from '../constants';
import { getTPTGamesForMatchup } from '../algorithms/threePlayerTeam';
import { buildSidePresentation } from '../algorithms/doublesRR';
import { useTeamById, useTeamLabel } from '../context/TeamRegistryContext';
import { playerDisplayName } from '../utils/nameDisplay';
import { toArr } from '../normalise';
import { useTournamentState } from '../state/TournamentProvider';
import { useModal } from '../state/ModalProvider';
import { useAppCtx } from '../state/AppCtx';
import PinModal from './PinModal';
import LoginModal from './LoginModal';
import ConfirmModal from './ConfirmModal';
import BreakModal from './BreakModal';
import TimerSettingsModal from './TimerSettingsModal';
import SelectRoundRobinTeamsModal from './SelectRoundRobinTeamsModal';
import GenerateAdditionalGamesModal from './GenerateAdditionalGamesModal';
import AddGameModal from './AddGameModal';
import PresetMatchModal from './PresetMatchModal';
import EditGameModal from './EditGameModal';
import EditTPTSubsModal from './EditTPTSubsModal';
import EditActiveCourtModal from './EditActiveCourtModal';
import ExportDUPRModal from './ExportDUPRModal';
import TournamentSettingsModal from './TournamentSettingsModal';

export default function ModalRoot() {
  const { state } = useTournamentState();
  const { modal, openModal, closeModal } = useModal();
  const ctx = useAppCtx();

  const {
    activeTeamIds,
    tournamentTeams,
    courtNumbers,
    timerDefaultMins: _timerDefaultMins,
    timerDuration,
    tournamentMode,
    history,
    round,
    pending,
    liveAdditions,
    nextRoundPresets,
    pausedIds,
    socialCourts,
    roundRobinCourts,
    teamNameDisplay,
    tptSubstitutions: _tptSubs,
    tournamentTitle,
    tournamentLocation,
    tournamentStartTime,
    tournamentDurationMins,
    maxPlayers,
    gamesPerTeam,
    standingsTiebreakOrder,
    teamNameDisplay: _tnd,
  } = state;

  const {
    pins,
    pinsLoaded,
    pinsLoadError,
    isOwner,
    isAdmin: _isAdmin,
    effectiveRole: role,
    ranked,
    tptTeams,
    tptPlayers,
    tptSubstitutions,
    doublesRRPlayers,
    doublesRRTiebreakOrder,
    onPinSuccess,
    onAddPin,
    onRevokePin,
    doRevertToRound,
    doRevertToBeginning,
    onBreakStart,
    onConfirmRemoveGame,
    onTimerSettingsSave,
    onDoublesRRTiebreakOrderChange,
    onStandingsTiebreakOrderChange,
    onTournamentInfoSave,
    onTeamNameDisplayChange,
    onTogglePause,
    onManageTeamsSave,
    onManageTPTTeamsSave,
    onManageCourtsSave,
    onManageDoublesRRPlayersSave,
    onStartRoundRobin,
    onChooseGenerateAdditionalGames,
    onAddGameSave,
    onAddPreset,
    onAddLiveGame,
    onEditSave,
    onEditActiveCourt,
    onEditLiveAddition,
    onEditTPTSave,
    onEditDoublesRRSave,
    onSetTPTSubstitution,
  } = ctx;

  const teamById = useTeamById();
  const teamLabel = useTeamLabel();

  const pinPurpose = modal.open === 'pin' ? modal.data?.purpose : null;
  const pinTitle =
    pinPurpose === 'login'
      ? 'Login'
      : pinPurpose === 'reset'
        ? 'PIN required to reset'
        : pinPurpose === 'exitRR'
          ? 'PIN required to exit Round Robin'
          : pinPurpose === 'cancelRound'
            ? 'PIN required to cancel round'
            : pinPurpose === 'regenerate'
              ? 'PIN required to regenerate round'
              : pinPurpose === 'revertToRound'
                ? `PIN required to revert to Round ${modal.data?.revertTarget}`
                : pinPurpose === 'promoteRound'
                  ? 'PIN required to change the active round'
                  : pinPurpose?.startsWith('remove')
                    ? 'PIN required to remove'
                    : 'PIN required';

  const pinCheckFn = (() => {
    if (!pinPurpose) return null;
    if (pinPurpose === 'login') {
      if (ROLES.some((r) => !pinsLoaded[r.id])) return null;
      return (hash: string) => {
        for (const r of ROLES) {
          if (pins[r.id]?.some((p: any) => p.hash === hash)) return r.id;
        }
        return null;
      };
    }
    const selfAuth = pinPurpose === 'exitRR' && hasPermission(role, 'canExitRRWithOwnPin');
    const pinRoleId = selfAuth ? role : 'admin';
    if (!pinsLoaded[pinRoleId]) return null;
    return (hash: string) => (pins[pinRoleId]?.some((p: any) => p.hash === hash) ? pinRoleId : null);
  })();
  const pinLoadError =
    pinPurpose === 'login'
      ? ROLES.some((r) => pinsLoadError[r.id])
      : !!pinsLoadError[
          pinPurpose === 'exitRR' && hasPermission(role, 'canExitRRWithOwnPin') ? role : 'admin'
        ];

  // addGameData — computed from modal + state (was previously computed in App.jsx and passed as a prop)
  const addGameData = useMemo(() => {
    if (modal.open !== 'addGame') return null;
    const { target, defaultCourt } = modal.data || {};
    const isActive = target === 'active';
    const ri = Number(target);
    const histEntry = !isActive && !isNaN(ri) ? history[ri] : null;
    const usedCourts = isActive
      ? [
          ...(round?.courts.map((_, i) => String(courtNumbers[i] ?? i + 1)) || []),
          ...(liveAdditions as any[]).map((la) => String(la.courtNumber)),
          ...((state.activeRoundExtras as any[]) || []).map((g: any) => String(g.courtNumber)),
        ]
      : histEntry
        ? histEntry.games.map((g) => String(g.courtNumber))
        : [];
    const usedTeams = histEntry ? histEntry.games.flatMap((g) => [g.winnerId, g.loserId]) : [];
    const label = isActive
      ? round
        ? `Round ${state.roundNum}`
        : history.length > 0
          ? `Round ${history[history.length - 1].roundNum}`
          : ''
      : `Round ${histEntry?.roundNum || ''}`;
    return { target, usedCourts, usedTeams, label, defaultCourt: defaultCourt || '' };
  }, [modal, round, state.roundNum, history, courtNumbers, liveAdditions, state.activeRoundExtras]);

  const editGameTarget = modal.open === 'editGame' ? modal.data : null;
  const editTPTGameTarget = modal.open === 'editTPTGame' ? modal.data : null;
  const editTPTSubsTarget = modal.open === 'editTPTSubs' ? modal.data : null;
  const editDoublesRRGameTarget = modal.open === 'editDoublesRRGame' ? modal.data : null;
  const editActiveCourtIdx = modal.open === 'editActiveCourt' ? modal.data : null;
  const editLiveIdxVal = modal.open === 'editLive' ? modal.data : null;

  return (
    <>
      {modal.open === 'pin' && pinPurpose === 'login' && (
        <LoginModal
          checkPin={pinCheckFn}
          pinLoadError={pinLoadError}
          currentRole={ctx.effectiveRole ?? null}
          onPinSuccess={onPinSuccess}
          onClearRole={ctx.onClearRole}
          user={ctx.user}
          onSignIn={ctx.onSignIn}
          onSignOut={ctx.onSignOut}
          onClose={closeModal}
        />
      )}
      {modal.open === 'pin' && pinPurpose !== 'login' && (
        <PinModal
          title={pinTitle}
          checkPin={pinCheckFn}
          pinLoadError={pinLoadError}
          onSuccess={onPinSuccess}
          onClose={closeModal}
        />
      )}
      {modal.open === 'tournamentSwapped' && (
        <ConfirmModal
          title="Tournament changed"
          message="A new tournament was started from another device. This tab is now showing the new tournament. Reload the page to ensure everything is in sync."
          confirmLabel="Reload"
          onConfirm={() => window.location.reload()}
          onClose={closeModal}
        />
      )}
      {modal.open === 'confirmReset' && (
        <ConfirmModal
          title="Back to Setup"
          message="This will end the current tournament and reset all data. Are you sure?"
          confirmLabel="Reset"
          onConfirm={() => {
            closeModal();
            openModal('pin', { purpose: 'reset' });
          }}
          onClose={closeModal}
        />
      )}
      {modal.open === 'confirmRemoveGame' && modal.data && (
        <ConfirmModal
          title="Remove game?"
          message="This will permanently delete this game from history and recalculate standings. Cannot be undone."
          confirmLabel="Delete"
          onConfirm={onConfirmRemoveGame}
          onClose={closeModal}
        />
      )}
      {modal.open === 'confirmRevert' && modal.data?.roundNum != null && (
        <ConfirmModal
          title={`Revert to Round ${modal.data.roundNum}?`}
          message={`This will restore the tournament to the state it was in right after Round ${modal.data.roundNum} completed. All rounds played after that will be lost. This cannot be undone.`}
          confirmLabel="Revert"
          onConfirm={doRevertToRound}
          onClose={closeModal}
        />
      )}
      {modal.open === 'confirmRevertToBeginning' && (
        <ConfirmModal
          title="Revert to Beginning?"
          message="This will erase all completed rounds and return the tournament to its state before Round 1 was generated. Teams and courts will be kept. This cannot be undone."
          confirmLabel="Revert"
          onConfirm={doRevertToBeginning}
          onClose={closeModal}
        />
      )}
      {modal.open === 'tournamentSettings' && (
        <TournamentSettingsModal
          role={role}
          isOwner={isOwner}
          pins={pins}
          onAddPin={onAddPin}
          onRevokePin={onRevokePin}
          tournamentTitle={tournamentTitle}
          tournamentLocation={tournamentLocation}
          tournamentStartTime={tournamentStartTime}
          tournamentDurationMins={tournamentDurationMins}
          maxPlayers={maxPlayers}
          gamesPerTeam={gamesPerTeam}
          timerDuration={timerDuration}
          tournamentMode={tournamentMode}
          standingsTiebreakOrder={standingsTiebreakOrder}
          onStandingsTiebreakOrderChange={onStandingsTiebreakOrderChange}
          doublesRRTiebreakOrder={doublesRRTiebreakOrder}
          onDoublesRRTiebreakOrderChange={onDoublesRRTiebreakOrderChange}
          activeTeamIds={activeTeamIds}
          pausedIds={pausedIds}
          onTogglePause={onTogglePause}
          teamNameDisplay={teamNameDisplay}
          onTeamNameDisplayChange={onTeamNameDisplayChange}
          tptTeams={tptTeams}
          tptPlayers={tptPlayers}
          doublesRRPlayers={doublesRRPlayers}
          history={history}
          courtNumbers={courtNumbers}
          socialCourts={socialCourts}
          roundRobinCourts={roundRobinCourts}
          onSaveInfo={onTournamentInfoSave}
          onManageTeamsSave={onManageTeamsSave}
          onManageTPTTeamsSave={onManageTPTTeamsSave}
          onManageDoublesRRPlayersSave={onManageDoublesRRPlayersSave}
          onManageCourtsSave={onManageCourtsSave}
          onReset={() => {
            closeModal();
            openModal('pin', { purpose: 'reset' });
          }}
          onClose={closeModal}
        />
      )}
      {modal.open === 'break' && <BreakModal onStart={onBreakStart} onClose={closeModal} />}
      {modal.open === 'timerSettings' && (
        <TimerSettingsModal
          currentMins={timerDefaultMins}
          onSave={onTimerSettingsSave}
          onClose={closeModal}
        />
      )}
      {modal.open === 'exportDUPR' && (
        <ExportDUPRModal
          history={history}
          tournamentMode={tournamentMode}
          tptTeams={tptTeams}
          tptPlayers={tptPlayers}
          tptSubstitutions={tptSubstitutions}
          doublesRRPlayers={doublesRRPlayers}
          tournamentTitle={tournamentTitle}
          tournamentLocation={tournamentLocation}
          onClose={closeModal}
        />
      )}
      {modal.open === 'selectRRTeams' && (
        <SelectRoundRobinTeamsModal
          rankedTeamIds={ranked.map((t: any) => t.id)}
          tournamentCourts={courtNumbers}
          onConfirm={onStartRoundRobin}
          onClose={closeModal}
        />
      )}
      {modal.open === 'generateAdditionalGames' && (
        <GenerateAdditionalGamesModal
          onChoose={onChooseGenerateAdditionalGames}
          onClose={closeModal}
        />
      )}
      {modal.open === 'addGame' && addGameData && (
        <AddGameModal
          allTeamIds={activeTeamIds}
          defaultCourt={addGameData.defaultCourt}
          courtNumbers={courtNumbers}
          usedCourtNumbers={addGameData.usedCourts}
          usedTeamIds={addGameData.usedTeams}
          label={addGameData.label}
          onSave={(g: any) => onAddGameSave(addGameData.target, g)}
          onClose={closeModal}
        />
      )}
      {modal.open === 'presetMatch' && (
        <PresetMatchModal
          allTeamIds={activeTeamIds}
          courtNumbers={courtNumbers}
          usedTeamIds={(nextRoundPresets as any[]).flatMap((p) => [p.teamId1, p.teamId2])}
          usedCourtNumbers={(nextRoundPresets as any[]).map((p) => String(p.courtNumber))}
          onSave={onAddPreset}
          onClose={closeModal}
        />
      )}
      {modal.open === 'liveAddGame' && (
        <PresetMatchModal
          allTeamIds={activeTeamIds}
          courtNumbers={courtNumbers}
          usedTeamIds={[
            ...(round?.courts.flatMap((p) => p.map((t) => t.id)) || []),
            ...(liveAdditions as any[]).flatMap((la) => [la.teamId1, la.teamId2]),
          ]}
          usedCourtNumbers={[
            ...(round?.courts.map((_, i) => String(courtNumbers[i] ?? i + 1)) || []),
            ...(liveAdditions as any[]).map((la) => String(la.courtNumber)),
          ]}
          onSave={onAddLiveGame}
          onClose={closeModal}
        />
      )}
      {editGameTarget &&
        history[editGameTarget.ri] &&
        (() => {
          const roundEntry = history[editGameTarget.ri];
          const game = roundEntry.games[editGameTarget.gameIdx];
          const scoreOnly =
            hasPermission(role, 'canEditHistoryScores') &&
            !hasPermission(role, 'canFullEditHistory');
          const teamA = teamById(game.winnerId),
            teamB = teamById(game.loserId);
          const sideA = {
            id: game.winnerId,
            label: teamLabel(game.winnerId),
            color: teamA?.color,
            text: teamA?.text,
          };
          const sideB = {
            id: game.loserId,
            label: teamLabel(game.loserId),
            color: teamB?.color,
            text: teamB?.text,
          };
          const lockedIds = new Set(
            roundEntry.games
              .flatMap((g) => [g.winnerId, g.loserId])
              .filter((id) => id !== game.winnerId && id !== game.loserId)
          );
          return (
            <EditGameModal
              label={`Round ${roundEntry.roundNum} · Court ${game.courtNumber}`}
              sideA={sideA}
              sideB={sideB}
              scoreA0={game.winnerScore}
              scoreB0={game.loserScore}
              courtNum0={scoreOnly ? undefined : String(game.courtNumber ?? '')}
              teamPicker={
                scoreOnly
                  ? undefined
                  : { allTeamIds: activeTeamIds, getTeam: teamById, formatLabel: teamLabel }
              }
              onSave={(d: any) => {
                const teamAId = d.teamAId ?? sideA.id,
                  teamBId = d.teamBId ?? sideB.id;
                const winnerId = d.aWins ? teamAId : teamBId,
                  loserId = d.aWins ? teamBId : teamAId;
                const playingAfter = new Set([...lockedIds, teamAId, teamBId]);
                const pausedInRound = new Set(toArr(roundEntry.paused || []));
                const newBye = activeTeamIds.filter(
                  (id) => !playingAfter.has(id) && !pausedInRound.has(id)
                );
                onEditSave(editGameTarget.ri, editGameTarget.gameIdx, {
                  game: {
                    winnerId,
                    loserId,
                    winnerScore: Math.max(d.scoreA, d.scoreB),
                    loserScore: Math.min(d.scoreA, d.scoreB),
                    courtNumber: String(d.courtNum ?? game.courtNumber ?? ''),
                  },
                  newBye,
                });
              }}
              onClose={closeModal}
            />
          );
        })()}
      {editTPTGameTarget &&
        (() => {
          const { ri, mi, gi } = editTPTGameTarget;
          const h = history[ri];
          const matchup = h?.tptMatchups?.[mi];
          const teamA = matchup && tptTeams[matchup.teamAId];
          const teamB = matchup && tptTeams[matchup.teamBId];
          if (!teamA || !teamB) return null;
          const def = getTPTGamesForMatchup(teamA, teamB)[gi];
          const pName = (id: string) => playerDisplayName(tptPlayers[id]) || '?';
          const subs = tptSubstitutions[`${ri}_${mi}_${gi}`] || {};
          const sideLabel = (pids: string[]) =>
            (pids || []).filter(Boolean).map((pid: string, idx: number) => {
              const subPid = subs[pid];
              const el = subPid ? (
                <span key={idx} style={{ fontStyle: 'italic' }} title={`Sub for ${pName(pid)}`}>
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
            });
          const gameLabel = `Round ${h.roundNum} · ${gi === 0 ? 'Males' : gi === 1 ? 'Mixed #1' : 'Mixed #2'}`;
          const currentResult = matchup.games?.[gi] || null;
          const scoreA0 = currentResult
            ? currentResult.winnerTeamId === matchup.teamAId
              ? currentResult.winnerScore
              : currentResult.loserScore
            : '';
          const scoreB0 = currentResult
            ? currentResult.winnerTeamId === matchup.teamBId
              ? currentResult.winnerScore
              : currentResult.loserScore
            : '';
          const sideA = {
            id: matchup.teamAId,
            label: sideLabel(def?.sideA),
            color: teamA.color,
            text: teamA.text,
          };
          const sideB = {
            id: matchup.teamBId,
            label: sideLabel(def?.sideB),
            color: teamB.color,
            text: teamB.text,
          };
          return (
            <EditGameModal
              label={gameLabel}
              sideA={sideA}
              sideB={sideB}
              scoreA0={scoreA0}
              scoreB0={scoreB0}
              onSave={({ scoreA, scoreB, aWins }: { scoreA: number; scoreB: number; aWins: boolean }) =>
                onEditTPTSave(ri, mi, gi, {
                  winnerTeamId: aWins ? matchup.teamAId : matchup.teamBId,
                  loserTeamId: aWins ? matchup.teamBId : matchup.teamAId,
                  winnerScore: Math.max(scoreA, scoreB),
                  loserScore: Math.min(scoreA, scoreB),
                })
              }
              onClose={closeModal}
            />
          );
        })()}
      {editTPTSubsTarget &&
        (() => {
          const { ri, mi, gi } = editTPTSubsTarget;
          const h = history[ri];
          const matchup = h?.tptMatchups?.[mi];
          const teamA = matchup && tptTeams[matchup.teamAId];
          const teamB = matchup && tptTeams[matchup.teamBId];
          if (!teamA || !teamB) return null;
          const def = getTPTGamesForMatchup(teamA, teamB)[gi];
          const gameLabel = `Round ${h.roundNum} · ${gi === 0 ? 'Males' : gi === 1 ? 'Mixed #1' : 'Mixed #2'}`;
          const currentSubs = tptSubstitutions[`${ri}_${mi}_${gi}`] || {};
          return (
            <EditTPTSubsModal
              gameLabel={gameLabel}
              teamA={teamA}
              teamB={teamB}
              gameDef={def}
              tptPlayers={tptPlayers}
              currentSubs={currentSubs}
              onSave={(subs: Record<string, string>) => onSetTPTSubstitution(ri, mi, gi, subs)}
              onClose={closeModal}
            />
          );
        })()}
      {editDoublesRRGameTarget &&
        (() => {
          const { ri, ci } = editDoublesRRGameTarget;
          const h = history[ri];
          const court = h?.doublesRRCourts?.[ci];
          if (!court) return null;
          const presA = buildSidePresentation(court.teamA!, doublesRRPlayers, teamNameDisplay);
          const presB = buildSidePresentation(court.teamB!, doublesRRPlayers, teamNameDisplay);
          const sideA = { id: presA.id, label: presA.name, color: presA.color, text: presA.text };
          const sideB = { id: presB.id, label: presB.name, color: presB.color, text: presB.text };
          const currentResult = court.winnerIds ? court : null;
          const aIsWinner = currentResult
            ? currentResult.winnerIds.join(',') === court.teamA!.join(',')
            : null;
          const scoreA0 = currentResult
            ? aIsWinner
              ? currentResult.winnerScore
              : currentResult.loserScore
            : '';
          const scoreB0 = currentResult
            ? aIsWinner
              ? currentResult.loserScore
              : currentResult.winnerScore
            : '';
          return (
            <EditGameModal
              label={`Round ${h.roundNum} · Court ${ci + 1}`}
              sideA={sideA}
              sideB={sideB}
              scoreA0={scoreA0}
              scoreB0={scoreB0}
              onSave={({ scoreA, scoreB, aWins }: { scoreA: number; scoreB: number; aWins: boolean }) =>
                onEditDoublesRRSave(ri, ci, {
                  winnerIds: aWins ? court.teamA : court.teamB,
                  loserIds: aWins ? court.teamB : court.teamA,
                  winnerScore: Math.max(scoreA, scoreB),
                  loserScore: Math.min(scoreA, scoreB),
                })
              }
              onClose={closeModal}
            />
          );
        })()}
      {editActiveCourtIdx !== null && round && (
        <EditActiveCourtModal
          courtIdx={editActiveCourtIdx}
          courtNumbers={courtNumbers}
          currentCourts={round.courts}
          allTeamIds={activeTeamIds}
          hasPending={!!pending[courtKey(editActiveCourtIdx)]}
          onSave={onEditActiveCourt}
          onClose={closeModal}
        />
      )}
      {editLiveIdxVal !== null &&
        (liveAdditions as any[])[editLiveIdxVal] &&
        (() => {
          const la = (liveAdditions as any[])[editLiveIdxVal];
          return (
            <EditActiveCourtModal
              courtIdx={0}
              courtNumbers={[la.courtNumber]}
              currentCourts={[
                [
                  tournamentTeams.find((t) => t.id === la.teamId1),
                  tournamentTeams.find((t) => t.id === la.teamId2),
                ] as [any, any],
              ]}
              allTeamIds={activeTeamIds}
              hasPending={!!pending[`live_${editLiveIdxVal}`]}
              onSave={onEditLiveAddition}
              onClose={closeModal}
            />
          );
        })()}
    </>
  );
}
