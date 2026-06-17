import type { ComponentType } from 'react';
import type { Standing, TournamentMode } from '../types';

export interface StandingsCtx {
  standings: Standing[];
  standingsTiebreakOrder: string[];
  history: any[];
  tptTeams: Record<string, any>;
  tptPlayers: Record<string, any>;
  tptSchedule: any[];
  tptResults: Record<string, any>;
  tptSubstitutions: Record<string, any>;
  doublesRRPlayers: Record<string, any>;
  doublesRRTiebreakOrder: string[];
}

export interface TournamentModeDescriptor {
  id: TournamentMode;
  label: string;
  hasPredeterminedSchedule: boolean;
  defaultTiebreakOrder: string[];
  buildStandings(ctx: StandingsCtx): any[];
  PlaySection: ComponentType<any>;
  StandingsTab: ComponentType<any>;
  // Scheduled-format only: pure logic callbacks for management hooks.
  // Both take schedRoundIdx as an explicit param since they live outside the
  // hook closure that captures it.
  isRoundComplete?: (
    schedRound: any,
    schedRoundIdx: number,
    results: Record<string, any>
  ) => boolean;
  buildHistEntry?: (
    schedRound: any,
    results: Record<string, any>,
    schedRoundIdx: number,
    newRoundNum: number
  ) => any;
}
