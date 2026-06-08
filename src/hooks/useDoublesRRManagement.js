import { useCallback } from 'react';
import { pushSnapshot, pushAtomicUpdate } from '../firebase';
import { hasPermission } from '../roleConfig';
import { buildSnapshot } from '../snapshot';
import { generateDoublesRRSchedule } from '../algorithms/doublesRR';

// Owns the Doubles Round Robin tournament lifecycle: starting (a full state
// reset + schedule generation), recording per-court results with round
// auto-completion, and saving the player registry. Mirrors useTPTManagement —
// results are recorded directly with no pendingResults/roundData/backup
// machinery, exactly like TPT.
export function useDoublesRRManagement({
  stateRef,
  // refs
  tournamentIdRef, lastSeenRoundNum, pendingRef, roleRef,
  doublesRRResultsRef, doublesRRScheduleRef, doublesRRRoundCompletingRef,
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
    setDoublesRRPlayers(playersData);
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

  const handleManageDoublesRRPlayersSave = useCallback((newPlayers) => {
    setDoublesRRPlayers(newPlayers); closeModal();
    pushAtomicUpdate({ doublesRRPlayers: newPlayers }, onFirebaseError);
  }, [closeModal]); // eslint-disable-line react-hooks/exhaustive-deps

  return { handleStartDoublesRR, handleDoublesRRResult, handleManageDoublesRRPlayersSave };
}
