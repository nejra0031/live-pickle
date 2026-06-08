// Single source of truth for the shape of a full `current_tournament` snapshot.
//
// Every `pushSnapshot` call does a full `set()` replace, so any field NOT present
// is REMOVED from Firebase. Hand-building these objects at each call site caused
// fields to be dropped by copy-paste drift (e.g. socialCourts/targetRounds/
// cancelledRoundNums were silently wiped on round completion or generation, and
// the courtNums bug fixed in Phase A). Build them here instead.
//
// `state` is the in-memory tournament state (the same object App keeps in
// roundMgmtStateRef.current). `overrides` wins over every default, so a call site
// only spells out the handful of fields that differ for its situation.
//
// NOTE: `_tournamentId` is intentionally NOT defaulted here — the ongoing-round
// snapshots have never persisted it, and tournament-swap detection depends on
// that. Init snapshots pass it explicitly via `overrides`.
// Read-side inverse of buildSnapshot: maps a (normalised) Firebase snapshot to the
// tournament-reducer fields. This is the single place each field's read-mapping
// lives, mirroring buildSnapshot on the write side.
//
// `derived` supplies values updateAllStates computes outside a pure mapping — only
// `round` (reconstructed from roundData + the rebuilt standings). `socialCourts` is
// filtered here (dropping any social court no longer in courtNumbers). Fields the
// snapshot doesn't carry are left out (tournamentTeams/tournamentTitle when absent),
// so a LOAD merge preserves existing state rather than clobbering it. Non-reducer
// state (standings/breakMode/pending/roundKey) is intentionally NOT produced here.
export function snapshotToState(s, derived = {}) {
  const values = {
    activeTeamIds:           s.activeTeamIds,
    courtNumbers:            s.courtNumbers,
    timerDuration:           s.timerDuration || 0,
    timerDefaultMins:        s.timerDefaultMins || 12,
    history:                 s.history,
    roundNum:                s.roundNum,
    pausedIds:               s.pausedIds || [],
    roundComplete:           s.roundComplete || false,
    tournamentMode:          s.tournamentMode || 'swiss',
    roundRobinSchedule:      s.roundRobinSchedule || null,
    roundRobinCourts:        s.roundRobinCourts || null,
    roundRobinStartRoundNum: s.roundRobinStartRoundNum ?? null,
    roundRobinStartSnapshot: s.roundRobinStartSnapshot || null,
    roundRobinEndSnapshot:   s.roundRobinEndSnapshot || null,
    activeRoundExtras:       s.activeRoundExtras || [],
    liveAdditions:           s.liveAdditions || [],
    nextRoundPresets:        s.nextRoundPresets || [],
    tournamentFinished:      !!s.tournamentFinished,
    cancelledRoundNums:      s.cancelledRoundNums || [],
    finalRound:              !!s.finalRound,
    targetRounds:            s.targetRounds || 0,
    socialCourts:            (s.socialCourts || []).filter(c => (s.courtNumbers || []).includes(c)),
    teamNameDisplay:         s.teamNameDisplay || 'name',
    ...derived,
  };
  if (s.teamRegistry && s.teamRegistry.length > 0) values.tournamentTeams = s.teamRegistry;
  if (s.tournamentTitle) values.tournamentTitle = s.tournamentTitle;
  values.tournamentLocation = s.tournamentLocation || '';
  values.tournamentStartTime = s.tournamentStartTime || '';
  values.tournamentDurationMins = s.tournamentDurationMins || 0;
  return values;
}

export function buildSnapshot(state, overrides = {}) {
  return {
    phase: 'play',
    activeTeamIds:            state.activeTeamIds,
    courtNumbers:            state.courtNumbers,
    socialCourts:            state.socialCourts ?? [],
    teamRegistry:            state.tournamentTeams,
    tournamentTitle:         state.tournamentTitle,
    tournamentLocation:      state.tournamentLocation ?? '',
    tournamentStartTime:     state.tournamentStartTime ?? '',
    tournamentDurationMins:  state.tournamentDurationMins ?? 0,
    timerDuration:           state.timerDuration,
    timerDefaultMins:        state.timerDefaultMins,
    history:                 state.history,
    roundNum:                state.roundNum,
    pausedIds:               state.pausedIds,
    roundComplete:           false,
    timerRunning:            false,
    timerStartedAt:          null,
    timerPausedSecsLeft:     state.timerDuration,
    roundData:               null,
    breakMode:               null,
    finalRound:              false,
    targetRounds:            state.targetRounds ?? 0,
    tournamentMode:          state.tournamentMode ?? 'swiss',
    roundRobinSchedule:      state.roundRobinSchedule ?? null,
    roundRobinCourts:        state.roundRobinCourts ?? null,
    roundRobinStartRoundNum: state.roundRobinStartRoundNum ?? null,
    roundRobinStartSnapshot: state.roundRobinStartSnapshot ?? null,
    roundRobinEndSnapshot:   state.roundRobinEndSnapshot ?? null,
    activeRoundExtras:       [],
    liveAdditions:           [],
    nextRoundPresets:        state.nextRoundPresets ?? [],
    tournamentFinished:      state.tournamentFinished ?? false,
    cancelledRoundNums:      state.cancelledRoundNums ?? [],
    savedAt:                 Date.now(),
    ...overrides,
  };
}
