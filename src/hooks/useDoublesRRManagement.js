import { useCallback } from 'react';
import { pushSnapshot, pushAtomicUpdate } from '../firebase';
import { hasPermission } from '../roleConfig';
import { buildSnapshot } from '../snapshot';
import { generateDoublesRRSchedule, countScheduleOpponentPairs } from '../algorithms/doublesRR';

// Owns the Doubles Round Robin tournament lifecycle: starting (a full state
// reset + schedule generation), recording per-court results with round
// auto-completion, and saving the player registry. Mirrors useTPTManagement —
// results are recorded directly with no pendingResults/roundData/backup
// machinery, exactly like TPT.
export function useDoublesRRManagement({
  stateRef,
  // refs
  tournamentIdRef, lastSeenRoundNum, pendingRef, roleRef,
  doublesRRPlayersRef, doublesRRResultsRef, doublesRRScheduleRef, doublesRRRoundCompletingRef,
  // Doubles RR state setters
  setDoublesRRPlayers, setDoublesRRSchedule, setDoublesRRResults,
  // App state setters
  setTournamentTitle, setTournamentLocation, setTournamentStartTime, setTournamentDurationMins,
  setRole, setCourtNumbers, setTimerDuration,
  setHistory, setRoundNum, setActiveTeamIds, setStandings,
  setTournamentMode, setRound, setPausedIds, setPending, setRoundKey, setRoundComplete,
  setRoundRobinSchedule, setRoundRobinCourts, setRoundRobinStartRoundNum,
  setRoundRobinStartSnapshot, setRoundRobinEndSnapshot,
  setActiveRoundExtras, setTournamentFinished, setSocialCourts,
  setPhase, setActiveTab,
  // callbacks
  applyTimerState, setTimerAlarmed, onFirebaseError, closeModal,
}) {
  const handleStartDoublesRR = useCallback((playersData, courts, durSecs, title, eventDetails = {}) => {
    const tid = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    tournamentIdRef.current = tid;
    const schedule = generateDoublesRRSchedule(Object.keys(playersData), courts.length);
    const resolvedTitle = title || 'Tournament';
    setTournamentTitle(resolvedTitle);
    document.title = resolvedTitle;
    const { location = '', startTime = '', durationMins = 0 } = eventDetails;
    setTournamentLocation(location); setTournamentStartTime(startTime); setTournamentDurationMins(durationMins);
    const snap = buildSnapshot({
      activeTeamIds: [], courtNumbers: courts, socialCourts: [],
      tournamentTeams: [], tournamentTitle: resolvedTitle,
      tournamentLocation: location, tournamentStartTime: startTime, tournamentDurationMins: durationMins,
      timerDuration: durSecs, timerDefaultMins: durSecs > 0 ? Math.round(durSecs / 60) : 12,
      history: [], roundNum: 0, pausedIds: [], targetRounds: 0, tournamentMode: 'doublesrr',
    }, {
      _tournamentId: tid,
      doublesRRPlayers: playersData, doublesRRSchedule: schedule, doublesRRResults: {},
    });
    pushSnapshot(snap, onFirebaseError);
    setRole('admin');
    setDoublesRRPlayers(playersData); doublesRRPlayersRef.current = playersData;
    setDoublesRRSchedule(schedule); doublesRRScheduleRef.current = schedule;
    setDoublesRRResults({}); doublesRRResultsRef.current = {};
    doublesRRRoundCompletingRef.current = false;
    setCourtNumbers(courts); setTimerDuration(durSecs);
    setHistory([]); setRoundNum(0); setActiveTeamIds([]); setStandings([]);
    setTournamentMode('doublesrr'); setRound(null); setPausedIds([]);
    lastSeenRoundNum.current = 0; pendingRef.current = {}; setPending({}); setRoundKey(0); setRoundComplete(false);
    setRoundRobinSchedule(null); setRoundRobinCourts(null); setRoundRobinStartRoundNum(null);
    setRoundRobinStartSnapshot(null); setRoundRobinEndSnapshot(null);
    setActiveRoundExtras([]); setTournamentFinished(false); setSocialCourts([]);
    setTimerAlarmed(false); applyTimerState(false, null, durSecs);
    setPhase('play'); setActiveTab('play');
  }, [applyTimerState]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDoublesRRResult = useCallback((roundIdx, courtIdx, result) => {
    if (!hasPermission(roleRef.current, 'canSubmitResults')) return;
    const key = `${roundIdx}_${courtIdx}`;
    const newResults = { ...doublesRRResultsRef.current, [key]: result };
    setDoublesRRResults(newResults);
    doublesRRResultsRef.current = newResults;

    const schedRound = doublesRRScheduleRef.current[roundIdx];
    if (!schedRound) { pushAtomicUpdate({ [`doublesRRResults/${key}`]: result }, onFirebaseError); return; }

    const allDone = !doublesRRRoundCompletingRef.current &&
      schedRound.courts.every((_, ci) => !!newResults[`${roundIdx}_${ci}`]);

    if (!allDone) {
      pushAtomicUpdate({ [`doublesRRResults/${key}`]: result }, onFirebaseError);
      return;
    }

    doublesRRRoundCompletingRef.current = true;
    const curRoundNum = stateRef.current.roundNum;
    const newRoundNum = curRoundNum + 1;
    const histEntry = {
      roundNum: newRoundNum,
      games: [], bye: schedRound.byePlayerIds || [], paused: [],
      doublesRRCourts: schedRound.courts.map((court, ci) => {
        const r = newResults[`${roundIdx}_${ci}`];
        return { teamA: court.teamA, teamB: court.teamB, ...r };
      }),
    };
    const newHistory = [...stateRef.current.history, histEntry];
    pushAtomicUpdate(
      { [`doublesRRResults/${key}`]: result, history: newHistory, roundNum: newRoundNum },
      onFirebaseError
    );
    setHistory(newHistory);
    setRoundNum(newRoundNum);
    doublesRRRoundCompletingRef.current = false;
  }, [roleRef]); // eslint-disable-line react-hooks/exhaustive-deps

  // Admin-only: generates a fresh full Doubles RR schedule for the same roster
  // — rotated, and biased away from the existing schedule's court oppositions —
  // and merges it with the existing schedule either by appending it as more
  // rounds, or replacing whatever rounds haven't been played yet. Uses the LIVE
  // player registry (not the existing schedule's roster) so a player removed via
  // Manage Players since the schedule was generated doesn't reappear in the new one.
  const handleGenerateAdditionalDoublesRR = useCallback((mode) => {
    if (!hasPermission(roleRef.current, 'canSwitchTournamentMode')) { closeModal(); return; }
    const schedule = doublesRRScheduleRef.current;
    if (!schedule.length) { closeModal(); return; }
    const playerIds = Object.keys(doublesRRPlayersRef.current);
    const courts = stateRef.current.courtNumbers || [];
    const n = playerIds.length;
    const startOffset = n > 1 ? Math.max(1, Math.floor(n / 2)) : 0;
    const completedCount = stateRef.current.history.length;
    // Bias against the matchups that will actually remain in the combined
    // schedule: the full schedule when appending (it's all kept), but only the
    // played portion when replacing — the unplayed remainder gets discarded, so
    // biasing against it would just force needless repeats elsewhere without
    // preventing any real repeat (rotating-partnership doubles can't guarantee
    // zero repeats outright, so this keeps the bias targeted at the matchups
    // that have actually been played, i.e. "games from before the replacement").
    const retained = mode === 'replace' ? schedule.slice(0, completedCount) : schedule;
    const priorOpponentCounts = countScheduleOpponentPairs(retained);
    const freshSchedule = generateDoublesRRSchedule(playerIds, courts.length, { startOffset, priorOpponentCounts });
    if (!freshSchedule.length) { closeModal(); return; }

    const combined = mode === 'replace' ? [...retained, ...freshSchedule] : [...schedule, ...freshSchedule];

    setDoublesRRSchedule(combined); doublesRRScheduleRef.current = combined;
    pushAtomicUpdate({ doublesRRSchedule: combined }, onFirebaseError);
    closeModal();
  }, [stateRef, roleRef, doublesRRPlayersRef, doublesRRScheduleRef, setDoublesRRSchedule, onFirebaseError, closeModal]);

  const handleManageDoublesRRPlayersSave = useCallback((newPlayers) => {
    setDoublesRRPlayers(newPlayers); doublesRRPlayersRef.current = newPlayers; closeModal();
    pushAtomicUpdate({ doublesRRPlayers: newPlayers }, onFirebaseError);
  }, [closeModal]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleUndoDoublesRRResult = useCallback((roundIdx, courtIdx) => {
    if (!hasPermission(roleRef.current, 'canSubmitResults')) return;
    const key = `${roundIdx}_${courtIdx}`;
    const newResults = { ...doublesRRResultsRef.current };
    delete newResults[key];
    setDoublesRRResults(newResults);
    doublesRRResultsRef.current = newResults;
    pushAtomicUpdate({ [`doublesRRResults/${key}`]: null }, onFirebaseError);
  }, [roleRef]); // eslint-disable-line react-hooks/exhaustive-deps

  return { handleStartDoublesRR, handleDoublesRRResult, handleUndoDoublesRRResult, handleGenerateAdditionalDoublesRR, handleManageDoublesRRPlayersSave };
}
