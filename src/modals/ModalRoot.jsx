import { ROLES, hasPermission } from '../roleConfig';
import { courtKey } from '../constants';
import { getTPTGamesForMatchup } from '../algorithms/threePlayerTeam';
import PinModal from './PinModal';
import ConfirmModal from './ConfirmModal';
import BreakModal from './BreakModal';
import TimerSettingsModal from './TimerSettingsModal';
import SelectRoundRobinTeamsModal from './SelectRoundRobinTeamsModal';
import GenerateAdditionalGamesModal from './GenerateAdditionalGamesModal';
import AddGameModal from './AddGameModal';
import PresetMatchModal from './PresetMatchModal';
import EditGameModal from './EditGameModal';
import EditTPTGameModal from './EditTPTGameModal';
import EditDoublesRRGameModal from './EditDoublesRRGameModal';
import EditActiveCourtModal from './EditActiveCourtModal';
import ExportDUPRModal from './ExportDUPRModal';
import TournamentSettingsModal from './TournamentSettingsModal';
import ClubMembersPanel from '../components/ClubMembersPanel';

// Renders whichever modal `modal.open` selects, plus the PIN-purpose title/check
// derivation. All actions are passed in as handlers — no business logic lives here.
export default function ModalRoot({
  modal, openModal, closeModal,
  // pin
  pins, pinsLoaded, pinsLoadError, role, onPinSuccess,
  // confirm / break / timer
  doRevertToRound, doRevertToBeginning, onBreakStart, onConfirmRemoveGame, timerDefaultMins, onTimerSettingsSave,
  // shared tournament state
  isAdmin, tournamentMode, activeTeamIds, tournamentTeams, pausedIds,
  courtNumbers, socialCourts, roundRobinCourts, ranked,
  round, liveAdditions, nextRoundPresets, history, pending,
  tptTeams, tptPlayers, tournamentTitle,
  doublesRRPlayers, doublesRRTiebreakOrder, onDoublesRRTiebreakOrderChange,
  standingsTiebreakOrder, onStandingsTiebreakOrderChange,
  tournamentLocation, tournamentStartTime, tournamentDurationMins, maxPlayers, onTournamentInfoSave,
  teamNameDisplay, onTeamNameDisplayChange,
  clubId,
  // handlers
  onTogglePause, onManageTeamsSave, onManageTPTTeamsSave, onManageCourtsSave,
  onManageDoublesRRPlayersSave,
  onStartRoundRobin, onChooseGenerateAdditionalGames, addGameData, onAddGameSave, onAddPreset, onAddLiveGame,
  onEditSave, onEditActiveCourt, onEditLiveAddition, onEditTPTSave, onEditDoublesRRSave,
}) {
  const pinPurpose = modal.open === 'pin' ? modal.data?.purpose : null;
  const pinTitle = pinPurpose === 'login' ? 'Login'
    : pinPurpose === 'reset' ? 'PIN required to reset'
    : pinPurpose === 'exitRR' ? 'PIN required to exit Round Robin'
    : pinPurpose === 'cancelRound' ? 'PIN required to cancel round'
    : pinPurpose === 'regenerate' ? 'PIN required to regenerate round'
    : pinPurpose === 'revertToRound' ? `PIN required to revert to Round ${modal.data?.revertTarget}`
    : pinPurpose?.startsWith('remove') ? 'PIN required to remove'
    : 'PIN required';

  const pinCheckFn = (() => {
    if (!pinPurpose) return null;
    if (pinPurpose === 'login') {
      if (ROLES.some(r => !pinsLoaded[r.id])) return null;
      return (hash) => { for (const r of ROLES) { if (pins[r.id] && hash === pins[r.id]) return r.id; } return null; };
    }
    const selfAuth  = pinPurpose === 'exitRR' && hasPermission(role, 'canExitRRWithOwnPin');
    const pinRoleId = selfAuth ? role : 'admin';
    if (!pinsLoaded[pinRoleId]) return null;
    return (hash) => (pins[pinRoleId] && hash === pins[pinRoleId]) ? pinRoleId : null;
  })();
  const pinLoadError = pinPurpose === 'login'
    ? ROLES.some(r => pinsLoadError[r.id])
    : !!(pinsLoadError[pinPurpose === 'exitRR' && hasPermission(role, 'canExitRRWithOwnPin') ? role : 'admin']);

  const editGameTarget     = modal.open === 'editGame'        ? modal.data : null;
  const editTPTGameTarget  = modal.open === 'editTPTGame'     ? modal.data : null;
  const editDoublesRRGameTarget = modal.open === 'editDoublesRRGame' ? modal.data : null;
  const editActiveCourtIdx = modal.open === 'editActiveCourt' ? modal.data : null;
  const editLiveIdxVal     = modal.open === 'editLive'        ? modal.data : null;

  return (
    <>
      {modal.open === 'pin' && <PinModal title={pinTitle} checkPin={pinCheckFn} pinLoadError={pinLoadError} onSuccess={onPinSuccess} onClose={closeModal} />}
      {modal.open === 'tournamentSwapped' && <ConfirmModal title="Tournament changed" message="A new tournament was started from another device. This tab is now showing the new tournament. Reload the page to ensure everything is in sync." confirmLabel="Reload" onConfirm={() => window.location.reload()} onClose={closeModal} />}
      {modal.open === 'confirmReset' && <ConfirmModal title="Back to Setup" message="This will end the current tournament and reset all data. Are you sure?" confirmLabel="Reset" onConfirm={() => { closeModal(); openModal('pin', { purpose: 'reset' }); }} onClose={closeModal} />}
      {modal.open === 'confirmRemoveGame' && modal.data && (
        <ConfirmModal title="Remove game?" message="This will permanently delete this game from history and recalculate standings. Cannot be undone." confirmLabel="Delete" onConfirm={onConfirmRemoveGame} onClose={closeModal} />
      )}
      {modal.open === 'confirmRevert' && modal.data?.roundNum != null && (
        <ConfirmModal title={`Revert to Round ${modal.data.roundNum}?`} message={`This will restore the tournament to the state it was in right after Round ${modal.data.roundNum} completed. All rounds played after that will be lost. This cannot be undone.`} confirmLabel="Revert" onConfirm={doRevertToRound} onClose={closeModal} />
      )}
      {modal.open === 'confirmRevertToBeginning' && (
        <ConfirmModal title="Revert to Beginning?" message="This will erase all completed rounds and return the tournament to its state before Round 1 was generated. Teams and courts will be kept. This cannot be undone." confirmLabel="Revert" onConfirm={doRevertToBeginning} onClose={closeModal} />
      )}
      {modal.open === 'tournamentSettings' && (
        <TournamentSettingsModal
          role={role}
          tournamentTitle={tournamentTitle} tournamentLocation={tournamentLocation}
          tournamentStartTime={tournamentStartTime} tournamentDurationMins={tournamentDurationMins} maxPlayers={maxPlayers}
          tournamentMode={tournamentMode}
          standingsTiebreakOrder={standingsTiebreakOrder} onStandingsTiebreakOrderChange={onStandingsTiebreakOrderChange}
          doublesRRTiebreakOrder={doublesRRTiebreakOrder} onDoublesRRTiebreakOrderChange={onDoublesRRTiebreakOrderChange}
          activeTeamIds={activeTeamIds} tournamentTeams={tournamentTeams} pausedIds={pausedIds}
          onTogglePause={onTogglePause} teamNameDisplay={teamNameDisplay} onTeamNameDisplayChange={onTeamNameDisplayChange}
          tptTeams={tptTeams} tptPlayers={tptPlayers}
          doublesRRPlayers={doublesRRPlayers}
          courtNumbers={courtNumbers} socialCourts={socialCourts} roundRobinCourts={roundRobinCourts}
          onSaveInfo={onTournamentInfoSave}
          onManageTeamsSave={onManageTeamsSave} onManageTPTTeamsSave={onManageTPTTeamsSave}
          onManageDoublesRRPlayersSave={onManageDoublesRRPlayersSave} onManageCourtsSave={onManageCourtsSave}
          onReset={() => { closeModal(); openModal('pin', { purpose: 'reset' }); }}
          onManageMembers={clubId ? () => { closeModal(); openModal('clubMembers'); } : null}
          onClose={closeModal}
        />
      )}
      {modal.open === 'clubMembers' && clubId && (
        <ClubMembersPanel clubId={clubId} onClose={closeModal} />
      )}
      {modal.open === 'break' && <BreakModal onStart={onBreakStart} onClose={closeModal} />}
      {modal.open === 'timerSettings' && <TimerSettingsModal currentMins={timerDefaultMins} onSave={onTimerSettingsSave} onClose={closeModal} />}
      {modal.open === 'exportDUPR' && (
        <ExportDUPRModal history={history} tournamentMode={tournamentMode} tptTeams={tptTeams} tptPlayers={tptPlayers}
          doublesRRPlayers={doublesRRPlayers}
          tournamentTitle={tournamentTitle} onClose={closeModal} />
      )}
      {modal.open === 'selectRRTeams' && <SelectRoundRobinTeamsModal rankedTeamIds={ranked.map(t => t.id)} tournamentCourts={courtNumbers} onConfirm={onStartRoundRobin} onClose={closeModal} />}
      {modal.open === 'generateAdditionalGames' && <GenerateAdditionalGamesModal onChoose={onChooseGenerateAdditionalGames} onClose={closeModal} />}
      {modal.open === 'addGame' && addGameData && <AddGameModal allTeamIds={activeTeamIds} defaultCourt={addGameData.defaultCourt} courtNumbers={courtNumbers} usedCourtNumbers={addGameData.usedCourts} usedTeamIds={addGameData.usedTeams} label={addGameData.label} onSave={g => onAddGameSave(addGameData.target, g)} onClose={closeModal} />}
      {modal.open === 'presetMatch' && <PresetMatchModal allTeamIds={activeTeamIds} courtNumbers={courtNumbers} usedTeamIds={nextRoundPresets.flatMap(p => [p.teamId1, p.teamId2])} usedCourtNumbers={nextRoundPresets.map(p => String(p.courtNumber))} onSave={onAddPreset} onClose={closeModal} />}
      {modal.open === 'liveAddGame' && <PresetMatchModal allTeamIds={activeTeamIds} courtNumbers={courtNumbers} usedTeamIds={[...(round?.courts.flatMap(p => p.map(t => t.id)) || []), ...liveAdditions.flatMap(la => [la.teamId1, la.teamId2])]} usedCourtNumbers={[...(round?.courts.map((_, i) => String(courtNumbers[i] ?? i + 1)) || []), ...liveAdditions.map(la => String(la.courtNumber))]} onSave={onAddLiveGame} onClose={closeModal} />}
      {editGameTarget && history[editGameTarget.ri] && <EditGameModal game={history[editGameTarget.ri].games[editGameTarget.gameIdx]} roundEntry={history[editGameTarget.ri]} allTeamIds={activeTeamIds} label={`Round ${history[editGameTarget.ri].roundNum} · Court ${history[editGameTarget.ri].games[editGameTarget.gameIdx].courtNumber}`} scoreOnly={hasPermission(role, 'canEditHistoryScores') && !hasPermission(role, 'canFullEditHistory')} onSave={d => onEditSave(editGameTarget.ri, editGameTarget.gameIdx, d)} onClose={closeModal} />}
      {editTPTGameTarget && (() => {
        const { ri, mi, gi } = editTPTGameTarget;
        const h = history[ri];
        const matchup = h?.tptMatchups?.[mi];
        const teamA = matchup && tptTeams[matchup.teamAId];
        const teamB = matchup && tptTeams[matchup.teamBId];
        if (!teamA || !teamB) return null;
        const def = getTPTGamesForMatchup(teamA, teamB)[gi];
        const pName = id => tptPlayers[id]?.name ?? '?';
        const sideALabel = (def?.sideA || []).filter(Boolean).map(pName).join(' & ');
        const sideBLabel = (def?.sideB || []).filter(Boolean).map(pName).join(' & ');
        const gameLabel = `Round ${h.roundNum} · ${gi === 0 ? 'Males' : gi === 1 ? 'Mixed #1' : 'Mixed #2'}`;
        return (
          <EditTPTGameModal
            gameLabel={gameLabel}
            sideALabel={sideALabel} sideBLabel={sideBLabel}
            teamAId={matchup.teamAId} teamBId={matchup.teamBId}
            currentResult={matchup.games?.[gi] || null}
            onSave={result => onEditTPTSave(ri, mi, gi, result)}
            onClose={closeModal}
          />
        );
      })()}
      {editDoublesRRGameTarget && (() => {
        const { ri, ci } = editDoublesRRGameTarget;
        const h = history[ri];
        const court = h?.doublesRRCourts?.[ci];
        if (!court) return null;
        const pName = id => doublesRRPlayers[id]?.name ?? '?';
        const sideALabel = (court.teamA || []).map(pName).join(' & ');
        const sideBLabel = (court.teamB || []).map(pName).join(' & ');
        const gameLabel = `Round ${h.roundNum} · Court ${ci + 1}`;
        return (
          <EditDoublesRRGameModal
            gameLabel={gameLabel}
            sideALabel={sideALabel} sideBLabel={sideBLabel}
            teamAIds={court.teamA} teamBIds={court.teamB}
            currentResult={court.winnerIds ? court : null}
            onSave={result => onEditDoublesRRSave(ri, ci, result)}
            onClose={closeModal}
          />
        );
      })()}
      {editActiveCourtIdx !== null && round && <EditActiveCourtModal courtIdx={editActiveCourtIdx} courtNumbers={courtNumbers} currentCourts={round.courts} allTeamIds={activeTeamIds} hasPending={!!pending[courtKey(editActiveCourtIdx)]} onSave={onEditActiveCourt} onClose={closeModal} />}
      {editLiveIdxVal !== null && liveAdditions[editLiveIdxVal] && <EditActiveCourtModal courtIdx={0} courtNumbers={[liveAdditions[editLiveIdxVal].courtNumber]} currentCourts={[[tournamentTeams.find(t => t.id === liveAdditions[editLiveIdxVal].teamId1), tournamentTeams.find(t => t.id === liveAdditions[editLiveIdxVal].teamId2)]]} allTeamIds={activeTeamIds} hasPending={!!pending[`live_${editLiveIdxVal}`]} onSave={onEditLiveAddition} onClose={closeModal} />}
    </>
  );
}
