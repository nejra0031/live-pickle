import { useCallback } from 'react';
import { createTournamentRepo, writeTournamentMeta } from '../firebase';
import { buildSnapshot } from '../snapshot';
import { normaliseSnapshot } from '../normalise';
import { mkStandings, rebuildStandings } from '../algorithms/standings';
import { generateRoundRobinSchedule } from '../algorithms/roundRobin';
import { setModuleRegistry } from '../constants';
import { TOURNAMENT_INITIAL } from '../state/TournamentProvider';
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
  resetTimer,
  computeSecsLeft,
  gatedUpdate,
  onFirebaseError,
  updateAllStates,
  setTPTTeams,
  setTPTPlayers,
  setTPTSchedule,
  setTPTResults,
  setTPTSubstitutions,
  tptResultsRef,
  tptScheduleRef,
  tptRoundCompletingRef,
  tptSubstitutionsRef,
  setDoublesRRPlayers,
  setDoublesRRSchedule,
  setDoublesRRResults,
  doublesRRPlayersRef,
  doublesRRResultsRef,
  doublesRRScheduleRef,
  doublesRRRoundCompletingRef,
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
      const playerCount = allTeams.reduce((n, t) => n + (t.players?.length || 1), 0);
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

  const doReset = useCallback(() => {
    if (clubId) writeTournamentMeta(clubId, tournamentIdRef.current, { status: 'setup' });
    repo.pushSnapshot(null, onFirebaseError);
    repo.clearBackups();
    setBackupRoundNums(new Set());
    historyLengthRef.current = 0;
    lastSeenRoundNum.current = -1;
    setPhase('setup');
    load({ ...TOURNAMENT_INITIAL });
    pendingRef.current = {};
    setStandings([]);
    setBreakMode(null);
    setTPTTeams({});
    setTPTPlayers({});
    setTPTSchedule([]);
    setTPTResults({});
    setTPTSubstitutions({});
    tptResultsRef.current = {};
    tptScheduleRef.current = [];
    tptRoundCompletingRef.current = false;
    tptSubstitutionsRef.current = {};
    setDoublesRRPlayers({});
    setDoublesRRSchedule([]);
    setDoublesRRResults({});
    doublesRRPlayersRef.current = {};
    doublesRRResultsRef.current = {};
    doublesRRScheduleRef.current = [];
    doublesRRRoundCompletingRef.current = false;
    resetTimer(0);
  }, [resetTimer, setBackupRoundNums, load, repo, clubId]); // eslint-disable-line react-hooks/exhaustive-deps

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
    (message, durationSecs) => {
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
          color: t.color || '#0f4c75',
          text: t.text || '#fff',
          wins: t.wins,
          losses: t.losses,
          scoreDiff: t.scoreDiff,
        }));
      writeTournamentMeta(clubId, tournamentIdRef.current, { status: 'finished', top3 });
    }
  }, [computeSecsLeft, applyTimerState, set, gatedUpdate, clubId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleResumeTournament = useCallback(() => {
    set('tournamentFinished', false);
    gatedUpdate('canFinishTournament', { tournamentFinished: false });
    if (clubId)
      writeTournamentMeta(clubId, tournamentIdRef.current, { status: 'active', top3: null });
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
