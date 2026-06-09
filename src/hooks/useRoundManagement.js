import { useEffect, useCallback } from 'react';
import {
  pushSnapshot, pushAtomicUpdate, writeBackup,
} from '../firebase';
import { hasPermission } from '../roleConfig';
import { courtKey, liveKey } from '../constants';
import { rebuildStandings } from '../algorithms/standings';
import { generateRound } from '../algorithms/pairing';
import { generateRoundRobinSchedule, generateRemainingRoundRobinSchedule } from '../algorithms/roundRobin';
import { buildSnapshot } from '../snapshot';

// Owns the active-round lifecycle: result submission, round generation/cancel/regenerate,
// round completion (auto-detects when all courts are filled), and Round Robin management.
// Per-round backups are written here too since they trigger on history changes.
//
// stateRef.current is a plain object kept current by App on every render — it lets all
// callbacks read the latest state without stale closures and with minimal dep arrays.
export function useRoundManagement({
  stateRef,

  // Individual state values needed as React effect trigger deps
  pending, round, roundComplete, liveAdditions, history, phase,

  // Refs
  roleRef, breakModeRef,
  timerRunningRef, timerStartedAtRef, timerPausedSecsRef, timerDurationRef,
  pendingRef, roundCompletingRef, lastSeenRoundNum, historyLengthRef,

  // Setters
  setRound, setRoundNum, setHistory, setStandings, setPending,
  setLiveAdditions, setActiveRoundExtras, setNextRoundPresets,
  setRoundComplete, setRoundKey, setFinalRound, setTimerAlarmed,
  setTournamentMode, setRoundRobinSchedule, setRoundRobinCourts,
  setRoundRobinStartRoundNum, setRoundRobinStartSnapshot, setRoundRobinEndSnapshot,
  setCancelledRoundNums, setBackupRoundNums,

  // Callbacks
  applyTimerState, computeSecsLeft, setCriticalError, onFirebaseError,
  onRequirePin, // (purpose) => void — open PIN modal from App
  closeModal,
}) {
  // ── Result submission ─────────────────────────────────────────────────────
  const handleResult = useCallback((ci, result) => {
    const key = courtKey(ci);
    setPending(prev => {
      const np = { ...prev, [key]: result };
      pendingRef.current = np;
      if (hasPermission(roleRef.current, 'canSubmitResults')) {
        pushAtomicUpdate({ [`pendingResults/${key}`]: result }, onFirebaseError);
      }
      return np;
    });
  }, [pendingRef, roleRef, onFirebaseError, setPending]);

  const handleLiveResult = useCallback((i, result) => {
    const key = liveKey(i);
    setPending(prev => {
      const np = { ...prev, [key]: result };
      pendingRef.current = np;
      if (hasPermission(roleRef.current, 'canSubmitResults')) {
        pushAtomicUpdate({ [`pendingResults/${key}`]: result }, onFirebaseError);
      }
      return np;
    });
  }, [pendingRef, roleRef, onFirebaseError, setPending]);

  const handleUndoResult = useCallback((idx) => {
    const k = courtKey(idx);
    const np = { ...pendingRef.current }; delete np[k];
    pendingRef.current = np; setPending(np);
    if (hasPermission(roleRef.current, 'canSubmitResults')) {
      pushAtomicUpdate({ [`pendingResults/${k}`]: null }, onFirebaseError);
    }
  }, [pendingRef, roleRef, onFirebaseError, setPending]);

  const handleUndoLiveResult = useCallback((i) => {
    const k = liveKey(i);
    const np = { ...pendingRef.current }; delete np[k];
    pendingRef.current = np; setPending(np);
    if (hasPermission(roleRef.current, 'canSubmitResults')) {
      pushAtomicUpdate({ [`pendingResults/${k}`]: null }, onFirebaseError);
    }
  }, [pendingRef, roleRef, onFirebaseError, setPending]);

  // ── Round completion guard reset ──────────────────────────────────────────
  useEffect(() => { if (!roundComplete) roundCompletingRef.current = false; }, [roundComplete, roundCompletingRef]);

  // ── Auto round completion ─────────────────────────────────────────────────
  // Triggers on any pending change (local or from the Firebase pendingResults listener).
  // Reads snapshot state from stateRef to avoid a 20+ dep array.
  useEffect(() => {
    const s = stateRef.current;
    if (!s.round || s.roundComplete || roundCompletingRef.current) return;
    if (!s.round.courts.every((_, i) => s.pending[courtKey(i)])) return;
    if (!s.liveAdditions.every((_, i) => s.pending[liveKey(i)])) return;
    roundCompletingRef.current = true;
    const officialGames = s.round.courts.map((_, i) => ({ ...s.pending[courtKey(i)], courtNumber: s.round.courtNums?.[i] ?? s.courtNumbers[i] ?? i + 1 }));
    const liveGames     = s.liveAdditions.map((la, i) => ({ ...s.pending[liveKey(i)], courtNumber: la.courtNumber }));
    const games  = [...officialGames, ...liveGames, ...s.activeRoundExtras];
    const entry  = { roundNum: s.roundNum, games, bye: s.round.bye.map(t => t.id), paused: (s.round.paused || []).map(t => t.id) };
    const nh = [...s.history, entry];
    const ns = rebuildStandings(s.activeTeamIds, nh);
    if (hasPermission(roleRef.current, 'canSubmitResults')) {
      const bm = breakModeRef.current;
      const completeSecs = computeSecsLeft();
      const snap = buildSnapshot(s, {
        history: nh, roundComplete: true,
        timerRunning: bm ? timerRunningRef.current : false,
        timerStartedAt: bm ? timerStartedAtRef.current : null,
        timerPausedSecsLeft: bm ? completeSecs : s.timerDuration,
        breakMode: bm,
      });
      pushSnapshot(snap, err => err && setCriticalError('Round result failed to save — tap Retry.', snap));
    }
    setHistory(nh); setStandings(ns); setRound(null); setRoundComplete(true);
    setActiveRoundExtras([]); setLiveAdditions([]);
    setTimerAlarmed(false);
    if (!breakModeRef.current) applyTimerState(false, null, s.timerDuration);
  }, [pending, round, roundComplete, liveAdditions]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Per-round backup ───────────────────────────────────────────────────────
  // Fires when history grows (i.e. a round just completed).
  // historyLengthRef is pre-synced in updateAllStates so this never fires on initial load.
  useEffect(() => {
    const s = stateRef.current;
    if (!hasPermission(roleRef.current, 'canFullEditHistory') || phase !== 'play' || history.length <= historyLengthRef.current) return;
    historyLengthRef.current = history.length;
    const latestRound = history[history.length - 1];
    const rn = latestRound.roundNum;
    const backupSnap = buildSnapshot(s, {
      history, roundNum: rn, roundComplete: true,
      breakMode: breakModeRef.current, nextRoundPresets: [],
    });
    writeBackup(rn, backupSnap);
    setBackupRoundNums(prev => new Set([...prev, rn]));
  }, [history]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Round generation ──────────────────────────────────────────────────────
  const doRegenerateRound = useCallback(() => {
    const s = stateRef.current;
    const ns = rebuildStandings(s.activeTeamIds, s.history);
    const compCourts = s.courtNumbers.filter(c => !s.socialCourts.includes(String(c)));
    const isFinalRound = s.finalRound || (s.targetRounds > 0 && s.roundNum === s.targetRounds);
    const nr = generateRound(ns, compCourts.length, s.history.length, s.history, s.pausedIds, isFinalRound);
    const roundCourtNums = compCourts.slice(0, nr.courts.length);
    const nrWithNums = { ...nr, courtNums: roundCourtNums };
    if (hasPermission(roleRef.current, 'canGenerateRound')) {
      const rd = { courtTeamIds: nr.courts.map(p => p.map(t => t.id)), byeIds: nr.bye.map(t => t.id), pausedTeamIds: (nr.paused || []).map(t => t.id), courtNums: roundCourtNums };
      pushAtomicUpdate({ roundData: rd, pendingResults: null }, onFirebaseError);
    }
    setRound(nrWithNums);
    pendingRef.current = {}; setPending({}); setRoundKey(k => k + 1); setLiveAdditions([]);
  }, [stateRef, roleRef, pendingRef, setRound, setPending, setRoundKey, setLiveAdditions, onFirebaseError]);

  const handleRegenerateRound = useCallback(() => {
    if (Object.keys(stateRef.current.pending).length > 0) { onRequirePin('regenerate'); return; }
    doRegenerateRound();
  }, [stateRef, doRegenerateRound, onRequirePin]);

  const handleGenerateRound = useCallback(() => {
    const s = stateRef.current;
    const ns = rebuildStandings(s.activeTeamIds, s.history);
    const compCourts = s.courtNumbers.filter(c => !s.socialCourts.includes(String(c)));
    const validPresets = s.nextRoundPresets.filter(p =>
      !s.pausedIds.includes(p.teamId1) && !s.pausedIds.includes(p.teamId2) &&
      s.activeTeamIds.includes(p.teamId1) && s.activeTeamIds.includes(p.teamId2) &&
      !s.socialCourts.includes(String(p.courtNumber))
    );
    const presetTeamSet = new Set(validPresets.flatMap(p => [p.teamId1, p.teamId2]));
    const nsFiltered    = ns.filter(t => !presetTeamSet.has(t.id));
    const numAlgCourts  = Math.max(0, compCourts.length - validPresets.length);
    const newRN         = s.roundNum === 0 ? 1 : s.roundNum + 1;
    const isFinalRound  = s.finalRound || (s.targetRounds > 0 && newRN === s.targetRounds);
    const nr = generateRound(nsFiltered, numAlgCourts, s.history.length, s.history, s.pausedIds, isFinalRound, ns);
    const safe = id => ns.find(t => t.id === id) || { id, name: String(id), color: '#475569', text: '#fff' };
    const allCourts    = compCourts.map(() => null);
    const allCourtNums = [...compCourts];
    validPresets.forEach(p => { const idx = compCourts.indexOf(p.courtNumber); if (idx >= 0 && !allCourts[idx]) allCourts[idx] = [safe(p.teamId1), safe(p.teamId2)]; });
    let algI = 0;
    for (let i = 0; i < compCourts.length; i++) { if (!allCourts[i] && algI < nr.courts.length) allCourts[i] = nr.courts[algI++]; }
    while (algI < nr.courts.length) { allCourts.push(nr.courts[algI++]); allCourtNums.push(`extra${algI}`); }
    const finalCourts    = allCourts.filter(Boolean);
    const roundCourtNums = allCourtNums.filter((_, i) => allCourts[i]);
    const mergedNr = { ...nr, courts: finalCourts, courtNums: roundCourtNums };
    const bm = breakModeRef.current;
    if (hasPermission(roleRef.current, 'canGenerateRound')) {
      const rd = { courtTeamIds: mergedNr.courts.map(p => p.map(t => t.id)), byeIds: nr.bye.map(t => t.id), pausedTeamIds: (nr.paused || []).map(t => t.id), courtNums: roundCourtNums };
      const genSecs = computeSecsLeft();
      const sa = bm ? timerStartedAtRef.current : (s.timerDuration > 0 ? Date.now() : null);
      const snap = buildSnapshot(s, {
        roundNum: newRN,
        timerRunning: bm ? timerRunningRef.current : s.timerDuration > 0,
        timerStartedAt: sa, timerPausedSecsLeft: bm ? genSecs : s.timerDuration,
        roundData: rd, breakMode: bm,
        activeRoundExtras: s.activeRoundExtras, nextRoundPresets: [],
      });
      lastSeenRoundNum.current = newRN;
      pushSnapshot(snap, onFirebaseError);
    }
    setRound(mergedNr); setRoundNum(newRN);
    pendingRef.current = {}; setPending({}); setRoundKey(k => k + 1); setRoundComplete(false);
    setFinalRound(false); setActiveRoundExtras([]); setNextRoundPresets([]);
    if (!bm) { const sa = s.timerDuration > 0 ? Date.now() : null; applyTimerState(s.timerDuration > 0, sa, s.timerDuration); }
  }, [stateRef, roleRef, breakModeRef, timerRunningRef, timerStartedAtRef, timerPausedSecsRef, pendingRef, lastSeenRoundNum, setRound, setRoundNum, setPending, setRoundKey, setRoundComplete, setFinalRound, setActiveRoundExtras, setNextRoundPresets, applyTimerState, computeSecsLeft, onFirebaseError]);

  // ── Round cancellation ────────────────────────────────────────────────────
  const doCancelRound = useCallback(() => {
    const s = stateRef.current;
    const prevRN = Math.max(0, s.roundNum - 1);
    const prevRC = s.history.length > 0;
    const newCancelled = [...s.cancelledRoundNums, s.roundNum];
    const bm = breakModeRef.current;
    const cancelSecs = computeSecsLeft();
    const snap = buildSnapshot(s, {
      roundNum: prevRN, roundComplete: prevRC,
      timerRunning: bm ? timerRunningRef.current : false,
      timerStartedAt: bm ? timerStartedAtRef.current : null,
      timerPausedSecsLeft: bm ? cancelSecs : s.timerDuration,
      breakMode: bm, cancelledRoundNums: newCancelled,
    });
    lastSeenRoundNum.current = prevRN;
    pushSnapshot(snap, onFirebaseError);
    setCancelledRoundNums(newCancelled); setRound(null); setRoundNum(prevRN); setRoundComplete(prevRC);
    pendingRef.current = {}; setPending({}); setActiveRoundExtras([]); setRoundKey(k => k + 1);
    setTimerAlarmed(false);
    if (!bm) applyTimerState(false, null, s.timerDuration);
  }, [stateRef, breakModeRef, timerRunningRef, timerStartedAtRef, timerPausedSecsRef, pendingRef, lastSeenRoundNum, setCancelledRoundNums, setRound, setRoundNum, setRoundComplete, setPending, setActiveRoundExtras, setRoundKey, setTimerAlarmed, applyTimerState, computeSecsLeft, onFirebaseError]);

  // ── Round Robin ───────────────────────────────────────────────────────────
  const rrMatchKey = useCallback((sr, mi) => `rr_${sr}_${mi}`, []);

  const doExitRoundRobin = useCallback((reason = 'manual') => {
    const s = stateRef.current;
    const srn = s.roundRobinStartRoundNum || 0;
    const rrRounds = s.history.filter(h => h.roundNum >= srn);
    const lastRRNum = rrRounds.length > 0 ? rrRounds.reduce((m, h) => Math.max(m, h.roundNum), 0) : null;
    const endSnap = { endRoundNum: lastRRNum, endReason: reason };
    const restoredRoundNum = lastRRNum != null ? lastRRNum : Math.max(0, (s.roundRobinStartRoundNum || 1) - 1);
    setTournamentMode('swiss'); setRoundRobinSchedule(null); setRoundRobinCourts(null);
    setRoundRobinStartRoundNum(null); setRoundRobinEndSnapshot(endSnap);
    setRoundNum(restoredRoundNum); lastSeenRoundNum.current = restoredRoundNum;
    const cleared = {};
    Object.keys(pendingRef.current).forEach(k => { if (!k.startsWith('rr_')) cleared[k] = pendingRef.current[k]; });
    pendingRef.current = cleared; setPending(cleared);
    if (hasPermission(roleRef.current, 'canSwitchTournamentMode')) {
      pushAtomicUpdate({ tournamentMode: 'swiss', roundRobinSchedule: null, roundRobinCourts: null, roundRobinStartRoundNum: null, roundRobinEndSnapshot: endSnap, roundNum: restoredRoundNum, pendingResults: null }, onFirebaseError);
    }
  }, [stateRef, roleRef, pendingRef, lastSeenRoundNum, setTournamentMode, setRoundRobinSchedule, setRoundRobinCourts, setRoundRobinStartRoundNum, setRoundRobinEndSnapshot, setRoundNum, setPending, onFirebaseError]);

  const handleExitRoundRobin = useCallback(() => { onRequirePin('exitRR'); }, [onRequirePin]);

  const handleStartRoundRobin = useCallback((participatingIds, courtsForRR) => {
    const s = stateRef.current;
    if (s.tournamentMode === 'roundrobin') { closeModal(); return; }
    const courts = (courtsForRR && courtsForRR.length > 0) ? courtsForRR : s.courtNumbers;
    const schedule = generateRoundRobinSchedule(participatingIds, courts.length);
    const rrStart = (s.roundNum || 0) + 1;
    const partSet = new Set(participatingIds);
    const excludedIds = s.activeTeamIds.filter(id => !partSet.has(id));
    const snapshot = { startRoundNum: rrStart, participatingIds: [...participatingIds], excludedIds };
    setTournamentMode('roundrobin'); setRoundRobinSchedule(schedule); setRoundRobinCourts(courts);
    setRoundRobinStartRoundNum(rrStart); setRoundRobinStartSnapshot(snapshot); setRoundRobinEndSnapshot(null);
    if (hasPermission(roleRef.current, 'canSwitchTournamentMode')) {
      pushAtomicUpdate({ tournamentMode: 'roundrobin', roundNum: rrStart, roundRobinSchedule: schedule, roundRobinCourts: courts, roundRobinStartRoundNum: rrStart, roundRobinStartSnapshot: snapshot, roundRobinEndSnapshot: null, roundData: null, roundComplete: false, pendingResults: null }, onFirebaseError);
    }
    setRoundNum(rrStart); lastSeenRoundNum.current = rrStart;
    pendingRef.current = {}; setPending({}); setRound(null); setRoundComplete(false);
    closeModal();
  }, [stateRef, roleRef, pendingRef, lastSeenRoundNum, setTournamentMode, setRoundRobinSchedule, setRoundRobinCourts, setRoundRobinStartRoundNum, setRoundRobinStartSnapshot, setRoundRobinEndSnapshot, setRoundNum, setPending, setRound, setRoundComplete, onFirebaseError, closeModal]);

  // Admin-only: generates a fresh full round-robin for the same roster — rotated
  // so its round/court groupings differ from the existing schedule (a round robin
  // is exhaustive, so the pairing SET can't change, only how it's grouped/ordered)
  // — and merges it with the existing schedule either by appending it as more
  // rounds, or by replacing whatever rounds haven't been played yet.
  const handleGenerateAdditionalRoundRobin = useCallback((mode) => {
    const s = stateRef.current;
    if (!hasPermission(roleRef.current, 'canSwitchTournamentMode')) { closeModal(); return; }
    const schedule = s.roundRobinSchedule || [];
    if (!schedule.length) { closeModal(); return; }
    // roundRobinStartSnapshot.participatingIds is frozen at RR start — filter it
    // against the live roster so a team deleted since then doesn't reappear in
    // the freshly generated schedule (it would render as phantom unplayable matches).
    const activeSet = new Set(s.activeTeamIds);
    const participatingIds = (s.roundRobinStartSnapshot?.participatingIds || s.activeTeamIds).filter(id => activeSet.has(id));
    if (participatingIds.length < 2) { closeModal(); return; }
    const courts = (s.roundRobinCourts && s.roundRobinCourts.length > 0) ? s.roundRobinCourts : s.courtNumbers;
    const n = participatingIds.length;
    const startOffset = n > 1 ? Math.max(1, Math.floor(n / 2)) : 0;
    const startRN = s.roundRobinStartRoundNum || 1;
    const completedCount = schedule.filter((_, i) => s.history.some(h => h.roundNum === startRN + i)).length;

    let combined;
    if (mode === 'replace' && completedCount < schedule.length) {
      // A full round robin is exhaustive — "another full round robin" for the
      // same roster necessarily repeats every pair. To keep "replace" truly
      // repeat-free, regenerate only the unplayed remainder, covering exactly
      // the pairs that haven't played each other yet (completing the existing
      // round robin rather than duplicating it).
      const playedPairKeys = new Set();
      for (let i = 0; i < completedCount; i++) {
        const h = s.history.find(he => he.roundNum === startRN + i);
        (h?.games || []).forEach(g => playedPairKeys.add([g.winnerId, g.loserId].sort().join('|')));
      }
      const remainder = generateRemainingRoundRobinSchedule(participatingIds, playedPairKeys, courts.length);
      if (!remainder.length) { closeModal(); return; }
      combined = [...schedule.slice(0, completedCount), ...remainder];
    } else {
      // Nothing to replace (the round robin already finished — every pair has
      // played) or append mode: generate a fresh full round robin. Repeats are
      // unavoidable here by definition (the teams are playing each other again).
      const freshSchedule = generateRoundRobinSchedule(participatingIds, courts.length, startOffset);
      if (!freshSchedule.length) { closeModal(); return; }
      combined = [...schedule, ...freshSchedule];
    }

    setRoundRobinSchedule(combined);
    // Generating more games always leaves unplayed rounds beyond whatever was
    // previously recorded as "the end" — clear a stale end marker so the
    // History tab doesn't keep showing "Round Robin ended at round N".
    const clearEndSnapshot = !!s.roundRobinEndSnapshot;
    if (clearEndSnapshot) setRoundRobinEndSnapshot(null);
    pushAtomicUpdate({ roundRobinSchedule: combined, ...(clearEndSnapshot ? { roundRobinEndSnapshot: null } : {}) }, onFirebaseError);
    closeModal();
  }, [stateRef, roleRef, setRoundRobinSchedule, setRoundRobinEndSnapshot, onFirebaseError, closeModal]);

  const handleRRMatchResult = useCallback((srIdx, matchIdx, result) => {
    const key = rrMatchKey(srIdx, matchIdx);
    setPending(prev => {
      const np = { ...prev, [key]: result };
      pendingRef.current = np;
      const s = stateRef.current;
      if (hasPermission(roleRef.current, 'canSubmitResults')) {
        pushAtomicUpdate({ [`pendingResults/${key}`]: result }, onFirebaseError);
      }
      const schedRound = s.roundRobinSchedule?.[srIdx] || [];
      const allFilled = schedRound.every((_, mi) => np[rrMatchKey(srIdx, mi)]);
      if (allFilled) {
        const targetRoundNum = (s.roundRobinStartRoundNum || 1) + srIdx;
        if (s.history.some(h => h.roundNum === targetRoundNum)) return np;
        if (srIdx > 0 && !s.history.some(h => h.roundNum === (s.roundRobinStartRoundNum || 1) + srIdx - 1)) return np;
        const rrCourts = (s.roundRobinCourts && s.roundRobinCourts.length > 0) ? s.roundRobinCourts : s.courtNumbers;
        const games = schedRound.map((_, mi) => {
          const r = np[rrMatchKey(srIdx, mi)];
          return { ...r, courtNumber: r?.courtNumber ?? rrCourts[mi] ?? mi + 1 };
        });
        const entry = { roundNum: targetRoundNum, games, bye: [], paused: [] };
        const nh = [...s.history, entry];
        const ns = rebuildStandings(s.activeTeamIds, nh);
        const cleared = { ...np };
        schedRound.forEach((_, mi) => { delete cleared[rrMatchKey(srIdx, mi)]; });
        pendingRef.current = cleared;
        setHistory(nh); setStandings(ns);
        const totalSched = s.roundRobinSchedule?.length || 0;
        const allDone = s.roundRobinSchedule?.every((_, i) => nh.some(hh => hh.roundNum === (s.roundRobinStartRoundNum || 1) + i));
        let endSnap = null;
        if (allDone && totalSched > 0) {
          const lastRRNum = (s.roundRobinStartRoundNum || 1) + totalSched - 1;
          endSnap = { endRoundNum: lastRRNum, endReason: 'completed' };
          setRoundRobinEndSnapshot(endSnap);
        }
        const newRoundNum = allDone ? targetRoundNum : Math.max(s.roundNum || 0, targetRoundNum + 1);
        if (hasPermission(roleRef.current, 'canSubmitResults')) {
          const bm = breakModeRef.current;
          const rrSecs = computeSecsLeft();
          const pendingClear = {};
          schedRound.forEach((_, mi) => { pendingClear[`pendingResults/${rrMatchKey(srIdx, mi)}`] = null; });
          pushAtomicUpdate({
            history: nh, roundNum: newRoundNum,
            timerRunning: bm ? timerRunningRef.current : false,
            timerStartedAt: bm ? timerStartedAtRef.current : null,
            timerPausedSecsLeft: bm ? rrSecs : timerDurationRef.current,
            ...pendingClear,
            ...(endSnap ? { roundRobinEndSnapshot: endSnap } : {}),
          }, onFirebaseError);
        }
        setRoundNum(newRoundNum); lastSeenRoundNum.current = newRoundNum;
        setTimerAlarmed(false);
        if (!breakModeRef.current) applyTimerState(false, null, timerDurationRef.current);
        return cleared;
      }
      return np;
    });
  }, [rrMatchKey, stateRef, roleRef, pendingRef, breakModeRef, timerRunningRef, timerStartedAtRef, timerPausedSecsRef, timerDurationRef, lastSeenRoundNum, setPending, setHistory, setStandings, setRoundRobinEndSnapshot, setRoundNum, setTimerAlarmed, applyTimerState, computeSecsLeft, onFirebaseError]);

  return {
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
    rrMatchKey,
  };
}
