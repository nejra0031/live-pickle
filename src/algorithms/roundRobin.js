// Circle-method round-robin → flattened into court-sized scheduling rounds.
// Returns array of scheduling rounds; each scheduling round is an array of [teamIdA, teamIdB] pairs.
export function generateRoundRobinSchedule(teamIds, numCourts) {
  if (!teamIds || teamIds.length < 2) return [];
  const teams = [...teamIds];
  if (teams.length % 2 === 1) teams.push(null); // placeholder for odd count
  const n = teams.length;
  const courts = Math.max(1, numCourts || 1);
  const scheduledRounds = [];

  for (let r = 0; r < n - 1; r++) {
    const matches = [];
    for (let i = 0; i < n / 2; i++) {
      const a = teams[i], b = teams[n - 1 - i];
      if (a && b) matches.push([a, b]);
    }
    for (let i = 0; i < matches.length; i += courts)
      scheduledRounds.push(matches.slice(i, i + courts));
    // Rotate keeping teams[0] fixed
    teams.splice(1, 0, teams.pop());
  }
  return scheduledRounds;
}
