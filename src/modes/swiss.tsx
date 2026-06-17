import BetweenRounds from '../tabs/play/BetweenRounds';
import ActiveRound from '../tabs/play/ActiveRound';
import StandingsTab from '../tabs/StandingsTab';
import { rerank } from '../algorithms/standings';
import type { TournamentModeDescriptor, StandingsCtx } from './types';

function SwissPlaySection(props: any) {
  if (!props.round) return <BetweenRounds {...props} />;
  return <ActiveRound {...props} />;
}

export const swissDescriptor: TournamentModeDescriptor = {
  id: 'swiss',
  label: 'Singles – Swiss',
  hasPredeterminedSchedule: false,
  defaultTiebreakOrder: ['wins', 'scoreDiff', 'headToHead'],
  buildStandings: ({ standings, standingsTiebreakOrder, history }: StandingsCtx) =>
    rerank(standings, standingsTiebreakOrder, history),
  PlaySection: SwissPlaySection,
  StandingsTab,
};
