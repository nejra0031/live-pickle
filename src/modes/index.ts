import type { TournamentMode } from '../types';
import type { TournamentModeDescriptor } from './types';
import { swissDescriptor } from './swiss';
import { roundRobinDescriptor } from './roundrobin';
import { tptDescriptor } from './tpt';
import { doublesRRDescriptor } from './doublesrr';

export const MODES: Record<TournamentMode, TournamentModeDescriptor> = {
  swiss: swissDescriptor,
  roundrobin: roundRobinDescriptor,
  tpt: tptDescriptor,
  doublesrr: doublesRRDescriptor,
};

export type { TournamentModeDescriptor, StandingsCtx } from './types';
