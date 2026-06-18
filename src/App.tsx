import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { TeamRegistryContext } from './context/TeamRegistryContext';
import { setModuleRegistry } from './constants';
import { writeTournamentMeta, createTournamentRepo } from './firebase';
import { RepoProvider, useRepo } from './state/RepoProvider';
import { TournamentProvider, useTournamentState } from './state/TournamentProvider';
import { ModalProvider, useModal } from './state/ModalProvider';
import { AppCtx } from './state/AppCtx';
import { hasPermission } from './roleConfig';
import { rerank } from './algorithms/standings';
import { DEFAULT_DOUBLES_RR_TIEBREAK_ORDER } from './algorithms/doublesRR';
import { MODES } from './modes';
import useOnline from './hooks/useOnline';
import { useFirebaseSync } from './hooks/useFirebaseSync';
import { useRoundTimer } from './hooks/useRoundTimer';
import { useRoundManagement } from './hooks/useRoundManagement';
import { useTPTState } from './hooks/useTPTState';
import { useTPTManagement } from './hooks/useTPTManagement';
import { useDoublesRRState } from './hooks/useDoublesRRState';
import { useDoublesRRManagement } from './hooks/useDoublesRRManagement';
import { useAppChrome } from './hooks/useAppChrome';
import { useAccessControl } from './hooks/useAccessControl';
import { useSnapshotHandler } from './hooks/useSnapshotHandler';
import { useTournamentLifecycle } from './hooks/useTournamentLifecycle';
import { useHistoryEditing } from './hooks/useHistoryEditing';
import { useCourtManagement } from './hooks/useCourtManagement';
import SetupScreen from './setup/SetupScreen';
import MatchesTab from './tabs/MatchesTab';
import PlayTab from './tabs/PlayTab';
import ModalRoot from './modals/ModalRoot';
import AppHeader from './components/AppHeader';
import StatusBanners from './components/StatusBanners';

export default function App(props: any) {
  const repo = useMemo(
    () => createTournamentRepo(props.clubId ?? '', props.tournamentId ?? '__creating__'),
    [props.clubId, props.tournamentId]
  );
  return (
    <RepoProvider repo={repo}>
      <TournamentProvider>
        <ModalProvider>
          <AppInner {...props} />
        </ModalProvider>
      </TournamentProvider>
    </RepoProvider>
  );
}

function AppInner({
  clubId = null,
  tournamentId = null,
  initialRole = null,
  isOwner = false,
  user = null,
  onSignIn = null,
  onSignOut = null,
  onCreated = null,
  onBack = null,
}) {
  const repo = useRepo();
  const { state, set, stateRef } = useTournamentState();
  const { modal, openModal, closeModal } = useModal();
  const online = useOnline();

  const {
    tournamentTitle,
    tournamentLocation,
    tournamentStartTime,
    tournamentDurationMins,
    tournamentTeams,
    timerDuration,
    history,
    round,
    roundNum,
    pending,
    roundComplete,
    pausedIds,
    tournamentMode,
    liveAdditions,
    tournamentFinished,
    finalRound,
    targetRounds,
    teamNameDisplay,
    standingsTiebreakOrder,
  } = state;

  // ── Non-reducer state ─────────────────────────────────────────────────────
  const [phase, setPhase] = useState('loading');
  const [standings, setStandings] = useState<any[]>([]);
  const [roundKey, setRoundKey] = useState(0);
  const [breakMode, setBreakMode] = useState<string | null>(null);
  const pendingRef = useRef<Record<string, any>>({});
  const roundCompletingRef = useRef(false);
  const [activeTab, setActiveTab] = useState('play');

  useEffect(() => {
    document.title = tournamentTitle;
  }, [tournamentTitle]);
  useEffect(() => {
    setModuleRegistry(tournamentTeams);
  }, [tournamentTeams]);
  useEffect(() => {
    if (activeTab === 'timer') setActiveTab('play');
  }, [activeTab]);
  useEffect(() => {
    if (targetRounds <= 0 || finalRound) return;
    const nextRN = roundNum === 0 ? 1 : roundNum + 1;
    if (nextRN === targetRounds) {
      set('finalRound', true);
      repo.pushAtomicUpdate({ finalRound: true }, setFirebaseError);
    }
  }, [targetRounds, roundNum]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── TPT & Doubles RR state ────────────────────────────────────────────────
  const {
    tptTeams,
    setTPTTeams,
    tptPlayers,
    setTPTPlayers,
    tptSchedule,
    setTPTSchedule,
    tptResults,
    setTPTResults,
    tptSubstitutions,
    setTPTSubstitutions,
    tptResultsRef,
    tptScheduleRef,
    tptRoundCompletingRef,
    tptSubstitutionsRef,
  } = useTPTState();
  const {
    doublesRRPlayers,
    setDoublesRRPlayers,
    doublesRRSchedule,
    setDoublesRRSchedule,
    doublesRRResults,
    setDoublesRRResults,
    doublesRRPlayersRef,
    doublesRRResultsRef,
    doublesRRScheduleRef,
    doublesRRRoundCompletingRef,
  } = useDoublesRRState();
  const [doublesRRTiebreakOrder, setDoublesRRTiebreakOrder] = useState(
    DEFAULT_DOUBLES_RR_TIEBREAK_ORDER
  );

  // ── Access control, error state & gatedUpdate ─────────────────────────────
  const {
    role,
    setRole,
    roleRef,
    firebaseError,
    setFirebaseError,
    firebaseErrorPersist,
    retrySnapshotRef,
    setCriticalError,
    dismissError,
    retryWrite,
    gatedUpdate,
    handleAddPin,
    handleRevokePin,
  } = useAccessControl({ initialRole, isOwner });

  const effectiveRole = role ?? (isOwner ? 'admin' : null);
  useEffect(() => {
    roleRef.current = effectiveRole;
  }, [effectiveRole, roleRef]);
  const isAdmin = hasPermission(effectiveRole as any, 'canResetTournament');

  // ── Timer ─────────────────────────────────────────────────────────────────
  const breakModeRef = useRef<string | null>(null);
  useEffect(() => {
    breakModeRef.current = breakMode;
  }, [breakMode]);
  const {
    timerRunning,
    timerSecsLeft,
    timerAlarmed,
    setTimerAlarmed,
    timerRunningRef,
    timerStartedAtRef,
    timerPausedSecsRef,
    timerDurationRef,
    computeSecsLeft,
    applyTimerState,
    resetTimer,
    timerToggle,
  } = useRoundTimer({ timerDuration, roleRef, onFirebaseError: setFirebaseError, repo });

  // ── Firebase refs ─────────────────────────────────────────────────────────
  const tournamentIdRef = useRef(tournamentId);
  const lastSeenRoundNum = useRef(-1);
  const historyLengthRef = useRef(0);
  const metaSyncedRef = useRef(false);
  const effectiveRankedRef = useRef<any[]>([]);

  // ── Snapshot handler & pending results ────────────────────────────────────
  const updateAllStates = useSnapshotHandler({
    clubId,
    lastSeenRoundNum,
    tournamentIdRef,
    metaSyncedRef,
    pendingRef,
    setStandings,
    setBreakMode,
    setPhase,
    setRoundKey,
    applyTimerState,
    onFirebaseError: setFirebaseError,
    setTPTTeams,
    setTPTPlayers,
    setTPTSchedule,
    setTPTResults,
    setTPTSubstitutions,
    tptResultsRef,
    tptScheduleRef,
    tptSubstitutionsRef,
    setDoublesRRPlayers,
    setDoublesRRSchedule,
    setDoublesRRResults,
    setDoublesRRTiebreakOrder,
    doublesRRPlayersRef,
    doublesRRScheduleRef,
    doublesRRResultsRef,
  });

  const handlePendingResults = useCallback(
    (d: Record<string, any> | null) => {
      const m = d ?? {};
      pendingRef.current = m;
      set('pending', m);
    },
    [set]
  );

  // ── Firebase sync ─────────────────────────────────────────────────────────
  const {
    firebaseConnected,
    presence,
    pins,
    pinsLoaded,
    pinsLoadError,
    backupRoundNums,
    setBackupRoundNums,
  } = useFirebaseSync({
    role: effectiveRole,
    repo,
    roleRef,
    tournamentIdRef,
    onSnapshot: updateAllStates,
    onPendingResults: handlePendingResults,
    onPhaseTimeout: useCallback(() => setPhase('waiting'), []),
    onTournamentSwap: useCallback(() => openModal('tournamentSwapped'), [openModal]),
    onFirebaseError: setFirebaseError,
  });

  // ── Round management ──────────────────────────────────────────────────────
  const {
    handleResult,
    handleLiveResult,
    handleUndoResult,
    handleUndoLiveResult,
    handleGenerateRound,
    handleRegenerateRound,
    doRegenerateRound,
    doCancelRound,
    handleExitRoundRobin,
    doExitRoundRobin,
    handleStartRoundRobin,
    handleGenerateAdditionalRoundRobin,
    handleRRMatchResult,
    handleUndoRRMatchResult,
    rrMatchKey,
  } = useRoundManagement({
    stateRef,
    pending,
    round,
    roundComplete,
    liveAdditions,
    history,
    phase,
    roleRef,
    breakModeRef,
    timerRunningRef,
    timerStartedAtRef,
    timerPausedSecsRef,
    timerDurationRef,
    pendingRef,
    roundCompletingRef,
    lastSeenRoundNum,
    historyLengthRef,
    set,
    setStandings,
    setRoundKey,
    setTimerAlarmed,
    setBackupRoundNums,
    applyTimerState,
    computeSecsLeft,
    setCriticalError,
    onFirebaseError: setFirebaseError,
    onRequirePin: useCallback((purpose) => openModal('pin', { purpose }), [openModal]),
    closeModal,
    repo,
  });

  // ── Derived standings ─────────────────────────────────────────────────────
  const ranked = useMemo(
    () => rerank(standings, standingsTiebreakOrder, history),
    [standings, standingsTiebreakOrder, history]
  );
  const effectiveRanked = useMemo(
    () =>
      MODES[tournamentMode ?? 'swiss'].buildStandings({
        standings,
        standingsTiebreakOrder,
        history,
        tptTeams,
        tptPlayers,
        tptSchedule,
        tptResults,
        tptSubstitutions,
        doublesRRPlayers,
        doublesRRTiebreakOrder,
      }),
    [
      tournamentMode,
      standings,
      standingsTiebreakOrder,
      history,
      tptTeams,
      tptPlayers,
      tptSchedule,
      tptResults,
      tptSubstitutions,
      doublesRRPlayers,
      doublesRRTiebreakOrder,
    ]
  );
  effectiveRankedRef.current = effectiveRanked;

  // ── Mode management hooks ─────────────────────────────────────────────────
  const { handleStartTPT, handleTPTResult, handleUndoTPTResult, handleManageTPTTeamsSave } =
    useTPTManagement({
      stateRef,
      tournamentIdRef,
      lastSeenRoundNum,
      pendingRef,
      roleRef,
      tptResultsRef,
      tptScheduleRef,
      tptRoundCompletingRef,
      tptSubstitutionsRef,
      setTPTTeams,
      setTPTPlayers,
      setTPTSchedule,
      setTPTResults,
      setTPTSubstitutions,
      set,
      setRole,
      setStandings,
      setRoundKey,
      setTimerAlarmed,
      setPhase,
      setActiveTab,
      applyTimerState,
      onFirebaseError: setFirebaseError,
      closeModal,
      clubId,
      repo,
    });
  const {
    handleStartDoublesRR,
    handleDoublesRRResult,
    handleUndoDoublesRRResult,
    handleGenerateAdditionalDoublesRR,
    handleManageDoublesRRPlayersSave,
  } = useDoublesRRManagement({
    stateRef,
    tournamentIdRef,
    lastSeenRoundNum,
    pendingRef,
    roleRef,
    doublesRRPlayersRef,
    doublesRRResultsRef,
    doublesRRScheduleRef,
    doublesRRRoundCompletingRef,
    setDoublesRRPlayers,
    setDoublesRRSchedule,
    setDoublesRRResults,
    set,
    setRole,
    setStandings,
    setRoundKey,
    setTimerAlarmed,
    setPhase,
    setActiveTab,
    applyTimerState,
    onFirebaseError: setFirebaseError,
    closeModal,
    clubId,
    repo,
  });

  // ── Extracted handler hooks ───────────────────────────────────────────────
  const {
    handleStart,
    doReset,
    doRevertToRound,
    doRevertToBeginning,
    handleBreakStart,
    handleBreakEnd,
    handleFinishTournament,
    handleResumeTournament,
  } = useTournamentLifecycle({
    clubId,
    onCreated,
    effectiveRankedRef,
    tournamentIdRef,
    lastSeenRoundNum,
    historyLengthRef,
    pendingRef,
    setStandings,
    setBreakMode,
    setPhase,
    setActiveTab,
    setRole,
    setRoundKey,
    setTimerAlarmed,
    setBackupRoundNums,
    applyTimerState,
    resetTimer,
    computeSecsLeft,
    gatedUpdate,
    onFirebaseError: setFirebaseError,
    updateAllStates,
    setTPTTeams,
    setTPTPlayers,
    setTPTSchedule,
    setTPTResults,
    setTPTSubstitutions,
    tptResultsRef,
    tptScheduleRef,
    tptRoundCompletingRef,
    tptSubstitutionsRef,
    setDoublesRRPlayers,
    setDoublesRRSchedule,
    setDoublesRRResults,
    doublesRRPlayersRef,
    doublesRRResultsRef,
    doublesRRScheduleRef,
    doublesRRRoundCompletingRef,
  });

  const {
    handleEditSave,
    handleTPTHistoryEditSave,
    handleSetTPTSubstitution,
    handleDoublesRRHistoryEditSave,
    handleAddGameSave,
    handleEditCourtNumber,
    handleConfirmRemoveGame,
    handleTimerSettingsSave,
    handleAddPreset,
    handleAddLiveGame,
  } = useHistoryEditing({
    gatedUpdate,
    setStandings,
    onFirebaseError: setFirebaseError,
    tptSubstitutionsRef,
    setTPTSubstitutions,
    roleRef,
  });

  const {
    handleManageTeamsSave,
    handleTeamNameDisplayChange,
    handleManageCourtsSave,
    handleTogglePause,
    handleEditActiveCourt,
    handleEditLiveAddition,
    handleRemoveActiveCourt,
    handleRemoveLiveAddition,
    handleRemoveActiveRoundExtra,
  } = useCourtManagement({
    clubId,
    tournamentIdRef,
    gatedUpdate,
    setStandings,
    onFirebaseError: setFirebaseError,
    pendingRef,
    roleRef,
  });

  // ── Chrome (header + swipe) ───────────────────────────────────────────────
  const {
    headerHidden,
    setHeaderHidden,
    headerRef,
    headerHeight,
    handleSwipeStart,
    handleSwipeEnd,
  } = useAppChrome({ setActiveTab });

  // ── Small inline handlers ─────────────────────────────────────────────────
  const handlePinSuccess = useCallback(
    (matchedRole: string | null) => {
      const { purpose, ...payload } = modal.data || {};
      if (purpose === 'login') {
        setRole(matchedRole);
      } else if (purpose === 'reset') {
        doReset();
      } else if (purpose === 'regenerate') {
        doRegenerateRound();
      } else if (purpose === 'exitRR') {
        doExitRoundRobin();
      } else if (purpose === 'cancelRound') {
        doCancelRound();
      } else if (purpose === 'revertToRound') {
        openModal('confirmRevert', { roundNum: payload.revertTarget });
        return;
      } else if (purpose === 'revertToBeginning') {
        openModal('confirmRevertToBeginning');
        return;
      } else if (purpose === 'removeGame' && payload.removeGameTarget) {
        openModal('confirmRemoveGame', payload.removeGameTarget);
        return;
      } else if (purpose === 'removeActiveCourt' && payload.removeActiveCourtIdx !== null) {
        if (!handleRemoveActiveCourt(payload.removeActiveCourtIdx)) {
          closeModal();
          return;
        }
      } else if (purpose === 'removeLiveAddition' && payload.removeLiveIdx !== null) {
        handleRemoveLiveAddition(payload.removeLiveIdx);
      } else if (
        purpose === 'removeActiveRoundExtra' &&
        payload.removeActiveRoundExtraIdx !== null
      ) {
        handleRemoveActiveRoundExtra(payload.removeActiveRoundExtraIdx);
      }
      closeModal();
    },
    [
      modal.data,
      setRole,
      doReset,
      doRegenerateRound,
      doExitRoundRobin,
      doCancelRound,
      openModal,
      closeModal,
      handleRemoveActiveCourt,
      handleRemoveLiveAddition,
      handleRemoveActiveRoundExtra,
    ]
  );

  const handleDoublesRRTiebreakOrderChange = useCallback(
    (order: string[]) => {
      setDoublesRRTiebreakOrder(order);
      gatedUpdate('canEditTeams', { doublesRRTiebreakOrder: order });
    },
    [gatedUpdate]
  );

  const handleStandingsTiebreakOrderChange = useCallback(
    (order: string[]) => {
      set('standingsTiebreakOrder', order as any);
      gatedUpdate('canEditTeams', { standingsTiebreakOrder: order });
    },
    [set, gatedUpdate]
  );

  const handleTournamentInfoSave = useCallback(
    ({ title, location, startTime, durationMins, maxPlayers: mp = 0 }: { title: string; location: string; startTime: string; durationMins: number; maxPlayers?: number }) => {
      const t = title.trim() || 'Tournament';
      set('tournamentTitle', t);
      set('tournamentLocation', location);
      set('tournamentStartTime', startTime);
      set('tournamentDurationMins', durationMins);
      set('maxPlayers', mp);
      gatedUpdate('canEditTeams', {
        tournamentTitle: t,
        tournamentLocation: location,
        tournamentStartTime: startTime,
        tournamentDurationMins: durationMins,
        maxPlayers: mp,
      });
      if (clubId && tournamentIdRef.current)
        writeTournamentMeta(clubId, tournamentIdRef.current, {
          title: t,
          maxPlayers: mp,
          location,
          startTime,
        });
    },
    [set, gatedUpdate, clubId]
  );

  const handleChooseAdditionalGames = useCallback(
    (mode: string) => {
      if (stateRef.current.tournamentMode === 'doublesrr') handleGenerateAdditionalDoublesRR(mode);
      else handleGenerateAdditionalRoundRobin(mode);
    },
    [stateRef, handleGenerateAdditionalDoublesRR, handleGenerateAdditionalRoundRobin]
  );

  const handleSetFinalRound = useCallback(
    (v: boolean) => {
      set('finalRound', v);
      gatedUpdate('canSetFinalRound', { finalRound: v });
    },
    [set, gatedUpdate]
  );

  const handleRemovePreset = useCallback(
    (pi: number) => {
      const np = stateRef.current.nextRoundPresets.filter((_, i) => i !== pi);
      set('nextRoundPresets', np);
      gatedUpdate('canPresetMatch', { nextRoundPresets: np });
    },
    [stateRef, set, gatedUpdate]
  );

  // ── AppCtx value ──────────────────────────────────────────────────────────
  const appCtxValue = {
    user,
    onSignIn,
    onSignOut,
    onClearRole: () => setRole(null),
    pins,
    pinsLoaded,
    pinsLoadError,
    isOwner,
    isAdmin,
    effectiveRole,
    standings,
    ranked,
    effectiveRanked,
    breakMode,
    roundKey,
    doublesRRTiebreakOrder,
    backupRoundNums,
    tptTeams,
    tptPlayers,
    tptSchedule,
    tptResults,
    tptSubstitutions,
    doublesRRPlayers,
    doublesRRSchedule,
    doublesRRResults,
    timerRunning,
    timerSecsLeft,
    timerAlarmed,
    timerDuration,
    handleStart,
    handleStartTPT,
    handleStartDoublesRR,
    handleResult,
    handleLiveResult,
    handleUndoResult,
    handleUndoLiveResult,
    handleGenerateRound,
    handleRegenerateRound,
    doCancelRound,
    handleRRMatchResult,
    handleUndoRRMatchResult,
    rrMatchKey,
    handleTPTResult,
    handleUndoTPTResult,
    handleDoublesRRResult,
    handleUndoDoublesRRResult,
    handleExitRoundRobin,
    doExitRoundRobin,
    onStartRoundRobin: handleStartRoundRobin,
    handleGenerateAdditionalRoundRobin,
    handleGenerateAdditionalDoublesRR,
    onPinSuccess: handlePinSuccess,
    onAddPin: handleAddPin,
    onRevokePin: handleRevokePin,
    doRevertToRound,
    doRevertToBeginning,
    onBreakStart: handleBreakStart,
    onBreakEnd: handleBreakEnd,
    onConfirmRemoveGame: handleConfirmRemoveGame,
    onTimerSettingsSave: handleTimerSettingsSave,
    onTimerToggle: timerToggle,
    onTimerRestart: () => resetTimer(timerDuration),
    onTimerSettings: () => openModal('timerSettings'),
    onDoublesRRTiebreakOrderChange: handleDoublesRRTiebreakOrderChange,
    onStandingsTiebreakOrderChange: handleStandingsTiebreakOrderChange,
    onTournamentInfoSave: handleTournamentInfoSave,
    onTeamNameDisplayChange: handleTeamNameDisplayChange,
    onTogglePause: handleTogglePause,
    onManageTeamsSave: handleManageTeamsSave,
    onManageTPTTeamsSave: handleManageTPTTeamsSave,
    onManageCourtsSave: handleManageCourtsSave,
    onManageDoublesRRPlayersSave: handleManageDoublesRRPlayersSave,
    onChooseGenerateAdditionalGames: handleChooseAdditionalGames,
    onAddGameSave: handleAddGameSave,
    onAddPreset: handleAddPreset,
    onAddLiveGame: handleAddLiveGame,
    onEditSave: handleEditSave,
    onEditActiveCourt: handleEditActiveCourt,
    onEditLiveAddition: handleEditLiveAddition,
    onEditTPTSave: handleTPTHistoryEditSave,
    onSetTPTSubstitution: handleSetTPTSubstitution,
    onEditDoublesRRSave: handleDoublesRRHistoryEditSave,
    onReset: doReset,
    onFinishTournament: handleFinishTournament,
    onResumeTournament: handleResumeTournament,
    onContinueSwissAfterRR: () => doExitRoundRobin('completed'),
    onEditCourtNumber: handleEditCourtNumber,
    canEditScores:
      hasPermission(effectiveRole as any, 'canEditHistoryScores') ||
      hasPermission(effectiveRole as any, 'canFullEditHistory'),
    canDeleteGame: hasPermission(effectiveRole as any, 'canDeleteHistoryGame'),
    canFullEdit: hasPermission(effectiveRole as any, 'canFullEditHistory'),
    setFinalRound: handleSetFinalRound,
    onRemovePreset: handleRemovePreset,
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <AppCtx.Provider value={appCtxValue}>
      <TeamRegistryContext.Provider value={{ registry: tournamentTeams, teamNameDisplay }}>
        <div
          className="min-h-screen"
          style={{ background: '#fff', fontFamily: "'Trebuchet MS',sans-serif", color: '#1e293b' }}
        >
          <ModalRoot />
          <AppHeader
            headerRef={headerRef}
            headerHidden={headerHidden}
            onShowHeader={() => setHeaderHidden(false)}
            onHideHeader={() => setHeaderHidden(true)}
            tournamentTitle={tournamentTitle}
            tournamentLocation={tournamentLocation}
            tournamentStartTime={tournamentStartTime}
            tournamentDurationMins={tournamentDurationMins}
            firebaseConnected={firebaseConnected}
            phase={phase}
            role={effectiveRole}
            presence={presence}
            online={online}
            user={user}
            isOwner={isOwner}
            onLoginToggle={() => openModal('pin', { purpose: 'login' })}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onBack={onBack}
          />
          <StatusBanners
            firebaseError={firebaseError}
            firebaseErrorPersist={firebaseErrorPersist}
            canRetry={!!retrySnapshotRef.current}
            onRetry={retryWrite}
            onDismissError={dismissError}
          />
          <div
            onTouchStart={phase === 'play' ? handleSwipeStart : undefined}
            onTouchEnd={phase === 'play' ? handleSwipeEnd : undefined}
            style={{
              maxWidth: 720,
              margin: '0 auto',
              padding: `${headerHidden ? 44 : headerHeight + 8}px clamp(12px,3vw,20px) clamp(16px,3vw,24px)`,
            }}
          >
            {(phase === 'loading' || phase === 'waiting') && !isAdmin && (
              <div
                className="rounded-2xl p-10 text-center flex flex-col items-center gap-4"
                style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.08)' }}
              >
                {phase === 'loading' ? (
                  <>
                    <div className="text-3xl">🔄</div>
                    <p className="text-slate-500 text-sm">Connecting to tournament…</p>
                  </>
                ) : (
                  <>
                    <div className="text-3xl">🏓</div>
                    <p className="text-slate-700 font-bold">No active tournament</p>
                    <p className="text-slate-500 text-sm">Waiting for the admin to start a game.</p>
                  </>
                )}
              </div>
            )}
            {(phase === 'loading' || phase === 'waiting' || phase === 'setup') && isAdmin && (
              <SetupScreen
                onStart={handleStart}
                onStartTPT={handleStartTPT}
                onStartDoublesRR={handleStartDoublesRR}
              />
            )}
            {phase === 'play' && (
              <>
                {activeTab === 'play' && <PlayTab />}
                {activeTab === 'standings' &&
                  (() => {
                    const ModeStandingsTab = MODES[tournamentMode ?? 'swiss'].StandingsTab;
                    return (
                      <ModeStandingsTab
                        ranked={effectiveRanked}
                        pausedIds={pausedIds}
                        tptTeams={tptTeams}
                        tptPlayers={tptPlayers}
                        tptSchedule={tptSchedule}
                        tptResults={tptResults}
                        tptSubstitutions={tptSubstitutions}
                        doublesRRPlayers={doublesRRPlayers}
                        doublesRRTiebreakOrder={doublesRRTiebreakOrder}
                        onDoublesRRTiebreakOrderChange={handleDoublesRRTiebreakOrderChange}
                        standingsTiebreakOrder={standingsTiebreakOrder}
                        isAdmin={isAdmin}
                        tournamentFinished={tournamentFinished}
                      />
                    );
                  })()}
                {activeTab === 'matches' && <MatchesTab />}
              </>
            )}
          </div>
        </div>
      </TeamRegistryContext.Provider>
    </AppCtx.Provider>
  );
}
