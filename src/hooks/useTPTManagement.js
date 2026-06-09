import { useCallback } from 'react';
import { pushSnapshot, pushAtomicUpdate, setActiveTournament, writeTournamentMeta } from '../firebase';
import { buildSnapshot } from '../snapshot';
import { generateTPTSchedule } from '../algorithms/threePlayerTeam';
import { applyTournamentStartState } from './tournamentStartHelpers';
import { undoScheduledResult, submitScheduledResult } from './scheduledResultHelpers';

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
  clubId,
}) {
  const handleStartTPT = useCallback((tptTeamsData, playersData, courts, durSecs, title, eventDetails = {}) => {
    const tid = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    tournamentIdRef.current = tid;
    if (clubId) setActiveTournament(clubId, tid);
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
    if (clubId) writeTournamentMeta(clubId, tid, { id: tid, title: resolvedTitle, mode: 'tpt', status: 'active', createdAt: Date.now(), teamCount: Object.keys(tptTeamsData).length });
    setTPTTeams(tptTeamsData); setTPTPlayers(playersData);
    setTPTSchedule(schedule); tptScheduleRef.current = schedule;
    setTPTResults({}); tptResultsRef.current = {};
    tptRoundCompletingRef.current = false;
    applyTournamentStartState({
      tournamentMode: 'tpt', courts, durSecs,
      lastSeenRoundNum, pendingRef,
      setRole, setCourtNumbers, setTimerDuration,
      setHistory, setRoundNum, setActiveTeamIds, setStandings,
      setTournamentMode, setRound, setPausedIds, setPending, setRoundKey, setRoundComplete,
      setRoundRobinSchedule, setRoundRobinCourts, setRoundRobinStartRoundNum,
      setRoundRobinStartSnapshot, setRoundRobinEndSnapshot,
      setActiveRoundExtras, setTournamentFinished, setSocialCourts,
      setTimerAlarmed, applyTimerState,
      setPhase, setActiveTab,
    });
  }, [applyTimerState]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTPTResult = useCallback((schedRoundIdx, matchupIdx, gameIdx, result) => {
    submitScheduledResult({
      key: `${schedRoundIdx}_${matchupIdx}_${gameIdx}`,
      result,
      resultsRef: tptResultsRef, setResults: setTPTResults, firebasePath: 'tptResults',
      roundCompletingRef: tptRoundCompletingRef,
      getScheduleRound: () => tptScheduleRef.current[schedRoundIdx],
      isRoundComplete: (schedRound, newResults) =>
        schedRound.matchups.every((_, mi2) => [0, 1, 2].every(gi => !!newResults[`${schedRoundIdx}_${mi2}_${gi}`])),
      buildHistEntry: (schedRound, newResults, newRoundNum) => ({
        roundNum: newRoundNum,
        games: [], bye: [], paused: [],
        tptMatchups: schedRound.matchups.map((matchup, mi) => ({
          teamAId: matchup.teamAId, teamBId: matchup.teamBId,
          games: [0, 1, 2].map(gi => newResults[`${schedRoundIdx}_${mi}_${gi}`] || null),
        })),
        ...(schedRound.byeTeamId ? { tptByeTeamId: schedRound.byeTeamId } : {}),
      }),
      stateRef, setHistory, setRoundNum,
      roleRef, onFirebaseError,
    });
  }, [roleRef]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleManageTPTTeamsSave = useCallback((newTPTTeams, newPlayers) => {
    setTPTTeams(newTPTTeams); setTPTPlayers(newPlayers); closeModal();
    pushAtomicUpdate({ tptTeams: newTPTTeams, players: newPlayers }, onFirebaseError);
  }, [closeModal]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleUndoTPTResult = useCallback((schedRoundIdx, matchupIdx, gameIdx) => {
    undoScheduledResult(roleRef, tptResultsRef, setTPTResults, 'tptResults', `${schedRoundIdx}_${matchupIdx}_${gameIdx}`, onFirebaseError);
  }, [roleRef]); // eslint-disable-line react-hooks/exhaustive-deps

  return { handleStartTPT, handleTPTResult, handleUndoTPTResult, handleManageTPTTeamsSave };
}
