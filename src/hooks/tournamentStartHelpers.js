// Applies the shared state reset that both TPT and DoublesRR start handlers need.
// Format-specific state (tptTeams, doublesRRPlayers, etc.) is set by the caller
// before or after this call.
export function applyTournamentStartState({
  tournamentMode, courts, durSecs,
  // refs
  lastSeenRoundNum, pendingRef,
  // setters shared across all formats
  setRole, setCourtNumbers, setTimerDuration,
  setHistory, setRoundNum, setActiveTeamIds, setStandings,
  setTournamentMode, setRound, setPausedIds, setPending, setRoundKey, setRoundComplete,
  setRoundRobinSchedule, setRoundRobinCourts, setRoundRobinStartRoundNum,
  setRoundRobinStartSnapshot, setRoundRobinEndSnapshot,
  setActiveRoundExtras, setTournamentFinished, setSocialCourts,
  setTimerAlarmed, applyTimerState,
  setPhase, setActiveTab,
}) {
  setRole('admin');
  setCourtNumbers(courts); setTimerDuration(durSecs);
  setHistory([]); setRoundNum(0); setActiveTeamIds([]); setStandings([]);
  setTournamentMode(tournamentMode); setRound(null); setPausedIds([]);
  lastSeenRoundNum.current = 0; pendingRef.current = {}; setPending({}); setRoundKey(0); setRoundComplete(false);
  setRoundRobinSchedule(null); setRoundRobinCourts(null); setRoundRobinStartRoundNum(null);
  setRoundRobinStartSnapshot(null); setRoundRobinEndSnapshot(null);
  setActiveRoundExtras([]); setTournamentFinished(false); setSocialCourts([]);
  setTimerAlarmed(false); applyTimerState(false, null, durSecs);
  setPhase('play'); setActiveTab('play');
}
