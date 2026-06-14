// Pure helpers for the multi-club landing page: splitting/sorting tournaments
// into Upcoming/Finished lists and applying the type/full-tournament filters.
// No React/Firebase dependencies — keeps this independently unit-testable.

export const TOURNAMENT_MODES = ['swiss', 'roundrobin', 'tpt', 'doublesrr'];

// startTime (ISO string) if present & valid, else createdAt, else null.
export function getSortTimestamp(t) {
  if (t.startTime) {
    const d = new Date(t.startTime);
    if (!isNaN(d.getTime())) return d.getTime();
  }
  return typeof t.createdAt === 'number' ? t.createdAt : null;
}

// Matches TournamentCard's existing inline logic: a tournament is "full" when
// it has a capacity set and the current player/team count has reached it.
export function isTournamentFull(t) {
  const count = t.playerCount || t.teamCount || 0;
  return (t.maxPlayers || 0) > 0 && count >= t.maxPlayers;
}

// Splits into { upcoming, finished }:
//  - upcoming: status !== 'finished', sorted by date ascending (earliest first;
//    missing-date items sort last)
//  - finished: status === 'finished', sorted by date descending (most recent
//    first; missing-date items sort last)
// Does not mutate the input array.
export function splitAndSortTournaments(tournaments) {
  const upcoming = [];
  const finished = [];
  for (const t of tournaments) {
    (t.status === 'finished' ? finished : upcoming).push(t);
  }

  const cmp = (dir) => (a, b) => {
    const ta = getSortTimestamp(a), tb = getSortTimestamp(b);
    if (ta == null && tb == null) return 0;
    if (ta == null) return 1;  // missing dates sort last
    if (tb == null) return -1;
    return dir * (ta - tb);
  };

  return {
    upcoming: [...upcoming].sort(cmp(1)),
    finished: [...finished].sort(cmp(-1)),
  };
}

// enabledModes: Set (or array) of TOURNAMENT_MODES to keep. If all known
// modes are enabled (the default), the mode filter is a no-op so legacy/
// unknown `mode` values aren't silently hidden.
// hideFull: when true, drops full tournaments from `upcoming` only.
export function applyLandingFilters({ upcoming, finished }, { enabledModes, hideFull }) {
  const modeSet = enabledModes instanceof Set ? enabledModes : new Set(enabledModes);
  const modeFilterActive = modeSet.size < TOURNAMENT_MODES.length;
  const byMode = (t) => !modeFilterActive || modeSet.has(t.mode);

  let filteredUpcoming = upcoming.filter(byMode);
  const filteredFinished = finished.filter(byMode);

  if (hideFull) {
    filteredUpcoming = filteredUpcoming.filter(t => !isTournamentFull(t));
  }

  return { upcoming: filteredUpcoming, finished: filteredFinished };
}
