import { useCallback } from 'react';
import type { MutableRefObject, Dispatch, SetStateAction } from 'react';
import { writeTournamentMeta } from '../firebase';
import { rebuildStandings } from '../algorithms/standings';
import { generateRound } from '../algorithms/pairing';
import { DEFAULT_DOUBLES_RR_TIEBREAK_ORDER } from '../algorithms/doublesRR';
import { snapshotToState } from '../snapshot';
import { useTournamentState } from '../state/TournamentProvider';

// Returns the stable updateAllStates callback that fires whenever the Firebase
// snapshot listener delivers a new snapshot.  Extracted from AppInner to reduce
// its line-count; all side-effect setters that are NOT in TournamentProvider
// context are received as parameters.
export function useSnapshotHandler({
  clubId,
  lastSeenRoundNum,
  tournamentIdRef,
  metaSyncedRef,
  pendingRef,
  setStandings,
  setBreakMode,
  setPhase,
  setRoundKey,
  applyTimerState,
  onFirebaseError: _onFirebaseError,
  setTPTTeams,
  setTPTPlayers,
  setTPTSchedule,
  setTPTResults,
  setTPTSubstitutions,
  tptResultsRef,
  tptScheduleRef,
  tptSubstitutionsRef,
  setDoublesRRPlayers,
  setDoublesRRSchedule,
  setDoublesRRResults,
  setDoublesRRTiebreakOrder,
  doublesRRPlayersRef,
  doublesRRScheduleRef,
  doublesRRResultsRef,
}: {
  clubId: string | null;
  lastSeenRoundNum: MutableRefObject<number>;
  tournamentIdRef: MutableRefObject<string | null>;
  metaSyncedRef: MutableRefObject<boolean>;
  pendingRef: MutableRefObject<Record<string, any>>;
  setStandings: (s: any[]) => void;
  setBreakMode: (v: string | null) => void;
  setPhase: Dispatch<SetStateAction<string>>;
  setRoundKey: Dispatch<SetStateAction<number>>;
  applyTimerState: (running: boolean, startedAt: number | null, secsLeft: number) => void;
  onFirebaseError: (msg: string) => void;
  setTPTTeams: (v: any) => void;
  setTPTPlayers: (v: any) => void;
  setTPTSchedule: (v: any) => void;
  setTPTResults: (v: any) => void;
  setTPTSubstitutions: (v: any) => void;
  tptResultsRef: MutableRefObject<any>;
  tptScheduleRef: MutableRefObject<any>;
  tptSubstitutionsRef: MutableRefObject<any>;
  setDoublesRRPlayers: (v: any) => void;
  setDoublesRRSchedule: (v: any) => void;
  setDoublesRRResults: (v: any) => void;
  setDoublesRRTiebreakOrder: (v: string[]) => void;
  doublesRRPlayersRef: MutableRefObject<any>;
  doublesRRScheduleRef: MutableRefObject<any>;
  doublesRRResultsRef: MutableRefObject<any>;
}) {
  const { load, set } = useTournamentState();

  const updateAllStates = useCallback(
    (s: any) => {
      if (!s || s.phase === 'waiting') {
        setPhase((p) => (p === 'play' ? 'waiting' : p));
        return;
      }
      if (s.tournamentTitle) document.title = s.tournamentTitle;
      const ns = rebuildStandings(s.activeTeamIds, s.history);
      let nr;
      if (s.roundData && s.roundData.courtTeamIds) {
        const safe = (id: any) =>
          s.teamRegistry?.find((t: any) => t.id === id) || {
            id,
            name: String(id),
            color: '#475569',
            text: '#fff',
          };
        nr = {
          courts: s.roundData.courtTeamIds.map((p: any) => p.map(safe)),
          bye: (s.roundData.byeIds || []).map(safe),
          paused: (s.roundData.pausedTeamIds || []).map(safe),
          courtNums:
            s.roundData.courtNums || s.courtNumbers.slice(0, s.roundData.courtTeamIds.length),
        };
      } else if (s.roundNum === 0 || !s.roundData) {
        nr = null;
      } else {
        nr = generateRound(
          ns as any,
          s.courtNumbers.length,
          s.history.length,
          s.history,
          s.pausedIds || []
        );
      }
      load(snapshotToState(s, { round: nr as any }));
      setStandings(ns);
      setBreakMode(s.breakMode || null);
      if (s.tptTeams) {
        setTPTTeams(s.tptTeams);
      }
      if (s.players) {
        setTPTPlayers(s.players);
      }
      if (s.tptSchedule) {
        setTPTSchedule(s.tptSchedule);
        tptScheduleRef.current = s.tptSchedule;
      }
      setTPTResults(s.tptResults || {});
      tptResultsRef.current = s.tptResults || {};
      setTPTSubstitutions(s.tptSubstitutions || {});
      tptSubstitutionsRef.current = s.tptSubstitutions || {};
      if (s.doublesRRPlayers) {
        setDoublesRRPlayers(s.doublesRRPlayers);
        doublesRRPlayersRef.current = s.doublesRRPlayers;
      }
      if (s.doublesRRSchedule) {
        setDoublesRRSchedule(s.doublesRRSchedule);
        doublesRRScheduleRef.current = s.doublesRRSchedule;
      }
      setDoublesRRResults(s.doublesRRResults || {});
      doublesRRResultsRef.current = s.doublesRRResults || {};
      setDoublesRRTiebreakOrder(s.doublesRRTiebreakOrder || DEFAULT_DOUBLES_RR_TIEBREAK_ORDER);
      if (s._tournamentId) tournamentIdRef.current = s._tournamentId;
      if (!metaSyncedRef.current && clubId && tournamentIdRef.current) {
        metaSyncedRef.current = true;
        const loc = s.tournamentLocation || '',
          st = s.tournamentStartTime || '';
        if (loc || st)
          writeTournamentMeta(clubId, tournamentIdRef.current, { location: loc, startTime: st });
      }
      const isNew = s.roundNum !== lastSeenRoundNum.current;
      if (isNew) {
        lastSeenRoundNum.current = s.roundNum;
        pendingRef.current = {};
        set('pending', {});
        setRoundKey((k) => k + 1);
      }
      const tRun = s.timerRunning || false,
        tSA = s.timerStartedAt || null,
        tPS = s.timerPausedSecsLeft ?? s.timerDuration ?? 0;
      applyTimerState(tRun, tSA, tPS);
      setPhase('play');
    },
    [applyTimerState, load, set] // eslint-disable-line react-hooks/exhaustive-deps
  );

  return updateAllStates;
}
