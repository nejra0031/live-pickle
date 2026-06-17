import DoublesRRSection from '../tabs/play/DoublesRRSection';
import DoublesRRStandingsTab from '../tabs/DoublesRRStandingsTab';
import { buildDoublesRRStandings } from '../algorithms/doublesRR';
import type { TournamentModeDescriptor, StandingsCtx } from './types';

// Thin adapter: DoublesRRStandingsTab expects `doublesRRStandings` but we pass
// `ranked` (the descriptor's buildStandings output) under a unified prop name.
function DoublesRRStandingsSection(props: any) {
  return (
    <DoublesRRStandingsTab
      doublesRRPlayers={props.doublesRRPlayers}
      doublesRRStandings={props.ranked}
      doublesRRTiebreakOrder={props.doublesRRTiebreakOrder}
      onDoublesRRTiebreakOrderChange={props.onDoublesRRTiebreakOrderChange}
      isAdmin={props.isAdmin}
    />
  );
}

export const doublesRRDescriptor: TournamentModeDescriptor = {
  id: 'doublesrr',
  label: 'Doubles · Rotating Partners',
  hasPredeterminedSchedule: true,
  defaultTiebreakOrder: ['wins', 'scoreDiff', 'headToHead'],
  buildStandings: ({ doublesRRPlayers, history, doublesRRTiebreakOrder }: StandingsCtx) => {
    if (Object.keys(doublesRRPlayers).length === 0) return [];
    return buildDoublesRRStandings(
      Object.keys(doublesRRPlayers),
      doublesRRPlayers,
      history,
      doublesRRTiebreakOrder
    );
  },
  PlaySection: DoublesRRSection,
  StandingsTab: DoublesRRStandingsSection,
  // Pure logic used by useDoublesRRManagement via wrapper that supplies roundIdx.
  isRoundComplete: (schedRound: any, roundIdx: number, results: Record<string, any>) =>
    schedRound.courts.every((_: any, ci: number) => !!results[`${roundIdx}_${ci}`]),
  buildHistEntry: (
    schedRound: any,
    results: Record<string, any>,
    roundIdx: number,
    newRoundNum: number
  ) => ({
    roundNum: newRoundNum,
    games: [],
    bye: schedRound.byePlayerIds || [],
    paused: [],
    doublesRRCourts: schedRound.courts.map((court: any, ci: number) => {
      const r = results[`${roundIdx}_${ci}`];
      return { teamA: court.teamA, teamB: court.teamB, ...r };
    }),
  }),
};
