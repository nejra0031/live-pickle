// Applies the shared state reset that both TPT and DoublesRR start handlers need.
// Format-specific state (tptTeams, doublesRRPlayers, etc.) is set by the caller
// before or after this call.
export function applyTournamentStartState({
  tournamentMode,
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
}: {
  tournamentMode: string;
  courts: string[];
  durSecs: number;
  lastSeenRoundNum: import('react').MutableRefObject<number>;
  pendingRef: import('react').MutableRefObject<Record<string, any>>;
  set: (k: any, v: any) => void;
  setRole: (v: string) => void;
  setStandings: (s: any[]) => void;
  setRoundKey: (v: number) => void;
  setTimerAlarmed: (v: boolean) => void;
  setPhase: (v: string) => void;
  setActiveTab: (v: string) => void;
  applyTimerState: (running: boolean, startedAt: number | null, secsLeft: number) => void;
}) {
  setRole('admin');
  set('courtNumbers', courts);
  set('timerDuration', durSecs);
  set('history', []);
  set('roundNum', 0);
  set('activeTeamIds', []);
  setStandings([]);
  set('tournamentMode', tournamentMode);
  set('round', null);
  set('pausedIds', []);
  lastSeenRoundNum.current = 0;
  pendingRef.current = {};
  set('pending', {});
  setRoundKey(0);
  set('roundComplete', false);
  set('roundRobinSchedule', null);
  set('roundRobinCourts', null);
  set('roundRobinStartRoundNum', null);
  set('roundRobinStartSnapshot', null);
  set('roundRobinEndSnapshot', null);
  set('activeRoundExtras', []);
  set('tournamentFinished', false);
  set('socialCourts', []);
  setTimerAlarmed(false);
  applyTimerState(false, null, durSecs);
  setPhase('play');
  setActiveTab('play');
}
