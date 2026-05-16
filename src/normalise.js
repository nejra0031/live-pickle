import { setModuleRegistry } from './constants';

// Converts Firebase's object-keyed arrays back to real arrays.
// Only handles null and plain objects with numeric keys — scalar values
// in array fields indicate malformed data and return [].
export function toArr(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val !== 'object') return []; // scalar in array field = bad data
  return Object.keys(val).sort((a, b) => Number(a) - Number(b)).map(k => val[k]);
}

// Returns a string describing what's wrong, or null if the snapshot looks valid.
export function validateSnapshot(s) {
  if (!s || typeof s !== 'object') return 'Snapshot is not an object';
  if (s.phase !== 'play') return null; // non-play phases don't have data to validate
  if (s.history !== undefined && typeof s.history !== 'object') return `history field is corrupted (got ${typeof s.history})`;
  if (s.activeTeamIds !== undefined && typeof s.activeTeamIds !== 'object') return `activeTeamIds field is corrupted`;
  if (s.courtNumbers !== undefined && typeof s.courtNumbers !== 'object') return `courtNumbers field is corrupted`;
  return null;
}

export function normaliseSnapshot(s) {
  if (!s) return s;

  const rawReg = s.teamRegistry ? toArr(s.teamRegistry) : null;
  const registry = rawReg
    ? rawReg.filter(t => t && t.id && t.name && t.color)
             .map(t => ({ id: String(t.id), name: String(t.name), color: String(t.color), text: String(t.text || '#fff') }))
    : null;
  if (registry && registry.length > 0) setModuleRegistry(registry);

  const h = toArr(s.history).map(r => ({ ...r, games: toArr(r.games), bye: toArr(r.bye), paused: toArr(r.paused) }));

  const rd = s.roundData ? {
    courtTeamIds:   toArr(s.roundData.courtTeamIds).map(p => toArr(p)),
    byeIds:         toArr(s.roundData.byeIds),
    pausedTeamIds:  toArr(s.roundData.pausedTeamIds),
  } : null;

  const rrSched    = s.roundRobinSchedule     ? toArr(s.roundRobinSchedule).map(r => toArr(r).map(p => toArr(p))) : null;
  const rrCourts   = s.roundRobinCourts       ? toArr(s.roundRobinCourts).map(String) : null;
  const rrSnap     = s.roundRobinStartSnapshot ? {
    startRoundNum:    s.roundRobinStartSnapshot.startRoundNum ?? null,
    participatingIds: toArr(s.roundRobinStartSnapshot.participatingIds).map(String),
    excludedIds:      toArr(s.roundRobinStartSnapshot.excludedIds).map(String),
  } : null;
  const rrEndSnap  = s.roundRobinEndSnapshot ? {
    endRoundNum: s.roundRobinEndSnapshot.endRoundNum ?? null,
    endReason:   s.roundRobinEndSnapshot.endReason || 'manual',
  } : null;

  return {
    ...s,
    history:                 h,
    roundData:               rd,
    activeTeamIds:           toArr(s.activeTeamIds),
    courtNumbers:            toArr(s.courtNumbers),
    pausedIds:               toArr(s.pausedIds),
    teamRegistry:            registry,
    tournamentMode:          s.tournamentMode || 'swiss',
    roundRobinSchedule:      rrSched,
    roundRobinCourts:        rrCourts,
    roundRobinStartRoundNum: s.roundRobinStartRoundNum ?? null,
    roundRobinStartSnapshot: rrSnap,
    roundRobinEndSnapshot:   rrEndSnap,
    activeRoundExtras:       s.activeRoundExtras   ? toArr(s.activeRoundExtras)   : [],
    nextRoundPresets:        s.nextRoundPresets     ? toArr(s.nextRoundPresets)    : [],
    liveAdditions:           s.liveAdditions        ? toArr(s.liveAdditions)       : [],
    cancelledRoundNums:      s.cancelledRoundNums   ? toArr(s.cancelledRoundNums).map(Number) : [],
    tournamentFinished:      !!s.tournamentFinished,
  };
}
