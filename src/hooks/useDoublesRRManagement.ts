import { useCallback } from 'react';
import { writeTournamentMeta, createTournamentRepo } from '../firebase';
import { buildSnapshot } from '../snapshot';
import { hasPermission } from '../roleConfig';
import {
  generateDoublesRRSchedule,
  countScheduleOpponentPairs,
  isValidDoublesRRPlayerCount,
} from '../algorithms/doublesRR';
import { applyTournamentStartState } from './tournamentStartHelpers';
import { undoScheduledResult, submitScheduledResult } from './scheduledResultHelpers';
import { MODES } from '../modes';

// Owns the Doubles Round Robin tournament lifecycle: starting (a full state
// reset + schedule generation), recording per-court results with round
// auto-completion, and saving the player registry. Mirrors useTPTManagement —
// results are recorded directly with no pendingResults/roundData/backup
// machinery, exactly like TPT.
export function useDoublesRRManagement({
  stateRef,
  // refs
  tournamentIdRef,
  lastSeenRoundNum,
  pendingRef,
  roleRef,
  doublesRRPlayersRef,
  doublesRRResultsRef,
  doublesRRScheduleRef,
  doublesRRRoundCompletingRef,
  // Doubles RR state setters (non-reducer)
  setDoublesRRPlayers,
  setDoublesRRSchedule,
  setDoublesRRResults,
  // single reducer setter (replaces the ~18 individual setX params)
  set,
  // non-reducer setters
  setRole,
  setStandings,
  setRoundKey,
  setTimerAlarmed,
  setPhase,
  setActiveTab,
  // callbacks
  applyTimerState,
  onFirebaseError,
  closeModal,
  clubId,
  repo,
}) {
  const handleStartDoublesRR = useCallback(
    (
      playersData: Record<string, any>,
      courts: string[],
      durSecs: number,
      title: string,
      eventDetails: Record<string, any> = {}
    ) => {
      const tid = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
      tournamentIdRef.current = tid;
      const newRepo = createTournamentRepo(clubId ?? '', tid);
      const schedule = generateDoublesRRSchedule(Object.keys(playersData), courts.length);
      const resolvedTitle = title || 'Tournament';
      set('tournamentTitle', resolvedTitle);
      document.title = resolvedTitle;
      const { location = '', startTime = '', durationMins = 0, maxPlayers = 0 } = eventDetails;
      set('tournamentLocation', location);
      set('tournamentStartTime', startTime);
      set('tournamentDurationMins', durationMins);
      set('maxPlayers', maxPlayers);
      const snap = buildSnapshot(
        {
          activeTeamIds: [],
          courtNumbers: courts,
          socialCourts: [],
          tournamentTeams: [],
          tournamentTitle: resolvedTitle,
          tournamentLocation: location,
          tournamentStartTime: startTime,
          tournamentDurationMins: durationMins,
          maxPlayers,
          timerDuration: durSecs,
          timerDefaultMins: durSecs > 0 ? Math.round(durSecs / 60) : 12,
          history: [],
          roundNum: 0,
          pausedIds: [],
          targetRounds: 0,
          tournamentMode: 'doublesrr',
        } as any,
        {
          _tournamentId: tid,
          doublesRRPlayers: playersData,
          doublesRRSchedule: schedule,
          doublesRRResults: {},
        }
      );
      newRepo.pushSnapshot(snap, onFirebaseError);
      if (clubId)
        writeTournamentMeta(clubId, tid, {
          id: tid,
          title: resolvedTitle,
          mode: 'doublesrr',
          status: 'active',
          createdAt: Date.now(),
          playerCount: Object.keys(playersData).length,
          maxPlayers,
          location,
          startTime,
        });
      setDoublesRRPlayers(playersData);
      doublesRRPlayersRef.current = playersData;
      setDoublesRRSchedule(schedule);
      doublesRRScheduleRef.current = schedule;
      setDoublesRRResults({});
      doublesRRResultsRef.current = {};
      doublesRRRoundCompletingRef.current = false;
      applyTournamentStartState({
        tournamentMode: 'doublesrr',
        courts,
        durSecs,
        lastSeenRoundNum,
        pendingRef,
        set,
        setRole,
        setStandings,
        setRoundKey,
        setTimerAlarmed,
        setPhase,
        setActiveTab,
        applyTimerState,
      });
    },
    [applyTimerState] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const handleDoublesRRResult = useCallback(
    (roundIdx, courtIdx, result) => {
      const desc = MODES.doublesrr;
      submitScheduledResult({
        key: `${roundIdx}_${courtIdx}`,
        result,
        resultsRef: doublesRRResultsRef,
        setResults: setDoublesRRResults,
        firebasePath: 'doublesRRResults',
        roundCompletingRef: doublesRRRoundCompletingRef,
        getScheduleRound: () => doublesRRScheduleRef.current[roundIdx],
        isRoundComplete: (schedRound, newResults) =>
          desc.isRoundComplete!(schedRound, roundIdx, newResults),
        buildHistEntry: (schedRound, newResults, newRoundNum) =>
          desc.buildHistEntry!(schedRound, newResults, roundIdx, newRoundNum),
        stateRef,
        set,
        roleRef,
        onFirebaseError,
        pushAtomicUpdate: (fields, onErr) => repo.pushAtomicUpdate(fields, onErr),
      });
    },
    [roleRef, repo] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Admin-only: generates a fresh full Doubles RR schedule for the same roster
  // — rotated, and biased away from the existing schedule's court oppositions —
  // and merges it with the existing schedule either by appending it as more
  // rounds, or replacing whatever rounds haven't been played yet. Uses the LIVE
  // player registry (not the existing schedule's roster) so a player removed via
  // Manage Players since the schedule was generated doesn't reappear in the new one.
  const handleGenerateAdditionalDoublesRR = useCallback(
    (mode) => {
      if (!hasPermission(roleRef.current, 'canSwitchTournamentMode')) {
        closeModal();
        return;
      }
      const schedule = doublesRRScheduleRef.current;
      if (!schedule.length) {
        closeModal();
        return;
      }
      const playerIds = Object.keys(doublesRRPlayersRef.current);
      const courts = stateRef.current.courtNumbers || [];
      const n = playerIds.length;
      const startOffset = n > 1 ? Math.max(1, Math.floor(n / 2)) : 0;
      const completedCount = stateRef.current.history.length;
      const retained = mode === 'replace' ? schedule.slice(0, completedCount) : schedule;
      const priorOpponentCounts = countScheduleOpponentPairs(retained);
      const freshSchedule = generateDoublesRRSchedule(playerIds, courts.length, {
        startOffset,
        priorOpponentCounts,
      });
      if (!freshSchedule.length) {
        closeModal();
        return;
      }

      const combined =
        mode === 'replace' ? [...retained, ...freshSchedule] : [...schedule, ...freshSchedule];

      setDoublesRRSchedule(combined);
      doublesRRScheduleRef.current = combined;
      repo.pushAtomicUpdate({ doublesRRSchedule: combined }, onFirebaseError);
      closeModal();
    },
    [
      stateRef,
      roleRef,
      doublesRRPlayersRef,
      doublesRRScheduleRef,
      setDoublesRRSchedule,
      onFirebaseError,
      closeModal,
      repo,
    ]
  );

  const handleManageDoublesRRPlayersSave = useCallback(
    (newPlayers) => {
      setDoublesRRPlayers(newPlayers);
      doublesRRPlayersRef.current = newPlayers;
      closeModal();
      const upd: Record<string, any> = { doublesRRPlayers: newPlayers };
      if (stateRef.current.history.length === 0) {
        const playerIds = Object.keys(newPlayers);
        const courts = stateRef.current.courtNumbers || [];
        const schedule = isValidDoublesRRPlayerCount(playerIds.length)
          ? generateDoublesRRSchedule(playerIds, courts.length)
          : [];
        setDoublesRRSchedule(schedule);
        doublesRRScheduleRef.current = schedule;
        upd.doublesRRSchedule = schedule;
      }
      repo.pushAtomicUpdate(upd, onFirebaseError);
      if (clubId && tournamentIdRef.current)
        writeTournamentMeta(clubId, tournamentIdRef.current, {
          playerCount: Object.keys(newPlayers).length,
        });
    },
    [closeModal, clubId, repo] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const handleUndoDoublesRRResult = useCallback(
    (roundIdx, courtIdx) => {
      undoScheduledResult({
        roleRef,
        resultsRef: doublesRRResultsRef,
        setResults: setDoublesRRResults,
        firebasePath: 'doublesRRResults',
        key: `${roundIdx}_${courtIdx}`,
        onFirebaseError,
        stateRef,
        set,
        roundCompletingRef: doublesRRRoundCompletingRef,
        pushAtomicUpdate: (fields, onErr) => repo.pushAtomicUpdate(fields, onErr),
      });
    },
    [roleRef, repo] // eslint-disable-line react-hooks/exhaustive-deps
  );

  return {
    handleStartDoublesRR,
    handleDoublesRRResult,
    handleUndoDoublesRRResult,
    handleGenerateAdditionalDoublesRR,
    handleManageDoublesRRPlayersSave,
  };
}
