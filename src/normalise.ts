import { setModuleRegistry } from './constants';

// Converts Firebase's object-keyed arrays back to real arrays.
// Only handles null and plain objects with numeric keys — scalar values
// in array fields indicate malformed data and return [].
export function toArr<T = unknown>(val: unknown): T[] {
  if (!val) return [];
  if (Array.isArray(val)) return val as T[];
  if (typeof val !== 'object') return []; // scalar in array field = bad data
  return Object.keys(val as object)
    .sort((a, b) => Number(a) - Number(b))
    .map((k) => (val as Record<string, T>)[k]);
}

// Returns a string describing what's wrong, or null if the snapshot looks valid.
export function validateSnapshot(s: unknown): string | null {
  if (!s || typeof s !== 'object') return 'Snapshot is not an object';
  const snap = s as Record<string, unknown>;
  if (snap.phase !== 'play') return null; // non-play phases don't have data to validate
  if (snap.history !== undefined && typeof snap.history !== 'object')
    return `history field is corrupted (got ${typeof snap.history})`;
  if (snap.activeTeamIds !== undefined && typeof snap.activeTeamIds !== 'object')
    return `activeTeamIds field is corrupted`;
  if (snap.courtNumbers !== undefined && typeof snap.courtNumbers !== 'object')
    return `courtNumbers field is corrupted`;
  return null;
}

export function normaliseSnapshot(
  s: Record<string, unknown> | null | undefined
): Record<string, unknown> | null | undefined {
  if (!s) return s;

  const rawReg = s.teamRegistry ? toArr(s.teamRegistry) : null;
  const registry = rawReg
    ? (rawReg as any[])
        .filter((t) => t && t.id && t.name && t.color)
        .map((t) => ({
          id: String(t.id),
          name: String(t.name),
          color: String(t.color),
          text: String(t.text || '#fff'),
          ...(t.players
            ? {
                players: toArr(t.players).map((p: any) => ({
                  name: String(p?.name || ''),
                  duprId: String(p?.duprId || ''),
                })),
              }
            : {}),
        }))
    : null;
  if (registry && registry.length > 0) setModuleRegistry(registry);

  const h = toArr<any>(s.history).map((r: any) => {
    const base = { ...r, games: toArr(r.games), bye: toArr(r.bye), paused: toArr(r.paused) };
    if (r.tptMatchups)
      (base as any).tptMatchups = toArr(r.tptMatchups).map((m: any) => ({
        ...m,
        games: toArr(m.games),
      }));
    return base;
  });

  const rd = s.roundData
    ? {
        courtTeamIds: toArr<any>((s.roundData as any).courtTeamIds).map((p: any) => toArr(p)),
        byeIds: toArr((s.roundData as any).byeIds),
        pausedTeamIds: toArr((s.roundData as any).pausedTeamIds),
        // Preserve per-round court labels. Left undefined (not []) when absent so the
        // `roundData.courtNums || courtNumbers.slice(...)` fallback still applies to
        // legacy snapshots written before this field existed.
        ...((s.roundData as any).courtNums
          ? { courtNums: toArr((s.roundData as any).courtNums) }
          : {}),
      }
    : null;

  const rrSched = s.roundRobinSchedule
    ? toArr<any>(s.roundRobinSchedule).map((r: any) => toArr<any>(r).map((p: any) => toArr(p)))
    : null;
  const rrCourts = s.roundRobinCourts ? toArr<any>(s.roundRobinCourts).map(String) : null;
  const rrSnap = s.roundRobinStartSnapshot
    ? {
        startRoundNum: (s.roundRobinStartSnapshot as any).startRoundNum ?? null,
        participatingIds: toArr<any>((s.roundRobinStartSnapshot as any).participatingIds).map(
          String
        ),
        excludedIds: toArr<any>((s.roundRobinStartSnapshot as any).excludedIds).map(String),
      }
    : null;
  const rrEndSnap = s.roundRobinEndSnapshot
    ? {
        endRoundNum: (s.roundRobinEndSnapshot as any).endRoundNum ?? null,
        endReason: (s.roundRobinEndSnapshot as any).endReason || 'manual',
      }
    : null;

  const tptSchedule = s.tptSchedule
    ? toArr<any>(s.tptSchedule).map((r: any) => ({
        matchups: toArr<any>(r.matchups).map((m: any) => ({
          teamAId: String(m.teamAId),
          teamBId: String(m.teamBId),
        })),
        byeTeamId: r.byeTeamId || null,
      }))
    : null;

  const tptTeams = s.tptTeams
    ? Object.fromEntries(
        Object.entries(s.tptTeams as object).map(([id, t]: [string, any]) => [
          id,
          { ...t, maleIds: toArr<any>(t.maleIds).map(String), femaleId: String(t.femaleId || '') },
        ])
      )
    : null;

  return {
    ...s,
    history: h,
    roundData: rd,
    activeTeamIds: toArr(s.activeTeamIds),
    courtNumbers: toArr(s.courtNumbers),
    pausedIds: toArr(s.pausedIds),
    teamRegistry: registry,
    tournamentMode: s.tournamentMode || 'swiss',
    roundRobinSchedule: rrSched,
    roundRobinCourts: rrCourts,
    roundRobinStartRoundNum: (s.roundRobinStartRoundNum as any) ?? null,
    roundRobinStartSnapshot: rrSnap,
    roundRobinEndSnapshot: rrEndSnap,
    activeRoundExtras: s.activeRoundExtras ? toArr(s.activeRoundExtras) : [],
    nextRoundPresets: s.nextRoundPresets ? toArr(s.nextRoundPresets) : [],
    liveAdditions: s.liveAdditions ? toArr(s.liveAdditions) : [],
    cancelledRoundNums: s.cancelledRoundNums ? toArr<any>(s.cancelledRoundNums).map(Number) : [],
    tournamentFinished: !!s.tournamentFinished,
    tptSchedule,
    tptTeams,
    players: s.players || null,
    tptResults: s.tptResults || null,
  };
}
