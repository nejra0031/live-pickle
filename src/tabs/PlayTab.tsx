import { hasPermission } from '../roleConfig';
import TournamentFinished from './play/TournamentFinished';
import { MODES } from '../modes';
import { useTournamentState } from '../state/TournamentProvider';
import { useModal } from '../state/ModalProvider';
import { useAppCtx } from '../state/AppCtx';

// Reads tournament state and action handlers from context, assembles the props
// that the mode-specific PlaySection expects, and renders it.
export default function PlayTab() {
  const { state } = useTournamentState();
  const { openModal } = useModal();
  const ctx = useAppCtx();

  const {
    tournamentMode,
    tournamentFinished,
    round,
    roundNum,
    activeTeamIds,
    courtNumbers,
    socialCourts,
    liveAdditions,
    pending,
    pausedIds,
    finalRound,
    targetRounds,
    history,
    activeRoundExtras,
    nextRoundPresets,
    roundRobinSchedule,
    roundRobinCourts,
    roundRobinStartRoundNum,
  } = state;

  const {
    effectiveRole: role,
    effectiveRanked: ranked,
    roundKey,
    breakMode,
    tptTeams,
    tptPlayers,
    tptSchedule,
    tptResults,
    doublesRRPlayers,
    doublesRRSchedule,
    doublesRRResults,
    timerSecsLeft,
    timerDuration,
    timerRunning,
    handleResult,
    handleLiveResult,
    handleUndoResult,
    handleUndoLiveResult,
    handleRRMatchResult,
    handleUndoRRMatchResult,
    rrMatchKey,
    handleTPTResult,
    handleUndoTPTResult,
    handleDoublesRRResult,
    handleUndoDoublesRRResult,
    handleGenerateRound,
    handleRegenerateRound,
    handleExitRoundRobin,
    doExitRoundRobin,
    handleContinueSwissAfterRR: onContinueSwissAfterRR,
    onFinishTournament,
    onResumeTournament,
    onBreakEnd,
    onTimerToggle,
    onTimerRestart,
    onTimerSettings,
    setFinalRound,
    onRemovePreset,
  } = ctx;

  const isAdmin = hasPermission(role, 'canResetTournament');
  const isReferee = !isAdmin && hasPermission(role, 'canSubmitResults');

  const props = {
    tournamentFinished,
    breakMode,
    round,
    roundNum,
    tournamentMode,
    activeTeamIds,
    tptTeams,
    tptPlayers,
    tptSchedule,
    tptResults,
    onTPTResult: handleTPTResult,
    onUndoTPTResult: handleUndoTPTResult,
    doublesRRPlayers,
    doublesRRSchedule,
    doublesRRResults,
    onDoublesRRResult: handleDoublesRRResult,
    onUndoDoublesRRResult: handleUndoDoublesRRResult,
    roundRobinSchedule,
    roundRobinCourts,
    roundRobinStartRoundNum,
    courtNumbers,
    socialCourts,
    liveAdditions,
    pending,
    role,
    finalRound,
    pausedIds,
    targetRounds,
    setFinalRound,
    history,
    ranked,
    activeRoundExtras,
    nextRoundPresets,
    roundKey,
    timerSecsLeft,
    timerDuration,
    timerRunning,
    onTimerToggle,
    onTimerRestart,
    onTimerSettings,
    onResult: handleResult,
    onLiveResult: handleLiveResult,
    onRRMatchResult: handleRRMatchResult,
    onUndoRRMatchResult: handleUndoRRMatchResult,
    onGenerateRound: handleGenerateRound,
    onRegenerateRound: handleRegenerateRound,
    onReset: ctx.onReset,
    onFinishTournament,
    onResumeTournament,
    onBreakStart: () => openModal('break'),
    onBreakEnd,
    onEditActiveCourt: (idx: number) => openModal('editActiveCourt', idx),
    onRemoveActiveCourt: (idx: number) =>
      openModal('pin', { purpose: 'removeActiveCourt', removeActiveCourtIdx: idx }),
    onEditLive: (idx: number) => openModal('editLive', idx),
    onRemoveLive: (idx: number) => openModal('pin', { purpose: 'removeLiveAddition', removeLiveIdx: idx }),
    onUndoResult: handleUndoResult,
    onUndoLiveResult: handleUndoLiveResult,
    onRemovePreset,
    onRemoveExtra: (gi: number) =>
      openModal('pin', { purpose: 'removeActiveRoundExtra', removeActiveRoundExtraIdx: gi }),
    onSelectRRTeams: () => openModal('selectRRTeams'),
    onGenerateAdditionalGames: () => openModal('generateAdditionalGames'),
    onPresetMatch: () => openModal('presetMatch'),
    onLiveAddGame: () => openModal('liveAddGame'),
    onContinueSwissAfterRR,
    onExitRoundRobin: (reason: string | null | undefined) => (reason ? doExitRoundRobin(reason) : handleExitRoundRobin()),
    onCancelRound: () => openModal('pin', { purpose: 'cancelRound' }),
    onTournamentSettings: () => openModal('tournamentSettings'),
    rrMatchKey,
    isAdmin,
    isReferee,
  };

  if (tournamentFinished) return <TournamentFinished {...props} />;

  const { PlaySection } = MODES[tournamentMode] ?? MODES.swiss;
  return <PlaySection {...props} />;
}
