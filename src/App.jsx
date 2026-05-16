import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { TeamRegistryContext } from './context/TeamRegistryContext';
import { setModuleRegistry } from './constants';
import { courtKey, liveKey } from './constants';
import { db, ref, set as fbSet, update as fbUpdate, onValue, off, push, get, onDisconnect, remove, pushSnapshot, pushAtomicUpdate, isOwnToken } from './firebase';
import { saveState, loadState, clearSave } from './storage';
import { warmUpAudio, playAlarm, playWarningBeep } from './audio';
import { normaliseSnapshot } from './normalise';
import { mkStandings, rerank, rebuildStandings } from './algorithms/standings';
import { generateRound } from './algorithms/pairing';
import { generateRoundRobinSchedule } from './algorithms/roundRobin';
import useOnline from './hooks/useOnline';
import RestoreBanner from './components/RestoreBanner';
import RoundTimer from './components/RoundTimer';
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

  // ── Phase & tournament identity ───────────────────────────────────────────
  const [phase, setPhase] = useState('loading');
  const [tournamentTitle, setTournamentTitle] = useState('Tournament');
  useEffect(() => { document.title = tournamentTitle; }, [tournamentTitle]);

  // ── Tournament data ───────────────────────────────────────────────────────
  const [activeTeamIds, setActiveTeamIds] = useState([]);
  const [tournamentTeams, setTournamentTeams] = useState([]);
  useEffect(() => { setModuleRegistry(tournamentTeams); }, [tournamentTeams]);

  const [courtNumbers, setCourtNumbers] = useState([]);
  const [timerDuration, setTimerDuration] = useState(0);
  const [timerDefaultMins, setTimerDefaultMins] = useState(12);
  const [history, setHistory] = useState([]);
  const [standings, setStandings] = useState([]);
  const [round, setRound] = useState(null);
  const [roundNum, setRoundNum] = useState(1);
  const [pending, setPending] = useState({});
  const pendingRef = useRef({});
  const [roundComplete, setRoundComplete] = useState(false);
  const [roundKey, setRoundKey] = useState(0);
  const [pausedIds, setPausedIds] = useState([]);
  const [tournamentMode, setTournamentMode] = useState('swiss');
  const [roundRobinSchedule, setRoundRobinSchedule] = useState(null);
  const [roundRobinCourts, setRoundRobinCourts] = useState(null);
  const [roundRobinStartRoundNum, setRoundRobinStartRoundNum] = useState(null);
  const [roundRobinStartSnapshot, setRoundRobinStartSnapshot] = useState(null);
  const [roundRobinEndSnapshot, setRoundRobinEndSnapshot] = useState(null);
  const [activeRoundExtras, setActiveRoundExtras] = useState([]);
  const [liveAdditions, setLiveAdditions] = useState([]);
  const [nextRoundPresets, setNextRoundPresets] = useState([]);
  const [tournamentFinished, setTournamentFinished] = useState(false);
  const [breakMode, setBreakMode] = useState(null);
  const [cancelledRoundNums, setCancelledRoundNums] = useState([]);
  const [finalRound, setFinalRound] = useState(false);
  const [socialCourts, setSocialCourts] = useState([]);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('play');
  useEffect(() => { if (activeTab === 'timer') setActiveTab('play'); }, [activeTab]);

  const [isAdmin, setIsAdmin] = useState(false);
  const isAdminRef = useRef(false);
  useEffect(() => { isAdminRef.current = isAdmin; }, [isAdmin]);

  const [adminPin, setAdminPin] = useState(null);
  const [adminPinLoaded, setAdminPinLoaded] = useState(false);
  const [adminPinLoadError, setAdminPinLoadError] = useState(false);
  const [pinPurpose, setPinPurpose] = useState(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const [presence, setPresence] = useState({ viewers: 0, admins: 0 });
  const [firebaseError, setFirebaseError] = useState(null);
  useEffect(() => {
    if (!firebaseError) return;
    const t = setTimeout(() => setFirebaseError(null), 5000);
    return () => clearTimeout(t);
  }, [firebaseError]);

  const [savedState, setSavedState] = useState(null);
  const [headerHidden, setHeaderHidden] = useState(false);
  const headerRef = useRef(null);
  const [headerHeight, setHeaderHeight] = useState(140);
  useEffect(() => {
    const el = headerRef.current; if (!el) return;
    const ro = new ResizeObserver(([e]) => setHeaderHeight(e.contentRect.height + 2));
    ro.observe(el); return () => ro.disconnect();
  }, []);

  // ── Modal state ───────────────────────────────────────────────────────────
  const [showBreakModal, setShowBreakModal] = useState(false);
  const [showTimerSettings, setShowTimerSettings] = useState(false);
  const [showManageTeams, setShowManageTeams] = useState(false);
  const [showManageCourts, setShowManageCourts] = useState(false);
  const [showSelectRRTeams, setShowSelectRRTeams] = useState(false);
  const [showAddGame, setShowAddGame] = useState(null); // { target: 'active'|ri, defaultCourt }
  const [showPresetMatch, setShowPresetMatch] = useState(false);
  const [showLiveAddGame, setShowLiveAddGame] = useState(false);
  const [editTarget, setEditTarget] = useState(null); // { ri, gameIdx }
  const [editActiveCourt, setEditActiveCourt] = useState(null);
  const [editLiveIdx, setEditLiveIdx] = useState(null);
  const [removeGameTarget, setRemoveGameTarget] = useState(null);
  const [removeActiveCourtIdx, setRemoveActiveCourtIdx] = useState(null);
  const [removeLiveIdx, setRemoveLiveIdx] = useState(null);
  const [removeActiveRoundExtraIdx, setRemoveActiveRoundExtraIdx] = useState(null);

  // ── Timer ─────────────────────────────────────────────────────────────────
  const timerRunningRef = useRef(false), timerStartedAtRef = useRef(null), timerPausedSecsRef = useRef(0);
  const timerDurationRef = useRef(0), alarmFiredRef = useRef(false), timerTickRef = useRef(null);
  const warningsFiredRef = useRef(new Set());
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSecsLeft, setTimerSecsLeft] = useState(0);
  const [timerAlarmed, setTimerAlarmed] = useState(false);
  useEffect(() => { timerDurationRef.current = timerDuration; }, [timerDuration]);
  const breakModeRef = useRef(null);
  useEffect(() => { breakModeRef.current = breakMode; }, [breakMode]);

  const computeSecsLeft = useCallback(() => {
    if (!timerRunningRef.current || !timerStartedAtRef.current) return timerPausedSecsRef.current;
    return Math.max(0, timerPausedSecsRef.current - Math.floor((Date.now() - timerStartedAtRef.current) / 1000));
  }, []);

  const applyTimerState = useCallback((running, startedAt, pausedSecs) => {
    timerRunningRef.current = running;
    timerStartedAtRef.current = startedAt;
    timerPausedSecsRef.current = pausedSecs;
    const secs = running && startedAt ? Math.max(0, pausedSecs - Math.floor((Date.now() - startedAt) / 1000)) : pausedSecs;
    setTimerSecsLeft(secs); setTimerRunning(running);
    clearInterval(timerTickRef.current);
    if (running && startedAt && secs > 0) {
      timerTickRef.current = setInterval(() => {
        const s = computeSecsLeft(); setTimerSecsLeft(s);
        [180, 60].forEach(thresh => {
          if (s <= thresh && !warningsFiredRef.current.has(thresh) && timerDurationRef.current > thresh) {
            warningsFiredRef.current.add(thresh); playWarningBeep();
          }
        });
        if (s <= 0) {
          clearInterval(timerTickRef.current);
          if (!alarmFiredRef.current && timerDurationRef.current > 0) {
            alarmFiredRef.current = true; playAlarm();
            timerRunningRef.current = false; setTimerRunning(false); setTimerAlarmed(true);
          }
        }
      }, 500);
    }
  }, [computeSecsLeft]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      if (!timerRunningRef.current || !timerStartedAtRef.current) return;
      const s = computeSecsLeft();
      [180, 60].forEach(thresh => { if (s <= thresh) warningsFiredRef.current.add(thresh); });
      if (s <= 0 && !alarmFiredRef.current) alarmFiredRef.current = true;
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [computeSecsLeft]);

  const resetTimer = useCallback((ns) => {
    alarmFiredRef.current = false; warningsFiredRef.current = new Set();
    const s = ns ?? timerDurationRef.current;
    setTimerAlarmed(false); applyTimerState(false, null, s);
    if (isAdminRef.current) pushAtomicUpdate({ timerRunning: false, timerStartedAt: null, timerPausedSecsLeft: s }, err => setFirebaseError(err));
  }, [applyTimerState]);

  const timerToggle = useCallback(() => {
    if (!timerRunningRef.current) {
      const sa = Date.now(); applyTimerState(true, sa, timerPausedSecsRef.current);
      if (isAdminRef.current) pushAtomicUpdate({ timerRunning: true, timerStartedAt: sa, timerPausedSecsLeft: timerPausedSecsRef.current }, err => setFirebaseError(err));
    } else {
      const s = computeSecsLeft(); applyTimerState(false, null, s);
      if (isAdminRef.current) pushAtomicUpdate({ timerRunning: false, timerStartedAt: null, timerPausedSecsLeft: s }, err => setFirebaseError(err));
    }
  }, [applyTimerState, computeSecsLeft]);

  // ── Firebase admin PIN ────────────────────────────────────────────────────
  useEffect(() => {
    get(ref(db, 'config/adminPin')).then(snap => {
      const val = snap.val();
      if (val) setAdminPin(String(val));
      setAdminPinLoaded(true);
    }).catch(() => { setAdminPinLoaded(true); setAdminPinLoadError(true); });
  }, []);

  // ── Firebase main listener ────────────────────────────────────────────────
  const lastSeenRoundNum = useRef(-1), initialLoadDone = useRef(false);

  const updateAllStates = useCallback((s) => {
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
    setSocialCourts(s.socialCourts || []);
    const isNew = s.roundNum !== lastSeenRoundNum.current;
    if (isNew) { lastSeenRoundNum.current = s.roundNum; pendingRef.current = {}; setPending({}); setRoundKey(k => k + 1); }
    alarmFiredRef.current = false;
    const tRun = s.timerRunning || false, tSA = s.timerStartedAt || null, tPS = s.timerPausedSecsLeft ?? s.timerDuration ?? 0, tDur = s.timerDuration || 0;
    const curSecs = tRun && tSA ? Math.max(0, tPS - Math.floor((Date.now() - tSA) / 1000)) : tPS;
    [180, 60].forEach(thresh => { if (tDur > thresh && curSecs <= thresh) warningsFiredRef.current.add(thresh); });
    if (curSecs <= 0 && tDur > 0) alarmFiredRef.current = true;
    applyTimerState(tRun, tSA, tPS);
    setPhase('play');
  }, [applyTimerState]);

  useEffect(() => {
    const r = ref(db, 'current_tournament');
    onValue(r, snap => {
      const data = snap.val();
      if (!initialLoadDone.current) initialLoadDone.current = true;
      if (!data) { setPhase(p => p === 'play' ? 'waiting' : p); return; }
      if (data._writeToken && isOwnToken(data._writeToken)) return;
      if (data.phase !== 'play') { setPhase('waiting'); return; }
      updateAllStates(normaliseSnapshot(data));
    });
    return () => off(r);
  }, [updateAllStates]);

  useEffect(() => {
    const r = ref(db, 'current_tournament/pendingResults');
    onValue(r, snap => {
      const d = snap.val(); if (!d) return;
      setPending(prev => {
        const m = { ...prev };
        Object.keys(d).forEach(k => { if (!m[k]) m[k] = d[k]; });
        pendingRef.current = m; return m;
      });
    });
    return () => off(r);
  }, []);

  useEffect(() => {
    const saved = loadState(); if (saved && saved.phase === 'play') setSavedState(saved);
    const t = setTimeout(() => { if (!initialLoadDone.current) { initialLoadDone.current = true; setPhase('waiting'); } }, 6000);
    return () => clearTimeout(t);
  }, []);

  // ── Presence ──────────────────────────────────────────────────────────────
  const myPresRef = useRef(null);
  useEffect(() => {
    const r = push(ref(db, 'presence')); myPresRef.current = r;
    onDisconnect(r).remove();
    fbSet(r, { role: 'viewer', joinedAt: Date.now() }).catch(() => {});
    const presRef = ref(db, 'presence');
    onValue(presRef, snap => {
      const d = snap.val() || {}, e = Object.values(d);
      setPresence({ viewers: e.filter(x => x?.role === 'viewer').length, admins: e.filter(x => x?.role === 'admin').length });
    });
    return () => { remove(r); off(presRef); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (myPresRef.current) fbUpdate(myPresRef.current, { role: isAdmin ? 'admin' : 'viewer' }).catch(() => {});
  }, [isAdmin]);

  // ── Local auto-save ───────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'play') return;
    const rd = (round && round.courts && round.courts.length > 0) ? {
      courtTeamIds: round.courts.map(p => p.map(t => t?.id).filter(Boolean)),
      byeIds: (round.bye || []).map(t => t?.id).filter(Boolean),
      pausedTeamIds: (round.paused || []).map(t => t?.id).filter(Boolean),
    } : null;
    const savedSecsLeft = timerRunningRef.current && timerStartedAtRef.current
      ? Math.max(0, timerPausedSecsRef.current - Math.floor((Date.now() - timerStartedAtRef.current) / 1000))
      : timerPausedSecsRef.current;
    saveState({ phase, activeTeamIds, courtNumbers, timerDuration, timerDefaultMins, history, roundNum, pausedIds, roundData: rd, teamRegistry: tournamentTeams, tournamentTitle, tournamentMode, roundRobinSchedule, roundRobinCourts, roundRobinStartRoundNum, roundRobinStartSnapshot, roundRobinEndSnapshot, activeRoundExtras, liveAdditions, nextRoundPresets, tournamentFinished, breakMode, cancelledRoundNums, timerRunning: false, timerStartedAt: null, timerPausedSecsLeft: savedSecsLeft, savedAt: Date.now() });
  }, [phase, history, roundNum, pausedIds, activeTeamIds, courtNumbers, timerDuration, tournamentMode, tournamentTeams, tournamentTitle, roundRobinSchedule, roundRobinCourts, roundRobinStartRoundNum, roundRobinStartSnapshot, roundRobinEndSnapshot, activeRoundExtras, liveAdditions, nextRoundPresets, tournamentFinished, breakMode, cancelledRoundNums, round, timerDefaultMins]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRestore = () => { const s = savedState; setSavedState(null); updateAllStates(normaliseSnapshot(s)); setActiveTab('play'); };

  // ── Swipe navigation ──────────────────────────────────────────────────────
  const TAB_ORDER = ['play', 'standings', 'history'];
  const swipeTouchRef = useRef(null);
  const handleSwipeStart = useCallback(e => { const t = e.touches[0]; swipeTouchRef.current = { x: t.clientX, y: t.clientY }; }, []);
  const handleSwipeEnd = useCallback(e => {
    if (!swipeTouchRef.current) return;
    const dx = e.changedTouches[0].clientX - swipeTouchRef.current.x;
    const dy = e.changedTouches[0].clientY - swipeTouchRef.current.y;
    swipeTouchRef.current = null;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    setActiveTab(t => { const i = TAB_ORDER.indexOf(t); if (i === -1) return t; const ni = i + (dx < 0 ? 1 : -1); return TAB_ORDER[Math.max(0, Math.min(TAB_ORDER.length - 1, ni))]; });
  }, []);

  // ── ranked memo ──────────────────────────────────────────────────────────
  const ranked = useMemo(() => rerank(standings), [standings]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const numCourts = courtNumbers.length;

  const handleStart = useCallback((allTeams, teamIds, courts, durSecs, title) => {
    setTournamentTeams(allTeams);
    const resolvedTitle = title || 'Tournament';
    setTournamentTitle(resolvedTitle);
    const s = mkStandings(teamIds);
    const snap = { phase: 'play', activeTeamIds: teamIds, courtNumbers: courts, socialCourts: [], teamRegistry: allTeams, tournamentTitle: resolvedTitle, timerDuration: durSecs, timerDefaultMins: durSecs > 0 ? Math.round(durSecs / 60) : 12, history: [], roundNum: 0, pausedIds: [], timerRunning: false, timerStartedAt: null, timerPausedSecsLeft: durSecs, roundData: null, roundComplete: false, tournamentMode: 'swiss', roundRobinSchedule: null, roundRobinCourts: null, roundRobinStartRoundNum: null, roundRobinStartSnapshot: null, roundRobinEndSnapshot: null, activeRoundExtras: [], tournamentFinished: false, savedAt: Date.now() };
    saveState(snap); pushSnapshot(snap, err => setFirebaseError(err)); setIsAdmin(true);
    setActiveTeamIds(teamIds); setCourtNumbers(courts); setTimerDuration(durSecs);
    setStandings(s); setRound(null); setRoundNum(0); setHistory([]);
    lastSeenRoundNum.current = 0; pendingRef.current = {}; setPending({}); setPausedIds([]); setRoundKey(0); setRoundComplete(false);
    setTournamentMode('swiss'); setRoundRobinSchedule(null); setRoundRobinCourts(null); setRoundRobinStartRoundNum(null); setRoundRobinStartSnapshot(null); setRoundRobinEndSnapshot(null); setActiveRoundExtras([]); setTournamentFinished(false); setSocialCourts([]);
    alarmFiredRef.current = false; warningsFiredRef.current = new Set(); setTimerAlarmed(false); applyTimerState(false, null, durSecs);
    setPhase('play'); setActiveTab('play');
  }, [applyTimerState]);

  const handleBreakStart = useCallback((message, durationSecs) => {
    const bm = { message, endAt: Date.now() + durationSecs * 1000 };
    setBreakMode(bm); setShowBreakModal(false);
    if (isAdminRef.current) pushAtomicUpdate({ breakMode: bm }, err => setFirebaseError(err));
  }, []);

  const handleBreakEnd = useCallback(() => {
    setBreakMode(null);
    if (isAdminRef.current) pushAtomicUpdate({ breakMode: null }, err => setFirebaseError(err));
  }, []);

  const doReset = useCallback(() => {
    clearSave(); pushSnapshot(null, err => setFirebaseError(err));
    lastSeenRoundNum.current = -1; setPhase('setup'); setIsAdmin(false);
    setHistory([]); setStandings([]); setRound(null); setPausedIds([]);
    pendingRef.current = {}; setPending({}); setTournamentMode('swiss');
    setRoundRobinSchedule(null); setRoundRobinCourts(null); setRoundRobinStartRoundNum(null);
    setRoundRobinStartSnapshot(null); setRoundRobinEndSnapshot(null);
    setActiveRoundExtras([]); setLiveAdditions([]); setNextRoundPresets([]);
    setTournamentFinished(false); setBreakMode(null); setCancelledRoundNums([]); setSocialCourts([]);
    resetTimer(0);
  }, [resetTimer]);

  const doRegenerateRound = useCallback(() => {
    const ns = rebuildStandings(activeTeamIds, history);
    const compCourts = courtNumbers.filter(c => !socialCourts.includes(String(c)));
    const nr = generateRound(ns, compCourts.length, history.length, history, pausedIds, finalRound);
    const roundCourtNums = compCourts.slice(0, nr.courts.length);
    const nrWithNums = { ...nr, courtNums: roundCourtNums };
    if (isAdminRef.current) { const rd = { courtTeamIds: nr.courts.map(p => p.map(t => t.id)), byeIds: nr.bye.map(t => t.id), pausedTeamIds: (nr.paused || []).map(t => t.id), courtNums: roundCourtNums }; pushAtomicUpdate({ roundData: rd, pendingResults: null }, err => setFirebaseError(err)); }
    setRound(nrWithNums); pendingRef.current = {}; setPending({}); setRoundKey(k => k + 1); setLiveAdditions([]);
  }, [activeTeamIds, history, courtNumbers, socialCourts, pausedIds, finalRound]);

  const doCancelRound = useCallback(() => {
    const prevRN = Math.max(0, roundNum - 1);
    const prevRC = history.length > 0;
    const newCancelled = [...cancelledRoundNums, roundNum];
    const bm = breakModeRef.current;
    const cancelSecs = bm && timerRunningRef.current && timerStartedAtRef.current ? Math.max(0, timerPausedSecsRef.current - Math.floor((Date.now() - timerStartedAtRef.current) / 1000)) : timerPausedSecsRef.current;
    const snap = { phase: 'play', activeTeamIds, courtNumbers, teamRegistry: tournamentTeams, tournamentTitle, timerDuration, timerDefaultMins, history, roundNum: prevRN, pausedIds, roundComplete: prevRC, timerRunning: bm ? timerRunningRef.current : false, timerStartedAt: bm ? timerStartedAtRef.current : null, timerPausedSecsLeft: bm ? cancelSecs : timerDuration, roundData: null, breakMode: bm, tournamentMode, roundRobinSchedule, roundRobinCourts, roundRobinStartRoundNum, roundRobinStartSnapshot, roundRobinEndSnapshot, activeRoundExtras: [], liveAdditions: [], nextRoundPresets, tournamentFinished, cancelledRoundNums: newCancelled, savedAt: Date.now() };
    lastSeenRoundNum.current = prevRN; saveState(snap); pushSnapshot(snap, err => setFirebaseError(err));
    setCancelledRoundNums(newCancelled); setRound(null); setRoundNum(prevRN); setRoundComplete(prevRC);
    pendingRef.current = {}; setPending({}); setActiveRoundExtras([]); setRoundKey(k => k + 1);
    alarmFiredRef.current = false; warningsFiredRef.current = new Set(); setTimerAlarmed(false);
    if (!bm) applyTimerState(false, null, timerDuration);
  }, [roundNum, history, cancelledRoundNums, activeTeamIds, courtNumbers, tournamentTeams, tournamentTitle, timerDuration, timerDefaultMins, pausedIds, tournamentMode, roundRobinSchedule, roundRobinCourts, roundRobinStartRoundNum, roundRobinStartSnapshot, roundRobinEndSnapshot, nextRoundPresets, tournamentFinished, applyTimerState]);

  const doExitRoundRobin = useCallback((reason = 'manual') => {
    const srn = roundRobinStartRoundNum || 0;
    const rrRoundsInHistory = history.filter(h => h.roundNum >= srn);
    const lastRRNum = rrRoundsInHistory.length > 0 ? rrRoundsInHistory.reduce((m, h) => Math.max(m, h.roundNum), 0) : null;
    const endSnap = { endRoundNum: lastRRNum, endReason: reason };
    // Restore roundNum to before the RR started if no RR rounds were committed,
    // otherwise keep it at the last committed RR round so the next Swiss round is numbered correctly.
    const restoredRoundNum = lastRRNum != null ? lastRRNum : Math.max(0, (roundRobinStartRoundNum || 1) - 1);
    setTournamentMode('swiss'); setRoundRobinSchedule(null); setRoundRobinCourts(null); setRoundRobinStartRoundNum(null); setRoundRobinEndSnapshot(endSnap);
    setRoundNum(restoredRoundNum); lastSeenRoundNum.current = restoredRoundNum;
    const cleared = {};
    Object.keys(pendingRef.current).forEach(k => { if (!k.startsWith('rr_')) cleared[k] = pendingRef.current[k]; });
    pendingRef.current = cleared; setPending(cleared);
    if (isAdminRef.current) { pushAtomicUpdate({ tournamentMode: 'swiss', roundRobinSchedule: null, roundRobinCourts: null, roundRobinStartRoundNum: null, roundRobinEndSnapshot: endSnap, roundNum: restoredRoundNum, pendingResults: null }, err => setFirebaseError(err)); }
  }, [roundRobinStartRoundNum, history]);

  const handlePinSuccess = useCallback(() => {
    const purpose = pinPurpose;
    if (purpose === 'admin') { setIsAdmin(true); }
    else if (purpose === 'reset') { doReset(); }
    else if (purpose === 'regenerate') { doRegenerateRound(); }
    else if (purpose === 'exitRR') { doExitRoundRobin(); }
    else if (purpose === 'cancelRound') { doCancelRound(); }
    else if (purpose === 'removeGame' && removeGameTarget) {
      const { ri, gameIdx } = removeGameTarget;
      setHistory(prev => {
        const nh = prev.map((h, i) => i !== ri ? h : { ...h, games: h.games.filter((_, gi) => gi !== gameIdx) });
        const ns = rebuildStandings(activeTeamIds, nh);
        setStandings(ns);
        if (isAdminRef.current) pushAtomicUpdate({ history: nh }, err => setFirebaseError(err));
        return nh;
      });
      setRemoveGameTarget(null);
    }
    else if (purpose === 'removeActiveCourt' && removeActiveCourtIdx !== null && round) {
      const idx = removeActiveCourtIdx;
      const teamsRemoved = round.courts[idx] || [];
      const newCourts = round.courts.filter((_, i) => i !== idx);
      const newBye = [...(round.bye || []), ...teamsRemoved];
      const newCourtNums = (round.courtNums || courtNumbers).filter((_, i) => i !== idx);
      const newRound = { ...round, courts: newCourts, bye: newBye, courtNums: newCourtNums };
      setRound(newRound);
      const np = {};
      Object.keys(pendingRef.current).forEach(k => {
        if (k.startsWith('court_')) { const ki = parseInt(k.replace('court_', '')); if (ki < idx) np[k] = pendingRef.current[k]; else if (ki > idx) np[`court_${ki - 1}`] = pendingRef.current[k]; }
        else { np[k] = pendingRef.current[k]; }
      });
      pendingRef.current = np; setPending(np);
      if (isAdminRef.current) { const rd = { courtTeamIds: newCourts.map(p => p.map(t => t.id)), byeIds: newBye.map(t => t.id), pausedTeamIds: (round.paused || []).map(t => t.id), courtNums: newCourtNums }; pushAtomicUpdate({ roundData: rd, pendingResults: np }, err => setFirebaseError(err)); }
      setRemoveActiveCourtIdx(null);
    }
    else if (purpose === 'removeLiveAddition' && removeLiveIdx !== null) {
      const i = removeLiveIdx;
      setLiveAdditions(prev => {
        const nl = prev.filter((_, j) => j !== i);
        const np = {};
        Object.keys(pendingRef.current).forEach(k => {
          if (k.startsWith('live_')) { const ki = parseInt(k.replace('live_', '')); if (ki < i) np[k] = pendingRef.current[k]; else if (ki > i) np[`live_${ki - 1}`] = pendingRef.current[k]; }
          else { np[k] = pendingRef.current[k]; }
        });
        pendingRef.current = np; setPending(np);
        if (isAdminRef.current) pushAtomicUpdate({ liveAdditions: nl, pendingResults: np }, err => setFirebaseError(err));
        return nl;
      });
      setRemoveLiveIdx(null);
    }
    else if (purpose === 'removeActiveRoundExtra' && removeActiveRoundExtraIdx !== null) {
      setActiveRoundExtras(prev => {
        const ne = prev.filter((_, i) => i !== removeActiveRoundExtraIdx);
        if (isAdminRef.current) pushAtomicUpdate({ activeRoundExtras: ne }, err => setFirebaseError(err));
        return ne;
      });
      setRemoveActiveRoundExtraIdx(null);
    }
    setPinPurpose(null);
  }, [pinPurpose, removeGameTarget, removeActiveCourtIdx, removeLiveIdx, removeActiveRoundExtraIdx, round, courtNumbers, activeTeamIds, doReset, doRegenerateRound, doCancelRound, doExitRoundRobin]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleManageTeamsSave = useCallback((newRegistry, newActiveIds) => {
    setTournamentTeams(newRegistry);
    setActiveTeamIds(newActiveIds);
    const ns = rebuildStandings(newActiveIds, history);
    setStandings(ns);
    setShowManageTeams(false);
    if (isAdminRef.current) pushAtomicUpdate({ teamRegistry: newRegistry, activeTeamIds: newActiveIds }, err => setFirebaseError(err));
  }, [history]);

  const handleManageCourtsSave = useCallback((newCourts, newSocialCourts) => {
    const upd = { courtNumbers: newCourts, socialCourts: newSocialCourts };

    // Move teams to bye if their court just became social mid-round
    if (round) {
      const prevSocialSet = new Set(socialCourts.map(String));
      const newlySocial = new Set(newSocialCourts.filter(c => !prevSocialSet.has(String(c))).map(String));
      if (newlySocial.size > 0) {
        const currentNums = round.courtNums || courtNumbers;
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
          if (isAdminRef.current) {
            upd.roundData = { courtTeamIds: newRoundCourts.map(p => p.map(t => t.id)), byeIds: newBye.map(t => t.id), pausedTeamIds: (round.paused || []).map(t => t.id), courtNums: newRoundNums };
            upd.pendingResults = np;
          }
        }
      }
    }

    if (tournamentMode === 'roundrobin' && roundRobinCourts) {
      const mapped = roundRobinCourts.map((old) => { const i = courtNumbers.indexOf(old); return i >= 0 && i < newCourts.length ? newCourts[i] : old; });
      setRoundRobinCourts(mapped); upd.roundRobinCourts = mapped;
    }
    setCourtNumbers(newCourts); setSocialCourts(newSocialCourts); setShowManageCourts(false);
    if (isAdminRef.current) pushAtomicUpdate(upd, err => setFirebaseError(err));
  }, [round, socialCourts, courtNumbers, tournamentMode, roundRobinCourts]);

  const handleTogglePause = useCallback(id => {
    setPausedIds(prev => {
      const np = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      if (isAdminRef.current) pushAtomicUpdate({ pausedIds: np }, err => setFirebaseError(err));
      return np;
    });
  }, []);

  const handleResult = useCallback((ci, result) => {
    warmUpAudio();
    const key = courtKey(ci);
    setPending(prev => {
      const np = { ...prev, [key]: result };
      pendingRef.current = np;
      if (isAdminRef.current) pushAtomicUpdate({ [`pendingResults/${key}`]: result }, err => setFirebaseError(err));
      if (round && round.courts.every((_, i) => np[courtKey(i)]) && liveAdditions.every((_, i) => np[liveKey(i)])) {
        const officialGames = round.courts.map((_, i) => ({ ...np[courtKey(i)], courtNumber: courtNumbers[i] ?? i + 1 }));
        const liveGames = liveAdditions.map((la, i) => ({ ...np[liveKey(i)], courtNumber: la.courtNumber }));
        const games = [...officialGames, ...liveGames, ...activeRoundExtras];
        const entry = { roundNum, games, bye: round.bye.map(t => t.id), paused: (round.paused || []).map(t => t.id) };
        const nh = [...history, entry], ns = rebuildStandings(activeTeamIds, nh);
        if (isAdminRef.current) {
          const bm = breakModeRef.current;
          const completeSecs = bm && timerRunningRef.current && timerStartedAtRef.current ? Math.max(0, timerPausedSecsRef.current - Math.floor((Date.now() - timerStartedAtRef.current) / 1000)) : timerPausedSecsRef.current;
          const snap = { phase: 'play', activeTeamIds, courtNumbers, teamRegistry: tournamentTeams, tournamentTitle, timerDuration, timerDefaultMins, history: nh, roundNum, pausedIds, roundComplete: true, timerRunning: bm ? timerRunningRef.current : false, timerStartedAt: bm ? timerStartedAtRef.current : null, timerPausedSecsLeft: bm ? completeSecs : timerDuration, roundData: null, breakMode: bm, tournamentMode, roundRobinSchedule, roundRobinCourts, roundRobinStartRoundNum, roundRobinStartSnapshot, roundRobinEndSnapshot, activeRoundExtras: [], liveAdditions: [], nextRoundPresets, tournamentFinished, savedAt: Date.now() };
          saveState(snap); pushSnapshot(snap, err => setFirebaseError(err));
        }
        setHistory(nh); setStandings(ns); setRound(null); setRoundComplete(true); setActiveRoundExtras([]); setLiveAdditions([]);
        alarmFiredRef.current = false; setTimerAlarmed(false); if (!breakModeRef.current) applyTimerState(false, null, timerDuration);
      }
      return np;
    });
  }, [round, liveAdditions, activeRoundExtras, roundNum, history, activeTeamIds, courtNumbers, tournamentTeams, tournamentTitle, timerDuration, timerDefaultMins, pausedIds, tournamentMode, roundRobinSchedule, roundRobinCourts, roundRobinStartRoundNum, roundRobinStartSnapshot, roundRobinEndSnapshot, nextRoundPresets, tournamentFinished, applyTimerState]);

  const handleLiveResult = useCallback((i, result) => {
    warmUpAudio();
    const key = liveKey(i);
    setPending(prev => {
      const np = { ...prev, [key]: result };
      pendingRef.current = np;
      if (isAdminRef.current) pushAtomicUpdate({ [`pendingResults/${key}`]: result }, err => setFirebaseError(err));
      if (round && round.courts.every((_, ci) => np[courtKey(ci)]) && liveAdditions.every((_, li) => np[liveKey(li)])) {
        const officialGames = round.courts.map((_, ci) => ({ ...np[courtKey(ci)], courtNumber: courtNumbers[ci] ?? ci + 1 }));
        const liveGames = liveAdditions.map((la, li) => ({ ...np[liveKey(li)], courtNumber: la.courtNumber }));
        const games = [...officialGames, ...liveGames, ...activeRoundExtras];
        const entry = { roundNum, games, bye: round.bye.map(t => t.id), paused: (round.paused || []).map(t => t.id) };
        const nh = [...history, entry], ns = rebuildStandings(activeTeamIds, nh);
        if (isAdminRef.current) {
          const bm = breakModeRef.current;
          const completeSecs = bm && timerRunningRef.current && timerStartedAtRef.current ? Math.max(0, timerPausedSecsRef.current - Math.floor((Date.now() - timerStartedAtRef.current) / 1000)) : timerPausedSecsRef.current;
          const snap = { phase: 'play', activeTeamIds, courtNumbers, teamRegistry: tournamentTeams, tournamentTitle, timerDuration, timerDefaultMins, history: nh, roundNum, pausedIds, roundComplete: true, timerRunning: bm ? timerRunningRef.current : false, timerStartedAt: bm ? timerStartedAtRef.current : null, timerPausedSecsLeft: bm ? completeSecs : timerDuration, roundData: null, breakMode: bm, tournamentMode, roundRobinSchedule, roundRobinCourts, roundRobinStartRoundNum, roundRobinStartSnapshot, roundRobinEndSnapshot, activeRoundExtras: [], liveAdditions: [], nextRoundPresets, tournamentFinished, savedAt: Date.now() };
          saveState(snap); pushSnapshot(snap, err => setFirebaseError(err));
        }
        setHistory(nh); setStandings(ns); setRound(null); setRoundComplete(true); setActiveRoundExtras([]); setLiveAdditions([]);
        alarmFiredRef.current = false; setTimerAlarmed(false); if (!breakModeRef.current) applyTimerState(false, null, timerDuration);
      }
      return np;
    });
  }, [round, liveAdditions, activeRoundExtras, roundNum, history, activeTeamIds, courtNumbers, tournamentTeams, tournamentTitle, timerDuration, timerDefaultMins, pausedIds, tournamentMode, roundRobinSchedule, roundRobinCourts, roundRobinStartRoundNum, roundRobinStartSnapshot, roundRobinEndSnapshot, nextRoundPresets, tournamentFinished, applyTimerState]);

  const handleRegenerateRound = useCallback(() => {
    if (Object.keys(pending).length > 0) { setPinPurpose('regenerate'); return; }
    doRegenerateRound();
  }, [pending, doRegenerateRound]);

  const handleGenerateRound = useCallback(() => {
    const ns = rebuildStandings(activeTeamIds, history);
    const compCourts = courtNumbers.filter(c => !socialCourts.includes(String(c)));
    const validPresets = nextRoundPresets.filter(p => !pausedIds.includes(p.teamId1) && !pausedIds.includes(p.teamId2) && activeTeamIds.includes(p.teamId1) && activeTeamIds.includes(p.teamId2) && !socialCourts.includes(String(p.courtNumber)));
    const presetTeamSet = new Set(validPresets.flatMap(p => [p.teamId1, p.teamId2]));
    const nsFiltered = ns.filter(t => !presetTeamSet.has(t.id));
    const numAlgCourts = Math.max(0, compCourts.length - validPresets.length);
    const nr = generateRound(nsFiltered, numAlgCourts, history.length, history, pausedIds, finalRound, ns);
    const safe = id => ns.find(t => t.id === id) || { id, name: String(id), color: '#475569', text: '#fff' };
    const allCourts = compCourts.map(() => null);
    const allCourtNums = [...compCourts];
    validPresets.forEach(p => { const idx = compCourts.indexOf(p.courtNumber); if (idx >= 0 && !allCourts[idx]) allCourts[idx] = [safe(p.teamId1), safe(p.teamId2)]; });
    let algI = 0;
    for (let i = 0; i < compCourts.length; i++) { if (!allCourts[i] && algI < nr.courts.length) allCourts[i] = nr.courts[algI++]; }
    while (algI < nr.courts.length) { allCourts.push(nr.courts[algI++]); allCourtNums.push(`extra${algI}`); }
    const finalCourts = allCourts.filter(Boolean);
    const roundCourtNums = allCourtNums.filter((_, i) => allCourts[i]);
    const mergedNr = { ...nr, courts: finalCourts, courtNums: roundCourtNums };
    const newRN = roundNum === 0 ? 1 : roundNum + 1;
    const bm = breakModeRef.current;
    if (isAdminRef.current) {
      const rd = { courtTeamIds: mergedNr.courts.map(p => p.map(t => t.id)), byeIds: nr.bye.map(t => t.id), pausedTeamIds: (nr.paused || []).map(t => t.id), courtNums: roundCourtNums };
      const genSecs = bm && timerRunningRef.current && timerStartedAtRef.current ? Math.max(0, timerPausedSecsRef.current - Math.floor((Date.now() - timerStartedAtRef.current) / 1000)) : timerPausedSecsRef.current;
      const sa = bm ? timerStartedAtRef.current : (timerDuration > 0 ? Date.now() : null);
      const snap = { phase: 'play', activeTeamIds, courtNumbers, socialCourts, teamRegistry: tournamentTeams, tournamentTitle, timerDuration, timerDefaultMins, history, roundNum: newRN, pausedIds, roundComplete: false, timerRunning: bm ? timerRunningRef.current : timerDuration > 0, timerStartedAt: sa, timerPausedSecsLeft: bm ? genSecs : timerDuration, roundData: rd, breakMode: bm, tournamentMode, roundRobinSchedule, roundRobinCourts, roundRobinStartRoundNum, roundRobinStartSnapshot, roundRobinEndSnapshot, activeRoundExtras, liveAdditions: [], nextRoundPresets: [], tournamentFinished, savedAt: Date.now() };
      lastSeenRoundNum.current = newRN; saveState(snap); pushSnapshot(snap, err => setFirebaseError(err));
    }
    setRound(mergedNr); setRoundNum(newRN); pendingRef.current = {}; setPending({}); setRoundKey(k => k + 1); setRoundComplete(false); setFinalRound(false); setActiveRoundExtras([]); setNextRoundPresets([]);
    alarmFiredRef.current = false; warningsFiredRef.current = new Set();
    if (!bm) { const sa = timerDuration > 0 ? Date.now() : null; applyTimerState(timerDuration > 0, sa, timerDuration); }
  }, [activeTeamIds, history, nextRoundPresets, pausedIds, finalRound, courtNumbers, socialCourts, tournamentTeams, tournamentTitle, timerDuration, timerDefaultMins, roundNum, tournamentMode, roundRobinSchedule, roundRobinCourts, roundRobinStartRoundNum, roundRobinStartSnapshot, roundRobinEndSnapshot, activeRoundExtras, tournamentFinished, applyTimerState]);

  const handleStartRoundRobin = useCallback((participatingIds, courtsForRR) => {
    const courts = (courtsForRR && courtsForRR.length > 0) ? courtsForRR : courtNumbers;
    const schedule = generateRoundRobinSchedule(participatingIds, courts.length);
    const rrStart = (roundNum || 0) + 1;
    const partSet = new Set(participatingIds);
    const excludedIds = activeTeamIds.filter(id => !partSet.has(id));
    const snapshot = { startRoundNum: rrStart, participatingIds: [...participatingIds], excludedIds };
    setTournamentMode('roundrobin'); setRoundRobinSchedule(schedule); setRoundRobinCourts(courts);
    setRoundRobinStartRoundNum(rrStart); setRoundRobinStartSnapshot(snapshot); setRoundRobinEndSnapshot(null);
    setShowSelectRRTeams(false);
    if (isAdminRef.current) { pushAtomicUpdate({ tournamentMode: 'roundrobin', roundNum: rrStart, roundRobinSchedule: schedule, roundRobinCourts: courts, roundRobinStartRoundNum: rrStart, roundRobinStartSnapshot: snapshot, roundRobinEndSnapshot: null, roundData: null, roundComplete: false, pendingResults: null }, err => setFirebaseError(err)); }
    setRoundNum(rrStart); lastSeenRoundNum.current = rrStart;
    pendingRef.current = {}; setPending({}); setRound(null); setRoundComplete(false);
  }, [roundNum, courtNumbers, activeTeamIds]);

  const handleExitRoundRobin = useCallback(() => { setPinPurpose('exitRR'); }, []);

  const rrMatchKey = useCallback((sr, mi) => `rr_${sr}_${mi}`, []);

  const handleRRMatchResult = useCallback((srIdx, matchIdx, result) => {
    warmUpAudio();
    const key = rrMatchKey(srIdx, matchIdx);
    setPending(prev => {
      const np = { ...prev, [key]: result };
      pendingRef.current = np;
      if (isAdminRef.current) pushAtomicUpdate({ [`pendingResults/${key}`]: result }, err => setFirebaseError(err));
      const schedRound = roundRobinSchedule?.[srIdx] || [];
      const allFilled = schedRound.every((_, mi) => np[rrMatchKey(srIdx, mi)]);
      if (allFilled) {
        const targetRoundNum = (roundRobinStartRoundNum || 1) + srIdx;
        if (history.some(h => h.roundNum === targetRoundNum)) return np;
        const rrCourts = (roundRobinCourts && roundRobinCourts.length > 0) ? roundRobinCourts : courtNumbers;
        const games = schedRound.map((_, mi) => ({ ...np[rrMatchKey(srIdx, mi)], courtNumber: rrCourts[mi] ?? mi + 1 }));
        const entry = { roundNum: targetRoundNum, games, bye: [], paused: [] };
        const nh = [...history, entry], ns = rebuildStandings(activeTeamIds, nh);
        const cleared = { ...np };
        schedRound.forEach((_, mi) => { delete cleared[rrMatchKey(srIdx, mi)]; });
        pendingRef.current = cleared; setPending(cleared);
        setHistory(nh); setStandings(ns);
        const totalSched = roundRobinSchedule?.length || 0;
        const allDone = roundRobinSchedule?.every((_, i) => nh.some(hh => hh.roundNum === (roundRobinStartRoundNum || 1) + i));
        let endSnap = null;
        if (allDone && totalSched > 0) { const lastRRNum = (roundRobinStartRoundNum || 1) + totalSched - 1; endSnap = { endRoundNum: lastRRNum, endReason: 'completed' }; setRoundRobinEndSnapshot(endSnap); }
        // Advance roundNum to the next playing round so the timer label stays current.
        // When all RR rounds are done, stay at the last committed round number.
        const newRoundNum = allDone ? targetRoundNum : Math.max(roundNum || 0, targetRoundNum + 1);
        if (isAdminRef.current) {
          const bm = breakModeRef.current;
          const rrSecs = bm && timerRunningRef.current && timerStartedAtRef.current ? Math.max(0, timerPausedSecsRef.current - Math.floor((Date.now() - timerStartedAtRef.current) / 1000)) : timerPausedSecsRef.current;
          const pendingClear = {};
          schedRound.forEach((_, mi) => { pendingClear[`pendingResults/${rrMatchKey(srIdx, mi)}`] = null; });
          pushAtomicUpdate({ history: nh, roundNum: newRoundNum, timerRunning: bm ? timerRunningRef.current : false, timerStartedAt: bm ? timerStartedAtRef.current : null, timerPausedSecsLeft: bm ? rrSecs : timerDurationRef.current, ...pendingClear, ...(endSnap ? { roundRobinEndSnapshot: endSnap } : {}) }, err => setFirebaseError(err));
        }
        setRoundNum(newRoundNum); lastSeenRoundNum.current = newRoundNum;
        alarmFiredRef.current = false; warningsFiredRef.current = new Set(); setTimerAlarmed(false);
        if (!breakModeRef.current) applyTimerState(false, null, timerDurationRef.current);
        return cleared;
      }
      return np;
    });
  }, [rrMatchKey, roundRobinSchedule, roundRobinStartRoundNum, roundRobinCourts, courtNumbers, history, activeTeamIds, roundNum]);

  const handleEditSave = useCallback((ri, gameIdx, { game: ng, newBye }) => {
    setHistory(prev => {
      const nh = prev.map((h, i) => i !== ri ? h : { ...h, games: h.games.map((g, gi) => gi !== gameIdx ? g : { ...ng }), bye: newBye });
      const ns = rebuildStandings(activeTeamIds, nh);
      setStandings(ns);
      if (isAdminRef.current) pushAtomicUpdate({ history: nh }, err => setFirebaseError(err));
      return nh;
    });
    setEditTarget(null);
  }, [activeTeamIds]);

  const handleEditActiveCourt = useCallback(({ courtIdx, teamAId, teamBId, courtNum }) => {
    if (!round) return;
    const tA = tournamentTeams.find(t => t.id === teamAId), tB = tournamentTeams.find(t => t.id === teamBId);
    if (!tA || !tB) return;
    const newCourts = round.courts.map((p, i) => i === courtIdx ? [tA, tB] : [...p]);
    const oldName = (round.courtNums || courtNumbers)[courtIdx];
    const newCourtNums = round.courtNums ? round.courtNums.map((n, i) => i === courtIdx ? (courtNum ?? n) : n) : undefined;
    const newCourtNumbers = courtNum !== undefined ? courtNumbers.map(n => n === oldName ? courtNum : n) : courtNumbers;
    const newRound = { ...round, courts: newCourts, ...(newCourtNums ? { courtNums: newCourtNums } : {}) };
    setRound(newRound);
    if (courtNum !== undefined) setCourtNumbers(newCourtNumbers);
    const np = { ...pendingRef.current };
    delete np[courtKey(courtIdx)];
    pendingRef.current = np; setPending(np);
    if (isAdminRef.current) { const rd = { courtTeamIds: newCourts.map(p => p.map(t => t.id)), byeIds: (round.bye || []).map(t => t.id), pausedTeamIds: (round.paused || []).map(t => t.id), ...(newCourtNums ? { courtNums: newCourtNums } : {}) }; pushAtomicUpdate({ roundData: rd, courtNumbers: newCourtNumbers, [`pendingResults/${courtKey(courtIdx)}`]: null }, err => setFirebaseError(err)); }
    setEditActiveCourt(null);
  }, [round, tournamentTeams, courtNumbers]);

  const handleUndoResult = useCallback((idx) => {
    const k = courtKey(idx);
    const np = { ...pendingRef.current }; delete np[k];
    pendingRef.current = np; setPending(np);
    if (isAdminRef.current) pushAtomicUpdate({ [`pendingResults/${k}`]: null }, err => setFirebaseError(err));
  }, []);

  const handleUndoLiveResult = useCallback((i) => {
    const k = liveKey(i);
    const np = { ...pendingRef.current }; delete np[k];
    pendingRef.current = np; setPending(np);
    if (isAdminRef.current) pushAtomicUpdate({ [`pendingResults/${k}`]: null }, err => setFirebaseError(err));
  }, []);

  const handleEditLiveAddition = useCallback(({ courtIdx, teamAId, teamBId, courtNum }) => {
    const i = editLiveIdx; if (i === null || !liveAdditions[i]) return;
    const nl = liveAdditions.map((x, j) => j === i ? { ...x, teamId1: teamAId, teamId2: teamBId, ...(courtNum !== undefined ? { courtNumber: courtNum } : {}) } : x);
    setLiveAdditions(nl);
    const np = { ...pendingRef.current };
    delete np[liveKey(i)];
    pendingRef.current = np; setPending(np);
    if (isAdminRef.current) pushAtomicUpdate({ liveAdditions: nl, [`pendingResults/${liveKey(i)}`]: null }, err => setFirebaseError(err));
    setEditLiveIdx(null);
  }, [editLiveIdx, liveAdditions]);

  const handleAddGameSave = useCallback((target, game) => {
    if (target === 'active') {
      if (round) {
        setActiveRoundExtras(prev => { const ne = [...prev, game]; if (isAdminRef.current) pushAtomicUpdate({ activeRoundExtras: ne }, err => setFirebaseError(err)); return ne; });
      } else if (history.length > 0) {
        const ri = history.length - 1;
        setHistory(prev => {
          const nh = prev.map((h, i) => i !== ri ? h : { ...h, games: [...h.games, game] });
          const ns = rebuildStandings(activeTeamIds, nh); setStandings(ns);
          if (isAdminRef.current) pushAtomicUpdate({ history: nh }, err => setFirebaseError(err));
          return nh;
        });
      } else {
        return; // no active round and no history — nothing to add to
      }
    } else {
      const ri = Number(target);
      setHistory(prev => {
        const nh = prev.map((h, i) => i !== ri ? h : { ...h, games: [...h.games, game] });
        const ns = rebuildStandings(activeTeamIds, nh); setStandings(ns);
        if (isAdminRef.current) pushAtomicUpdate({ history: nh }, err => setFirebaseError(err));
        return nh;
      });
    }
    setShowAddGame(null);
  }, [round, history, activeTeamIds]);

  const handleFinishTournament = useCallback(() => {
    const s = computeSecsLeft(); applyTimerState(false, null, s);
    setBreakMode(null); setTournamentFinished(true);
    if (isAdminRef.current) pushAtomicUpdate({ tournamentFinished: true, timerRunning: false, timerStartedAt: null, timerPausedSecsLeft: s, breakMode: null }, err => setFirebaseError(err));
  }, [computeSecsLeft, applyTimerState]);

  const handleResumeTournament = useCallback(() => {
    setTournamentFinished(false);
    if (isAdminRef.current) pushAtomicUpdate({ tournamentFinished: false }, err => setFirebaseError(err));
  }, []);

  const handleContinueSwissAfterRR = useCallback(() => { doExitRoundRobin('completed'); }, [doExitRoundRobin]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const addGameData = useMemo(() => {
    if (!showAddGame) return null;
    const isActive = showAddGame.target === 'active';
    const ri = Number(showAddGame.target);
    const histEntry = !isActive && !isNaN(ri) ? history[ri] : null;
    const usedCourts = isActive
      ? [...(round?.courts.map((_, i) => String(courtNumbers[i] ?? i + 1)) || []), ...liveAdditions.map(la => String(la.courtNumber)), ...activeRoundExtras.map(g => String(g.courtNumber))]
      : (histEntry ? histEntry.games.map(g => String(g.courtNumber)) : []);
    const usedTeams = histEntry ? histEntry.games.flatMap(g => [g.winnerId, g.loserId]) : [];
    const label = isActive ? (round ? `Round ${roundNum}` : (history.length > 0 ? `Round ${history[history.length - 1].roundNum}` : '')) : `Round ${histEntry?.roundNum || ''}`;
    return { target: showAddGame.target, usedCourts, usedTeams, label, defaultCourt: showAddGame.defaultCourt || '' };
  }, [showAddGame, round, roundNum, history, courtNumbers, liveAdditions, activeRoundExtras]);

  // ── Render ────────────────────────────────────────────────────────────────
  const pinTitle = pinPurpose === 'reset' ? 'PIN required to reset' : pinPurpose === 'exitRR' ? 'PIN required to exit Round Robin' : pinPurpose === 'cancelRound' ? 'PIN required to cancel round' : pinPurpose === 'regenerate' ? 'PIN required to regenerate round' : pinPurpose?.startsWith('remove') ? 'PIN required to remove' : 'Admin PIN';

  return (
    <TeamRegistryContext.Provider value={tournamentTeams}>
      <div className="min-h-screen" onClick={warmUpAudio} style={{ background: '#fff', fontFamily: "'Trebuchet MS',sans-serif", color: '#1e293b' }}>

        {/* ── Modals ── */}
        {pinPurpose && <PinModal title={pinTitle} correctPin={adminPin} pinLoaded={adminPinLoaded} pinLoadError={adminPinLoadError} onSuccess={handlePinSuccess} onClose={() => { setPinPurpose(null); setRemoveGameTarget(null); setRemoveActiveCourtIdx(null); setRemoveLiveIdx(null); setRemoveActiveRoundExtraIdx(null); }} />}
        {confirmReset && <ConfirmModal title="Back to Setup" message="This will end the current tournament and reset all data. Are you sure?" confirmLabel="Reset" onConfirm={() => { setConfirmReset(false); setPinPurpose('reset'); }} onClose={() => setConfirmReset(false)} />}
        {showBreakModal && <BreakModal onStart={handleBreakStart} onClose={() => setShowBreakModal(false)} />}
        {showTimerSettings && <TimerSettingsModal currentMins={timerDefaultMins} onSave={m => { setTimerDefaultMins(m); setTimerDuration(m * 60); if (isAdminRef.current) pushAtomicUpdate({ timerDefaultMins: m, timerDuration: m * 60 }, err => setFirebaseError(err)); }} onClose={() => setShowTimerSettings(false)} />}
        {showManageTeams && <ManageTeamsModal activeTeamIds={activeTeamIds} tournamentTeams={tournamentTeams} pausedIds={pausedIds} onTogglePause={handleTogglePause} onSave={handleManageTeamsSave} onClose={() => setShowManageTeams(false)} />}
        {showManageCourts && <ManageCourtsModal courtNumbers={courtNumbers} socialCourts={socialCourts} rrCourtCount={tournamentMode === 'roundrobin' ? (roundRobinCourts?.length ?? 0) : 0} onSave={handleManageCourtsSave} onClose={() => setShowManageCourts(false)} />}
        {showSelectRRTeams && <SelectRoundRobinTeamsModal rankedTeamIds={ranked.map(t => t.id)} tournamentCourts={courtNumbers} onConfirm={handleStartRoundRobin} onClose={() => setShowSelectRRTeams(false)} />}
        {showAddGame && addGameData && <AddGameModal allTeamIds={activeTeamIds} defaultCourt={addGameData.defaultCourt} courtNumbers={courtNumbers} usedCourtNumbers={addGameData.usedCourts} usedTeamIds={addGameData.usedTeams} label={addGameData.label} onSave={g => handleAddGameSave(addGameData.target, g)} onClose={() => setShowAddGame(null)} />}
        {showPresetMatch && <PresetMatchModal allTeamIds={activeTeamIds} courtNumbers={courtNumbers} usedTeamIds={nextRoundPresets.flatMap(p => [p.teamId1, p.teamId2])} usedCourtNumbers={nextRoundPresets.map(p => String(p.courtNumber))} onSave={p => { setNextRoundPresets(prev => { const np = [...prev, p]; if (isAdminRef.current) pushAtomicUpdate({ nextRoundPresets: np }, err => setFirebaseError(err)); return np; }); setShowPresetMatch(false); }} onClose={() => setShowPresetMatch(false)} />}
        {showLiveAddGame && <PresetMatchModal allTeamIds={activeTeamIds} courtNumbers={courtNumbers} usedTeamIds={[...(round?.courts.flatMap(p => p.map(t => t.id)) || []), ...liveAdditions.flatMap(la => [la.teamId1, la.teamId2])]} usedCourtNumbers={[...(round?.courts.map((_, i) => String(courtNumbers[i] ?? i + 1)) || []), ...liveAdditions.map(la => String(la.courtNumber))]} onSave={la => { setLiveAdditions(prev => { const nl = [...prev, la]; if (isAdminRef.current) pushAtomicUpdate({ liveAdditions: nl }, err => setFirebaseError(err)); return nl; }); setShowLiveAddGame(false); }} onClose={() => setShowLiveAddGame(false)} />}
        {editTarget && history[editTarget.ri] && <EditGameModal game={history[editTarget.ri].games[editTarget.gameIdx]} roundEntry={history[editTarget.ri]} allTeamIds={activeTeamIds} label={`Round ${history[editTarget.ri].roundNum} · Court ${history[editTarget.ri].games[editTarget.gameIdx].courtNumber}`} onSave={d => handleEditSave(editTarget.ri, editTarget.gameIdx, d)} onClose={() => setEditTarget(null)} />}
        {editActiveCourt !== null && round && <EditActiveCourtModal courtIdx={editActiveCourt} courtNumbers={courtNumbers} currentCourts={round.courts} allTeamIds={activeTeamIds} hasPending={!!pending[courtKey(editActiveCourt)]} onSave={handleEditActiveCourt} onClose={() => setEditActiveCourt(null)} />}
        {editLiveIdx !== null && liveAdditions[editLiveIdx] && <EditActiveCourtModal courtIdx={0} courtNumbers={[liveAdditions[editLiveIdx].courtNumber]} currentCourts={[[tournamentTeams.find(t => t.id === liveAdditions[editLiveIdx].teamId1), tournamentTeams.find(t => t.id === liveAdditions[editLiveIdx].teamId2)]]} allTeamIds={activeTeamIds} hasPending={!!pending[liveKey(editLiveIdx)]} onSave={handleEditLiveAddition} onClose={() => setEditLiveIdx(null)} />}

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
                  {phase === 'play' && <p className="text-slate-500" style={{ fontSize: 'clamp(10px,2.5vw,13px)' }}>{activeTeamIds.length} teams · {isAdmin ? '🟢 Admin' : '🔵 Viewer'}</p>}
                  {phase === 'setup' && <p className="text-slate-500" style={{ fontSize: 'clamp(10px,2.5vw,13px)' }}>Setup</p>}
                  {(phase === 'waiting' || phase === 'loading') && !isAdmin && <p className="text-slate-500" style={{ fontSize: 'clamp(10px,2.5vw,13px)' }}>🔵 Live Viewer</p>}
                  {!online && <span style={{ fontSize: 'clamp(9px,2vw,11px)', color: '#dc2626', fontWeight: 700 }}>● Offline</span>}
                  {(presence.admins > 0 || presence.viewers > 0) && <span className="text-slate-400" style={{ fontSize: 'clamp(9px,2vw,11px)' }}>{(presence.admins - (isAdmin ? 1 : 0)) > 0 && `🟢${presence.admins - (isAdmin ? 1 : 0)} `}{(presence.viewers - (isAdmin ? 0 : 1)) > 0 && `🔵${presence.viewers - (isAdmin ? 0 : 1)}`}</span>}
                </div>
              </div>
              {!viewerOnly && (
                <button onClick={() => { if (isAdmin) setIsAdmin(false); else setPinPurpose('admin'); }}
                  style={{ flexShrink: 0, fontSize: 'clamp(10px,2.5vw,13px)', padding: '6px 10px', borderRadius: 10, fontWeight: 700, cursor: 'pointer', background: isAdmin ? 'rgba(251,191,36,0.18)' : 'rgba(0,0,0,0.06)', color: isAdmin ? '#92400e' : '#64748b', border: `1px solid ${isAdmin ? 'rgba(251,191,36,0.5)' : 'rgba(0,0,0,0.12)'}` }}>
                  {isAdmin ? '🔓 Admin' : '🔒 Admin login'}
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
            {phase === 'play' && (timerDuration > 0 || breakMode) && (
              <div className="pb-2">
                <RoundTimer secsLeft={timerSecsLeft} totalSecs={timerDuration} roundNum={roundNum} timerRunning={timerRunning} isAdmin={isAdmin} onToggle={timerToggle} onRestart={() => resetTimer(timerDuration)} onOpenSettings={() => setShowTimerSettings(true)} breakInfo={breakMode} onEndBreak={handleBreakEnd} />
              </div>
            )}
          </div>
        </div>

        {/* ── Firebase error toast ── */}
        {firebaseError && (
          <div style={{ position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 100, padding: '8px 16px', borderRadius: 8, background: '#dc2626', color: '#fff', fontWeight: 700, fontSize: 13, boxShadow: '0 2px 12px rgba(0,0,0,0.2)' }}>
            ⚠️ {firebaseError}
            <button onClick={() => setFirebaseError(null)} style={{ marginLeft: 10, background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 900 }}>×</button>
          </div>
        )}

        {/* ── Scrollable content ── */}
        <div onTouchStart={phase === 'play' ? handleSwipeStart : undefined} onTouchEnd={phase === 'play' ? handleSwipeEnd : undefined}
          style={{ maxWidth: 720, margin: '0 auto', padding: `${headerHidden ? 44 : headerHeight + 8}px clamp(12px,3vw,20px) clamp(16px,3vw,24px)` }}>

          {(phase === 'loading' || phase === 'waiting') && !isAdmin && (
            <div className="rounded-2xl p-10 text-center flex flex-col items-center gap-4" style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.08)' }}>
              {phase === 'loading'
                ? (<><div className="text-3xl">🔄</div><p className="text-slate-500 text-sm">Connecting to tournament…</p></>)
                : (<><div className="text-3xl">🏓</div><p className="text-slate-700 font-bold">No active tournament</p><p className="text-slate-500 text-sm">Waiting for the admin to start a game.</p>{savedState && <RestoreBanner saved={savedState} onRestore={handleRestore} onDiscard={() => { setSavedState(null); clearSave(); }} />}</>)
              }
            </div>
          )}

          {(phase === 'loading' || phase === 'waiting' || phase === 'setup') && isAdmin && (
            <>
              {savedState && <RestoreBanner saved={savedState} onRestore={handleRestore} onDiscard={() => { setSavedState(null); clearSave(); }} />}
              <SetupScreen onStart={handleStart} />
            </>
          )}

          {phase === 'play' && (
            <>
              {activeTab === 'play' && (
                <PlayTab
                  tournamentFinished={tournamentFinished} breakMode={activeTab === 'play' ? breakMode : null} round={round} roundNum={roundNum} tournamentMode={tournamentMode}
                  roundRobinSchedule={roundRobinSchedule} roundRobinCourts={roundRobinCourts} roundRobinStartRoundNum={roundRobinStartRoundNum}
                  courtNumbers={courtNumbers} socialCourts={socialCourts} liveAdditions={liveAdditions} pending={pending} isAdmin={isAdmin} finalRound={finalRound} setFinalRound={setFinalRound}
                  history={history} ranked={ranked} activeRoundExtras={activeRoundExtras} nextRoundPresets={nextRoundPresets} roundKey={roundKey}
                  onResult={handleResult} onLiveResult={handleLiveResult} onRRMatchResult={handleRRMatchResult}
                  onGenerateRound={handleGenerateRound} onRegenerateRound={handleRegenerateRound} onFinishTournament={handleFinishTournament} onResumeTournament={handleResumeTournament}
                  onBreakStart={() => setShowBreakModal(true)} onBreakEnd={handleBreakEnd}
                  onEditActiveCourt={setEditActiveCourt} onRemoveActiveCourt={idx => { setRemoveActiveCourtIdx(idx); setPinPurpose('removeActiveCourt'); }}
                  onEditLive={setEditLiveIdx} onRemoveLive={idx => { setRemoveLiveIdx(idx); setPinPurpose('removeLiveAddition'); }}
                  onUndoResult={handleUndoResult} onUndoLiveResult={handleUndoLiveResult}
                  onRemovePreset={pi => { setNextRoundPresets(prev => { const np = prev.filter((_, i) => i !== pi); if (isAdminRef.current) pushAtomicUpdate({ nextRoundPresets: np }, err => setFirebaseError(err)); return np; }); }}
                  onRemoveExtra={gi => { setRemoveActiveRoundExtraIdx(gi); setPinPurpose('removeActiveRoundExtra'); }}
                  onSelectRRTeams={() => setShowSelectRRTeams(true)} onPresetMatch={() => setShowPresetMatch(true)} onLiveAddGame={() => setShowLiveAddGame(true)}
                  onContinueSwissAfterRR={handleContinueSwissAfterRR} onExitRoundRobin={(reason) => reason ? doExitRoundRobin(reason) : handleExitRoundRobin()}
                  onManageTeams={() => setShowManageTeams(true)} onManageCourts={() => setShowManageCourts(true)}
                  onReset={() => setConfirmReset(true)} onCancelRound={() => setPinPurpose('cancelRound')}
                  rrMatchKey={rrMatchKey}
                />
              )}
              {activeTab === 'standings' && <StandingsTab ranked={ranked} pausedIds={pausedIds} />}
              {activeTab === 'history' && (
                <HistoryTab
                  history={history} activeTeamIds={activeTeamIds} cancelledRoundNums={cancelledRoundNums}
                  roundRobinStartSnapshot={roundRobinStartSnapshot} roundRobinEndSnapshot={roundRobinEndSnapshot}
                  isAdmin={isAdmin}
                  onAddGame={ri => setShowAddGame({ target: String(ri), defaultCourt: '' })}
                  onEditGame={(ri, gameIdx) => setEditTarget({ ri, gameIdx })}
                  onRemoveGame={(ri, gameIdx) => { setRemoveGameTarget({ ri, gameIdx }); setPinPurpose('removeGame'); }}
                />
              )}
            </>
          )}
        </div>
      </div>
    </TeamRegistryContext.Provider>
  );
}
