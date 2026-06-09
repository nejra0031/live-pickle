import { useState, useEffect, useRef, useReducer, useCallback, useMemo } from 'react';
import { TeamRegistryContext } from './context/TeamRegistryContext';
import { setModuleRegistry } from './constants';
import { courtKey } from './constants';
import { db, ref, set as fbSet, update as fbUpdate, onValue, off, get, pushSnapshot, pushAtomicUpdate, fetchBackup, clearBackups, tournamentRef } from './firebase';
import { hasPermission } from './roleConfig';
import { normaliseSnapshot } from './normalise';
import { mkStandings, rerank, rebuildStandings } from './algorithms/standings';
import { buildSnapshot, snapshotToState } from './snapshot';
import { reindexPendingAfterRemoval } from './pending';
import { generateRound } from './algorithms/pairing';
import { generateRoundRobinSchedule } from './algorithms/roundRobin';
import { buildTPTStandings } from './algorithms/threePlayerTeam';
import { buildDoublesRRStandings, DEFAULT_DOUBLES_RR_TIEBREAK_ORDER } from './algorithms/doublesRR';
import useOnline from './hooks/useOnline';
import { useFirebaseSync } from './hooks/useFirebaseSync';
import { useRoundTimer } from './hooks/useRoundTimer';
import { useRoundManagement } from './hooks/useRoundManagement';
import { useModalState } from './hooks/useModalState';
import { useTPTState } from './hooks/useTPTState';
import { useTPTManagement } from './hooks/useTPTManagement';
import { useDoublesRRState } from './hooks/useDoublesRRState';
import { useDoublesRRManagement } from './hooks/useDoublesRRManagement';
import SetupScreen from './setup/SetupScreen';
import StandingsTab from './tabs/StandingsTab';
import HistoryTab from './tabs/HistoryTab';
import PlayTab from './tabs/PlayTab';
import ModalRoot from './modals/ModalRoot';
import AppHeader from './components/AppHeader';
import StatusBanners from './components/StatusBanners';

// The tournament-data fields that must always be readable as one object by the
// management hooks (via roundMgmtStateRef). Holding them in a reducer makes that
// ref robust-by-construction — no hand-maintained assembly that can drift.
const TOURNAMENT_INITIAL = {
  tournamentTitle: 'Tournament',
  tournamentLocation: '',
  tournamentStartTime: '',
  tournamentDurationMins: 0,
  activeTeamIds: [],
  tournamentTeams: [],
  courtNumbers: [],
  timerDuration: 0,
  timerDefaultMins: 12,
  history: [],
  round: null,
  roundNum: 1,
  pending: {},
  roundComplete: false,
  pausedIds: [],
  tournamentMode: 'swiss',
  roundRobinSchedule: null,
  roundRobinCourts: null,
  roundRobinStartRoundNum: null,
  roundRobinStartSnapshot: null,
  roundRobinEndSnapshot: null,
  activeRoundExtras: [],
  liveAdditions: [],
  nextRoundPresets: [],
  tournamentFinished: false,
  cancelledRoundNums: [],
  finalRound: false,
  targetRounds: 0,
  socialCourts: [],
  teamNameDisplay: 'name',
};

// SET applies one field; `value` may be a value or an updater fn (matching
// useState's API). Unchanged values bail out to preserve useState's
// reference-equality re-render skip.
function tournamentReducer(state, action) {
  if (action.type === 'SET') {
    const prev = state[action.key];
    const next = typeof action.value === 'function' ? action.value(prev) : action.value;
    if (Object.is(next, prev)) return state;
    return { ...state, [action.key]: next };
  }
  if (action.type === 'LOAD') return { ...state, ...action.values };
  return state;
}

export default function App({ viewerOnly = false }) {
  const online = useOnline();

  // ── Phase & identity ──────────────────────────────────────────────────────
  const [phase, setPhase] = useState('loading');

  // ── Tournament data (single reducer; roundMgmtStateRef below == this state) ──
  const [tstate, dispatch] = useReducer(tournamentReducer, TOURNAMENT_INITIAL);
  const {
    tournamentTitle, tournamentLocation, tournamentStartTime, tournamentDurationMins,
    activeTeamIds, tournamentTeams, courtNumbers, timerDuration, timerDefaultMins,
    history, round, roundNum, pending, roundComplete, pausedIds, tournamentMode,
    roundRobinSchedule, roundRobinCourts, roundRobinStartRoundNum, roundRobinStartSnapshot,
    roundRobinEndSnapshot, activeRoundExtras, liveAdditions, nextRoundPresets, tournamentFinished,
    cancelledRoundNums, finalRound, targetRounds, socialCourts, teamNameDisplay,
  } = tstate;

  // Setter wrappers — keep every existing setX(...) call site byte-identical.
  const setTournamentTitle         = useCallback(v => dispatch({ type: 'SET', key: 'tournamentTitle', value: v }), []);
  const setTournamentLocation      = useCallback(v => dispatch({ type: 'SET', key: 'tournamentLocation', value: v }), []);
  const setTournamentStartTime     = useCallback(v => dispatch({ type: 'SET', key: 'tournamentStartTime', value: v }), []);
  const setTournamentDurationMins  = useCallback(v => dispatch({ type: 'SET', key: 'tournamentDurationMins', value: v }), []);
  const setActiveTeamIds           = useCallback(v => dispatch({ type: 'SET', key: 'activeTeamIds', value: v }), []);
  const setTournamentTeams         = useCallback(v => dispatch({ type: 'SET', key: 'tournamentTeams', value: v }), []);
  const setCourtNumbers            = useCallback(v => dispatch({ type: 'SET', key: 'courtNumbers', value: v }), []);
  const setTimerDuration           = useCallback(v => dispatch({ type: 'SET', key: 'timerDuration', value: v }), []);
  const setTimerDefaultMins        = useCallback(v => dispatch({ type: 'SET', key: 'timerDefaultMins', value: v }), []);
  const setHistory                 = useCallback(v => dispatch({ type: 'SET', key: 'history', value: v }), []);
  const setRound                   = useCallback(v => dispatch({ type: 'SET', key: 'round', value: v }), []);
  const setRoundNum                = useCallback(v => dispatch({ type: 'SET', key: 'roundNum', value: v }), []);
  const setPending                 = useCallback(v => dispatch({ type: 'SET', key: 'pending', value: v }), []);
  const setRoundComplete           = useCallback(v => dispatch({ type: 'SET', key: 'roundComplete', value: v }), []);
  const setPausedIds               = useCallback(v => dispatch({ type: 'SET', key: 'pausedIds', value: v }), []);
  const setTournamentMode          = useCallback(v => dispatch({ type: 'SET', key: 'tournamentMode', value: v }), []);
  const setRoundRobinSchedule      = useCallback(v => dispatch({ type: 'SET', key: 'roundRobinSchedule', value: v }), []);
  const setRoundRobinCourts        = useCallback(v => dispatch({ type: 'SET', key: 'roundRobinCourts', value: v }), []);
  const setRoundRobinStartRoundNum = useCallback(v => dispatch({ type: 'SET', key: 'roundRobinStartRoundNum', value: v }), []);
  const setRoundRobinStartSnapshot = useCallback(v => dispatch({ type: 'SET', key: 'roundRobinStartSnapshot', value: v }), []);
  const setRoundRobinEndSnapshot   = useCallback(v => dispatch({ type: 'SET', key: 'roundRobinEndSnapshot', value: v }), []);
  const setActiveRoundExtras       = useCallback(v => dispatch({ type: 'SET', key: 'activeRoundExtras', value: v }), []);
  const setLiveAdditions           = useCallback(v => dispatch({ type: 'SET', key: 'liveAdditions', value: v }), []);
  const setNextRoundPresets        = useCallback(v => dispatch({ type: 'SET', key: 'nextRoundPresets', value: v }), []);
  const setTournamentFinished      = useCallback(v => dispatch({ type: 'SET', key: 'tournamentFinished', value: v }), []);
  const setCancelledRoundNums      = useCallback(v => dispatch({ type: 'SET', key: 'cancelledRoundNums', value: v }), []);
  const setFinalRound              = useCallback(v => dispatch({ type: 'SET', key: 'finalRound', value: v }), []);
  const setTargetRounds            = useCallback(v => dispatch({ type: 'SET', key: 'targetRounds', value: v }), []);
  const setSocialCourts            = useCallback(v => dispatch({ type: 'SET', key: 'socialCourts', value: v }), []);
  const setTeamNameDisplay         = useCallback(v => dispatch({ type: 'SET', key: 'teamNameDisplay', value: v }), []);

  useEffect(() => { document.title = tournamentTitle; }, [tournamentTitle]);
  useEffect(() => { setModuleRegistry(tournamentTeams); }, [tournamentTeams]);

  // Tournament state that is NOT read through roundMgmtStateRef stays as useState.
  const [standings, setStandings] = useState([]);
  const [roundKey,  setRoundKey]  = useState(0);
  const [breakMode, setBreakMode] = useState(null);
  const pendingRef         = useRef({});
  const roundCompletingRef = useRef(false);

  // ── TPT state ─────────────────────────────────────────────────────────────
  const {
    tptTeams, setTPTTeams, tptPlayers, setTPTPlayers,
    tptSchedule, setTPTSchedule, tptResults, setTPTResults,
    tptResultsRef, tptScheduleRef, tptRoundCompletingRef,
  } = useTPTState();

  // ── Doubles RR state ──────────────────────────────────────────────────────
  const {
    doublesRRPlayers, setDoublesRRPlayers,
    doublesRRSchedule, setDoublesRRSchedule, doublesRRResults, setDoublesRRResults,
    doublesRRPlayersRef, doublesRRResultsRef, doublesRRScheduleRef, doublesRRRoundCompletingRef,
  } = useDoublesRRState();
  const [doublesRRTiebreakOrder, setDoublesRRTiebreakOrder] = useState(DEFAULT_DOUBLES_RR_TIEBREAK_ORDER);

  // Auto-enable finalRound when next round equals the target
  useEffect(() => {
    if (targetRounds <= 0 || finalRound) return;
    const nextRN = roundNum === 0 ? 1 : roundNum + 1;
    if (nextRN === targetRounds) {
      setFinalRound(true);
      pushAtomicUpdate({ finalRound: true }, setFirebaseError);
    }
  }, [targetRounds, roundNum]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── UI state ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('play');
  useEffect(() => { if (activeTab === 'timer') setActiveTab('play'); }, [activeTab]);

  const [role, setRole] = useState(null);
  const roleRef = useRef(null);
  useEffect(() => { roleRef.current = role; }, [role]);
  const isAdmin = hasPermission(role, 'canResetTournament');

  const [multiAdminDismissed, setMultiAdminDismissed] = useState(false);
  const prevOtherAdminCountRef = useRef(0);

  const [firebaseError,        setFirebaseError]        = useState(null);
  const [firebaseErrorPersist, setFirebaseErrorPersist] = useState(false);
  const retrySnapshotRef = useRef(null);
  useEffect(() => {
    if (!firebaseError || firebaseErrorPersist) return;
    const t = setTimeout(() => setFirebaseError(null), 5000);
    return () => clearTimeout(t);
  }, [firebaseError, firebaseErrorPersist]);

  const setCriticalError = useCallback((msg, retrySnap) => {
    retrySnapshotRef.current = retrySnap || null;
    setFirebaseErrorPersist(true);
    setFirebaseError(msg);
  }, []);
  const dismissError = useCallback(() => {
    setFirebaseError(null); setFirebaseErrorPersist(false); retrySnapshotRef.current = null;
  }, []);
  const retryWrite = useCallback(() => {
    const snap = retrySnapshotRef.current;
    if (!snap) { dismissError(); return; }
    pushSnapshot(snap, err => { if (err) setCriticalError('Retry failed — check your connection.', snap); else dismissError(); });
  }, [dismissError, setCriticalError]);

  // Permission-gated atomic write: only writes if the current role holds `perm`.
  // `perm` may be a single permission or an array (writes if the role holds ANY).
  const gatedUpdate = useCallback((perm, fields) => {
    const perms = Array.isArray(perm) ? perm : [perm];
    if (perms.some(p => hasPermission(roleRef.current, p))) pushAtomicUpdate(fields, setFirebaseError);
  }, []);

  const [headerHidden, setHeaderHidden] = useState(false);
  const headerRef    = useRef(null);
  const [headerHeight, setHeaderHeight] = useState(140);
  useEffect(() => {
    const el = headerRef.current; if (!el) return;
    const ro = new ResizeObserver(([e]) => setHeaderHeight(e.contentRect.height + 2));
    ro.observe(el); return () => ro.disconnect();
  }, []);

  // ── Modal state (replaces 14+ individual booleans) ─────────────────────────
  const { modal, openModal, closeModal } = useModalState();

  // ── Timer hook ────────────────────────────────────────────────────────────
  const breakModeRef = useRef(null);
  useEffect(() => { breakModeRef.current = breakMode; }, [breakMode]);

  const {
    timerRunning, timerSecsLeft, timerAlarmed, setTimerAlarmed,
    timerRunningRef, timerStartedAtRef, timerPausedSecsRef, timerDurationRef,
    computeSecsLeft, applyTimerState, resetTimer, timerToggle,
  } = useRoundTimer({ timerDuration, roleRef, onFirebaseError: setFirebaseError });

  // ── Firebase main listener callback ───────────────────────────────────────
  const tournamentIdRef    = useRef(null);
  const lastSeenRoundNum   = useRef(-1);
  const historyLengthRef   = useRef(0);

  const updateAllStates = useCallback((s) => {
    if (!s || s.phase === 'waiting') { setPhase(p => p === 'play' ? 'waiting' : p); return; }
    if (s.tournamentTitle) document.title = s.tournamentTitle;
    const ns = rebuildStandings(s.activeTeamIds, s.history);
    let nr;
    if (s.roundData && s.roundData.courtTeamIds) {
      const safe = id => s.teamRegistry?.find(t => t.id === id) || { id, name: String(id), color: '#475569', text: '#fff' };
      nr = { courts: s.roundData.courtTeamIds.map(p => p.map(safe)), bye: (s.roundData.byeIds || []).map(safe), paused: (s.roundData.pausedTeamIds || []).map(safe), courtNums: s.roundData.courtNums || s.courtNumbers.slice(0, s.roundData.courtTeamIds.length) };
    } else if (s.roundNum === 0 || !s.roundData) {
      nr = null;
    } else {
      nr = generateRound(ns, s.courtNumbers.length, s.history.length, s.history, s.pausedIds || []);
    }
    // One dispatch loads all reducer fields (snapshotToState is the read-side
    // mirror of buildSnapshot). standings/breakMode are useState, set separately.
    dispatch({ type: 'LOAD', values: snapshotToState(s, { round: nr }) });
    setStandings(ns);
    setBreakMode(s.breakMode || null);
    if (s.tptTeams)    { setTPTTeams(s.tptTeams);    }
    if (s.players)     { setTPTPlayers(s.players);   }
    if (s.tptSchedule) { setTPTSchedule(s.tptSchedule); tptScheduleRef.current = s.tptSchedule; }
    if (s.tptResults)  { setTPTResults(s.tptResults); tptResultsRef.current = s.tptResults; }
    if (s.doublesRRPlayers)  { setDoublesRRPlayers(s.doublesRRPlayers); doublesRRPlayersRef.current = s.doublesRRPlayers; }
    if (s.doublesRRSchedule) { setDoublesRRSchedule(s.doublesRRSchedule); doublesRRScheduleRef.current = s.doublesRRSchedule; }
    if (s.doublesRRResults)  { setDoublesRRResults(s.doublesRRResults); doublesRRResultsRef.current = s.doublesRRResults; }
    setDoublesRRTiebreakOrder(s.doublesRRTiebreakOrder || DEFAULT_DOUBLES_RR_TIEBREAK_ORDER);
    historyLengthRef.current = s.history.length;
    if (s._tournamentId) tournamentIdRef.current = s._tournamentId;
    const isNew = s.roundNum !== lastSeenRoundNum.current;
    if (isNew) { lastSeenRoundNum.current = s.roundNum; pendingRef.current = {}; setPending({}); setRoundKey(k => k + 1); }
    const tRun = s.timerRunning || false, tSA = s.timerStartedAt || null, tPS = s.timerPausedSecsLeft ?? s.timerDuration ?? 0;
    applyTimerState(tRun, tSA, tPS);
    setPhase('play');
  }, [applyTimerState]);

  const handlePendingResults = useCallback((d) => {
    setPending(prev => {
      const m = { ...prev };
      Object.keys(d).forEach(k => { if (!m[k]) m[k] = d[k]; });
      pendingRef.current = m; return m;
    });
  }, []);

  // ── Firebase sync hook ────────────────────────────────────────────────────
  const { firebaseConnected, presence, pins, pinsLoaded, pinsLoadError, backupRoundNums, setBackupRoundNums } = useFirebaseSync({
    role,
    roleRef,
    tournamentIdRef,
    onSnapshot:       updateAllStates,
    onPendingResults: handlePendingResults,
    onPhaseTimeout:   useCallback(() => setPhase('waiting'), []),
    onTournamentSwap: useCallback(() => openModal('tournamentSwapped'), [openModal]),
    onFirebaseError:  setFirebaseError,
  });

  // Update multiAdminDismissed banner
  useEffect(() => {
    const otherCount = Math.max(0, (presence['admin'] ?? 0) - 1);
    if (otherCount > prevOtherAdminCountRef.current) setMultiAdminDismissed(false);
    prevOtherAdminCountRef.current = otherCount;
  }, [presence]);

  // ── stateRef for the management hooks — IS the reducer state, so it can never
  //    drift out of sync with a forgotten field. ─────────────────────────────
  const roundMgmtStateRef = useRef(tstate);
  roundMgmtStateRef.current = tstate;

  // ── Round management hook ─────────────────────────────────────────────────
  const {
    handleResult, handleLiveResult, handleUndoResult, handleUndoLiveResult,
    handleGenerateRound, handleRegenerateRound, doRegenerateRound, doCancelRound,
    handleExitRoundRobin, doExitRoundRobin, handleStartRoundRobin, handleGenerateAdditionalRoundRobin,
    handleRRMatchResult, rrMatchKey,
  } = useRoundManagement({
    stateRef: roundMgmtStateRef,
    pending, round, roundComplete, liveAdditions, history, phase,
    roleRef, breakModeRef,
    timerRunningRef, timerStartedAtRef, timerPausedSecsRef, timerDurationRef,
    pendingRef, roundCompletingRef, lastSeenRoundNum, historyLengthRef,
    setRound, setRoundNum, setHistory, setStandings, setPending,
    setLiveAdditions, setActiveRoundExtras, setNextRoundPresets,
    setRoundComplete, setRoundKey, setFinalRound, setTimerAlarmed,
    setTournamentMode, setRoundRobinSchedule, setRoundRobinCourts,
    setRoundRobinStartRoundNum, setRoundRobinStartSnapshot, setRoundRobinEndSnapshot,
    setCancelledRoundNums, setBackupRoundNums,
    applyTimerState, computeSecsLeft, setCriticalError, onFirebaseError: setFirebaseError,
    onRequirePin: useCallback((purpose) => openModal('pin', { purpose }), [openModal]),
    closeModal,
  });

  // ── Swipe navigation ──────────────────────────────────────────────────────
  const TAB_ORDER     = ['play', 'standings', 'history'];
  const swipeTouchRef = useRef(null);
  const handleSwipeStart = useCallback(e => { const t = e.touches[0]; swipeTouchRef.current = { x: t.clientX, y: t.clientY }; }, []);
  const handleSwipeEnd   = useCallback(e => {
    if (!swipeTouchRef.current) return;
    const dx = e.changedTouches[0].clientX - swipeTouchRef.current.x;
    const dy = e.changedTouches[0].clientY - swipeTouchRef.current.y;
    swipeTouchRef.current = null;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    setActiveTab(t => { const i = TAB_ORDER.indexOf(t); if (i === -1) return t; const ni = i + (dx < 0 ? 1 : -1); return TAB_ORDER[Math.max(0, Math.min(TAB_ORDER.length - 1, ni))]; });
  }, []);

  const ranked = useMemo(() => rerank(standings), [standings]);

  const tptTeamStandings = useMemo(() => {
    if (tournamentMode !== 'tpt' || Object.keys(tptTeams).length === 0) return [];
    return buildTPTStandings(tptTeams, tptPlayers, tptSchedule, tptResults).teamStandings;
  }, [tournamentMode, tptTeams, tptPlayers, tptSchedule, tptResults]);

  const doublesRRStandings = useMemo(() => {
    if (tournamentMode !== 'doublesrr' || Object.keys(doublesRRPlayers).length === 0) return [];
    return buildDoublesRRStandings(Object.keys(doublesRRPlayers), doublesRRPlayers, history, doublesRRTiebreakOrder);
  }, [tournamentMode, doublesRRPlayers, history, doublesRRTiebreakOrder]);

  // ── Tournament lifecycle handlers ──────────────────────────────────────────
  const handleStart = useCallback((allTeams, teamIds, courts, durSecs, title, numRounds, eventDetails = {}, startMode = 'swiss') => {
    setTournamentTeams(allTeams); setModuleRegistry(allTeams);
    const resolvedTitle = title || 'Tournament';
    setTournamentTitle(resolvedTitle);
    const { location = '', startTime = '', durationMins = 0 } = eventDetails;
    setTournamentLocation(location); setTournamentStartTime(startTime); setTournamentDurationMins(durationMins);
    const s = mkStandings(teamIds);
    const tid = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    tournamentIdRef.current = tid;

    // 'roundrobin' start mode skips the Swiss phase entirely — the round-robin
    // schedule is generated up front and the tournament opens directly in RR mode.
    const isRR = startMode === 'roundrobin';
    const tr = isRR ? 0 : (numRounds || 0);
    const rrSchedule = isRR ? generateRoundRobinSchedule(teamIds, courts.length) : null;
    const rrStartSnapshot = isRR ? { startRoundNum: 1, participatingIds: [...teamIds], excludedIds: [] } : null;
    const startRoundNum = isRR ? 1 : 0;

    const snap = buildSnapshot({
      activeTeamIds: teamIds, courtNumbers: courts, socialCourts: [],
      tournamentTeams: allTeams, tournamentTitle: resolvedTitle,
      tournamentLocation: location, tournamentStartTime: startTime, tournamentDurationMins: durationMins,
      timerDuration: durSecs, timerDefaultMins: durSecs > 0 ? Math.round(durSecs / 60) : 12,
      history: [], roundNum: startRoundNum, pausedIds: [], targetRounds: tr,
      tournamentMode: isRR ? 'roundrobin' : 'swiss',
      ...(isRR ? {
        roundRobinSchedule: rrSchedule, roundRobinCourts: courts,
        roundRobinStartRoundNum: 1, roundRobinStartSnapshot: rrStartSnapshot, roundRobinEndSnapshot: null,
      } : {}),
    }, { _tournamentId: tid });
    pushSnapshot(snap, setFirebaseError); setRole('admin');
    setActiveTeamIds(teamIds); setCourtNumbers(courts); setTimerDuration(durSecs);
    setStandings(s); setRound(null); setRoundNum(startRoundNum); setHistory([]);
    lastSeenRoundNum.current = startRoundNum; pendingRef.current = {}; setPending({}); setPausedIds([]); setRoundKey(0); setRoundComplete(false);
    setTournamentMode(isRR ? 'roundrobin' : 'swiss');
    setRoundRobinSchedule(rrSchedule); setRoundRobinCourts(isRR ? courts : null);
    setRoundRobinStartRoundNum(isRR ? 1 : null); setRoundRobinStartSnapshot(rrStartSnapshot); setRoundRobinEndSnapshot(null);
    setActiveRoundExtras([]); setTournamentFinished(false); setSocialCourts([]);
    setTargetRounds(tr); setTimerAlarmed(false); applyTimerState(false, null, durSecs);
    setPhase('play'); setActiveTab('play');
  }, [applyTimerState]);

  const { handleStartTPT, handleTPTResult, handleManageTPTTeamsSave } = useTPTManagement({
    stateRef: roundMgmtStateRef,
    tournamentIdRef, lastSeenRoundNum, pendingRef, roleRef,
    tptResultsRef, tptScheduleRef, tptRoundCompletingRef,
    setTPTTeams, setTPTPlayers, setTPTSchedule, setTPTResults,
    setTournamentTitle, setTournamentLocation, setTournamentStartTime, setTournamentDurationMins,
    setRole, setCourtNumbers, setTimerDuration,
    setHistory, setRoundNum, setActiveTeamIds, setStandings,
    setTournamentMode, setRound, setPausedIds, setPending, setRoundKey, setRoundComplete,
    setRoundRobinSchedule, setRoundRobinCourts, setRoundRobinStartRoundNum,
    setRoundRobinStartSnapshot, setRoundRobinEndSnapshot,
    setActiveRoundExtras, setTournamentFinished, setSocialCourts,
    setPhase, setActiveTab,
    applyTimerState, setTimerAlarmed, onFirebaseError: setFirebaseError, closeModal,
  });

  const { handleStartDoublesRR, handleDoublesRRResult, handleGenerateAdditionalDoublesRR, handleManageDoublesRRPlayersSave } = useDoublesRRManagement({
    stateRef: roundMgmtStateRef,
    tournamentIdRef, lastSeenRoundNum, pendingRef, roleRef,
    doublesRRPlayersRef, doublesRRResultsRef, doublesRRScheduleRef, doublesRRRoundCompletingRef,
    setDoublesRRPlayers, setDoublesRRSchedule, setDoublesRRResults,
    setTournamentTitle, setTournamentLocation, setTournamentStartTime, setTournamentDurationMins,
    setRole, setCourtNumbers, setTimerDuration,
    setHistory, setRoundNum, setActiveTeamIds, setStandings,
    setTournamentMode, setRound, setPausedIds, setPending, setRoundKey, setRoundComplete,
    setRoundRobinSchedule, setRoundRobinCourts, setRoundRobinStartRoundNum,
    setRoundRobinStartSnapshot, setRoundRobinEndSnapshot,
    setActiveRoundExtras, setTournamentFinished, setSocialCourts,
    setPhase, setActiveTab,
    applyTimerState, setTimerAlarmed, onFirebaseError: setFirebaseError, closeModal,
  });

  const handleDoublesRRTiebreakOrderChange = useCallback((order) => {
    setDoublesRRTiebreakOrder(order);
    gatedUpdate('canEditTeams', { doublesRRTiebreakOrder: order });
  }, [roleRef]); // eslint-disable-line react-hooks/exhaustive-deps

  const doRevertToRound = useCallback(async () => {
    const target = modal.data?.roundNum;
    if (target == null) return;
    try {
      const snap = await fetchBackup(target);
      const data = snap.val();
      if (!data) { setFirebaseError('Backup not found for this round.'); closeModal(); return; }
      const { _backupAt, ...snapData } = data;
      const normalised = normaliseSnapshot(snapData);
      pushSnapshot(snapData, setFirebaseError);
      updateAllStates(normalised);
      setActiveTab('play');
    } catch {
      setFirebaseError('Failed to load backup — check connection.');
    }
    closeModal();
  }, [modal.data, updateAllStates, closeModal]);

  const doRevertToBeginning = useCallback(() => {
    const s = roundMgmtStateRef.current;
    const snap = buildSnapshot(s, {
      history: [], roundNum: 0, pausedIds: [], cancelledRoundNums: [], finalRound: false,
      activeRoundExtras: [], liveAdditions: [], nextRoundPresets: [],
      tournamentFinished: false,
      roundRobinSchedule: null, roundRobinCourts: null,
      roundRobinStartRoundNum: null, roundRobinStartSnapshot: null, roundRobinEndSnapshot: null,
    });
    pushSnapshot(snap, setFirebaseError);
    clearBackups();
    setBackupRoundNums(new Set()); historyLengthRef.current = 0;
    lastSeenRoundNum.current = 0;
    setHistory([]); setStandings(rebuildStandings(s.activeTeamIds, [])); setRound(null); setPausedIds([]);
    pendingRef.current = {}; setPending({}); setRoundNum(0); setRoundComplete(false);
    setRoundRobinSchedule(null); setRoundRobinCourts(null); setRoundRobinStartRoundNum(null);
    setRoundRobinStartSnapshot(null); setRoundRobinEndSnapshot(null);
    setActiveRoundExtras([]); setLiveAdditions([]); setNextRoundPresets([]);
    setTournamentFinished(false); setBreakMode(null); setCancelledRoundNums([]);
    setTPTResults({}); tptResultsRef.current = {}; tptRoundCompletingRef.current = false;
    setDoublesRRResults({}); doublesRRResultsRef.current = {}; doublesRRRoundCompletingRef.current = false;
    setRoundKey(k => k + 1); applyTimerState(false, null, s.timerDuration);
    closeModal(); setActiveTab('play');
  }, [roundMgmtStateRef, closeModal, applyTimerState, setBackupRoundNums]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleBreakStart = useCallback((message, durationSecs) => {
    const bm = { message, endAt: Date.now() + durationSecs * 1000 };
    setBreakMode(bm); closeModal();
    gatedUpdate('canBreakTournament', { breakMode: bm });
  }, [closeModal, roleRef]);

  const handleBreakEnd = useCallback(() => {
    setBreakMode(null);
    gatedUpdate('canBreakTournament', { breakMode: null });
  }, [roleRef]);

  const doReset = useCallback(() => {
    pushSnapshot(null, setFirebaseError); clearBackups();
    setBackupRoundNums(new Set()); historyLengthRef.current = 0;
    lastSeenRoundNum.current = -1; setPhase('setup');
    setHistory([]); setStandings([]); setRound(null); setPausedIds([]);
    pendingRef.current = {}; setPending({}); setTournamentMode('swiss');
    setRoundRobinSchedule(null); setRoundRobinCourts(null); setRoundRobinStartRoundNum(null);
    setRoundRobinStartSnapshot(null); setRoundRobinEndSnapshot(null);
    setActiveRoundExtras([]); setLiveAdditions([]); setNextRoundPresets([]);
    setTournamentFinished(false); setBreakMode(null); setCancelledRoundNums([]); setSocialCourts([]);
    setTournamentTitle('Tournament'); setTournamentLocation(''); setTournamentStartTime(''); setTournamentDurationMins(0);
    setTPTTeams({}); setTPTPlayers({}); setTPTSchedule([]); setTPTResults({});
    tptResultsRef.current = {}; tptScheduleRef.current = []; tptRoundCompletingRef.current = false;
    setDoublesRRPlayers({}); setDoublesRRSchedule([]); setDoublesRRResults({});
    doublesRRPlayersRef.current = {}; doublesRRResultsRef.current = {}; doublesRRScheduleRef.current = []; doublesRRRoundCompletingRef.current = false;
    resetTimer(0);
  }, [resetTimer, setBackupRoundNums]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePinSuccess = useCallback((matchedRole) => {
    const { purpose, ...payload } = modal.data || {};
    if (purpose === 'login') { setRole(matchedRole); }
    else if (purpose === 'reset') { doReset(); }
    else if (purpose === 'regenerate') { doRegenerateRound(); }
    else if (purpose === 'exitRR') { doExitRoundRobin(); }
    else if (purpose === 'cancelRound') { doCancelRound(); }
    else if (purpose === 'revertToRound') {
      openModal('confirmRevert', { roundNum: payload.revertTarget });
      return;
    }
    else if (purpose === 'revertToBeginning') {
      openModal('confirmRevertToBeginning');
      return;
    }
    else if (purpose === 'removeGame' && payload.removeGameTarget) {
      openModal('confirmRemoveGame', payload.removeGameTarget);
      return;
    }
    else if (purpose === 'removeActiveCourt' && payload.removeActiveCourtIdx !== null && round) {
      const idx = payload.removeActiveCourtIdx;
      if (idx >= round.courts.length) { setFirebaseError('Court index is stale — refresh and try again.'); closeModal(); return; }
      const teamsRemoved = round.courts[idx] || [];
      const newCourts    = round.courts.filter((_, i) => i !== idx);
      const newBye       = [...(round.bye || []), ...teamsRemoved];
      const newCourtNums = (round.courtNums || courtNumbers).filter((_, i) => i !== idx);
      const newRound     = { ...round, courts: newCourts, bye: newBye, courtNums: newCourtNums };
      setRound(newRound);
      const np = reindexPendingAfterRemoval(pendingRef.current, 'court_', [idx]);
      pendingRef.current = np; setPending(np);
      if (hasPermission(roleRef.current, 'canEditActiveCourt')) {
        const rd = { courtTeamIds: newCourts.map(p => p.map(t => t.id)), byeIds: newBye.map(t => t.id), pausedTeamIds: (round.paused || []).map(t => t.id), courtNums: newCourtNums };
        pushAtomicUpdate({ roundData: rd, pendingResults: np }, setFirebaseError);
      }
    }
    else if (purpose === 'removeLiveAddition' && payload.removeLiveIdx !== null) {
      const i = payload.removeLiveIdx;
      setLiveAdditions(prev => {
        const nl = prev.filter((_, j) => j !== i);
        const np = reindexPendingAfterRemoval(pendingRef.current, 'live_', [i]);
        pendingRef.current = np; setPending(np);
        gatedUpdate('canEditActiveCourt', { liveAdditions: nl, pendingResults: np });
        return nl;
      });
    }
    else if (purpose === 'removeActiveRoundExtra' && payload.removeActiveRoundExtraIdx !== null) {
      setActiveRoundExtras(prev => {
        const ne = prev.filter((_, i) => i !== payload.removeActiveRoundExtraIdx);
        gatedUpdate('canEditActiveCourt', { activeRoundExtras: ne });
        return ne;
      });
    }
    closeModal();
  }, [modal.data, round, courtNumbers, pendingRef, roleRef, doReset, doRegenerateRound, doCancelRound, doExitRoundRobin, openModal, closeModal]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleManageTeamsSave = useCallback((newRegistry, newActiveIds) => {
    setTournamentTeams(newRegistry); setModuleRegistry(newRegistry); setActiveTeamIds(newActiveIds);
    const ns = rebuildStandings(newActiveIds, history);
    setStandings(ns); closeModal();
    gatedUpdate('canEditTeams', { teamRegistry: newRegistry, activeTeamIds: newActiveIds });
  }, [history, closeModal, roleRef]);

  const handleTeamNameDisplayChange = useCallback(mode => {
    setTeamNameDisplay(mode);
    gatedUpdate('canEditTeams', { teamNameDisplay: mode });
  }, [roleRef]);

  const handleManageCourtsSave = useCallback((newCourts, newSocialCourts) => {
    const upd = { courtNumbers: newCourts, socialCourts: newSocialCourts };
    if (round) {
      const prevSocialSet = new Set(socialCourts.map(String));
      const newlySocial   = new Set(newSocialCourts.filter(c => !prevSocialSet.has(String(c))).map(String));
      if (newlySocial.size > 0) {
        const currentNums    = round.courtNums || courtNumbers;
        const newRoundCourts = [], newRoundNums = [], extraBye = [];
        const removedIndices = new Set();
        currentNums.forEach((cn, i) => {
          if (newlySocial.has(String(cn))) { extraBye.push(...(round.courts[i] || [])); removedIndices.add(i); }
          else { newRoundCourts.push(round.courts[i]); newRoundNums.push(cn); }
        });
        if (removedIndices.size > 0) {
          const newBye = [...(round.bye || []), ...extraBye];
          setRound({ ...round, courts: newRoundCourts, courtNums: newRoundNums, bye: newBye });
          const np = reindexPendingAfterRemoval(pendingRef.current, 'court_', removedIndices);
          pendingRef.current = np; setPending(np);
          if (hasPermission(roleRef.current, 'canEditCourts')) {
            upd.roundData = { courtTeamIds: newRoundCourts.map(p => p.map(t => t.id)), byeIds: newBye.map(t => t.id), pausedTeamIds: (round.paused || []).map(t => t.id), courtNums: newRoundNums };
            upd.pendingResults = np;
          }
        }
      }
    }
    if (tournamentMode === 'roundrobin' && roundRobinCourts) {
      const newCourtsSet = new Set(newCourts);
      const mapped = roundRobinCourts
        .map(old => { const i = courtNumbers.indexOf(old); return i >= 0 && i < newCourts.length ? newCourts[i] : old; })
        .filter(c => newCourtsSet.has(c));
      setRoundRobinCourts(mapped); upd.roundRobinCourts = mapped;
    }
    setCourtNumbers(newCourts); setSocialCourts(newSocialCourts); closeModal();
    gatedUpdate('canEditCourts', upd);
  }, [round, socialCourts, courtNumbers, tournamentMode, roundRobinCourts, pendingRef, roleRef, closeModal]);

  const handleTogglePause = useCallback(id => {
    setPausedIds(prev => {
      const np = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      gatedUpdate('canPauseTeams', { pausedIds: np });
      return np;
    });
  }, [roleRef]);

  const handleEditSave = useCallback((ri, gameIdx, { game: ng, newBye }) => {
    setHistory(prev => {
      const nh = prev.map((h, i) => i !== ri ? h : { ...h, games: h.games.map((g, gi) => gi !== gameIdx ? g : { ...ng }), bye: newBye });
      const ns = rebuildStandings(activeTeamIds, nh);
      setStandings(ns);
      gatedUpdate(['canEditHistoryScores', 'canFullEditHistory'], { history: nh });
      return nh;
    });
    closeModal();
  }, [activeTeamIds, roleRef, closeModal]);

  const handleTPTHistoryEditSave = useCallback((ri, mi, gi, result) => {
    setHistory(prev => {
      const nh = prev.map((h, i) => {
        if (i !== ri || !h.tptMatchups) return h;
        const newMatchups = h.tptMatchups.map((m, mIdx) => {
          if (mIdx !== mi) return m;
          const newGames = (m.games || []).map((g, gIdx) => gIdx !== gi ? g : result);
          return { ...m, games: newGames };
        });
        return { ...h, tptMatchups: newMatchups };
      });
      gatedUpdate(['canEditHistoryScores', 'canFullEditHistory'], { history: nh });
      return nh;
    });
    closeModal();
  }, [roleRef, closeModal]);

  const handleDoublesRRHistoryEditSave = useCallback((ri, ci, result) => {
    setHistory(prev => {
      const nh = prev.map((h, i) => {
        if (i !== ri || !h.doublesRRCourts) return h;
        const newCourts = h.doublesRRCourts.map((c, cIdx) => cIdx !== ci ? c : { ...c, ...result });
        return { ...h, doublesRRCourts: newCourts };
      });
      gatedUpdate(['canEditHistoryScores', 'canFullEditHistory'], { history: nh });
      return nh;
    });
    closeModal();
  }, [roleRef, closeModal]);

  const handleEditActiveCourt = useCallback(({ courtIdx, teamAId, teamBId, courtNum }) => {
    if (!round) return;
    const tA = tournamentTeams.find(t => t.id === teamAId), tB = tournamentTeams.find(t => t.id === teamBId);
    if (!tA || !tB) return;
    const newCourts = round.courts.map((p, i) => i === courtIdx ? [tA, tB] : [...p]);
    const onCourt = new Set(newCourts.flat().map(t => t.id));
    liveAdditions.forEach(la => { onCourt.add(la.teamId1); onCourt.add(la.teamId2); });
    const paused = new Set((round.paused || []).map(t => t.id));
    const newByeTeams = activeTeamIds.filter(id => !onCourt.has(id) && !paused.has(id)).map(id => tournamentTeams.find(t => t.id === id)).filter(Boolean);
    const oldName = (round.courtNums || courtNumbers)[courtIdx];
    const newCourtNums = round.courtNums ? round.courtNums.map((n, i) => i === courtIdx ? (courtNum ?? n) : n) : undefined;
    const newCourtNumbers = courtNum !== undefined ? courtNumbers.map(n => n === oldName ? courtNum : n) : courtNumbers;
    const newRound = { ...round, courts: newCourts, bye: newByeTeams, ...(newCourtNums ? { courtNums: newCourtNums } : {}) };
    setRound(newRound);
    if (courtNum !== undefined) setCourtNumbers(newCourtNumbers);
    const np = { ...pendingRef.current }; delete np[courtKey(courtIdx)];
    pendingRef.current = np; setPending(np);
    if (hasPermission(roleRef.current, 'canEditActiveCourt')) {
      const rd = { courtTeamIds: newCourts.map(p => p.map(t => t.id)), byeIds: newByeTeams.map(t => t.id), pausedTeamIds: (round.paused || []).map(t => t.id), ...(newCourtNums ? { courtNums: newCourtNums } : {}) };
      pushAtomicUpdate({ roundData: rd, courtNumbers: newCourtNumbers, [`pendingResults/${courtKey(courtIdx)}`]: null }, setFirebaseError);
    }
    closeModal();
  }, [round, tournamentTeams, courtNumbers, activeTeamIds, liveAdditions, pendingRef, roleRef, closeModal]);

  const handleEditLiveAddition = useCallback(({ courtIdx, teamAId, teamBId, courtNum }) => {
    const liveIdx = modal.open === 'editLive' ? modal.data : null;
    if (liveIdx === null || !liveAdditions[liveIdx]) return;
    const nl = liveAdditions.map((x, j) => j === liveIdx ? { ...x, teamId1: teamAId, teamId2: teamBId, ...(courtNum !== undefined ? { courtNumber: courtNum } : {}) } : x);
    setLiveAdditions(nl);
    const np = { ...pendingRef.current };
    delete np[`live_${liveIdx}`];
    pendingRef.current = np; setPending(np);
    gatedUpdate('canEditActiveCourt', { liveAdditions: nl, [`pendingResults/live_${liveIdx}`]: null });
    closeModal();
  }, [modal, liveAdditions, pendingRef, roleRef, closeModal]);

  const handleAddGameSave = useCallback((target, game) => {
    if (target === 'active') {
      if (round) {
        setActiveRoundExtras(prev => { const ne = [...prev, game]; gatedUpdate('canEditActiveCourt', { activeRoundExtras: ne }); return ne; });
      } else if (history.length > 0) {
        const ri = history.length - 1;
        setHistory(prev => {
          const nh = prev.map((h, i) => i !== ri ? h : { ...h, games: [...h.games, game] });
          const ns = rebuildStandings(activeTeamIds, nh); setStandings(ns);
          gatedUpdate('canFullEditHistory', { history: nh });
          return nh;
        });
      } else { return; }
    } else {
      const ri = Number(target);
      setHistory(prev => {
        const nh = prev.map((h, i) => i !== ri ? h : { ...h, games: [...h.games, game] });
        const ns = rebuildStandings(activeTeamIds, nh); setStandings(ns);
        gatedUpdate('canFullEditHistory', { history: nh });
        return nh;
      });
    }
    closeModal();
  }, [round, history, activeTeamIds, roleRef, closeModal]);

  const handleEditCourtNumber = useCallback((ri, gi, newCourtNum) => {
    const trimmed = String(newCourtNum).trim(); if (!trimmed) return;
    setHistory(prev => {
      const nh = prev.map((h, i) => i !== ri ? h : { ...h, games: h.games.map((g, j) => j !== gi ? g : { ...g, courtNumber: trimmed }) });
      gatedUpdate('canFullEditHistory', { history: nh });
      return nh;
    });
  }, [roleRef]);

  const handleFinishTournament = useCallback(() => {
    const s = computeSecsLeft(); applyTimerState(false, null, s);
    setBreakMode(null); setTournamentFinished(true);
    gatedUpdate('canFinishTournament', { tournamentFinished: true, timerRunning: false, timerStartedAt: null, timerPausedSecsLeft: s, breakMode: null });
  }, [computeSecsLeft, applyTimerState, roleRef]);

  const handleResumeTournament = useCallback(() => {
    setTournamentFinished(false);
    gatedUpdate('canFinishTournament', { tournamentFinished: false });
  }, [roleRef]);

  const handleContinueSwissAfterRR = useCallback(() => { doExitRoundRobin('completed'); }, [doExitRoundRobin]);

  // ── Inline modal-action handlers (extracted for ModalRoot) ─────────────────
  const handleConfirmRemoveGame = useCallback(() => {
    const { ri, gameIdx } = modal.data || {};
    if (ri == null) return;
    setHistory(prev => {
      const nh = prev.map((h, i) => i !== ri ? h : { ...h, games: h.games.filter((_, gi) => gi !== gameIdx) });
      const ns = rebuildStandings(activeTeamIds, nh); setStandings(ns);
      if (roleRef.current === 'admin') pushAtomicUpdate({ history: nh }, setFirebaseError);
      return nh;
    });
    closeModal();
  }, [modal.data, activeTeamIds, roleRef, closeModal]);

  const handleTimerSettingsSave = useCallback((m) => {
    setTimerDefaultMins(m); setTimerDuration(m * 60);
    gatedUpdate('canEditTimer', { timerDefaultMins: m, timerDuration: m * 60 });
    closeModal();
  }, [gatedUpdate, closeModal]);

  const handleAddPreset = useCallback((p) => {
    setNextRoundPresets(prev => { const np = [...prev, p]; gatedUpdate('canPresetMatch', { nextRoundPresets: np }); return np; });
    closeModal();
  }, [gatedUpdate, closeModal]);

  const handleAddLiveGame = useCallback((la) => {
    setLiveAdditions(prev => { const nl = [...prev, la]; gatedUpdate('canLiveAddGame', { liveAdditions: nl }); return nl; });
    closeModal();
  }, [gatedUpdate, closeModal]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const addGameData = useMemo(() => {
    if (modal.open !== 'addGame') return null;
    const { target, defaultCourt } = modal.data || {};
    const isActive  = target === 'active';
    const ri        = Number(target);
    const histEntry = !isActive && !isNaN(ri) ? history[ri] : null;
    const usedCourts = isActive
      ? [...(round?.courts.map((_, i) => String(courtNumbers[i] ?? i + 1)) || []), ...liveAdditions.map(la => String(la.courtNumber)), ...activeRoundExtras.map(g => String(g.courtNumber))]
      : (histEntry ? histEntry.games.map(g => String(g.courtNumber)) : []);
    const usedTeams = histEntry ? histEntry.games.flatMap(g => [g.winnerId, g.loserId]) : [];
    const label     = isActive ? (round ? `Round ${roundNum}` : (history.length > 0 ? `Round ${history[history.length - 1].roundNum}` : '')) : `Round ${histEntry?.roundNum || ''}`;
    return { target, usedCourts, usedTeams, label, defaultCourt: defaultCourt || '' };
  }, [modal, round, roundNum, history, courtNumbers, liveAdditions, activeRoundExtras]);

  return (
    <TeamRegistryContext.Provider value={{ registry: tournamentTeams, teamNameDisplay }}>
      <div className="min-h-screen" style={{ background: '#fff', fontFamily: "'Trebuchet MS',sans-serif", color: '#1e293b' }}>

        <ModalRoot
          modal={modal} openModal={openModal} closeModal={closeModal}
          pins={pins} pinsLoaded={pinsLoaded} pinsLoadError={pinsLoadError} role={role} onPinSuccess={handlePinSuccess}
          doRevertToRound={doRevertToRound} doRevertToBeginning={doRevertToBeginning} onBreakStart={handleBreakStart} onConfirmRemoveGame={handleConfirmRemoveGame}
          timerDefaultMins={timerDefaultMins} onTimerSettingsSave={handleTimerSettingsSave}
          isAdmin={isAdmin} tournamentMode={tournamentMode}
          activeTeamIds={activeTeamIds} tournamentTeams={tournamentTeams} pausedIds={pausedIds}
          courtNumbers={courtNumbers} socialCourts={socialCourts} roundRobinCourts={roundRobinCourts} ranked={ranked}
          round={round} liveAdditions={liveAdditions} nextRoundPresets={nextRoundPresets} history={history} pending={pending}
          tptTeams={tptTeams} tptPlayers={tptPlayers} tournamentTitle={tournamentTitle}
          doublesRRPlayers={doublesRRPlayers}
          doublesRRTiebreakOrder={doublesRRTiebreakOrder} onDoublesRRTiebreakOrderChange={handleDoublesRRTiebreakOrderChange}
          teamNameDisplay={teamNameDisplay} onTeamNameDisplayChange={handleTeamNameDisplayChange}
          onTogglePause={handleTogglePause} onManageTeamsSave={handleManageTeamsSave}
          onManageTPTTeamsSave={handleManageTPTTeamsSave} onManageCourtsSave={handleManageCourtsSave}
          onManageDoublesRRPlayersSave={handleManageDoublesRRPlayersSave}
          onStartRoundRobin={handleStartRoundRobin}
          onChooseGenerateAdditionalGames={mode => tournamentMode === 'doublesrr' ? handleGenerateAdditionalDoublesRR(mode) : handleGenerateAdditionalRoundRobin(mode)}
          addGameData={addGameData} onAddGameSave={handleAddGameSave}
          onAddPreset={handleAddPreset} onAddLiveGame={handleAddLiveGame}
          onEditSave={handleEditSave} onEditActiveCourt={handleEditActiveCourt} onEditLiveAddition={handleEditLiveAddition}
          onEditTPTSave={handleTPTHistoryEditSave}
          onEditDoublesRRSave={handleDoublesRRHistoryEditSave}
        />

        <AppHeader
          headerRef={headerRef} headerHidden={headerHidden}
          onShowHeader={() => setHeaderHidden(false)} onHideHeader={() => setHeaderHidden(true)}
          tournamentTitle={tournamentTitle}
          tournamentLocation={tournamentLocation} tournamentStartTime={tournamentStartTime} tournamentDurationMins={tournamentDurationMins}
          firebaseConnected={firebaseConnected}
          phase={phase} role={role} presence={presence} online={online} viewerOnly={viewerOnly}
          onLoginToggle={() => { if (role) setRole(null); else openModal('pin', { purpose: 'login' }); }}
          activeTab={activeTab} onTabChange={setActiveTab}
        />

        <StatusBanners
          isAdmin={isAdmin} multiAdminCount={Math.max(0, (presence['admin'] ?? 0) - 1)}
          multiAdminDismissed={multiAdminDismissed} onDismissMultiAdmin={() => setMultiAdminDismissed(true)}
          firebaseError={firebaseError} firebaseErrorPersist={firebaseErrorPersist}
          canRetry={!!retrySnapshotRef.current} onRetry={retryWrite} onDismissError={dismissError}
        />

        {/* ── Scrollable content ── */}
        <div onTouchStart={phase === 'play' ? handleSwipeStart : undefined} onTouchEnd={phase === 'play' ? handleSwipeEnd : undefined}
          style={{ maxWidth: 720, margin: '0 auto', padding: `${headerHidden ? 44 : headerHeight + 8}px clamp(12px,3vw,20px) clamp(16px,3vw,24px)` }}>

          {(phase === 'loading' || phase === 'waiting') && !isAdmin && (
            <div className="rounded-2xl p-10 text-center flex flex-col items-center gap-4" style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.08)' }}>
              {phase === 'loading'
                ? (<><div className="text-3xl">🔄</div><p className="text-slate-500 text-sm">Connecting to tournament…</p></>)
                : (<><div className="text-3xl">🏓</div><p className="text-slate-700 font-bold">No active tournament</p><p className="text-slate-500 text-sm">Waiting for the admin to start a game.</p></>)
              }
            </div>
          )}
          {(phase === 'loading' || phase === 'waiting' || phase === 'setup') && isAdmin && <SetupScreen onStart={handleStart} onStartTPT={handleStartTPT} onStartDoublesRR={handleStartDoublesRR} />}

          {phase === 'play' && (
            <>
              {activeTab === 'play' && (
                <PlayTab
                  tournamentFinished={tournamentFinished} breakMode={activeTab === 'play' ? breakMode : null}
                  round={round} roundNum={roundNum} tournamentMode={tournamentMode}
                  tptTeams={tptTeams} tptPlayers={tptPlayers} tptSchedule={tptSchedule} tptResults={tptResults}
                  onTPTResult={handleTPTResult}
                  doublesRRPlayers={doublesRRPlayers} doublesRRSchedule={doublesRRSchedule} doublesRRResults={doublesRRResults}
                  onDoublesRRResult={handleDoublesRRResult}
                  roundRobinSchedule={roundRobinSchedule} roundRobinCourts={roundRobinCourts} roundRobinStartRoundNum={roundRobinStartRoundNum}
                  courtNumbers={courtNumbers} socialCourts={socialCourts} liveAdditions={liveAdditions}
                  pending={pending} role={role} finalRound={finalRound} pausedIds={pausedIds}
                  targetRounds={targetRounds}
                  setFinalRound={v => { setFinalRound(v); gatedUpdate('canSetFinalRound', { finalRound: v }); }}
                  history={history}
                  ranked={tournamentMode === 'tpt' ? tptTeamStandings : (tournamentMode === 'doublesrr' ? doublesRRStandings : ranked)}
                  activeRoundExtras={activeRoundExtras}
                  nextRoundPresets={nextRoundPresets} roundKey={roundKey}
                  timerSecsLeft={timerSecsLeft} timerDuration={timerDuration} timerRunning={timerRunning}
                  onTimerToggle={timerToggle} onTimerRestart={() => resetTimer(timerDuration)} onTimerSettings={() => openModal('timerSettings')}
                  onResult={handleResult} onLiveResult={handleLiveResult} onRRMatchResult={handleRRMatchResult}
                  onGenerateRound={handleGenerateRound} onRegenerateRound={handleRegenerateRound}
                  onFinishTournament={handleFinishTournament} onResumeTournament={handleResumeTournament}
                  onBreakStart={() => openModal('break')} onBreakEnd={handleBreakEnd}
                  onEditActiveCourt={idx => openModal('editActiveCourt', idx)}
                  onRemoveActiveCourt={idx => openModal('pin', { purpose: 'removeActiveCourt', removeActiveCourtIdx: idx })}
                  onEditLive={idx => openModal('editLive', idx)}
                  onRemoveLive={idx => openModal('pin', { purpose: 'removeLiveAddition', removeLiveIdx: idx })}
                  onUndoResult={handleUndoResult} onUndoLiveResult={handleUndoLiveResult}
                  onRemovePreset={pi => { setNextRoundPresets(prev => { const np = prev.filter((_, i) => i !== pi); gatedUpdate('canPresetMatch', { nextRoundPresets: np }); return np; }); }}
                  onRemoveExtra={gi => openModal('pin', { purpose: 'removeActiveRoundExtra', removeActiveRoundExtraIdx: gi })}
                  onSelectRRTeams={() => openModal('selectRRTeams')}
                  onGenerateAdditionalGames={() => openModal('generateAdditionalGames')}
                  onPresetMatch={() => openModal('presetMatch')}
                  onLiveAddGame={() => openModal('liveAddGame')}
                  onContinueSwissAfterRR={handleContinueSwissAfterRR}
                  onExitRoundRobin={(reason) => reason ? doExitRoundRobin(reason) : handleExitRoundRobin()}
                  onManageTeams={() => openModal('manageTeams')} onManageCourts={() => openModal('manageCourts')}
                  onReset={() => openModal('confirmReset')} onCancelRound={() => openModal('pin', { purpose: 'cancelRound' })}
                  rrMatchKey={rrMatchKey}
                />
              )}
              {activeTab === 'standings' && (
                <StandingsTab
                  ranked={ranked} pausedIds={pausedIds} tournamentMode={tournamentMode}
                  tptTeams={tptTeams} tptPlayers={tptPlayers} tptSchedule={tptSchedule} tptResults={tptResults}
                  doublesRRPlayers={doublesRRPlayers} doublesRRStandings={doublesRRStandings}
                  doublesRRTiebreakOrder={doublesRRTiebreakOrder} onDoublesRRTiebreakOrderChange={handleDoublesRRTiebreakOrderChange}
                  isAdmin={isAdmin}
                />
              )}
              {activeTab === 'history' && (
                <HistoryTab
                  history={history} activeTeamIds={activeTeamIds} cancelledRoundNums={cancelledRoundNums}
                  tournamentMode={tournamentMode} courtNumbers={courtNumbers}
                  tptTeams={tptTeams} tptPlayers={tptPlayers} tptSchedule={tptSchedule}
                  doublesRRPlayers={doublesRRPlayers} doublesRRSchedule={doublesRRSchedule}
                  roundRobinSchedule={roundRobinSchedule} roundRobinCourts={roundRobinCourts} roundRobinStartRoundNum={roundRobinStartRoundNum}
                  roundRobinStartSnapshot={roundRobinStartSnapshot} roundRobinEndSnapshot={roundRobinEndSnapshot}
                  canEditScores={hasPermission(role, 'canEditHistoryScores') || hasPermission(role, 'canFullEditHistory')}
                  canDeleteGame={hasPermission(role, 'canDeleteHistoryGame')}
                  canFullEdit={hasPermission(role, 'canFullEditHistory')}
                  backupRoundNums={backupRoundNums}
                  onAddGame={ri => openModal('addGame', { target: String(ri), defaultCourt: '' })}
                  onEditGame={(ri, gameIdx) => openModal('editGame', { ri, gameIdx })}
                  onEditTPTGame={(ri, mi, gi) => openModal('editTPTGame', { ri, mi, gi })}
                  onEditDoublesRRGame={(ri, ci) => openModal('editDoublesRRGame', { ri, ci })}
                  onExportDUPR={() => openModal('exportDUPR')}
                  onRemoveGame={(ri, gameIdx) => { openModal('pin', { purpose: 'removeGame', removeGameTarget: { ri, gameIdx } }); }}
                  onRevertToRound={rn => { openModal('pin', { purpose: 'revertToRound', revertTarget: rn }); }}
                  onRevertToBeginning={() => { openModal('pin', { purpose: 'revertToBeginning' }); }}
                  onEditCourtNumber={handleEditCourtNumber}
                />
              )}
            </>
          )}
        </div>
      </div>
    </TeamRegistryContext.Provider>
  );
}
