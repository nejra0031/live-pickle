// Returns the current round index, total rounds, and whether all rounds are done
// for any predetermined-schedule format (TPT, DoublesRR).
export function scheduleProgress(schedule, history) {
  const totalRounds = schedule.length;
  const allDone = totalRounds > 0 && history.length >= totalRounds;
  const currentRoundIdx = Math.min(history.length, Math.max(0, totalRounds - 1));
  return { currentRoundIdx, totalRounds, allDone };
}
