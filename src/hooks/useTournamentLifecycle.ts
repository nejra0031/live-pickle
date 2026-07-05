import { useCallback } from 'react';
import type { MutableRefObject, Dispatch, SetStateAction } from 'react';
import { createTournamentRepo, writeTournamentMeta } from '../firebase';
import { buildSnapshot } from '../snapshot';
import { normaliseSnapshot } from '../normalise';
import { mkStandings, rebuildStandings } from '../algorithms/standings';
import { generateRoundRobinSchedule } from '../algorithms/roundRobin';
import { setModuleRegistry } from '../constants';
import { useTournamentState } from '../state/TournamentProvider';
import { useModal } from '../state/ModalProvider';
import { useRepo } from '../state/RepoProvider';

export function useTournamentLifecycle({
  clubId,
  onCreated,
  effectiveRankedRef,
  tournamentIdRef,
  lastSeenRoundNum,
  historyLengthRef,
  pendingRef,
  setStandings,
  setBreakMode,
  setPhase,
  setActiveTab,
  setRole,
  setRoundKey,
  setTimerAlarmed,
  setBackupRoundNums,
  applyTimerState,
  computeSecsLeft,
  gatedUpdate,
  onFirebaseError,
  updateAllStates,
  setTPTResults,
  setTPTSubstitutions,
  tptResultsRef,
  tptRoundCompletingRef,
  tptSubstitutionsRef,
  setDoublesRRResults,
  doublesRRResultsRef,
  doublesRRRoundCompletingRef,
}: {
  clubId: string | null;
  onCreated?: ((clubId: string | null, tid: string, role: string) => void) | null;
  effectiveRankedRef: MutableRefObject<any[]>;
  tournamentIdRef: MutableRefObject<string | null>;
  lastSeenRoundNum: MutableRefObject<number>;
  historyLengthRef: MutableRefObject<number>;
  pendingRef: MutableRefObject<Record<string, any>>;
  setStandings: (s: any[]) => void;
  setBreakMode: (v: any) => void;
  setPhase: (v: string) => void;
  setActiveTab: (v: string) => void;
  setRole: (v: string) => void;
  setRoundKey: Dispatch<SetStateAction<number>>;
  setTimerAlarmed: (v: boolean) => void;
  setBackupRoundNums: Dispatch<SetStateAction<Set<number>>>;
  applyTimerState: (running: boolean, startedAt: number | null, secsLeft: number) => void;
  computeSecsLeft: () => number;
  gatedUpdate: (perm: any, fields: any) => void;
  onFirebaseError: (msg: string) => void;
  updateAllStates: (s: any) => void;
  setTPTResults: (v: any) => void;
  setTPTSubstitutions: (v: any) => void;
  tptResultsRef: MutableRefObject<any>;
  tptRoundCompletingRef: MutableRefObject<boolean>;
  tptSubstitutionsRef: MutableRefObject<any>;
  setDoublesRRResults: (v: any) => void;
  doublesRRResultsRef: MutableRefObject<any>;
  doublesRRRoundCompletingRef: MutableRefObject<boolean>;
}) {
  const { set, load, stateRef } = useTournamentState();
  const { modal, closeModal } = useModal();
  const repo = useRepo();

  const handleStart = useCallback(
    (
      allTeams: any,
      teamIds: any,
      courts: any,
      durSecs: any,
      title: any,
      numRounds: any,
      eventDetails: Record<string, any> = {},
      startMode = 'swiss'
    ) => {
      set('tournamentTeams', allTeams);
      setModuleRegistry(allTeams);
      const resolvedTitle = title || 'Tournament';
      set('tournamentTitle', resolvedTitle);
      const { location = '', startTime = '', durationMins = 0, maxPlayers: mp = 0 } = eventDetails;
      set('tournamentLocation', location);
      set('tournamentStartTime', startTime);
      set('tournamentDurationMins', durationMins);
      const s = mkStandings(teamIds);
      const tid = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
      tournamentIdRef.current = tid;
      const newRepo = createTournamentRepo(clubId ?? '', tid);
      const isRR = startMode === 'roundrobin';
      const tr = isRR ? 0 : numRounds || 0;
      const rrSchedule = isRR ? generateRoundRobinSchedule(teamIds, courts.length) : null;
      const rrStartSnapshot = isRR
        ? { startRoundNum: 1, participatingIds: [...teamIds], excludedIds: [] }
        : null;
      const startRoundNum = isRR ? 1 : 0;
      const snap = buildSnapshot(
        {
          activeTeamIds: teamIds,
          courtNumbers: courts,
          socialCourts: [],
          tournamentTeams: allTeams,
          tournamentTitle: resolvedTitle,
          tournamentLocation: location,
          tournamentStartTime: startTime,
          tournamentDurationMins: durationMins,
          maxPlayers: mp,
          timerDuration: durSecs,
          timerDefaultMins: durSecs > 0 ? Math.round(durSecs / 60) : 12,
          history: [],
          roundNum: startRoundNum,
          pausedIds: [],
          targetRounds: tr,
          tournamentMode: isRR ? 'roundrobin' : 'swiss',
          ...(isRR
            ? {
                roundRobinSchedule: rrSchedule,
                roundRobinCourts: courts,
                roundRobinStartRoundNum: 1,
                roundRobinStartSnapshot: rrStartSnapshot,
                roundRobinEndSnapshot: null,
              }
            : {}),
        } as any,
        { _tournamentId: tid }
      );
      newRepo.pushSnapshot(snap, onFirebaseError);
      setRole('admin');
      onCreated?.(clubId, tid, 'admin');
      const playerCount = allTeams.reduce((n: number, t: any) => n + (t.players?.length || 1), 0);
      if (clubId)
        writeTournamentMeta(clubId, tid, {
          id: tid,
          title: resolvedTitle,
          mode: isRR ? 'roundrobin' : 'swiss',
          status: 'active',
          createdAt: Date.now(),
          playerCount,
          maxPlayers: mp,
          location,
          startTime,
          timerMins: durSecs > 0 ? Math.round(durSecs / 60) : 0,
        });
      load({
        maxPlayers: mp,
        activeTeamIds: teamIds,
        courtNumbers: courts,
        timerDuration: durSecs,
        round: null,
        roundNum: startRoundNum,
        history: [],
        pending: {},
        pausedIds: [],
        roundComplete: false,
        tournamentMode: isRR ? 'roundrobin' : 'swiss',
        roundRobinSchedule: rrSchedule,
        roundRobinCourts: isRR ? courts : null,
        roundRobinStartRoundNum: isRR ? 1 : null,
        roundRobinStartSnapshot: rrStartSnapshot,
        roundRobinEndSnapshot: null,
        activeRoundExtras: [],
        tournamentFinished: false,
        socialCourts: [],
        targetRounds: tr,
        liveAdditions: [],
        nextRoundPresets: [],
        cancelledRoundNums: [],
      });
      setStandings(s);
      lastSeenRoundNum.current = startRoundNum;
      pendingRef.current = {};
      setRoundKey(0);
      setTimerAlarmed(false);
      applyTimerState(false, null, durSecs);
      setPhase('play');
      setActiveTab('play');
    },
    [applyTimerState, clubId, onCreated, set, load, setRole] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Ends the current tournament's matches and returns it to a pre-Round-1 state.
  // Only match data (history, round state, schedules/results) is cleared — teams,
  // courts, and other setup fields are left untouched, both locally and in
  // Firebase (an atomic update, not a full pushSnapshot, so unlisted fields like
  // tptTeams/players/doublesRRPlayers/teamRegistry/courtNumbers survive).
  const doReset = useCallback(() => {
    const s = stateRef.current;
    if (clubId) writeTournamentMeta(clubId, tournamentIdRef.current as string, { status: 'setup' });
    repo.pushAtomicUpdate(
      {
        history: [],
        roundNum: 0,
        roundData: null,
        pausedIds: [],
        roundComplete: false,
        pendingResults: null,
        activeRoundExtras: [],
        liveAdditions: [],
        nextRoundPresets: [],
        tournamentFinished: false,
        cancelledRoundNums: [],
        finalRound: false,
        roundRobinSchedule: null,
        roundRobinCourts: null,
        roundRobinStartRoundNum: null,
        roundRobinStartSnapshot: null,
        roundRobinEndSnapshot: null,
        breakMode: null,
        timerRunning: false,
        timerStartedAt: null,
        timerPausedSecsLeft: s.timerDuration,
        tptResults: {},
        tptSubstitutions: {},
        doublesRRResults: {},
      },
      onFirebaseError
    );
    repo.clearBackups();
    setBackupRoundNums(new Set());
    historyLengthRef.current = 0;
    lastSeenRoundNum.current = 0;
    load({
      history: [],
      round: null,
      roundNum: 0,
      pending: {},
      roundComplete: false,
      pausedIds: [],
      roundRobinSchedule: null,
      roundRobinCourts: null,
      roundRobinStartRoundNum: null,
      roundRobinStartSnapshot: null,
      roundRobinEndSnapshot: null,
      activeRoundExtras: [],
      liveAdditions: [],
      nextRoundPresets: [],
      tournamentFinished: false,
      cancelledRoundNums: [],
      finalRound: false,
    });
    pendingRef.current = {};
    setStandings(rebuildStandings(s.activeTeamIds, []));
    setBreakMode(null);
    setTPTResults({});
    tptResultsRef.current = {};
    tptRoundCompletingRef.current = false;
    setTPTSubstitutions({});
    tptSubstitutionsRef.current = {};
    setDoublesRRResults({});
    doublesRRResultsRef.current = {};
    doublesRRRoundCompletingRef.current = false;
    setRoundKey((k) => k + 1);
    applyTimerState(false, null, s.timerDuration);
    setActiveTab('play');
  }, [stateRef, closeModal, applyTimerState, setBackupRoundNums, repo, load, clubId, onFirebaseError]); // eslint-disable-line react-hooks/exhaustive-deps

  const doRevertToRound = useCallback(async () => {
    const target = modal.data?.roundNum;
    if (target == null) return;
    try {
      const snap = await repo.fetchBackup(target);
      const data = snap.val();
      if (!data) {
        onFirebaseError('Backup not found for this round.');
        closeModal();
        return;
      }
      const { _backupAt, ...snapData } = data;
      const normalised = normaliseSnapshot(snapData);
      repo.pushSnapshot(snapData, onFirebaseError);
      updateAllStates(normalised);
      setActiveTab('play');
    } catch {
      onFirebaseError('Failed to load backup — check connection.');
    }
    closeModal();
  }, [modal.data, updateAllStates, repo, onFirebaseError, closeModal, setActiveTab]);

  const doRevertToBeginning = useCallback(() => {
    const s = stateRef.current;
    const snap = buildSnapshot(s, {
      history: [],
      roundNum: 0,
      pausedIds: [],
      cancelledRoundNums: [],
      finalRound: false,
      activeRoundExtras: [],
      liveAdditions: [],
      nextRoundPresets: [],
      tournamentFinished: false,
      roundRobinSchedule: null,
      roundRobinCourts: null,
      roundRobinStartRoundNum: null,
      roundRobinStartSnapshot: null,
      roundRobinEndSnapshot: null,
    });
    repo.pushSnapshot(snap, onFirebaseError);
    repo.clearBackups();
    setBackupRoundNums(new Set());
    historyLengthRef.current = 0;
    lastSeenRoundNum.current = 0;
    load({
      history: [],
      roundNum: 0,
      round: null,
      pausedIds: [],
      pending: {},
      roundComplete: false,
      roundRobinSchedule: null,
      roundRobinCourts: null,
      roundRobinStartRoundNum: null,
      roundRobinStartSnapshot: null,
      roundRobinEndSnapshot: null,
      activeRoundExtras: [],
      liveAdditions: [],
      nextRoundPresets: [],
      tournamentFinished: false,
      cancelledRoundNums: [],
      finalRound: false,
    });
    pendingRef.current = {};
    setStandings(rebuildStandings(s.activeTeamIds, []));
    setBreakMode(null);
    setTPTResults({});
    tptResultsRef.current = {};
    tptRoundCompletingRef.current = false;
    setTPTSubstitutions({});
    tptSubstitutionsRef.current = {};
    setDoublesRRResults({});
    doublesRRResultsRef.current = {};
    doublesRRRoundCompletingRef.current = false;
    setRoundKey((k) => k + 1);
    applyTimerState(false, null, s.timerDuration);
    closeModal();
    setActiveTab('play');
  }, [stateRef, closeModal, applyTimerState, setBackupRoundNums, repo, load, onFirebaseError]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleBreakStart = useCallback(
    (message: string, durationSecs: number) => {
      const bm = { message, endAt: Date.now() + durationSecs * 1000 };
      setBreakMode(bm);
      closeModal();
      gatedUpdate('canBreakTournament', { breakMode: bm });
    },
    [setBreakMode, closeModal, gatedUpdate]
  );

  const handleBreakEnd = useCallback(() => {
    setBreakMode(null);
    gatedUpdate('canBreakTournament', { breakMode: null });
  }, [setBreakMode, gatedUpdate]);

  const handleFinishTournament = useCallback(() => {
    const s = computeSecsLeft();
    applyTimerState(false, null, s);
    setBreakMode(null);
    set('tournamentFinished', true);
    gatedUpdate('canFinishTournament', {
      tournamentFinished: true,
      timerRunning: false,
      timerStartedAt: null,
      timerPausedSecsLeft: s,
      breakMode: null,
    });
    if (clubId) {
      const top3 = effectiveRankedRef.current
        .slice(0, 3)
        .map((t) => ({
          name: t.name,
          color: t.color || 'var(--court)',
          text: t.text || '#fff',
          wins: t.wins,
          losses: t.losses,
          scoreDiff: t.scoreDiff,
        }));
      writeTournamentMeta(clubId, tournamentIdRef.current as string, { status: 'finished', top3 });
    }
  }, [computeSecsLeft, applyTimerState, set, gatedUpdate, clubId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleResumeTournament = useCallback(() => {
    set('tournamentFinished', false);
    gatedUpdate('canFinishTournament', { tournamentFinished: false });
    if (clubId)
      writeTournamentMeta(clubId, tournamentIdRef.current as string, { status: 'active', top3: null });
  }, [set, gatedUpdate, clubId]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    handleStart,
    doReset,
    doRevertToRound,
    doRevertToBeginning,
    handleBreakStart,
    handleBreakEnd,
    handleFinishTournament,
    handleResumeTournament,
  };
}
