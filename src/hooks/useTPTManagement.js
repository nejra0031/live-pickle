import { useCallback } from 'react';
import { pushSnapshot, pushAtomicUpdate } from '../firebase';
import { hasPermission } from '../roleConfig';
import { buildSnapshot } from '../snapshot';
import { generateTPTSchedule } from '../algorithms/threePlayerTeam';

// Owns the 3-Player Team (TPT) tournament lifecycle: starting a TPT tournament
// (a full state reset + TPT init), recording per-game results with round
// auto-completion, and saving the TPT team/player registry.
//
// Mirrors useRoundManagement: reads live snapshot state via stateRef and writes
// through the App setters passed in, so behaviour is identical to the previous
// inline handlers.
export function useTPTManagement({
  stateRef,
  // refs
  tournamentIdRef, lastSeenRoundNum, pendingRef, roleRef,
  tptResultsRef, tptScheduleRef, tptRoundCompletingRef,
  // TPT state setters
  setTPTTeams, setTPTPlayers, setTPTSchedule, setTPTResults,
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
  const handleStartTPT = useCallback((tptTeamsData, playersData, courts, durSecs, title, eventDetails = {}) => {
    const tid = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    tournamentIdRef.current = tid;
    const schedule = generateTPTSchedule(Object.keys(tptTeamsData));
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
      history: [], roundNum: 0, pausedIds: [], targetRounds: 0, tournamentMode: 'tpt',
    }, {
      _tournamentId: tid,
      tptTeams: tptTeamsData, players: playersData,
      tptSchedule: schedule, tptResults: {},
    });
    pushSnapshot(snap, onFirebaseError);
    setRole('admin');
    setTPTTeams(tptTeamsData); setTPTPlayers(playersData);
    setTPTSchedule(schedule); tptScheduleRef.current = schedule;
    setTPTResults({}); tptResultsRef.current = {};
    tptRoundCompletingRef.current = false;
    setCourtNumbers(courts); setTimerDuration(durSecs);
    setHistory([]); setRoundNum(0); setActiveTeamIds([]); setStandings([]);
    setTournamentMode('tpt'); setRound(null); setPausedIds([]);
    lastSeenRoundNum.current = 0; pendingRef.current = {}; setPending({}); setRoundKey(0); setRoundComplete(false);
    setRoundRobinSchedule(null); setRoundRobinCourts(null); setRoundRobinStartRoundNum(null);
    setRoundRobinStartSnapshot(null); setRoundRobinEndSnapshot(null);
    setActiveRoundExtras([]); setTournamentFinished(false); setSocialCourts([]);
    setTimerAlarmed(false); applyTimerState(false, null, durSecs);
    setPhase('play'); setActiveTab('play');
  }, [applyTimerState]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTPTResult = useCallback((schedRoundIdx, matchupIdx, gameIdx, result) => {
    if (!hasPermission(roleRef.current, 'canSubmitResults')) return;
    const key = `${schedRoundIdx}_${matchupIdx}_${gameIdx}`;
    const newResults = { ...tptResultsRef.current, [key]: result };
    setTPTResults(newResults);
    tptResultsRef.current = newResults;

    const schedRound = tptScheduleRef.current[schedRoundIdx];
    if (!schedRound) { pushAtomicUpdate({ [`tptResults/${key}`]: result }, onFirebaseError); return; }

    const allDone = !tptRoundCompletingRef.current &&
      schedRound.matchups.every((_, mi2) => [0, 1, 2].every(gi => !!newResults[`${schedRoundIdx}_${mi2}_${gi}`]));

    if (!allDone) {
      pushAtomicUpdate({ [`tptResults/${key}`]: result }, onFirebaseError);
      return;
    }

    tptRoundCompletingRef.current = true;
    const curRoundNum = stateRef.current.roundNum;
    const newRoundNum = curRoundNum + 1;
    const histEntry = {
      roundNum: newRoundNum,
      games: [], bye: [], paused: [],
      tptMatchups: schedRound.matchups.map((matchup, mi) => ({
        teamAId: matchup.teamAId, teamBId: matchup.teamBId,
        games: [0, 1, 2].map(gi => newResults[`${schedRoundIdx}_${mi}_${gi}`] || null),
      })),
      ...(schedRound.byeTeamId ? { tptByeTeamId: schedRound.byeTeamId } : {}),
    };
    const newHistory = [...stateRef.current.history, histEntry];
    pushAtomicUpdate(
      { [`tptResults/${key}`]: result, history: newHistory, roundNum: newRoundNum },
      onFirebaseError
    );
    setHistory(newHistory);
    setRoundNum(newRoundNum);
    tptRoundCompletingRef.current = false;
  }, [roleRef]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleManageTPTTeamsSave = useCallback((newTPTTeams, newPlayers) => {
    setTPTTeams(newTPTTeams); setTPTPlayers(newPlayers); closeModal();
    pushAtomicUpdate({ tptTeams: newTPTTeams, players: newPlayers }, onFirebaseError);
  }, [closeModal]); // eslint-disable-line react-hooks/exhaustive-deps

  return { handleStartTPT, handleTPTResult, handleManageTPTTeamsSave };
}
