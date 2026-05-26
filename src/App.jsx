import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { TeamRegistryContext } from './context/TeamRegistryContext';
import { setModuleRegistry } from './constants';
import { courtKey } from './constants';
import { db, ref, set as fbSet, update as fbUpdate, onValue, off, get, pushSnapshot, pushAtomicUpdate, fetchBackup, clearBackups, tournamentRef } from './firebase';
import { ROLES, ROLE_MAP, hasPermission } from './roleConfig';
import { normaliseSnapshot } from './normalise';
import { mkStandings, rerank, rebuildStandings } from './algorithms/standings';
import { generateRound } from './algorithms/pairing';
import useOnline from './hooks/useOnline';
import { useFirebaseSync } from './hooks/useFirebaseSync';
import { useRoundTimer } from './hooks/useRoundTimer';
import { useRoundManagement } from './hooks/useRoundManagement';
import { useModalState } from './hooks/useModalState';
import SetupScreen from './setup/SetupScreen';
import StandingsTab from './tabs/StandingsTab';
import HistoryTab from './tabs/HistoryTab';
import PlayTab from './tabs/PlayTab';
import PinModal from './modals/PinModal';
import ConfirmModal from './modals/ConfirmModal';
import BreakModal from './modals/BreakModal';
import TimerSettingsModal from './modals/TimerSettingsModal';
import ManageTeamsModal from './modals/ManageTeamsModal';
import ManageCourtsModal from './modals/ManageCourtsModal';
import SelectRoundRobinTeamsModal from './modals/SelectRoundRobinTeamsModal';
import AddGameModal from './modals/AddGameModal';
import PresetMatchModal from './modals/PresetMatchModal';
import EditGameModal from './modals/EditGameModal';
import EditActiveCourtModal from './modals/EditActiveCourtModal';
import ballIcon from '/ball.png';

export default function App({ viewerOnly = false }) {
  const online = useOnline();

  // ── Phase & identity ──────────────────────────────────────────────────────
  const [phase, setPhase] = useState('loading');
  const [tournamentTitle, setTournamentTitle] = useState('Tournament');
  useEffect(() => { document.title = tournamentTitle; }, [tournamentTitle]);

  // ── Tournament data ───────────────────────────────────────────────────────
  const [activeTeamIds, setActiveTeamIds] = useState([]);
  const [tournamentTeams, setTournamentTeams] = useState([]);
  useEffect(() => { setModuleRegistry(tournamentTeams); }, [tournamentTeams]);

  const [courtNumbers,      setCourtNumbers]      = useState([]);
  const [timerDuration,     setTimerDuration]      = useState(0);
  const [timerDefaultMins,  setTimerDefaultMins]   = useState(12);
  const [history,           setHistory]            = useState([]);
  const [standings,         setStandings]          = useState([]);
  const [round,             setRound]              = useState(null);
  const [roundNum,          setRoundNum]           = useState(1);
  const [pending,           setPending]            = useState({});
  const pendingRef                                  = useRef({});
  const roundCompletingRef                          = useRef(false);
  const [roundComplete,     setRoundComplete]      = useState(false);
  const [roundKey,          setRoundKey]           = useState(0);
  const [pausedIds,         setPausedIds]          = useState([]);
  const [tournamentMode,    setTournamentMode]      = useState('swiss');
  const [roundRobinSchedule,        setRoundRobinSchedule]        = useState(null);
  const [roundRobinCourts,          setRoundRobinCourts]          = useState(null);
  const [roundRobinStartRoundNum,   setRoundRobinStartRoundNum]   = useState(null);
  const [roundRobinStartSnapshot,   setRoundRobinStartSnapshot]   = useState(null);
  const [roundRobinEndSnapshot,     setRoundRobinEndSnapshot]     = useState(null);
  const [activeRoundExtras, setActiveRoundExtras] = useState([]);
  const [liveAdditions,     setLiveAdditions]     = useState([]);
  const [nextRoundPresets,  setNextRoundPresets]  = useState([]);
  const [tournamentFinished,setTournamentFinished] = useState(false);
  const [breakMode,         setBreakMode]          = useState(null);
  const [cancelledRoundNums,setCancelledRoundNums] = useState([]);
  const [finalRound,        setFinalRound]         = useState(false);
  const [targetRounds,      setTargetRounds]       = useState(0);
  const [socialCourts,      setSocialCourts]       = useState([]);

  // Auto-enable finalRound when next round equals the target
  useEffect(() => {
    if (targetRounds <= 0 || finalRound) return;
    const nextRN = roundNum === 0 ? 1 : roundNum + 1;
    if (nextRN === targetRounds) {
      setFinalRound(true);
      pushAtomicUpdate({ finalRound: true }, err => setFirebaseError(err));
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
    if (s.teamRegistry && s.teamRegistry.length > 0) setTournamentTeams(s.teamRegistry);
    if (s.tournamentTitle) { setTournamentTitle(s.tournamentTitle); document.title = s.tournamentTitle; }
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
    setActiveTeamIds(s.activeTeamIds); setCourtNumbers(s.courtNumbers);
    setTimerDuration(s.timerDuration || 0); setTimerDefaultMins(s.timerDefaultMins || 12);
    setHistory(s.history); setStandings(ns); setRound(nr); setRoundNum(s.roundNum);
    setPausedIds(s.pausedIds || []); setRoundComplete(s.roundComplete || false);
    setTournamentMode(s.tournamentMode || 'swiss');
    setRoundRobinSchedule(s.roundRobinSchedule || null);
    setRoundRobinCourts(s.roundRobinCourts || null);
    setRoundRobinStartRoundNum(s.roundRobinStartRoundNum ?? null);
    setRoundRobinStartSnapshot(s.roundRobinStartSnapshot || null);
    setRoundRobinEndSnapshot(s.roundRobinEndSnapshot || null);
    setActiveRoundExtras(s.activeRoundExtras || []);
    setLiveAdditions(s.liveAdditions || []);
    setNextRoundPresets(s.nextRoundPresets || []);
    setTournamentFinished(!!s.tournamentFinished);
    setBreakMode(s.breakMode || null);
    setCancelledRoundNums(s.cancelledRoundNums || []);
    const validSocial = (s.socialCourts || []).filter(c => (s.courtNumbers || []).includes(c));
    setSocialCourts(validSocial);
    setFinalRound(!!s.finalRound);
    setTargetRounds(s.targetRounds || 0);
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

  // ── stateRef — kept current every render for useRoundManagement ───────────
  const roundMgmtStateRef = useRef({});
  roundMgmtStateRef.current = {
    activeTeamIds, history, courtNumbers, socialCourts,
    tournamentTeams, tournamentTitle, timerDuration, timerDefaultMins,
    roundNum, pausedIds, round, pending, liveAdditions, activeRoundExtras,
    nextRoundPresets, finalRound, targetRounds, roundComplete,
    tournamentMode, roundRobinSchedule, roundRobinCourts,
    roundRobinStartRoundNum, roundRobinStartSnapshot, roundRobinEndSnapshot,
    tournamentFinished, cancelledRoundNums,
  };

  // ── Round management hook ─────────────────────────────────────────────────
  const {
    handleResult, handleLiveResult, handleUndoResult, handleUndoLiveResult,
    handleGenerateRound, handleRegenerateRound, doRegenerateRound, doCancelRound,
    handleExitRoundRobin, doExitRoundRobin, handleStartRoundRobin,
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
    applyTimerState, setCriticalError, onFirebaseError: setFirebaseError,
    onRequirePin: useCallback((purpose) => openModal('pin', { purpose }), [openModal]),
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

  // ── Tournament lifecycle handlers ──────────────────────────────────────────
  const handleStart = useCallback((allTeams, teamIds, courts, durSecs, title, numRounds) => {
    setTournamentTeams(allTeams); setModuleRegistry(allTeams);
    const resolvedTitle = title || 'Tournament';
    setTournamentTitle(resolvedTitle);
    const s = mkStandings(teamIds);
    const tid = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    tournamentIdRef.current = tid;
    const tr = numRounds || 0;
    const snap = { phase: 'play', _tournamentId: tid, activeTeamIds: teamIds, courtNumbers: courts, socialCourts: [], teamRegistry: allTeams, tournamentTitle: resolvedTitle, timerDuration: durSecs, timerDefaultMins: durSecs > 0 ? Math.round(durSecs / 60) : 12, history: [], roundNum: 0, pausedIds: [], timerRunning: false, timerStartedAt: null, timerPausedSecsLeft: durSecs, roundData: null, roundComplete: false, tournamentMode: 'swiss', roundRobinSchedule: null, roundRobinCourts: null, roundRobinStartRoundNum: null, roundRobinStartSnapshot: null, roundRobinEndSnapshot: null, activeRoundExtras: [], tournamentFinished: false, targetRounds: tr, savedAt: Date.now() };
    pushSnapshot(snap, err => setFirebaseError(err)); setRole('admin');
    setActiveTeamIds(teamIds); setCourtNumbers(courts); setTimerDuration(durSecs);
    setStandings(s); setRound(null); setRoundNum(0); setHistory([]);
    lastSeenRoundNum.current = 0; pendingRef.current = {}; setPending({}); setPausedIds([]); setRoundKey(0); setRoundComplete(false);
    setTournamentMode('swiss'); setRoundRobinSchedule(null); setRoundRobinCourts(null); setRoundRobinStartRoundNum(null); setRoundRobinStartSnapshot(null); setRoundRobinEndSnapshot(null); setActiveRoundExtras([]); setTournamentFinished(false); setSocialCourts([]);
    setTargetRounds(tr); setTimerAlarmed(false); applyTimerState(false, null, durSecs);
    setPhase('play'); setActiveTab('play');
  }, [applyTimerState]);

  const doRevertToRound = useCallback(async () => {
    const target = modal.data?.roundNum;
    if (target == null) return;
    try {
      const snap = await fetchBackup(target);
      const data = snap.val();
      if (!data) { setFirebaseError('Backup not found for this round.'); closeModal(); return; }
      const { _backupAt, ...snapData } = data;
      const normalised = normaliseSnapshot(snapData);
      pushSnapshot(snapData, err => setFirebaseError(err));
      updateAllStates(normalised);
      setActiveTab('play');
    } catch {
      setFirebaseError('Failed to load backup — check connection.');
    }
    closeModal();
  }, [modal.data, updateAllStates, closeModal]);

  const handleBreakStart = useCallback((message, durationSecs) => {
    const bm = { message, endAt: Date.now() + durationSecs * 1000 };
    setBreakMode(bm); closeModal();
    if (hasPermission(roleRef.current, 'canBreakTournament')) pushAtomicUpdate({ breakMode: bm }, err => setFirebaseError(err));
  }, [closeModal, roleRef]);

  const handleBreakEnd = useCallback(() => {
    setBreakMode(null);
    if (hasPermission(roleRef.current, 'canBreakTournament')) pushAtomicUpdate({ breakMode: null }, err => setFirebaseError(err));
  }, [roleRef]);

  const doReset = useCallback(() => {
    pushSnapshot(null, err => setFirebaseError(err)); clearBackups();
    setBackupRoundNums(new Set()); historyLengthRef.current = 0;
    lastSeenRoundNum.current = -1; setPhase('setup'); setRole(null);
    setHistory([]); setStandings([]); setRound(null); setPausedIds([]);
    pendingRef.current = {}; setPending({}); setTournamentMode('swiss');
    setRoundRobinSchedule(null); setRoundRobinCourts(null); setRoundRobinStartRoundNum(null);
    setRoundRobinStartSnapshot(null); setRoundRobinEndSnapshot(null);
    setActiveRoundExtras([]); setLiveAdditions([]); setNextRoundPresets([]);
    setTournamentFinished(false); setBreakMode(null); setCancelledRoundNums([]); setSocialCourts([]);
    resetTimer(0);
  }, [resetTimer, setBackupRoundNums]);

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
      const np = {};
      Object.keys(pendingRef.current).forEach(k => {
        if (k.startsWith('court_')) { const ki = parseInt(k.replace('court_', '')); if (ki < idx) np[k] = pendingRef.current[k]; else if (ki > idx) np[`court_${ki - 1}`] = pendingRef.current[k]; }
        else { np[k] = pendingRef.current[k]; }
      });
      pendingRef.current = np; setPending(np);
      if (hasPermission(roleRef.current, 'canEditActiveCourt')) {
        const rd = { courtTeamIds: newCourts.map(p => p.map(t => t.id)), byeIds: newBye.map(t => t.id), pausedTeamIds: (round.paused || []).map(t => t.id), courtNums: newCourtNums };
        pushAtomicUpdate({ roundData: rd, pendingResults: np }, err => setFirebaseError(err));
      }
    }
    else if (purpose === 'removeLiveAddition' && payload.removeLiveIdx !== null) {
      const i = payload.removeLiveIdx;
      setLiveAdditions(prev => {
        const nl = prev.filter((_, j) => j !== i);
        const np = {};
        Object.keys(pendingRef.current).forEach(k => {
          if (k.startsWith('live_')) { const ki = parseInt(k.replace('live_', '')); if (ki < i) np[k] = pendingRef.current[k]; else if (ki > i) np[`live_${ki - 1}`] = pendingRef.current[k]; }
          else { np[k] = pendingRef.current[k]; }
        });
        pendingRef.current = np; setPending(np);
        if (hasPermission(roleRef.current, 'canEditActiveCourt')) pushAtomicUpdate({ liveAdditions: nl, pendingResults: np }, err => setFirebaseError(err));
        return nl;
      });
    }
    else if (purpose === 'removeActiveRoundExtra' && payload.removeActiveRoundExtraIdx !== null) {
      setActiveRoundExtras(prev => {
        const ne = prev.filter((_, i) => i !== payload.removeActiveRoundExtraIdx);
        if (hasPermission(roleRef.current, 'canEditActiveCourt')) pushAtomicUpdate({ activeRoundExtras: ne }, err => setFirebaseError(err));
        return ne;
      });
    }
    closeModal();
  }, [modal.data, round, courtNumbers, pendingRef, roleRef, doReset, doRegenerateRound, doCancelRound, doExitRoundRobin, openModal, closeModal]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleManageTeamsSave = useCallback((newRegistry, newActiveIds) => {
    setTournamentTeams(newRegistry); setModuleRegistry(newRegistry); setActiveTeamIds(newActiveIds);
    const ns = rebuildStandings(newActiveIds, history);
    setStandings(ns); closeModal();
    if (hasPermission(roleRef.current, 'canEditTeams')) pushAtomicUpdate({ teamRegistry: newRegistry, activeTeamIds: newActiveIds }, err => setFirebaseError(err));
  }, [history, closeModal, roleRef]);

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
          const sortedRemoved = [...removedIndices].sort((a, b) => a - b);
          const np = {};
          Object.keys(pendingRef.current).forEach(k => {
            if (k.startsWith('court_')) {
              const ki = parseInt(k.replace('court_', ''));
              if (!removedIndices.has(ki)) { const shift = sortedRemoved.filter(r => r < ki).length; np[`court_${ki - shift}`] = pendingRef.current[k]; }
            } else { np[k] = pendingRef.current[k]; }
          });
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
    if (hasPermission(roleRef.current, 'canEditCourts')) pushAtomicUpdate(upd, err => setFirebaseError(err));
  }, [round, socialCourts, courtNumbers, tournamentMode, roundRobinCourts, pendingRef, roleRef, closeModal]);

  const handleTogglePause = useCallback(id => {
    setPausedIds(prev => {
      const np = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      if (hasPermission(roleRef.current, 'canTogglePause')) pushAtomicUpdate({ pausedIds: np }, err => setFirebaseError(err));
      return np;
    });
  }, [roleRef]);

  const handleEditSave = useCallback((ri, gameIdx, { game: ng, newBye }) => {
    setHistory(prev => {
      const nh = prev.map((h, i) => i !== ri ? h : { ...h, games: h.games.map((g, gi) => gi !== gameIdx ? g : { ...ng }), bye: newBye });
      const ns = rebuildStandings(activeTeamIds, nh);
      setStandings(ns);
      if (hasPermission(roleRef.current, 'canEditHistoryScores') || hasPermission(roleRef.current, 'canFullEditHistory')) pushAtomicUpdate({ history: nh }, err => setFirebaseError(err));
      return nh;
    });
    closeModal();
  }, [activeTeamIds, roleRef, closeModal]);

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
      pushAtomicUpdate({ roundData: rd, courtNumbers: newCourtNumbers, [`pendingResults/${courtKey(courtIdx)}`]: null }, err => setFirebaseError(err));
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
    if (hasPermission(roleRef.current, 'canEditActiveCourt')) pushAtomicUpdate({ liveAdditions: nl, [`pendingResults/live_${liveIdx}`]: null }, err => setFirebaseError(err));
    closeModal();
  }, [modal, liveAdditions, pendingRef, roleRef, closeModal]);

  const handleAddGameSave = useCallback((target, game) => {
    if (target === 'active') {
      if (round) {
        setActiveRoundExtras(prev => { const ne = [...prev, game]; if (hasPermission(roleRef.current, 'canEditActiveCourt')) pushAtomicUpdate({ activeRoundExtras: ne }, err => setFirebaseError(err)); return ne; });
      } else if (history.length > 0) {
        const ri = history.length - 1;
        setHistory(prev => {
          const nh = prev.map((h, i) => i !== ri ? h : { ...h, games: [...h.games, game] });
          const ns = rebuildStandings(activeTeamIds, nh); setStandings(ns);
          if (hasPermission(roleRef.current, 'canFullEditHistory')) pushAtomicUpdate({ history: nh }, err => setFirebaseError(err));
          return nh;
        });
      } else { return; }
    } else {
      const ri = Number(target);
      setHistory(prev => {
        const nh = prev.map((h, i) => i !== ri ? h : { ...h, games: [...h.games, game] });
        const ns = rebuildStandings(activeTeamIds, nh); setStandings(ns);
        if (hasPermission(roleRef.current, 'canFullEditHistory')) pushAtomicUpdate({ history: nh }, err => setFirebaseError(err));
        return nh;
      });
    }
    closeModal();
  }, [round, history, activeTeamIds, roleRef, closeModal]);

  const handleEditCourtNumber = useCallback((ri, gi, newCourtNum) => {
    const trimmed = String(newCourtNum).trim(); if (!trimmed) return;
    setHistory(prev => {
      const nh = prev.map((h, i) => i !== ri ? h : { ...h, games: h.games.map((g, j) => j !== gi ? g : { ...g, courtNumber: trimmed }) });
      if (hasPermission(roleRef.current, 'canFullEditHistory')) pushAtomicUpdate({ history: nh }, err => setFirebaseError(err));
      return nh;
    });
  }, [roleRef]);

  const handleFinishTournament = useCallback(() => {
    const s = computeSecsLeft(); applyTimerState(false, null, s);
    setBreakMode(null); setTournamentFinished(true);
    if (hasPermission(roleRef.current, 'canFinishTournament')) pushAtomicUpdate({ tournamentFinished: true, timerRunning: false, timerStartedAt: null, timerPausedSecsLeft: s, breakMode: null }, err => setFirebaseError(err));
  }, [computeSecsLeft, applyTimerState, roleRef]);

  const handleResumeTournament = useCallback(() => {
    setTournamentFinished(false);
    if (hasPermission(roleRef.current, 'canFinishTournament')) pushAtomicUpdate({ tournamentFinished: false }, err => setFirebaseError(err));
  }, [roleRef]);

  const handleContinueSwissAfterRR = useCallback(() => { doExitRoundRobin('completed'); }, [doExitRoundRobin]);

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

  // ── PIN modal helpers ─────────────────────────────────────────────────────
  const pinPurpose = modal.open === 'pin' ? modal.data?.purpose : null;
  const pinTitle   = pinPurpose === 'login' ? 'Login' : pinPurpose === 'reset' ? 'PIN required to reset' : pinPurpose === 'exitRR' ? 'PIN required to exit Round Robin' : pinPurpose === 'cancelRound' ? 'PIN required to cancel round' : pinPurpose === 'regenerate' ? 'PIN required to regenerate round' : pinPurpose === 'revertToRound' ? `PIN required to revert to Round ${modal.data?.revertTarget}` : pinPurpose?.startsWith('remove') ? 'PIN required to remove' : 'PIN required';

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

  // ── Modal data extraction helpers ─────────────────────────────────────────
  const editGameTarget    = modal.open === 'editGame'         ? modal.data : null;
  const editActiveCourtIdx= modal.open === 'editActiveCourt'  ? modal.data : null;
  const editLiveIdxVal    = modal.open === 'editLive'         ? modal.data : null;

  return (
    <TeamRegistryContext.Provider value={tournamentTeams}>
      <div className="min-h-screen" style={{ background: '#fff', fontFamily: "'Trebuchet MS',sans-serif", color: '#1e293b' }}>

        {/* ── Modals ── */}
        {modal.open === 'pin' && <PinModal title={pinTitle} checkPin={pinCheckFn} pinLoadError={pinLoadError} onSuccess={handlePinSuccess} onClose={() => { closeModal(); }} />}
        {modal.open === 'tournamentSwapped' && <ConfirmModal title="Tournament changed" message="A new tournament was started from another device. This tab is now showing the new tournament. Reload the page to ensure everything is in sync." confirmLabel="Reload" onConfirm={() => window.location.reload()} onClose={closeModal} />}
        {modal.open === 'confirmReset' && <ConfirmModal title="Back to Setup" message="This will end the current tournament and reset all data. Are you sure?" confirmLabel="Reset" onConfirm={() => { closeModal(); openModal('pin', { purpose: 'reset' }); }} onClose={closeModal} />}
        {modal.open === 'confirmRemoveGame' && modal.data && (
          <ConfirmModal title="Remove game?" message="This will permanently delete this game from history and recalculate standings. Cannot be undone." confirmLabel="Delete"
            onConfirm={() => {
              const { ri, gameIdx } = modal.data;
              setHistory(prev => {
                const nh = prev.map((h, i) => i !== ri ? h : { ...h, games: h.games.filter((_, gi) => gi !== gameIdx) });
                const ns = rebuildStandings(activeTeamIds, nh); setStandings(ns);
                if (roleRef.current === 'admin') pushAtomicUpdate({ history: nh }, err => setFirebaseError(err));
                return nh;
              });
              closeModal();
            }}
            onClose={closeModal} />
        )}
        {modal.open === 'confirmRevert' && modal.data?.roundNum != null && (
          <ConfirmModal title={`Revert to Round ${modal.data.roundNum}?`} message={`This will restore the tournament to the state it was in right after Round ${modal.data.roundNum} completed. All rounds played after that will be lost. This cannot be undone.`} confirmLabel="Revert" onConfirm={doRevertToRound} onClose={closeModal} />
        )}
        {modal.open === 'break' && <BreakModal onStart={handleBreakStart} onClose={closeModal} />}
        {modal.open === 'timerSettings' && <TimerSettingsModal currentMins={timerDefaultMins} onSave={m => { setTimerDefaultMins(m); setTimerDuration(m * 60); if (hasPermission(roleRef.current, 'canEditTimer')) pushAtomicUpdate({ timerDefaultMins: m, timerDuration: m * 60 }, err => setFirebaseError(err)); closeModal(); }} onClose={closeModal} />}
        {modal.open === 'manageTeams' && <ManageTeamsModal activeTeamIds={activeTeamIds} tournamentTeams={tournamentTeams} pausedIds={pausedIds} onTogglePause={handleTogglePause} onSave={handleManageTeamsSave} onClose={closeModal} canEditRoster={hasPermission(role, 'canEditTeams')} />}
        {modal.open === 'manageCourts' && <ManageCourtsModal courtNumbers={courtNumbers} socialCourts={socialCourts} rrCourtCount={tournamentMode === 'roundrobin' ? (roundRobinCourts?.length ?? 0) : 0} onSave={handleManageCourtsSave} onClose={closeModal} />}
        {modal.open === 'selectRRTeams' && <SelectRoundRobinTeamsModal rankedTeamIds={ranked.map(t => t.id)} tournamentCourts={courtNumbers} onConfirm={handleStartRoundRobin} onClose={closeModal} />}
        {modal.open === 'addGame' && addGameData && <AddGameModal allTeamIds={activeTeamIds} defaultCourt={addGameData.defaultCourt} courtNumbers={courtNumbers} usedCourtNumbers={addGameData.usedCourts} usedTeamIds={addGameData.usedTeams} label={addGameData.label} onSave={g => handleAddGameSave(addGameData.target, g)} onClose={closeModal} />}
        {modal.open === 'presetMatch' && <PresetMatchModal allTeamIds={activeTeamIds} courtNumbers={courtNumbers} usedTeamIds={nextRoundPresets.flatMap(p => [p.teamId1, p.teamId2])} usedCourtNumbers={nextRoundPresets.map(p => String(p.courtNumber))} onSave={p => { setNextRoundPresets(prev => { const np = [...prev, p]; if (hasPermission(roleRef.current, 'canPresetMatch')) pushAtomicUpdate({ nextRoundPresets: np }, err => setFirebaseError(err)); return np; }); closeModal(); }} onClose={closeModal} />}
        {modal.open === 'liveAddGame' && <PresetMatchModal allTeamIds={activeTeamIds} courtNumbers={courtNumbers} usedTeamIds={[...(round?.courts.flatMap(p => p.map(t => t.id)) || []), ...liveAdditions.flatMap(la => [la.teamId1, la.teamId2])]} usedCourtNumbers={[...(round?.courts.map((_, i) => String(courtNumbers[i] ?? i + 1)) || []), ...liveAdditions.map(la => String(la.courtNumber))]} onSave={la => { setLiveAdditions(prev => { const nl = [...prev, la]; if (hasPermission(roleRef.current, 'canLiveAddGame')) pushAtomicUpdate({ liveAdditions: nl }, err => setFirebaseError(err)); return nl; }); closeModal(); }} onClose={closeModal} />}
        {editGameTarget && history[editGameTarget.ri] && <EditGameModal game={history[editGameTarget.ri].games[editGameTarget.gameIdx]} roundEntry={history[editGameTarget.ri]} allTeamIds={activeTeamIds} label={`Round ${history[editGameTarget.ri].roundNum} · Court ${history[editGameTarget.ri].games[editGameTarget.gameIdx].courtNumber}`} scoreOnly={hasPermission(role, 'canEditHistoryScores') && !hasPermission(role, 'canFullEditHistory')} onSave={d => handleEditSave(editGameTarget.ri, editGameTarget.gameIdx, d)} onClose={closeModal} />}
        {editActiveCourtIdx !== null && round && <EditActiveCourtModal courtIdx={editActiveCourtIdx} courtNumbers={courtNumbers} currentCourts={round.courts} allTeamIds={activeTeamIds} hasPending={!!pending[courtKey(editActiveCourtIdx)]} onSave={handleEditActiveCourt} onClose={closeModal} />}
        {editLiveIdxVal !== null && liveAdditions[editLiveIdxVal] && <EditActiveCourtModal courtIdx={0} courtNumbers={[liveAdditions[editLiveIdxVal].courtNumber]} currentCourts={[[tournamentTeams.find(t => t.id === liveAdditions[editLiveIdxVal].teamId1), tournamentTeams.find(t => t.id === liveAdditions[editLiveIdxVal].teamId2)]]} allTeamIds={activeTeamIds} hasPending={!!pending[`live_${editLiveIdxVal}`]} onSave={handleEditLiveAddition} onClose={closeModal} />}

        {/* ── Floating show-header pill ── */}
        {headerHidden && <button onClick={() => setHeaderHidden(false)} style={{ position: 'fixed', top: 8, right: 8, zIndex: 50, padding: '6px 14px', borderRadius: 999, fontWeight: 700, fontSize: 12, cursor: 'pointer', background: 'rgba(15,76,117,0.9)', color: '#fff', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.25)' }}>▼ Show header</button>}

        {/* ── Fixed header ── */}
        <div ref={headerRef} style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 40, background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: headerHidden ? 'none' : undefined }}>
          <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 clamp(12px,3vw,20px)' }}>
            <div className="flex items-center gap-3 py-3">
              <img src={ballIcon} alt="pickleball" style={{ width: 'clamp(36px,7vw,52px)', height: 'clamp(36px,7vw,52px)', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
              <div className="flex-1 min-w-0">
                <h1 className="font-black tracking-tight leading-tight truncate" style={{ fontSize: 'clamp(16px,4vw,26px)', color: '#0f4c75' }}>{tournamentTitle}</h1>
                <div className="flex items-center gap-2 flex-wrap">
                  {firebaseConnected && <span style={{ background: '#16a34a', color: '#fff', fontSize: 'clamp(8px,1.8vw,10px)', fontWeight: 800, padding: '1px 6px', borderRadius: 4, letterSpacing: '0.06em' }}>LIVE</span>}
                  {phase === 'play' && <span className="text-slate-500" style={{ fontSize: 'clamp(10px,2.5vw,13px)' }}>{ROLE_MAP[role]?.title ?? 'Viewer'}</span>}
                  {phase === 'setup' && <span className="text-slate-500" style={{ fontSize: 'clamp(10px,2.5vw,13px)' }}>Setup</span>}
                  {Object.values(presence).some(v => v > 0) && <span className="text-slate-400" style={{ fontSize: 'clamp(9px,2vw,11px)' }}>{[...ROLES.map(r => { const n = presence[r.id] ?? 0; return n > 0 ? `${n} ${r.title.toLowerCase()}${n !== 1 ? 's' : ''}` : null; }).filter(Boolean), `${presence.viewer ?? 0} viewer${(presence.viewer ?? 0) !== 1 ? 's' : ''}`].join(' · ')}</span>}
                  {!online && <span style={{ fontSize: 'clamp(9px,2vw,11px)', color: '#dc2626', fontWeight: 700 }}>● Offline</span>}
                </div>
              </div>
              {!viewerOnly && (
                <button onClick={() => { if (role) setRole(null); else openModal('pin', { purpose: 'login' }); }}
                  style={{ flexShrink: 0, fontSize: 'clamp(10px,2.5vw,13px)', padding: '6px 10px', borderRadius: 10, fontWeight: 700, cursor: 'pointer', background: ROLE_MAP[role]?.btnBg ?? 'rgba(0,0,0,0.06)', color: ROLE_MAP[role]?.btnColor ?? '#64748b', border: `1px solid ${ROLE_MAP[role]?.btnBorder ?? 'rgba(0,0,0,0.12)'}` }}>
                  {role ? `${ROLE_MAP[role]?.icon ?? ''} ${ROLE_MAP[role]?.title ?? role}` : '🔒 Login'}
                </button>
              )}
              <button onClick={() => setHeaderHidden(true)} title="Hide header"
                style={{ flexShrink: 0, fontSize: 13, padding: '6px 8px', borderRadius: 10, fontWeight: 700, cursor: 'pointer', background: 'rgba(0,0,0,0.04)', color: '#94a3b8', border: '1px solid rgba(0,0,0,0.08)' }}>▲</button>
            </div>
            {phase === 'play' && (
              <div className="flex gap-2 pb-2">
                {[['play', '🎾 Play'], ['standings', '🏆 Standings'], ['history', '📋 History']].map(([id, label]) => (
                  <button key={id} onClick={() => setActiveTab(id)} className="flex-1 rounded-xl font-bold"
                    style={{ padding: 'clamp(6px,1.5vw,10px) 4px', fontSize: 'clamp(11px,2.5vw,14px)', background: activeTab === id ? 'linear-gradient(90deg,#0f4c75,#1a6fa8)' : 'rgba(0,0,0,0.05)', color: activeTab === id ? '#fff' : '#475569', cursor: 'pointer', border: activeTab === id ? 'none' : '1px solid rgba(0,0,0,0.08)' }}>
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Multi-admin warning ── */}
        {isAdmin && !multiAdminDismissed && ((presence['admin'] ?? 0) - 1) > 0 && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 99, padding: '6px 16px', background: '#d97706', color: '#fff', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <span>⚠️ {(presence['admin'] ?? 0) - 1} other admin session{(presence['admin'] ?? 0) - 1 > 1 ? 's' : ''} active — results from multiple admins are now handled safely.</span>
            <button onClick={() => setMultiAdminDismissed(true)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 900, fontSize: 18, lineHeight: 1, padding: '0 2px', flexShrink: 0 }}>×</button>
          </div>
        )}
        {firebaseError && (
          <div style={{ position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 100, display: 'flex', flexDirection: 'column', gap: 6, padding: '10px 16px', borderRadius: 10, background: '#dc2626', color: '#fff', fontWeight: 700, fontSize: 13, boxShadow: '0 2px 16px rgba(0,0,0,0.3)', maxWidth: 'calc(100vw - 32px)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>⚠️ {firebaseError}</span>
              {firebaseErrorPersist && retrySnapshotRef.current && <button onClick={retryWrite} style={{ padding: '3px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.4)', color: '#fff', fontWeight: 800, fontSize: 12, cursor: 'pointer' }}>Retry</button>}
              <button onClick={dismissError} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 900, fontSize: 16, lineHeight: 1 }}>×</button>
            </div>
            {firebaseErrorPersist && <span style={{ fontSize: 11, fontWeight: 600, opacity: 0.9 }}>Do not refresh — tournament data is held in memory and will sync when connection is restored.</span>}
          </div>
        )}

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
          {(phase === 'loading' || phase === 'waiting' || phase === 'setup') && isAdmin && <SetupScreen onStart={handleStart} />}

          {phase === 'play' && (
            <>
              {activeTab === 'play' && (
                <PlayTab
                  tournamentFinished={tournamentFinished} breakMode={activeTab === 'play' ? breakMode : null}
                  round={round} roundNum={roundNum} tournamentMode={tournamentMode}
                  roundRobinSchedule={roundRobinSchedule} roundRobinCourts={roundRobinCourts} roundRobinStartRoundNum={roundRobinStartRoundNum}
                  courtNumbers={courtNumbers} socialCourts={socialCourts} liveAdditions={liveAdditions}
                  pending={pending} role={role} finalRound={finalRound} pausedIds={pausedIds}
                  targetRounds={targetRounds}
                  setFinalRound={v => { setFinalRound(v); if (hasPermission(roleRef.current, 'canSetFinalRound')) pushAtomicUpdate({ finalRound: v }, err => setFirebaseError(err)); }}
                  history={history} ranked={ranked} activeRoundExtras={activeRoundExtras}
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
                  onRemovePreset={pi => { setNextRoundPresets(prev => { const np = prev.filter((_, i) => i !== pi); if (hasPermission(roleRef.current, 'canPresetMatch')) pushAtomicUpdate({ nextRoundPresets: np }, err => setFirebaseError(err)); return np; }); }}
                  onRemoveExtra={gi => openModal('pin', { purpose: 'removeActiveRoundExtra', removeActiveRoundExtraIdx: gi })}
                  onSelectRRTeams={() => openModal('selectRRTeams')}
                  onPresetMatch={() => openModal('presetMatch')}
                  onLiveAddGame={() => openModal('liveAddGame')}
                  onContinueSwissAfterRR={handleContinueSwissAfterRR}
                  onExitRoundRobin={(reason) => reason ? doExitRoundRobin(reason) : handleExitRoundRobin()}
                  onManageTeams={() => openModal('manageTeams')} onManageCourts={() => openModal('manageCourts')}
                  onReset={() => openModal('confirmReset')} onCancelRound={() => openModal('pin', { purpose: 'cancelRound' })}
                  rrMatchKey={rrMatchKey}
                />
              )}
              {activeTab === 'standings' && <StandingsTab ranked={ranked} pausedIds={pausedIds} />}
              {activeTab === 'history' && (
                <HistoryTab
                  history={history} activeTeamIds={activeTeamIds} cancelledRoundNums={cancelledRoundNums}
                  roundRobinStartSnapshot={roundRobinStartSnapshot} roundRobinEndSnapshot={roundRobinEndSnapshot}
                  canEditScores={hasPermission(role, 'canEditHistoryScores') || hasPermission(role, 'canFullEditHistory')}
                  canDeleteGame={hasPermission(role, 'canDeleteHistoryGame')}
                  canFullEdit={hasPermission(role, 'canFullEditHistory')}
                  backupRoundNums={backupRoundNums}
                  onAddGame={ri => openModal('addGame', { target: String(ri), defaultCourt: '' })}
                  onEditGame={(ri, gameIdx) => openModal('editGame', { ri, gameIdx })}
                  onRemoveGame={(ri, gameIdx) => { openModal('pin', { purpose: 'removeGame', removeGameTarget: { ri, gameIdx } }); }}
                  onRevertToRound={rn => { openModal('pin', { purpose: 'revertToRound', revertTarget: rn }); }}
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
