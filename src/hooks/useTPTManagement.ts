import { useCallback } from 'react';
import type { MutableRefObject, Dispatch, SetStateAction } from 'react';
import type { SetField } from '../state/TournamentProvider';
import type { TournamentRepo } from '../firebase';
import { writeTournamentMeta, createTournamentRepo } from '../firebase';
import { buildSnapshot } from '../snapshot';
import { generateTPTSchedule } from '../algorithms/threePlayerTeam';
import { applyTournamentStartState } from './tournamentStartHelpers';
import { undoScheduledResult, submitScheduledResult } from './scheduledResultHelpers';
import { MODES } from '../modes';

// Owns the 3-Player Team (TPT) tournament lifecycle: starting a TPT tournament
// (a full state reset + TPT init), recording per-game results with round
// auto-completion, and saving the TPT team/player registry.
//
// Mirrors useRoundManagement: reads live snapshot state via stateRef and writes
// through the single `set` reducer setter passed in.
export function useTPTManagement({
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
  onFirebaseError,
  closeModal,
  clubId,
  repo,
}: {
  stateRef: MutableRefObject<any>;
  tournamentIdRef: MutableRefObject<string | null>;
  lastSeenRoundNum: MutableRefObject<number>;
  pendingRef: MutableRefObject<Record<string, any>>;
  roleRef: MutableRefObject<string | null>;
  tptResultsRef: MutableRefObject<Record<string, any>>;
  tptScheduleRef: MutableRefObject<any[]>;
  tptRoundCompletingRef: MutableRefObject<boolean>;
  tptSubstitutionsRef: MutableRefObject<Record<string, any>>;
  setTPTTeams: (v: any) => void;
  setTPTPlayers: (v: any) => void;
  setTPTSchedule: (v: any) => void;
  setTPTResults: (v: Record<string, any>) => void;
  setTPTSubstitutions: (v: Record<string, any>) => void;
  set: SetField;
  setRole: (v: string) => void;
  setStandings: (s: any[]) => void;
  setRoundKey: Dispatch<SetStateAction<number>>;
  setTimerAlarmed: (v: boolean) => void;
  setPhase: (v: string) => void;
  setActiveTab: (v: string) => void;
  applyTimerState: (running: boolean, startedAt: number | null, secsLeft: number) => void;
  onFirebaseError: (msg: string) => void;
  closeModal: () => void;
  clubId: string | null;
  repo: TournamentRepo;
}) {
  const handleStartTPT = useCallback(
    (
      tptTeamsData: any,
      playersData: any,
      courts: any,
      durSecs: any,
      title: any,
      eventDetails: Record<string, any> = {}
    ) => {
      const tid = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
      tournamentIdRef.current = tid;
      const newRepo = createTournamentRepo(clubId ?? '', tid);
      const schedule = generateTPTSchedule(Object.keys(tptTeamsData));
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
          tournamentMode: 'tpt',
        } as any,
        {
          _tournamentId: tid,
          tptTeams: tptTeamsData,
          players: playersData,
          tptSchedule: schedule,
          tptResults: {},
          tptSubstitutions: {},
        }
      );
      newRepo.pushSnapshot(snap, onFirebaseError);
      if (clubId)
        writeTournamentMeta(clubId, tid, {
          id: tid,
          title: resolvedTitle,
          mode: 'tpt',
          status: 'active',
          createdAt: Date.now(),
          playerCount: Object.keys(playersData).length,
          maxPlayers,
          location,
          startTime,
        });
      setTPTTeams(tptTeamsData);
      setTPTPlayers(playersData);
      setTPTSchedule(schedule);
      tptScheduleRef.current = schedule;
      setTPTResults({});
      tptResultsRef.current = {};
      setTPTSubstitutions({});
      tptSubstitutionsRef.current = {};
      tptRoundCompletingRef.current = false;
      applyTournamentStartState({
        tournamentMode: 'tpt',
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

  const handleTPTResult = useCallback(
    (schedRoundIdx: number, matchupIdx: number, gameIdx: number, result: any) => {
      const desc = MODES.tpt;
      submitScheduledResult({
        key: `${schedRoundIdx}_${matchupIdx}_${gameIdx}`,
        result,
        resultsRef: tptResultsRef,
        setResults: setTPTResults,
        firebasePath: 'tptResults',
        roundCompletingRef: tptRoundCompletingRef,
        getScheduleRound: () => tptScheduleRef.current[schedRoundIdx],
        isRoundComplete: (schedRound, newResults) =>
          desc.isRoundComplete!(schedRound, schedRoundIdx, newResults),
        buildHistEntry: (schedRound, newResults, newRoundNum) =>
          desc.buildHistEntry!(schedRound, newResults, schedRoundIdx, newRoundNum),
        stateRef,
        set,
        roleRef,
        onFirebaseError,
        pushAtomicUpdate: (fields, onErr) => repo.pushAtomicUpdate(fields, onErr),
      });
    },
    [roleRef, repo] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const handleManageTPTTeamsSave = useCallback(
    (newTPTTeams: any, newPlayers: any) => {
      setTPTTeams(newTPTTeams);
      setTPTPlayers(newPlayers);
      closeModal();
      const upd: Record<string, any> = { tptTeams: newTPTTeams, players: newPlayers };
      if (stateRef.current.history.length === 0) {
        const schedule = generateTPTSchedule(Object.keys(newTPTTeams));
        setTPTSchedule(schedule);
        tptScheduleRef.current = schedule;
        upd.tptSchedule = schedule;
      }
      repo.pushAtomicUpdate(upd, onFirebaseError);
      if (clubId && tournamentIdRef.current)
        writeTournamentMeta(clubId, tournamentIdRef.current, {
          playerCount: Object.keys(newPlayers).length,
        });
    },
    [closeModal, clubId, repo] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const handleUndoTPTResult = useCallback(
    (schedRoundIdx: number, matchupIdx: number, gameIdx: number) => {
      undoScheduledResult({
        roleRef,
        resultsRef: tptResultsRef,
        setResults: setTPTResults,
        firebasePath: 'tptResults',
        key: `${schedRoundIdx}_${matchupIdx}_${gameIdx}`,
        onFirebaseError,
        stateRef,
        set,
        roundCompletingRef: tptRoundCompletingRef,
        pushAtomicUpdate: (fields, onErr) => repo.pushAtomicUpdate(fields, onErr),
      });
    },
    [roleRef, repo] // eslint-disable-line react-hooks/exhaustive-deps
  );

  return { handleStartTPT, handleTPTResult, handleUndoTPTResult, handleManageTPTTeamsSave };
}
