import BetweenRounds from '../tabs/play/BetweenRounds';
import ActiveRound from '../tabs/play/ActiveRound';
import RoundRobinSection from '../tabs/play/RoundRobinSection';
import StandingsTab from '../tabs/StandingsTab';
import { rerank } from '../algorithms/standings';
import type { TournamentModeDescriptor, StandingsCtx } from './types';

// During the Swiss phase of a RR tournament, before the schedule is generated
// (or while editing teams), falls through to BetweenRounds / ActiveRound.
function RoundRobinPlaySection(props: any) {
  if (props.roundRobinSchedule) return <RoundRobinSection {...props} />;
  if (!props.round) return <BetweenRounds {...props} />;
  return <ActiveRound {...props} />;
}

export const roundRobinDescriptor: TournamentModeDescriptor = {
  id: 'roundrobin',
  label: 'Singles – Round Robin',
  hasPredeterminedSchedule: true,
  defaultTiebreakOrder: ['wins', 'scoreDiff', 'headToHead'],
  buildStandings: ({ standings, standingsTiebreakOrder, history }: StandingsCtx) =>
    rerank(standings, standingsTiebreakOrder, history),
  PlaySection: RoundRobinPlaySection,
  StandingsTab,
};
