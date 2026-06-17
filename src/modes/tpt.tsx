import ThreePlayerSection from '../tabs/play/ThreePlayerSection';
import ThreePlayerStandingsTab from '../tabs/ThreePlayerStandingsTab';
import { buildTPTStandings } from '../algorithms/threePlayerTeam';
import type { TournamentModeDescriptor, StandingsCtx } from './types';

// Thin adapter: ThreePlayerStandingsTab expects `tiebreakOrder` but App passes
// `standingsTiebreakOrder`, so we map here rather than renaming the component's prop.
function TPTStandingsSection(props: any) {
  return (
    <ThreePlayerStandingsTab
      tptTeams={props.tptTeams}
      tptPlayers={props.tptPlayers}
      tptSchedule={props.tptSchedule}
      tptResults={props.tptResults}
      tiebreakOrder={props.standingsTiebreakOrder}
      tptSubstitutions={props.tptSubstitutions}
      tournamentFinished={props.tournamentFinished}
    />
  );
}

export const tptDescriptor: TournamentModeDescriptor = {
  id: 'tpt',
  label: 'Trio Teams',
  hasPredeterminedSchedule: true,
  defaultTiebreakOrder: ['wins', 'scoreDiff', 'headToHead'],
  buildStandings: ({
    tptTeams,
    tptPlayers,
    tptSchedule,
    tptResults,
    standingsTiebreakOrder,
    tptSubstitutions,
  }: StandingsCtx) => {
    if (Object.keys(tptTeams).length === 0) return [];
    return buildTPTStandings(
      tptTeams,
      tptPlayers,
      tptSchedule,
      tptResults,
      standingsTiebreakOrder,
      tptSubstitutions
    ).teamStandings;
  },
  PlaySection: ThreePlayerSection,
  StandingsTab: TPTStandingsSection,
  // Pure logic used by useTPTManagement via wrapper that supplies schedRoundIdx.
  isRoundComplete: (schedRound: any, schedRoundIdx: number, results: Record<string, any>) =>
    schedRound.matchups.every((_: any, mi: number) =>
      [0, 1, 2].every((gi) => !!results[`${schedRoundIdx}_${mi}_${gi}`])
    ),
  buildHistEntry: (
    schedRound: any,
    results: Record<string, any>,
    schedRoundIdx: number,
    newRoundNum: number
  ) => ({
    roundNum: newRoundNum,
    games: [],
    bye: [],
    paused: [],
    tptMatchups: schedRound.matchups.map((matchup: any, mi: number) => ({
      teamAId: matchup.teamAId,
      teamBId: matchup.teamBId,
      games: [0, 1, 2].map((gi) => results[`${schedRoundIdx}_${mi}_${gi}`] || null),
    })),
    ...(schedRound.byeTeamId ? { tptByeTeamId: schedRound.byeTeamId } : {}),
  }),
};
