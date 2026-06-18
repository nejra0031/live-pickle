import { createContext, useCallback, useContext, useMemo, useReducer, useRef } from 'react';
import type { ReactNode, MutableRefObject } from 'react';
import type { TournamentState } from '../types';

export const TOURNAMENT_INITIAL: TournamentState = {
  tournamentTitle: 'Tournament',
  tournamentLocation: '',
  tournamentStartTime: '',
  tournamentDurationMins: 0,
  maxPlayers: 0,
  activeTeamIds: [],
  tournamentTeams: [],
  courtNumbers: [],
  timerDuration: 0,
  timerDefaultMins: 12,
  history: [],
  round: null,
  roundNum: 1,
  pending: {},
  roundComplete: false,
  pausedIds: [],
  tournamentMode: 'swiss',
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
  targetRounds: 0,
  gamesPerTeam: 0,
  socialCourts: [],
  teamNameDisplay: 'name',
  standingsTiebreakOrder: ['wins', 'scoreDiff', 'headToHead'],
  tptSubstitutions: {},
};

// SET applies one field; value may be a plain value or an updater fn (matching
// useState's API). LOAD batch-merges a partial state object.
function tournamentReducer(state: TournamentState, action: any): TournamentState {
  if (action.type === 'SET') {
    const prev = (state as any)[action.key];
    const next = typeof action.value === 'function' ? action.value(prev) : action.value;
    if (Object.is(next, prev)) return state;
    return { ...state, [action.key]: next };
  }
  if (action.type === 'LOAD') return { ...state, ...action.values };
  return state;
}

export type SetField = <K extends keyof TournamentState>(
  key: K,
  value: TournamentState[K] | ((prev: TournamentState[K]) => TournamentState[K])
) => void;

export interface TournamentCtxValue {
  state: TournamentState;
  set: SetField;
  load: (values: Partial<TournamentState>) => void;
  stateRef: MutableRefObject<TournamentState>;
}

const TournamentCtx = createContext<TournamentCtxValue | null>(null);

export function TournamentProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(tournamentReducer, TOURNAMENT_INITIAL);
  const stateRef = useRef<TournamentState>(state);
  stateRef.current = state;

  const set: SetField = useCallback((key, value) => {
    dispatch({ type: 'SET', key, value });
  }, []);

  const load = useCallback((values: Partial<TournamentState>) => {
    dispatch({ type: 'LOAD', values });
  }, []);

  const ctx = useMemo<TournamentCtxValue>(
    () => ({ state, set, load, stateRef }),
    [state, set, load]
  );

  return <TournamentCtx.Provider value={ctx}>{children}</TournamentCtx.Provider>;
}

export function useTournamentState(): TournamentCtxValue {
  const ctx = useContext(TournamentCtx);
  if (!ctx) throw new Error('useTournamentState must be used within TournamentProvider');
  return ctx;
}
